import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authClient } from './client';

function checkSession(result) {
  if (
    !Object.prototype.hasOwnProperty.call(result, 'user') ||
    (result.user &&
      (!result.user.id || !['Owner', 'Operations Manager'].includes(result.user.role)))
  )
    throw new Error('Unable to verify your account. Please try again.');
  return { status: 'ready', user: result.user, setupRequired: !!result.setupRequired };
}

export default function AuthGate({ children }) {
  const [auth, setAuth] = useState({ status: 'loading', user: null });
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('reset') || '',
  );
  const [changing, setChanging] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const mutating = useRef(false);

  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const current = ++revision.current;
    try {
      const result = checkSession(await authClient.session());
      if (current === revision.current) setAuth(result);
    } catch (cause) {
      if (current === revision.current)
        setAuth({ status: 'error', user: null, error: cause.message });
    }
  }, []);

  useEffect(() => {
    if (window.location.hash.startsWith('#reset='))
      window.history.replaceState({}, '', window.location.pathname);
    refresh();
    return () => {
      revision.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    if (!auth.user) return;
    const visibleRefresh = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', visibleRefresh);
    const timer = window.setInterval(visibleRefresh, 60000);
    return () => {
      window.removeEventListener('focus', visibleRefresh);
      window.clearInterval(timer);
    };
  }, [auth.user, refresh]);

  async function authenticate(values) {
    const current = ++revision.current;
    mutating.current = true;
    try {
      const result = checkSession(
        await (auth.setupRequired
          ? authClient.bootstrap(values)
          : authClient.login(values.email, values.password)),
      );
      if (current === revision.current) {
        setError('');
        setAuth(result);
      }
    } finally {
      mutating.current = false;
    }
  }

  async function signOut() {
    ++revision.current;
    mutating.current = true;
    setSigningOut(true);
    setError('');
    try {
      await authClient.logout();
      setAuth({ status: 'ready', user: null, setupRequired: false });
      setChanging(false);
    } catch (cause) {
      setError(cause.message);
    } finally {
      mutating.current = false;
      setSigningOut(false);
    }
  }
  function passwordChanged() {
    ++revision.current;
    setAuth({ status: 'ready', user: null, setupRequired: false });
  }
  if (token || changing)
    return (
      <PasswordForm
        token={token}
        onChanged={passwordChanged}
        onClose={() => {
          setToken('');
          setChanging(false);
          refresh();
        }}
      />
    );
  if (auth.status === 'loading')
    return (
      <AuthLayout>
        <h2>Checking your session…</h2>
        <p role="status">Please wait.</p>
      </AuthLayout>
    );
  if (auth.status === 'error')
    return (
      <AuthLayout>
        <h2>Unable to connect</h2>
        <p className="error" role="alert">
          {auth.error}
        </p>
        <button onClick={refresh}>Try again</button>
      </AuthLayout>
    );
  if (!auth.user)
    return <AuthForm setup={auth.setupRequired} onAuthenticate={authenticate} />;
  return (
    <>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {children({
        user: auth.user,
        signOut,
        signingOut,
        changePassword: () => setChanging(true),
      })}
    </>
  );
}

function AuthLayout({ children }) {
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand">
          STARLINE <span>OPERATIONS</span>
        </div>
        <p className="eyebrow">SEAFOOD · IMPORT & EXPORT</p>
        <h1>A clearer view of every shipment.</h1>
        <p>
          Plan landed costs, compare currencies, and understand your margins before the
          next order.
        </p>
        <div className="intro-line" />
      </section>
      <section className="login-card">
        <p className="eyebrow">ADMIN PORTAL</p>
        {children}
      </section>
    </main>
  );
}

function AuthForm({ setup, onAuthenticate }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'reset' && !setup) {
        await authClient.forgotPassword(email.trim());
        setMessage(
          'If this email belongs to an active account, a password reset link will arrive shortly.',
        );
      } else {
        await onAuthenticate({
          email: email.trim(),
          password,
          name: name.trim(),
          setupCode,
        });
      }
    } catch (cause) {
      setError(cause.message);
    } finally {
      setPassword('');
      setSetupCode('');
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <h2>
        {setup
          ? 'Create the first owner'
          : mode === 'reset'
            ? 'Reset your password'
            : 'Welcome back'}
      </h2>
      <p>
        {setup
          ? 'Use the private setup code supplied during installation to create the owner account.'
          : mode === 'reset'
            ? 'Enter your work email to request a password reset link.'
            : 'Sign in with your assigned work account. Access is by invitation only.'}
      </p>
      <form onSubmit={submit}>
        {setup && (
          <>
            <label className="field">
              Your name
              <input
                required
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="field">
              Setup code
              <input
                type="password"
                required
                autoComplete="off"
                value={setupCode}
                onChange={(event) => setSetupCode(event.target.value)}
                disabled={busy}
              />
            </label>
          </>
        )}
        <label className="field">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </label>
        {(mode === 'login' || setup) && (
          <label className="field">
            Password
            <input
              type="password"
              autoComplete={setup ? 'new-password' : 'current-password'}
              required
              minLength={setup ? 12 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
          </label>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {busy
            ? 'Please wait…'
            : setup
              ? 'Create owner account'
              : mode === 'reset'
                ? 'Send reset link'
                : 'Sign in'}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="auth-message" role="status">
          {message}
        </p>
      )}
      {!setup && (
        <>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => {
              setMode(mode === 'login' ? 'reset' : 'login');
              setPassword('');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}
          </button>
          <small>Need access? Ask your account administrator for an invitation.</small>
        </>
      )}
    </AuthLayout>
  );
}

function PasswordForm({ token, onChanged, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (Array.from(password).length < 12) {
      setError('Use at least 12 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (token) await authClient.resetPassword(token, password);
      else await authClient.changePassword(currentPassword, password);
      setPassword('');
      setConfirm('');
      setDone(true);
      onChanged();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setCurrentPassword('');
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <h2>
        {done ? 'Password updated' : token ? 'Set your password' : 'Change your password'}
      </h2>
      {done ? (
        <>
          <p>
            Your new password is saved. Please sign in again. Your other sessions have
            also been revoked.
          </p>
          <button className="primary" onClick={onClose}>
            Return to sign in
          </button>
        </>
      ) : (
        <>
          <p>Use at least 12 characters. Passwords can contain up to 72 bytes.</p>
          <form onSubmit={submit}>
            {!token && (
              <label className="field">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={busy}
                />
              </label>
            )}
            <label className="field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="field">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                disabled={busy}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save password'}
            </button>
          </form>
          <button onClick={onClose} disabled={busy}>
            Back to sign in / dashboard
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </AuthLayout>
  );
}
