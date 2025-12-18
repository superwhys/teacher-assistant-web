<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { formatChineseDateTime } from '@/utils/date'

import { useCacheStore } from '@/stores/cacheStore'
import { classManager } from '@/managers/class'
import { studentManager } from '@/managers/student'
import { pointsManager } from '@/managers/points'

import type { ClassDTO } from '@/types/class'
import type { StudentDTO, StudentGroupDTO } from '@/types/student'
import type { Record as PointsApplyRecord, RuleGroup } from '@/types/points'

defineOptions({
    name: 'PointsHistoryView'
})

const route = useRoute()
const cacheStore = useCacheStore()

const classes = ref<ClassDTO[]>([])
const students = ref<StudentDTO[]>([])
const groups = ref<StudentGroupDTO[]>([])
const ruleGroups = ref<RuleGroup[]>([])
const records = ref<PointsApplyRecord[]>([])

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())

const activeClass = computed(() => {
    if (!activeClassId.value) return null
    return classes.value.find(c => c.id === activeClassId.value) ?? null
})

const groupsOfActive = computed(() => {
    return (groups.value ?? [])
        .map(g => ({
            id: g.id ?? 0,
            name: g.name ?? '',
            memberIds: (g.students ?? []).map(s => s.id ?? 0).filter(id => id > 0),
        }))
        .filter(g => g.id > 0 && !!g.name)
})

const selectedGroupId = ref<number>(0)
watch(activeClassId, () => {
    selectedGroupId.value = 0
})

const historyKeyword = ref('')
const historySign = ref<'all' | 'plus' | 'minus'>('all')

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const studentIdNameMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    for (const s of students.value ?? []) {
        const id = s.id ?? 0
        const name = s.name ?? ''
        if (id > 0 && name) map[id] = name
    }
    return map
})

const groupIdToMemberSet = computed(() => {
    const map = new Map<number, Set<number>>()
    for (const g of groupsOfActive.value) {
        map.set(g.id, new Set(g.memberIds))
    }
    return map
})

const ruleMetaMap = computed(() => {
    const map = new Map<number, { name: string; sign: 'plus' | 'minus'; points: number }>()
    for (const g of ruleGroups.value ?? []) {
        for (const r of g.rules ?? []) {
            const id = toNumber(r.id, 0)
            const name = (r.name ?? '').trim()
            if (!id || !name) continue
            const points = toNumber(r.points, 0)
            const t = toNumber(r.points_type, 0)
            const sign = t === 2 ? 'minus' : (t === 1 ? 'plus' : (points < 0 ? 'minus' : 'plus'))
            map.set(id, { name, sign, points })
        }
    }
    return map
})

function inferDelta(rec: PointsApplyRecord): number {
    const amount = toNumber(rec.amount, 0)
    if (amount !== 0 && amount !== Math.abs(amount)) return amount
    const meta = ruleMetaMap.value.get(toNumber(rec.rule_id, 0)) ?? null
    if (!meta) return amount
    const base = Math.abs(amount || meta.points || 0)
    return meta.sign === 'minus' ? -base : base
}

function getRecordTs(r: PointsApplyRecord): number {
    const raw = (r as any)?.created_at ?? (r as any)?.createdAt ?? (r as any)?.at ?? (r as any)?.time ?? (r as any)?.timestamp
    if (!raw) return 0
    if (typeof raw === 'number') return raw
    const t = Date.parse(String(raw))
    return Number.isFinite(t) ? t : 0
}

const historyDesc = computed(() => {
    const list = [...(records.value ?? [])]
    list.sort((a, b) => {
        const at = getRecordTs(a) || toNumber(a.id, 0)
        const bt = getRecordTs(b) || toNumber(b.id, 0)
        return bt - at
    })
    return list
})

const filteredHistory = computed(() => {
    const kw = historyKeyword.value.trim().toLowerCase()
    let list = historyDesc.value

    if (selectedGroupId.value > 0) {
        const set = groupIdToMemberSet.value.get(selectedGroupId.value)
        if (set) {
            list = list.filter(r => set.has(toNumber(r.student_id, 0)))
        }
    }

    if (historySign.value !== 'all') {
        list = list.filter(r => {
            const delta = inferDelta(r)
            return historySign.value === 'plus' ? delta > 0 : delta < 0
        })
    }

    if (!kw) return list
    return list.filter(r => {
        const sid = toNumber(r.student_id, 0)
        const name = studentIdNameMap.value[sid] ?? ''
        return name.toLowerCase().includes(kw)
    })
})

watch(() => route.query.q, (q) => {
    historyKeyword.value = typeof q === 'string' ? q : ''
}, { immediate: true })

function clearHistory() {
    ElMessage.info('后端暂不支持清空积分记录')
}

async function undoAction(actionId: number) {
    if (!activeClassId.value) return
    try {
        await ElMessageBox.confirm('确定撤回该条积分记录吗？', '撤回确认', { type: 'warning' })
        await pointsManager.undoApply(actionId)
        ElMessage.success('已撤回')
        await refresh()
    } catch (err) {
        if (err) ElMessage.error('撤回失败')
    }
}

async function loadClasses() {
    try {
        classes.value = await classManager.list()
    } catch (err) {
        console.error(err)
    }
}

async function refresh() {
    if (!activeClassId.value) {
        students.value = []
        groups.value = []
        ruleGroups.value = []
        records.value = []
        return
    }

    try {
        const clsId = activeClassId.value
        const [stu, grp, rg, rec] = await Promise.all([
            studentManager.list(clsId),
            studentManager.listGroups(clsId),
            pointsManager.listRuleGroups(),
            pointsManager.listAllApplyRecordsByClass(clsId),
        ])
        students.value = stu
        groups.value = grp
        ruleGroups.value = rg
        records.value = rec
    } catch (err) {
        console.error(err)
    }
}

onMounted(async () => {
    await loadClasses()
    await refresh()
})
</script>

<template>
    <div class="points-history-page">
        <div class="header-row">
            <div class="title">积分记录 <span v-if="activeClass">（{{ activeClass.name }}）</span></div>
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
                            <el-select v-model="selectedGroupId" placeholder="全部学生" class="group-filter"
                                :disabled="!activeClassId" clearable>
                                <el-option label="全部学生" :value="0" />
                                <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.memberIds.length}）`"
                                    :value="g.id" />
                            </el-select>
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

                <div v-if="activeClass">
                    <div v-if="records.length > 0">
                        <el-table :data="filteredHistory" border size="large" height="60vh">
                            <el-table-column type="index" label="#" width="60" />
                            <el-table-column label="时间" width="180" align="center">
                                <template #default="{ row }">
                                    <span v-if="getRecordTs(row)">{{ formatChineseDateTime(new Date(getRecordTs(row))) }}</span>
                                    <span v-else>-</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="积分项" min-width="220">
                                <template #default="{ row }">
                                    <span>{{ ruleMetaMap.get(row.rule_id)?.name || row.rule_desc || '未知' }}</span>
                                    <span
                                        v-if="ruleMetaMap.get(row.rule_id)"
                                        :class="['badge', ruleMetaMap.get(row.rule_id)?.sign === 'plus' ? 'plus' : 'minus']"
                                        style="margin-left:8px;"
                                    >
                                        {{ ruleMetaMap.get(row.rule_id)?.sign === 'plus' ? '+' : '-' }}{{ Math.abs(ruleMetaMap.get(row.rule_id)?.points || 0) }}
                                    </span>
                                </template>
                            </el-table-column>
                            <el-table-column label="学生" min-width="260">
                                <template #default="{ row }">
                                    {{ studentIdNameMap[row.student_id] || row.student_id || '-' }}
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
                                    <el-button type="warning" link @click="undoAction(row.id)">撤回</el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>
                    <div v-else class="empty empty-students">
                        <i-ep-document-remove class="empty-icon" />
                        <div class="empty-title">暂无积分记录</div>
                        <div class="empty-sub">去给学生加分/扣分后会在此显示</div>
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

.group-filter {
    width: 220px;
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
    .group-filter,
    .history-sign-filter {
        width: 100%;
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
    .group-filter {
        width: 100%;
    }
    .history-sign-filter {
        width: 100%;
    }
}
</style>


