let csrfToken = '';

export function setCsrfToken(token) {
  csrfToken = token ?? '';
}

export async function apiRequest(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers ?? {});
  if (typeof options.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers.set('X-CSRF-Token', csrfToken);

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new Error('API belum tersambung. Pastikan backend dan MySQL sedang berjalan.');
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message ?? 'Permintaan gagal.');
    error.status = response.status;
    // Field-level messages from the server validator, e.g. { sku: 'SKU sudah digunakan.' }
    error.fields = {};
    for (const issue of payload.errors ?? []) error.fields[issue.field] ??= issue.message;
    throw error;
  }
  return payload;
}

export function get(path) {
  return apiRequest(path);
}

export function post(path, body) {
  return apiRequest(path, { method: 'POST', body: JSON.stringify(body) });
}

export function put(path, body) {
  return apiRequest(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function remove(path) {
  return apiRequest(path, { method: 'DELETE' });
}

export function patch(path, body) {
  return apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
}

// Sends a file as the raw request body (used for product photos).
export function upload(path, file) {
  return apiRequest(path, { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
}
