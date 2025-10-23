<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import type { PointsItem } from '@/types/pointsItem'

type SelectorTab = 'all' | 'plus' | 'minus'

type Props = {
    modelValue: boolean
    activeClassId: string | null
    tab?: SelectorTab
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'update:tab', v: SelectorTab): void
    (e: 'select', item: PointsItem): void
}>()

const pointsItemStore = usePointsItemStore()

const innerVisible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v),
})

const innerTab = computed<SelectorTab>({
    get: () => props.tab ?? 'plus',
    set: (v: SelectorTab) => emit('update:tab', v),
})

const itemGroups = computed(() => pointsItemStore.listGroups(props.activeClassId))
function itemsOfGroup(groupId: string, tab: SelectorTab): PointsItem[] {
    return pointsItemStore.listItemsByGroup(props.activeClassId, groupId, tab)
}

function onSelectItem(item: PointsItem) {
    emit('select', item)
}

const keyword = ref('')
function itemsOfGroupFiltered(groupId: string): PointsItem[] {
    const list = itemsOfGroup(groupId, innerTab.value)
    const q = keyword.value.trim().toLowerCase()
    if (!q) return list
    return list.filter(it => it.name.toLowerCase().includes(q))
}
</script>

<template>
    <el-dialog v-model="innerVisible" title="选择分值项" width="720px">
        <div class="selector-content">
            <el-tabs v-model="innerTab" class="selector-tabs">
            <el-tab-pane label="全部" name="all" />
            <el-tab-pane label="加分" name="plus" />
            <el-tab-pane label="扣分" name="minus" />
        </el-tabs>

        <div class="search-row">
            <el-input v-model="keyword" placeholder="搜索分值项名称" clearable>
                <template #prefix><i-ep-search /></template>
            </el-input>
        </div>

        <el-collapse accordion class="selector-collapse">
            <el-collapse-item v-for="g in itemGroups" :key="g.id" :name="g.id"
                v-show="innerTab !== 'all' ? itemsOfGroupFiltered(g.id).length > 0 : (keyword.trim() === '' || itemsOfGroupFiltered(g.id).length > 0)">
                <template #title>
                    <div class="group-header">
                        <span class="group-icon">{{ g.icon || '📁' }}</span>
                        <span class="group-name">{{ g.name }}</span>
                    </div>
                </template>
                <div class="items">
                    <div v-for="it in itemsOfGroupFiltered(g.id)" :key="it.id" class="item-row"
                        @click="onSelectItem(it)">
                        <div class="item-name">{{ it.name }}</div>
                        <div :class="['item-value', it.sign === 'plus' ? 'plus' : 'minus']">
                            {{ it.sign === 'plus' ? '+' : '-' }}{{ it.value }}
                        </div>
                        <i-ep-arrow-right class="item-arrow" />
                    </div>
                    <div v-if="itemsOfGroupFiltered(g.id).length === 0" class="item-empty">暂无该类分值项</div>
                </div>
            </el-collapse-item>
        </el-collapse>
        </div>

        <template #footer>
            <span class="dialog-footer">
                <el-button @click="innerVisible = false">关闭</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
.selector-content {
    max-height: 50vh;
    overflow: auto;
}

.selector-tabs {
    margin-bottom: 8px;
}

.search-row {
    margin-bottom: 10px;
}

.selector-collapse :deep(.el-collapse-item__header) {
    padding: 0 6px;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    padding: 6px 2px;
}

.group-icon {
    font-size: 18px;
}

.items {
    display: flex;
    flex-direction: column;
}

.item-row {
    display: grid;
    grid-template-columns: 1fr auto 16px;
    align-items: center;
    padding: 10px 6px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    border-radius: 8px;
}

.item-row:hover {
    background: rgba(0, 0, 0, 0.03);
}

.item-name {
    font-size: 15px;
}

.item-value {
    font-weight: 700;
}

.item-value.plus {
    color: #1db954;
}

.item-value.minus {
    color: #ef4444;
}

.item-arrow {
    color: #bbb;
}

.item-empty {
    color: #999;
    font-size: 13px;
    padding: 6px;
}
</style>


