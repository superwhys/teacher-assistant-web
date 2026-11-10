import type { UserEntitlement } from '@/types/user'

export interface PermissionAPIBinding {
    method: string
    path: string
}

export interface PermissionPoint {
    id: number
    code: string
    name: string
    module: string
    action: string
    api_bindings: PermissionAPIBinding[]
}

export interface Role {
    id: number
    code: string
    name: string
    timeout: number
    system: boolean
    permissions: PermissionPoint[]
}

export interface CreateMenuRequest {
    code: string
    name: string
    route_key: string
    icon: string
    sort: number
}

export interface RbacMenu {
    id: number
    code: string
    name: string
    route_key: string
    icon: string
    sort: number
    enabled: boolean
    view_permission_id: number
    view_permission_code: string
    role_codes: string[]
}

export interface CreateRoleRequest {
    code: string
    name: string
    timeout: number
}

export interface CreatePermissionRequest {
    code: string
    name: string
    module: string
    action: string
    api_bindings: PermissionAPIBinding[]
}

export interface UpdatePermissionRequest {
    name: string
    module: string
    action: string
    api_bindings: PermissionAPIBinding[]
}


export interface User {
    id: string
    email: string
    name: string
    status: number
    role_id: number
    role?: Role | null
    entitlement: UserEntitlement
    json_ext?: Record<string, any>
    created_at?: string
}


export interface Opinion {
    id: number
    content: string
    status: number
    created_at: string
}


export interface PaginationParams {
    offset: number
    limit: number
}

export interface AdminAuthResponse {
    token: string
}
