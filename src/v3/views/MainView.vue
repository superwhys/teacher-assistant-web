<template>
    <div class="main-view">
        <aside class="main-view__aside">
            <section class="brand-card">
                <div class="brand-card__badge">TA</div>
                <div class="brand-card__content">
                    <h2 class="brand-card__title">教师助手</h2>
                </div>
            </section>

            <nav class="aside-nav" aria-label="主导航">
                <RouterLink v-for="item in navItems" :key="item.id" :to="item.to" class="aside-nav__item"
                    :class="{ 'is-active': currentNavItem.id === item.id }">
                    <span class="aside-nav__icon">{{ item.icon }}</span>
                    <span>{{ item.label }}</span>
                </RouterLink>
            </nav>
        </aside>

        <main class="main-view__main">
            <header class="main-view__header">
                <div class="page-heading">
                    <p class="page-heading__caption">{{ pageHeadingCaption }}</p>
                    <h1 class="page-heading__title">{{ currentPageTitle }}</h1>
                    <div class="status-chips">
                        <span v-for="item in statusChips" :key="item.id" class="status-chip" :class="item.toneClass">
                            {{ item.label }}
                        </span>
                    </div>
                </div>

                <div class="header-actions">
                    <button type="button" class="header-actions__button">
                        立即锁屏
                    </button>
                    <SemesterSwitchButton
                        :active-class-id="activeClassId"
                        :current-semester-id="currentSemesterId"
                        @switched="handleSemesterSwitched"
                    />
                    <ClassSwitchButton
                        :active-class-id="activeClassId"
                        @switched="handleClassSwitched"
                    />
                    <RouterLink to="/v3/settings" class="header-actions__button">
                        进入设置
                    </RouterLink>
                    <RouterLink to="/v3/points" class="header-actions__button is-primary">
                        进入积分中心
                    </RouterLink>
                </div>
            </header>

            <section class="main-view__content">
                <RouterView />
            </section>

            <div class="main-view__dock">
                <span class="dock-label">课堂高频操作</span>
                <div class="dock-actions">
                    <RouterLink v-for="item in dockActions" :key="item.id" :to="item.to" class="dock-actions__button">
                        {{ item.label }}
                    </RouterLink>
                </div>
            </div>

        </main>
    </div>
</template>

<script setup lang="ts">
import ClassSwitchButton from "@/v3/components/ClassSwitchButton.vue";
import SemesterSwitchButton from "@/v3/components/SemesterSwitchButton.vue";
import { classManager } from "@/managers/class";
import { useCacheStore } from "@/stores/cacheStore";
import type { ClassDTO, SemesterDTO } from "@/types/class";
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

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
const cacheStore = useCacheStore()
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)

const navItems: NavItem[] = [
    {
        id: "dashboard",
        label: "班级总览",
        icon: "01",
        to: "/v3/dashboard",
        heading: "高一（2）班课堂工作台"
    },
    {
        id: "students",
        label: "学生管理",
        icon: "02",
        to: "/v3/students",
        heading: "学生与分组管理"
    },
    {
        id: "points",
        label: "积分中心",
        icon: "03",
        to: "/v3/points",
        heading: "课堂积分中心"
    },
    {
        id: "shop",
        label: "积分商城",
        icon: "04",
        to: "/v3/shop",
        heading: "积分商城管理"
    },
    {
        id: "tools",
        label: "课堂工具",
        icon: "05",
        to: "/v3/tools",
        heading: "课堂工具箱"
    },
    {
        id: "settings",
        label: "设置中心",
        icon: "06",
        to: "/v3/settings",
        heading: "设置与辅助功能"
    }
]

/** 提供底部快捷入口的静态数据。 */
const dockActions: LinkActionItem[] = [
    { id: "dock-students", label: "学生管理", to: "/v3/students" },
    { id: "dock-points", label: "积分中心", to: "/v3/points" },
    { id: "dock-shop", label: "积分商城", to: "/v3/shop" },
    { id: "dock-tools", label: "打开工具箱", to: "/v3/tools" },
    { id: "dock-settings", label: "设置中心", to: "/v3/settings" }
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
}

/** 加载当前班级与学期信息。 */
async function loadCurrentClassAndSemesterInfo(): Promise<void> {
    if (!cacheStore.isAuthenticated) {
        classes.value = []
        activeClassId.value = null
        cacheStore.clearActiveClassName()
        resetSemesterCacheState()
        return
    }

    try {
        await loadClasses()
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
        await loadCurrentClassAndSemesterInfo()
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

/** 返回当前班级名称。 */
const currentClassName = computed<string>(() => cacheStore.getActiveClassName()?.trim() || "未知班级")

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

watch(
    [() => cacheStore.profile?.id, () => cacheStore.getActiveClassId()],
    () => {
        void loadCurrentClassAndSemesterInfo()
    },
    { immediate: true }
)
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

.main-view__main {
    padding: 26px 26px 120px;
}

.main-view__header {
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
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.66);
    backdrop-filter: blur(16px);
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

.dock-label {
    color: rgba(255, 255, 255, 0.72);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
}

.dock-actions__button {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.08);
}

@media (max-width: 1080px) {
    .main-view {
        grid-template-columns: 1fr;
    }

    .main-view__aside {
        position: static;
        height: auto;
    }
}

@media (max-width: 768px) {
    .main-view__main {
        padding: 18px 14px 140px;
    }

    .main-view__header,
    .main-view__dock {
        flex-direction: column;
        align-items: stretch;
    }

    .header-actions {
        align-self: stretch;
    }

    .main-view__content {
        padding: 18px;
    }

    .main-view__dock {
        left: 8px;
        right: 8px;
        bottom: 8px;
        width: auto;
        transform: none;
    }

    .dock-label {
        white-space: normal;
    }
}
</style>