import type { ApiResponse } from "@/types/api";
import { ElMessage } from "element-plus";
import { useCacheStore } from "@/stores/cacheStore";

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
  const cacheStore = useCacheStore();
  const authToken = cacheStore.token;
  let response = await fetch(`${API_BASE_URL}${url}`, {
    headers: buildHeaders(authToken, options.headers),
    ...options,
  });

  if (response.status === 401) {
    // await safeParseJson<unknown>(response);
    // const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
    
    cacheStore.setExpired(true);
    const errorMessage = '登录已过期, 请退出并重新登录, 否则会影响云端功能的正常使用！';
    showMessage(errorMessage, "error");
    showMessage(errorMessage, "error");
    showMessage(errorMessage, "error");
    throw new Error(errorMessage);
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

async function requestBlob(
  url: string,
  options: RequestInit = {}
): Promise<Blob> {
  const cacheStore = useCacheStore();
  const authToken = cacheStore.token;
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: buildHeaders(authToken, options.headers),
    ...options,
  });

  if (response.status === 401) {
    cacheStore.setExpired(true);
    const errorMessage = '登录已过期, 请退出并重新登录, 否则会影响云端功能的正常使用！';
    showMessage(errorMessage, "error");
    showMessage(errorMessage, "error");
    showMessage(errorMessage, "error");
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const errResp = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
    const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
    showMessage(errorMessage, "error");
    throw new Error(errorMessage);
  }

  return await response.blob();
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

function postBlob(url: string, data?: any): Promise<Blob> {
  return requestBlob(url, {
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

export { get, post, postBlob, put, del };
