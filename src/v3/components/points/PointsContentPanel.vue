<template>
    <section class="points-content-panel">
        <section class="panel-surface content-switch-panel">
            <div class="panel-head">
                <div class="content-switch-copy">
                    <h3>数据切换</h3>
                    <p>可在排行榜与历史记录之间切换。</p>
                </div>
                <div class="segmented-control">
                    <button type="button" class="chip-button" :class="{ 'is-active': activeContentTab === 'ranking' }"
                        @click="handleSelectContentTab('ranking')">
                        排行榜
                    </button>
                    <button type="button" class="chip-button" :class="{ 'is-active': activeContentTab === 'records' }"
                        @click="handleSelectContentTab('records')">
                        历史记录
                    </button>
                </div>
            </div>
        </section>

        <section class="content-grid content-grid--single">
            <Transition name="content-panel" mode="out-in">
                <article v-if="activeContentTab === 'ranking'" key="ranking" class="panel-surface ranking-panel">
                    <div class="panel-head panel-head--stack">
                        <div>
                            <h3>积分排行榜</h3>
                            <p>支持总榜、单项榜以及时间范围切换。</p>
                        </div>
                        <div class="toolbar-row toolbar-row--wrap">
                            <button type="button" class="ghost-button ghost-button--small" @click="toggleRankingMask">
                                <i-ep-view aria-hidden="true" />
                                <span>{{ isRankingMasked ? "显示" : "隐藏" }}</span>
                            </button>

                            <span class="toolbar-divider" aria-hidden="true"></span>

                            <div class="segmented-control">
                                <button type="button" class="chip-button"
                                    :class="{ 'is-active': activeRankingTab === 'total' }"
                                    @click="handleSelectRankingTab('total')">
                                    总榜
                                </button>
                                <button type="button" class="chip-button"
                                    :class="{ 'is-active': activeRankingTab === 'item' }"
                                    @click="handleSelectRankingTab('item')">
                                    单项榜
                                </button>
                            </div>

                            <span class="toolbar-divider" aria-hidden="true"></span>

                            <div class="segmented-control">
                                <button v-for="item in rankingRangeOptions" :key="item.value" type="button"
                                    class="chip-button" :class="{ 'is-active': currentRankingTimeRange === item.value }"
                                    @click="currentRankingTimeRange = item.value">
                                    {{ item.label }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div v-if="activeRankingTab === 'item'" class="ranking-select-row">
                        <label class="field-block">
                            <span class="field-label">积分项</span>
                            <el-select v-model="currentSelectedRankingRuleId" placeholder="请选择积分项" class="field-full">
                                <el-option v-for="rule in ruleOptions" :key="rule.id"
                                    :label="`${rule.groupName ? `${rule.groupName} / ` : ''}${rule.name}`"
                                    :value="rule.id" />
                            </el-select>
                        </label>
                    </div>

                    <div v-if="rankingItems.length > 0" class="ranking-list" v-loading="rankingLoading">
                        <article v-for="item in rankingItems" :key="item.id" class="ranking-item"
                            :class="item.rankClass">
                            <div class="ranking-item__rank" :class="item.rankClass">{{ item.rankLabel }}</div>
                            <div class="ranking-item__content">
                                <div class="ranking-item__name">
                                    <i-ep-trophy v-if="item.rankClass === 'is-top-1'" class="ranking-item__icon"
                                        :class="item.rankClass" />
                                    <i-ep-medal v-else-if="item.rankClass === 'is-top-2'" class="ranking-item__icon"
                                        :class="item.rankClass" />
                                    <i-ep-star-filled v-else-if="item.rankClass === 'is-top-3'"
                                        class="ranking-item__icon" :class="item.rankClass" />
                                    <strong>{{ getRankingNameLabel(item.name) }}</strong>
                                </div>
                            </div>
                            <div class="ranking-item__score">
                                <span>{{ getRankingScoreLabel(item.scoreLabel) }}</span>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-state">
                        <strong>暂无排行榜数据</strong>
                        <p>{{ activeRankingTab === "item" ? "请先选择一个积分项，或等待该积分项产生记录。" : "当前范围内还没有可展示的积分排行。" }}</p>
                    </div>
                </article>

                <article v-else key="records" class="panel-surface records-panel">
                    <div class="panel-head panel-head--stack">
                        <div>
                            <h3>积分规则记录</h3>
                            <p>保留课堂最新操作记录，并支持在当前页快速撤回最近一次规则积分。</p>
                        </div>
                        <div class="toolbar-row toolbar-row--wrap">
                            <button type="button" class="ghost-button ghost-button--small" :disabled="recordsLoading"
                                @click="emit('refresh-records')">
                                刷新记录
                            </button>
                            <button type="button" class="ghost-button ghost-button--small" :disabled="!canMutatePoints"
                                @click="emit('undo-latest-record')">
                                撤回最近一次
                            </button>
                        </div>
                    </div>

                    <div class="records-filter-grid">
                        <label class="field-block">
                            <span class="field-label">学生搜索</span>
                            <div class="search-box">
                                <i-ep-search class="search-box__icon" />
                                <input v-model="currentHistoryKeyword" type="search" class="search-box__input"
                                    placeholder="搜索学生姓名">
                            </div>
                        </label>

                        <div class="field-block">
                            <span class="field-label">记录类型</span>
                            <div class="segmented-control">
                                <button v-for="item in historySignOptions" :key="item.value" type="button"
                                    class="chip-button" :class="{ 'is-active': historySign === item.value }"
                                    @click="emit('select-history-sign', item.value)">
                                    {{ item.label }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div v-if="historyRecords.length > 0" class="record-list" v-loading="recordsLoading">
                        <article v-for="record in historyRecords" :key="record.id" class="record-item">
                            <div class="record-item__score"
                                :class="inferRecordDelta(record) < 0 ? 'is-minus' : 'is-plus'">
                                {{ inferRecordDelta(record) > 0 ? "+" : "" }}{{ inferRecordDelta(record) }}
                            </div>

                            <div class="record-item__content">
                                <div class="record-item__summary">
                                    <strong>{{ record.rule_desc?.trim() || "未命名积分规则" }}</strong>
                                    <span class="record-item__student">{{ record.student_name?.trim() || `学生
                                        ${record.student_id || "-"}` }}</span>
                                </div>
                                <div class="record-item__meta">
                                    <span>{{ getRecordSourceLabel(record) }}</span>
                                    <span>{{ getRecordTimeLabel(record) }}</span>
                                </div>
                            </div>

                            <button type="button" class="text-button" :disabled="!canUndoRecord(record)"
                                @click="emit('undo-record', record)">
                                撤回
                            </button>
                        </article>
                    </div>

                    <div v-else class="empty-state">
                        <strong>暂无积分记录</strong>
                        <p>当课堂开始进行加减分、导入积分或商城兑换后，会在这里看到完整记录。</p>
                    </div>

                    <div v-if="historyPageCount > 1" class="pagination-row">
                        <button type="button" class="ghost-button ghost-button--small"
                            :disabled="historyPage <= 1 || recordsLoading" @click="emit('go-prev-history-page')">
                            上一页
                        </button>
                        <span class="pagination-row__label">{{ `第 ${historyPage} / ${historyPageCount} 页` }}</span>
                        <button type="button" class="ghost-button ghost-button--small"
                            :disabled="historyPage >= historyPageCount || recordsLoading"
                            @click="emit('go-next-history-page')">
                            下一页
                        </button>
                    </div>
                </article>
            </Transition>
        </section>
    </section>
</template>

<script setup lang="ts">
import type { RankingTimeRange, Record as PointsApplyRecord } from "@/types/points";
import { useCacheStore } from "@/stores/cacheStore";
import { computed, ref } from "vue";

defineOptions({ name: "PointsContentPanel" })

/** 定义积分页底部内容页签。 */
type PointsContentTab = "ranking" | "records"

/** 定义排行榜时间范围选项。 */
interface RankingRangeOption {
    label: string
    value: RankingTimeRange
}

/** 定义历史记录类型选项。 */
interface HistorySignOption {
    label: string
    value: "all" | "plus" | "minus"
}

/** 定义积分项筛选选项。 */
interface RuleOption {
    groupName: string
    id: number
    name: string
    sign: "plus" | "minus"
}

/** 定义排行榜展示结构。 */
interface RankingDisplayItem {
    id: number
    name: string
    rankClass: string
    rankLabel: string
    scoreLabel: string
}

/** 定义榜单与历史记录面板属性。 */
interface PointsContentPanelProps {
    activeContentTab: PointsContentTab
    activeRankingTab: "total" | "item"
    canMutatePoints: boolean
    canUndoRecord: (record: PointsApplyRecord) => boolean
    getRecordSourceLabel: (record: PointsApplyRecord) => string
    getRecordTimeLabel: (record: PointsApplyRecord) => string
    historyKeyword: string
    historyPage: number
    historyPageCount: number
    historyRecords: PointsApplyRecord[]
    historySign: "all" | "plus" | "minus"
    historySignOptions: HistorySignOption[]
    inferRecordDelta: (record: PointsApplyRecord) => number
    rankingItems: RankingDisplayItem[]
    rankingLoading: boolean
    rankingRangeOptions: RankingRangeOption[]
    rankingTimeRange: RankingTimeRange
    recordsLoading: boolean
    ruleOptions: RuleOption[]
    selectedRankingRuleId: number
}

const props = defineProps<PointsContentPanelProps>()
const cacheStore = useCacheStore()
const isRankingMasked = ref<boolean>(cacheStore.getDashboardRankingPreviewMasked())

const emit = defineEmits<{
    (e: "go-next-history-page"): void
    (e: "go-prev-history-page"): void
    (e: "refresh-records"): void
    (e: "select-content-tab", value: PointsContentTab): void
    (e: "select-history-sign", value: "all" | "plus" | "minus"): void
    (e: "select-ranking-tab", value: "total" | "item"): void
    (e: "undo-latest-record"): void
    (e: "undo-record", value: PointsApplyRecord): void
    (e: "update:historyKeyword", value: string): void
    (e: "update:rankingTimeRange", value: RankingTimeRange): void
    (e: "update:selectedRankingRuleId", value: number): void
}>()

const currentHistoryKeyword = computed({
    get: () => props.historyKeyword,
    set: (value: string) => emit("update:historyKeyword", value)
})

const currentRankingTimeRange = computed({
    get: () => props.rankingTimeRange,
    set: (value: RankingTimeRange) => emit("update:rankingTimeRange", value)
})

const currentSelectedRankingRuleId = computed({
    get: () => props.selectedRankingRuleId,
    set: (value: number) => emit("update:selectedRankingRuleId", value)
})

/** 切换当前显示的内容面板。 */
function handleSelectContentTab(tab: PointsContentTab): void {
    emit("select-content-tab", tab)
}

/** 切换当前显示的排行榜类型。 */
function handleSelectRankingTab(tab: "total" | "item"): void {
    emit("select-ranking-tab", tab)
}

/** 返回排行榜脱敏后的展示文本。 */
function getMaskedRankingText(): string {
    return "***"
}

/** 返回排行榜姓名展示文本。 */
function getRankingNameLabel(name: string): string {
    return isRankingMasked.value ? getMaskedRankingText() : name
}

/** 返回排行榜积分展示文本。 */
function getRankingScoreLabel(scoreLabel: string): string {
    return isRankingMasked.value ? getMaskedRankingText() : scoreLabel
}

/** 切换排行榜脱敏显示状态。 */
function toggleRankingMask(): void {
    isRankingMasked.value = !isRankingMasked.value
    cacheStore.setDashboardRankingPreviewMasked(isRankingMasked.value)
}
</script>

<style scoped>
.points-content-panel,
.content-grid {
    display: grid;
    gap: 14px;
}

.content-switch-panel {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
}

.content-switch-panel .panel-head {
    justify-content: flex-start;
}

.content-switch-copy {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.panel-surface {
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
.segmented-control,
.record-item__meta,
.pagination-row,
.ranking-item,
.ranking-item__name,
.record-item,
.record-item__summary {
    display: flex;
    align-items: center;
}

.panel-head,
.pagination-row {
    justify-content: space-between;
    gap: 14px;
}

.panel-head--stack {
    align-items: flex-start;
}

.panel-head h3 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.015em;
}

.panel-head p {
    margin: 5px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 14px;
    line-height: 1.5;
}

.toolbar-row {
    justify-content: flex-end;
    gap: 7px;
    flex-wrap: wrap;
}

.segmented-control {
    min-height: 34px;
    padding: 3px;
    gap: 2px;
    border-radius: 10px;
    background: #e9e9ed;
}

.chip-button,
.ghost-button,
.text-button {
    border: 0;
    cursor: pointer;
}

.chip-button {
    min-height: 28px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 13px;
    white-space: nowrap;
}

.chip-button.is-active {
    color: var(--ta-text);
    background: #ffffff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    font-weight: 620;
}

.ghost-button {
    min-height: 38px;
    padding: 0 13px;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 14px;
    font-weight: 620;
    white-space: nowrap;
}

.text-button {
    padding: 4px 0;
    color: var(--ta-blue);
    background: transparent;
    font-size: 14px;
    font-weight: 600;
}

.toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--ta-line);
}

.ranking-select-row {
    max-width: 360px;
    margin: 14px 0;
}

.field-block {
    display: grid;
    gap: 6px;
}

.field-label {
    color: var(--ta-text-secondary);
    font-size: 13px;
    font-weight: 600;
}

.field-full {
    width: 100%;
}

.ranking-list,
.record-list {
    display: grid;
    margin-top: 12px;
}

.ranking-item,
.record-item {
    min-height: 58px;
    padding: 10px 2px;
    gap: 12px;
    border-top: 1px solid var(--ta-line);
}

.ranking-item:first-child,
.record-item:first-child {
    border-top: 0;
}

.ranking-item__rank {
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    font-weight: 700;
}

.ranking-item__rank.is-top-1,
.ranking-item__rank.is-top-2,
.ranking-item__rank.is-top-3 {
    color: #8a5c00;
    background: #fff0c2;
}

.ranking-item__content,
.record-item__content {
    min-width: 0;
    flex: 1;
}

.ranking-item__name {
    gap: 6px;
}

.ranking-item__name strong,
.record-item__summary strong {
    min-width: 0;
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ranking-item__icon {
    width: 16px;
    height: 16px;
    color: #c58a00;
}

.ranking-item__score span {
    color: var(--ta-text-secondary);
    font-size: 15px;
    font-weight: 650;
    white-space: nowrap;
}

.records-filter-grid {
    margin: 14px 0 4px;
    display: grid;
    grid-template-columns: minmax(240px, 1fr) auto;
    gap: 12px;
    align-items: end;
}

.search-box {
    position: relative;
}

.search-box__icon {
    position: absolute;
    left: 11px;
    top: 50%;
    width: 16px;
    height: 16px;
    color: var(--ta-text-tertiary);
    transform: translateY(-50%);
}

.search-box__input {
    width: 100%;
    min-height: 40px;
    padding: 0 12px 0 37px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 10px;
    color: var(--ta-text);
    background: rgba(255, 255, 255, 0.9);
    outline: 0;
}

.search-box__input:focus {
    border-color: rgba(0, 122, 255, 0.65);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.record-item__score {
    width: 54px;
    flex: 0 0 auto;
    font-size: 17px;
    font-weight: 700;
    text-align: center;
}

.record-item__score.is-plus {
    color: var(--ta-green);
}

.record-item__score.is-minus {
    color: var(--ta-red);
}

.record-item__summary {
    gap: 8px;
    flex-wrap: wrap;
}

.record-item__student {
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.record-item__meta {
    margin-top: 4px;
    gap: 8px;
    flex-wrap: wrap;
}

.record-item__meta span {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.empty-state {
    min-height: 180px;
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

.pagination-row {
    margin-top: 14px;
    justify-content: center;
}

.pagination-row__label {
    color: var(--ta-text-tertiary);
    font-size: 13px;
}

.content-panel-enter-active,
.content-panel-leave-active {
    transition: opacity 180ms ease, transform 210ms cubic-bezier(.2, .8, .2, 1);
}

.content-panel-enter-from,
.content-panel-leave-to {
    opacity: 0;
    transform: translateY(5px);
}

@media (max-width: 660px) {
    .panel-surface {
        padding: 16px;
    }

    .content-switch-panel {
        padding: 0;
    }

    .ranking-panel > .panel-head,
    .records-panel > .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .ranking-panel > .panel-head .toolbar-row,
    .records-panel > .panel-head .toolbar-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        justify-content: stretch;
    }

    .ranking-panel > .panel-head .toolbar-row > *,
    .records-panel > .panel-head .toolbar-row > * {
        min-width: 0;
    }

    .ranking-panel > .panel-head .toolbar-row .segmented-control {
        grid-column: 1 / -1;
        width: 100%;
    }

    .ranking-panel > .panel-head .toolbar-row .chip-button {
        flex: 1 1 0;
    }

    .toolbar-divider {
        display: none;
    }

    .records-filter-grid {
        grid-template-columns: 1fr;
    }

    .ranking-item,
    .record-item {
        align-items: flex-start;
    }

    .record-item__score {
        width: 38px;
        text-align: left;
    }
}
</style>
