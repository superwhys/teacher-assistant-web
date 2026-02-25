<script setup lang="ts">
import type { Component } from 'vue'
import type { Prize } from '@/types/mall'

defineOptions({ name: 'ShopPrizeGrid' })

const props = defineProps<{
    items: Prize[]
    active: boolean
    resolveIcon: (iconName?: string) => Component
}>()

const emit = defineEmits<{
    (e: 'edit', item: Prize): void
    (e: 'delete', item: Prize): void
    (e: 'exchange', item: Prize): void
}>()
</script>

<template>
    <div v-if="props.items.length > 0" class="shop-grid">
        <div v-for="item in props.items" :key="item.id ?? item.name" class="shop-item-card">
            <div class="card-actions">
                <el-button type="primary" text @click="emit('edit', item)">
                    <i-ep-edit />
                </el-button>
                <el-button type="danger" text @click="emit('delete', item)">
                    <i-ep-delete />
                </el-button>
            </div>

            <div class="card-content">
                <div class="item-icon">
                    <component :is="props.resolveIcon(item.icon)" />
                </div>

                <div class="item-name">{{ item.name }}</div>

                <div class="item-desc">
                    {{ item.description || '' }}
                </div>

                <div class="item-price-info">
                    <div class="price-row">
                        <i-ep-coin class="coin-icon" />
                        <span class="points-number">{{ item.points ?? 0 }}</span>
                        <span class="points-text">积分</span>
                    </div>
                    <div class="stock-info" :class="{ 'out-of-stock': (item.stock ?? 0) === 0 }">
                        库存: {{ item.stock ?? 0 }}
                    </div>
                </div>

                <el-button
                    type="primary"
                    class="exchange-btn"
                    size="large"
                    :disabled="(item.stock ?? 0) === 0 || !props.active"
                    @click="emit('exchange', item)"
                >
                    <i-ep-shopping-cart /> 兑换
                </el-button>
            </div>
        </div>
    </div>

    <div v-else class="empty-shop">
        <i-ep-shopping-bag class="empty-icon" />
        <div class="empty-title">还没有商品</div>
        <div class="empty-sub">点击"添加商品"或"导入商品"开始添加</div>
    </div>
</template>

<style scoped>
.shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    padding-bottom: 20px;
    align-content: start;
}

.shop-item-card {
    position: relative;
    border: 2px solid #e6e8f0;
    border-radius: 16px;
    padding: 0;
    background: #fff;
    transition: all 0.3s;
    overflow: hidden;
}

.shop-item-card:hover {
    border-color: #2d5cf6;
    box-shadow: 0 6px 16px rgba(45, 92, 246, 0.12);
    transform: translateY(-4px);
}

.card-actions {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    gap: 2px;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.3s;
}

.card-actions :deep(.el-button) {
    padding: 4px;
    background: transparent !important;
    border: none;
}

.card-actions :deep(.el-button:hover) {
    background: rgba(0, 0, 0, 0.05) !important;
}

.card-actions :deep(.el-button.is-text) {
    background: transparent !important;
}

.shop-item-card:hover .card-actions {
    opacity: 1;
}

.card-content {
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.item-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.item-name {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    text-align: center;
    line-height: 1.4;
}

.item-desc {
    width: 100%;
    font-size: 12px;
    color: #999;
    text-align: center;
    line-height: 1.5;
    min-height: 36px;
    max-height: 48px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
}

.item-price-info {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0 8px;
}

.price-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: nowrap;
    gap: 4px;
}

.coin-icon {
    font-size: 20px;
    color: #f59e0b;
}

.points-number {
    font-size: 20px;
    font-weight: 700;
    color: #f59e0b;
    line-height: 1;
    white-space: nowrap;
}

.points-text {
    font-size: 14px;
    color: #f59e0b;
    font-weight: 500;
    white-space: nowrap;
}

.stock-info {
    font-size: 13px;
    color: #999;
    text-align: right;
}

.stock-info.out-of-stock {
    color: #ef4444;
    font-weight: 600;
}

.exchange-btn {
    width: 100%;
    height: 38px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
}

.empty-shop {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: #888;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    color: #c6c6c6;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.empty-sub {
    font-size: 14px;
    color: #999;
}

@media (max-width: 1024px) {
    .shop-grid {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    }
}

@media (max-width: 768px) {
    .shop-grid {
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
    }

    .card-actions {
        opacity: 1;
    }

    .card-content {
        padding: 14px;
        gap: 10px;
    }

    .item-icon {
        width: 44px;
        height: 44px;
        font-size: 22px;
    }

    .item-name {
        font-size: 15px;
    }

    .points-number {
        font-size: 18px;
    }

    .coin-icon {
        font-size: 18px;
    }

    .points-text {
        font-size: 12px;
    }

    .exchange-btn {
        height: 36px;
        font-size: 13px;
    }
}

@media (max-width: 480px) {
    .shop-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 10px;
    }

    .card-content {
        padding: 12px;
        gap: 8px;
    }

    .item-icon {
        width: 40px;
        height: 40px;
        font-size: 20px;
    }

    .item-name {
        font-size: 14px;
    }

    .points-number {
        font-size: 16px;
    }

    .coin-icon {
        font-size: 16px;
    }

    .points-text {
        font-size: 11px;
    }
}
</style>

