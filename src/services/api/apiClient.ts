/**
 * Central API Client for SQM Backend REST API
 *
 * - Reads base URL dynamically from environment (VITE_API_BASE_URL) or defaults to relative '/api/v1'
 * - Handles timeouts via AbortController
 * - Attaches Bearer JWT access token if an active session exists
 * - Automatic token rotation via Refresh Token on 401 responses
 * - Never exposes or logs secrets
 * - Formats responses into standard ApiResponse<T>
 * - Safe offline behavior: Never throws unhandled exceptions on network failure
 */

import { ApiResponse } from '../../architecture/contracts';

const AUTH_TOKEN_STORAGE_KEY = 'sqm_auth_jwt_token_v1';
const AUTH_REFRESH_TOKEN_STORAGE_KEY = 'sqm_auth_refresh_token_v1';

export const authSessionManager = {
  getToken(): string | null {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
  },
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(AUTH_REFRESH_TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable
    }
  },
  clearTokens(): void {
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(AUTH_REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // Storage unavailable
    }
  },
};

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeoutMs: number;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    const envBase = (import.meta as any).env?.VITE_API_BASE_URL;
    this.baseUrl = (envBase && typeof envBase === 'string' && envBase.trim())
      ? envBase.trim().replace(/\/$/, '')
      : '/api/v1';
    this.defaultTimeoutMs = 6000;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const refreshToken = authSessionManager.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.success && data?.data?.token) {
            authSessionManager.setToken(data.data.token);
            if (data.data.refreshToken) {
              authSessionManager.setRefreshToken(data.data.refreshToken);
            }
            return true;
          }
        }

        // Invalid or revoked refresh token
        authSessionManager.clearTokens();
        return false;
      } catch (err) {
        console.warn('[ApiClient] Failed to refresh access token:', err);
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const { timeoutMs = this.defaultTimeoutMs, skipAuth = false, headers = {}, ...restInit } = options;

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...(headers as Record<string, string>),
    };

    if (!skipAuth) {
      const token = authSessionManager.getToken();
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        ...restInit,
        headers: reqHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized with automatic token refresh if possible
      if (
        response.status === 401 &&
        !isRetry &&
        !endpoint.includes('/auth/refresh') &&
        !endpoint.includes('/auth/controller-login') &&
        !endpoint.includes('/auth/user-login') &&
        authSessionManager.getRefreshToken()
      ) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.request<T>(endpoint, options, true);
        }
      }

      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = { message: text };
        }
      }

      if (!response.ok) {
        let msg = responseData?.message;
        if (!msg || typeof msg !== 'string' || msg.trim().startsWith('<')) {
          msg =
            response.status === 401
              ? 'توکن احراز هویت الزامی است یا منقضی شده است.'
              : response.status === 403
              ? 'دسترسی غیرمجاز (۴۰۳)'
              : response.status === 404
              ? 'مسیر یا منبع مورد نظر یافت نشد (۴۰۴)'
              : `خطای سرور (${response.status})`;
        }
        return {
          success: false,
          message: msg,
          errorCode: String(response.status),
          timestamp: responseData?.timestamp || new Date().toISOString(),
        };
      }

      // If backend wrapped response in { success: true, data: ... }
      if (responseData && typeof responseData === 'object' && 'success' in responseData) {
        return responseData as ApiResponse<T>;
      }

      return {
        success: true,
        data: responseData as T,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        message: isTimeout
          ? 'مهلت زمان درخواست به پایان رسید (Timeout)'
          : (err.message || 'خطای اتصال به سرور'),
        errorCode: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
      };
    }
  }

  public async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public getToken(): string | null {
    return authSessionManager.getToken();
  }

  public setToken(token: string | null): void {
    authSessionManager.setToken(token);
  }

  public getRefreshToken(): string | null {
    return authSessionManager.getRefreshToken();
  }

  public setRefreshToken(token: string | null): void {
    authSessionManager.setRefreshToken(token);
  }

  public clearTokens(): void {
    authSessionManager.clearTokens();
  }
}

export const apiClient = new ApiClient();
