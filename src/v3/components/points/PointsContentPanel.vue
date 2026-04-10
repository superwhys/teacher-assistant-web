<template>
    <section class="points-content-panel">
        <section class="panel-surface content-switch-panel">
            <div class="panel-head">
                <div>
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
                                {{ isRankingMasked ? "显示" : "隐藏" }}
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
.content-grid,
.records-filter-grid {
    display: grid;
    gap: 20px;
}

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
.segmented-control,
.record-item__meta,
.pagination-row {
    display: flex;
    align-items: center;
}

.panel-head,
.pagination-row {
    justify-content: space-between;
    gap: 16px;
}

.panel-head--stack {
    align-items: flex-start;
}

.ranking-panel>.panel-head {
    margin-bottom: 16px;
}

.panel-head h3,
.panel-head p,
.empty-state p,
.record-item__student {
    margin: 0;
}

.panel-head p,
.record-item__student,
.empty-state p {
    color: #627099;
    line-height: 1.7;
}

.toolbar-row,
.segmented-control,
.record-item__meta {
    flex-wrap: wrap;
    gap: 10px;
}

.toolbar-divider {
    width: 1px;
    height: 26px;
    margin: 0 6px;
    background: rgba(122, 141, 198, 0.26);
    border-radius: 999px;
    flex: 0 0 auto;
}

.ghost-button,
.chip-button,
.text-button {
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button,
.chip-button {
    min-height: 46px;
    padding: 0 18px;
    border-radius: 16px;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.chip-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.chip-button.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.ghost-button--small {
    min-height: 40px;
    padding: 0 14px;
    border-radius: 14px;
}

.text-button {
    padding: 0;
    background: transparent;
    color: #5568ff;
    font-weight: 700;
}

.ghost-button:hover,
.chip-button:hover,
.text-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled,
.chip-button:disabled,
.text-button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.content-grid--single {
    grid-template-columns: minmax(0, 1fr);
}

.content-panel-enter-active,
.content-panel-leave-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
}

.content-panel-enter-from,
.content-panel-leave-to {
    opacity: 0;
    transform: translateY(8px);
}

.ranking-select-row {
    margin-bottom: 16px;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-label {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.field-full {
    width: 100%;
}

.records-filter-grid {
    grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
    margin-bottom: 18px;
}

.search-box {
    position: relative;
}

.search-box__icon {
    position: absolute;
    top: 50%;
    left: 16px;
    color: #8a96b8;
    transform: translateY(-50%);
}

.search-box__input {
    width: 100%;
    min-height: 52px;
    padding: 0 16px 0 44px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    font: inherit;
    outline: none;
}

.search-box__input:focus {
    border-color: rgba(85, 104, 255, 0.4);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

.ranking-list,
.record-list {
    display: grid;
    gap: 14px;
}

.ranking-list {
    grid-auto-flow: column;
    grid-template-rows: repeat(5, minmax(86px, auto));
    grid-auto-columns: minmax(0, 1fr);
    align-items: start;
    max-height: calc(5 * 86px + 4 * 14px);
    overflow-y: auto;
    padding-right: 6px;
    scrollbar-gutter: stable;
}

.ranking-item,
.record-item {
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(247, 249, 255, 0.96), rgba(255, 255, 255, 0.9));
}

.ranking-item {
    position: relative;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    min-height: 86px;
    padding: 14px 18px;
    overflow: hidden;
}

.ranking-item::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    border-radius: 22px 0 0 22px;
    background: transparent;
}

.ranking-item__rank {
    width: 54px;
    height: 54px;
    display: grid;
    place-items: center;
    border-radius: 18px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 18px;
    font-weight: 800;
}

.ranking-item__rank.is-top-1 {
    background: rgba(255, 182, 72, 0.16);
    color: #b54708;
}

.ranking-item.is-top-1 {
    border-color: rgba(255, 182, 72, 0.34);
    background: linear-gradient(180deg, rgba(255, 248, 235, 0.96), rgba(255, 255, 255, 0.92));
}

.ranking-item.is-top-1::before {
    background: linear-gradient(180deg, #ffb648, #ffd66b);
}

.ranking-item__rank.is-top-2 {
    background: rgba(255, 143, 107, 0.16);
    color: #c2410c;
}

.ranking-item.is-top-2 {
    border-color: rgba(255, 143, 107, 0.34);
    background: linear-gradient(180deg, rgba(255, 245, 240, 0.96), rgba(255, 255, 255, 0.92));
}

.ranking-item.is-top-2::before {
    background: linear-gradient(180deg, #ff8f6b, #ffb089);
}

.ranking-item__rank.is-top-3 {
    background: rgba(129, 140, 248, 0.14);
    color: #4f46e5;
}

.ranking-item.is-top-3 {
    border-color: rgba(129, 140, 248, 0.3);
    background: linear-gradient(180deg, rgba(240, 244, 255, 0.98), rgba(255, 255, 255, 0.92));
}

.ranking-item.is-top-3::before {
    background: linear-gradient(180deg, #7c8cff, #a5b4fc);
}

.ranking-item__name {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.ranking-item__icon {
    flex: 0 0 auto;
    font-size: 16px;
    color: #5568ff;
}

.ranking-item__icon.is-top-1 {
    color: #b54708;
}

.ranking-item__icon.is-top-2 {
    color: #c2410c;
}

.ranking-item__icon.is-top-3 {
    color: #4f46e5;
}

.ranking-item.is-top-1 .ranking-item__content strong,
.ranking-item.is-top-2 .ranking-item__content strong,
.ranking-item.is-top-3 .ranking-item__content strong {
    font-size: 19px;
    font-weight: 800;
}

.ranking-item__content strong,
.record-item__content strong,
.empty-state strong {
    color: #16213e;
    font-size: 17px;
}

.ranking-item__score span {
    color: #16213e;
    font-size: 24px;
    font-weight: 800;
    white-space: nowrap;
}

.record-item {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
}

.record-item__score {
    font-size: 22px;
    font-weight: 800;
    text-align: center;
    white-space: nowrap;
}

.record-item__score.is-plus {
    color: #12b981;
}

.record-item__score.is-minus {
    color: #ff6b81;
}

.record-item__content {
    min-width: 0;
    display: grid;
    gap: 8px;
}

.record-item__summary {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
}

.record-item__summary strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.record-item__student {
    flex: 0 1 auto;
    min-width: 0;
}

.record-item__meta {
    margin-top: 0;
}

.record-item__meta span {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.08);
    color: #627099;
    font-size: 12px;
    font-weight: 700;
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

.pagination-row {
    margin-top: 18px;
}

.pagination-row__label {
    color: #627099;
    font-size: 13px;
    font-weight: 700;
}

@media (max-width: 1080px) {
    .ranking-list {
        grid-auto-flow: row;
        grid-template-rows: none;
        grid-auto-columns: auto;
        grid-template-columns: 1fr;
        max-height: none;
        overflow: visible;
        padding-right: 0;
    }

    .records-filter-grid {
        grid-template-columns: 1fr;
        display: grid;
    }
}

@media (max-width: 768px) {
    .records-filter-grid {
        grid-template-columns: 1fr;
    }

    .toolbar-divider {
        display: none;
    }

    .panel-head,
    .pagination-row,
    .ranking-item,
    .record-item {
        display: flex;
        flex-direction: column;
        align-items: stretch;
    }

    .ranking-item__rank,
    .record-item__score {
        text-align: left;
    }

    .record-item__summary {
        align-items: flex-start;
    }
}
</style>
