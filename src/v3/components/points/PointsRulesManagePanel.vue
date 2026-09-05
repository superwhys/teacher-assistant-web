<template>
    <section class="panel-surface rules-panel">
        <div class="panel-head panel-head--stack">
            <div>
                <h3>积分规则</h3>
            </div>
            <div class="toolbar-row toolbar-row--wrap">
                <button type="button" class="toolbar-action-button" :disabled="!canMutatePoints" @click="emit('import-items')">
                    <i-ep-upload-filled />
                    导入积分项
                </button>
                <button
                    type="button"
                    class="toolbar-action-button"
                    :disabled="!canMutatePoints"
                    @click="emit('import-records')"
                >
                    <i-ep-upload-filled />
                    导入积分
                </button>
                <button
                    type="button"
                    class="toolbar-action-button"
                    :disabled="!hasActiveClass"
                    @click="emit('open-export')"
                >
                    <i-ep-download />
                    导出结果
                </button>
            </div>
        </div>

        <div v-if="ruleGroups.length > 0" class="rule-shell" v-loading="ruleGroupsLoading">
            <div class="rules-workspace">
                <aside class="rule-groups-panel">
                    <div class="rule-groups-panel__head">
                        <div>
                            <span class="summary-eyebrow">规则组列表</span>
                        </div>
                        <span class="status-chip status-chip--sky">{{ `${ruleGroups.length} 个规则组` }}</span>
                    </div>

                    <button
                        type="button"
                        class="primary-button primary-button--small rule-groups-panel__create"
                        :disabled="!canMutatePoints"
                        @click="emit('create-group')"
                    >
                        <i-ep-plus />
                        <span>新增规则组</span>
                    </button>

                    <div class="rule-groups-list">
                        <button
                            v-for="group in ruleGroups"
                            :key="group.id"
                            type="button"
                            class="rule-group-card"
                            :class="{ 'is-active': selectedRuleGroupId === toNumber(group.id, 0) }"
                            @click="handleSelectGroup(toNumber(group.id, 0))"
                        >
                            <div class="rule-group-card__head">
                                <strong>{{ group.name || "未命名规则组" }}</strong>
                                <span>{{ group.rules?.length ?? 0 }} 项</span>
                            </div>
                        </button>
                    </div>

                    <div class="rule-groups-panel__actions">
                        <button
                            type="button"
                            class="ghost-button ghost-button--small"
                            :disabled="!canMutatePoints || !selectedRuleGroup"
                            @click="emit('edit-group')"
                        >
                            编辑规则组
                        </button>
                        <button
                            type="button"
                            class="danger-button danger-button--small"
                            :disabled="!canMutatePoints || !selectedRuleGroup"
                            @click="emit('delete-group')"
                        >
                            删除规则组
                        </button>
                    </div>
                </aside>

                <section class="rule-items-panel">
                    <div class="rule-items-panel__head">
                        <div class="rule-items-panel__title">
                            <span class="summary-eyebrow">当前规则组</span>
                            <h4>{{ selectedRuleGroup?.name || "未选择规则组" }}</h4>
                        </div>
                    </div>

                    <div class="rule-items-panel__toolbar">
                        <span class="rule-items-panel__hint">当前规则组下的积分项会直接用于课堂积分操作与单项榜展示。</span>
                        <div class="rule-items-panel__toolbar-actions">
                            <div class="filter-button-group">
                                <button
                                    type="button"
                                    class="filter-button"
                                    :class="{ 'is-active': currentRuleViewFilter === 'all' }"
                                    :disabled="!selectedRuleGroup"
                                    @click="handleSelectRuleViewFilter('all')"
                                >
                                    全部
                                </button>
                                <button
                                    type="button"
                                    class="filter-button"
                                    :class="{ 'is-active': currentRuleViewFilter === 'plus' }"
                                    :disabled="!selectedRuleGroup"
                                    @click="handleSelectRuleViewFilter('plus')"
                                >
                                    加分
                                </button>
                                <button
                                    type="button"
                                    class="filter-button"
                                    :class="{ 'is-active': currentRuleViewFilter === 'minus' }"
                                    :disabled="!selectedRuleGroup"
                                    @click="handleSelectRuleViewFilter('minus')"
                                >
                                    减分
                                </button>
                            </div>

                            <button
                                type="button"
                                class="primary-button primary-button--small"
                                :disabled="!canMutatePoints || !selectedRuleGroup"
                                @click="emit('create-rule')"
                            >
                                新增积分项
                            </button>
                        </div>
                    </div>

                    <div v-if="selectedRuleGroupRules.length === 0" class="empty-state">
                        <strong>当前规则组还没有积分项</strong>
                        <p>可以先新增一个积分项，作为课堂加分或扣分的标准动作。</p>
                    </div>

                    <div v-else-if="filteredRuleItems.length === 0" class="empty-state">
                        <strong>{{ filteredRuleEmptyTitle }}</strong>
                        <p>{{ filteredRuleEmptyDescription }}</p>
                    </div>

                    <div v-else class="rule-item-list">
                        <article v-for="rule in filteredRuleItems" :key="rule.id" class="rule-item-row">
                            <div class="rule-item-row__main">
                                <div class="rule-item-row__title">
                                    <strong>{{ rule.name || "未命名积分项" }}</strong>
                                    <span class="points-badge" :class="inferRuleSign(rule) === 'minus' ? 'is-minus' : 'is-plus'">
                                        {{ inferRuleSign(rule) === "minus" ? "-" : "+" }}{{ Math.abs(toNumber(rule.points, 0)) }}
                                    </span>
                                </div>
                            </div>

                            <div class="rule-item-row__actions">
                                <button
                                    type="button"
                                    class="ghost-button ghost-button--small"
                                    :disabled="!canMutatePoints"
                                    @click="emit('edit-rule', rule)"
                                >
                                    编辑
                                </button>
                                <button
                                    type="button"
                                    class="danger-button danger-button--small"
                                    :disabled="!canMutatePoints"
                                    @click="emit('delete-rule', rule)"
                                >
                                    删除
                                </button>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
        </div>

        <div v-else class="empty-state">
            <strong>还没有积分规则</strong>
            <p>可以先新增规则组，或者直接通过 Excel 批量导入积分项。</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import type { Rule, RuleGroup } from "@/types/points";
import { computed, ref } from "vue";

defineOptions({ name: "PointsRulesManagePanel" })

/** 定义积分规则管理面板属性。 */
interface PointsRulesManagePanelProps {
    canMutatePoints: boolean
    hasActiveClass: boolean
    ruleGroups: RuleGroup[]
    ruleGroupsLoading: boolean
    selectedRuleGroup: RuleGroup | null
    selectedRuleGroupId: number
    selectedRuleGroupRules: Rule[]
}

/** 定义当前规则组的积分项筛选类型。 */
type RuleViewFilter = "all" | "plus" | "minus"

const props = defineProps<PointsRulesManagePanelProps>()

const emit = defineEmits<{
    (e: "create-group"): void
    (e: "create-rule"): void
    (e: "delete-group"): void
    (e: "delete-rule", rule: Rule): void
    (e: "edit-group"): void
    (e: "edit-rule", rule: Rule): void
    (e: "import-items"): void
    (e: "import-records"): void
    (e: "open-export"): void
    (e: "update:selectedRuleGroupId", value: number): void
}>()

const currentRuleViewFilter = ref<RuleViewFilter>("all")

const filteredRuleItems = computed<Rule[]>(() => {
    if (currentRuleViewFilter.value === "all") {
        return props.selectedRuleGroupRules
    }

    return props.selectedRuleGroupRules.filter((rule) => inferRuleSign(rule) === currentRuleViewFilter.value)
})

const filteredRuleEmptyTitle = computed<string>(() => {
    if (currentRuleViewFilter.value === "plus") {
        return "当前规则组还没有加分项"
    }
    if (currentRuleViewFilter.value === "minus") {
        return "当前规则组还没有扣分项"
    }
    return "当前规则组还没有积分项"
})

const filteredRuleEmptyDescription = computed<string>(() => {
    if (currentRuleViewFilter.value === "plus") {
        return "可以新增一个加分项，用于鼓励课堂表现优秀的学生。"
    }
    if (currentRuleViewFilter.value === "minus") {
        return "可以新增一个扣分项，用于约束课堂纪律或作业规范。"
    }
    return "可以先新增一个积分项，作为课堂加分或扣分的标准动作。"
})

/** 安全地将任意值转换为数字。 */
function toNumber(value: unknown, fallback = 0): number {
    const parsedValue = typeof value === "number" ? value : Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : fallback
}

/** 推断当前积分项是加分还是扣分。 */
function inferRuleSign(rule: Rule): "plus" | "minus" {
    const pointsType = toNumber(rule.points_type, 0)
    if (pointsType === 2) {
        return "minus"
    }
    if (pointsType === 1) {
        return "plus"
    }
    return toNumber(rule.points, 0) < 0 ? "minus" : "plus"
}

/** 切换当前选中的规则组。 */
function handleSelectGroup(groupId: number): void {
    emit("update:selectedRuleGroupId", groupId)
}

/** 切换当前规则组的积分项筛选条件。 */
function handleSelectRuleViewFilter(filter: RuleViewFilter): void {
    currentRuleViewFilter.value = filter
}
</script>

<style scoped>
.rules-panel {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
    backdrop-filter: blur(18px) saturate(150%);
}

.panel-head,
.toolbar-row,
.rule-groups-panel__head,
.rule-groups-panel__actions,
.rule-group-card__head,
.rule-items-panel__toolbar,
.rule-items-panel__toolbar-actions,
.filter-button-group,
.rule-item-row,
.rule-item-row__title,
.rule-item-row__actions {
    display: flex;
    align-items: center;
}

.panel-head {
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
}

.panel-head h3,
.rule-items-panel h4 {
    margin: 0;
    letter-spacing: -0.015em;
}

.panel-head h3 {
    font-size: 18px;
}

.toolbar-row {
    justify-content: flex-end;
    gap: 7px;
    flex-wrap: wrap;
}

.toolbar-action-button,
.ghost-button,
.primary-button,
.danger-button,
.filter-button {
    min-height: 38px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.toolbar-action-button,
.ghost-button {
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
}

.primary-button {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.18);
}

.danger-button {
    color: var(--ta-red);
    background: var(--ta-red-soft);
}

.toolbar-action-button svg,
.primary-button svg {
    width: 16px;
    height: 16px;
}

.toolbar-action-button:disabled,
.ghost-button:disabled,
.primary-button:disabled,
.danger-button:disabled,
.filter-button:disabled {
    opacity: 0.42;
}

.rule-shell {
    margin-top: 14px;
}

.rules-workspace {
    min-width: 0;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 14px;
}

.rule-groups-panel {
    min-width: 0;
    padding: 12px;
    border-radius: 16px;
    background: var(--ta-surface-muted);
}

.rule-groups-panel__head,
.rule-group-card__head,
.rule-items-panel__toolbar,
.rule-item-row {
    justify-content: space-between;
    gap: 12px;
}

.summary-eyebrow,
.rule-items-panel__hint {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.rule-groups-panel .summary-eyebrow {
    font-size: 13px;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: #0064cf;
    background: #e6f2ff;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
}

.rule-groups-panel__create {
    width: 100%;
    margin-top: 10px;
    font-size: 15px !important;
}

.rule-groups-list,
.rule-item-list {
    display: grid;
    margin-top: 10px;
}

.rule-groups-list {
    gap: 5px;
}

.rule-group-card {
    width: 100%;
    min-height: 42px;
    padding: 8px 10px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: transparent;
    text-align: left;
    cursor: pointer;
}

.rule-group-card:hover {
    background: rgba(255, 255, 255, 0.72);
}

.rule-group-card.is-active {
    color: #0065d1;
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.rule-group-card strong {
    min-width: 0;
    overflow: hidden;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.rule-group-card span {
    color: var(--ta-text-tertiary);
    font-size: 12px;
    white-space: nowrap;
}

.rule-groups-panel__actions {
    margin-top: 10px;
    justify-content: flex-start;
    gap: 7px;
    flex-wrap: wrap;
}

.rule-groups-panel__actions button {
    min-height: 32px;
    padding-inline: 8px;
    font-size: 15px !important;
}

.rule-items-panel {
    min-width: 0;
}

.rule-items-panel__title h4 {
    margin-top: 5px;
    font-size: 18px;
}

.rule-items-panel__toolbar {
    min-height: 54px;
    margin-top: 8px;
    padding: 8px 0;
    border-top: 1px solid var(--ta-line);
    border-bottom: 1px solid var(--ta-line);
}

.rule-items-panel__hint {
    line-height: 1.45;
}

.rule-items-panel__toolbar-actions,
.filter-button-group {
    justify-content: flex-end;
    gap: 5px;
    flex-wrap: wrap;
}

.filter-button-group {
    min-height: 34px;
    padding: 3px;
    border-radius: 10px;
    background: #e9e9ed;
}

.filter-button {
    min-height: 28px;
    padding: 0 10px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 13px;
}

.filter-button.is-active {
    color: var(--ta-text);
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}

.rule-item-row {
    min-height: 56px;
    padding: 9px 2px;
    border-top: 1px solid var(--ta-line);
}

.rule-item-row:first-child {
    border-top: 0;
}

.rule-item-row__main {
    min-width: 0;
    flex: 1;
}

.rule-item-row__title {
    justify-content: flex-start;
    gap: 8px;
}

.rule-item-row__title strong {
    font-size: 14px;
}

.points-badge {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 650;
}

.points-badge.is-plus {
    color: #1b7133;
    background: var(--ta-green-soft);
}

.points-badge.is-minus {
    color: #bb0012;
    background: var(--ta-red-soft);
}

.rule-item-row__actions {
    flex: 0 0 auto;
    gap: 6px;
}

.rule-item-row__actions button {
    min-height: 32px;
    padding-inline: 9px;
    font-size: 12px;
}

.empty-state {
    min-height: 190px;
    padding: 24px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 7px;
    border-radius: 14px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.empty-state strong {
    color: var(--ta-text);
    font-size: 15px;
}

.empty-state p {
    margin: 0;
    font-size: 13px;
}

@media (min-width: 1800px) {
    .rules-workspace {
        grid-template-columns: 280px minmax(0, 1fr);
    }
}

@media (max-width: 920px) {
    .rules-workspace {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 660px) {
    .rules-panel {
        padding: 16px;
    }

    .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .toolbar-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .toolbar-action-button {
        min-width: 0;
        width: 100%;
        padding-inline: 7px;
        font-size: 12px;
    }

    .rule-items-panel__toolbar,
    .rule-item-row {
        align-items: stretch;
        flex-direction: column;
    }

    .rule-items-panel__toolbar-actions,
    .rule-item-row__actions {
        justify-content: flex-start;
    }

    .rule-item-row__actions button {
        flex: 1 1 0;
    }
}
</style>
