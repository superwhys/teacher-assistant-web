<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute } from 'vue-router'
import { useClassStore } from '@/stores/classStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'
import { formatChineseDateTime } from '@/utils/date'

defineOptions({
    name: 'PointsHistoryView'
})

const classStore = useClassStore()
const groupStore = useStudentGroupStore()
const pointsStore = usePointsStore()
const route = useRoute()

const activeClass = computed(() => classStore.activeClass)
const activeClassId = computed(() => classStore.activeClassId)

const groupsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? groupStore.listByClassId(id) : []
})

const selectedGroupId = ref<string | ''>('')
watch(activeClassId, () => {
    selectedGroupId.value = ''
})

const historyKeyword = ref('')
const historySign = ref<'all' | 'plus' | 'minus'>('all')
const historyOfActive = computed(() => pointsStore.getHistoryOf(activeClassId.value))
const historyDesc = computed(() => [...historyOfActive.value].reverse())
const filteredHistory = computed(() => {
    const keyword = historyKeyword.value.trim().toLowerCase()
    const gid = selectedGroupId.value
    let list = historyDesc.value
    if (gid) {
        const g = groupsOfActive.value.find(x => x.id === gid)
        const nameSet = new Set(g?.members ?? [])
        list = list.filter(a => a.studentNames.some(n => nameSet.has(n)))
    }
    if (historySign.value !== 'all') {
        list = list.filter(a => historySign.value === 'plus' ? a.delta > 0 : a.delta < 0)
    }
    if (!keyword) return list
    return list.filter(a => a.studentNames.some(n => n.toLowerCase().includes(keyword)))
})

watch(() => route.query.q, (q) => {
    historyKeyword.value = typeof q === 'string' ? q : ''
}, { immediate: true })

function clearHistory() {
    if (!activeClassId.value) return
    ElMessageBox.confirm('确定清空该班级的所有积分记录吗？', '清空确认', { type: 'warning' })
        .then(() => {
            pointsStore.clearHistory(activeClassId.value)
            ElMessage.success('已清空积分记录')
        })
        .catch(() => { })
}

function undoAction(actionId: string) {
    if (!activeClassId.value) return
    ElMessageBox.confirm('确定撤回该条积分记录吗？', '撤回确认', { type: 'warning' })
        .then(() => {
            const action = pointsStore.undoById(activeClassId.value, actionId)
            if (action) {
                const target = action.studentNames.length > 3
                    ? `${action.studentNames.slice(0, 3).join('、')} 等${action.studentNames.length}人`
                    : action.studentNames.join('、')
                ElMessage.success(`已撤回对「${target}」${action.delta > 0 ? '加' : '减'}${Math.abs(action.delta)} 分${action.itemName ? `（${action.itemName}）` : ''}`)
            }
        })
        .catch(() => { })
}
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
                                <el-option label="全部学生" value="" />
                                <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`"
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
                            <el-button type="danger" plain :disabled="!activeClassId || historyOfActive.length === 0" @click="clearHistory">
                                <i-ep-delete /> 清空记录
                            </el-button>
                        </div>
                    </div>
                </template>

                <div v-if="activeClass">
                    <div v-if="historyOfActive.length > 0">
                        <el-table :data="filteredHistory" border size="large" height="60vh">
                            <el-table-column type="index" label="#" width="60" />
                            <el-table-column label="时间" width="180" align="center">
                                <template #default="{ row }">
                                    {{ formatChineseDateTime(new Date(row.at)) }}
                                </template>
                            </el-table-column>
                            <el-table-column label="积分项" min-width="220">
                                <template #default="{ row }">
                                    <span>{{ row.itemName || '未知' }}</span>
                                    <span v-if="row.itemValue" :class="['badge', row.itemSign === 'plus' ? 'plus' : 'minus']" style="margin-left:8px;">
                                        {{ row.itemSign === 'plus' ? '+' : '-' }}{{ row.itemValue }}
                                    </span>
                                </template>
                            </el-table-column>
                            <el-table-column label="学生" min-width="260">
                                <template #default="{ row }">
                                    {{ row.studentNames.join('、') }}
                                </template>
                            </el-table-column>
                            <el-table-column label="分值" width="120" align="center">
                                <template #default="{ row }">
                                    <span :class="['badge', row.delta > 0 ? 'plus' : 'minus']">
                                        {{ row.delta > 0 ? '+' : '-' }}{{ Math.abs(row.delta) }}
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


