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
    height: auto;
    min-height: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.88);
    box-sizing: border-box;
    overflow: hidden;
}

.tools-lottery-history-panel__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.history-head__meta {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tools-lottery-history-panel__head h3,
.history-item__content strong,
.history-item__content span,
.history-count,
.empty-state strong,
.empty-state p {
    margin: 0;
}

.tools-lottery-history-panel__head h3 {
    color: #16213e;
    font-size: 16px;
}

.history-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    min-height: 28px;
    padding: 0 8px;
    border-radius: 999px;
    background: rgba(18, 185, 129, 0.12);
    color: #067647;
    font-size: 12px;
    font-weight: 700;
}

.history-clear-button {
    min-height: 28px;
    padding: 0 10px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 237, 213, 0.9);
    color: #c2410c;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}

.history-list {
    flex: 1;
    min-height: 0;
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
    padding-right: 4px;
}

.history-item {
    flex: 0 0 auto;
    min-height: 52px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid rgba(122, 141, 198, 0.12);
}

.history-item__content {
    flex: 1;
    min-width: 0;
}

.history-item__content strong {
    color: #16213e;
    font-size: 14px;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.history-item__content span {
    display: block;
    color: #627099;
    font-size: 12px;
}

.empty-state {
    flex: 0 0 auto;
    margin-top: 12px;
    padding: 12px;
    display: grid;
    gap: 4px;
    color: #627099;
    border: 1px dashed rgba(122, 141, 198, 0.22);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.7);
}

.empty-state p {
    line-height: 1.6;
    font-size: 13px;
}
</style>
