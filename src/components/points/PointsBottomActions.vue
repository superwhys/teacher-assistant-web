<script setup lang="ts">
defineOptions({ name: 'PointsBottomActions' })

export type SortOption =
    | 'default'
    | 'name-asc'
    | 'name-desc'
    | 'available-asc'
    | 'available-desc'
    | 'total-asc'
    | 'total-desc'

type GroupOption = { id: number; name: string; memberCount: number }

interface Props {
    activeClassId: number | null
    groups: GroupOption[]

    selectedGroupId: number | null
    sortBy: SortOption
    keyword: string

    selectedCount: number
    canUndo: boolean
    hasStudents: boolean
}

defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:selectedGroupId', v: number | null): void
    (e: 'update:sortBy', v: SortOption): void
    (e: 'update:keyword', v: string): void
    (e: 'open-apply-all', payload: { tab: 'plus' | 'minus' }): void
    (e: 'clear-selection'): void
    (e: 'undo-once'): void
}>()
</script>

<template>
    <div class="bottom-actions">
        <div class="filter-row">
            <el-select :model-value="selectedGroupId ?? 0" placeholder="全部学生" class="group-filter"
                :disabled="!activeClassId" clearable size="large"
                @update:model-value="emit('update:selectedGroupId', ($event || 0) === 0 ? null : $event)">
                <el-option label="全部学生" :value="0" />
                <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>

            <el-select :model-value="sortBy" placeholder="排序方式" class="sort-filter" :disabled="!activeClassId"
                size="large" @update:model-value="emit('update:sortBy', $event)">
                <el-option label="默认排序" value="default" />
                <el-option label="姓名 A-Z" value="name-asc">
                    <div class="sort-option">
                        <i-ep-sort-up />
                        <span>姓名 A-Z</span>
                    </div>
                </el-option>
                <el-option label="姓名 Z-A" value="name-desc">
                    <div class="sort-option">
                        <i-ep-sort-down />
                        <span>姓名 Z-A</span>
                    </div>
                </el-option>
                <el-option label="可用积分 ↑" value="available-asc">
                    <div class="sort-option">
                        <i-ep-sort-up />
                        <span>可用积分 ↑</span>
                    </div>
                </el-option>
                <el-option label="可用积分 ↓" value="available-desc">
                    <div class="sort-option">
                        <i-ep-sort-down />
                        <span>可用积分 ↓</span>
                    </div>
                </el-option>
                <el-option label="总积分 ↑" value="total-asc">
                    <div class="sort-option">
                        <i-ep-sort-up />
                        <span>总积分 ↑</span>
                    </div>
                </el-option>
                <el-option label="总积分 ↓" value="total-desc">
                    <div class="sort-option">
                        <i-ep-sort-down />
                        <span>总积分 ↓</span>
                    </div>
                </el-option>
            </el-select>

            <el-input :model-value="keyword" class="search-input" placeholder="搜索学生" clearable size="large"
                @update:model-value="emit('update:keyword', $event)">
                <template #prefix>
                    <i-ep-search />
                </template>
            </el-input>
        </div>

        <div class="main-actions-row">
            <el-button size="large" type="primary" class="action-btn" :disabled="!activeClassId || !hasStudents"
                @click="emit('open-apply-all', { tab: 'plus' })">
                <template #icon><i-ep-plus /></template>
                {{ selectedCount > 0 ? `批量加分（${selectedCount}）` : '全体加分' }}
            </el-button>

            <el-button v-if="selectedCount > 0" size="large" type="info" plain class="clear-btn"
                @click="emit('clear-selection')">
                <template #icon><i-ep-close /></template>
                清空
            </el-button>
            <el-button v-else size="large" type="warning" plain class="undo-btn" :disabled="!activeClassId || !canUndo"
                @click="emit('undo-once')">
                <template #icon><i-ep-refresh-left /></template>
                撤回
            </el-button>

            <el-button size="large" type="danger" class="action-btn" :disabled="!activeClassId || !hasStudents"
                @click="emit('open-apply-all', { tab: 'minus' })">
                <template #icon><i-ep-minus /></template>
                {{ selectedCount > 0 ? `批量扣分（${selectedCount}）` : '全体扣分' }}
            </el-button>
        </div>
    </div>
</template>

<style scoped>
.bottom-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

.filter-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.group-filter {
    flex: 1;
}

.sort-filter {
    flex: 1;
}

.sort-option {
    display: flex;
    align-items: center;
    gap: 8px;
}

.search-input {
    flex: 1;
}

.main-actions-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
}

.action-btn {
    flex: 1;
    max-width: 280px;
    height: 56px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 12px;
}

.undo-btn,
.clear-btn {
    width: 140px;
    height: 56px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    flex-shrink: 0;
}

@media (max-width: 768px) {
    .bottom-actions {
        padding: 14px;
        gap: 10px;
    }

    .filter-row {
        gap: 8px;
    }

    .main-actions-row {
        gap: 10px;
    }

    .action-btn {
        max-width: 180px;
        height: 50px;
        font-size: 16px;
    }

    .undo-btn,
    .clear-btn {
        width: 100px;
        height: 50px;
        font-size: 14px;
    }

}

@media (max-width: 390px) {
    .bottom-actions {
        padding: 8px;
        gap: 6px;
    }

    .filter-row {
        flex-direction: column;
        gap: 6px;
    }

    .class-filter,
    .group-filter,
    .sort-filter,
    .search-input {
        width: 100%;
    }

    .main-actions-row {
        gap: 6px;
    }

    .action-btn {
        height: 44px;
        font-size: 13px;
        padding: 0 8px;
    }

    .undo-btn,
    .clear-btn {
        width: 64px;
        height: 44px;
        font-size: 11px;
        padding: 0 4px;
    }
}
</style>
