import { post } from "@/api/api";
import type { ApiResponse } from "@/types/api";
import type { VerifySecretKeyRequest } from "@/types/api";

export const secretApi = {
  verifySecretKey(data?: VerifySecretKeyRequest): Promise<ApiResponse<string>> {
    return post('/secret/verify', data);
  },
};

