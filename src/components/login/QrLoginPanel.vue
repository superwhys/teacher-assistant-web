<template>
    <section class="qr-login-panel" :aria-label="isBinding ? '扫码绑定小程序' : '小程序扫码登录'">
        <p class="qr-instruction">{{ isBinding ? '使用微信扫一扫，在小程序中确认绑定，无需验证码' : '使用微信扫一扫，在小程序中确认登录' }}</p>
        <div class="qr-image-box" :aria-busy="status === 'loading'">
            <img v-if="qrCode && status === 'pending'" class="qr-image" :src="qrCode" :alt="isBinding ? '微信小程序绑定二维码' : '微信小程序登录二维码'" />
            <div v-else class="qr-placeholder" role="status">
                {{ status === 'loading' ? '二维码加载中...' : status === 'success' ? isBinding ? '小程序绑定成功' : '已确认，正在登录...' : errorMessage }}
            </div>
        </div>
        <p class="qr-status" aria-live="polite">
            {{ status === 'pending' ? errorMessage || `二维码 ${remainingSeconds} 秒后失效` : status === 'success' ? '请稍候' : '刷新二维码后重新扫码' }}
        </p>
        <button
            class="qr-refresh-button"
            type="button"
            :disabled="status === 'loading' || status === 'success'"
            @click="createQrCode"
        >
            {{ status === 'error' ? '重试' : '刷新二维码' }}
        </button>
    </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { authApi } from "@/api/auth";
import { isApiRequestError } from "@/types/api";

type QrStatus = "idle" | "loading" | "pending" | "expired" | "consumed" | "error" | "success";

const props = withDefaults(defineProps<{ purpose?: "login" | "bind" }>(), { purpose: "login" });
const emit = defineEmits<{ authenticated: [token: string]; bound: [] }>();
const isBinding = computed(() => props.purpose === "bind");
const status = ref<QrStatus>("idle");
const qrCode = ref("");
const remainingSeconds = ref(0);
const errorMessage = ref("");

let serialNo = "";
let claimSecret = "";
let expiresAt = 0;
let generation = 0;
let isUnmounted = false;
let pollInFlight = false;
let pollTimer: number | undefined;
let expiryTimer: number | undefined;

function stopSession(): void {
    generation += 1;
    if (pollTimer !== undefined) {
        window.clearTimeout(pollTimer);
        pollTimer = undefined;
    }
    if (expiryTimer !== undefined) {
        window.clearInterval(expiryTimer);
        expiryTimer = undefined;
    }
    serialNo = "";
    claimSecret = "";
}

function isCurrent(version: number): boolean {
    return !isUnmounted && generation === version;
}

function expireSession(): void {
    stopSession();
    status.value = "expired";
    remainingSeconds.value = 0;
    errorMessage.value = "二维码已过期";
}

function failSession(message: string): void {
    stopSession();
    status.value = "error";
    errorMessage.value = message;
}

function updateRemaining(): void {
    remainingSeconds.value = Math.max(0, Math.ceil(expiresAt - Date.now() / 1000));
    if (remainingSeconds.value === 0) {
        expireSession();
    }
}

function schedulePoll(version: number): void {
    if (!isCurrent(version) || status.value !== "pending") {
        return;
    }
    pollTimer = window.setTimeout(() => {
        pollTimer = undefined;
        void pollSession(version);
    }, 2000);
}

async function pollSession(version: number): Promise<void> {
    if (!isCurrent(version) || status.value !== "pending") {
        return;
    }
    updateRemaining();
    if (!isCurrent(version)) {
        return;
    }
    if (pollInFlight) {
        schedulePoll(version);
        return;
    }
    pollInFlight = true;
    try {
        const request = { serial_no: serialNo, claim_secret: claimSecret };
        const response = isBinding.value ? await authApi.pollQrBinding(request) : await authApi.pollQrLogin(request);
        if (!isCurrent(version)) {
            return;
        }
        const result = response.data;
        errorMessage.value = "";
        if (result?.status === "pending") {
            return;
        }
        if (result?.status === "expired") {
            expireSession();
            return;
        }
        if (result?.status === "consumed") {
            stopSession();
            status.value = "consumed";
            errorMessage.value = "登录结果已领取，请刷新二维码重新扫码";
            return;
        }
        if (result?.status === "success" && isBinding.value) {
            stopSession();
            status.value = "success";
            emit("bound");
            return;
        }
        if (result?.status !== "success" || !("token" in result) || typeof result.token !== "string" || !result.token.trim()) {
            failSession(isBinding.value ? "绑定结果异常，请刷新二维码重试" : "扫码登录结果异常，请刷新二维码重试");
            return;
        }
        stopSession();
        status.value = "success";
        emit("authenticated", result.token.trim());
    } catch (err) {
        if (!isCurrent(version)) {
            return;
        }
        if (isApiRequestError(err)) {
            failSession(err.message || "二维码状态获取失败，请重试");
        } else {
            errorMessage.value = "连接暂时中断，正在重试...";
        }
    } finally {
        pollInFlight = false;
        schedulePoll(version);
    }
}

async function createQrCode(): Promise<void> {
    if (isUnmounted || status.value === "loading") {
        return;
    }
    stopSession();
    const version = generation;
    status.value = "loading";
    qrCode.value = "";
    errorMessage.value = "";
    remainingSeconds.value = 0;
    try {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        const nextSerial = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
        const request = { serial_no: nextSerial };
        const response = isBinding.value ? await authApi.createQrBinding(request) : await authApi.createQrLogin(request);
        if (!isCurrent(version)) {
            return;
        }
        const result = response.data;
        if (!result || result.serial_no !== nextSerial || typeof result.claim_secret !== "string" || !result.claim_secret.trim()
            || typeof result.qr_code !== "string" || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(result.qr_code)
            || !Number.isFinite(result.expires_at)) {
            throw new Error("二维码数据异常");
        }
        serialNo = result.serial_no;
        claimSecret = result.claim_secret;
        expiresAt = result.expires_at;
        qrCode.value = result.qr_code;
        status.value = "pending";
        updateRemaining();
        if (!isCurrent(version)) {
            return;
        }
        expiryTimer = window.setInterval(updateRemaining, 1000);
        schedulePoll(version);
    } catch (err) {
        if (!isCurrent(version)) {
            return;
        }
        status.value = "error";
        errorMessage.value = isApiRequestError(err) ? err.message : "二维码加载失败，请重试";
    }
}

onMounted(() => { void createQrCode(); });
onBeforeUnmount(() => {
    isUnmounted = true;
    stopSession();
});
</script>

<style scoped>
.qr-login-panel {
    min-height: 280px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
}

.qr-instruction,
.qr-status {
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 20px;
}

.qr-image-box {
    width: 176px;
    height: 176px;
    display: grid;
    place-items: center;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: #ffffff;
}

.qr-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 12px;
}

.qr-placeholder {
    padding: 16px;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.6;
}

.qr-status {
    min-height: 20px;
    color: var(--ta-text-tertiary);
}

.qr-refresh-button {
    min-height: 28px;
    padding: 0 8px;
    border: 0;
    border-radius: 6px;
    color: var(--ta-blue);
    background: transparent;
    font-size: 13px;
    cursor: pointer;
}

.qr-refresh-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
</style>
