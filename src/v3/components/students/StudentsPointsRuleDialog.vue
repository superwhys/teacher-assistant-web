<template>
    <AppDialogShell v-model="visible" :title="currentTab === 'minus' ? '选择扣分规则' : currentTab === 'plus' ? '选择加分规则' : '选择积分规则'"
        eyebrow="积分操作" :description="targetLabel ? `本次操作：${targetLabel}` : '选择本次加分或扣分项目'"
        width="640px" :busy="applying">
        <section v-if="loading" class="rules-state" role="status" aria-live="polite">
            <el-skeleton :rows="4" animated />
            <p>正在加载积分规则…</p>
        </section>
        <section v-else-if="error" class="rules-state" role="alert">
            <strong>{{ error }}</strong>
            <button type="button" class="primary-button" @click="emit('retry')">重新加载</button>
        </section>
        <div v-else class="students-points-rule-dialog" v-loading="applying" element-loading-text="正在应用积分，请稍候">
            <div class="rule-sign-switch" role="group" aria-label="积分规则类型">
                <button type="button" :aria-pressed="currentTab === 'all'" :disabled="applying" @click="currentTab = 'all'">全部规则</button>
                <button type="button" :aria-pressed="currentTab === 'plus'" :disabled="applying" @click="currentTab = 'plus'">加分规则</button>
                <button type="button" :aria-pressed="currentTab === 'minus'" :disabled="applying" @click="currentTab = 'minus'">扣分规则</button>
            </div>

            <el-input v-model="keyword" size="large" placeholder="搜索规则名称" aria-label="搜索积分规则" clearable :disabled="applying">
                <template #prefix><i-ep-search aria-hidden="true" /></template>
            </el-input>

            <template v-if="filteredGroups.length > 0 && activeGroup">
                <div class="rule-group-switch" role="group" aria-label="规则分组">
                    <button v-for="group in filteredGroups" :key="group.id" type="button"
                        :aria-pressed="activeGroupId === group.id" :disabled="applying" @click="activeGroupId = group.id">
                        <span v-if="group.icon" aria-hidden="true">{{ group.icon }}</span>
                        {{ group.name }} <small>{{ group.rules.length }}</small>
                    </button>
                </div>
                <div class="rule-grid">
                    <button v-for="rule in activeGroup.rules" :key="rule.id" type="button" class="rule-card"
                        :class="{ 'rule-card--minus': rule.sign === 'minus' }" :disabled="applying" @click="handleSelectRule(rule)">
                        <span class="rule-card__name">{{ rule.name }}</span>
                        <strong>{{ rule.sign === 'plus' ? '+' : '-' }}{{ Math.abs(rule.points) }}</strong>
                    </button>
                </div>
                <p class="rules-hint">{{ filteredGroups.length }} 个分组 · {{ filteredRuleCount }} 项规则，点击规则立即执行。</p>
            </template>
            <section v-else class="rules-state">
                <strong>当前条件下暂无可用规则</strong>
                <p>你可以切换加分/扣分页签，或调整搜索关键字后再试。</p>
            </section>
        </div>
        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="applying" @click="visible = false">关闭</button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import type { Rule, RuleGroup } from "@/types/points";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { computed, ref, watch } from "vue";

/** 定义积分规则弹窗页签类型。 */
type SelectorTab = "all" | "plus" | "minus"

/** 定义弹窗中的积分规则展示结构。 */
type UiRule = {
    id: number
    name: string
    icon: string
    points: number
    sign: "plus" | "minus"
}

/** 定义弹窗中的积分规则组展示结构。 */
type UiGroup = {
    id: number
    name: string
    icon: string
    rules: UiRule[]
}

/** 定义积分规则弹窗属性结构。 */
interface StudentsPointsRuleDialogProps {
    modelValue: boolean
    tab?: SelectorTab
    groups: RuleGroup[]
    loading?: boolean
    applying?: boolean
    error?: string
    targetLabel?: string
}

const props = withDefaults(defineProps<StudentsPointsRuleDialogProps>(), {
    tab: "plus",
    loading: false,
    applying: false,
    error: "",
    targetLabel: ""
})

const emit = defineEmits<{
    (event: "update:modelValue", value: boolean): void
    (event: "update:tab", value: SelectorTab): void
    (event: "select", rule: UiRule): void
    (event: "retry"): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const currentTab = computed<SelectorTab>({
    get: () => props.tab,
    set: (value: SelectorTab) => emit("update:tab", value)
})

const keyword = ref("")
const activeGroupId = ref<number | null>(null)

/** 将未知值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 推断规则对应的加减分类型。 */
function inferRuleSign(rule: Rule): "plus" | "minus" {
    const type = toNumber(rule.points_type, 0)
    if (type === 2) {
        return "minus"
    }

    if (type === 1) {
        return "plus"
    }

    return toNumber(rule.points, 0) < 0 ? "minus" : "plus"
}

/** 将接口规则组转换为弹窗展示结构。 */
const uiGroups = computed<UiGroup[]>(() => {
    return (props.groups ?? [])
        .map((group) => {
            const groupId = toNumber(group.id, 0)
            const groupName = (group.name ?? "").trim()
            if (!groupId || !groupName) {
                return null
            }

            const rules = (group.rules ?? [])
                .map((rule): UiRule | null => {
                    const ruleId = toNumber(rule.id, 0)
                    const ruleName = (rule.name ?? "").trim()
                    if (!ruleId || !ruleName) {
                        return null
                    }

                    return {
                        id: ruleId,
                        name: ruleName,
                        icon: (rule.icon ?? "").trim(),
                        points: toNumber(rule.points, 0),
                        sign: inferRuleSign(rule)
                    }
                })
                .filter((rule): rule is UiRule => rule !== null)

            return {
                id: groupId,
                name: groupName,
                icon: (group.icon ?? "").trim(),
                rules
            }
        })
        .filter((group): group is UiGroup => group !== null)
})

/** 返回筛选后的积分规则组。 */
const filteredGroups = computed<UiGroup[]>(() => {
    const normalizedKeyword = keyword.value.trim().toLowerCase()

    return uiGroups.value
        .map((group) => {
            const rules = group.rules.filter((rule) => {
                const matchTab = currentTab.value === "all" || rule.sign === currentTab.value
                const matchKeyword = !normalizedKeyword
                    || rule.name.toLowerCase().includes(normalizedKeyword)

                return matchTab && matchKeyword
            })

            if (rules.length === 0) {
                return null
            }

            return {
                ...group,
                rules
            }
        })
        .filter((group): group is UiGroup => group !== null)
})

/** 返回筛选后可见的规则总数。 */
const filteredRuleCount = computed<number>(() => {
    return filteredGroups.value.reduce((total, group) => total + group.rules.length, 0)
})

/** 返回当前激活的规则分组。 */
const activeGroup = computed<UiGroup | null>(() => {
    if (filteredGroups.value.length === 0) {
        return null
    }

    return filteredGroups.value.find((group) => group.id === activeGroupId.value) ?? filteredGroups.value[0] ?? null
})

/** 处理积分规则点击选择。 */
function handleSelectRule(rule: UiRule): void {
    if (props.loading || props.applying) {
        return
    }

    emit("select", rule)
}

/** 在弹窗打开时重置搜索条件。 */
watch(() => props.modelValue, (isVisible) => {
    if (isVisible) {
        keyword.value = ""
    }
})

/** 在分组列表变化时保持当前激活分组有效。 */
watch(filteredGroups, (groups) => {
    if (groups.length === 0) {
        activeGroupId.value = null
        return
    }

    const exists = groups.some((group) => group.id === activeGroupId.value)
    if (!exists) {
        activeGroupId.value = groups[0]?.id ?? null
    }
}, { immediate: true })
</script>

<style scoped>
.students-points-rule-dialog {
    display: grid;
    gap: 16px;
}

.rules-state {
    min-height: 210px;
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 16px;
    color: var(--ta-text-secondary);
    text-align: center;
}

.rules-state p {
    margin: 0;
    font-size: 14px;
}

.rule-sign-switch,
.rule-group-switch {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}

.rule-sign-switch {
    padding: 3px;
    border-radius: 11px;
    background: var(--ta-blue-soft);
}

.rule-sign-switch button,
.rule-group-switch button {
    min-height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 14px;
    cursor: pointer;
}

.rule-sign-switch button {
    flex: 1;
}

.rule-sign-switch button[aria-pressed="true"] {
    color: var(--ta-blue);
    background: var(--ta-surface-solid);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.rule-group-switch button[aria-pressed="true"] {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.rule-group-switch small {
    margin-left: 4px;
    font-size: 12px;
}

.rule-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.rule-card {
    min-width: 0;
    min-height: 60px;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    color: var(--ta-text);
    background: var(--ta-surface-solid);
    text-align: left;
    font-size: 15px;
    cursor: pointer;
    transition: border-color 140ms ease, background-color 140ms ease, transform 100ms ease;
}

.rule-card__name {
    overflow-wrap: anywhere;
}

.rule-card strong {
    flex-shrink: 0;
    color: var(--ta-blue);
    font-variant-numeric: tabular-nums;
}

.rule-card--minus strong {
    color: var(--ta-red);
}

.rule-card:not(:disabled):hover {
    border-color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.rule-card:not(:disabled):active {
    transform: scale(0.985);
}

.rule-card:disabled,
.rule-sign-switch button:disabled,
.rule-group-switch button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.rules-hint {
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 12px;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
}

@media (max-width: 660px) {
    .rule-grid {
        grid-template-columns: 1fr;
    }

    .rule-sign-switch button,
    .rule-group-switch button,
    .dialog-actions .ghost-button {
        min-height: 44px;
    }

    .rule-sign-switch button {
        padding-inline: 8px;
    }

    .dialog-actions .ghost-button {
        width: 100%;
    }
}
</style>
