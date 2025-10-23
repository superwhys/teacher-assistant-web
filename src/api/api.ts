import type { ApiResponse } from "@/types/api";
import { ElMessage } from "element-plus";
import { secretApi } from "@/api/secret";
import { useSettingsStore } from "@/stores/settingsStore";
import { useLicenseStore } from "@/stores/licenseStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

function showMessage(
  message: string,
  type: "success" | "error" | "warning" = "error"
) {
  ElMessage({
    message,
    type,
    duration: 3000,
    showClose: true,
  });
}

function handleResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
  if (response.code === 0 || response.code === 200) {
    return response;
  } else {
    showMessage(response.message || "操作失败", "error");
    throw new Error(response.message || "请求失败");
  }
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * 使用本地保存的明文密钥刷新 token（并发场景下复用同一个 Promise）。
 */
async function refreshTokenBySecret(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const settingsStore = useSettingsStore();
        await settingsStore.hydrate();
        const secret = settingsStore.secretKey?.trim();
        if (!secret) return null;
        const verifyRes = await secretApi.verifySecretKey({ secret });
        const newToken = verifyRes.data;
        if (newToken) {
          localStorage.setItem("token", newToken);
          try {
            const licenseStore = useLicenseStore();
            await licenseStore.setTokenAndVerify(newToken);
          } catch {}
          return newToken;
        }
        return null;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * 构建带 Authorization 的请求头。
 */
function buildHeaders(token: string | null, extra?: HeadersInit): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: token }),
    ...(extra || {}),
  } as HeadersInit;
}

/**
 * 安全解析返回体为 ApiResponse<T>，解析失败返回 null。
 */
async function safeParseJson<T>(response: Response): Promise<ApiResponse<T> | null> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return null;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("token");
  let response = await fetch(`${API_BASE_URL}${url}`, {
    headers: buildHeaders(token, options.headers),
    ...options,
  });

  // 未授权且业务码提示已过期 -> 触发单例刷新并重试一次
  if (response.status === 401) {
    const errResp = await safeParseJson<unknown>(response);
    if (errResp && errResp.code === 10004) {
      const newToken = await refreshTokenBySecret();
      if (newToken) {
        response = await fetch(`${API_BASE_URL}${url}`, {
          headers: buildHeaders(newToken, options.headers),
          ...options,
        });
      }
    }
    if (response.status === 401) {
      const stillErr = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
      const errorMessage = stillErr?.message || `HTTP error! status: ${response.status}`;
      showMessage(errorMessage, "error");
      throw new Error(errorMessage);
    }
  }

  if (!response.ok) {
    const errResp = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
    const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
    showMessage(errorMessage, "error");
    throw new Error(errorMessage);
  }

  const jsonResponse = (await safeParseJson<T>(response)) as ApiResponse<T>;

  return handleResponse<T>(jsonResponse);
}

// GET请求
function get<T>(
  url: string,
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }
  const queryString = searchParams.toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  return request<T>(fullUrl, { method: "GET" });
}

// POST请求
function post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// PUT请求
function put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
  return request<T>(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  });
}

// DELETE请求
function del<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: "DELETE" });
}

export { get, post, put, del };
