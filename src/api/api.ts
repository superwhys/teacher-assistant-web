import { ApiRequestError, type ApiResponse } from "@/types/api";
import { ElMessage } from "element-plus";
import { useCacheStore } from "@/stores/cacheStore";
import router from "@/routers";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const UNAUTHORIZED_CODE = 100401;
const PERMISSION_DENIED_CODE = 100403;
const UNAUTHORIZED_MESSAGE_COOLDOWN = 3000;

let isRedirectingToAuth = false;
let lastUnauthorizedRequestKey = "";
let lastUnauthorizedHandledAt = 0;

/**
 * 统一展示全局消息提示。
 */
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

/**
 * 跳转到登录页并保留当前页面作为重定向目标。
 */
async function redirectToAuth(): Promise<void> {
    if (isRedirectingToAuth) return;
    isRedirectingToAuth = true;

    try {
        const current = router.currentRoute.value;
        const redirect =
            current?.path && current.path !== "/auth" ? current.fullPath : "/points";
        await router.replace({ path: "/auth", query: { redirect } });
    } catch {
        window.location.href = "/auth";
    } finally {
        window.setTimeout(() => {
            isRedirectingToAuth = false;
        }, 500);
    }
}

/**
 * 判断当前登录失效提示是否属于短时间内的重复处理。
 */
function isDuplicateUnauthorized(token: string | null): boolean {
    const requestKey = token || "__ANONYMOUS__";
    const now = Date.now();
    const isDuplicate =
        requestKey === lastUnauthorizedRequestKey &&
        now - lastUnauthorizedHandledAt < UNAUTHORIZED_MESSAGE_COOLDOWN;

    lastUnauthorizedRequestKey = requestKey;
    lastUnauthorizedHandledAt = now;

    return isDuplicate;
}

/**
 * 处理登录失效场景并跳转到登录页。
 */
function handleUnauthorized(
    cacheStore: ReturnType<typeof useCacheStore>,
    message?: string,
    token?: string | null
): never {
    const errorMessage = message || "登录已过期，请重新登录";

    if (!isDuplicateUnauthorized(token ?? null)) {
        cacheStore.logout();
        showMessage(errorMessage, "error");
        void redirectToAuth();
    }

    throw new ApiRequestError(errorMessage);
}

/**
 * 处理权限不足；保留当前登录状态，不跳转登录页。
 */
function handlePermissionDenied(message?: string): never {
    const errorMessage = message || "您的账号没有使用该功能的权限";
    showMessage(errorMessage, "error");
    throw new ApiRequestError(errorMessage);
}

/**
 * 统一处理标准接口返回结果。
 */
function handleResponse<T>(response: ApiResponse<T>, token?: string | null): ApiResponse<T> {
    if (response.code === UNAUTHORIZED_CODE) {
        const cacheStore = useCacheStore();
        return handleUnauthorized(cacheStore, response.message, token);
    }

    if (response.code === PERMISSION_DENIED_CODE) {
        return handlePermissionDenied(response.message);
    }

    if (response.code === 0 || response.code === 200) {
        return response;
    }

    showMessage(response.message || "操作失败", "error");
    throw new ApiRequestError(response.message || "请求失败");
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

/**
 * 发送标准 JSON 请求并统一处理响应状态。
 */
async function request<T>(
    url: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const cacheStore = useCacheStore();
    const authToken = cacheStore.token;
    const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: buildHeaders(authToken, options.headers),
        ...options,
    });

    if (response.status === 401) {
        const unauthorizedResponse = await safeParseJson<T>(response);
        handleUnauthorized(
            cacheStore,
            unauthorizedResponse?.message || "登录已过期，请重新登录",
            authToken
        );
    }

    if (response.status === 403) {
        const forbiddenResponse = await safeParseJson<T>(response);
        handlePermissionDenied(forbiddenResponse?.message);
    }

    if (!response.ok) {
        const errResp = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
        const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
        showMessage(errorMessage, "error");
        throw new ApiRequestError(errorMessage);
    }

    const jsonResponse = (await safeParseJson<T>(response)) as ApiResponse<T>;

    return handleResponse<T>(jsonResponse, authToken);
}

/**
 * 发送二进制请求并统一处理响应状态。
 */
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
        const unauthorizedResponse = await safeParseJson<unknown>(response);
        handleUnauthorized(
            cacheStore,
            unauthorizedResponse?.message || "登录已过期，请重新登录",
            authToken
        );
    }

    if (response.status === 403) {
        const forbiddenResponse = await safeParseJson<unknown>(response);
        handlePermissionDenied(forbiddenResponse?.message);
    }

    if (!response.ok) {
        const errResp = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
        const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
        showMessage(errorMessage, "error");
        throw new ApiRequestError(errorMessage);
    }

    return await response.blob();
}

/**
 * 发送 GET 请求。
 */
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

/**
 * 发送 POST 请求。
 */
function post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return request<T>(url, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * 发送返回 Blob 的 POST 请求。
 */
function postBlob(url: string, data?: any): Promise<Blob> {
    return requestBlob(url, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * 发送 PUT 请求。
 */
function put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    return request<T>(url, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * 发送 DELETE 请求。
 */
function del<T>(url: string): Promise<ApiResponse<T>> {
    return request<T>(url, { method: "DELETE" });
}

export { get, post, postBlob, put, del };
