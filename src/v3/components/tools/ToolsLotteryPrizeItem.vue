<template>
    <button
        type="button"
        class="prize-item"
        :class="{ 'is-disabled': item.enabled === false }"
        @click="handleEdit"
    >
        <div class="prize-item__icon">
            <i-ep-trophy />
        </div>
        <div class="prize-item__content">
            <strong>{{ item.name }}</strong>
            <div class="prize-item__tags">
                <span v-if="item.source === 'shop'" class="tag tag--sky">商城</span>
                <span class="tag tag--amber">权重 {{ item.weight }}</span>
            </div>
        </div>
        <el-switch
            :model-value="item.enabled"
            size="large"
            @click.stop
            @change="handleToggleEnabled"
        />
    </button>
</template>

<script setup lang="ts">
import type { UiLotteryPrize } from "@/managers/lottery";

defineOptions({ name: "ToolsLotteryPrizeItem" })

/** 定义抽奖器奖品卡片属性。 */
interface ToolsLotteryPrizeItemProps {
    item: UiLotteryPrize
}

const props = defineProps<ToolsLotteryPrizeItemProps>()

const emit = defineEmits<{
    (e: "edit", item: UiLotteryPrize): void
    (e: "toggleEnabled", item: UiLotteryPrize): void
}>()

/** 处理奖品卡片点击编辑。 */
function handleEdit(): void {
    emit("edit", props.item)
}

/** 处理奖品启用状态切换。 */
function handleToggleEnabled(): void {
    emit("toggleEnabled", props.item)
}
</script>

<style scoped>
.prize-item {
    width: 100%;
    min-height: 54px;
    padding: 9px 2px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 0;
    border-top: 1px solid var(--ta-line);
    border-radius: 0;
    color: var(--ta-text);
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background-color 140ms ease, opacity 140ms ease;
}

.prize-item:first-child {
    border-top: 0;
}

.prize-item:hover {
    background: #f7f7f8;
}

.prize-item.is-disabled {
    opacity: 0.52;
}

.prize-item__icon {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.prize-item__icon svg {
    width: 17px;
    height: 17px;
}

.prize-item__content {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 4px;
}

.prize-item__content strong {
    display: block;
    overflow: hidden;
    color: var(--ta-text);
    font-size: 13px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.prize-item__tags {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    overflow: hidden;
}

.tag {
    min-height: 20px;
    padding: 0 7px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
}

.tag--sky {
    color: #0064cf;
    background: #e6f2ff;
}

.tag--amber {
    color: #a34a00;
    background: var(--ta-orange-soft);
}

.prize-item :deep(.el-switch) {
    --el-switch-on-color: var(--ta-blue);
    --el-switch-off-color: #c7c7cc;
    flex: 0 0 auto;
}

@media (max-width: 660px) {
    .prize-item {
        min-height: 52px;
    }
}
</style>
