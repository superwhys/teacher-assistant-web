import { get, post } from "@/api/api";
import type { ApiResponse, CloudBackupsMap, CloudSyncType } from "@/types/api";

/**
 * 云端同步 API 封装
 */
export const cloudApi = {
    sync(data: Record<string, any>, syncType: CloudSyncType): Promise<ApiResponse<string>> {
        return post("/cloud/sync", { sync_type: syncType, data });
    },
    getBackups(): Promise<ApiResponse<CloudBackupsMap>> {
        return get<CloudBackupsMap>("/cloud/backups");
    },
    getBackup(ts: number, syncType: CloudSyncType): Promise<ApiResponse<Record<string, any>>> {
        return get<Record<string, any>>("/cloud/backup", { ts, sync_type: syncType });
    },
};


