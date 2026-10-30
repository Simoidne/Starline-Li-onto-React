import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { request, authClient } from './auth/client';

jest.mock('./auth/client', () => ({
  request: jest.fn(),
  authClient: {
    session: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    bootstrap: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    users: jest.fn(),
    invite: jest.fn(),
    resend: jest.fn(),
    setAccess: jest.fn(),
  },
}));
const user = {
  id: '1',
  email: 'ops@example.com',
  name: 'Alex',
  role: 'Operations Manager',
};
const anonymous = { user: null, setupRequired: false };

beforeEach(() => {
  jest.resetAllMocks();
  request.mockResolvedValue({ products: [] });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
  window.history.replaceState({}, '', '/');
  authClient.session.mockResolvedValue(anonymous);
  authClient.login.mockResolvedValue({ user });
  authClient.logout.mockResolvedValue({ user: null });
  authClient.forgotPassword.mockResolvedValue({ ok: true });
  authClient.resetPassword.mockResolvedValue({ user: null });
  authClient.changePassword.mockResolvedValue({ user: null });
  authClient.users.mockResolvedValue({ users: [] });
});
async function mount() {
  await act(async () => {
    render(<App />);
  });
}

async function fillLogin() {
  await screen.findByRole('button', { name: 'Sign in' });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'example-password' },
  });
}

test('failed login keeps dashboard hidden and clears the password', async () => {
  authClient.login.mockRejectedValue(new Error('The email or password is incorrect.'));
  await mount();
  await fillLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('alert');
  expect(authClient.login).toHaveBeenCalledWith(user.email, 'example-password');
  expect(screen.getByLabelText('Password').value).toBe('');
  expect(screen.queryByText('Every cost. In perspective.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Owner' })).toBeNull();
});

test('valid login uses the server role and logout closes the dashboard', async () => {
  await mount();
  await fillLogin();
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByText('Estimated gross profit');
  expect(screen.getByText('Estimated gross margin')).toBeTruthy();
  expect(screen.queryByText('Manage users')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('button', { name: 'Sign in' });
  expect(authClient.logout).toHaveBeenCalledTimes(1);
});

test('restores an authenticated owner session and shows team management', async () => {
  authClient.session.mockResolvedValue({ user: { ...user, role: 'Owner' } });
  await mount();
  await screen.findByText('Manage users');
  expect(screen.getByText('Estimated gross profit')).toBeTruthy();
  expect(authClient.users).toHaveBeenCalled();
});

test('fails closed when the server is unavailable or returns an unknown role', async () => {
  authClient.session.mockResolvedValue({ user: { ...user, role: 'invalid' } });
  await mount();
  await screen.findByText('Unable to connect');
  expect(screen.queryByText('Every cost. In perspective.')).toBeNull();
});

test('first-owner setup requires the private setup code', async () => {
  authClient.session.mockResolvedValue({ user: null, setupRequired: true });
  authClient.bootstrap.mockRejectedValue(
    new Error('The setup code is incorrect or setup is unavailable.'),
  );
  await mount();
  await screen.findByText('Create the first owner');
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'example-password' },
  });
  fireEvent.change(screen.getByLabelText('Setup code'), { target: { value: 'invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create owner account' }));
  await screen.findByRole('alert');
  expect(authClient.bootstrap).toHaveBeenCalledWith({
    email: user.email,
    name: 'Alex',
    password: 'example-password',
    setupCode: 'invalid',
  });
  expect(screen.queryByText('Every cost. In perspective.')).toBeNull();
});

test('password reset response does not reveal account existence', async () => {
  await mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect((await screen.findByRole('status')).textContent).toContain(
    'If this email belongs to an active account',
  );
  expect(authClient.forgotPassword).toHaveBeenCalledWith(user.email);
});

test('recovery consumes a fragment token, checks confirmation and clears the URL', async () => {
  const token = 'a'.repeat(64);
  window.history.replaceState({}, '', `/#reset=${token}`);
  await mount();
  await screen.findByText('Set your password');
  expect(window.location.hash).toBe('');
  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'replacement-password' },
  });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'different-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  expect(screen.getByRole('alert').textContent).toContain('do not match');
  expect(authClient.resetPassword).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: 'replacement-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save password' }));
  await screen.findByText('Password updated');
  expect(authClient.resetPassword).toHaveBeenCalledWith(token, 'replacement-password');
  fireEvent.click(screen.getByRole('button', { name: 'Return to sign in' }));
  await screen.findByRole('button', { name: 'Sign in' });
});

test('a late session refresh cannot reopen the dashboard after logout', async () => {
  authClient.session.mockResolvedValueOnce({ user });
  await mount();
  await screen.findByText('Estimated gross profit');
  let finish;
  authClient.session.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  act(() => window.dispatchEvent(new Event('focus')));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('button', { name: 'Sign in' });
  await act(async () => finish({ user }));
  expect(screen.queryByText('Every cost. In perspective.')).toBeNull();
});

test('a revoked session is removed when the app regains focus', async () => {
  authClient.session.mockResolvedValueOnce({ user }).mockResolvedValue(anonymous);
  await mount();
  await screen.findByText('Estimated gross profit');
  act(() => window.dispatchEvent(new Event('focus')));
  await screen.findByRole('button', { name: 'Sign in' });
});
