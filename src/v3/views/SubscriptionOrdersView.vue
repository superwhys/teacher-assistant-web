<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchSubscriptionOrder, fetchSubscriptionOrders } from '@/api/subscription'
import PageHeader from '@/components/common/PageHeader.vue'
import { useCacheStore } from '@/stores/cacheStore'
import { useSessionStore } from '@/stores/sessionStore'
import type { SubscriptionOrder } from '@/types/subscription'
import { subscriptionOrderAmount, subscriptionOrderName, subscriptionOrderStatus, subscriptionOrderTime } from '@/utils/subscriptionOrder'

const cacheStore = useCacheStore()
const sessionStore = useSessionStore()
const orders = ref<SubscriptionOrder[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const checkingID = ref('')
const checkedID = ref('')
const checkMessage = ref('')
const checkError = ref('')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
let generation = 0
let disposed = false

async function loadOrders(targetPage = page.value): Promise<void> {
    if (loading.value || checkingID.value || !cacheStore.token || !cacheStore.profile?.id) return
    const version = generation
    loading.value = true
    loadError.value = ''
    try {
        const response = await fetchSubscriptionOrders(targetPage, pageSize)
        if (disposed || version !== generation) return
        orders.value = response.data.orders
        total.value = response.data.total
        page.value = response.data.page
        checkedID.value = ''
        checkMessage.value = ''
        checkError.value = ''
    } catch (error) {
        if (!disposed && version === generation) loadError.value = error instanceof Error ? error.message : '订单加载失败，请重试。'
    } finally {
        if (!disposed && version === generation) loading.value = false
    }
}

async function checkOrder(orderID: string): Promise<void> {
    if (checkingID.value || loading.value || !orders.value.some(order => order.id === orderID)) return
    const version = generation
    checkingID.value = orderID
    checkedID.value = orderID
    checkMessage.value = ''
    checkError.value = ''
    try {
        const response = await fetchSubscriptionOrder(orderID)
        if (disposed || version !== generation) return
        if (response.data.id !== orderID) throw new Error('返回的订单信息不一致，请重新加载。')
        const order = response.data
        orders.value = orders.value.map(existing => existing.id === orderID ? order : existing)
        checkMessage.value = subscriptionOrderStatus(order)
        if (order.status === 'pending') checkMessage.value = '暂未确认付款。若已扣款，请稍后再次查询，勿重复购买。'
        if (order.status === 'paid' || order.status === 'refunded') {
            try {
                await sessionStore.refreshAfterMutation()
            } catch {
                if (!disposed && version === generation) checkError.value = '订单状态已更新，账号权益同步失败，请稍后重新查询。'
            }
        }
    } catch (error) {
        if (!disposed && version === generation) checkError.value = error instanceof Error ? error.message : '查单失败，请稍后重试。'
    } finally {
        if (!disposed && version === generation) checkingID.value = ''
    }
}

watch([() => cacheStore.token, () => cacheStore.profile?.id], ([token, userID]) => {
    generation += 1
    orders.value = []
    page.value = 1
    total.value = 0
    loading.value = false
    loadError.value = ''
    checkingID.value = ''
    checkedID.value = ''
    checkMessage.value = ''
    checkError.value = ''
    if (token && userID) void loadOrders(1)
}, { immediate: true, flush: 'sync' })

onBeforeUnmount(() => { disposed = true; generation += 1 })
</script>

<template>
    <div class="subscription-orders">
        <PageHeader eyebrow="MY ORDERS" title="我的订单" description="找回当前账号的订阅订单，核对付款与开通状态。">
            <template #actions>
                <RouterLink to="/subscription" class="orders-button">查看套餐</RouterLink>
                <button type="button" class="orders-button" :disabled="loading || Boolean(checkingID)" @click="loadOrders()">
                    {{ loading ? '加载中…' : '刷新订单' }}
                </button>
            </template>
        </PageHeader>
        <p class="orders-account">当前账号：{{ cacheStore.profile?.email || cacheStore.displayName || cacheStore.profile?.name }}</p>
        <p class="orders-help">包含为当前账号开通的网页扫码订单和小程序订单。未完成付款也会保留记录；如已扣款，请先查询结果。</p>
        <div v-if="loadError" class="orders-feedback orders-feedback--error" role="alert">
            <p>{{ loadError }}</p>
            <button type="button" class="orders-button" :disabled="loading || Boolean(checkingID)" @click="loadOrders()">重新加载</button>
        </div>
        <p v-if="loading && !orders.length" class="orders-feedback" role="status">正在加载订单…</p>
        <p v-else-if="!loading && !loadError && !orders.length" class="orders-feedback">暂无订阅订单。</p>
        <ul v-if="orders.length" class="orders-list" :aria-busy="loading">
            <li v-for="order in orders" :key="order.id" class="order-card">
                <div class="order-card__heading">
                    <strong>{{ subscriptionOrderName(order.plan_id) }}</strong>
                    <span class="order-card__status" :class="`order-card__status--${order.status}`">
                        {{ subscriptionOrderStatus(order) }}
                    </span>
                </div>
                <dl class="order-card__facts">
                    <div>
                        <dt>订单金额</dt>
                        <dd class="order-card__amount">{{ subscriptionOrderAmount(order.amount_fen) }}</dd>
                    </div>
                    <div>
                        <dt>创建时间</dt>
                        <dd>{{ subscriptionOrderTime(order.created_at) }}</dd>
                    </div>
                    <div v-if="order.paid_expires_at && order.status !== 'refunded'">
                        <dt>本单开通至</dt>
                        <dd>{{ subscriptionOrderTime(order.paid_expires_at) }}</dd>
                    </div>
                    <div class="order-card__number">
                        <dt>订单号</dt>
                        <dd>{{ order.id }}</dd>
                    </div>
                </dl>
                <div class="order-card__actions">
                    <button type="button" class="orders-button" :disabled="loading || Boolean(checkingID)" @click="checkOrder(order.id)">
                        {{ checkingID === order.id ? '查询中…' : '查询付款结果' }}
                    </button>
                    <p v-if="checkedID === order.id && checkMessage" class="orders-help" role="status">
                        {{ checkMessage }}
                    </p>
                    <p v-if="checkedID === order.id && checkError" class="orders-error" role="alert">
                        {{ checkError }}
                    </p>
                </div>
            </li>
        </ul>
        <nav v-if="total > pageSize" class="orders-pagination" aria-label="订单分页">
            <button type="button" class="orders-button" :disabled="page <= 1 || loading || Boolean(checkingID)"
                @click="loadOrders(page - 1)">上一页</button>
            <span>第 {{ page }} / {{ pageCount }} 页 · 共 {{ total }} 笔</span>
            <button type="button" class="orders-button" :disabled="page >= pageCount || loading || Boolean(checkingID)"
                @click="loadOrders(page + 1)">下一页</button>
        </nav>
    </div>
</template>

<style scoped>
.subscription-orders {
    display: grid;
    gap: 16px;
    width: 100%;
    max-width: 900px;
}

.orders-account, .orders-help, .orders-error {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
}

.orders-account {
    color: var(--ta-text);
    overflow-wrap: anywhere;
}

.orders-help {
    color: var(--ta-text-secondary);
}

.orders-error, .orders-feedback--error {
    color: #b04436;
}

.orders-button {
    min-height: 36px;
    padding: 7px 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--ta-line);
    border-radius: 9px;
    background: var(--ta-surface, #fff);
    color: var(--ta-blue);
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
}
.orders-button:disabled {
    opacity: .55;
    cursor: default;
}

.orders-button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 3px;
}

.orders-feedback {
    padding: 28px 20px;
    margin: 0;
    background: var(--ta-surface, #fff);
    border-radius: 12px;
    text-align: center;
}

.orders-feedback p {
    margin: 0 0 12px;
}

.orders-list {
    display: grid;
    gap: 12px;
    padding: 0;
    margin: 0;
    list-style: none;
}

.order-card {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: 14px;
    background: var(--ta-surface, #fff);
}

.order-card__heading {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
}

.order-card__heading strong {
    font-size: 16px;
    color: var(--ta-text);
}

.order-card__status {
    padding: 4px 9px;
    border-radius: 6px;
    color: #8b681d;
    background: #faf4e3;
    font-size: 12px;
}

.order-card__status--paid {
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.order-card__status--refunded {
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
}

.order-card__facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin: 18px 0;
}

.order-card__facts dt {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.order-card__facts dd {
    margin: 5px 0 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    overflow-wrap: anywhere;
}

.order-card__facts .order-card__amount {
    font-size: 19px;
    font-weight: 650;
    color: var(--ta-text);
}

.order-card__number {
    grid-column: 1 / -1;
}

.order-card__number dd {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    user-select: all;
}

.order-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    border-top: 1px solid var(--ta-line);
    padding-top: 14px;
}

.order-card__actions p {
    flex: 1 1 220px;
}

.orders-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: var(--ta-text-secondary);
}

@media (max-width: 600px) {
    .order-card {
        padding: 16px;
    }

    .order-card__facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

}
</style>
