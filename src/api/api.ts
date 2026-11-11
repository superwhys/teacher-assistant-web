import { ApiRequestError, type ApiResponse } from "@/types/api";
import { ElMessage } from "element-plus";
import { useCacheStore } from "@/stores/cacheStore";
import router from "@/routers";
import { allowsEntitlementRequest, editionRequestMessage, effectiveEntitlementState, entitlementMessage } from "@/utils/entitlement";
import { notifyEntitlementRejected } from "@/utils/entitlementEvents";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const UNAUTHORIZED_CODE = 100401;
const PERMISSION_DENIED_CODE = 100403;
const COMMERCIAL_DENIED_CODES = new Set([200402, 200403, 200404]);
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

    if (token && cacheStore.token !== token) throw new ApiRequestError("账号已切换，请刷新页面");

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
function handlePermissionDenied(message?: string, code = PERMISSION_DENIED_CODE, token?: string | null): never {
    const errorMessage = message || "您的账号没有使用该功能的权限";
    if (token && COMMERCIAL_DENIED_CODES.has(code)) {
        const cache = useCacheStore();
        if (cache.token === token && cache.profile?.entitlement) {
            const state = code === 200402 ? "trial_expired" : (code === 200404 ? "paid_expired" : "not_started");
            cache.updateProfile({ ...cache.profile, roleCode: cache.profile.roleCode === 'admin' ? null : cache.profile.roleCode, entitlement: { ...cache.profile.entitlement, state } });
        }
        notifyEntitlementRejected(token, code);
    }
    showMessage(errorMessage, "error");
    throw new ApiRequestError(errorMessage, code);
}

function assertCommercialAccess(url: string, method: string, token: string | null): void {
    const cache = useCacheStore();
    if (!token || allowsEntitlementRequest(cache.profile, method, url)) return;
    const state = effectiveEntitlementState(cache.profile);
    const editionMessage = editionRequestMessage(cache.profile, method, url);
    if (editionMessage) {
        showMessage(editionMessage, "warning");
        throw new ApiRequestError(editionMessage, PERMISSION_DENIED_CODE);
    }
    const code = state === "trial_expired" ? 200402 : (state === "paid_expired" ? 200404 : 200403);
    const message = entitlementMessage(state);
    showMessage(message, "warning");
    throw new ApiRequestError(message, code);
}

/**
 * 统一处理标准接口返回结果。
 */
function handleResponse<T>(response: ApiResponse<T>, token?: string | null): ApiResponse<T> {
    if (response.code === UNAUTHORIZED_CODE) {
        const cacheStore = useCacheStore();
        return handleUnauthorized(cacheStore, response.message, token);
    }

    if (response.code === PERMISSION_DENIED_CODE || COMMERCIAL_DENIED_CODES.has(response.code)) {
        return handlePermissionDenied(response.message, response.code, token);
    }

    if (response.code === 0 || response.code === 200) {
        return response;
    }

    showMessage(response.message || "操作失败", "error");
    throw new ApiRequestError(response.message || "请求失败", response.code);
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
    assertCommercialAccess(url, options.method || "GET", authToken);
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
        handlePermissionDenied(forbiddenResponse?.message, forbiddenResponse?.code || PERMISSION_DENIED_CODE, authToken);
    }

    if (!response.ok) {
        const errResp = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
        const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
        showMessage(errorMessage, "error");
        throw new ApiRequestError(errorMessage);
    }

    const jsonResponse = (await safeParseJson<T>(response)) as ApiResponse<T>;

    if (authToken && cacheStore.token !== authToken) throw new ApiRequestError("账号已切换，请刷新页面");

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
    assertCommercialAccess(url, options.method || "GET", authToken);
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
        handlePermissionDenied(forbiddenResponse?.message, forbiddenResponse?.code || PERMISSION_DENIED_CODE, authToken);
    }

    if (!response.ok) {
        const errResp = (await safeParseJson<unknown>(response)) as ApiResponse<unknown> | null;
        const errorMessage = errResp?.message || `HTTP error! status: ${response.status}`;
        showMessage(errorMessage, "error");
        throw new ApiRequestError(errorMessage);
    }

    const blob = await response.blob();
    if (authToken && cacheStore.token !== authToken) throw new ApiRequestError("账号已切换，请刷新页面");
    return blob;
}

/** 事件流沿用统一鉴权和业务错误处理，消费端负责 SSE 协议解析。 */
async function requestStream(url: string, signal?: AbortSignal) {
    const cacheStore = useCacheStore();
    const authToken = cacheStore.token;
    const assertCurrentSession = () => {
        signal?.throwIfAborted();
        if (cacheStore.token !== authToken) throw new ApiRequestError("账号已切换，请刷新页面");
    };
    const handleBusinessResponse = (payload: unknown) => {
        assertCurrentSession();
        if (!payload || typeof payload !== "object"
            || !("code" in payload) || typeof payload.code !== "number"
            || !("message" in payload) || typeof payload.message !== "string") {
            throw new ApiRequestError("服务器返回了无效响应，请重试");
        }
        return handleResponse(payload as ApiResponse<unknown>, authToken);
    };

    assertCurrentSession();
    assertCommercialAccess(url, "GET", authToken);
    const response = await fetch(`${API_BASE_URL}${url}`, {
        method: "GET",
        headers: buildHeaders(authToken, { Accept: "text/event-stream" }),
        signal,
    });
    assertCurrentSession();
    if (response.status === 401) {
        const failure = await safeParseJson<unknown>(response);
        assertCurrentSession();
        handleUnauthorized(cacheStore, typeof failure?.message === "string" ? failure.message : undefined, authToken);
    }
    if (response.status === 403) {
        const failure = await safeParseJson<unknown>(response);
        assertCurrentSession();
        handlePermissionDenied(typeof failure?.message === "string" ? failure.message : undefined,
            typeof failure?.code === "number" ? failure.code : PERMISSION_DENIED_CODE, authToken);
    }
    if (!response.ok) {
        const failure = await safeParseJson<unknown>(response);
        if (failure) handleBusinessResponse(failure);
        throw new ApiRequestError(`请求失败（HTTP ${response.status}），请重试`);
    }
    if (response.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "text/event-stream") {
        handleBusinessResponse(await safeParseJson<unknown>(response));
        throw new ApiRequestError("服务器未返回事件流，请重试");
    }
    if (!response.body) throw new ApiRequestError("事件流连接已中断，请重试");
    return { body: response.body, assertCurrentSession, handleBusinessResponse };
}

/**
 * 发送 GET 请求。
 */
function get<T>(
    url: string,
    params?: Record<string, any>,
    options: Pick<RequestInit, "signal"> = {}
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

    return request<T>(fullUrl, { method: "GET", ...options });
}

/**
 * 发送 POST 请求。
 */
function post<T>(url: string, data?: any, options: Pick<RequestInit, "signal"> = {}): Promise<ApiResponse<T>> {
    return request<T>(url, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
        ...options,
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

export { get, post, postBlob, put, del, requestStream };
