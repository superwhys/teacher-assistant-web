<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { formatChineseDateTime } from '@/utils/date'

import { useCacheStore } from '@/stores/cacheStore'
import { pointsManager } from '@/managers/points'

import type { ListApplyRecordsQuery, Record as PointsApplyRecord } from '@/types/points'

defineOptions({
    name: 'PointsHistoryView'
})

const route = useRoute()
const cacheStore = useCacheStore()

const records = ref<PointsApplyRecord[]>([])

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())
const activeClassName = computed<string>(() => cacheStore.getActiveClassName() ?? '')

const historyKeyword = ref('')
const historySign = ref<'all' | 'plus' | 'minus'>('all')

const pageSize = ref(10)
const currentPage = ref(1)
const total = ref(0)
const loading = ref(false)
const minLoadingMs = 200
let fetchSeq = 0

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

function inferDelta(rec: PointsApplyRecord): number {
    const amount = toNumber(rec.amount, 0)
    if (amount !== 0 && amount !== Math.abs(amount)) return amount
    // 后端已返回 type（加分/扣分）时优先使用，否则兜底按 amount 正负
    const t = toNumber((rec as any)?.type, 0)
    if (t === 2) return -Math.abs(amount)
    if (t === 1) return Math.abs(amount)
    return amount
}

function getRecordTs(r: PointsApplyRecord): number {
    const raw = (r as any)?.created_at ?? (r as any)?.createdAt ?? (r as any)?.at ?? (r as any)?.time ?? (r as any)?.timestamp
    if (!raw) return 0
    if (typeof raw === 'number') return raw
    const t = Date.parse(String(raw))
    return Number.isFinite(t) ? t : 0
}

function getRecordSourceLabel(r: PointsApplyRecord): string {
    const from = toNumber((r as any)?.from, 0)
    if (from === 1) return '商城'
    if (from === 2) return '积分规则'
    return '-'
}

function isMallRecord(r: PointsApplyRecord): boolean {
    return toNumber((r as any)?.from, 0) === 1
}

const historyPageDesc = computed(() => {
    const list = [...(records.value ?? [])]
    list.sort((a, b) => {
        const at = getRecordTs(a) || toNumber(a.id, 0)
        const bt = getRecordTs(b) || toNumber(b.id, 0)
        return bt - at
    })
    return list
})

let suppressKeywordFetch = false
watch(() => route.query.q, (q) => {
    suppressKeywordFetch = true
    historyKeyword.value = typeof q === 'string' ? q : ''
    window.setTimeout(() => {
        suppressKeywordFetch = false
    }, 0)
    resetToFirstPageAndFetch(true)
}, { immediate: true })

function clearHistory() {
    ElMessage.info('后端暂不支持清空积分记录')
}

async function undoAction(actionId: number) {
    if (!activeClassId.value) return
    const target = records.value.find(item => item.id === actionId)
    if (target && isMallRecord(target)) {
        ElMessage.warning('商城记录不支持撤回')
        return
    }
    try {
        await ElMessageBox.confirm('确定撤回该条积分记录吗？', '撤回确认', { type: 'warning' })
        await pointsManager.undoApply(actionId)
        ElMessage.success('已撤回')
        await fetchRecords()
    } catch (err) {
        if (err) ElMessage.error('撤回失败')
    }
}

function buildRecordsQuery(): ListApplyRecordsQuery {
    const clsId = toNumber(activeClassId.value, 0)
    const kw = historyKeyword.value.trim()
    const sign = historySign.value

    const query: ListApplyRecordsQuery = {
        class_id: clsId || undefined,
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
    }

    if (kw) {
        query.name = kw
    }

    if (sign === 'plus') {
        query.type = 1
    } else if (sign === 'minus') {
        query.type = 2
    }

    return query
}

async function fetchRecords() {
    if (!activeClassId.value) {
        records.value = []
        total.value = 0
        return
    }

    const seq = ++fetchSeq
    const startedAt = Date.now()
    loading.value = true
    try {
        const resp = await pointsManager.listApplyRecords(buildRecordsQuery())
        if (seq !== fetchSeq) return
        records.value = resp.items ?? []
        total.value = toNumber(resp.total, 0)

        if (records.value.length === 0 && total.value > 0 && currentPage.value > 1) {
            const last = Math.max(1, Math.ceil(total.value / pageSize.value))
            if (last !== currentPage.value) {
                currentPage.value = last
                await fetchRecords()
            }
        }
    } catch (err) {
        console.error(err)
    } finally {
        if (seq !== fetchSeq) return
        const elapsed = Date.now() - startedAt
        const remain = minLoadingMs - elapsed
        if (remain > 0) {
            await new Promise<void>(resolve => window.setTimeout(resolve, remain))
        }
        if (seq === fetchSeq) loading.value = false
    }
}

function resetToFirstPageAndFetch(immediate = true) {
    currentPage.value = 1
    if (immediate) fetchRecords()
}

let keywordTimer: number | null = null
watch(historyKeyword, () => {
    if (suppressKeywordFetch) return
    if (keywordTimer) window.clearTimeout(keywordTimer)
    keywordTimer = window.setTimeout(() => {
        resetToFirstPageAndFetch(true)
    }, 350)
})

watch([historySign], () => {
    if (keywordTimer) {
        window.clearTimeout(keywordTimer)
        keywordTimer = null
    }
    resetToFirstPageAndFetch(true)
})

watch(activeClassId, async () => {
    currentPage.value = 1
    total.value = 0
    records.value = []
    await fetchRecords()
})

function onPageChange(page: number) {
    currentPage.value = page
    fetchRecords()
}

</script>

<template>
    <div class="points-history-page">
        <div class="header-row">
            <div class="title">
                积分记录
                <span v-if="activeClassId && activeClassName">（{{ activeClassName }}）</span>
            </div>
            <div class="header-actions">
                <el-button type="default" plain :disabled="!activeClassId" @click="$router.push('/points')">
                    <i-ep-arrow-left /> 返回积分管理
                </el-button>
            </div>
        </div>

        <div class="grid">
            <el-card shadow="never" class="right-card">
                <template #header>
                    <div class="list-header-row">
                        <div class="list-header">记录列表</div>
                        <div class="row-actions">
                            <el-select v-model="historySign" placeholder="全部类型" class="history-sign-filter" :disabled="!activeClassId">
                                <el-option label="全部" value="all" />
                                <el-option label="加分" value="plus" />
                                <el-option label="扣分" value="minus" />
                            </el-select>
                            <el-input
                                v-model="historyKeyword"
                                class="search-input"
                                placeholder="按学生姓名搜索"
                                clearable
                            >
                                <template #prefix>
                                    <i-ep-search />
                                </template>
                            </el-input>
                            <el-button type="danger" plain :disabled="true" @click="clearHistory">
                                <i-ep-delete /> 清空记录
                            </el-button>
                        </div>
                    </div>
                </template>

                <div v-if="activeClassId">
                    <div
                        class="table-block"
                        v-loading="loading"
                        element-loading-text="加载中..."
                        element-loading-background="rgba(255, 255, 255, 0.65)"
                    >
                        <el-table v-if="records.length > 0" :data="historyPageDesc" border size="large" height="60vh">
                            <el-table-column type="index" label="#" width="60" />
                            <el-table-column label="时间" width="180" align="center">
                                <template #default="{ row }">
                                    <span v-if="getRecordTs(row)">{{ formatChineseDateTime(new Date(getRecordTs(row))) }}</span>
                                    <span v-else>-</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="积分项" min-width="220">
                                <template #default="{ row }">
                                    <span>{{ row.rule_desc || '未知' }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="来源" width="110" align="center">
                                <template #default="{ row }">
                                    <span>{{ getRecordSourceLabel(row) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="学生" min-width="260">
                                <template #default="{ row }">
                                    {{ row.student_name || row.student_id || '-' }}
                                </template>
                            </el-table-column>
                            <el-table-column label="分值" width="120" align="center">
                                <template #default="{ row }">
                                    <span :class="['badge', inferDelta(row) > 0 ? 'plus' : 'minus']">
                                        {{ inferDelta(row) > 0 ? '+' : '-' }}{{ Math.abs(inferDelta(row)) }}
                                    </span>
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="120" align="center">
                                <template #default="{ row }">
                                    <el-tooltip content="商城记录请前往商城管理页面撤回" :disabled="!isMallRecord(row)">
                                        <span>
                                            <el-button type="warning" link :disabled="isMallRecord(row)" @click="undoAction(row.id)">撤回</el-button>
                                        </span>
                                    </el-tooltip>
                                </template>
                            </el-table-column>
                        </el-table>
                        <div v-else-if="!loading" class="empty empty-students">
                            <i-ep-document-remove class="empty-icon" />
                            <div class="empty-title">暂无积分记录</div>
                            <div class="empty-sub">去给学生加分/扣分后会在此显示</div>
                        </div>
                        <div v-else class="loading-placeholder"></div>

                        <div v-if="total > 0" class="pager-row">
                            <el-pagination
                                background
                                :disabled="loading"
                                :current-page="currentPage"
                                :page-size="pageSize"
                                layout="total, prev, pager, next"
                                :total="total"
                                @current-change="onPageChange"
                            />
                        </div>
                    </div>
                </div>
                <div v-else class="empty">
                    <i-ep-school class="empty-icon" />
                    <div class="empty-title">还没有班级</div>
                    <div class="empty-sub">请先创建一个班级</div>
                </div>
            </el-card>
        </div>
    </div>
    
</template>

<style scoped>
.points-history-page {
    width: 100%;
    height: 100%;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.title {
    font-size: 20px;
    font-weight: 700;
}

.grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
    height: calc(100% - 44px);
}

.right-card {
    border-radius: 16px;
}

.list-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.list-header {
    font-size: 18px;
    font-weight: 700;
    white-space: nowrap;
}

.row-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* 统一按钮间距，避免与 gap 叠加 */
.row-actions :deep(.el-button + .el-button) {
    margin-left: 0;
}

.search-input {
    width: 260px;
}

.history-sign-filter {
    width: 140px;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    background: #f5f7ff;
    color: #2d5cf6;
}

.badge.minus {
    background: #fff2f2;
    color: #ef4444;
}

.table-block {
    min-height: 60vh;
    position: relative;
}

.loading-placeholder {
    height: 60vh;
}

.pager-row {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
}

.empty {
    padding: 48px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-students {
    padding: 64px 12px;
}

@media (max-width: 1024px) {
    .grid {
        grid-template-columns: 1fr;
        height: auto;
    }
}

/* 提前在 930px 下收缩操作区为两行布局 */
@media (max-width: 930px) {
    .list-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }
    .row-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
        gap: 8px;
    }
    .row-actions :deep(.el-button),
    .row-actions :deep(.el-select),
    .row-actions :deep(.el-input) {
        width: 100%;
    }
    .search-input,
    .history-sign-filter {
        width: 100%;
    }
    .pager-row {
        justify-content: center;
    }
}

@media (max-width: 600px) {
    .points-history-page {
        padding: 12px;
    }
    /* 列表头上下布局，避免标题被挤压成竖排 */
    .list-header-row {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }
    /* 操作区两列网格，更紧凑且与控件间距一致 */
    .row-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        width: 100%;
        gap: 8px;
    }
    .row-actions :deep(.el-button),
    .row-actions :deep(.el-select),
    .row-actions :deep(.el-input) {
        width: 100%;
    }
    .search-input {
        width: 100%;
    }
    .history-sign-filter {
        width: 100%;
    }
    .pager-row {
        justify-content: center;
    }
}
</style>


