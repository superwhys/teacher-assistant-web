import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useSessionStore } from '@/stores/sessionStore'

/** 每次提交都读取当前权益，防止已打开的弹窗跨过到期时间后继续操作。 */
export function useBusinessAccess() {
    const session = useSessionStore()
    const canWrite = computed(() => session.canWrite)
    const canPrepare = computed(() => session.canPrepare)
    const canImportExport = computed(() => session.canImportExport)

    function check(allowed: boolean): boolean {
        if (!allowed) ElMessage.warning(session.entitlementMessage)
        return allowed
    }

    return {
        canWrite,
        canPrepare,
        canImportExport,
        allowWrite: () => check(canWrite.value),
        allowPrepare: () => check(canPrepare.value),
        allowImportExport: () => check(canImportExport.value),
    }
}
