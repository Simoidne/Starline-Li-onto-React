import React, { useCallback, useEffect, useState } from 'react';
import { authClient } from './client';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operations');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const data = await authClient.users();
    setUsers(data.users);
  }, []);
  useEffect(() => {
    load().catch((cause) => setError(cause.message));
  }, [load]);
  async function perform(operation) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await operation();
      setMessage(
        result.mailAccepted === false
          ? 'The account is saved, but the email could not be sent. Check email delivery and send the password link again.'
          : result.mailAccepted
            ? 'The password email was handed to the mail service. Ask the recipient to check their inbox.'
            : 'Account access updated. Existing sessions and password links for that account have been revoked.',
      );
      await load();
      return true;
    } catch (cause) {
      setError(cause.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function invite(event) {
    event.preventDefault();
    if (
      await perform(() =>
        authClient.invite({ email: email.trim(), name: name.trim(), role }),
      )
    ) {
      setEmail('');
      setName('');
    }
  }
  return (
    <section className="panel team-panel" id="team">
      <p className="eyebrow">OWNER / TEAM ACCESS</p>
      <h2>Manage users</h2>
      <p className="footnote">
        Invite staff, assign roles, and disable accounts. Only owners can manage team
        access.
      </p>
      <form className="invite-form" onSubmit={invite}>
        <label className="field">
          Name
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field">
          Work email
          <input
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
          />
        </label>
        <label className="field">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={busy}
          >
            <option value="operations">Operations Manager</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button className="primary" disabled={busy}>
          Invite user
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
      <div className="team-list">
        {users.map((user) => (
          <UserRow
            key={`${user.id}-${user.role}-${user.active}`}
            user={user}
            ownAccount={user.id === currentUser.id}
            busy={busy}
            perform={perform}
          />
        ))}
      </div>
    </section>
  );
}
function UserRow({ user, ownAccount, busy, perform }) {
  const [role, setRole] = useState(
    user.role === 'Operations Manager' ? 'operations' : 'owner',
  );
  const [active, setActive] = useState(user.active);
  return (
    <div className="team-row">
      <div>
        <strong>
          {user.name}
          {ownAccount ? ' (you)' : ''}
        </strong>
        <small>{user.email}</small>
        <small>{user.passwordSet ? 'Password set' : 'Invitation pending'}</small>
      </div>
      <label className="field">
        Role for {user.name}
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={busy || ownAccount}
        >
          <option value="owner">Owner</option>
          <option value="operations">Operations Manager</option>
        </select>
      </label>
      <label className="active-toggle">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          disabled={busy || ownAccount}
        />{' '}
        Active
      </label>
      <div className="team-actions">
        <button
          disabled={
            busy ||
            ownAccount ||
            (role === (user.role === 'Operations Manager' ? 'operations' : 'owner') &&
              active === user.active)
          }
          onClick={() =>
            perform(() => authClient.setAccess({ id: user.id, role, active }))
          }
        >
          Save access
        </button>
        <button
          disabled={busy || !user.active}
          onClick={() => perform(() => authClient.resend(user.id))}
        >
          Send password link
        </button>
      </div>
    </div>
  );
}
