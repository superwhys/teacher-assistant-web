import type { UserProfile } from '@/types/user'

export interface SessionRole {
    id: number
    code: string
    name: string
}

export interface SidebarMenu {
    id: number
    code: string
    name: string
    route_key: string
    icon: string
    sort: number
}

export interface SessionInitResponse {
    user: UserProfile
    role: SessionRole | null
    config: {
        sidebar: SidebarMenu[]
    }
}
