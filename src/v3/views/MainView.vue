<template>
    <div class="main-view" :class="{ 'is-aside-collapsed': asideCollapsed }">
        <aside class="main-view__aside">
            <section class="brand-card">
                <div class="brand-card__badge" aria-hidden="true">
                    <i-ep-chat-dot-square />
                </div>
                <div class="brand-card__content">
                    <strong class="brand-card__title">教师助手</strong>
                    <span>Teacher Assistant</span>
                </div>
                <button type="button" class="aside-collapse-button" :aria-expanded="!asideCollapsed"
                    :aria-label="asideCollapsed ? '展开侧边栏' : '收起侧边栏'"
                    :title="asideCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleAsideCollapsed">
                    <component :is="asideCollapsed ? Expand : Fold" />
                </button>
            </section>

            <nav class="aside-nav" aria-label="主导航">
                <RouterLink v-for="item in navItems" :key="item.id" :to="item.to" class="aside-nav__item"
                    :class="{ 'is-active': currentNavItem?.id === item.id }" :title="item.label">
                    <component :is="item.icon" class="aside-nav__icon" aria-hidden="true" />
                    <span class="aside-nav__label">{{ item.label }}</span>
                </RouterLink>
            </nav>

            <div class="sidebar-spacer" />

            <div ref="userMenuContainerRef" class="aside-user-dropdown">
                <button type="button" class="aside-user" :class="{ 'is-open': userMenuVisible }"
                    :title="asideCollapsed ? userDisplayName : undefined" @click="toggleUserMenu">
                    <el-avatar class="aside-user__avatar" :size="36" :src="userAvatar || undefined">
                        {{ userInitial }}
                    </el-avatar>
                    <div class="aside-user__content">
                        <strong class="aside-user__name">{{ userDisplayName }}</strong>
                        <span class="aside-user__label">当前用户</span>
                    </div>
                    <ArrowDown class="aside-user__arrow" aria-hidden="true" />
                </button>

                <div v-show="userMenuVisible" class="aside-user-menu">
                    <RouterLink v-if="sessionStore.canAccess('/settings')" to="/settings" class="aside-user-menu__item" @click="userMenuVisible = false">
                        进入设置
                    </RouterLink>
                    <button type="button" class="aside-user-menu__item is-danger"
                        @click="handleUserMenuCommand('logout')">
                        退出登录
                    </button>
                </div>
            </div>
        </aside>

        <main class="main-view__main">
            <div class="mobile-topbar">
                <div class="mobile-brand">
                    <span class="brand-card__badge" aria-hidden="true"><i-ep-chat-dot-square /></span>
                    <strong>教师助手</strong>
                </div>
                <div class="mobile-actions">
                    <button v-if="showHeaderTimerBubble" type="button" class="mobile-timer-pill"
                        @click="openTimerPage">
                        {{ timerDisplayTime }}
                    </button>
                    <RouterLink v-if="sessionStore.canAccess('/settings')" to="/settings" class="mobile-account" aria-label="进入设置">
                        {{ userInitial }}
                    </RouterLink>
                </div>
            </div>

            <header class="main-view__header">
                <div class="context-bar">
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

                <div class="header-actions">
                    <button v-if="showHeaderTimerBubble" type="button" class="timer-pill" @click="openTimerPage">
                        <Clock aria-hidden="true" />
                        <strong>{{ timerDisplayTime }}</strong>
                    </button>
                    <button type="button" class="header-actions__button is-icon" aria-label="立即锁屏"
                        title="立即锁屏" @click="lockNow">
                        <Lock aria-hidden="true" />
                    </button>
                    <RouterLink v-if="sessionStore.canAccess('/settings')" to="/settings" class="header-actions__button header-settings-link">
                        <Setting aria-hidden="true" />
                        <span>进入设置</span>
                    </RouterLink>
                    <RouterLink v-if="sessionStore.canAccess('/points')" to="/points" class="header-actions__button is-primary">
                        <StarFilled aria-hidden="true" />
                        <span>进入积分中心</span>
                    </RouterLink>
                </div>
            </header>

            <section class="main-view__content" :aria-label="currentNavItem?.label || '内容区'">
                <RouterView />
            </section>

            <nav class="mobile-nav" aria-label="手机主导航">
                <RouterLink v-for="item in navItems" :key="`mobile-${item.id}`" :to="item.to"
                    class="mobile-nav__item" :class="{ 'is-active': currentNavItem?.id === item.id }">
                    <component :is="item.icon" aria-hidden="true" />
                    <span>{{ item.mobileLabel }}</span>
                </RouterLink>
            </nav>

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

            <AppDialogShell v-model="welcomeDialogVisible" title="欢迎使用全新的教师助手" eyebrow="v4 新体验"
                description="界面已经针对办公电脑和手机重新设计，你原有的班级与课堂数据不会受到影响。" width="640px">
                <div class="welcome-dialog">
                    <div class="welcome-dialog__lead">
                        <div class="welcome-dialog__mark" aria-hidden="true">
                            <i-ep-chat-dot-square />
                        </div>
                        <div>
                            <strong>更轻、更清晰，也更适合日常使用</strong>
                            <p>主要功能入口保持不变，你可以继续按照熟悉的方式管理学生、积分、商城和课堂工具。</p>
                        </div>
                    </div>

                    <div class="welcome-dialog__highlights">
                        <article class="welcome-highlight">
                            <span class="welcome-highlight__icon"><i-ep-monitor /></span>
                            <strong>办公电脑更高效</strong>
                            <p>内容区域会充分利用屏幕宽度，减少无意义留白。</p>
                        </article>
                        <article class="welcome-highlight">
                            <span class="welcome-highlight__icon"><i-ep-cellphone /></span>
                            <strong>手机操作更顺手</strong>
                            <p>常用页面、按钮和弹窗均已重新适配窄屏使用。</p>
                        </article>
                        <article class="welcome-highlight">
                            <span class="welcome-highlight__icon"><i-ep-circle-check /></span>
                            <strong>功能和数据都保留</strong>
                            <p>班级、学生、积分规则、记录和商城数据保持原样。</p>
                        </article>
                    </div>

                    <div class="welcome-dialog__note">
                        <i-ep-info-filled aria-hidden="true" />
                        <span>桌面端使用左侧导航，手机端使用底部导航，即可进入全部功能。</span>
                    </div>
                </div>

                <template #footer>
                    <div class="welcome-dialog__actions">
                        <button type="button" class="primary-button" @click="welcomeDialogVisible = false">
                            开始使用
                        </button>
                    </div>
                </template>
            </AppDialogShell>

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
import { ArrowDown, Clock, Expand, Fold, HomeFilled, Lock, Menu, Present, Setting, StarFilled, Timer, Tools, UserFilled } from "@element-plus/icons-vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import ClassSwitchButton from "@/v3/components/ClassSwitchButton.vue";
import SemesterSwitchButton from "@/v3/components/SemesterSwitchButton.vue";
import TeachersDayWelcomeDialog from "@/v3/components/TeachersDayWelcomeDialog.vue";
import { classManager } from "@/managers/class";
import { useCacheStore } from "@/stores/cacheStore";
import { useSessionStore } from "@/stores/sessionStore";
import { getTeachersDayWelcomeStorageKey, isTeachersDay } from "@/utils/teachersDayWelcome";
import { useSharedTimer } from "@/v3/composables/useToolsWorkspace";
import type { ClassDTO, SemesterDTO } from "@/types/class";
import { ElMessage } from "element-plus";
import { computed, onBeforeUnmount, onMounted, ref, watch, type Component } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

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
const { closeTimerFinishedDialog, timerDisplayTime, timerFinishedDialogVisible, timerState } = useSharedTimer()
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const ASIDE_COLLAPSED_STORAGE_KEY = "teacher-assistant-aside-collapsed"
const V4_WELCOME_STORAGE_KEY_PREFIX = "teacher-assistant-v4-welcome-seen"
const welcomeDialogVisible = ref(false)
const welcomeDialogOpened = ref(false)
const teachersDayDialogVisible = ref(false)
const teachersDayDialogOpened = ref(false)
const teachersDayStorageKey = ref("")
const userMenuVisible = ref(false)
const userMenuContainerRef = ref<HTMLElement | null>(null)
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
            { id: "allowed", label: "允许积分操作", toneClass: "status-chip--green" },
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
    return navItems.value.find((item) => route.path.startsWith(item.to)) ?? navItems.value[0] ?? null
})

/** 返回是否展示顶部计时气泡。 */
const showHeaderTimerBubble = computed<boolean>(() => {
    if (!timerState.isRunning || !sessionStore.canAccess("/tools")) {
        return false
    }

    return route.path !== "/tools" && route.path !== "/tools/timer"
})

/** 处理当前用户菜单点击事件。 */
async function handleUserMenuCommand(command: string): Promise<void> {
    if (command !== "logout") {
        return
    }

    userMenuVisible.value = false
    sessionStore.reset()
    cacheStore.logout()
    ElMessage.success("已退出登录")
    await router.replace("/auth")
}

/** 切换当前用户菜单的展开状态。 */
function toggleUserMenu(): void {
    userMenuVisible.value = !userMenuVisible.value
}

/** 在点击外部区域时关闭当前用户菜单。 */
function handleDocumentPointerDown(event: PointerEvent): void {
    const container = userMenuContainerRef.value
    const target = event.target
    if (!container || !(target instanceof Node) || container.contains(target)) {
        return
    }

    userMenuVisible.value = false
}

/** 根据登录状态同步当前用户资料。 */
function syncUserProfileByAuthState(token: string | null, expired: boolean): void {
    if (token && !expired) {
        void refreshUserProfile()
        return
    }

    userMenuVisible.value = false
}

/** 返回当前用户对应的 v4 欢迎弹窗本地标记。 */
function getV4WelcomeStorageKey(): string {
    const userId = cacheStore.profile?.id
    return `${V4_WELCOME_STORAGE_KEY_PREFIX}:${userId ?? "default"}`
}

/** 判断当前用户是否已经展示过 v4 欢迎弹窗。 */
function hasSeenV4Welcome(): boolean {
    try {
        return window.localStorage.getItem(getV4WelcomeStorageKey()) === "1"
    } catch {
        return false
    }
}

/** 记录当前用户已经看过 v4 欢迎弹窗。 */
function persistV4WelcomeSeen(): void {
    try {
        window.localStorage.setItem(getV4WelcomeStorageKey(), "1")
    } catch {
        return
    }
}

/** 在首次进入 v4 工作区时展示欢迎弹窗。 */
function openV4WelcomeOnFirstVisit(): void {
    if (hasSeenV4Welcome()) {
        return
    }

    welcomeDialogOpened.value = true
    welcomeDialogVisible.value = true
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
    userMenuVisible.value = false
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

watch(welcomeDialogVisible, (visible) => {
    if (visible || !welcomeDialogOpened.value) {
        return
    }

    persistV4WelcomeSeen()
    welcomeDialogOpened.value = false
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
    ([token, expired], [previousToken]) => {
        if (token !== previousToken) {
            userMenuVisible.value = false
        }

        syncUserProfileByAuthState(token, expired)
    },
    { immediate: true }
)

onMounted(() => {
    document.addEventListener("pointerdown", handleDocumentPointerDown)
    if (!openTeachersDayWelcome()) {
        openV4WelcomeOnFirstVisit()
    }
})

onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", handleDocumentPointerDown)
})
</script>

<style scoped>
.main-view {
    --sidebar-width: 236px;
    min-height: 100vh;
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    color: var(--ta-text);
    background: var(--ta-bg);
    transition: grid-template-columns 260ms cubic-bezier(.2, .8, .2, 1);
}

.main-view.is-aside-collapsed {
    --sidebar-width: 82px;
}

.main-view__aside {
    position: sticky;
    top: 0;
    z-index: 30;
    height: 100vh;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-right: 1px solid var(--ta-line);
    background: rgba(249, 249, 251, 0.84);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
}

.brand-card {
    min-height: 56px;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 11px;
    border-radius: 14px;
}

.brand-card__badge {
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #ffffff;
    background: linear-gradient(145deg, #1687ff, #0061d9);
    box-shadow: 0 7px 18px rgba(0, 122, 255, 0.24);
}

.brand-card__badge svg {
    width: 19px;
    height: 19px;
}

.brand-card__content {
    min-width: 0;
}

.brand-card__title {
    display: block;
    font-size: 17px;
    line-height: 1.15;
    letter-spacing: -0.01em;
    white-space: nowrap;
}

.brand-card__content span {
    display: block;
    margin-top: 4px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    letter-spacing: 0.02em;
    white-space: nowrap;
}

.aside-collapse-button {
    width: 30px;
    height: 30px;
    margin-left: auto;
    padding: 0;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-tertiary);
    background: transparent;
    cursor: pointer;
}

.aside-collapse-button:hover {
    color: var(--ta-text);
    background: rgba(0, 0, 0, 0.05);
}

.aside-collapse-button svg {
    width: 17px;
    height: 17px;
}

.aside-nav {
    display: grid;
    gap: 4px;
}

.aside-nav__item {
    width: 100%;
    min-height: 46px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 11px;
    border: 0;
    border-radius: 12px;
    color: var(--ta-text-secondary);
    background: transparent;
    text-decoration: none;
    cursor: pointer;
    text-align: left;
    transition: color 140ms ease, background-color 140ms ease, transform 100ms ease;
}

.aside-nav__item:hover {
    color: var(--ta-text);
    background: rgba(0, 0, 0, 0.045);
}

.aside-nav__item.is-active {
    color: #006edc;
    background: var(--ta-blue-soft);
    font-weight: 650;
}

.aside-nav__item:active,
.aside-user:active,
.header-actions__button:active,
.timer-pill:active,
.mobile-nav__item:active {
    transform: scale(0.975);
}

.aside-nav__icon {
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
}

.aside-nav__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sidebar-spacer {
    flex: 1;
}

.aside-user-dropdown {
    position: relative;
}

.aside-user-menu {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 7px);
    z-index: 80;
    padding: 6px;
    border: 1px solid var(--ta-line);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: var(--ta-shadow-2);
    backdrop-filter: blur(22px) saturate(180%);
    transform-origin: bottom left;
}

.aside-user-menu__item {
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-secondary);
    background: transparent;
    text-decoration: none;
    cursor: pointer;
}

.aside-user-menu__item:hover {
    color: var(--ta-text);
    background: var(--ta-surface-muted);
}

.aside-user-menu__item.is-danger {
    color: var(--ta-red);
}

.aside-user {
    width: 100%;
    min-height: 54px;
    padding: 7px 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid transparent;
    border-radius: 14px;
    color: var(--ta-text);
    background: transparent;
    cursor: pointer;
    text-align: left;
}

.aside-user:hover,
.aside-user.is-open {
    border-color: var(--ta-line);
    background: rgba(255, 255, 255, 0.72);
}

.aside-user__avatar {
    flex: 0 0 auto;
    color: #ffffff;
    background: linear-gradient(145deg, #5e5ce6, #007aff);
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
    font-size: 14px;
}

.aside-user__label {
    margin-top: 2px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.aside-user__arrow {
    width: 16px;
    color: var(--ta-text-tertiary);
    transition: transform 160ms ease;
}

.aside-user.is-open .aside-user__arrow {
    transform: rotate(180deg);
}

.main-view.is-aside-collapsed .brand-card {
    justify-content: center;
    padding-inline: 0;
}

.main-view.is-aside-collapsed .brand-card__content,
.main-view.is-aside-collapsed .aside-nav__label,
.main-view.is-aside-collapsed .aside-user__content,
.main-view.is-aside-collapsed .aside-user__arrow {
    display: none;
}

.main-view.is-aside-collapsed .aside-collapse-button {
    position: absolute;
    top: 76px;
    left: 26px;
}

.main-view.is-aside-collapsed .aside-nav {
    margin-top: 37px;
}

.main-view.is-aside-collapsed .aside-nav__item,
.main-view.is-aside-collapsed .aside-user {
    justify-content: center;
    padding-inline: 0;
}

.main-view.is-aside-collapsed .aside-user-menu {
    left: calc(100% + 9px);
    right: auto;
    bottom: 0;
    width: 190px;
}

.main-view__main {
    min-width: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.mobile-topbar,
.mobile-nav {
    display: none;
}

.main-view__header {
    position: sticky;
    top: 0;
    z-index: 24;
    min-height: 70px;
    padding: 10px clamp(18px, 3vw, 34px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    background: rgba(245, 245, 247, 0.76);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
}

.main-view__header::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: -12px;
    height: 12px;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(245, 245, 247, 0.56), transparent);
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
    min-height: 38px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: rgba(255, 255, 255, 0.7);
    box-shadow: inset 0 0 0 1px var(--ta-line);
    font-size: 14px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 140ms ease, color 140ms ease, transform 100ms ease, box-shadow 140ms ease;
}

.context-bar :deep(.switch-trigger:hover),
.header-actions__button:hover {
    color: var(--ta-text);
    background: #ffffff;
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
    gap: 7px;
    color: var(--ta-green);
    font-size: 13px;
    white-space: nowrap;
}

.context-status::before {
    content: "";
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 0 4px rgba(36, 138, 61, 0.1);
}

.context-status.status-chip--slate,
.context-status.status-chip--amber {
    color: var(--ta-orange);
}

.header-actions {
    justify-content: flex-end;
    flex: 0 0 auto;
}

.header-actions__button svg,
.timer-pill svg {
    width: 16px;
    height: 16px;
}

.header-actions__button.is-primary {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.2);
}

.header-actions__button.is-primary:hover {
    color: #ffffff;
    background: var(--ta-blue-hover);
}

.header-actions__button.is-icon {
    width: 38px;
    padding: 0;
}

.timer-pill,
.mobile-timer-pill {
    min-height: 38px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 11px;
    color: #005ecb;
    background: #e8f3ff;
    cursor: pointer;
    font-size: 14px;
}

.timer-pill strong,
.mobile-timer-pill {
    font-variant-numeric: tabular-nums;
}

.main-view__content {
    width: 100%;
    min-width: 0;
    padding: 24px clamp(18px, 2vw, 48px) 44px;
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
    background: rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(18px) saturate(130%);
}

.lock-card {
    width: min(400px, 100%);
    padding: 28px;
    display: grid;
    justify-items: center;
    gap: 10px;
    border: 1px solid rgba(255, 255, 255, 0.74);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.95);
    box-shadow: var(--ta-shadow-2);
    text-align: center;
}

.lock-card__icon {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.lock-card__icon svg {
    width: 24px;
}

.lock-title {
    margin-top: 4px;
    font-size: 25px;
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
    border-radius: 10px;
}

.lock-card__action {
    width: 100%;
    margin-top: 4px;
}

.welcome-dialog {
    display: grid;
    gap: 14px;
}

.welcome-dialog__lead {
    padding: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--ta-line);
    border-radius: 14px;
    background: #f7f7f8;
}

.welcome-dialog__mark {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 7px 18px rgba(0, 122, 255, 0.2);
}

.welcome-dialog__mark svg {
    width: 21px;
    height: 21px;
}

.welcome-dialog__lead strong {
    font-size: 15px;
}

.welcome-dialog__lead p,
.welcome-highlight p {
    margin: 4px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.55;
}

.welcome-dialog__highlights {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
}

.welcome-highlight {
    min-width: 0;
    padding: 13px;
    border: 1px solid var(--ta-line);
    border-radius: 13px;
    background: #ffffff;
}

.welcome-highlight__icon {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.welcome-highlight__icon svg {
    width: 16px;
    height: 16px;
}

.welcome-highlight strong {
    display: block;
    margin-top: 10px;
    font-size: 14px;
}

.welcome-dialog__note {
    min-height: 40px;
    padding: 9px 11px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 11px;
    color: #0064cf;
    background: #eaf4ff;
    font-size: 12px;
    line-height: 1.5;
}

.welcome-dialog__note svg {
    width: 16px;
    height: 16px;
    flex: 0 0 auto;
}

.welcome-dialog__actions {
    display: flex;
    justify-content: flex-end;
}

.welcome-dialog__actions .primary-button {
    min-width: 112px;
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
    border-radius: 20px;
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

@media (min-width: 1800px) {
    .main-view__content {
        padding-inline: 44px;
    }
}

@media (min-width: 2300px) {
    .main-view__content {
        padding-inline: 52px;
    }
}

@media (max-width: 1180px) {
    .header-settings-link span {
        display: none;
    }

    .header-settings-link {
        width: 38px;
        padding: 0;
    }
}

@media (max-width: 920px) {
    .main-view,
    .main-view.is-aside-collapsed {
        display: block;
    }

    .main-view__aside {
        display: none;
    }

    .mobile-topbar {
        position: sticky;
        top: 0;
        z-index: 35;
        height: 54px;
        padding: 0 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--ta-line);
        background: rgba(249, 249, 251, 0.9);
        backdrop-filter: blur(22px) saturate(180%);
    }

    .mobile-brand,
    .mobile-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .mobile-brand .brand-card__badge {
        width: 31px;
        height: 31px;
        border-radius: 9px;
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
        color: #ffffff;
        background: linear-gradient(145deg, #5e5ce6, #007aff);
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
    }

    .main-view__header {
        top: 54px;
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
        border: 1px solid rgba(255, 255, 255, 0.74);
        border-radius: 19px;
        background: rgba(250, 250, 252, 0.88);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16);
        backdrop-filter: blur(26px) saturate(190%);
        -webkit-backdrop-filter: blur(26px) saturate(190%);
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
        border-radius: 13px;
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
        color: #006edc;
        background: var(--ta-blue-soft);
        font-weight: 650;
    }
}

@media (max-width: 660px) {
    .welcome-dialog__lead {
        align-items: flex-start;
    }

    .welcome-dialog__highlights {
        grid-template-columns: 1fr;
    }

    .welcome-dialog__actions,
    .welcome-dialog__actions .primary-button {
        width: 100%;
    }
}

@media (max-width: 660px) {
    .context-divider,
    .context-status,
    .timer-pill,
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
        width: 38px;
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
</style>
