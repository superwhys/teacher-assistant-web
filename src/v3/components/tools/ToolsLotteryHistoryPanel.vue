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
                    :disabled="loading || busy"
                    @click="emit('clearRecords')"
                >
                    清空
                </button>
            </div>
        </div>

        <div v-if="loadError || pendingCount > 0" class="history-status">
            <span>{{ pendingCount > 0 ? `${pendingCount} 条记录待同步` : "记录加载失败" }}</span>
            <el-button link type="primary" :loading="loading" :disabled="busy" @click="emit('retry')">重试</el-button>
        </div>
        <div v-else-if="loading" class="history-status">正在加载记录…</div>
        <p v-if="pendingPersistenceFailed && pendingCount > 0" class="history-storage-warning">
            待同步记录仅保留在当前页面，请重试同步后再关闭页面。
        </p>

        <div v-if="records.length > 0" class="history-list">
            <article v-for="record in records" :key="record.id" class="history-item">
                <div class="history-item__content">
                    <strong>{{ record.prizeName }}</strong>
                    <span>{{ formatRecordTime(record.drawnAt) }}</span>
                    <span v-if="record.studentId" class="history-item__student">中奖学生：{{ record.studentName || "已绑定学生" }}</span>
                </div>
                <button
                    type="button"
                    class="history-student-button"
                    :disabled="!record.serverId || busy || loading"
                    @click="emit('bindStudent', record)"
                >
                    {{ record.syncPending ? "待同步" : record.studentId ? "更改学生" : "绑定学生" }}
                </button>
            </article>
        </div>

        <div v-else-if="!loading && !loadError" class="empty-state empty-state--history">
            <strong>{{ hasClass ? "暂无记录" : "请先选择班级" }}</strong>
            <p>{{ hasClass ? "当前班级的抽奖结果会显示在这里。" : "选择班级后可查看该班的抽奖记录。" }}</p>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DrawRecord } from "@/types/lottery";

defineOptions({ name: "ToolsLotteryHistoryPanel" })

/** 定义抽奖历史面板属性。 */
interface ToolsLotteryHistoryPanelProps {
    records: DrawRecord[]
    loading: boolean
    loadError: boolean
    busy: boolean
    pendingPersistenceFailed: boolean
    hasClass: boolean
}

const props = defineProps<ToolsLotteryHistoryPanelProps>()

const emit = defineEmits<{
    (e: "clearRecords"): void
    (e: "bindStudent", record: DrawRecord): void
    (e: "retry"): void
}>()

const pendingCount = computed(() => props.records.filter(record => record.syncPending).length)

/** 将抽奖记录时间格式化为可读文本。 */
function formatRecordTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
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
    font-size: 17px;
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
    font-size: 12px;
    font-weight: 600;
}

.history-clear-button {
    min-height: 28px;
    padding: 0 9px;
    border: 0;
    border-radius: 8px;
    color: var(--ta-red);
    background: var(--ta-red-soft);
    font-size: 12px;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.history-item__content {
    min-width: 0;
}

.history-student-button {
    flex: none;
    min-height: 32px;
    padding: 0 8px;
    border: 0;
    border-radius: 8px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
    font-size: 12px;
    cursor: pointer;
}

.history-student-button:disabled,
.history-clear-button:disabled {
    opacity: 0.42;
    cursor: default;
}

.history-status {
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.history-storage-warning {
    margin: 6px 0 0;
    color: var(--ta-red);
    font-size: 12px;
    line-height: 1.5;
}

.history-item:first-child {
    border-top: 0;
}

.history-item__content strong,
.history-item__content span {
    display: block;
}

.history-item__content .history-item__student {
    color: var(--ta-text-secondary);
}

.history-item__content strong {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.history-item__content span {
    margin-top: 3px;
    color: var(--ta-text-tertiary);
    font-size: 11px;
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
    font-size: 14px;
}

.empty-state p {
    margin: 4px 0 0;
    font-size: 12px;
}
</style>
