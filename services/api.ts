import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export const BASE_URL = 'https://skyvendas-production.up.railway.app';

let authToken: string | null = null;

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout for file uploads
  maxContentLength: 10 * 1024 * 1024, // 10MB max file size
  maxBodyLength: 10 * 1024 * 1024, // 10MB max body size
});

// Attach Authorization header if token exists
api.interceptors.request.use((config) => {
  if (authToken && config.headers) {
    // If headers is present, set Authorization if not already set
    (config.headers as any)['Authorization'] = (config.headers as any)['Authorization'] || `Bearer ${authToken}`;
  }
  // When headers is undefined, we rely on api.defaults.headers.common set in setToken()
  return config;
});

// Log non-2xx responses to help diagnose issues (e.g., 404s)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const cfg = error?.config || {};
      const method = (cfg.method || 'get').toUpperCase();
      const url = cfg.baseURL ? `${cfg.baseURL}${cfg.url || ''}` : cfg.url || 'unknown URL';
      const status = error?.response?.status;
      
      // Enhanced error logging for debugging
      if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
        console.error(`[API ${method}] ${url} -> Network Error (sem conexão com servidor)`);
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.error(`[API ${method}] ${url} -> Timeout (60s excedido)`);
      } else {
        console.warn(`[API ${method}] ${url} -> ${status || error.message}`);
      }
    } catch {}
    return Promise.reject(error);
  }
);

export function setToken(token: string | null) {
  authToken = token;
  // Keep default header in sync for subsequent requests
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

async function request<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  try {
    const res: AxiosResponse<T> = await api.request<T>({ url: path, ...(config || {}) });
    // Axios resolves only on 2xx by default; still handle 204 explicitly
    if (res.status === 204) return undefined as unknown as T;
    return res.data;
  } catch (err: any) {
    // Let axios error bubble up to preserve error.message and error.response shape
    throw err;
  }
}

export async function getJson<T>(path: string, init?: AxiosRequestConfig): Promise<T> {
  return request<T>(path, { method: 'GET', ...(init || {}) });
}

export async function postJson<T>(path: string, body?: any, init?: AxiosRequestConfig): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    data: body !== undefined ? body : undefined,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...(init || {}),
  });
}

export async function putJson<T>(path: string, body?: any, init?: AxiosRequestConfig): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    data: body !== undefined ? body : undefined,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...(init || {}),
  });
}

export async function postFormUrlEncoded<T>(path: string, params: URLSearchParams, init?: AxiosRequestConfig): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    // Let axios handle URLSearchParams (sets proper Content-Type and body)
    data: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(init?.headers || {}) },
    ...(init || {}),
  });
}

export async function postMultipart<T>(path: string, formData: FormData, init?: AxiosRequestConfig): Promise<T> {
  // Let axios/React Native set the proper boundary automatically
  return request<T>(path, {
    method: 'POST',
    data: formData,
    ...(init || {}),
  });
}

export async function putMultipart<T>(path: string, formData: FormData, init?: AxiosRequestConfig): Promise<T> {
  // Let axios/React Native set the proper boundary automatically
  return request<T>(path, {
    method: 'PUT',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(init?.headers || {}),
    },
    timeout: 120000, // 2 minutes for file uploads
    ...(init || {}),
  });
}

export async function del<T>(path: string, init?: AxiosRequestConfig): Promise<T> {
  return request<T>(path, { method: 'DELETE', ...(init || {}) });
}
