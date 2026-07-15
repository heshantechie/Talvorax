const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

/**
 * Shared fetch helper for communication APIs.
 * Supports:
 * - apiCall(method, endpoint, token, body)
 * - apiCall(endpoint, token) [defaults to GET]
 */
export const apiCall = async (
  methodOrEndpoint: string,
  endpointOrToken: string | null,
  tokenOrBody?: string | null | any,
  body?: any
): Promise<any> => {
  let method = 'GET';
  let endpoint = methodOrEndpoint;
  let token = endpointOrToken;
  let requestBody = tokenOrBody;

  const isMethod = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(methodOrEndpoint.toUpperCase());
  if (isMethod) {
    method = methodOrEndpoint;
    endpoint = endpointOrToken || '';
    token = tokenOrBody || null;
    requestBody = body;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: requestBody ? JSON.stringify(requestBody) : undefined
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};
