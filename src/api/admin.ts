import { del, get, post, put } from '@/api/api'
import { ApiRequestError, isApiRequestError, type ApiResponse } from '@/types/api'
import { useSessionStore } from '@/stores/sessionStore'
import { useCacheStore } from '@/stores/cacheStore'
import { ElMessage } from 'element-plus'
import type { AdminAuthResponse, PaginationParams, User, Opinion } from '@/types/admin'
import type {
    CreateMenuRequest,
    CreatePermissionRequest,
    CreateRoleRequest,
    PermissionPoint,
    RbacMenu,
    Role,
    UpdatePermissionRequest,
    UpdateUserEntitlementRequest,
} from '@/types/admin'

function requireSuperAdmin(): void {
    if (!useSessionStore().isSuperAdmin) {
        ElMessage.warning('仅超级管理员可使用平台管理功能')
        throw new ApiRequestError('仅超级管理员可使用平台管理功能', 100403)
    }
}

async function adminRequest<T>(request: Promise<ApiResponse<T>>): Promise<ApiResponse<T>> {
    try {
        return await request
    } catch (error) {
        if (isApiRequestError(error)) throw error
        const message = error instanceof TypeError
            ? '网络请求失败，请检查网络连接'
            : (error instanceof Error && error.message ? error.message : '请求处理失败，请稍后重试')
        ElMessage.error(message)
        throw new ApiRequestError(message)
    }
}

async function refreshSessionAfterSave(): Promise<void> {
    try {
        await useSessionStore().refreshAfterMutation()
    } catch {
        ElMessage.warning('已保存，导航同步失败，请刷新页面重试')
    }
}

const ADMIN_API = '/admin'
const RBAC_API = `${ADMIN_API}/rbac`

export interface UserListResult {
    total: number
    items: User[]
}

export interface UserListParams extends PaginationParams {
    sort_order?: 'asc' | 'desc'
}

export interface OpinionListResult {
    total: number
    items: Opinion[]
}

export async function getUserList(params: UserListParams): Promise<ApiResponse<UserListResult>> {
    requireSuperAdmin()
    const queryParams = new URLSearchParams({
        offset: String(params.offset),
        limit: String(params.limit),
        sort_order: params.sort_order || 'asc',
    })
    return adminRequest(get<UserListResult>(`${ADMIN_API}/user/list?${queryParams}`))
}

export async function getOpinionList(params: PaginationParams): Promise<ApiResponse<OpinionListResult>> {
    requireSuperAdmin()
    const queryParams = new URLSearchParams({ offset: String(params.offset), limit: String(params.limit) })
    return adminRequest(get<OpinionListResult>(`${ADMIN_API}/feedback/list?${queryParams}`))
}

export async function adminLoginAsUser(userId: string): Promise<ApiResponse<AdminAuthResponse>> {
    requireSuperAdmin()
    return adminRequest(post<AdminAuthResponse>(`${ADMIN_API}/user/quick-login`, { user_id: userId }))
}

export interface AssignUserRoleRequest {
    user_id: string
    role_id: number
}

export async function assignRoleToUser(data: AssignUserRoleRequest): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    const response = await adminRequest(post<null>(`${ADMIN_API}/user/assign/role`, data))
    if (data.user_id === useCacheStore().profile?.id) await refreshSessionAfterSave()
    return response
}

export async function updateUserEntitlement(userId: string, data: UpdateUserEntitlementRequest): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    const response = await adminRequest(put<null>(`${ADMIN_API}/user/${encodeURIComponent(userId)}/entitlement`, data))
    if (userId === useCacheStore().profile?.id) await refreshSessionAfterSave()
    return response
}

export async function getRoleList(): Promise<ApiResponse<Role[]>> {
    requireSuperAdmin()
    return adminRequest(get<Role[]>(`${RBAC_API}/roles`))
}

export async function createRole(data: CreateRoleRequest): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    return adminRequest(post<null>(`${RBAC_API}/roles`, data))
}

export async function replaceRolePermissions(roleId: number, permissionIds: number[]): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    return adminRequest(put<null>(`${RBAC_API}/roles/${roleId}/permissions`, { permission_ids: permissionIds }))
}

export async function getPermissionList(): Promise<ApiResponse<PermissionPoint[]>> {
    requireSuperAdmin()
    return adminRequest(get<PermissionPoint[]>(`${RBAC_API}/permissions`))
}

export async function createPermission(data: CreatePermissionRequest): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    return adminRequest(post<null>(`${RBAC_API}/permissions`, data))
}

export async function updatePermission(permissionId: number, data: UpdatePermissionRequest): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    return adminRequest(put<null>(`${RBAC_API}/permissions/${permissionId}`, data))
}

export async function deletePermission(permissionId: number): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    return adminRequest(del<null>(`${RBAC_API}/permissions/${permissionId}`))
}

export async function getMenuList(): Promise<ApiResponse<RbacMenu[]>> {
    requireSuperAdmin()
    return adminRequest(get<RbacMenu[]>(`${RBAC_API}/menus`))
}

export async function createMenu(data: CreateMenuRequest): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    const response = await adminRequest(post<null>(`${RBAC_API}/menus`, data))
    await refreshSessionAfterSave()
    return response
}

export async function updateMenu(menuId: number, data: Pick<RbacMenu, 'name' | 'icon' | 'enabled'>): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    const response = await adminRequest(put<null>(`${RBAC_API}/menus/${menuId}`, data))
    await refreshSessionAfterSave()
    return response
}

export async function reorderMenus(menuIds: number[]): Promise<ApiResponse<null>> {
    requireSuperAdmin()
    const response = await adminRequest(put<null>(`${RBAC_API}/menus/order`, { menu_ids: menuIds }))
    await refreshSessionAfterSave()
    return response
}
