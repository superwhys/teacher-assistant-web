<template>
    <section class="tools-lottery-history-panel">
        <div class="tools-lottery-history-panel__head">
            <div>
                <span class="panel-eyebrow">抽奖历史</span>
                <h3>最近抽取记录</h3>
            </div>
            <span class="history-count">共 {{ records.length }} 条</span>
        </div>

        <div v-if="records.length > 0" class="history-list">
            <article v-for="record in records" :key="record.id" class="history-item">
                <div class="history-item__icon">🎯</div>
                <div class="history-item__content">
                    <strong>{{ record.prizeName }}</strong>
                    <span>{{ formatRecordTime(record.drawnAt) }}</span>
                </div>
            </article>
        </div>

        <div v-else class="empty-state empty-state--history">
            <i-ep-document />
            <strong>还没有抽奖记录</strong>
            <p>开始抽奖后，这里会保留当前奖池的历史结果。</p>
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
    height: 100%;
    min-height: 0;
    padding: 24px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 30px;
    background: #ffffff;
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    box-sizing: border-box;
    overflow: hidden;
}

.tools-lottery-history-panel__head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.panel-eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.62);
    color: #067647;
    font-size: 12px;
    font-weight: 700;
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
    margin-top: 12px;
    color: #16213e;
    font-size: 24px;
}

.history-count {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(18, 185, 129, 0.12);
    color: #067647;
    font-size: 13px;
    font-weight: 700;
}

.history-list {
    flex: 1;
    min-height: 0;
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    align-content: flex-start;
    gap: 10px;
    overflow: auto;
    padding-right: 4px;
}

.history-item {
    flex: 0 0 auto;
    min-height: 78px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid rgba(122, 141, 198, 0.14);
}

.history-item__icon {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: linear-gradient(135deg, #14b8a6, #12b981);
    color: #ffffff;
}

.history-item__content {
    flex: 1;
    min-width: 0;
}

.history-item__content strong {
    color: #16213e;
    font-size: 16px;
    display: block;
}

.history-item__content span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.empty-state {
    flex: 1;
    min-height: 0;
    margin-top: 16px;
    display: grid;
    place-items: center;
    text-align: center;
    gap: 10px;
    color: #627099;
    border: 1px dashed rgba(122, 141, 198, 0.22);
    border-radius: 22px;
    background: #ffffff;
}

.empty-state p {
    line-height: 1.7;
}

.empty-state :deep(svg) {
    font-size: 52px;
    color: #12b981;
}

@media (max-width: 768px) {
    .tools-lottery-history-panel {
        padding: 18px;
        border-radius: 26px;
    }

    .history-item {
        align-items: flex-start;
    }
}
</style>
