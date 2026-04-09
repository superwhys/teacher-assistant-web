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
                <span v-if="item.source === 'shop'" class="tag tag--sky">商城商品</span>
                <span class="tag tag--amber">权重 {{ item.weight }}</span>
                <span class="tag" :class="item.enabled ? 'tag--green' : 'tag--slate'">
                    {{ item.enabled ? "已启用" : "已停用" }}
                </span>
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
    height: 112px;
    padding: 16px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 22px;
    background: #ffffff;
    text-align: left;
}

.prize-item.is-disabled {
    opacity: 0.62;
}

.prize-item__icon {
    flex-shrink: 0;
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: linear-gradient(135deg, #14b8a6, #12b981);
    color: #ffffff;
}

.prize-item__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    overflow: hidden;
}

.prize-item__content strong {
    display: block;
    margin: 0;
}

.prize-item__content strong {
    color: #16213e;
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.prize-item__tags {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
}

.prize-item__tags::-webkit-scrollbar {
    display: none;
}

.tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    white-space: nowrap;
}

.tag--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.tag--amber {
    color: #b45309;
    background: rgba(245, 158, 11, 0.16);
}

.tag--green {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.tag--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

@media (max-width: 768px) {
    .prize-item {
        height: 104px;
    }
}
</style>
