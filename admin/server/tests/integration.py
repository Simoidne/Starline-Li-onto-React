#!/usr/bin/env python3
"""Real PHP + MariaDB HTTP tests. Uses only an isolated temporary database/server."""
import base64
import http.cookiejar
import json
import os
from pathlib import Path
import re
import shutil
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
PHP = os.environ.get('PHP_BIN') or shutil.which('php') or '/opt/homebrew/opt/php@8.3/bin/php'
DBBIN = os.environ.get('MARIADB_BIN', '/opt/homebrew/opt/mariadb/bin')

def binary(name):
    return shutil.which(name) or str(Path(DBBIN) / name)

def wait_for(check, process):
    for _ in range(100):
        if process.poll() is not None:
            raise RuntimeError('Test service exited early; inspect temporary service logs.')
        try:
            if check(): return
        except Exception: pass
        time.sleep(.1)
    raise RuntimeError('Test service did not start.')

class Client:
    def __init__(self, origin):
        self.origin = origin
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies))
        self.csrf = None
        self.headers = None

    def request(self, action, body=None, status=200, headers=None, raw=None, method=None):
        if body is not None and self.csrf is None:
            self.request('session')
        request_headers = {'Accept': 'application/json', 'Origin': self.origin}
        if body is not None:
            request_headers.update({'Content-Type': 'application/json', 'X-CSRF-Token': self.csrf or ''})
        request_headers.update(headers or {})
        request = urllib.request.Request(self.origin + '/api/index.php?action=' + action,
            data=raw if raw is not None else (json.dumps(body).encode() if body is not None else None),
            method=method or ('POST' if body is not None else 'GET'), headers=request_headers)
        try:
            response = self.opener.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        self.headers = response.headers
        data = json.loads(response.read())
        assert response.status == status, f'{action}: expected HTTP {status}, got {response.status}: {data.get("error", "")}'
        self.csrf = data.get('csrfToken', self.csrf)
        return data


def main():
    with tempfile.TemporaryDirectory(prefix='sl-auth-', dir='/tmp') as directory:
        tmp = Path(directory)
        logs = (tmp / 'services.log').open('w+')
        database = tmp / 'db'
        database.mkdir()
        subprocess.run([binary('mariadb-install-db'), '--no-defaults', '--datadir=' + str(database), '--auth-root-authentication-method=normal', '--skip-test-db'], stdout=logs, stderr=logs, check=True)
        sock = str(tmp / 'mysql.sock')
        db = subprocess.Popen([binary('mariadbd'), '--no-defaults', '--datadir=' + str(database), '--socket=' + sock, '--pid-file=' + str(tmp / 'db.pid'), '--skip-networking', '--log-error=' + str(tmp / 'db.log')], stdout=logs, stderr=logs)
        php = None
        try:
            def sql(statement):
                result = subprocess.run([binary('mariadb'), '--no-defaults', '--socket=' + sock, '-uroot', '--batch', '--skip-column-names'], input=statement, text=True, capture_output=True, check=True)
                return result.stdout.strip()
            wait_for(lambda: sql('SELECT 1;') == '1', db)
            sql('CREATE DATABASE auth_test CHARACTER SET utf8mb4;')
            def query(statement): return sql('USE auth_test; ' + statement)
            private = tmp / 'private'
            private.mkdir()
            shutil.copy(ROOT / 'server/bootstrap.php', private / 'bootstrap.php')
            shutil.copytree(ROOT / 'server/src', private / 'src')
            shutil.copytree(ROOT / 'server/migrations', private / 'migrations')
            with socket.socket() as connection:
                connection.bind(('127.0.0.1', 0))
                port = connection.getsockname()[1]
            origin = f'http://127.0.0.1:{port}'
            import hashlib
            code = 'a' * 64
            config = {'environment': 'development', 'app_url': origin,
                'database': {'dsn': 'mysql:unix_socket=' + sock + ';dbname=auth_test;charset=utf8mb4', 'username': 'root', 'password': ''},
                'bootstrap_key_hash': hashlib.sha256(code.encode()).hexdigest(), 'mail_from': 'admin@example.com', 'mail_mode': 'log',
                'session_idle_seconds': 1800, 'session_absolute_seconds': 28800}
            encoded = base64.b64encode(json.dumps(config).encode()).decode()
            (private / 'config.php').write_text("<?php return json_decode(base64_decode('" + encoded + "'), true);")
            php = subprocess.Popen([PHP, '-S', f'127.0.0.1:{port}', '-t', str(ROOT / 'public')], env=dict(os.environ, STARLINE_ADMIN_PRIVATE=str(private)), stdout=logs, stderr=logs)
            owner = Client(origin)
            wait_for(lambda: owner.request('session')['setupRequired'], php)
            assert owner.headers.get('Cache-Control') == 'no-store, private'
            cookie = owner.headers.get('Set-Cookie', '')
            # A repeated session request need not reissue the cookie; inspect CookieJar too.
            assert any('HttpOnly' in item._rest and item._rest.get('SameSite') == 'Strict' for item in owner.cookies)
            owner.request('users', status=401)
            owner.request('login', {}, status=419, headers={'X-CSRF-Token': 'invalid'})
            owner.request('login', {}, status=403, headers={'Origin': 'https://untrusted.example'})
            owner.request('login', {}, status=415, headers={'Content-Type': 'text/plain'})
            owner.request('login', {}, status=400, raw=b'{invalid')
            owner.request('logout', status=405)
            print('PASS: anonymous access, CSRF, origin, cookie flags and request validation')

            values = {'email': 'owner@example.com', 'name': 'First Owner', 'password': 'owner-password-12345', 'setupCode': code}
            owner.request('bootstrap', dict(values, setupCode='wrong'), status=403)
            session_before = next(iter(owner.cookies)).value
            result = owner.request('bootstrap', values)
            assert result['user']['role'] == 'Owner' and result['setupRequired'] is False
            assert next(iter(owner.cookies)).value != session_before
            owner.request('bootstrap', values, status=409)
            stored_hash = query("SELECT password_hash FROM starline_admin_users WHERE email='owner@example.com';")
            assert stored_hash.startswith('$2y$12$') and 'owner-password' not in stored_hash
            assert not owner.request('session')['setupRequired']
            print('PASS: first-owner setup is private, one-time, hashed and rotates the session')

            owner.request('invite', {'email': 'ops@example.com', 'name': 'Operations User', 'role': 'operations'})
            users = owner.request('users')['users']
            ops_id = next(user['id'] for user in users if user['email'] == 'ops@example.com')
            assert not next(user for user in users if user['id'] == ops_id)['passwordSet']
            def latest_token(email):
                messages = sorted((private / 'var/mail').glob('*.json'), key=lambda path: path.stat().st_mtime_ns)
                message = next(json.loads(path.read_text()) for path in reversed(messages) if json.loads(path.read_text())['to'] == email)
                return re.search(r'#reset=([a-f0-9]{64})', message['body']).group(1)
            token = latest_token('ops@example.com')
            assert token not in query('SELECT token_hash FROM starline_admin_password_tokens;')
            ops = Client(origin)
            ops.request('login', {'email': 'ops@example.com', 'password': 'unknown-password'}, status=401)
            ops.request('reset-password', {'token': token, 'password': 'operations-password-123'})
            ops.request('reset-password', {'token': token, 'password': 'operations-password-123'}, status=422)
            result = ops.request('login', {'email': 'ops@example.com', 'password': 'operations-password-123'})
            assert result['user']['role'] == 'Operations Manager'
            ops.request('users', status=403)
            ops.request('invite', {'email': 'rogue@example.com', 'name': 'Rogue', 'role': 'owner'}, status=403)
            ops.request('set-access', {'id': ops_id, 'role': 'owner', 'active': True}, status=403)
            print('PASS: invitations, hashed one-use tokens, login and backend role enforcement')

            from products import check_products
            check_products(owner, ops, Client, query, ROOT, private, PHP)
            owner.request('invite', {'email':'legacy@example.com','name':'Legacy','role':'sales'}, status=422)
            owner.request('set-access', {'id': ops_id, 'role': 'sales', 'active': True}, status=422)
            owner.request('set-access', {'id': ops_id, 'role': 'operations', 'active': False})
            assert ops.request('session')['user'] is None
            ops.request('products', status=401)
            ops.request('login', {'email': 'ops@example.com', 'password': 'operations-password-123'}, status=401)
            owner.request('set-access', {'id': '1', 'role': 'operations', 'active': False}, status=422)
            owner.request('set-access', {'id': ops_id, 'role': 'operations', 'active': True})
            print('PASS: legacy role rejected; disabled users revoke sessions; owner cannot remove own access')

            other = Client(origin)
            other.request('login', {'email': 'owner@example.com', 'password': 'owner-password-12345'})
            owner.request('change-password', {'currentPassword': 'wrong', 'password': 'new-owner-password-123'}, status=422)
            owner.request('change-password', {'currentPassword': 'owner-password-12345', 'password': 'new-owner-password-123'})
            assert other.request('session')['user'] is None and owner.request('session')['user'] is None
            owner.request('login', {'email': 'owner@example.com', 'password': 'owner-password-12345'}, status=401)
            owner.request('login', {'email': 'owner@example.com', 'password': 'new-owner-password-123'})
            print('PASS: password change requires current password and revokes all sessions')

            assert ops.request('forgot-password', {'email': 'missing@example.com'})['ok']
            assert ops.request('forgot-password', {'email': 'ops@example.com'})['ok']
            expired_token = latest_token('ops@example.com')
            query("UPDATE starline_admin_password_tokens SET expires_at=1 WHERE user_id=" + ops_id + ';')
            ops.request('reset-password', {'token': expired_token, 'password': 'replacement-password-123'}, status=422)
            owner.request('resend-invitation', {'id': ops_id})
            token = latest_token('ops@example.com')
            ops.request('reset-password', {'token': token, 'password': 'short'}, status=422)
            ops.request('reset-password', {'token': token, 'password': 'replacement-password-123'})
            assert ops.request('login', {'email': 'ops@example.com', 'password': 'replacement-password-123'})['user']['role'] == 'Operations Manager'
            print('PASS: recovery responses, expiry, password rules and recovery completion')

            ops.request('logout', {})
            assert ops.request('session')['user'] is None
            query('DELETE FROM starline_admin_rate_limits;')
            for index in range(11):
                fresh = Client(origin)
                fresh.request('login', {'email': 'missing@example.com', 'password': 'unknown-password'}, status=401 if index < 10 else 429)
            print('PASS: logout and login throttling survive new browser sessions')
            print('All PHP/MariaDB integration checks passed. No live database or real email was used.')
        finally:
            import sys
            if sys.exc_info()[0] is not None:
                logs.flush()
                print((tmp / 'services.log').read_text()[-6000:])
                if (tmp / 'db.log').exists(): print((tmp / 'db.log').read_text()[-3000:])
            for process in [php, db]:
                if process:
                    process.terminate()
                    try: process.wait(timeout=10)
                    except subprocess.TimeoutExpired: process.kill(); process.wait()
            logs.close()

if __name__ == '__main__': main()
