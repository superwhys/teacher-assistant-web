<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { RuleGroup, Rule } from '@/types/points'

type SelectorTab = 'all' | 'plus' | 'minus'

type UiRule = {
    id: number
    name: string
    description: string
    icon: string
    points: number
    sign: 'plus' | 'minus'
}

type UiGroup = {
    id: number
    name: string
    icon: string
    rules: UiRule[]
}

type Props = {
    modelValue: boolean
    tab?: SelectorTab
    groups: RuleGroup[]
    loading?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'update:tab', v: SelectorTab): void
    (e: 'select', rule: UiRule): void
}>()

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

function inferRuleSign(rule: Rule): 'plus' | 'minus' {
    const t = toNumber(rule.points_type, 0)
    if (t === 2) return 'minus'
    if (t === 1) return 'plus'
    const p = toNumber(rule.points, 0)
    return p < 0 ? 'minus' : 'plus'
}

const innerVisible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v),
})

const innerTab = computed<SelectorTab>({
    get: () => props.tab ?? 'plus',
    set: (v: SelectorTab) => emit('update:tab', v),
})

const windowWidth = ref(window.innerWidth)

function handleResize() {
    windowWidth.value = window.innerWidth
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})

const dialogWidth = computed(() => {
    if (windowWidth.value <= 480) return '96vw'
    if (windowWidth.value <= 768) return '92vw'
    return '720px'
})

const keyword = ref('')

const uiGroups = computed<UiGroup[]>(() => {
    const result: UiGroup[] = []
    for (const g of props.groups ?? []) {
        const gid = toNumber(g.id, 0)
        const gname = (g.name ?? '').trim()
        if (!gid || !gname) continue
        const rules = (g.rules ?? [])
            .map((r): UiRule | null => {
                const rid = toNumber(r.id, 0)
                const rname = (r.name ?? '').trim()
                if (!rid || !rname) return null
                const points = toNumber(r.points, 0)
                const sign = inferRuleSign(r)
                return {
                    id: rid,
                    name: rname,
                    description: (r.description ?? '').trim(),
                    icon: (r.icon ?? '').trim(),
                    points,
                    sign,
                }
            })
            .filter(Boolean) as UiRule[]

        result.push({
            id: gid,
            name: gname,
            icon: (g.icon ?? '').trim() || '📁',
            rules,
        })
    }
    return result
})

function filterRules(list: UiRule[]): UiRule[] {
    const tab = innerTab.value
    const q = keyword.value.trim().toLowerCase()
    return list.filter(r => {
        if (tab !== 'all' && r.sign !== tab) return false
        if (!q) return true
        return r.name.toLowerCase().includes(q)
    })
}

function onSelect(rule: UiRule) {
    if (props.loading) return
    emit('select', rule)
}
</script>

<template>
    <el-dialog
        v-model="innerVisible"
        title="选择积分规则"
        :width="dialogWidth"
        class="points-rule-selector-dialog"
        :close-on-click-modal="!props.loading"
        :close-on-press-escape="!props.loading"
        :show-close="!props.loading"
    >
        <div class="selector-content" v-loading="props.loading">
            <el-tabs v-model="innerTab" class="selector-tabs">
                <el-tab-pane label="全部" name="all" />
                <el-tab-pane label="加分" name="plus" />
                <el-tab-pane label="扣分" name="minus" />
            </el-tabs>

            <div class="search-row">
                <el-input v-model="keyword" placeholder="搜索规则名称" clearable>
                    <template #prefix><i-ep-search /></template>
                </el-input>
            </div>

            <el-collapse accordion class="selector-collapse">
                <el-collapse-item
                    v-for="g in uiGroups"
                    :key="g.id"
                    :name="g.id"
                    v-show="filterRules(g.rules).length > 0"
                >
                    <template #title>
                        <div class="group-header">
                            <span class="group-icon">{{ g.icon }}</span>
                            <span class="group-name">{{ g.name }}</span>
                        </div>
                    </template>
                    <div class="items">
                        <div
                            v-for="r in filterRules(g.rules)"
                            :key="r.id"
                            :class="['item-row', { 'is-loading': props.loading }]"
                            @click="onSelect(r)"
                        >
                            <div class="item-name">{{ r.name }}</div>
                            <div :class="['item-value', r.sign === 'plus' ? 'plus' : 'minus']">
                                {{ r.sign === 'plus' ? '+' : '-' }}{{ Math.abs(r.points) }}
                            </div>
                            <i-ep-arrow-right class="item-arrow" />
                        </div>
                        <div v-if="filterRules(g.rules).length === 0" class="item-empty">暂无规则</div>
                    </div>
                </el-collapse-item>
            </el-collapse>
        </div>

        <template #footer>
            <span class="dialog-footer">
                <el-button :disabled="props.loading" @click="innerVisible = false">关闭</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
:deep(.points-rule-selector-dialog) {
    max-width: calc(100vw - 24px);
    margin: 0 auto;
}

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

.item-row.is-loading {
    cursor: not-allowed;
    pointer-events: none;
}

.item-row:hover {
    background: rgba(0, 0, 0, 0.03);
}

.item-name {
    font-size: 15px;
    text-align: left;
    justify-self: start;
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


