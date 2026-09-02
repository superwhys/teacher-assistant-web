<template>
    <div class="settings-view">
        <section class="section-head">
            <div class="section-head__body">
                <div class="eyebrow">设置中心</div>
                <h2>账号、班级、锁屏与反馈设置</h2>
                <p>可在这里查看账号信息、修改班级名称、切换学期、设置锁屏密码并提交使用反馈。</p>
            </div>
        </section>

        <section class="settings-columns">
            <div class="settings-column">
                <SettingsAccountCard :current-class-name="currentClassName" :current-semester-name="currentSemesterName"
                    :display-name="displayName" :has-profile="Boolean(profile)" :has-pwd="hasPwd"
                    :is-login-expired="isLoginExpired" :is-trial="isTrial"
                    :semester-notice-text="semesterNoticeText" :semester-status-tone-class="semesterStatusToneClass"
                    :trial-status-text="trialStatusText" :user-avatar="userAvatar" :user-email="userEmail"
                    :user-id="userId" :user-initial="userInitial" />

                <SettingsLockCard v-model:confirm-password="confirmPwd" v-model:new-password="newPwd"
                    v-model:old-password="oldPwd" :has-pwd="hasPwd" :saving-pwd="savingPwd"
                    @clear-password="onClearLockPassword" @lock-now="onLockNow" @save-password="onSaveLockPassword" />
            </div>

            <div class="settings-column">
                <SettingsClassStatusCard :active-class-id="activeClassId" :classes-loading="classesLoading"
                    :current-class-name="currentClassName" :current-semester-name="currentSemesterName"
                    :semester-notice-text="semesterNoticeText" :semester-permission-text="semesterPermissionText"
                    :semester-permission-tone-class="semesterPermissionToneClass"
                    :semester-status-text="semesterStatusText" @go-dashboard="navigateTo('/v3/dashboard')"
                    @open-next-semester="openNextSemesterDialog" @open-rename-class="openRenameClassDialog" />

                <SettingsFeedbackCard v-model:feedback-content="feedbackContent"
                    :feedback-submitting="feedbackSubmitting" @clear="onClearFeedback" @submit="onSubmitFeedback" />
            </div>
        </section>

        <SettingsRenameClassDialog v-model="renameClassDialogVisible" v-model:name="renameClassName"
            :current-class-name="currentClassName" :loading="renameClassLoading" @closed="onRenameClassDialogClosed"
            @confirm="confirmRenameClass" />

        <SettingsNextSemesterDialog v-model="nextSemesterDialogVisible" v-model:clear-points="nextSemesterClearPoints"
            v-model:name="nextSemesterName" :loading="nextSemesterLoading" @closed="onNextSemesterDialogClosed"
            @confirm="confirmNextSemester" />
    </div>
</template>

<script setup lang="ts">
import { submitOpinion } from "@/api/opinion";
import { classManager } from "@/managers/class";
import { useCacheStore } from "@/stores/cacheStore";
import type { ClassDTO } from "@/types/class";
import SettingsAccountCard from "@/v3/components/settings/SettingsAccountCard.vue";
import SettingsClassStatusCard from "@/v3/components/settings/SettingsClassStatusCard.vue";
import SettingsFeedbackCard from "@/v3/components/settings/SettingsFeedbackCard.vue";
import SettingsLockCard from "@/v3/components/settings/SettingsLockCard.vue";
import SettingsNextSemesterDialog from "@/v3/components/settings/SettingsNextSemesterDialog.vue";
import SettingsRenameClassDialog from "@/v3/components/settings/SettingsRenameClassDialog.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";

const cacheStore = useCacheStore()
const router = useRouter()

const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const renameClassDialogVisible = ref(false)
const renameClassName = ref("")
const renameClassLoading = ref(false)
const nextSemesterDialogVisible = ref(false)
const nextSemesterName = ref("")
const nextSemesterClearPoints = ref(false)
const nextSemesterLoading = ref(false)
const newPwd = ref("")
const confirmPwd = ref("")
const oldPwd = ref("")
const savingPwd = ref(false)
const feedbackContent = ref("")
const feedbackSubmitting = ref(false)

const profile = computed(() => cacheStore.profile)
const displayName = computed(() => cacheStore.displayName || "未登录")
const userEmail = computed(() => profile.value?.email ?? "")
const userAvatar = computed(() => profile.value?.avatar ?? null)
const userId = computed(() => profile.value?.id ?? "")
const isTrial = computed(() => cacheStore.isTrial)
const isLoginExpired = computed(() => cacheStore.isExpired)
const isAuthenticated = computed(() => cacheStore.isAuthenticated)
const activeClassId = computed(() => cacheStore.getActiveClassId())
const activeClassName = computed(() => cacheStore.getActiveClassName())
const activeSemesterName = computed(() => cacheStore.getActiveSemesterName())
const activeSemesterStatus = computed(() => cacheStore.getActiveSemesterStatus())
const hasPwd = computed(() => cacheStore.hasLockPassword())

/** 返回头像占位用的用户名首字。 */
const userInitial = computed(() => {
    const name = String(displayName.value ?? "").trim()
    if (!name || name === "未登录") {
        return "用"
    }

    return name.charAt(0).toUpperCase()
})

/** 返回当前选中的班级对象。 */
const currentClass = computed<ClassDTO | null>(() => {
    if (!activeClassId.value) {
        return null
    }

    return classes.value.find((item) => item.id === activeClassId.value) ?? null
})

/** 返回当前班级名称。 */
const currentClassName = computed(() => {
    return currentClass.value?.name?.trim() || activeClassName.value?.trim() || ""
})

/** 返回当前学期名称。 */
const currentSemesterName = computed(() => {
    const storeName = activeSemesterName.value?.trim() ?? ""
    if (storeName) {
        return storeName
    }

    return currentClass.value?.semester?.name?.trim()
        || currentClass.value?.semester_name?.trim()
        || ""
})

/** 返回当前学期状态值。 */
const currentSemesterStatus = computed<number | null>(() => {
    const statusFromClass = currentClass.value?.semester?.status
    if (typeof statusFromClass === "number") {
        return statusFromClass
    }

    return activeSemesterStatus.value
})

/** 返回学期状态标签文案。 */
const semesterStatusText = computed(() => {
    if (!currentSemesterName.value) {
        return "未设置学期"
    }

    return currentSemesterStatus.value === 2 ? "归档学期" : "最新学期"
})

/** 返回当前学期权限文案。 */
const semesterPermissionText = computed(() => {
    return currentSemesterStatus.value === 2 ? "积分操作已关闭" : "允许积分操作"
})

/** 返回当前学期的说明文本。 */
const semesterNoticeText = computed(() => {
    return currentSemesterStatus.value === 2
        ? "当前学期已归档，仅支持查看历史记录和排行榜。"
        : "当前学期状态正常。"
})

/** 返回学期状态标签对应的样式类名。 */
const semesterStatusToneClass = computed(() => {
    return currentSemesterStatus.value === 2 ? "status-chip--slate" : "status-chip--sky"
})

/** 返回学期权限标签对应的样式类名。 */
const semesterPermissionToneClass = computed(() => {
    return currentSemesterStatus.value === 2 ? "status-chip--amber" : "status-chip--emerald"
})

/** 返回试用状态文案。 */
const trialStatusText = computed(() => {
    if (!isTrial.value) {
        return "正式账号"
    }

    const expiresAt = cacheStore.trialExpiresAt
    if (typeof expiresAt !== "number") {
        return "试用账号"
    }

    const secondsLeft = expiresAt - Math.floor(Date.now() / 1000)
    if (secondsLeft <= 0) {
        return "试用已过期"
    }

    const days = Math.floor(secondsLeft / 86400)
    const hours = Math.floor((secondsLeft % 86400) / 3600)
    const minutes = Math.floor((secondsLeft % 3600) / 60)
    const parts: string[] = []

    if (days > 0) {
        parts.push(`${days}天`)
    }

    if (hours > 0) {
        parts.push(`${hours}小时`)
    }

    if (days === 0 && minutes > 0) {
        parts.push(`${minutes}分钟`)
    }

    if (parts.length === 0) {
        parts.push("不到1分钟")
    }

    return `试用剩余 ${parts.join("")}`
})

/** 将当前班级和学期信息同步到缓存。 */
function syncCurrentClassContextToCache(): void {
    const className = currentClass.value?.name?.trim() ?? ""
    if (className) {
        cacheStore.setActiveClassName(className)
    } else if (!activeClassId.value) {
        cacheStore.clearActiveClassName()
    }

    const semesterId = currentClass.value?.semester?.id
        ?? currentClass.value?.semester_id
        ?? null
    const semesterName = currentClass.value?.semester?.name?.trim()
        ?? currentClass.value?.semester_name?.trim()
        ?? ""
    const semesterStatus = currentClass.value?.semester?.status

    cacheStore.setActiveSemesterId(typeof semesterId === "number" ? semesterId : null)

    if (semesterName) {
        cacheStore.setActiveSemesterName(semesterName)
    } else {
        cacheStore.clearActiveSemesterName()
    }

    cacheStore.setActiveSemesterStatus(typeof semesterStatus === "number" ? semesterStatus : null)
}

/** 加载班级列表并同步当前上下文。 */
async function loadClassesFromApi(): Promise<void> {
    if (!isAuthenticated.value || classesLoading.value) {
        return
    }

    classesLoading.value = true
    try {
        classes.value = await classManager.list()
        syncCurrentClassContextToCache()
    } finally {
        classesLoading.value = false
    }
}

/** 打开修改班级名称弹窗。 */
function openRenameClassDialog(): void {
    if (!activeClassId.value) {
        ElMessage.warning("当前没有可操作的班级")
        return
    }

    renameClassName.value = currentClassName.value
    renameClassDialogVisible.value = true
}

/** 在修改班级名称弹窗关闭时重置表单状态。 */
function onRenameClassDialogClosed(): void {
    renameClassName.value = ""
    renameClassLoading.value = false
}

/** 提交修改班级名称的请求。 */
async function confirmRenameClass(): Promise<void> {
    if (!activeClassId.value || renameClassLoading.value) {
        return
    }

    const className = renameClassName.value.trim()
    if (!className) {
        ElMessage.error("请输入班级名称")
        return
    }

    if (className === currentClassName.value) {
        renameClassDialogVisible.value = false
        ElMessage.success("班级名称未发生变化")
        return
    }

    if (classes.value.some((item) => item.name?.trim() === className && item.id !== activeClassId.value)) {
        ElMessage.error("班级名称已存在")
        return
    }

    renameClassLoading.value = true
    try {
        await classManager.update(activeClassId.value, className)
        renameClassDialogVisible.value = false
        ElMessage.success("已修改班级名称")
        await loadClassesFromApi()
    } finally {
        renameClassLoading.value = false
    }
}

/** 打开新学期弹窗。 */
function openNextSemesterDialog(): void {
    if (!activeClassId.value) {
        ElMessage.warning("当前没有可操作的班级")
        return
    }

    nextSemesterDialogVisible.value = true
}

/** 在新学期弹窗关闭时重置表单状态。 */
function onNextSemesterDialogClosed(): void {
    nextSemesterName.value = ""
    nextSemesterClearPoints.value = false
    nextSemesterLoading.value = false
}

/** 提交切换到新学期的请求。 */
async function confirmNextSemester(): Promise<void> {
    if (!activeClassId.value || nextSemesterLoading.value) {
        return
    }

    const semesterName = nextSemesterName.value.trim()
    if (!semesterName) {
        ElMessage.error("请输入新学期名称")
        return
    }

    nextSemesterLoading.value = true
    try {
        await classManager.nextSemester(activeClassId.value, {
            semester_name: semesterName,
            is_clear_points: nextSemesterClearPoints.value,
        })
        nextSemesterDialogVisible.value = false
        ElMessage.success("已切换至新学期")
        window.setTimeout(() => {
            window.location.reload()
        }, 300)
    } finally {
        nextSemesterLoading.value = false
    }
}

/** 保存当前输入的锁屏密码。 */
async function onSaveLockPassword(): Promise<void> {
    if (savingPwd.value) {
        return
    }

    const password = newPwd.value.trim()
    const confirmPassword = confirmPwd.value.trim()
    if (!password || password.length < 4) {
        ElMessage.error("密码长度至少为 4 位")
        return
    }

    if (password !== confirmPassword) {
        ElMessage.error("两次输入的密码不一致")
        return
    }

    if (hasPwd.value) {
        const sourcePassword = oldPwd.value.trim()
        if (!sourcePassword) {
            ElMessage.error("请输入原密码")
            return
        }

        const oldPasswordPassed = await cacheStore.verifyLockPassword(sourcePassword)
        if (!oldPasswordPassed) {
            ElMessage.error("原密码不正确")
            return
        }
    }

    savingPwd.value = true
    try {
        const saved = await cacheStore.setLockPassword(password)
        if (!saved) {
            ElMessage.error("保存失败")
            return
        }

        newPwd.value = ""
        confirmPwd.value = ""
        oldPwd.value = ""
        ElMessage.success("锁屏密码已保存")
    } finally {
        savingPwd.value = false
    }
}

/** 清除当前锁屏密码。 */
async function onClearLockPassword(): Promise<void> {
    try {
        await ElMessageBox.confirm("确定清除锁屏密码？此操作需要验证当前密码。", "确认操作", {
            type: "warning",
        })
    } catch {
        return
    }

    const sourcePassword = oldPwd.value.trim()
    if (!sourcePassword) {
        ElMessage.error("请输入当前密码")
        return
    }

    const oldPasswordPassed = await cacheStore.verifyLockPassword(sourcePassword)
    if (!oldPasswordPassed) {
        ElMessage.error("当前密码不正确")
        return
    }

    cacheStore.clearLockPassword()
    oldPwd.value = ""
    newPwd.value = ""
    confirmPwd.value = ""
    ElMessage.success("已清除锁屏密码")
}

/** 立即进入锁屏状态。 */
function onLockNow(): void {
    if (!hasPwd.value) {
        ElMessage.error("请先设置锁屏密码")
        return
    }

    cacheStore.lock()
    ElMessage.success("已锁定")
}

/** 提交当前填写的意见反馈。 */
async function onSubmitFeedback(): Promise<void> {
    const content = feedbackContent.value.trim()
    if (!content) {
        ElMessage.warning("请输入反馈内容")
        return
    }

    try {
        await ElMessageBox.confirm("确定提交这条反馈吗？", "确认提交", {
            type: "info",
            confirmButtonText: "提交",
            cancelButtonText: "取消",
        })
    } catch {
        return
    }

    feedbackSubmitting.value = true
    try {
        await submitOpinion({ content })
        feedbackContent.value = ""
        ElMessage.success("反馈已提交，感谢你的建议")
    } finally {
        feedbackSubmitting.value = false
    }
}

/** 清空当前反馈输入内容。 */
function onClearFeedback(): void {
    feedbackContent.value = ""
}

/** 跳转到指定的工作台页面。 */
function navigateTo(path: string): void {
    void router.push(path)
}

onMounted(() => {
    void loadClassesFromApi()
})

watch(currentClass, () => {
    syncCurrentClassContextToCache()
}, { immediate: true })

watch(
    [isAuthenticated, () => cacheStore.profile?.id, activeClassId, () => cacheStore.dataVersion],
    ([authenticated]) => {
        if (authenticated) {
            void loadClassesFromApi()
            return
        }

        classes.value = []
    }
)
</script>

<style scoped>
.settings-view {
    display: grid;
    gap: 20px;
}

.section-head {
    display: flex;
    align-items: center;
}

.section-head {
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
}

.section-head__body {
    display: grid;
    gap: 8px;
}

.section-head__body h2 {
    margin: 0;
}

.section-head__body p {
    margin: 0;
    color: #627099;
    line-height: 1.7;
}

.eyebrow {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #627099;
}

.settings-columns {
    display: grid;
    gap: 20px;
    grid-template-columns: minmax(0, 1.12fr) minmax(320px, 1fr);
}

.settings-column {
    display: grid;
    gap: 20px;
    align-content: start;
}

@media (max-width: 1080px) {
    .settings-columns {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .section-head {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
