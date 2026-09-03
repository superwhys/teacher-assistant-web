<template>
    <section class="tools-lottery-history-panel">
        <div class="tools-lottery-history-panel__head">
            <h3>历史</h3>
            <div class="history-head__meta">
                <span class="history-count">{{ records.length }}</span>
                <button
                    v-if="records.length > 0"
                    type="button"
                    class="history-clear-button"
                    @click="emit('clearRecords')"
                >
                    清空
                </button>
            </div>
        </div>

        <div v-if="records.length > 0" class="history-list">
            <article v-for="record in records" :key="record.id" class="history-item">
                <div class="history-item__content">
                    <strong>{{ record.prizeName }}</strong>
                    <span>{{ formatRecordTime(record.drawnAt) }}</span>
                </div>
            </article>
        </div>

        <div v-else class="empty-state empty-state--history">
            <strong>暂无记录</strong>
            <p>抽奖结果会显示在这里。</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import type { DrawRecord } from "@/types/lottery";

defineOptions({ name: "ToolsLotteryHistoryPanel" })

/** 定义抽奖历史面板属性。 */
interface ToolsLotteryHistoryPanelProps {
    records: DrawRecord[]
}

defineProps<ToolsLotteryHistoryPanelProps>()

const emit = defineEmits<{
    (e: "clearRecords"): void
}>()

/** 将抽奖记录时间格式化为可读文本。 */
function formatRecordTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    })
}
</script>

<style scoped>
.tools-lottery-history-panel {
    min-width: 0;
    min-height: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
}

.tools-lottery-history-panel__head,
.history-head__meta {
    display: flex;
    align-items: center;
}

.tools-lottery-history-panel__head {
    justify-content: space-between;
    gap: 10px;
}

.tools-lottery-history-panel__head h3 {
    margin: 0;
    font-size: 16px;
}

.history-head__meta {
    gap: 6px;
}

.history-count {
    min-width: 26px;
    height: 26px;
    padding: 0 8px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    color: #0064cf;
    background: #e6f2ff;
    font-size: 11px;
    font-weight: 600;
}

.history-clear-button {
    min-height: 28px;
    padding: 0 9px;
    border: 0;
    border-radius: 8px;
    color: var(--ta-red);
    background: var(--ta-red-soft);
    font-size: 11px;
    cursor: pointer;
}

.history-list {
    min-height: 0;
    flex: 1;
    margin-top: 8px;
    display: grid;
    align-content: start;
    overflow: auto;
}

.history-item {
    min-height: 48px;
    padding: 8px 2px;
    border-top: 1px solid var(--ta-line);
}

.history-item:first-child {
    border-top: 0;
}

.history-item__content strong,
.history-item__content span {
    display: block;
}

.history-item__content strong {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.history-item__content span {
    margin-top: 3px;
    color: var(--ta-text-tertiary);
    font-size: 10px;
}

.empty-state {
    min-height: 120px;
    margin-top: 8px;
    padding: 18px;
    display: grid;
    place-items: center;
    align-content: center;
    border-radius: 14px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.empty-state strong {
    color: var(--ta-text);
    font-size: 13px;
}

.empty-state p {
    margin: 4px 0 0;
    font-size: 11px;
}
</style>
