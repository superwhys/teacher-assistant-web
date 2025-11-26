<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatTimeHHmm, formatChineseDateWithWeek } from '@/utils/date'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'
import { useStudentStore } from '@/stores/studentStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { useShopStore } from '@/stores/shopStore'
import { cloudApi } from '@/api/cloud'
import { importUserData } from '@/utils/storage'

const classStore = useClassStore()
const settingsStore = useSettingsStore()
const userStore = useUserStore()
const studentStore = useStudentStore()
const pointsStore = usePointsStore()
const pointsItemStore = usePointsItemStore()
const studentGroupStore = useStudentGroupStore()
const shopStore = useShopStore()

function clearAllStores() {
    classStore.clear()
    studentStore.clear()
    pointsStore.clear()
    pointsItemStore.clear()
    studentGroupStore.clear()
    shopStore.clear()
}

async function loadAllStores() {
    await Promise.all([
        classStore.hydrate(),
        studentStore.hydrate(),
        pointsStore.hydrate(),
        pointsItemStore.hydrate(),
        studentGroupStore.hydrate(),
        shopStore.hydrate(),
    ])
}

const now = ref(new Date())
let timer: number | undefined
let autoSyncTimer: number | undefined

onMounted(async () => {
    timer = window.setInterval(() => {
        now.value = new Date()
    }, 1000)
    await settingsStore.hydrate()
    if (userStore.profile?.id) {
        await loadAllStores()
    }
    // setup auto sync checker
    if (autoSyncTimer !== undefined) {
        window.clearInterval(autoSyncTimer)
        autoSyncTimer = undefined
    }
    autoSyncTimer = window.setInterval(() => {
        tryAutoSync()
    }, 60 * 1000)
})

onBeforeUnmount(() => {
    if (timer !== undefined) {
        window.clearInterval(timer)
    }
    if (autoSyncTimer !== undefined) {
        window.clearInterval(autoSyncTimer)
        autoSyncTimer = undefined
    }
    clearTrialReminder()
})

const timeString = computed(() => formatTimeHHmm(now.value))
const dateString = computed(() => formatChineseDateWithWeek(now.value))
const classes = computed(() => classStore.classes)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})
const isAuthenticated = computed(() => userStore.isAuthenticated)
const userName = computed(() => userStore.displayName || '已登录')
const userEmail = computed(() => userStore.profile?.email ?? '')
const userAvatar = computed(() => userStore.profile?.avatar ?? null)
const userInitial = computed(() => {
    const name = userName.value.trim()
    if (!name) return '用'
    return name.charAt(0).toUpperCase()
})
const trialSecondsLeft = computed(() => {
    if (!isAuthenticated.value || !userStore.isTrial || userStore.trialExpiresAt === null) return null
    return userStore.trialExpiresAt - Math.floor(now.value.getTime() / 1000)
})
const trialExpired = computed(() => trialSecondsLeft.value !== null && trialSecondsLeft.value <= 0)
const showTrialBadge = computed(() => isAuthenticated.value && userStore.isTrial)
const isLoginExpired = computed(() => userStore.isExpired)
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
const editingClassId = ref<string | null>(null)

function openCreateDialog() {
    createDialogVisible.value = true
}

function openEditDialog() {
    if (!activeClassId.value) return
    const currentClass = classes.value.find(c => c.id === activeClassId.value)
    if (!currentClass) return
    editingClassId.value = currentClass.id
    editClassName.value = currentClass.name
    editDialogVisible.value = true
}

function confirmCreateClass() {
    const name = createClassName.value.trim()
    if (!name) {
        ElMessage.error('请输入班级名称')
        return
    }
    if (classes.value.some(c => c.name === name)) {
        ElMessage.error('班级名称已存在')
        return
    }
    classStore.addClass(name)
    createDialogVisible.value = false
    createClassName.value = ''
    ElMessage.success('已创建班级')
}

function onCreateDialogClosed() {
    createClassName.value = ''
}

function confirmEditClass() {
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
    classStore.updateClassName(editingClassId.value, name)
    editDialogVisible.value = false
    editClassName.value = ''
    editingClassId.value = null
    ElMessage.success('已修改班级名称')
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
        classStore.removeClass(activeClassId.value)
        ElMessage.success('已删除班级')
    } catch (e) {
        // 用户取消
    }
}

const router = useRouter()
const route = useRoute()
const showFooter = computed(() => isAuthenticated.value && !route.meta?.hideFooter)

function onUserCommand(command: string) {
    if (command === 'logout') {
        clearAllStores()
        userStore.logout()
        ElMessage.success('已退出登录')
        router.replace('/auth')
    }
}

watch(() => userStore.profile?.id, (newUserId, oldUserId) => {
    if (newUserId && newUserId !== oldUserId) {
        void loadAllStores()
        void settingsStore.hydrate()
    }
}, { immediate: false })

function tryAutoSync() {
    if (!userStore.isAuthenticated) return
    if (userStore.isTrial) return
    if (!settingsStore.cloudAutoSyncEnabled) return
    const hours = settingsStore.cloudAutoSyncIntervalHours
    if (![0.5, 1, 3, 6, 12].includes(hours)) return
    const intervalMs = hours * 60 * 60 * 1000
    const last = settingsStore.lastAutoCloudSyncAt
    const nowTs = Date.now()
    if (last == null) {
        void settingsStore.syncToCloud('auto')
        return
    }
    if (nowTs - last >= intervalMs) {
        void settingsStore.syncToCloud('auto')
    }
}

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

const unlockDialogVisible = computed(() => settingsStore.isLocked)
const unlockPassword = ref('')
const unlocking = ref(false)

function lockNow() {
    if (!settingsStore.hasLockPassword()) {
        ElMessage.error('请先在设置中配置锁屏密码')
        return
    }
    settingsStore.lock()
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
        const ok = await settingsStore.verifyLockPassword(pwd)
        if (ok) {
            settingsStore.unlock()
            unlockPassword.value = ''
            ElMessage.success('已解锁')
        } else {
            ElMessage.error('密码错误')
        }
    } finally {
        unlocking.value = false
    }
}

const isSavingData = ref(false)
const updateDialogVisible = ref(false)
const loadingBackups = ref(false)
const latestManualTs = ref<number | null>(null)
const latestAutoTs = ref<number | null>(null)
const activeBackupTab = ref<'manual' | 'auto'>('manual')
const activeBackupTs = computed<number | null>(() => {
    return activeBackupTab.value === 'manual' ? latestManualTs.value : latestAutoTs.value
})
const activeBackupTitle = computed(() => {
    return activeBackupTab.value === 'manual' ? '最新手动备份' : '最新自动备份'
})
const activeBackupTypeText = computed(() => {
    return activeBackupTab.value === 'manual' ? '手动' : '自动'
})
const restoring = ref<{ ts: number | null; type: 'manual' | 'auto' | null }>({ ts: null, type: null })

async function onSaveDataToCloud() {
    if (userStore.isTrial) {
        ElMessage.warning('试用版不支持云端同步')
        return
    }
    try {
        await ElMessageBox.confirm('保存数据会将当前数据同步到云端，是否继续？', '保存数据', {
            type: 'info',
            confirmButtonText: '保存',
            cancelButtonText: '取消',
        })
    } catch {
        return
    }
    if (isSavingData.value) return
    isSavingData.value = true
    try {
        await settingsStore.syncToCloud('manual')
        ElMessage.success('数据已保存到云端')
    } catch (err) {
        ElMessage.error('保存失败：' + (err as Error).message)
    } finally {
        isSavingData.value = false
    }
}

function onOpenUpdateDialog() {
    if (userStore.isTrial) {
        ElMessage.warning('试用版不支持云端同步')
        return
    }
    updateDialogVisible.value = true
    latestManualTs.value = null
    latestAutoTs.value = null
    activeBackupTab.value = 'manual'
    loadingBackups.value = true
    void loadBackupsList()
}

async function loadBackupsList() {
    try {
        const res = await cloudApi.getBackups()
        const raw: any = res.data as any
        const listManual: number[] = Array.isArray(raw?.manual) ? (raw.manual as number[]) : []
        const listAuto: number[] = Array.isArray(raw?.auto) ? (raw.auto as number[]) : []
        const sortedManual = listManual
            .map((n: number) => Number(n))
            .filter((n: number) => Number.isFinite(n) && n > 0)
            .sort((a: number, b: number) => b - a)
        const sortedAuto = listAuto
            .map((n: number) => Number(n))
            .filter((n: number) => Number.isFinite(n) && n > 0)
            .sort((a: number, b: number) => b - a)
        latestManualTs.value = sortedManual[0] ?? null
        latestAutoTs.value = sortedAuto[0] ?? null
        if (!latestManualTs.value && latestAutoTs.value) {
            activeBackupTab.value = 'auto'
        } else if (latestManualTs.value) {
            activeBackupTab.value = 'manual'
        }
        if (latestManualTs.value === null && latestAutoTs.value === null) {
            ElMessage.warning('云端暂无备份数据')
            updateDialogVisible.value = false
        }
    } catch (err) {
        ElMessage.error('获取备份列表失败：' + (err as Error).message)
        updateDialogVisible.value = false
    } finally {
        loadingBackups.value = false
    }
}

function onSwitchBackupTab(type: 'manual' | 'auto') {
    if (activeBackupTab.value === type) return
    if (type === 'manual' && !latestManualTs.value) return
    if (type === 'auto' && !latestAutoTs.value) return
    activeBackupTab.value = type
}

function formatBackupTime(ts: number): string {
    try {
        return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    } catch {
        return String(ts)
    }
}

async function onRestoreFromBackup(ts: number, type: 'manual' | 'auto') {
    if (restoring.value.ts !== null) return
    restoring.value = { ts, type }
    try {
        const res = await cloudApi.getBackup(ts, type)
        const payload = res?.data || {}
        const userId = userStore.profile?.id || null
        await importUserData(payload, userId)
        await Promise.all([
            classStore.hydrate(),
            studentStore.hydrate(),
            pointsStore.hydrate(),
            pointsItemStore.hydrate(),
            studentGroupStore.hydrate(),
            shopStore.hydrate(),
        ])
        settingsStore.bumpVersion()
        updateDialogVisible.value = false
        ElMessage.success('已从云端恢复数据')
    } catch (err) {
        ElMessage.error('恢复失败：' + (err as Error).message)
    } finally {
        restoring.value = { ts: null, type: null }
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
                            <el-tooltip content="登录已过期，请重新登录以恢复云端功能" placement="bottom" effect="dark">
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
                        <div class="sidebar-section sync-section">
                            <div class="section-title">数据同步</div>
                            <div class="sync-actions">
                                <el-button type="success" size="default" :loading="isSavingData" :disabled="isSavingData" @click="onSaveDataToCloud">
                                    <i-ep-upload-filled class="btn-icon" /><span>保存数据</span>
                                </el-button>
                                <el-button type="primary" plain size="default" @click="onOpenUpdateDialog">
                                    <i-ep-download class="btn-icon" /><span>更新数据</span>
                                </el-button>
                            </div>
                        </div>
                        <div class="sidebar-section class-section">
                            <div class="section-title">班级选择</div>
                            <el-select v-model="activeClassId" placeholder="选择班级" class="class-select" size="large">
                                <el-option v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
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
                            <el-button class="logout-btn" text :disabled="!settingsStore.hasLockPassword()" @click="lockNow">
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
                            <component v-else :is="Component" :key="settingsStore.dataVersion" />
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
            <el-dialog v-model="updateDialogVisible" width="560px" :close-on-click-modal="true">
                <template #header>
                    <div class="update-dlg-header">
                        <div class="title">更新数据</div>
                        <div class="subtitle">该操作会将云端最新的数据应用到本地</div>
                    </div>
                </template>
                <div v-loading="loadingBackups" element-loading-text="正在获取云端备份数据..." class="update-content">
                    <div v-if="!loadingBackups" class="update-content-inner">
                        <div v-if="!latestManualTs && !latestAutoTs" class="latest-backup-card">
                            <el-empty description="暂无云端备份" />
                        </div>
                        <div v-else class="latest-panel">
                            <div class="backup-tab-bar">
                                <el-button size="large" :type="activeBackupTab === 'manual' ? 'primary' : 'default'" :plain="activeBackupTab !== 'manual'" :disabled="!latestManualTs" @click="onSwitchBackupTab('manual')">
                                    手动备份
                                </el-button>
                                <el-button size="large" :type="activeBackupTab === 'auto' ? 'primary' : 'default'" :plain="activeBackupTab !== 'auto'" :disabled="!latestAutoTs" @click="onSwitchBackupTab('auto')">
                                    自动备份
                                </el-button>
                            </div>
                            <div v-if="activeBackupTs" class="latest-backup-card single">
                                <div class="latest-icon-wrapper">
                                    <i-ep-cloudy class="cloud-icon" />
                                </div>
                                <div class="latest-info">
                                    <div class="latest-title">{{ activeBackupTitle }}</div>
                                    <div class="latest-time">{{ formatBackupTime(activeBackupTs!) }}</div>
                                    <div class="latest-desc">应用此{{ activeBackupTypeText }}备份会覆盖当前本地数据。</div>
                                </div>
                                <div class="latest-actions">
                                    <el-button type="primary" size="large" :loading="restoring.ts === activeBackupTs && restoring.type === activeBackupTab" :disabled="!!restoring.type" @click="onRestoreFromBackup(activeBackupTs!, activeBackupTab)">
                                        <i-ep-refresh-left class="btn-icon" /> 应用此备份
                                    </el-button>
                                </div>
                            </div>
                            <div v-else class="latest-empty-tip">
                                <el-empty :description="`暂无${activeBackupTypeText}备份`" />
                            </div>
                        </div>
                    </div>
                </div>
                <template #footer>
                    <div class="update-dlg-footer">
                        <el-button size="large" @click="updateDialogVisible = false">取消</el-button>
                    </div>
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

.sync-section {
    margin-top: auto;
}

.sync-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
    align-items: center;
}

.sync-actions :deep(.el-button) {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 0 !important;
}

.sync-actions :deep(.el-button span) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

.sync-actions .btn-icon {
    font-size: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    margin-left: 0 !important;
    margin-right: 0 !important;
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

    .sync-actions :deep(.el-button) {
        width: 38px;
        height: 38px;
    }

    .sync-actions .btn-icon {
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

    .sync-actions :deep(.el-button span) {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .sync-actions :deep(.el-button span span) {
        display: none;
    }
}

.update-dlg-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.update-dlg-header .title {
    font-size: 18px;
    font-weight: 700;
}

.update-dlg-header .subtitle {
    color: #909399;
    font-size: 12px;
}

.update-content {
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.update-content-inner {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.latest-backup-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 32px 24px;
    gap: 20px;
    width: 100%;
}

.latest-icon-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
}

.cloud-icon {
    font-size: 40px;
}

.latest-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.latest-title {
    font-size: 20px;
    font-weight: 700;
    color: #303133;
}

.latest-time {
    font-size: 16px;
    color: #409eff;
    font-weight: 600;
}

.latest-desc {
    font-size: 14px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.6;
}

.latest-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
}

.latest-actions :deep(.el-button) {
    min-width: 140px;
}

.latest-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
}

.backup-tab-bar {
    display: flex;
    gap: 12px;
}

.backup-tab-bar :deep(.el-button) {
    min-width: 140px;
}

.latest-backup-card.single {
    max-width: 360px;
}

.latest-empty-tip {
    width: 100%;
    display: flex;
    justify-content: center;
}

.update-dlg-footer {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
