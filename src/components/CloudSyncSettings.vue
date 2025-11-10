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
const cloudAutoIntervalHours = computed({
    get: () => settingsStore.cloudAutoSyncIntervalHours,
    set: (val: number) => {
        settingsStore.setCloudAutoSyncIntervalHours(val)
        ElMessage.success(`自动同步间隔已更新为：每 ${val} 小时`)
    },
})

function formatLastSync(ts: number | null): string {
    if (!ts) return '从未同步'
    try {
        return new Date(ts).toLocaleString('zh-CN', { hour12: false })
    } catch {
        return '时间不可用'
    }
}

async function onBackupNow() {
    await settingsStore.syncToCloud('manual')
    await loadBackupHistory()
    lastSyncAtLocal.value = computeLatestFromLists()
    ElMessage.success('已同步到云端')
}

const historyVisible = ref<boolean>(false)
const backupsManual = ref<number[]>([])
const backupsAuto = ref<number[]>([])
const restoring = ref<{ ts: number | null; type: 'manual' | 'auto' | null }>({ ts: null, type: null })

async function openHistoryDialog() {
    await loadBackupHistory()
    historyVisible.value = true
}

function computeLatestFromLists(): number | null {
    const latestManual = backupsManual.value[0] ?? null
    const latestAuto = backupsAuto.value[0] ?? null
    if (latestManual === null && latestAuto === null) return null
    if (latestManual !== null && latestAuto === null) return latestManual
    if (latestManual === null && latestAuto !== null) return latestAuto
    return Math.max(latestManual as number, latestAuto as number)
}

async function loadBackupHistory() {
    try {
        const res = await cloudApi.getBackups()
        const raw: any = res.data as any
        const m: number[] = Array.isArray(raw?.manual) ? (raw.manual as number[]) : []
        const a: number[] = Array.isArray(raw?.auto) ? (raw.auto as number[]) : []
        backupsManual.value = m
            .map((n: number) => Number(n))
            .filter((n: number) => Number.isFinite(n) && n > 0)
            .sort((x: number, y: number) => y - x)
            .slice(0, 3)
        backupsAuto.value = a
            .map((n: number) => Number(n))
            .filter((n: number) => Number.isFinite(n) && n > 0)
            .sort((x: number, y: number) => y - x)
            .slice(0, 3)
        lastSyncAtLocal.value = computeLatestFromLists()
    } catch {
        backupsManual.value = []
        backupsAuto.value = []
        lastSyncAtLocal.value = null
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

async function restoreWith(ts: number, type: 'manual' | 'auto') {
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
        ElMessage.success('已从该节点恢复')
    } catch {
        ElMessage.error('恢复失败')
    } finally {
        restoring.value = { ts: null, type: null }
    }
}

async function onRestoreManual(ts: number) {
    await restoreWith(ts, 'manual')
}

async function onRestoreAuto(ts: number) {
    await restoreWith(ts, 'auto')
}

onMounted(async () => {
    await loadBackupHistory()
    lastSyncAtLocal.value = computeLatestFromLists()
})
</script>

<template>
    <BaseCard title="同步设置" shadow="never">
        <el-form label-position="top" class="settings-form">
            <el-form-item label="自动同步到云端">
                <div class="auto-sync-row">
                    <el-switch v-model="cloudAutoSyncEnabled" />
                    <el-select v-model="cloudAutoIntervalHours" :disabled="!cloudAutoSyncEnabled" placeholder="选择同步间隔"
                        style="width: 180px;">
                        <el-option :value="0.5" label="每 30 分钟" />
                        <el-option :value="1" label="每 1 小时" />
                        <el-option :value="3" label="每 3 小时" />
                        <el-option :value="6" label="每 6 小时" />
                        <el-option :value="12" label="每 12 小时" />
                    </el-select>
                </div>
                <div class="auto-sync-tips">开启后会在所选时间间隔自动同步。</div>
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
                <div class="subtitle">我们至多为您保留 3 个手动同步节点和 3 个自动同步节点</div>
            </div>
        </template>
        <div class="hist-layout">
            <div class="illustration">
                <img src="/icon.svg" alt="sync" />
            </div>
            <div class="timeline-wrap">
                <div class="section-title">手动同步</div>
                <el-empty v-if="backupsManual.length === 0" description="暂无手动同步记录" />
                <div v-else class="timeline-scroll">
                    <el-timeline>
                        <el-timeline-item v-for="(ts, idx) in backupsManual" :key="`m-${ts}`"
                            :timestamp="formatTime(ts)" placement="top" :type="idx === 0 ? 'primary' : 'info'"
                            :hollow="idx !== 0">
                            <div class="tl-row">
                                <div class="tl-left">
                                    <i-ep-cloudy class="tl-icon" />
                                    <span class="tl-label">手动同步节点</span>
                                </div>
                                <div class="tl-actions">
                                    <el-button type="primary" link
                                        :loading="restoring.ts === ts && restoring.type === 'manual'"
                                        :disabled="!!restoring.type" @click="onRestoreManual(ts)">
                                        <i-ep-refresh-left class="btn-icon" /> 从此节点恢复
                                    </el-button>
                                </div>
                            </div>
                        </el-timeline-item>
                    </el-timeline>
                </div>
                <div class="section-title" style="margin-top: 16px;">自动同步</div>
                <el-empty v-if="backupsAuto.length === 0" description="暂无自动同步记录" />
                <div v-else class="timeline-scroll">
                    <el-timeline>
                        <el-timeline-item v-for="(ts, idx) in backupsAuto" :key="`a-${ts}`" :timestamp="formatTime(ts)"
                            placement="top" :type="idx === 0 ? 'primary' : 'info'" :hollow="idx !== 0">
                            <div class="tl-row">
                                <div class="tl-left">
                                    <i-ep-cloudy class="tl-icon" />
                                    <span class="tl-label">自动同步节点</span>
                                </div>
                                <div class="tl-actions">
                                    <el-button type="primary" link
                                        :loading="restoring.ts === ts && restoring.type === 'auto'"
                                        :disabled="!!restoring.type" @click="onRestoreAuto(ts)">
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

.ml8 {
    margin-left: 8px;
}

.dlg-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.dlg-header .title {
    font-size: 18px;
    font-weight: 700;
}

.dlg-header .subtitle {
    color: #909399;
    font-size: 12px;
}

.dlg-header .actions {
    margin-top: 6px;
}

.hist-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 24px;
    align-items: start;
}

.illustration {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border: 1px solid #eef2f5;
    border-radius: 12px;
    padding: 12px;
}

.illustration img {
    width: 180px;
    height: 180px;
    object-fit: contain;
}

.timeline-wrap {
    min-height: 220px;
    padding-left: 12px;
}

.section-title {
    font-weight: 700;
    margin-bottom: 8px;
}

.timeline-scroll {
    max-height: 360px;
    overflow: auto;
    padding-right: 4px;
    padding-left: 8px;
}

.tl-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.tl-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #606266;
}

.tl-icon {
    font-size: 16px;
}

.tips {
    margin-left: 12px;
    color: #9e9e9e;
    font-size: 12px;
}

.auto-sync-row {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.auto-sync-tips {
    width: 100%;
    margin-top: 6px;
    color: #9e9e9e;
    font-size: 12px;
}

@media (max-width: 720px) {
    .hist-layout {
        grid-template-columns: 1fr;
    }

    .illustration {
        display: none;
    }
}
</style>
