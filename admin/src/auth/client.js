let csrfToken = null;
let requestSequence = 0;
let latestTokenSequence = 0;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(action, body, retry = true, params = {}) {
  if (body !== undefined && !csrfToken) await request('session');
  const sequence = ++requestSequence;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response, data;
  try {
    response = await fetch(
      `/api/index.php?${new URLSearchParams({ action, ...params })}`,
      {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body === undefined
            ? {}
            : {
                ...(body instanceof FormData
                  ? {}
                  : { 'Content-Type': 'application/json' }),
                'X-CSRF-Token': csrfToken,
              }),
        },
        ...(body === undefined
          ? {}
          : { body: body instanceof FormData ? body : JSON.stringify(body) }),
      },
    );
    if (!(response.headers.get('content-type') || '').includes('application/json'))
      throw new Error('Invalid server response');
    data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error('Invalid server response');
  } catch {
    throw new ApiError(
      'Unable to reach the sign-in service. Check your connection and try again.',
      0,
    );
  } finally {
    clearTimeout(timeout);
  }
  if (data.csrfToken && sequence >= latestTokenSequence) {
    csrfToken = data.csrfToken;
    latestTokenSequence = sequence;
  }
  // A 419 is returned before any operation, so retrying once cannot repeat a mutation.
  if (response.status === 419 && retry) {
    await request('session');
    return request(action, body, false, params);
  }
  if (!response.ok)
    throw new ApiError(
      data.error || 'The request could not be completed.',
      response.status,
    );
  return data;
}

export const authClient = {
  session: () => request('session'),
  login: (email, password) => request('login', { email, password }),
  logout: () => request('logout', {}),
  bootstrap: (values) => request('bootstrap', values),
  forgotPassword: (email) => request('forgot-password', { email }),
  resetPassword: (token, password) => request('reset-password', { token, password }),
  changePassword: (currentPassword, password) =>
    request('change-password', { currentPassword, password }),
  users: () => request('users'),
  invite: (values) => request('invite', values),
  resend: (id) => request('resend-invitation', { id }),
  setAccess: (values) => request('set-access', values),
};
