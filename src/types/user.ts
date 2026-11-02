export type EntitlementState = 'not_started' | 'trial_active' | 'trial_expired' | 'paid_active' | 'paid_expired' | 'permanent'

export interface UserEntitlement {
    state: EntitlementState
    trial_started_at: string | null
    trial_expires_at: string | null
    paid_expires_at: string | null
    permanent: boolean
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    status?: number | null;
    roleId?: number | null;
    roleCode?: string | null;
    // Older persisted profiles do not contain commercial status until session refresh.
    entitlement?: UserEntitlement | null;
    wechatBound?: boolean;
    createdAt?: number;
    updatedAt?: number;
}


