<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { formatTimeHHmm, formatChineseDateWithWeek } from '@/utils/date'
import { ElMessage } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useSettingsStore } from '@/stores/settingsStore'

const now = ref(new Date())
let timer: number | undefined

onMounted(() => {
    timer = window.setInterval(() => {
        now.value = new Date()
    }, 1000)
    void settingsStore.hydrate()
})

onBeforeUnmount(() => {
    if (timer !== undefined) {
        window.clearInterval(timer)
    }
})

const timeString = computed(() => formatTimeHHmm(now.value))
const dateString = computed(() => formatChineseDateWithWeek(now.value))

const classStore = useClassStore()
const settingsStore = useSettingsStore()
const classes = computed(() => classStore.classes)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})

const createDialogVisible = ref(false)
const createClassName = ref('')

function openCreateDialog() {
    createDialogVisible.value = true
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

const router = useRouter()
const route = useRoute()
const showFooter = computed(() => !route.meta?.hideFooter)

function goSettings() {
    router.push('/settings')
}

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

</script>

<template>
    <div class="main-container">
        <el-container>
            <el-header class="main-header">
                <div class="header-content">
                    <div class="header-left">
                        <img class="app-logo" src="/icon.svg" alt="教师助手图标" />
                        <div class="titles">
                            <div class="app-title">教师助手</div>
                            <div class="app-subtitle">Teacher Assistant</div>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="right-row">
                            <el-button class="widget-btn" circle plain size="default" @click="goSettings">
                                <i-ep-setting />
                            </el-button>
                            <el-button class="widget-btn" circle plain size="default"
                                :disabled="!settingsStore.hasLockPassword()" @click="lockNow">
                                <i-ep-unlock v-if="!settingsStore.isLocked" />
                                <i-ep-lock v-else />
                            </el-button>
                            <div class="time-col">
                                <div class="time">{{ timeString }}</div>
                                <div class="date">{{ dateString }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </el-header>
            <el-main class="main">
                <div class="content-area">
                    <router-view :key="settingsStore.dataVersion" />
                </div>
            </el-main>
            <el-footer class="action-panel" v-if="showFooter">
                <div class="action-bar">
                    <div class="class-quick">
                        <el-select v-model="activeClassId" placeholder="选择班级" class="class-select" size="large">
                            <el-option v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
                        </el-select>
                        <el-button class="create-btn" type="primary" size="large" @click="openCreateDialog">
                            <i-ep-plus class="btn-icon" /> 新建班级
                        </el-button>
                    </div>
                    <div class="divider"></div>
                    <div class="action-list">
                        <ActionItem label="班级管理" to="/class">
                            <template #icon>
                                <i-ep-user-filled class="action-icon" />
                            </template>
                        </ActionItem>
                        <ActionItem label="积分管理" to="/points">
                            <template #icon>
                                <i-ep-medal class="action-icon" />
                            </template>
                        </ActionItem>
                        <ActionItem label="课堂工具" to="/tools">
                            <template #icon>
                                <i-ep-tools class="action-icon" />
                            </template>
                        </ActionItem>
                    </div>
                </div>
            </el-footer>
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
        </el-container>
        <div v-if="unlockDialogVisible" class="lock-overlay">
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

.main-header {
    height: 80px;
    background-color: #ffffff;
    border-bottom: 1px solid #eee;
    box-shadow: var(--shadow-light);
    display: flex;
    align-items: center;
    padding: 0 24px;
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
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

.header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1;
}

.right-row {
    display: flex;
    align-items: center;
    gap: 8px;
}



.time-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1;
}



:deep(.widget-btn.el-button) {
    border-color: transparent;
    background-color: transparent;
    box-shadow: none;
}

:deep(.widget-btn.el-button:hover),
:deep(.widget-btn.el-button:focus),
:deep(.widget-btn.el-button.is-active) {
    border-color: #dcdfe6;
    background-color: rgba(0, 0, 0, 0.02);
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

.main {
    flex: 1;
    overflow: auto;
}

.content-area {
    min-height: 0;
}

.action-panel {
    width: 100%;
    height: 108px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) 16px;
    background: transparent;
    border-top: none;
    box-shadow: none;
    display: flex;
    align-items: flex-end;
    position: sticky;
    bottom: 0;
    z-index: 10;
}

.action-bar {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: saturate(150%) blur(10px);
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 10px 12px;
    display: grid;
    grid-template-columns: auto 1px 1fr;
    align-items: center;
    gap: 12px;
}

.divider {
    height: 100%;
    border-left: 1px dashed #d9d9d9;
}

.class-quick {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    align-items: stretch;
}

.class-select {
    min-width: 160px;
}

.create-btn {
    width: 100%;
}

.action-list {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.action-icon {
    width: 28px;
    height: 28px;
}

:deep(.action-item) {
    background: #f9f9fb;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 12px 8px;
    border-radius: 12px;
}

:deep(.action-item.is-active) {
    background: linear-gradient(135deg, #2d5cf6 0%, #6a8bff 100%);
    color: #ffffff;
    box-shadow: 0 8px 24px rgba(45, 92, 246, 0.25);
}

:deep(.action-corner) {
    display: none;
}

:deep(.action-text) {
    margin-top: 6px;
    font-size: 14px;
    font-weight: 600;
}


@media (max-width: 768px) {
    .main-header {
        padding: 0 16px;
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

    .action-panel {
        height: 84px;
        padding: 8px 12px calc(10px + env(safe-area-inset-bottom)) 12px;
    }

    .action-bar {
        padding: 8px 10px;
        border-radius: 14px;
        grid-template-columns: 1fr;
        row-gap: 10px;
    }

    .action-list {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
    }

    .class-quick {
        grid-template-columns: 1fr;
    }

    .divider {
        display: none;
    }

    .action-icon {
        width: 24px;
        height: 24px;
    }

    :deep(.action-text) {
        font-size: 13px;
    }
}

@media (max-width: 432px) {
    .main-header {
        padding: 0 10px;
    }

    .main {
        padding: 0;
    }

    .action-panel {
        height: 76px;
        padding: 6px 8px calc(10px + env(safe-area-inset-bottom)) 8px;
    }

    .action-bar {
        max-width: 100%;
        border-radius: 12px;
        padding: 8px;
        grid-template-columns: 1fr;
        row-gap: 8px;
    }

    .action-list {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
    }

    .action-icon {
        width: 22px;
        height: 22px;
    }

    :deep(.action-text) {
        font-size: 12px;
    }
}
</style>
