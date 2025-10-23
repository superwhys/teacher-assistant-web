import { get, post } from "@/api/api";
import type { ApiResponse } from "@/types/api";

/**
 * 云端同步 API 封装
 */
export const cloudApi = {
  sync(data: Record<string, any>): Promise<ApiResponse<string>> {
    return post("/cloud/sync", { data });
  },
  getBackups(): Promise<ApiResponse<number[]>> {
    return get<number[]>("/cloud/backups");
  },
  getBackup(ts: number): Promise<ApiResponse<Record<string, any>>> {
    return get<Record<string, any>>("/cloud/backup", { ts });
  },
};


