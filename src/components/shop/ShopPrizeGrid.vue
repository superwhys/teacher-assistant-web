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


