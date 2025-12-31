export interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    status?: number | null;
    roleId?: number | null;
    createdAt?: number;
    updatedAt?: number;
}


