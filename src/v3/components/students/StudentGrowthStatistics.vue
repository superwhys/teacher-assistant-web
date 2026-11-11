<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import type { GrowthReport, GrowthRule } from '@/types/studentGrowth'
import { growthComparison, growthRuleKey } from '@/utils/studentGrowth'

const props = defineProps<{ report: GrowthReport }>()
const selectedRule = shallowRef<GrowthRule | null>(null)
watch(() => props.report, () => { selectedRule.value = null })
const dailyMaximum = computed(() => Math.max(1, ...props.report.daily.flatMap(day => [day.awarded_count, day.deducted_count])))
const selectedRecords = computed(() => {
    const rule = selectedRule.value
    return rule ? props.report.records.filter(record => record.rule_id === rule.rule_id
        && record.description === rule.rule_name && record.type === rule.type) : []
})
const formatTime = (value: string) => Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
    : value
</script>

<template>
    <div class="growth-statistics">
        <div v-if="report.summary.records === 0" class="growth-empty" role="status">
            <strong>本期暂无奖励或提醒记录</strong>
            <p>没有记录不代表学生没有表现或进步，可结合课堂观察填写寄语。</p>
        </div>

        <section aria-label="本期与上期统计">
            <div class="growth-section-head">
                <h4>这段时间的课堂记录</h4>
                <span>上期 {{ report.previous_from }} — {{ report.previous_to }}</span>
            </div>
            <p v-if="!report.previous_period_complete" class="growth-coverage">上期跨越学期起点，数据覆盖不完整，暂不作增减比较。</p>
            <div class="growth-metrics">
                <article class="growth-metric">
                    <span>奖励记录</span><strong>{{ report.summary.awarded_count }}<small> 次</small></strong>
                    <span>上期 {{ report.previous_summary.awarded_count }} 次 · {{ growthComparison(report.summary.awarded_count, report.previous_summary.awarded_count, report.previous_period_complete) }}</span>
                </article>
                <article class="growth-metric growth-metric--reminder">
                    <span>提醒记录</span><strong>{{ report.summary.deducted_count }}<small> 次</small></strong>
                    <span>上期 {{ report.previous_summary.deducted_count }} 次 · {{ growthComparison(report.summary.deducted_count, report.previous_summary.deducted_count, report.previous_period_complete) }}</span>
                </article>
                <article class="growth-metric">
                    <span>有记录的天数</span><strong>{{ report.summary.recorded_days }}<small> 天</small></strong>
                    <span>上期 {{ report.previous_summary.recorded_days }} 天</span>
                </article>
            </div>
        </section>

        <section aria-label="每日记录次数趋势">
            <div class="growth-section-head"><h4>每日记录次数</h4><span><i class="growth-dot" />奖励 <i class="growth-dot growth-dot--reminder" />提醒</span></div>
            <p class="growth-hint">按发生次数展示，不代表学生能力或成绩。</p>
            <div v-if="report.daily.length" class="growth-chart-scroll">
                <div class="growth-chart">
                    <div v-for="day in report.daily" :key="day.date" class="growth-day"
                        :aria-label="`${day.date}：奖励 ${day.awarded_count} 次，提醒 ${day.deducted_count} 次`"
                        :title="`${day.date} · 奖励 ${day.awarded_count} 次 · 提醒 ${day.deducted_count} 次`">
                        <div class="growth-day__bars">
                            <span class="growth-day__bar" :style="{ height: `${day.awarded_count / dailyMaximum * 100}%` }" />
                            <span class="growth-day__bar growth-day__bar--reminder" :style="{ height: `${day.deducted_count / dailyMaximum * 100}%` }" />
                        </div>
                        <span class="growth-day__date">{{ day.date.slice(5) }}</span>
                    </div>
                </div>
            </div>
            <p v-else class="growth-hint">当前周期暂无每日记录。</p>
        </section>

        <section aria-label="历史规则明细">
            <div class="growth-section-head"><h4>记录时的规则明细</h4><span>点击规则查看原始记录</span></div>
            <div class="growth-table-scroll">
                <table class="growth-table">
                    <thead><tr><th>规则</th><th>类型</th><th>本期次数</th><th>上期次数</th><th>本期积分</th></tr></thead>
                    <tbody>
                        <tr v-for="rule in report.rules" :key="growthRuleKey(rule)">
                            <td><button type="button" class="growth-rule-button" @click="selectedRule = rule">{{ rule.rule_name }}</button></td>
                            <td>{{ rule.type === 1 ? '奖励' : '提醒' }}</td><td>{{ rule.count }}</td>
                            <td>{{ rule.previous_count }}{{ report.previous_period_complete ? '' : ' *' }}</td><td>{{ rule.type === 1 ? '+' : '-' }}{{ Math.abs(rule.points) }}</td>
                        </tr>
                        <tr v-if="!report.rules.length"><td colspan="5">两期均无规则记录。</td></tr>
                    </tbody>
                </table>
            </div>
            <div v-if="selectedRule" class="growth-records" aria-live="polite">
                <div class="growth-section-head"><h4>{{ selectedRule.rule_name }} · 本期原始记录</h4><button type="button" class="growth-rule-button" @click="selectedRule = null">收起</button></div>
                <ul v-if="selectedRecords.length" class="growth-record-list">
                    <li v-for="record in selectedRecords" :key="record.id">
                        <span class="growth-record-id">记录 #{{ record.id }}</span>
                        <time>{{ formatTime(record.created_at) }}</time>
                        <span>{{ record.description }}</span>
                        <strong>{{ record.type === 1 ? '+' : '-' }}{{ Math.abs(record.amount) }} 分</strong>
                    </li>
                </ul>
                <p v-else class="growth-hint">该规则本期暂无记录。</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.growth-statistics {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
}

.growth-statistics > * {
    min-width: 0;
}

.growth-section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
}

.growth-section-head h4 {
    margin: 0;
    font-size: 15px;
    color: var(--ta-text);
}

.growth-section-head > span, .growth-hint, .growth-coverage {
    color: var(--ta-text-secondary);
    font-size: 12px;
    line-height: 1.6;
}

.growth-hint {
    margin: 6px 0 12px;
}

.growth-coverage {
    color: var(--ta-orange);
}

.growth-empty {
    padding: 16px;
    border-radius: 10px;
    background: var(--ta-surface-muted);
}

.growth-empty p {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--ta-text-secondary);
}

.growth-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.growth-metric {
    min-width: 0;
    display: grid;
    gap: 8px;
    padding: 16px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: var(--ta-blue-soft);
}

.growth-metric > span {
    color: var(--ta-text-secondary);
    font-size: 12px;
    line-height: 1.6;
}

.growth-metric > strong {
    color: var(--ta-blue);
    font-size: 28px;
    font-variant-numeric: tabular-nums;
}

.growth-metric small {
    font-size: 12px;
    font-weight: 400;
}

.growth-metric--reminder {
    background: var(--ta-orange-soft);
}

.growth-metric--reminder > strong {
    color: var(--ta-orange);
}

.growth-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    margin: 0 3px 0 8px;
    background: var(--ta-blue);
    border-radius: 50%;
}

.growth-dot--reminder {
    background: var(--ta-orange);
}

.growth-chart-scroll, .growth-table-scroll {
    max-width: 100%;
    overflow-x: auto;
}

.growth-chart {
    min-width: 100%;
    width: max-content;
    display: flex;
    gap: 5px;
    padding-top: 10px;
}

.growth-day {
    flex: 1 0 33px;
    min-width: 33px;
    max-width: 90px;
}

.growth-day__bars {
    height: 120px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 3px;
    border-bottom: 1px solid var(--ta-line);
}

.growth-day__bar {
    width: 9px;
    background: var(--ta-blue);
    border-radius: 3px 3px 0 0;
}

.growth-day__bar--reminder {
    background: var(--ta-orange);
}

.growth-day__date {
    display: block;
    margin-top: 8px;
    text-align: center;
    font-size: 10px;
    color: var(--ta-text-secondary);
}

.growth-table {
    width: 100%;
    min-width: 480px;
    border-collapse: collapse;
    font-size: 13px;
}

.growth-table th, .growth-table td {
    padding: 11px 8px;
    border-bottom: 1px solid var(--ta-line);
    text-align: left;
}

.growth-table th {
    color: var(--ta-text-secondary);
    font-size: 12px;
    font-weight: 500;
    background: var(--ta-surface-muted);
}

.growth-rule-button {
    padding: 4px 0;
    border: 0;
    background: transparent;
    color: var(--ta-blue);
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.growth-rule-button:hover {
    text-decoration: underline;
}

.growth-records {
    margin-top: 14px;
    padding: 14px;
    border-radius: 10px;
    background: var(--ta-surface-muted);
}

.growth-record-list {
    padding: 0;
    margin: 0;
    list-style: none;
}

.growth-record-list li {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    padding: 9px 0;
    font-size: 12px;
    border-bottom: 1px solid var(--ta-line);
}

.growth-record-list time {
    color: var(--ta-text-secondary);
}

.growth-record-id {
    color: var(--ta-text-tertiary);
}

.growth-record-list strong {
    margin-left: auto;
    font-variant-numeric: tabular-nums;
}

@media (max-width: 660px) {
    .growth-metrics {
        grid-template-columns: 1fr;
    }

    .growth-metric {
        grid-template-columns: 1fr auto;
        align-items: center;
        padding: 12px;
    }

    .growth-metric > span:last-child {
        grid-column: 1 / -1;
    }

    .growth-metric > strong {
        font-size: 24px;
    }

    .growth-rule-button {
        min-height: 36px;
    }

}
</style>
