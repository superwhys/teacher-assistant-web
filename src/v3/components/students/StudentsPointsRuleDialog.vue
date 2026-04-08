<template>
    <StudentsDialogShell
        v-model="visible"
        title="选择积分规则"
        eyebrow="积分操作"
        description="按规则组快速选择本次要执行的加分或扣分项目"
        width="860px"
        :show-close="!loading"
    >
        <div class="students-points-rule-dialog" v-loading="loading">
            <div class="mode-switch">
                <button
                    type="button"
                    class="mode-switch__button"
                    :class="{ 'is-active': currentTab === 'all' }"
                    :disabled="loading"
                    @click="currentTab = 'all'"
                >
                    全部规则
                </button>
                <button
                    type="button"
                    class="mode-switch__button"
                    :class="{ 'is-active': currentTab === 'plus' }"
                    :disabled="loading"
                    @click="currentTab = 'plus'"
                >
                    加分规则
                </button>
                <button
                    type="button"
                    class="mode-switch__button"
                    :class="{ 'is-active': currentTab === 'minus' }"
                    :disabled="loading"
                    @click="currentTab = 'minus'"
                >
                    扣分规则
                </button>
            </div>

            <section class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>规则筛选</h4>
                        <p>支持按规则名称快速搜索，点击卡片即可立即执行积分操作。</p>
                    </div>
                    <div class="meta-tags">
                        <span class="meta-tag">分组 {{ filteredGroups.length }}</span>
                        <span class="meta-tag">规则 {{ filteredRuleCount }}</span>
                    </div>
                </div>

                <label class="field-block">
                    <span class="field-block__label">搜索规则</span>
                    <el-input v-model="keyword" size="large" placeholder="请输入规则名称" clearable :disabled="loading">
                        <template #prefix>
                            <i-ep-search />
                        </template>
                    </el-input>
                </label>
            </section>

            <div v-if="filteredGroups.length > 0 && activeGroup" class="selector-layout">
                <aside class="surface-card group-sidebar">
                    <div class="section-head section-head--compact">
                        <div>
                            <h4>规则分组</h4>
                            <p>先选分组，再从右侧快速点选规则。</p>
                        </div>
                    </div>

                    <div class="group-nav-list">
                        <button
                            v-for="group in filteredGroups"
                            :key="group.id"
                            type="button"
                            class="group-nav-item"
                            :class="{ 'is-active': activeGroupId === group.id }"
                            :disabled="loading"
                            @click="activeGroupId = group.id"
                        >
                            <span v-if="group.icon" class="group-nav-item__icon">{{ group.icon }}</span>
                            <span class="group-nav-item__body">
                                <strong>{{ group.name }}</strong>
                                <small>{{ group.rules.length }} 项规则</small>
                            </span>
                        </button>
                    </div>
                </aside>

                <section class="surface-card rules-panel">
                    <div class="section-head">
                        <div class="group-head">
                            <span v-if="activeGroup.icon" class="group-head__icon">{{ activeGroup.icon }}</span>
                            <div>
                                <h4>{{ activeGroup.name }}</h4>
                                <p>{{ activeGroup.description || "当前分组下可直接选择积分项目。" }}</p>
                            </div>
                        </div>
                        <div class="meta-tags">
                            <span class="meta-tag">{{ activeGroup.rules.length }} 项</span>
                        </div>
                    </div>

                    <div class="rule-grid">
                        <button
                            v-for="rule in activeGroup.rules"
                            :key="rule.id"
                            type="button"
                            class="rule-card"
                            :class="{
                                'rule-card--plus': rule.sign === 'plus',
                                'rule-card--minus': rule.sign === 'minus',
                                'is-loading': loading
                            }"
                            :disabled="loading"
                            @click="handleSelectRule(rule)"
                        >
                            <div class="rule-card__body">
                                <strong>{{ rule.name }}</strong>
                                <p>{{ rule.description || `${activeGroup.name} · ${rule.sign === 'plus' ? '加分' : '扣分'}规则` }}</p>
                            </div>
                            <div class="rule-card__meta">
                                <span class="rule-card__points">
                                    {{ rule.sign === 'plus' ? "+" : "-" }}{{ Math.abs(rule.points) }}
                                </span>
                                <i-ep-arrow-right />
                            </div>
                        </button>
                    </div>
                </section>
            </div>

            <section v-else class="surface-card empty-card">
                <strong>当前条件下暂无可用规则</strong>
                <p>你可以切换加分/扣分页签，或调整搜索关键字后再试。</p>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="loading" @click="visible = false">
                    关闭
                </button>
            </div>
        </template>
    </StudentsDialogShell>
</template>

<script setup lang="ts">
import type { Rule, RuleGroup } from "@/types/points";
import StudentsDialogShell from "@/v3/components/students/StudentsDialogShell.vue";
import { computed, ref, watch } from "vue";

/** 定义积分规则弹窗页签类型。 */
type SelectorTab = "all" | "plus" | "minus"

/** 定义弹窗中的积分规则展示结构。 */
type UiRule = {
    id: number
    name: string
    description: string
    icon: string
    points: number
    sign: "plus" | "minus"
}

/** 定义弹窗中的积分规则组展示结构。 */
type UiGroup = {
    id: number
    name: string
    description: string
    icon: string
    rules: UiRule[]
}

/** 定义积分规则弹窗属性结构。 */
interface StudentsPointsRuleDialogProps {
    modelValue: boolean
    tab?: SelectorTab
    groups: RuleGroup[]
    loading?: boolean
}

const props = withDefaults(defineProps<StudentsPointsRuleDialogProps>(), {
    tab: "plus",
    loading: false
})

const emit = defineEmits<{
    (event: "update:modelValue", value: boolean): void
    (event: "update:tab", value: SelectorTab): void
    (event: "select", rule: UiRule): void
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
                        description: (rule.description ?? "").trim(),
                        icon: (rule.icon ?? "").trim(),
                        points: toNumber(rule.points, 0),
                        sign: inferRuleSign(rule)
                    }
                })
                .filter((rule): rule is UiRule => rule !== null)

            return {
                id: groupId,
                name: groupName,
                description: (group.description ?? "").trim(),
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
                    || rule.description.toLowerCase().includes(normalizedKeyword)

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
    if (props.loading) {
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
    gap: 18px;
}

.mode-switch,
.dialog-actions,
.meta-tags,
.group-head {
    display: flex;
    align-items: center;
    gap: 10px;
}

.mode-switch,
.meta-tags {
    flex-wrap: wrap;
}

.mode-switch__button,
.ghost-button,
.rule-card {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.mode-switch__button,
.ghost-button {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 16px;
}

.mode-switch__button,
.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.mode-switch__button.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.mode-switch__button:hover,
.ghost-button:hover,
.rule-card:hover {
    transform: translateY(-2px);
}

.mode-switch__button:disabled,
.ghost-button:disabled,
.rule-card:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
}

.surface-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 14px;
}

.section-head h4,
.section-head p {
    margin: 0;
}

.section-head h4 {
    color: #16213e;
    font-size: 18px;
}

.section-head p {
    margin-top: 6px;
    color: #627099;
    line-height: 1.7;
}

.meta-tags {
    justify-content: flex-end;
}

.meta-tag {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.selector-layout {
    display: grid;
    grid-template-columns: minmax(200px, 240px) minmax(0, 1fr);
    gap: 16px;
    min-height: 0;
}

.group-sidebar,
.rules-panel {
    min-height: 0;
}

.group-sidebar {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
}

.rules-panel {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 12px;
}

.section-head--compact {
    margin-bottom: 0;
}

.group-nav-list {
    display: grid;
    gap: 10px;
    min-height: 0;
    max-height: 52vh;
    padding-right: 4px;
    overflow-y: auto;
}

.group-nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.88);
    text-align: left;
}

.group-nav-item.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.1);
    box-shadow: 0 10px 22px rgba(85, 104, 255, 0.1);
}

.group-nav-item__icon {
    flex-shrink: 0;
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: rgba(85, 104, 255, 0.08);
    font-size: 18px;
}

.group-nav-item__body {
    display: grid;
    gap: 4px;
    min-width: 0;
}

.group-nav-item__body strong,
.group-nav-item__body small {
    display: block;
}

.group-nav-item__body strong {
    color: #16213e;
    font-size: 15px;
    line-height: 1.4;
}

.group-nav-item__body small {
    color: #627099;
    font-size: 12px;
}

.group-head {
    align-items: flex-start;
}

.group-head__icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: rgba(85, 104, 255, 0.08);
    font-size: 18px;
}

.rule-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    min-height: 0;
    max-height: 52vh;
    padding: 4px 4px 0 0;
    overflow-y: auto;
}

.rule-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 72px;
    padding: 14px 16px;
    border-radius: 20px;
    text-align: left;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(122, 141, 198, 0.18);
}

.rule-card--plus {
    box-shadow: 0 10px 24px rgba(85, 104, 255, 0.08);
}

.rule-card--minus {
    box-shadow: 0 10px 24px rgba(255, 107, 129, 0.08);
}

.rule-card--plus:hover {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.06);
}

.rule-card--minus:hover {
    border-color: rgba(255, 107, 129, 0.24);
    background: rgba(255, 107, 129, 0.06);
}

.rule-card__body {
    min-width: 0;
}

.rule-card__body strong {
    display: block;
    color: #16213e;
    font-size: 15px;
    line-height: 1.45;
}

.rule-card__body p {
    margin: 4px 0 0;
    color: #627099;
    font-size: 13px;
    line-height: 1.5;
}

.rule-card__meta {
    display: grid;
    justify-items: end;
    gap: 8px;
    flex-shrink: 0;
    color: #8a96b8;
}

.rule-card__points {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 64px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 800;
}

.rule-card--plus .rule-card__points {
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.rule-card--minus .rule-card__points {
    background: rgba(255, 107, 129, 0.12);
    color: #d92d20;
}

.empty-card strong {
    display: block;
    font-size: 18px;
}

.empty-card p {
    margin: 10px 0 0;
    color: #627099;
    line-height: 1.7;
}

.dialog-actions {
    justify-content: flex-end;
}

.students-points-rule-dialog :deep(.el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.students-points-rule-dialog :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 768px) {
    .selector-layout {
        grid-template-columns: 1fr;
    }

    .section-head,
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .meta-tags {
        justify-content: flex-start;
    }

    .rule-grid {
        grid-template-columns: 1fr;
        max-height: none;
        overflow: visible;
    }

    .group-nav-list {
        max-height: none;
        overflow: visible;
    }
}
</style>
