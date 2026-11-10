<template>
    <div class="main-view" :class="{ 'is-aside-collapsed': asideCollapsed }">
        <aside class="main-view__aside">
            <section class="brand-card">
                <BrandLogo class="brand-card__badge" />
                <div class="brand-card__content">
                    <strong class="brand-card__title">教师助手</strong>
                    <span>TEACHER ASSISTANT</span>
                </div>
            </section>

            <div class="workspace-card">
                <span class="workspace-card__icon" aria-hidden="true"><HomeFilled /></span>
                <div class="workspace-card__content">
                    <strong>{{ isPlatformPage ? '平台管理' : '教学工作台' }}</strong>
                    <span>{{ isPlatformPage ? '平台管理空间' : '班级教学空间' }}</span>
                </div>
                <span class="workspace-card__label">{{ isPlatformPage ? 'ADMIN' : 'WORKSPACE' }}</span>
            </div>

            <nav class="aside-nav" aria-label="主导航">
                <p v-if="navItems.length" class="aside-nav__group-label">教学管理 <span>WORKSPACE</span></p>
                <RouterLink v-for="item in navItems" :key="item.id" :to="item.to" class="aside-nav__item"
                    :class="{ 'is-active': currentNavItem?.id === item.id }" :title="item.label">
                    <component :is="item.icon" class="aside-nav__icon" aria-hidden="true" />
                    <span class="aside-nav__label">{{ item.label }}</span>
                    <span class="aside-nav__indicator" aria-hidden="true" />
                </RouterLink>
                <template v-if="platformNavItems.length">
                    <p class="aside-nav__group-label aside-nav__group-label--platform">平台管理 <span>ADMINISTRATION</span></p>
                    <RouterLink v-for="item in platformNavItems" :key="item.id" :to="item.to" class="aside-nav__item"
                        :class="{ 'is-active': currentNavItem?.id === item.id }" :title="item.label">
                        <component :is="item.icon" class="aside-nav__icon" aria-hidden="true" />
                        <span class="aside-nav__label">{{ item.label }}</span>
                        <span class="aside-nav__indicator" aria-hidden="true" />
                    </RouterLink>
                </template>
            </nav>

            <div class="sidebar-spacer" />

            <div class="aside-bottom">
                <button type="button" class="aside-collapse-button" :aria-expanded="!asideCollapsed"
                    :aria-label="asideCollapsed ? '展开侧边栏' : '收起侧边栏'"
                    :title="asideCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleAsideCollapsed">
                    <component :is="asideCollapsed ? Expand : Fold" aria-hidden="true" />
                    <span>{{ asideCollapsed ? '展开侧栏' : '收起侧栏' }}</span>
                </button>

                <div class="aside-user">
                    <el-avatar class="aside-user__avatar" :size="33" :src="userAvatar || undefined"
                        :title="userDisplayName">
                        {{ userInitial }}
                    </el-avatar>
                    <div class="aside-user__content">
                        <strong class="aside-user__name" :title="userDisplayName">{{ userDisplayName }}</strong>
                        <span class="aside-user__label" :title="userEmail || '当前账号'">{{ userEmail || '当前账号' }}</span>
                    </div>
                    <button type="button" class="aside-logout-button" aria-label="退出登录" title="退出登录"
                        @click="handleLogout">
                        <SwitchButton aria-hidden="true" />
                    </button>
                </div>
            </div>
        </aside>

        <main class="main-view__main">
            <div class="main-view__sticky-top">
                <div class="mobile-topbar">
                    <div class="mobile-brand">
                        <BrandLogo class="brand-card__badge" />
                        <strong>教师助手</strong>
                    </div>
                    <div class="mobile-actions">
                        <button v-if="platformNavItems.length" type="button" class="mobile-platform-trigger"
                            :aria-expanded="platformNavigationOpen" @click="platformNavigationOpen = true">
                            <Key aria-hidden="true" />
                            平台管理
                        </button>
                        <RouterLink v-if="sessionStore.canAccess('/settings')" to="/settings" class="mobile-account" aria-label="进入设置">
                            {{ userInitial }}
                        </RouterLink>
                    </div>
                </div>

                <header class="main-view__header">
                    <div v-if="isPlatformPage" class="platform-context">
                        <span>平台管理</span>
                        <ArrowRight aria-hidden="true" />
                        <strong>{{ currentNavItem?.label }}</strong>
                    </div>
                    <div v-else class="context-bar">
                        <ClassSwitchButton :active-class-id="activeClassId" :trigger-label="currentClassName"
                            @switched="handleClassSwitched" />
                        <SemesterSwitchButton :active-class-id="activeClassId" :current-semester-id="currentSemesterId"
                            :trigger-label="currentSemesterName" @switched="handleSemesterSwitched" />
                        <span class="context-divider" aria-hidden="true" />
                        <span v-for="item in statusChips" :key="item.id" class="context-status"
                            :class="item.toneClass">
                            {{ item.label }}
                        </span>
                    </div>

                    <span v-if="isPlatformPage" class="platform-role-badge"><Lock aria-hidden="true" />超级管理员</span>
                    <div v-else class="header-actions">
                        <button type="button" class="header-actions__button is-icon" aria-label="立即锁屏"
                            title="立即锁屏" @click="lockNow">
                            <Lock aria-hidden="true" />
                        </button>
                        <RouterLink v-if="sessionStore.entitlementState !== 'permanent'" to="/subscription"
                            class="header-actions__button" aria-label="查看角色开通与续费">
                            <span>开通 / 续费</span>
                        </RouterLink>
                        <RouterLink v-if="sessionStore.canAccess('/settings')" to="/settings" class="header-actions__button header-settings-link">
                            <Setting aria-hidden="true" />
                            <span>进入设置</span>
                        </RouterLink>
                        <RouterLink v-if="sessionStore.canAccess('/points')" to="/points" class="header-actions__button is-primary" aria-label="进入积分中心">
                            <StarFilled aria-hidden="true" />
                            <span>进入积分中心</span>
                        </RouterLink>
                    </div>
                </header>

                <div v-if="!isPlatformPage && (showEntitlementNotice || showMiniProgramNotice)" class="main-view__notices">
                    <AccountEntitlementNotice v-if="showEntitlementNotice" />
                    <AppNoticeBar v-if="showMiniProgramNotice" title="尚未绑定小程序"
                        description="前往设置页完成绑定，即可在小程序中使用当前账号。" tone="warning">
                        <template #action>
                            <RouterLink class="app-notice-bar__action"
                                :to="sessionStore.canAccess('/settings') ? '/settings#mini-program-binding' : '/settings/mini-program'">
                                前往绑定
                            </RouterLink>
                        </template>
                    </AppNoticeBar>
                </div>

                <div v-if="!isPlatformPage && showTimerStrip" class="main-view__timer-strip">
                    <FloatingTimerStrip :caption="timerStrip.caption" :title="timerStrip.title"
                        :countdown="timerStrip.countdown" :progress="timerStrip.progress" :paused="timerStrip.paused"
                        @open="openTimerPage" />
                </div>

            </div>

            <section class="main-view__content" :aria-label="route.path === '/settings/mini-program' ? '绑定小程序' : currentNavItem?.label || '内容区'">
                <RouterView />
            </section>

            <nav v-if="navItems.length" class="mobile-nav" aria-label="手机主导航">
                <RouterLink v-for="item in navItems" :key="`mobile-${item.id}`" :to="item.to"
                    class="mobile-nav__item" :class="{ 'is-active': currentNavItem?.id === item.id }">
                    <component :is="item.icon" aria-hidden="true" />
                    <span>{{ item.mobileLabel }}</span>
                </RouterLink>
            </nav>

            <AppDialogShell v-if="platformNavItems.length" v-model="platformNavigationOpen" title="平台管理"
                eyebrow="ADMINISTRATION" description="用户、权限、菜单与反馈管理" width="380px">
                <nav class="platform-mobile-nav" aria-label="平台管理">
                    <RouterLink v-for="item in platformNavItems" :key="item.id" :to="item.to" class="aside-nav__item"
                        :class="{ 'is-active': currentNavItem?.id === item.id }" @click="platformNavigationOpen = false">
                        <component :is="item.icon" class="aside-nav__icon" aria-hidden="true" />
                        <span>{{ item.label }}</span>
                    </RouterLink>
                </nav>
            </AppDialogShell>

            <AgentAssistant v-if="!isPlatformPage && sessionStore.canUseAgent && cacheStore.isAuthenticated && !cacheStore.isLocked"
                :class-id="activeClassId" :class-name="currentClassName"
                :semester-id="currentSemesterId" :semester-name="currentSemesterName"
                :user-id="cacheStore.profile?.id"
                :can-write="sessionStore.canWrite && currentSemesterStatus === 1" />

            <div v-if="cacheStore.isAuthenticated && unlockDialogVisible" class="lock-overlay">
                <div class="lock-card">
                    <div class="lock-card__icon"><Lock /></div>
                    <div class="lock-title">已锁定</div>
                    <div class="lock-sub">请输入锁屏密码以继续使用</div>
                    <el-input v-model="unlockPassword" class="lock-input" type="password" show-password
                        placeholder="输入锁屏密码" @keyup.enter="confirmUnlock" />
                    <button type="button" class="header-actions__button is-primary lock-card__action"
                        :disabled="unlocking" @click="confirmUnlock">
                        {{ unlocking ? "解锁中..." : "立即解锁" }}
                    </button>
                </div>
            </div>

            <TeachersDayWelcomeDialog
                v-model="teachersDayDialogVisible"
                :teacher-name="cacheStore.profile?.name || ''"
            />

            <SettingsProfileNameEditor
                v-if="sessionStore.initialized && cacheStore.isAuthenticated && !teachersDayDialogVisible"
                prompt-default-name
            />

            <AppDialogShell v-model="timerFinishedDialogVisible" title="计时结束" eyebrow="课堂提醒"
                description="本轮课堂计时已经结束，请及时查看当前教学节奏。" width="560px">
                <div class="timer-finished-dialog">
                    <div class="timer-finished-dialog__icon">
                        <el-icon><Timer /></el-icon>
                    </div>
                    <div class="timer-finished-dialog__time">{{ timerDisplayTime }}</div>
                    <p class="timer-finished-dialog__summary">倒计时已到，当前计时器已自动停止。</p>
                </div>

                <template #footer>
                    <div class="timer-finished-dialog__actions">
                        <button type="button" class="header-actions__button" @click="openTimerPage">
                            查看计时器
                        </button>
                        <button type="button" class="header-actions__button is-primary" @click="closeTimerFinishedDialog">
                            我知道了
                        </button>
                    </div>
                </template>
            </AppDialogShell>
        </main>
    </div>
</template>

<script setup lang="ts">
import {
    ArrowRight, ChatDotRound, Expand, Fold, Grid, HomeFilled, Key, Lock, Menu,
    Present, Setting, StarFilled, SwitchButton, Timer, Tools, User, UserFilled
} from "@element-plus/icons-vue";
import BrandLogo from "@/components/common/BrandLogo.vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import AgentAssistant from "@/v3/components/agent/AgentAssistant.vue";
import AppNoticeBar from "@/v3/components/AppNoticeBar.vue";
import AccountEntitlementNotice from "@/v3/components/settings/AccountEntitlementNotice.vue";
import SettingsProfileNameEditor from "@/v3/components/settings/SettingsProfileNameEditor.vue";
import ClassSwitchButton from "@/v3/components/ClassSwitchButton.vue";
import SemesterSwitchButton from "@/v3/components/SemesterSwitchButton.vue";
import TeachersDayWelcomeDialog from "@/v3/components/TeachersDayWelcomeDialog.vue";
import FloatingTimerStrip from "@/v3/components/tools/FloatingTimerStrip.vue";
import { classManager } from "@/managers/class";
import { useCacheStore } from "@/stores/cacheStore";
import { useSessionStore } from "@/stores/sessionStore";
import { getTeachersDayWelcomeStorageKey, isTeachersDay } from "@/utils/teachersDayWelcome";
import { useSharedTimer, useStageTimer } from "@/v3/composables/useToolsWorkspace";
import type { ClassDTO, SemesterDTO } from "@/types/class";
import { ElMessage } from "element-plus";
import { computed, onMounted, ref, watch, type Component } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { isPlatformPath } from "@/utils/platformAccess";

/** 定义左侧导航项结构。 */
interface NavItem {
    id: string
    label: string
    icon: Component
    to: string
    mobileLabel: string
}

/** 定义状态标签结构。 */
interface ChipItem {
    id: string
    label: string
    toneClass?: string
}

const route = useRoute();
const router = useRouter()
const cacheStore = useCacheStore()
const sessionStore = useSessionStore()
const isPlatformPage = computed(() => isPlatformPath(route.path))
const platformNavigationOpen = ref(false)
const showEntitlementNotice = computed(() => route.path !== "/settings" && route.path !== "/subscription"
    && sessionStore.entitlementState !== "permanent" && sessionStore.entitlementState !== "paid_active")
const showMiniProgramNotice = computed(() => cacheStore.profile?.wechatBound === false)
const { closeTimerFinishedDialog, timerDisplayTime, timerFinishedDialogVisible, timerProgressPercent, timerState } = useSharedTimer()
const { state: stageTimerState, timerMode, progress: stageProgress, displayTime: stageDisplayTime } = useStageTimer()
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const ASIDE_COLLAPSED_STORAGE_KEY = "teacher-assistant-aside-collapsed"
const teachersDayDialogVisible = ref(false)
const teachersDayDialogOpened = ref(false)
const teachersDayStorageKey = ref("")
const userProfileRefreshing = ref(false)
const asideCollapsed = ref(readAsideCollapsed())

const NAV_ICON_MAP: Record<string, Component> = {
    HomeFilled,
    UserFilled,
    StarFilled,
    Present,
    Tools,
    Setting,
    Menu,
    User,
    Key,
    Grid,
    ChatDotRound,
}

const MOBILE_MENU_LABELS: Record<string, string> = {
    dashboard: "总览",
    students: "学生",
    points: "积分",
    shop: "商城",
    tools: "工具",
    settings: "设置",
}

const navItems = computed<NavItem[]>(() => sessionStore.sidebar.map((item) => ({
    id: item.code,
    label: item.name,
    mobileLabel: MOBILE_MENU_LABELS[item.code] || item.name,
    icon: NAV_ICON_MAP[item.icon] || Menu,
    to: `/${item.route_key}`,
})))

const platformNavItems = computed<NavItem[]>(() => (sessionStore.platformSidebar || []).map((item) => ({
    id: item.code,
    label: item.name,
    mobileLabel: item.name,
    icon: NAV_ICON_MAP[item.icon] || Menu,
    to: `/${item.route_key}`,
})))

watch([() => route.path, () => sessionStore.isSuperAdmin], () => {
    platformNavigationOpen.value = false
})

/** 返回当前激活的班级 ID。 */
const activeClassId = computed<number | null>({
    get: () => cacheStore.getActiveClassId(),
    set: (value) => {
        if (typeof value === "number") {
            cacheStore.setActiveClassId(value)
            return
        }

        cacheStore.clearActiveClassId()
    }
})

/** 返回当前班级选项。 */
const classOptions = computed(() => {
    return classes.value.filter((item): item is { id: number, name: string } => {
        return typeof item.id === "number" && typeof item.name === "string" && item.name.trim().length > 0
    })
})

/** 返回当前激活的班级。 */
const currentClass = computed<ClassDTO | null>(() => {
    if (!activeClassId.value) {
        return null
    }

    return classes.value.find((item) => item.id === activeClassId.value) ?? null
})

/** 返回当前激活学期状态。 */
const currentSemesterStatus = computed<number | null>(() => {
    return cacheStore.getActiveSemesterStatus()
})

/** 返回当前激活学期 ID。 */
const currentSemesterId = computed<number | null>(() => {
    return cacheStore.getActiveSemesterId()
})

/** 返回顶部状态标签。 */
const statusChips = computed<ChipItem[]>(() => {
    if (currentSemesterStatus.value === 1) {
        return [
            { id: "latest", label: "最新学期", toneClass: "status-chip--sky" },
            { id: "allowed", label: sessionStore.canWrite ? "允许积分操作" : "积分操作已关闭", toneClass: sessionStore.canWrite ? "status-chip--green" : "status-chip--amber" },
        ]
    }

    return [
        { id: "archived", label: "归档学期", toneClass: "status-chip--slate" },
        { id: "blocked", label: "不允许积分操作", toneClass: "status-chip--amber" },
    ]
})

/** 刷新当前登录用户信息。 */
async function refreshUserProfile(): Promise<void> {
    if (!cacheStore.token || cacheStore.isExpired || userProfileRefreshing.value) {
        return
    }

    userProfileRefreshing.value = true
    try {
        await sessionStore.initialize()
    } catch (error) {
        console.error("初始化当前用户会话失败", error)
    } finally {
        userProfileRefreshing.value = false
    }
}

/** 加载班级列表。 */
async function loadClasses(): Promise<void> {
    if (classesLoading.value) {
        return
    }

    classesLoading.value = true
    try {
        classes.value = await classManager.list()
    } finally {
        classesLoading.value = false
    }
}

/** 判断当前班级选项中是否包含指定班级。 */
function hasClassOption(classId: number | null): boolean {
    if (typeof classId !== "number") {
        return false
    }

    return classOptions.value.some((item) => item.id === classId)
}

/** 等待一小段时间后继续执行。 */
function waitForNextClassRefresh(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, delayMs)
    })
}

/** 确保班级列表中已经包含指定班级。 */
async function ensureClassOptionsReady(classId: number | null): Promise<void> {
    await loadClasses()
    if (!classId || hasClassOption(classId)) {
        return
    }

    await waitForNextClassRefresh(180)
    await loadClasses()
}

/** 重置当前学期缓存状态。 */
function resetSemesterCacheState(): void {
    cacheStore.clearActiveSemesterId()
    cacheStore.clearActiveSemesterName()
    cacheStore.clearActiveSemesterStatus()
}

/** 基于当前班级同步班级名称到缓存。 */
function syncActiveClassNameToCache(): void {
    const className = currentClass.value?.name?.trim() ?? ""
    if (className) {
        cacheStore.setActiveClassName(className)
    } else {
        cacheStore.clearActiveClassName()
    }
}

/** 基于当前班级同步学期信息到缓存。 */
function syncActiveSemesterToCache(): void {
    const semesterId = currentClass.value?.semester?.id
        ?? currentClass.value?.semester_id
        ?? null
    const semesterName = currentClass.value?.semester?.name?.trim()
        ?? currentClass.value?.semester_name?.trim()
        ?? ""
    const semesterStatus = currentClass.value?.semester?.status

    cacheStore.setActiveSemesterId(semesterId)

    if (semesterName) {
        cacheStore.setActiveSemesterName(semesterName)
    } else {
        cacheStore.clearActiveSemesterName()
    }

    cacheStore.setActiveSemesterStatus(
        typeof semesterStatus === "number" ? semesterStatus : null
    )
    cacheStore.setActiveSemesterIsLatest(
        typeof semesterStatus === "number" ? semesterStatus !== 2 : null
    )
}

/** 将指定学期应用到当前班级。 */
function applySemesterToCurrentClass(semester: SemesterDTO): void {
    if (!currentClass.value) {
        return
    }

    classes.value = classes.value.map((item) => {
        if (item.id !== currentClass.value?.id) {
            return item
        }

        return {
            ...item,
            semester_id: semester.id,
            semester_name: semester.name,
            semester: {
                ...item.semester,
                ...semester,
                class_id: semester.class_id ?? item.id,
            },
        }
    })
}

/** 将选中的学期信息直接同步到缓存。 */
function writeSelectedSemesterToCache(semester: SemesterDTO): void {
    cacheStore.setActiveSemesterId(typeof semester.id === "number" ? semester.id : null)

    const semesterName = semester.name?.trim() ?? ""
    if (semesterName) {
        cacheStore.setActiveSemesterName(semesterName)
    } else {
        cacheStore.clearActiveSemesterName()
    }

    cacheStore.setActiveSemesterStatus(
        typeof semester.status === "number" ? semester.status : null
    )
    cacheStore.setActiveSemesterIsLatest(
        typeof semester.status === "number" ? semester.status !== 2 : null
    )
}

/** 加载当前班级与学期信息。 */
async function loadCurrentClassAndSemesterInfo(preferredClassId?: number | null): Promise<void> {
    if (!cacheStore.isAuthenticated) {
        classes.value = []
        activeClassId.value = null
        cacheStore.clearActiveClassName()
        resetSemesterCacheState()
        return
    }

    try {
        await ensureClassOptionsReady(
            typeof preferredClassId === "number" ? preferredClassId : activeClassId.value
        )
        const validClassIds = new Set(classOptions.value.map((item) => item.id))

        if (activeClassId.value && !validClassIds.has(activeClassId.value)) {
            activeClassId.value = null
        }

        if (!activeClassId.value) {
            activeClassId.value = classOptions.value[0]?.id ?? null
        }

        syncActiveClassNameToCache()
        if (!activeClassId.value) {
            resetSemesterCacheState()
            return
        }

        syncActiveSemesterToCache()
    } catch (error) {
        console.error("获取当前班级和学期信息失败", error)
    }
}

/** 处理班级切换成功事件。 */
async function handleClassSwitched(classId: number): Promise<void> {
    try {
        activeClassId.value = classId
        await loadCurrentClassAndSemesterInfo(classId)
        ElMessage.success("已切换当前班级")
    } catch (error) {
        console.error("切换班级失败", error)
        ElMessage.error("切换班级失败")
    }
}

/** 处理学期切换成功事件。 */
function handleSemesterSwitched(semester: SemesterDTO): void {
    writeSelectedSemesterToCache(semester)
    applySemesterToCurrentClass(semester)
    ElMessage.success("已切换当前学期")
}

const unlockDialogVisible = computed(() => cacheStore.isLocked)
const unlockPassword = ref("")
const unlocking = ref(false)

/** 立即进入锁屏状态。 */
function lockNow(): void {
    if (!cacheStore.hasLockPassword()) {
        ElMessage.error("请先在设置中配置锁屏密码")
        return
    }

    cacheStore.lock()
}

/** 校验锁屏密码并解锁。 */
async function confirmUnlock(): Promise<void> {
    if (unlocking.value) {
        return
    }

    const password = unlockPassword.value.trim()
    if (!password) {
        ElMessage.error("请输入锁屏密码")
        return
    }

    unlocking.value = true
    try {
        const verified = await cacheStore.verifyLockPassword(password)
        if (!verified) {
            ElMessage.error("锁屏密码错误")
            return
        }

        cacheStore.unlock()
        unlockPassword.value = ""
        ElMessage.success("已解锁")
    } finally {
        unlocking.value = false
    }
}

/** 返回当前班级名称。 */
const currentClassName = computed<string>(() => cacheStore.getActiveClassName()?.trim() || "未知班级")

/** 返回当前用户展示名称。 */
const userDisplayName = computed<string>(() => cacheStore.displayName?.trim() || "未登录用户")
const userEmail = computed<string>(() => cacheStore.profile?.email?.trim() || "")

/** 返回当前用户头像地址。 */
const userAvatar = computed<string | null>(() => cacheStore.profile?.avatar ?? null)

/** 返回当前用户头像占位首字。 */
const userInitial = computed<string>(() => {
    const name = userDisplayName.value.trim()
    return name.charAt(0).toUpperCase() || "用"
})

/** 返回当前学期名称。 */
const currentSemesterName = computed<string>(() => cacheStore.getActiveSemesterName()?.trim() || "未知学期")

/** 返回当前激活的导航项。 */
const currentNavItem = computed<NavItem | null>(() => {
    return [...navItems.value, ...platformNavItems.value]
        .find((item) => route.path === item.to || route.path.startsWith(`${item.to}/`)) ?? null
})

/** 统一展示当前模式的倒计时；多阶段进度按整个流程计算。 */
const timerStrip = computed(() => {
    if (timerMode.value === "stages") {
        return {
            active: stageTimerState.hasStarted && stageTimerState.remainingMs > 0,
            caption: `多阶段计时 · 第 ${stageTimerState.stageIndex + 1} / ${stageTimerState.stages.length} 阶段`,
            title: stageTimerState.stages[stageTimerState.stageIndex]?.name || "课堂流程",
            countdown: stageDisplayTime.value,
            progress: stageProgress.value.percent,
            paused: !stageTimerState.isRunning
        }
    }
    return {
        active: timerState.hasStarted && timerState.remainingSeconds > 0,
        caption: "单段计时",
        title: "课堂倒计时",
        countdown: timerDisplayTime.value,
        progress: timerProgressPercent.value,
        paused: !timerState.isRunning
    }
})

const showTimerStrip = computed<boolean>(() => timerStrip.value.active && cacheStore.isAuthenticated
    && sessionStore.canAccess("/tools") && !unlockDialogVisible.value)

/** 退出当前账号并返回登录页。 */
async function handleLogout(): Promise<void> {
    sessionStore.reset()
    cacheStore.logout()
    ElMessage.success("已退出登录")
    await router.replace("/auth")
}

/** 根据登录状态同步当前用户资料。 */
function syncUserProfileByAuthState(token: string | null, expired: boolean): void {
    if (token && !expired) {
        void refreshUserProfile()
    }
}

/** 判断当前教师节欢迎弹窗是否已经展示过。 */
function hasSeenTeachersDayWelcome(storageKey: string): boolean {
    try {
        return window.localStorage.getItem(storageKey) === "1"
    } catch {
        return false
    }
}

/** 记录当前教师节欢迎弹窗已经展示过。 */
function persistTeachersDayWelcomeSeen(): void {
    if (!teachersDayStorageKey.value) return

    try {
        window.localStorage.setItem(teachersDayStorageKey.value, "1")
    } catch {
        return
    }
}

/** 在每年教师节当天为当前用户展示一次节日欢迎弹窗。 */
function openTeachersDayWelcome(date = new Date()): boolean {
    if (!isTeachersDay(date)) return false

    const storageKey = getTeachersDayWelcomeStorageKey(date, cacheStore.profile?.id)
    if (hasSeenTeachersDayWelcome(storageKey)) return false

    teachersDayStorageKey.value = storageKey
    teachersDayDialogOpened.value = true
    teachersDayDialogVisible.value = true
    return true
}

/** 读取本地保存的侧边栏收起状态。 */
function readAsideCollapsed(): boolean {
    try {
        return window.localStorage.getItem(ASIDE_COLLAPSED_STORAGE_KEY) === "1"
    } catch {
        return false
    }
}

/** 将当前侧边栏收起状态写入本地。 */
function persistAsideCollapsed(collapsed: boolean): void {
    try {
        window.localStorage.setItem(ASIDE_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0")
    } catch {
        return
    }
}

/** 切换左侧导航栏的收起状态。 */
function toggleAsideCollapsed(): void {
    asideCollapsed.value = !asideCollapsed.value
    persistAsideCollapsed(asideCollapsed.value)
}

/** 打开完整计时器页面。 */
function openTimerPage(): void {
    if (!sessionStore.canAccess("/tools")) return
    closeTimerFinishedDialog()
    void router.push("/tools/timer")
}

watch(
    [() => cacheStore.profile?.id, () => cacheStore.getActiveClassId()],
    () => {
        void loadCurrentClassAndSemesterInfo()
    },
    { immediate: true }
)

watch(unlockDialogVisible, (visible) => {
    if (visible) {
        unlockPassword.value = ""
    }
})

watch(teachersDayDialogVisible, (visible) => {
    if (visible || !teachersDayDialogOpened.value) {
        return
    }

    persistTeachersDayWelcomeSeen()
    teachersDayDialogOpened.value = false
})

watch(
    [() => cacheStore.token, () => cacheStore.isExpired],
    ([token, expired]) => {
        syncUserProfileByAuthState(token, expired)
    },
    { immediate: true }
)

onMounted(() => {
    openTeachersDayWelcome()
})
</script>

<style scoped>
.main-view__notices {
    display: grid;
    gap: 10px;
    padding: 14px 36px 0;
}

.main-view {
    --sidebar-width: 244px;
    min-height: 100vh;
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    color: var(--ta-text);
    background: var(--ta-bg);
    transition: grid-template-columns 180ms ease;
}

.main-view.is-aside-collapsed {
    --sidebar-width: 82px;
}

.main-view__aside {
    position: sticky;
    top: 0;
    z-index: 30;
    height: 100vh;
    padding: 0 18px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--ta-line);
    background: #ffffff;
}

.brand-card {
    min-height: 89px;
    padding: 0 6px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.brand-card__content {
    min-width: 0;
    flex: 1;
}

.brand-card__title {
    display: block;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.15;
    letter-spacing: 0.5px;
    white-space: nowrap;
}

.brand-card__content > span {
    display: block;
    margin-top: 3px;
    color: var(--ta-text-secondary);
    font-size: 8px;
    letter-spacing: 1px;
    white-space: nowrap;
}

.aside-collapse-button {
    width: 100%;
    min-height: 36px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 6px;
    color: var(--ta-text-tertiary);
    background: transparent;
    font-size: 12px;
    cursor: pointer;
}

.aside-collapse-button:hover {
    color: var(--ta-text);
    background: var(--ta-surface-muted);
}

.aside-collapse-button svg {
    width: 17px;
    height: 17px;
}

.aside-nav {
    display: grid;
    gap: 7px;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
}

.aside-nav__item:focus-visible {
    outline-offset: -2px;
}

.workspace-card {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 5px 0 28px;
    padding: 12px 10px;
    border: 1px solid var(--ta-line);
    border-radius: 9px;
    background: #fbfcfb;
}

.workspace-card__icon {
    width: 30px;
    height: 32px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 1px solid var(--ta-line);
    border-radius: 6px;
    color: var(--ta-text-secondary);
    background: #ffffff;
}

.workspace-card__icon svg {
    width: 16px;
    height: 16px;
}

.workspace-card__content {
    min-width: 0;
}

.workspace-card__content strong,
.workspace-card__content span {
    display: block;
    white-space: nowrap;
}

.workspace-card__content strong {
    font-size: 11px;
    font-weight: 600;
}

.workspace-card__content span {
    margin-top: 3px;
    color: var(--ta-text-secondary);
    font-size: 9px;
}

.workspace-card__label {
    margin-left: auto;
    color: var(--ta-text-tertiary);
    font-size: 8px;
    letter-spacing: 0.5px;
}

.aside-nav__group-label {
    display: flex;
    justify-content: space-between;
    margin: 0 10px 5px;
    color: var(--ta-text-tertiary);
    font-size: 10px;
}

.aside-nav__group-label span {
    font-size: 8px;
    letter-spacing: 1px;
}

.aside-nav__group-label--platform {
    margin-top: 22px;
}

.platform-context,
.platform-role-badge,
.mobile-platform-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
}

.platform-context span,
.platform-context svg {
    color: var(--ta-text-tertiary);
}

.platform-context svg,
.platform-role-badge svg,
.mobile-platform-trigger svg {
    width: 14px;
    height: 14px;
}

.platform-context strong {
    font-weight: 500;
}

.platform-role-badge {
    padding: 6px 9px;
    border: 1px solid var(--ta-line);
    border-radius: 6px;
    color: var(--ta-text-secondary);
    font-size: 10px;
    white-space: nowrap;
}

.mobile-platform-trigger {
    min-height: 34px;
    padding: 0 10px;
    border: 1px solid var(--ta-line);
    border-radius: 6px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    cursor: pointer;
}

.platform-mobile-nav {
    display: grid;
    gap: 7px;
}

.aside-nav__item {
    width: 100%;
    min-height: 45px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    border-radius: 7px;
    color: var(--ta-text-secondary);
    background: transparent;
    text-decoration: none;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
    transition: color 140ms ease, background-color 140ms ease, transform 100ms ease;
}

.aside-nav__item:hover {
    color: var(--ta-blue);
    background: var(--ta-surface-muted);
}

.aside-nav__item.is-active {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    font-weight: 600;
}

.aside-nav__item:active,
.aside-collapse-button:active,
.aside-logout-button:active,
.header-actions__button:active,
.mobile-nav__item:active {
    transform: scale(0.975);
}

.aside-nav__icon {
    width: 17px;
    height: 17px;
    flex: 0 0 auto;
}

.aside-nav__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.aside-nav__indicator {
    display: none;
    width: 5px;
    height: 5px;
    margin-left: auto;
    flex: 0 0 auto;
    border-radius: 50%;
    background: var(--ta-blue);
}

.aside-nav__item.is-active .aside-nav__indicator {
    display: block;
}

.sidebar-spacer {
    flex: 1;
}

.aside-bottom {
    flex-shrink: 0;
    padding-top: 22px;
}

.aside-user {
    width: 100%;
    margin-top: 8px;
    padding: 19px 0;
    display: flex;
    align-items: center;
    gap: 10px;
    border-top: 1px solid var(--ta-line);
    color: var(--ta-text);
    text-align: left;
}

.aside-user__avatar {
    flex: 0 0 auto;
    border: 1px solid #e0e8df;
    color: #66765e;
    background: #f0f4ec;
    font-size: 12px;
    font-weight: 600;
}

.aside-user__content {
    min-width: 0;
    flex: 1;
}

.aside-user__name,
.aside-user__label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.aside-user__name {
    font-size: 11px;
    font-weight: 600;
}

.aside-user__label {
    margin-top: 3px;
    color: var(--ta-text-secondary);
    font-size: 10px;
}

.aside-logout-button {
    width: 30px;
    min-height: 32px;
    padding: 0;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 0;
    border-radius: 6px;
    color: var(--ta-text-tertiary);
    background: transparent;
    cursor: pointer;
}

.aside-logout-button:hover {
    color: var(--ta-red);
    background: var(--ta-red-soft);
}

.aside-logout-button svg {
    width: 16px;
    height: 16px;
}

.main-view.is-aside-collapsed .brand-card {
    justify-content: center;
    padding-inline: 0;
}

.main-view.is-aside-collapsed .brand-card__content,
.main-view.is-aside-collapsed .workspace-card,
.main-view.is-aside-collapsed .aside-nav__group-label,
.main-view.is-aside-collapsed .aside-nav__label,
.main-view.is-aside-collapsed .aside-nav__indicator,
.main-view.is-aside-collapsed .aside-user__content,
.main-view.is-aside-collapsed .aside-collapse-button span {
    display: none;
}

.main-view.is-aside-collapsed .aside-collapse-button,
.main-view.is-aside-collapsed .aside-nav__item,
.main-view.is-aside-collapsed .aside-user {
    justify-content: center;
    padding-inline: 0;
}

.main-view.is-aside-collapsed .aside-user {
    flex-direction: column;
}

.main-view__main {
    min-width: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.main-view__sticky-top {
    position: sticky;
    top: 0;
    z-index: 24;
    background: var(--ta-bg);
}

.main-view__timer-strip {
    padding: 14px 36px 0;
    display: flex;
    justify-content: center;
}

.mobile-topbar,
.mobile-nav {
    display: none;
}

.main-view__header {
    position: relative;
    z-index: 24;
    min-height: 73px;
    padding: 12px 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--ta-line);
    background: #ffffff;
}

.context-bar,
.header-actions {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
}

.context-bar {
    overflow-x: auto;
    scrollbar-width: none;
}

.context-bar::-webkit-scrollbar {
    display: none;
}

.context-bar :deep(.switch-trigger),
.header-actions__button {
    min-height: 34px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid var(--ta-line);
    border-radius: 6px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    font-size: 12px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease, transform 100ms ease;
}

.context-bar :deep(.switch-trigger:hover),
.header-actions__button:hover {
    color: var(--ta-blue);
    border-color: var(--ta-blue);
    background: var(--ta-blue-soft);
    transform: none;
}

.context-bar :deep(.switch-trigger > svg) {
    width: 16px;
    height: 16px;
}

.context-divider {
    width: 1px;
    height: 20px;
    margin: 0 3px;
    flex: 0 0 auto;
    background: var(--ta-line);
}

.context-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ta-green);
    font-size: 11px;
    white-space: nowrap;
}

.context-status::before {
    content: "";
    width: 5px;
    height: 5px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: currentColor;
}

.context-status.status-chip--slate,
.context-status.status-chip--amber {
    color: var(--ta-orange);
}

.header-actions {
    justify-content: flex-end;
    flex: 0 0 auto;
}

.header-actions__button svg {
    width: 16px;
    height: 16px;
}

.header-actions__button.is-primary {
    color: #ffffff;
    border-color: var(--ta-blue);
    background: var(--ta-blue);
}

.header-actions__button.is-primary:hover {
    color: #ffffff;
    border-color: var(--ta-blue-hover);
    background: var(--ta-blue-hover);
}

.header-actions__button.is-icon {
    width: 34px;
    padding: 0;
}

.main-view__content {
    width: 100%;
    max-width: 1680px;
    min-width: 0;
    margin: 0 auto;
    padding: 32px 36px 40px;
    flex: 1;
}

.main-view__content :deep(.tools-standalone-page-frame) {
    min-height: calc(100vh - 138px);
}

.lock-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    padding: 22px;
    display: grid;
    place-items: center;
    background: rgba(22, 40, 32, 0.4);
}

.lock-card {
    width: min(400px, 100%);
    padding: 28px;
    display: grid;
    justify-items: center;
    gap: 10px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: #ffffff;
    box-shadow: var(--ta-shadow-2);
    text-align: center;
}

.lock-card__icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.lock-card__icon svg {
    width: 24px;
}

.lock-title {
    margin-top: 4px;
    font-size: 23px;
    font-weight: 700;
    letter-spacing: -0.025em;
}

.lock-sub {
    color: var(--ta-text-tertiary);
    font-size: 14px;
}

.lock-input {
    width: 100%;
    margin-top: 8px;
}

.lock-card :deep(.el-input__wrapper) {
    min-height: 42px;
    border-radius: 6px;
}

.lock-card__action {
    width: 100%;
    margin-top: 4px;
}

.timer-finished-dialog {
    padding: 8px 0 2px;
    display: grid;
    justify-items: center;
    gap: 14px;
    text-align: center;
}

.timer-finished-dialog__icon {
    width: 64px;
    height: 64px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    font-size: 29px;
}

.timer-finished-dialog__time {
    font-size: clamp(43px, 7vw, 63px);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.045em;
    font-variant-numeric: tabular-nums;
}

.timer-finished-dialog__summary {
    margin: 0;
    color: var(--ta-text-tertiary);
    font-size: 15px;
}

.timer-finished-dialog__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

@media (max-width: 1180px) {
    .main-view__header,
    .main-view__content,
    .main-view__notices,
    .main-view__timer-strip {
        padding-inline: 24px;
    }

    .header-settings-link span {
        display: none;
    }

    .header-settings-link {
        width: 34px;
        padding: 0;
    }
}

@media (max-width: 920px) {
    .main-view__sticky-top {
        z-index: 35;
    }

    .main-view__timer-strip {
        padding: 10px 14px 0;
    }

    .main-view__notices {
        padding-inline: 14px;
    }

    .main-view,
    .main-view.is-aside-collapsed {
        display: block;
    }

    .main-view__aside {
        display: none;
    }

    .mobile-topbar {
        height: 54px;
        padding: 0 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--ta-line);
        background: #ffffff;
    }

    .mobile-brand,
    .mobile-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .mobile-brand .brand-card__badge {
        --brand-logo-size: 32px;
    }

    .mobile-brand strong {
        font-size: 15px;
    }

    .mobile-account {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        border: 1px solid #e0e8df;
        color: #66765e;
        background: #f0f4ec;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
    }

    .main-view__header {
        min-height: 58px;
        padding: 8px 14px;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
    }

    .main-view__header::-webkit-scrollbar {
        display: none;
    }

    .context-bar,
    .header-actions {
        overflow: visible;
    }

    .main-view__content {
        padding: 18px 14px calc(88px + env(safe-area-inset-bottom));
    }

    .mobile-nav {
        position: fixed;
        left: 10px;
        right: 10px;
        bottom: calc(9px + env(safe-area-inset-bottom));
        z-index: 70;
        height: 66px;
        padding: 6px;
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 2px;
        border: 1px solid var(--ta-line);
        border-radius: 10px;
        background: #ffffff;
        box-shadow: var(--ta-shadow-1);
    }

    .mobile-nav__item {
        min-width: 0;
        min-height: 52px;
        padding: 4px 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 3px;
        border-radius: 6px;
        color: var(--ta-text-tertiary);
        font-size: 11px;
        text-align: center;
        text-decoration: none;
        transition: color 140ms ease, background-color 140ms ease, transform 100ms ease;
    }

    .mobile-nav__item svg {
        width: 18px;
        height: 18px;
    }

    .mobile-nav__item span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .mobile-nav__item.is-active {
        color: var(--ta-blue);
        background: var(--ta-blue-soft);
        font-weight: 600;
    }
}

@media (max-width: 660px) {
    .context-divider,
    .context-status,
    .header-settings-link {
        display: none;
    }

    .context-bar :deep(.switch-trigger) {
        max-width: min(46vw, 210px);
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .header-actions__button.is-primary span {
        display: none;
    }

    .header-actions__button.is-primary {
        width: 34px;
        padding: 0;
    }

    .timer-finished-dialog__actions,
    .timer-finished-dialog__actions .header-actions__button {
        width: 100%;
    }

    .timer-finished-dialog__actions .header-actions__button {
        flex: 1;
    }
}

@media (max-width: 440px) {
    .main-view__header {
        align-items: stretch;
    }

    .context-bar {
        flex: 1 1 auto;
    }

    .context-bar :deep(.switch-trigger) {
        max-width: 42vw;
    }

    .header-actions {
        flex: 0 0 auto;
    }
}

@media (prefers-reduced-motion: reduce) {
    .main-view,
    .aside-nav__item,
    .header-actions__button,
    .mobile-nav__item {
        transition: none;
    }
}
</style>
