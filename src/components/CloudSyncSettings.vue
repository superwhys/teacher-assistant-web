<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { ElMessage } from 'element-plus'
import { cloudApi } from '@/api/cloud'
import { importUserData } from '@/utils/storage'
import { useClassStore } from '@/stores/classStore'
import { useUserStore } from '@/stores/userStore'
import { useStudentStore } from '@/stores/studentStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { useShopStore } from '@/stores/shopStore'

/**
 * 云同步设置卡片
 */
const settingsStore = useSettingsStore()

const cloudAutoSyncEnabled = computed({
    get: () => settingsStore.cloudAutoSyncEnabled,
    set: (val: boolean) => settingsStore.setCloudAutoSyncEnabled(val),
})

const isCloudSyncing = computed(() => settingsStore.isCloudSyncing)
const lastCloudSyncAt = computed(() => settingsStore.lastCloudSyncAt)
const lastSyncAtLocal = ref<number | null>(null)
const lastSyncTsDisplay = computed(() => lastSyncAtLocal.value ?? lastCloudSyncAt.value ?? null)

function formatLastSync(ts: number | null): string {
    if (!ts) return '从未同步'
    try {
        return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    } catch {
        return '时间不可用'
    }
}

async function onBackupNow() {
    await settingsStore.syncToCloud()
    await loadBackupHistory()
    lastSyncAtLocal.value = backups.value[0] ?? null
    ElMessage.success('已同步到云端')
}

const historyVisible = ref<boolean>(false)
const backups = ref<number[]>([])
const restoringTs = ref<number | null>(null)

async function openHistoryDialog() {
    await loadBackupHistory()
    historyVisible.value = true
}

async function loadBackupHistory() {
    try {
        const res = await cloudApi.getBackups()
        const list = Array.isArray(res.data) ? res.data : []
        backups.value = list
            .map((n) => Number(n))
            .filter((n) => Number.isFinite(n) && n > 0)
            .sort((a, b) => b - a)
    } catch {
        backups.value = []
    }
}

function formatTime(ts: number): string {
    try {
        return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    } catch {
        return String(ts)
    }
}

const userStore = useUserStore()
const classStore = useClassStore()
const studentStore = useStudentStore()
const pointsStore = usePointsStore()
const pointsItemStore = usePointsItemStore()
const studentGroupStore = useStudentGroupStore()
const shopStore = useShopStore()

async function onRestore(ts: number) {
    if (restoringTs.value) return
    restoringTs.value = ts
    try {
        const res = await cloudApi.getBackup(ts)
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
        ElMessage.success('已从该节点恢复')
    } catch {
        ElMessage.error('恢复失败')
    } finally {
        restoringTs.value = null
    }
}

onMounted(async () => {
    await loadBackupHistory()
    lastSyncAtLocal.value = backups.value[0] ?? null
})
</script>

<template>
    <BaseCard title="同步设置" shadow="never">
        <el-form label-position="top" class="settings-form">
            <el-form-item label="自动同步到云端">
                <el-switch v-model="cloudAutoSyncEnabled" disabled />
                <div class="tips">自动同步功能正在开发中</div>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" :loading="isCloudSyncing" :disabled="isCloudSyncing" @click="onBackupNow">
                    <i-ep-upload class="btn-icon" /> 立即同步
                </el-button>
                <el-button class="ml8" @click="openHistoryDialog">
                    <i-ep-clock class="btn-icon" /> 历史同步列表
                </el-button>
            </el-form-item>
            <div class="last-sync">上次同步：{{ formatLastSync(lastSyncTsDisplay) }}</div>
        </el-form>
    </BaseCard>

    <el-dialog v-model="historyVisible" width="720px" :close-on-click-modal="true">
        <template #header>
            <div class="dlg-header">
                <div class="title">历史同步节点列表</div>
                <div class="subtitle">我们至多为您保留6个同步节点</div>
            </div>
        </template>
        <div class="hist-layout">
            <div class="illustration">
                <img src="/icon.svg" alt="sync" />
            </div>
            <div class="timeline-wrap">
                <div class="section-title">历史同步</div>
                <el-empty v-if="backups.length === 0" description="暂无历史同步" />
                <div v-else class="timeline-scroll">
                    <el-timeline>
                        <el-timeline-item
                            v-for="(ts, idx) in backups"
                            :key="ts"
                            :timestamp="formatTime(ts)"
                            placement="top"
                            :type="idx === 0 ? 'primary' : 'info'"
                            :hollow="idx !== 0"
                        >
                            <div class="tl-row">
                                <div class="tl-left">
                                    <i-ep-cloudy class="tl-icon" />
                                    <span class="tl-label">同步节点</span>
                                </div>
                                <div class="tl-actions">
                                    <el-button type="primary" link :loading="restoringTs === ts" :disabled="!!restoringTs" @click="onRestore(ts)">
                                        <i-ep-refresh-left class="btn-icon" /> 从此节点恢复
                                    </el-button>
                                </div>
                            </div>
                        </el-timeline-item>
                    </el-timeline>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.settings-form :deep(.el-form-item) {
    margin-bottom: 14px;
}

.last-sync {
    color: #9e9e9e;
    font-size: 12px;
}

.ml8 { margin-left: 8px; }

.dlg-header { display: flex; flex-direction: column; gap: 4px; }
.dlg-header .title { font-size: 18px; font-weight: 700; }
.dlg-header .subtitle { color: #909399; font-size: 12px; }
.dlg-header .actions { margin-top: 6px; }

.hist-layout { display: grid; grid-template-columns: 240px 1fr; gap: 24px; align-items: start; }
.illustration { display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #eef2f5; border-radius: 12px; padding: 12px; }
.illustration img { width: 180px; height: 180px; object-fit: contain; }
.timeline-wrap { min-height: 220px; padding-left: 12px; }
.section-title { font-weight: 700; margin-bottom: 8px; }
.timeline-scroll { max-height: 360px; overflow: auto; padding-right: 4px; padding-left: 8px; }
.tl-row { display: flex; align-items: center; justify-content: space-between; }
.tl-left { display: flex; align-items: center; gap: 8px; color: #606266; }
.tl-icon { font-size: 16px; }

.tips { margin-left: 12px; color: #9e9e9e; font-size: 12px; }

@media (max-width: 720px) {
    .hist-layout { grid-template-columns: 1fr; }
    .illustration { display: none; }
}
</style>


