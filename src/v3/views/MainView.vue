<template>
    <div class="main-view" :class="{ 'is-aside-collapsed': asideCollapsed }">
        <aside class="main-view__aside" :class="{ 'is-collapsed': asideCollapsed }">
            <section class="brand-card">
                <div class="brand-card__badge">TA</div>
                <div class="brand-card__content">
                    <h2 class="brand-card__title">教师助手</h2>
                </div>
                <button type="button" class="aside-collapse-button"
                    :aria-expanded="!asideCollapsed"
                    :aria-label="asideCollapsed ? '展开侧边栏' : '收起侧边栏'"
                    :title="asideCollapsed ? '展开侧边栏' : '收起侧边栏'"
                    @click="toggleAsideCollapsed">
                    <i-ep-d-arrow-right v-if="asideCollapsed" />
                    <i-ep-d-arrow-left v-else />
                </button>
            </section>

            <nav class="aside-nav" aria-label="主导航">
                <RouterLink v-for="item in navItems" :key="item.id" :to="item.to" class="aside-nav__item"
                    :class="{ 'is-active': currentNavItem.id === item.id }" :title="item.label">
                    <span class="aside-nav__icon">{{ item.icon }}</span>
                    <span class="aside-nav__label">{{ item.label }}</span>
                </RouterLink>
            </nav>

            <div ref="userMenuContainerRef" class="aside-user-dropdown">
                <button type="button" class="aside-user" :class="{ 'is-open': userMenuVisible }"
                    :title="asideCollapsed ? userDisplayName : undefined"
                    @click="toggleUserMenu">
                    <el-avatar class="aside-user__avatar" :size="asideCollapsed ? 40 : 48" :src="userAvatar || undefined">
                        {{ userInitial }}
                    </el-avatar>
                    <div class="aside-user__content">
                        <span class="aside-user__label">当前用户</span>
                        <strong class="aside-user__name">{{ userDisplayName }}</strong>
                    </div>
                    <div class="aside-user__hint">
                        <span class="aside-user__hint-text">{{ userMenuVisible ? "点击收起" : "点击展开" }}</span>
                        <span class="aside-user__arrow" aria-hidden="true" />
                    </div>
                </button>

                <div v-show="userMenuVisible" class="aside-user-menu">
                    <button type="button" class="aside-user-menu__item" @click="handleUserMenuCommand('logout')">
                        退出登录
                    </button>
                </div>
            </div>
        </aside>

        <main class="main-view__main">
            <header class="main-view__header" :class="{ 'has-floating-timer': showHeaderTimerBubble }">
                <div class="page-heading">
                    <p class="page-heading__caption">{{ pageHeadingCaption }}</p>
                    <h1 class="page-heading__title">{{ currentPageTitle }}</h1>
                    <div class="status-chips">
                        <span v-for="item in statusChips" :key="item.id" class="status-chip" :class="item.toneClass">
                            {{ item.label }}
                        </span>
                    </div>
                </div>

                <button v-if="showHeaderTimerBubble" type="button" class="header-timer-bubble" @click="openTimerPage">
                    <span class="header-timer-bubble__eyebrow">课堂计时进行中</span>
                    <strong class="header-timer-bubble__time">{{ timerDisplayTime }}</strong>
                    <span class="header-timer-bubble__meta">当前进度 {{ timerProgressPercent }}%</span>
                    <span class="header-timer-bubble__track">
                        <span class="header-timer-bubble__fill" :style="{ width: `${timerProgressPercent}%` }" />
                    </span>
                </button>

                <div class="header-actions">
                    <button type="button" class="header-actions__button" @click="lockNow">
                        立即锁屏
                    </button>
                    <SemesterSwitchButton :active-class-id="activeClassId" :current-semester-id="currentSemesterId"
                        @switched="handleSemesterSwitched" />
                    <ClassSwitchButton :active-class-id="activeClassId" @switched="handleClassSwitched" />
                    <RouterLink to="/settings" class="header-actions__button">
                        进入设置
                    </RouterLink>
                    <RouterLink to="/points" class="header-actions__button is-primary">
                        进入积分中心
                    </RouterLink>
                </div>
            </header>

            <section class="main-view__content">
                <RouterView />
            </section>

            <div v-if="!dockCollapsed" class="main-view__dock">
                <div class="dock-meta">
                    <span class="dock-label">课堂高频操作</span>
                    <button type="button" class="dock-collapse-button" @click="toggleDockCollapsed">
                        收起
                    </button>
                </div>
                <div class="dock-actions">
                    <RouterLink v-for="item in dockActions" :key="item.id" :to="item.to" class="dock-actions__button">
                        {{ item.label }}
                    </RouterLink>
                </div>
            </div>

            <button v-else type="button" class="main-view__dock-fab" @click="toggleDockCollapsed">
                <i class="i-ep-arrow-up-bold main-view__dock-fab-icon" />
                <span>快捷操作</span>
            </button>

            <div v-if="cacheStore.isAuthenticated && unlockDialogVisible" class="lock-overlay">
                <div class="lock-card">
                    <div class="lock-title">已锁定</div>
                    <div class="lock-sub">请输入锁屏密码以继续使用</div>
                    <el-input v-model="unlockPassword" class="lock-input" type="password" show-password size="large"
                        placeholder="输入锁屏密码" @keyup.enter="confirmUnlock" />
                    <button type="button" class="header-actions__button is-primary lock-card__action"
                        :disabled="unlocking" @click="confirmUnlock">
                        {{ unlocking ? "解锁中..." : "立即解锁" }}
                    </button>
                </div>
            </div>

            <AppDialogShell
                v-model="timerFinishedDialogVisible"
                title="计时结束"
                eyebrow="课堂提醒"
                description="本轮课堂计时已经结束，请及时查看当前教学节奏。"
                width="560px"
            >
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
import { Timer } from "@element-plus/icons-vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import ClassSwitchButton from "@/v3/components/ClassSwitchButton.vue";
import SemesterSwitchButton from "@/v3/components/SemesterSwitchButton.vue";
import { classManager } from "@/managers/class";
import { userApi } from "@/api/user";
import { useCacheStore } from "@/stores/cacheStore";
import { useSharedTimer } from "@/v3/composables/useToolsWorkspace";
import type { ClassDTO, SemesterDTO } from "@/types/class";
import { isApiRequestError } from "@/types/api";
import { computeTrialFromProfile, normalizeUserProfile } from "@/utils/userProfile";
import { ElMessage } from "element-plus";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";

/** 定义左侧导航项结构。 */
interface NavItem {
    id: string
    label: string
    icon: string
    to: string
    heading: string
}

/** 定义带路由的快捷入口结构。 */
interface LinkActionItem {
    id: string
    label: string
    to: string
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
const { closeTimerFinishedDialog, timerDisplayTime, timerFinishedDialogVisible, timerProgressPercent, timerState } = useSharedTimer()
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const ASIDE_COLLAPSED_STORAGE_KEY = "teacher-assistant-aside-collapsed"
const userMenuVisible = ref(false)
const userMenuContainerRef = ref<HTMLElement | null>(null)
const userProfileRefreshing = ref(false)
const dockCollapsed = ref(false)
const asideCollapsed = ref(readAsideCollapsed())

const navItems: NavItem[] = [
    {
        id: "dashboard",
        label: "班级总览",
        icon: "01",
        to: "/dashboard",
        heading: "高一（2）班课堂工作台"
    },
    {
        id: "students",
        label: "学生管理",
        icon: "02",
        to: "/students",
        heading: "学生与分组管理"
    },
    {
        id: "points",
        label: "积分中心",
        icon: "03",
        to: "/points",
        heading: "课堂积分中心"
    },
    {
        id: "shop",
        label: "积分商城",
        icon: "04",
        to: "/shop",
        heading: "积分商城管理"
    },
    {
        id: "tools",
        label: "课堂工具",
        icon: "05",
        to: "/tools",
        heading: "课堂工具箱"
    },
    {
        id: "settings",
        label: "设置中心",
        icon: "06",
        to: "/settings",
        heading: "设置与辅助功能"
    }
]

/** 提供底部快捷入口的静态数据。 */
const dockActions: LinkActionItem[] = [
    { id: "dock-students", label: "学生管理", to: "/students" },
    { id: "dock-points", label: "积分中心", to: "/points" },
    { id: "dock-shop", label: "积分商城", to: "/shop" },
    { id: "dock-tools", label: "打开工具箱", to: "/tools" },
    { id: "dock-settings", label: "设置中心", to: "/settings" }
]

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
        const response = await userApi.getUserProfile()
        const profile = normalizeUserProfile(response.data, cacheStore.profile?.email ?? "")
        const { trial, expiresAt } = computeTrialFromProfile(profile)
        cacheStore.setAuth(cacheStore.token, profile, trial, expiresAt)
    } catch (error) {
        if (!isApiRequestError(error)) {
            console.error("获取当前用户信息失败", error)
            ElMessage.error("获取当前用户信息失败")
        }
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

/** 返回页面顶部的班级与学期说明。 */
const pageHeadingCaption = computed<string>(() => `${currentClassName.value} · ${currentSemesterName.value}`)

/** 返回当前激活的导航项。 */
const currentNavItem = computed<NavItem>(() => {
    return navItems.find((item) => route.path.startsWith(item.to)) ?? navItems[0]!
})

/** 返回当前页面标题。 */
const currentPageTitle = computed<string>(() => {
    if (currentNavItem.value.id === "dashboard") {
        return `${currentClassName.value}课堂工作台`
    }

    return currentNavItem.value.heading
})

/** 返回是否展示顶部计时气泡。 */
const showHeaderTimerBubble = computed<boolean>(() => {
    if (!timerState.isRunning) {
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

/** 切换底部高频操作栏的展开状态。 */
function toggleDockCollapsed(): void {
    dockCollapsed.value = !dockCollapsed.value
}

/** 打开完整计时器页面。 */
function openTimerPage(): void {
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
})

onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", handleDocumentPointerDown)
})
</script>

<style scoped>
.main-view {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    background:
        radial-gradient(circle at top left, rgba(142, 108, 255, 0.18), transparent 30%),
        radial-gradient(circle at top right, rgba(85, 104, 255, 0.12), transparent 26%),
        linear-gradient(180deg, #f8faff 0%, #eef3ff 100%);
    color: #16213e;
    transition: grid-template-columns 0.22s ease;
}

.main-view.is-aside-collapsed {
    grid-template-columns: 88px minmax(0, 1fr);
}

.main-view__aside {
    position: sticky;
    top: 0;
    height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px 18px;
    background: rgba(17, 25, 53, 0.9);
    color: #eef3ff;
    backdrop-filter: blur(18px);
    z-index: 20;
    transition: padding 0.22s ease, gap 0.22s ease;
}

.main-view__aside.is-collapsed {
    padding: 18px 12px;
    gap: 16px;
}

.brand-card,
.main-view__content {
    border: 1px solid rgba(122, 141, 198, 0.18);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
}

.brand-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(85, 104, 255, 0.28), rgba(142, 108, 255, 0.12));
}

.aside-collapse-button {
    width: 36px;
    height: 36px;
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #eef3ff;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.aside-collapse-button:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 255, 255, 0.28);
    background: rgba(255, 255, 255, 0.18);
}

.main-view.is-aside-collapsed .brand-card {
    flex-direction: column;
    gap: 10px;
    padding: 12px 8px;
}

.main-view.is-aside-collapsed .brand-card__content,
.main-view.is-aside-collapsed .aside-nav__label,
.main-view.is-aside-collapsed .aside-user__content,
.main-view.is-aside-collapsed .aside-user__hint {
    display: none;
}

.main-view.is-aside-collapsed .aside-collapse-button {
    margin-left: 0;
}

.brand-card__badge {
    width: 52px;
    height: 52px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: #ffffff;
    color: #5568ff;
    font-size: 18px;
    font-weight: 800;
    flex-shrink: 0;
}

.brand-card__content {
    min-width: 0;
}

.page-heading__caption {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.brand-card__title,
.page-heading__title {
    margin: 0;
}

.brand-card__title {
    margin-top: 4px;
    font-size: 20px;
    font-weight: 800;
}

.aside-nav {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 10px;
}

.aside-nav__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: none;
    border-radius: 18px;
    background: transparent;
    color: rgba(238, 243, 255, 0.88);
    text-align: left;
    text-decoration: none;
    transition: transform 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.aside-nav__item:hover,
.aside-nav__item.is-active {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    transform: translateX(4px);
}

.main-view.is-aside-collapsed .aside-nav__item {
    justify-content: center;
    padding: 12px 8px;
    transform: none;
}

.main-view.is-aside-collapsed .aside-nav__item:hover,
.main-view.is-aside-collapsed .aside-nav__item.is-active {
    transform: none;
}

.aside-nav__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.aside-nav__icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.14);
    font-size: 12px;
    font-weight: 700;
}

.aside-user {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    text-align: left;
    cursor: pointer;
    transition: transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.aside-user-dropdown {
    position: relative;
    width: 100%;
}

.aside-user:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.14);
}

.aside-user.is-open {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.16);
}

.aside-user:hover .aside-user__arrow {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.32);
    background: rgba(255, 255, 255, 0.14);
}

.aside-user__avatar {
    flex-shrink: 0;
    border: 2px solid rgba(255, 255, 255, 0.14);
}

.aside-user__content {
    min-width: 0;
    display: grid;
    gap: 2px;
    flex: 1;
}

.aside-user__label {
    color: rgba(238, 243, 255, 0.68);
    font-size: 12px;
    font-weight: 600;
}

.aside-user__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 700;
}

.aside-user__hint {
    display: grid;
    justify-items: center;
    gap: 6px;
    flex-shrink: 0;
}

.aside-user__hint-text {
    color: rgba(238, 243, 255, 0.68);
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
}

.aside-user__arrow {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    transition: transform 0.16s ease, background-color 0.16s ease, border-color 0.16s ease;
}

.aside-user__arrow::before {
    content: "";
    width: 8px;
    height: 8px;
    border-top: 2px solid rgba(255, 255, 255, 0.84);
    border-right: 2px solid rgba(255, 255, 255, 0.84);
    transform: rotate(-45deg) translateY(1px);
}

.aside-user.is-open .aside-user__arrow::before {
    transform: rotate(135deg) translateX(-1px);
}

.aside-user-menu {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 10px);
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    background: rgba(57, 67, 103, 0.96);
    box-shadow: 0 18px 36px rgba(10, 16, 34, 0.28);
    overflow: hidden;
}

.aside-user-menu__item {
    width: 100%;
    min-height: 46px;
    padding: 0 14px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.16s ease;
}

.aside-user-menu__item:hover {
    background: rgba(255, 255, 255, 0.12);
}

.main-view.is-aside-collapsed .aside-user {
    justify-content: center;
    padding: 10px;
}

.main-view.is-aside-collapsed .aside-user-menu {
    left: calc(100% + 10px);
    right: auto;
    bottom: 0;
    width: 180px;
}

.main-view__main {
    padding: 26px 26px 120px;
    box-sizing: border-box;
    min-height: 100vh;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.main-view__header {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
}

.page-heading__title {
    margin-top: 8px;
    font-size: clamp(32px, 3vw, 42px);
    line-height: 1.15;
}

.status-chips,
.header-actions,
.dock-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.status-chips {
    margin-top: 12px;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
}

.status-chip--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.status-chip--green {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.status-chip--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

.status-chip--amber {
    color: #b54708;
    background: rgba(247, 144, 9, 0.14);
}

.header-actions {
    align-self: flex-end;
    justify-content: flex-end;
}

.header-timer-bubble {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(320px, calc(100% - 380px));
    padding: 14px 18px;
    display: grid;
    gap: 8px;
    border: 1px solid rgba(85, 104, 255, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 16px 36px rgba(85, 104, 255, 0.16);
    backdrop-filter: blur(16px);
    text-align: left;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.header-timer-bubble:hover {
    transform: translate(-50%, calc(-50% - 2px));
    box-shadow: 0 20px 42px rgba(85, 104, 255, 0.2);
}

.header-timer-bubble__eyebrow {
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.header-timer-bubble__time {
    color: #16213e;
    font-size: 26px;
    font-weight: 900;
    line-height: 1;
}

.header-timer-bubble__meta {
    color: #627099;
    font-size: 13px;
    font-weight: 700;
}

.header-timer-bubble__track {
    height: 8px;
    display: block;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.12);
}

.header-timer-bubble__fill {
    height: 100%;
    display: block;
    border-radius: inherit;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    transition: width 0.24s ease;
}

.header-actions__button,
.dock-actions__button {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font-size: 14px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
    cursor: pointer;
}

.header-actions__button.is-primary {
    border: none;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.header-actions__button:hover,
.dock-actions__button:hover {
    transform: translateY(-2px);
}

.main-view__content {
    margin-top: 24px;
    padding: 24px;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.66);
    backdrop-filter: blur(16px);
}

.main-view__content :deep(.tools-standalone-page-frame) {
    flex: 1;
    min-height: 0;
}

.main-view__dock {
    position: fixed;
    left: 50%;
    bottom: 22px;
    transform: translateX(-50%);
    width: min(920px, calc(100vw - 32px));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 28px;
    background: rgba(20, 29, 56, 0.88);
    box-shadow: 0 24px 60px rgba(17, 25, 53, 0.2);
    backdrop-filter: blur(24px);
}

.dock-meta {
    display: flex;
    align-items: center;
    gap: 14px;
}

.dock-label {
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.dock-collapse-button {
    min-height: 36px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, background-color 0.16s ease;
}

.dock-collapse-button:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.14);
}

.dock-actions__button {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.08);
}

.main-view__dock-fab {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 20;
    min-height: 58px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    box-shadow: 0 18px 40px rgba(85, 104, 255, 0.3);
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.main-view__dock-fab:hover {
    transform: translateY(-2px);
    box-shadow: 0 22px 44px rgba(85, 104, 255, 0.34);
}

.main-view__dock-fab-icon {
    font-size: 16px;
}

.lock-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(13, 18, 36, 0.54);
    backdrop-filter: blur(8px);
}

.lock-card {
    width: min(440px, 100%);
    padding: 28px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 30px 64px rgba(17, 25, 53, 0.24);
    display: grid;
    gap: 14px;
}

.lock-title {
    font-size: 28px;
    font-weight: 800;
    color: #16213e;
}

.lock-sub {
    color: #627099;
    line-height: 1.7;
}

.lock-input {
    margin-top: 6px;
}

.lock-card__action {
    width: 100%;
    min-height: 52px;
}

.timer-finished-dialog {
    display: grid;
    justify-items: center;
    gap: 14px;
    padding: 12px 0 4px;
    text-align: center;
}

.timer-finished-dialog__icon {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(85, 104, 255, 0.14), rgba(142, 108, 255, 0.18));
    color: #5568ff;
    font-size: 32px;
}

.timer-finished-dialog__time {
    color: #16213e;
    font-size: clamp(42px, 7vw, 64px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.04em;
}

.timer-finished-dialog__summary {
    margin: 0;
    color: #627099;
    font-size: 15px;
    line-height: 1.7;
}

.timer-finished-dialog__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
}

.lock-card :deep(.el-input__wrapper) {
    min-height: 52px;
    border-radius: 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    box-shadow: none;
}

.lock-card :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 1080px) {
    .main-view,
    .main-view.is-aside-collapsed {
        grid-template-columns: 1fr;
    }

    .main-view__aside {
        position: static;
        height: auto;
    }

    .main-view.is-aside-collapsed .main-view__aside {
        flex-direction: row;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
    }

    .main-view.is-aside-collapsed .brand-card {
        flex-direction: row;
        padding: 8px 10px;
    }

    .main-view.is-aside-collapsed .aside-nav {
        flex-direction: row;
        flex: 1;
        gap: 6px;
        overflow-x: auto;
    }

    .main-view.is-aside-collapsed .aside-nav__item {
        width: auto;
        flex-shrink: 0;
        padding: 8px;
    }

    .main-view.is-aside-collapsed .aside-user-menu {
        left: auto;
        right: 0;
        bottom: auto;
        top: calc(100% + 8px);
    }
}

@media (max-width: 768px) {
    .main-view__main {
        padding: 18px 14px 140px;
    }

    .main-view__aside {
        min-height: auto;
    }

    .main-view__header,
    .main-view__dock {
        flex-direction: column;
        align-items: stretch;
    }

    .dock-meta {
        justify-content: space-between;
    }

    .header-actions {
        align-self: stretch;
    }

    .header-timer-bubble {
        position: static;
        order: 3;
        width: 100%;
        transform: none;
    }

    .header-timer-bubble:hover {
        transform: translateY(-2px);
    }

    .main-view__content {
        padding: 18px;
    }

    .timer-finished-dialog__actions {
        width: 100%;
    }

    .timer-finished-dialog__actions .header-actions__button {
        flex: 1;
    }

    .main-view__dock {
        left: 8px;
        right: 8px;
        bottom: 8px;
        width: auto;
        transform: none;
    }

    .main-view__dock-fab {
        right: 12px;
        bottom: 12px;
        min-height: 52px;
        padding: 0 16px;
    }

    .dock-label {
        white-space: normal;
    }
}
</style>