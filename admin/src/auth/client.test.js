let authClient;
const response = (status, data, type = 'application/json') => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => type },
  json: async () => data,
});
beforeEach(() => {
  jest.resetModules();
  authClient = require('./client').authClient;
  global.fetch = jest.fn();
});
afterEach(() => {
  delete global.fetch;
});
test('auth uses same-origin cookies and CSRF instead of browser token storage', async () => {
  fetch
    .mockResolvedValueOnce(response(200, { user: null, csrfToken: 'first' }))
    .mockResolvedValueOnce(response(200, { user: { id: '1' }, csrfToken: 'rotated' }));
  await authClient.login('user@example.com', 'test-password');
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    '/api/index.php?action=session',
    expect.objectContaining({
      credentials: 'same-origin',
      method: 'GET',
      cache: 'no-store',
    }),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    '/api/index.php?action=login',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-CSRF-Token': 'first' }),
      body: JSON.stringify({ email: 'user@example.com', password: 'test-password' }),
    }),
  );
});
test('refreshes CSRF once after a pre-operation 419', async () => {
  fetch
    .mockResolvedValueOnce(response(200, { csrfToken: 'old' }))
    .mockResolvedValueOnce(response(419, { error: 'Session changed' }))
    .mockResolvedValueOnce(response(200, { csrfToken: 'fresh' }))
    .mockResolvedValueOnce(response(200, { user: null }));
  await authClient.logout();
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(fetch.mock.calls[3][1].headers['X-CSRF-Token']).toBe('fresh');
});
test('does not retry mutations after a transport failure', async () => {
  fetch
    .mockResolvedValueOnce(response(200, { csrfToken: 'token' }))
    .mockRejectedValueOnce(new Error('offline'));
  await expect(authClient.login('user@example.com', 'password')).rejects.toMatchObject({
    status: 0,
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('rejects a PHP source or HTML response rather than accepting authentication', async () => {
  fetch.mockResolvedValue(response(200, null, 'text/html'));
  await expect(authClient.session()).rejects.toMatchObject({ status: 0 });
});
test('returns server denial without exposing password values', async () => {
  fetch.mockResolvedValue(
    response(403, { error: 'You do not have permission to do that.' }),
  );
  await expect(authClient.users()).rejects.toMatchObject({
    status: 403,
    message: 'You do not have permission to do that.',
  });
});
