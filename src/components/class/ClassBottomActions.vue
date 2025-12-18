<script setup lang="ts">
import type { StudentsSortOption } from '@/types/student'

export type UiGroupOption = {
    id: number
    name: string
    memberCount: number
}

defineProps<{
    active: boolean
    groups: UiGroupOption[]
    selectedGroupId: number | null
    sortBy: StudentsSortOption
    keyword: string
}>()

const emit = defineEmits<{
    (e: 'update:selectedGroupId', value: number | null): void
    (e: 'update:sortBy', value: StudentsSortOption): void
    (e: 'update:keyword', value: string): void
    (e: 'open-add-student'): void
    (e: 'open-group-manage'): void
}>()
</script>

<template>
    <div class="bottom-actions">
        <div class="filter-row">
            <el-select
                v-if="active"
                :model-value="selectedGroupId ?? undefined"
                size="large"
                placeholder="全部学生"
                class="group-filter"
                clearable
                @update:model-value="emit('update:selectedGroupId', (($event as number | undefined) ?? null))"
            >
                <el-option v-for="g in groups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>

            <el-select
                v-if="active"
                :model-value="sortBy"
                placeholder="排序方式"
                class="sort-filter"
                size="large"
                @update:model-value="emit('update:sortBy', $event as StudentsSortOption)"
            >
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
                <el-option label="积分从高到低" value="points-desc">
                    <div class="sort-option">
                        <i-ep-bottom />
                        <span>积分从高到低</span>
                    </div>
                </el-option>
                <el-option label="积分从低到高" value="points-asc">
                    <div class="sort-option">
                        <i-ep-top />
                        <span>积分从低到高</span>
                    </div>
                </el-option>
            </el-select>

            <el-input
                v-if="active"
                :model-value="keyword"
                class="search-input"
                placeholder="搜索学生"
                clearable
                size="large"
                @update:model-value="emit('update:keyword', $event as string)"
            >
                <template #prefix>
                    <i-ep-search />
                </template>
            </el-input>
        </div>

        <div class="action-buttons-row">
            <el-button size="large" type="primary" :disabled="!active" @click="emit('open-add-student')" class="action-btn">
                <i-ep-plus /> 添加学生
            </el-button>
            <el-button size="large" type="primary" plain :disabled="!active" @click="emit('open-group-manage')" class="action-btn">
                <i-ep-user /> 分组管理
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
    gap: 12px;
    width: 100%;
}

.group-filter {
    flex: 1;
}

.sort-filter {
    flex: 1;
}

.search-input {
    flex: 1;
}

.sort-option {
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-buttons-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    width: 100%;
}

.action-btn {
    flex: 1;
    height: 56px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 12px;
}

@media (max-width: 768px) {
    .bottom-actions {
        padding: 16px;
        gap: 10px;
    }

    .filter-row {
        flex-direction: column;
        gap: 8px;
    }

    .action-buttons-row {
        gap: 12px;
    }

    .action-btn {
        height: 48px;
        font-size: 16px;
    }
}

@media (max-width: 480px) {
    .bottom-actions {
        padding: 12px;
        gap: 8px;
    }

    .action-buttons-row {
        gap: 10px;
    }

    .action-btn {
        height: 46px;
        font-size: 15px;
    }
}
</style>
