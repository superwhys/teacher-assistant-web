<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatTimeHHmm, formatChineseDateWithWeek } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import { classManager } from '@/managers/class'
import type { ClassDTO } from '@/types/class'
import { useCacheStore } from '@/stores/cacheStore'

const cacheStore = useCacheStore()
const isAuthenticated = computed(() => cacheStore.isAuthenticated)

const now = ref(new Date())
let timer: number | undefined

onBeforeUnmount(() => {
    if (timer !== undefined) {
        window.clearInterval(timer)
    }
    clearTrialReminder()
})

onMounted(() => {
    timer = window.setInterval(() => {
        now.value = new Date()
    }, 1000)
})

const timeString = computed(() => formatTimeHHmm(now.value))
const dateString = computed(() => formatChineseDateWithWeek(now.value))
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const isClassReady = ref(false)
const classSelectId = ref<number | null>(null)
const classOptions = computed(() => {
    return classes.value.filter((c): c is { id: number, name: string } => {
        return typeof c.id === 'number' && typeof c.name === 'string' && c.name.trim().length > 0
    })
})
const activeClassId = computed<number | null>({
    get: () => cacheStore.getActiveClassId(),
    set: (val) => {
        if (typeof val === 'number') {
            cacheStore.setActiveClassId(val)
        } else {
            cacheStore.clearActiveClassId()
        }
    }
})

// 同步当前班级名称到 cacheStore，供各页面展示
watch([activeClassId, classes], ([cid]) => {
    if (!cid) {
        cacheStore.clearActiveClassName()
        return
    }
    const name = classes.value.find(c => c.id === cid)?.name ?? null
    if (name && name.trim()) {
        cacheStore.setActiveClassName(name)
    } else {
        cacheStore.clearActiveClassName()
    }
}, { immediate: true })

async function loadClassesFromApi() {
    if (classesLoading.value) return
    classesLoading.value = true
    try {
        classes.value = await classManager.list()
        const validIds = new Set(classOptions.value.map(c => c.id))
        if (activeClassId.value && !validIds.has(activeClassId.value)) {
            activeClassId.value = null
        }
        if (!activeClassId.value) {
            activeClassId.value = classOptions.value[0]?.id ?? null
        }
    } finally {
        classesLoading.value = false
    }
}

async function initClassesForSelect() {
    if (!isAuthenticated.value) {
        isClassReady.value = false
        classes.value = []
        classSelectId.value = null
        return
    }
    isClassReady.value = false
    await loadClassesFromApi()
    // 注意：必须等 options 有了再给 select 赋值，否则 element-plus 会显示 value（id）
    classSelectId.value = activeClassId.value
    isClassReady.value = true
}

watch([isAuthenticated, () => cacheStore.profile?.id], ([authed]) => {
    if (authed) {
        void initClassesForSelect()
    } else {
        void initClassesForSelect()
    }
}, { immediate: true })

watch(classSelectId, (val) => {
    if (!isClassReady.value) return
    activeClassId.value = val
})

watch([activeClassId, classOptions], ([cid]) => {
    if (!isClassReady.value) return
    if (!cid) {
        classSelectId.value = null
        return
    }
    if (classOptions.value.some(c => c.id === cid)) {
        classSelectId.value = cid
    } else {
        classSelectId.value = null
    }
})
const userName = computed(() => cacheStore.displayName || '已登录')
const userEmail = computed(() => cacheStore.profile?.email ?? '')
const userAvatar = computed(() => cacheStore.profile?.avatar ?? null)
const userInitial = computed(() => {
    const name = userName.value.trim()
    if (!name) return '用'
    return name.charAt(0).toUpperCase()
})

const trialSecondsLeft = computed(() => {
    if (!isAuthenticated.value || !cacheStore.isTrial || cacheStore.trialExpiresAt === null) return null
    return cacheStore.trialExpiresAt - Math.floor(now.value.getTime() / 1000)
})
const trialExpired = computed(() => trialSecondsLeft.value !== null && trialSecondsLeft.value <= 0)
const showTrialBadge = computed(() => isAuthenticated.value && cacheStore.isTrial)
const isLoginExpired = computed(() => cacheStore.isExpired)
const trialBadgeText = computed(() => {
    if (trialSecondsLeft.value === null) return ''
    if (trialSecondsLeft.value <= 0) return '试用已过期'
    const total = trialSecondsLeft.value
    const days = Math.floor(total / 86400)
    const hours = Math.floor((total % 86400) / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const parts: string[] = []
    if (days > 0) parts.push(`${days}天`)
    if (hours > 0) parts.push(`${hours}小时`)
    if (days === 0 && minutes > 0) parts.push(`${minutes}分钟`)
    if (parts.length === 0) parts.push('不到1分钟')
    return `试用剩余 ${parts.join('')}`
})
const trialOverlayVisible = ref(false)
let trialReminderTimer: number | null = null

const createDialogVisible = ref(false)
const createClassName = ref('')
const editDialogVisible = ref(false)
const editClassName = ref('')
const editingClassId = ref<number | null>(null)

function openCreateDialog() {
    createDialogVisible.value = true
}

function openEditDialog() {
    if (!activeClassId.value) return
    const currentClass = classes.value.find(c => c.id === activeClassId.value)
    if (!currentClass) return
    editingClassId.value = currentClass.id ?? null
    editClassName.value = currentClass.name ?? ''
    editDialogVisible.value = true
}

async function confirmCreateClass() {
    const name = createClassName.value.trim()
    if (!name) {
        ElMessage.error('请输入班级名称')
        return
    }
    if (classes.value.some(c => c.name === name)) {
        ElMessage.error('班级名称已存在')
        return
    }
    try {
        const created = await classManager.create(name)
        createDialogVisible.value = false
        createClassName.value = ''
        ElMessage.success('已创建班级')
        await loadClassesFromApi()
        if (typeof created?.id === 'number') {
            activeClassId.value = created.id
        }
    } catch (e) {
        ElMessage.error('创建班级失败')
    }
}

function onCreateDialogClosed() {
    createClassName.value = ''
}

async function confirmEditClass() {
    const name = editClassName.value.trim()
    if (!name) {
        ElMessage.error('请输入班级名称')
        return
    }
    if (!editingClassId.value) return
    if (classes.value.some(c => c.name === name && c.id !== editingClassId.value)) {
        ElMessage.error('班级名称已存在')
        return
    }
    try {
        await classManager.update(editingClassId.value, name)
        editDialogVisible.value = false
        editClassName.value = ''
        editingClassId.value = null
        ElMessage.success('已修改班级名称')
        await loadClassesFromApi()
    } catch {
        ElMessage.error('修改班级失败')
    }
}

function onEditDialogClosed() {
    editClassName.value = ''
    editingClassId.value = null
}

async function removeCurrentClass() {
    if (!activeClassId.value) return
    const currentClass = classes.value.find(c => c.id === activeClassId.value)
    if (!currentClass) return
    try {
        await ElMessageBox.confirm(`确定删除班级「${currentClass.name}」吗？`, '删除确认', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        })
        await classManager.delete(activeClassId.value)
        ElMessage.success('已删除班级')
        await loadClassesFromApi()
    } catch (e) {
        // 用户取消
    }
}

const router = useRouter()
const route = useRoute()
const showFooter = computed(() => isAuthenticated.value && !route.meta?.hideFooter)

function onUserCommand(command: string) {
    if (command === 'logout') {
        cacheStore.logout()
        ElMessage.success('已退出登录')
        router.replace('/auth')
    }
}

watch(() => cacheStore.profile?.id, (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
        void loadClassesFromApi()
    }
}, { immediate: false })

function clearTrialReminder() {
    if (trialReminderTimer !== null) {
        window.clearTimeout(trialReminderTimer)
        trialReminderTimer = null
    }
}

function onTrialOverlayConfirm() {
    trialOverlayVisible.value = false
    clearTrialReminder()
    if (trialExpired.value) {
        trialReminderTimer = window.setTimeout(() => {
            trialOverlayVisible.value = true
            trialReminderTimer = null
        }, 10000)
    }
}

watch(trialExpired, (expired) => {
    if (expired) {
        if (!trialOverlayVisible.value && trialReminderTimer === null) {
            trialOverlayVisible.value = true
        }
    } else {
        trialOverlayVisible.value = false
        clearTrialReminder()
    }
}, { immediate: true })

const unlockDialogVisible = computed(() => cacheStore.isLocked)
const unlockPassword = ref('')
const unlocking = ref(false)

function lockNow() {
    if (!cacheStore.hasLockPassword()) {
        ElMessage.error('请先在设置中配置锁屏密码')
        return
    }
    cacheStore.lock()
}

async function confirmUnlock() {
    if (unlocking.value) return
    const pwd = unlockPassword.value.trim()
    if (!pwd) {
        ElMessage.error('请输入密码')
        return
    }
    unlocking.value = true
    try {
        const ok = await cacheStore.verifyLockPassword(pwd)
        if (ok) {
            cacheStore.unlock()
            unlockPassword.value = ''
            ElMessage.success('已解锁')
        } else {
            ElMessage.error('密码错误')
        }
    } finally {
        unlocking.value = false
    }
}

</script>

<template>
    <div class="main-container">
        <el-container>
            <el-header v-if="isAuthenticated" class="main-header">
                <div class="header-content">
                    <div class="header-left">
                        <img class="app-logo" src="/icon.svg" alt="教师助手图标" />
                        <div class="titles">
                            <div class="app-title">教师助手</div>
                            <div class="app-subtitle">Teacher Assistant</div>
                        </div>
                    </div>
                    <div class="header-center">
                        <div class="time">{{ timeString }}</div>
                        <div class="date">{{ dateString }}</div>
                    </div>
                    <div class="header-right">
                        <div v-if="isLoginExpired" class="expired-indicator">
                            <el-tooltip content="登录已过期，请重新登录以恢复功能" placement="bottom" effect="dark">
                                <el-tag type="danger" effect="dark" class="expired-tag">
                                    <i-ep-warning-filled class="indicator-icon" />
                                    <span class="indicator-text">登录已过期</span>
                                </el-tag>
                            </el-tooltip>
                        </div>
                        <div v-if="showTrialBadge" class="trial-indicator" :class="{ expired: trialExpired }">
                            <el-tag :type="trialExpired ? 'danger' : 'warning'" effect="dark">
                                <i-ep-clock class="indicator-icon" />
                                <span class="indicator-text">{{ trialBadgeText }}</span>
                            </el-tag>
                        </div>
                        <el-dropdown v-if="isAuthenticated" placement="bottom-end" @command="onUserCommand">
                            <span class="user-entry">
                                <div v-if="userAvatar" class="user-avatar">
                                    <img :src="userAvatar" alt="用户头像" />
                                </div>
                                <div v-else class="user-avatar initials">{{ userInitial }}</div>
                                <div class="user-info">
                                    <div class="user-name">{{ userName }}</div>
                                    <div v-if="userEmail" class="user-email">{{ userEmail }}</div>
                                </div>
                                <i-ep-arrow-down class="user-arrow" />
                            </span>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item command="logout">
                                        <i-ep-switch-button class="dropdown-icon" /> 退出登录
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                    </div>
                </div>
            </el-header>
            <el-container class="body-container">
                <el-aside v-if="showFooter" class="sidebar" width="180px">
                    <div class="sidebar-content">
                        <div class="sidebar-section">
                            <div class="section-title">功能菜单</div>
                            <div class="nav-list">
                                <ActionItem label="积分管理" to="/points">
                                    <template #icon>
                                        <i-ep-medal class="nav-icon" />
                                    </template>
                                </ActionItem>
                                <ActionItem label="学生管理" to="/students">
                                    <template #icon>
                                        <i-ep-user-filled class="nav-icon" />
                                    </template>
                                </ActionItem>
                                <ActionItem label="工具箱" to="/tools">
                                    <template #icon>
                                        <i-ep-magic-stick class="nav-icon" />
                                    </template>
                                </ActionItem>
                                <ActionItem label="设置" to="/settings">
                                    <template #icon>
                                        <i-ep-setting class="nav-icon" />
                                    </template>
                                </ActionItem>
                                <ActionItem label="意见反馈" to="/opinion">
                                    <template #icon>
                                        <i-ep-comment class="nav-icon" />
                                    </template>
                                </ActionItem>
                            </div>
                        </div>
                        <div class="sidebar-section class-section">
                            <div class="section-title">班级选择</div>
                            <el-select
                                v-model="classSelectId"
                                :disabled="!isClassReady || classesLoading || classOptions.length === 0"
                                :placeholder="(!isClassReady || classesLoading) ? '加载班级中…' : '选择班级'"
                                class="class-select"
                                size="large"
                            >
                                <el-option v-for="c in classOptions" :key="c.id" :label="c.name" :value="c.id" />
                            </el-select>
                            <div class="class-actions">
                                <el-button type="primary" size="default" @click="openCreateDialog">
                                    <i-ep-plus class="btn-icon" /><span>新建班级</span>
                                </el-button>
                                <el-button type="warning" plain size="default" :disabled="!activeClassId" @click="openEditDialog">
                                    <i-ep-edit class="btn-icon" /><span>编辑班级</span>
                                </el-button>
                                <el-button type="danger" plain size="default" :disabled="!activeClassId" @click="removeCurrentClass">
                                    <i-ep-delete class="btn-icon" /><span>删除班级</span>
                                </el-button>
                            </div>
                        </div>
                        <div class="sidebar-footer">
                            <el-button class="logout-btn" text :disabled="!cacheStore.hasLockPassword()" @click="lockNow">
                                <i-ep-lock class="logout-icon" /> 锁屏
                            </el-button>
                            <el-button class="logout-btn" text @click="onUserCommand('logout')">
                                <i-ep-switch-button class="logout-icon" /> 退出登录
                            </el-button>
                        </div>
                    </div>
                </el-aside>
                <el-main class="main">
                    <div class="content-area">
                        <router-view v-slot="{ Component, route }">
                            <keep-alive v-if="route.meta?.keepAlive">
                                <component :is="Component" :key="route.path" />
                            </keep-alive>
                            <component v-else :is="Component" :key="cacheStore.dataVersion" />
                        </router-view>
                    </div>
                </el-main>
            </el-container>
            <el-dialog v-model="createDialogVisible" title="新建班级" width="420px" @closed="onCreateDialogClosed">
                <el-form label-position="top">
                    <el-form-item label="班级名称">
                        <el-input v-model="createClassName" placeholder="例如：一年级三班" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="createDialogVisible = false">取 消</el-button>
                        <el-button type="primary" @click="confirmCreateClass">确 定</el-button>
                    </span>
                </template>
            </el-dialog>
            <el-dialog v-model="editDialogVisible" title="编辑班级" width="420px" @closed="onEditDialogClosed">
                <el-form label-position="top">
                    <el-form-item label="班级名称">
                        <el-input v-model="editClassName" placeholder="请输入新的班级名称" />
                    </el-form-item>
                </el-form>
                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="editDialogVisible = false">取 消</el-button>
                        <el-button type="primary" @click="confirmEditClass">确 定</el-button>
                    </span>
                </template>
            </el-dialog>
        </el-container>
        <div v-if="isAuthenticated && unlockDialogVisible" class="lock-overlay">
            <div class="lock-card">
                <div class="lock-title"><i-ep-lock class="lock-title-icon" /> 已锁定</div>
                <div class="lock-sub">请输入锁屏密码以继续使用</div>
                <el-input v-model="unlockPassword" class="lock-input" type="password" show-password size="large"
                    placeholder="输入密码" @keyup.enter="confirmUnlock" />
                <el-button type="primary" size="large" class="unlock-btn" :loading="unlocking" @click="confirmUnlock">
                    <i-ep-unlock class="btn-icon" /> 解 锁
                </el-button>
            </div>
        </div>
        <div v-if="isAuthenticated && trialOverlayVisible" class="trial-overlay">
            <div class="trial-card">
                <div class="trial-title">试用已结束</div>
                <div class="trial-sub">请购买正式版本</div>
                <div class="trial-countdown">{{ trialBadgeText }}</div>
                <el-button type="primary" size="large" class="trial-btn" @click="onTrialOverlayConfirm">
                    <i-ep-check class="btn-icon" /> 我知道了
                </el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.main-container {
    width: 100%;
    height: 100vh;
}

.main-container :deep(.el-container) {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.main-container :deep(.el-main) {
    display: block;
    flex: 1;
}

.main-header {
    height: 80px;
    background-color: #ffffff;
    border-bottom: 1px solid #eee;
    box-shadow: var(--shadow-light);
    display: flex;
    align-items: center;
    padding: 0 24px;
    position: relative;
}


.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 24px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.app-logo {
    width: 40px;
    height: 40px;
    border-radius: 8px;
}

.titles {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
}

.app-title {
    font-size: 24px;
    font-weight: 700;
    color: #111111;
}

.app-subtitle {
    font-size: 12px;
    color: #666666;
}

.header-center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    line-height: 1;
    text-align: center;
    pointer-events: none;
    z-index: 1;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 2;
}

.user-entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease;
    color: #1f1f1f;
}

.user-entry:hover {
    background-color: rgba(0, 0, 0, 0.04);
}

.user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    overflow: hidden;
    background: linear-gradient(135deg, #5b7bff 0%, #2d5cf6 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
}

.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-avatar.initials {
    letter-spacing: 1px;
}

.user-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.1;
}

.user-name {
    font-size: 14px;
    font-weight: 600;
    color: #1f1f1f;
}

.user-email {
    font-size: 12px;
    color: #909399;
}

.user-arrow {
    font-size: 16px;
    color: #a8abb2;
}

.dropdown-icon {
    margin-right: 6px;
}

.expired-indicator {
    cursor: help;
}

.expired-indicator :deep(.el-tag) {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 12px;
    line-height: 1;
    cursor: inherit;
}

.expired-indicator :deep(.el-tag__content) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.trial-indicator :deep(.el-tag) {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 12px;
    line-height: 1;
}

.trial-indicator :deep(.el-tag__content) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.trial-indicator.expired :deep(.el-tag) {
    background: linear-gradient(135deg, #f64a4a 0%, #f67a4a 100%);
    border-color: transparent;
}

.indicator-icon {
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.indicator-text {
    font-size: 13px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
}

.lock-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1999;
}

.lock-card {
    width: 92%;
    max-width: 420px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 22px 18px 18px;
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.lock-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 18px;
    font-weight: 700;
}

.lock-title-icon {
    font-size: 20px;
}

.lock-sub {
    margin-top: 6px;
    color: #606266;
    font-size: 13px;
}

.lock-input {
    margin-top: 14px;
}

.unlock-btn {
    margin-top: 12px;
}

.trial-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2100;
    padding: 16px;
}

.trial-card {
    width: 92%;
    max-width: 420px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.3);
    padding: 26px 20px 22px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
}

.trial-title {
    font-size: 20px;
    font-weight: 700;
    color: #111111;
}

.trial-sub {
    font-size: 14px;
    color: #606266;
}

.trial-btn {
    margin-top: 6px;
}

.time {
    font-size: 24px;
    font-weight: 600;
    color: #111111;
}

.date {
    margin-top: 4px;
    font-size: 12px;
    color: #666666;
}

.body-container {
    flex: 1;
    overflow: hidden;
    display: flex !important;
    flex-direction: row !important;
    height: calc(100vh - 80px);
}

.sidebar {
    background-color: #f5f7fa;
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    flex-shrink: 0;
}

.sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 20px 12px;
    gap: 24px;
    overflow-y: auto;
}

.sidebar-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.class-section {
    margin-top: 16px;
}

.section-title {
    font-size: 13px;
    font-weight: 600;
    color: #909399;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 0 4px;
}

.nav-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
}

.nav-icon {
    width: 20px;
    height: 20px;
}

:deep(.action-item) {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px;
    border-radius: 10px;
    background-color: transparent;
    color: #606266;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
    width: 100%;
}

:deep(.action-item:hover) {
    background-color: #e9ecf1;
}

:deep(.action-item.is-active) {
    background: linear-gradient(135deg, #2d5cf6 0%, #6a8bff 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(45, 92, 246, 0.25);
}

:deep(.action-corner) {
    display: none;
}

:deep(.action-icon-wrapper) {
    flex-shrink: 0;
}

:deep(.action-text) {
    font-size: 15px;
    font-weight: 500;
    margin: 0;
}

.class-select {
    width: 100%;
}

.class-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    align-items: center;
}

.class-actions :deep(.el-button) {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 0 !important;
}

.class-actions :deep(.el-button span) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.class-actions .btn-icon {
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    margin-left: 0 !important;
    margin-right: 0 !important;
}

.sidebar-footer {
    padding-top: 16px;
    border-top: 1px solid #e4e7ed;
}

.logout-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    padding: 10px 12px;
    color: #606266;
    font-size: 14px;
    transition: all 0.2s ease;
    margin-left: 0 !important;
    border-radius: 10px;
}

.logout-btn:hover {
    color: #f56c6c;
    background-color: #fef0f0;
}

.logout-icon {
    font-size: 16px;
}

.main {
    flex: 1 1 auto !important;
    /* overflow: hidden !important; */
    background-color: #f0f2f5 !important;
    padding: 20px !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
}

.content-area {
    width: 100%;
    height: 100%;
}

.content-area > * {
    height: 100%;
}


@media (max-width: 1100px) {
    .header-center {
        display: none;
    }
}

@media (max-width: 1024px) {
    .sidebar {
        width: 70px !important;
    }

    .sidebar-content {
        padding: 16px 8px;
        gap: 20px;
        align-items: center;
    }

    .section-title {
        display: none;
    }

    :deep(.action-item) {
        padding: 12px 0;
        justify-content: center;
        align-items: center;
        border-radius: 12px;
    }

    :deep(.action-text) {
        display: none;
    }

    .nav-icon {
        width: 24px;
        height: 24px;
    }

    .class-section {
        width: 100%;
    }

    .class-select {
        display: none;
    }

    .class-actions {
        gap: 12px;
    }

    .class-actions :deep(.el-button) {
        width: 46px;
        height: 46px;
        padding: 0;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .class-actions :deep(.el-button span) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .class-actions :deep(.el-button span span) {
        display: none;
    }

    .class-actions .btn-icon {
        font-size: 20px;
        margin: 0 !important;
    }

    .sync-actions {
        gap: 12px;
    }

    .sync-actions :deep(.el-button) {
        width: 46px;
        height: 46px;
        padding: 0;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .sync-actions :deep(.el-button span) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .sync-actions :deep(.el-button span span) {
        display: none;
    }

    .sync-actions .btn-icon {
        font-size: 20px;
        margin: 0 !important;
    }

    .sidebar-footer {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
    }

    .logout-btn {
        width: 46px;
        height: 46px;
        padding: 0;
        border-radius: 12px;
        font-size: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .logout-icon {
        font-size: 20px;
    }
}

@media (max-width: 768px) {
    .main-header {
        padding: 0 16px;
    }

    .main {
        padding: 16px !important;
    }

    .header-content {
        gap: 12px;
    }

    .header-right {
        justify-content: flex-end;
        gap: 8px;
    }

    .user-info {
        display: none;
    }

    .app-logo {
        width: 32px;
        height: 32px;
        border-radius: 6px;
    }

    .app-title {
        font-size: 16px;
    }

    .time {
        font-size: 22px;
    }

    .trial-indicator :deep(.el-tag) {
        padding: 4px 8px;
    }

    .trial-indicator :deep(.el-tag__content) {
        gap: 4px;
    }

    .indicator-icon {
        font-size: 14px;
    }

    .user-entry {
        padding: 4px 8px;
        gap: 8px;
    }

    .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        font-size: 14px;
    }

    .user-email {
        display: none;
    }

    .user-name {
        font-size: 13px;
    }

    .sidebar {
        width: 64px !important;
    }

    .sidebar-content {
        padding: 12px 6px;
        gap: 16px;
    }

    :deep(.action-item) {
        padding: 10px 0;
    }

    .nav-icon {
        width: 22px;
        height: 22px;
    }

    .class-actions :deep(.el-button) {
        width: 42px;
        height: 42px;
    }

    .class-actions .btn-icon {
        font-size: 18px;
    }

    .sync-actions :deep(.el-button) {
        width: 42px;
        height: 42px;
    }

    .sync-actions :deep(.el-button span span) {
        display: none;
    }

    .sync-actions .btn-icon {
        font-size: 18px;
    }

    .logout-btn {
        width: 42px;
        height: 42px;
        font-size: 0;
    }

    .logout-icon {
        font-size: 18px;
    }

    .sidebar-footer {
        align-items: center;
    }
}

@media (max-width: 432px) {
    .main-header {
        padding: 0 10px;
        height: 60px;
    }

    .main {
        padding: 12px !important;
    }

    .header-right {
        gap: 6px;
    }

    .indicator-text {
        display: none;
    }

    .trial-indicator :deep(.el-tag) {
        padding: 4px 6px;
    }

    .indicator-icon {
        font-size: 14px;
    }

    .user-entry {
        padding: 4px 6px;
    }

    .user-avatar {
        width: 28px;
        height: 28px;
        border-radius: 9px;
    }

    .sidebar {
        width: 58px !important;
    }

    .sidebar-content {
        padding: 10px 4px;
        gap: 12px;
    }

    :deep(.action-item) {
        padding: 8px 0;
    }

    .nav-icon {
        width: 20px;
        height: 20px;
    }

    .class-actions :deep(.el-button) {
        width: 38px;
        height: 38px;
    }

    .class-actions .btn-icon {
        font-size: 16px;
    }

    .logout-btn {
        width: 38px;
        height: 38px;
        font-size: 0;
    }

    .logout-icon {
        font-size: 16px;
    }

    .sidebar-footer {
        align-items: center;
    }

}

</style>
