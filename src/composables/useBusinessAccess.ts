import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useSessionStore } from '@/stores/sessionStore'
import { PRO_GROUPING_MESSAGE, PRO_GROWTH_REPORT_MESSAGE } from '@/utils/entitlement'

/** 每次提交都读取当前权益，防止已打开的弹窗跨过到期时间后继续操作。 */
export function useBusinessAccess() {
    const session = useSessionStore()
    const canWrite = computed(() => session.canWrite)
    const canPrepare = computed(() => session.canPrepare)
    const canImportExport = computed(() => session.canImportExport)
    const supportsStudentGroups = computed(() => session.supportsStudentGroups)
    const canViewGrowthReports = computed(() => session.canViewGrowthReports)
    const canManageGroups = computed(() => session.canManageGroups)

    function check(allowed: boolean, message = session.entitlementMessage): boolean {
        if (!allowed) ElMessage.warning(message)
        return allowed
    }

    return {
        canWrite,
        canPrepare,
        canImportExport,
        supportsStudentGroups,
        canManageGroups,
        canViewGrowthReports,
        allowWrite: () => check(canWrite.value),
        allowPrepare: () => check(canPrepare.value),
        allowImportExport: () => check(canImportExport.value, session.importExportDisabledReason || session.entitlementMessage),
        allowGrowthReports: () => check(canViewGrowthReports.value, PRO_GROWTH_REPORT_MESSAGE),
        allowStudentGroups: () => check(supportsStudentGroups.value, PRO_GROUPING_MESSAGE),
        allowManageGroups: () => check(canManageGroups.value, session.groupingDisabledReason || session.entitlementMessage),
    }
}
