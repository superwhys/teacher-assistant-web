<template>
    <AppNoticeBar class="account-entitlement" :title="statusText" :description="descriptionText"
        :detail="expiresAtText" :tone="sessionStore.canWrite ? 'muted' : 'warning'">
        <template v-if="sessionStore.entitlementState !== 'permanent'" #action>
            <RouterLink v-if="sessionStore.entitlementState !== 'unavailable'" to="/subscription"
                class="app-notice-bar__action account-entitlement__subscribe">
                {{ sessionStore.entitlementState === 'paid_active' ? '查看套餐与续费' : '开通正式版' }}
            </RouterLink>
            <button v-if="sessionStore.entitlementState === 'not_started'" type="button"
                class="app-notice-bar__action" :disabled="confirming || sessionStore.startingTrial" @click="confirmStartTrial">
                {{ sessionStore.startingTrial ? "开启中..." : "开启 14 天免费试用" }}
            </button>
            <button v-else-if="sessionStore.entitlementState === 'unavailable'" type="button" class="app-notice-bar__action"
                :disabled="synchronizing" @click="synchronizeEntitlement">
                {{ synchronizing ? "同步中..." : "重新同步权益" }}
            </button>
        </template>
    </AppNoticeBar>
</template>

<script setup lang="ts">
import { useCacheStore } from "@/stores/cacheStore";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiRequestError } from "@/types/api";
import AppNoticeBar from "@/v3/components/AppNoticeBar.vue";
import { ElMessage } from "element-plus";
import { confirmDialog } from "@/utils/confirmDialog";
import { computed, ref } from "vue";
import { RouterLink } from "vue-router";

const cacheStore = useCacheStore()
const sessionStore = useSessionStore()
const confirming = ref(false)
const synchronizing = ref(false)

const statusText = computed(() => {
    switch (sessionStore.entitlementState) {
        case "not_started": return "试用尚未开启"
        case "trial_active": return "14 天免费试用中"
        case "trial_expired": return "试用已到期 · 仅可查看"
        case "paid_active": return "付费权益有效"
        case "paid_expired": return "付费权益已到期 · 仅可查看"
        case "permanent": return "长期使用权益"
        default: return "暂时无法获取使用权益"
    }
})

const descriptionText = computed(() => {
    switch (sessionStore.entitlementState) {
        case "not_started": return "可先新增班级、学生、分组和维护组员，准备好后再开启试用。"
        case "trial_active":
        case "paid_active": return "到期后仅可查看已有数据，无法修改、导入或导出。"
        case "trial_expired":
        case "paid_expired": return "已有数据会继续保留，修改、导入和导出暂不可用。"
        case "permanent": return "可持续使用当前账号已开通的功能，无需开启试用。"
        default: return "请重新同步账号状态，以查看可用功能和使用期限。"
    }
})

const expiresAtText = computed(() => {
    const state = sessionStore.entitlementState
    const expiresAt = state === "trial_active" || state === "trial_expired"
        ? sessionStore.trialExpiresAt
        : state === "paid_active" || state === "paid_expired" ? sessionStore.paidExpiresAt : null
    if (typeof expiresAt !== "number") return ""

    return `截止时间：${new Date(expiresAt).toLocaleString("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    })}`
})

async function confirmStartTrial(): Promise<void> {
    if (confirming.value || sessionStore.startingTrial || sessionStore.entitlementState !== "not_started") return
    const token = cacheStore.token
    const userId = cacheStore.profile?.id
    if (!token || !userId) return

    confirming.value = true
    try {
        try {
            await confirmDialog(
                "确认现在开启免费试用？开启后将连续计时 14 天，到期后仅可查看，不能修改或导出数据。每个账号只能领取一次。",
                "开启 14 天免费试用",
                { confirmButtonText: "现在开启", cancelButtonText: "暂不开启", type: "info" }
            )
        } catch {
            return
        }

        if (cacheStore.token !== token || cacheStore.profile?.id !== userId) {
            ElMessage.warning("账号已切换，请重新确认是否开启试用")
            return
        }
        if (sessionStore.entitlementState !== "not_started") return
        try {
            await sessionStore.startTrial()
        } catch {
            // 开启失败由会话层统一提示，保留入口以便重试。
        }
    } finally {
        confirming.value = false
    }
}

async function synchronizeEntitlement(): Promise<void> {
    if (synchronizing.value || sessionStore.entitlementState !== "unavailable") return

    synchronizing.value = true
    try {
        await sessionStore.initialize(true)
        if (sessionStore.entitlementState === "unavailable") {
            ElMessage.warning("权益状态尚未同步，请稍后重试")
        }
    } catch (error) {
        if (!isApiRequestError(error)) ElMessage.error("权益同步失败，请稍后重试")
    } finally {
        synchronizing.value = false
    }
}
</script>

<style scoped>
.account-entitlement__subscribe {
    margin-right: 8px;
}

@media (max-width: 660px) {
    .account-entitlement__subscribe {
        margin: 0 0 8px;
    }
}
</style>

