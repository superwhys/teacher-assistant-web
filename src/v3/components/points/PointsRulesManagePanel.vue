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
.panel-surface {
    border: 1px solid rgba(122, 141, 198, 0.18);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    padding: 22px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.84);
    backdrop-filter: blur(16px);
}

.panel-head,
.toolbar-row,
.rules-workspace,
.rule-groups-panel__head,
.rule-groups-panel__actions,
.rule-items-panel__toolbar,
.rule-item-row__title,
.rule-item-row__actions {
    display: flex;
    align-items: center;
}

.panel-head {
    justify-content: space-between;
    gap: 16px;
}

.panel-head--stack {
    align-items: flex-start;
}

.panel-head h3,
.rule-items-panel__title h4,
.panel-head p,
.empty-state p {
    margin: 0;
}

.toolbar-row,
.rule-groups-panel__actions,
.rule-item-row__actions {
    flex-wrap: wrap;
    gap: 10px;
}

.toolbar-row--wrap {
    justify-content: flex-end;
}

.toolbar-action-button {
    min-height: 48px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.78);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.toolbar-action-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(85, 104, 255, 0.12);
}

.toolbar-action-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.summary-eyebrow {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.status-chip,
.points-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
}

.status-chip {
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
}

.status-chip--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.ghost-button,
.primary-button,
.danger-button {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button,
.primary-button,
.danger-button {
    min-height: 46px;
    padding: 0 18px;
    border-radius: 16px;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.danger-button {
    background: rgba(239, 68, 68, 0.12);
    color: #d92d20;
}

.ghost-button--small,
.primary-button--small,
.danger-button--small {
    min-height: 40px;
    padding: 0 14px;
    border-radius: 14px;
}

.ghost-button:hover,
.primary-button:hover,
.danger-button:hover,
.rule-group-card:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled,
.primary-button:disabled,
.danger-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.rule-shell {
    display: grid;
    gap: 18px;
    margin-top: 16px;
}

.rules-workspace {
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
    gap: 18px;
    align-items: start;
}

.rule-groups-panel,
.rule-items-panel {
    border: 1px solid rgba(122, 141, 198, 0.16);
    box-shadow: 0 10px 24px rgba(71, 90, 150, 0.1);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.88);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: min(68vh, 620px);
    min-height: 0;
    overflow: hidden;
}

.rule-groups-panel__head,
.rule-groups-panel__actions,
.rule-items-panel__toolbar {
    justify-content: space-between;
    gap: 12px;
}

.rule-groups-panel__create {
    width: 100%;
}

.rule-items-panel__title h4 {
    color: #16213e;
    font-size: 26px;
    margin-top: 8px;
}

.rule-groups-list,
.rule-item-list {
    display: grid;
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
    padding-right: 6px;
    scrollbar-gutter: stable;
}

.rule-group-card,
.rule-item-row {
    border: 1px solid rgba(122, 141, 198, 0.16);
    background: linear-gradient(180deg, rgba(247, 249, 255, 0.96), rgba(255, 255, 255, 0.92));
    box-shadow: 0 10px 20px rgba(71, 90, 150, 0.08);
}

.rule-group-card {
    width: 100%;
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: 20px;
    text-align: left;
}

.rule-group-card.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.12), rgba(255, 255, 255, 0.96));
}

.rule-group-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.rule-group-card__head strong,
.rule-item-row__title strong,
.empty-state strong {
    color: #16213e;
    font-size: 17px;
}

.rule-group-card__head span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.rule-group-card p,
.rule-item-row__main p {
    margin: 0;
    color: #627099;
    line-height: 1.7;
}

.rule-items-panel__head {
    display: grid;
    gap: 16px;
    align-items: start;
}

.rule-items-panel__toolbar {
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(85, 104, 255, 0.06);
}

.rule-items-panel__hint {
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

.rule-items-panel__toolbar-actions,
.filter-button-group {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.rule-items-panel__toolbar-actions {
    justify-content: flex-end;
}

.filter-button-group {
    padding: 4px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(122, 141, 198, 0.16);
}

.filter-button {
    min-height: 36px;
    padding: 0 14px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #627099;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
}

.filter-button:hover {
    transform: translateY(-1px);
}

.filter-button.is-active {
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.filter-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.rule-item-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
    border-radius: 20px;
}

.rule-item-row__main {
    min-width: 0;
}

.rule-item-row__title {
    justify-content: flex-start;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

.points-badge {
    width: fit-content;
}

.points-badge.is-plus {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.points-badge.is-minus {
    color: #d92d20;
    background: rgba(239, 68, 68, 0.12);
}

.empty-state {
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 220px;
    padding: 24px;
    border: 1px dashed rgba(122, 141, 198, 0.24);
    border-radius: 24px;
    background: rgba(247, 249, 255, 0.72);
    text-align: center;
}

.empty-state p {
    color: #627099;
    line-height: 1.7;
}

@media (max-width: 1080px) {
    .rules-workspace {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .panel-head,
    .rule-groups-panel__head,
    .rule-groups-panel__actions,
    .rule-items-panel__toolbar,
    .rule-item-row {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar-row--wrap {
        justify-content: flex-start;
    }

    .toolbar-action-button {
        width: 100%;
    }

    .rule-items-panel__toolbar-actions {
        justify-content: flex-start;
    }
}
</style>
