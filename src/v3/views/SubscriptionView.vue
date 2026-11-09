<template>
    <div class="subscription-view">
        <PageHeader eyebrow="SUBSCRIPTION" title="订阅套餐" description="选择普通版或 Pro 版，在微信小程序中完成购买。">
            <template #actions>
                <button type="button" class="subscription-button subscription-button--secondary"
                    :disabled="refreshing" @click="refreshEntitlement">
                    {{ refreshing ? '同步中…' : '已购买，刷新权益' }}
                </button>
            </template>
        </PageHeader>

        <section class="subscription-account" aria-label="当前订阅账号">
            <div>
                <strong>{{ cacheStore.displayName || cacheStore.profile?.name || '当前账号' }}</strong>
                <p>{{ cacheStore.profile?.email || `账号 ID：${cacheStore.profile?.id || '未获取'}` }}</p>
            </div>
            <div class="subscription-account__status">
                <span>{{ sessionStore.entitlementMessage }}</span>
                <span v-if="paidDeadline">付费到期：{{ paidDeadline }}</span>
            </div>
        </section>

        <p class="subscription-policy">每次购买仅支付一次，到期后手动续费，不会自动扣款。</p>

        <p v-if="loading" class="subscription-feedback" role="status">正在加载套餐…</p>
        <div v-else-if="loadError" class="subscription-feedback subscription-feedback--error" role="alert">
            <p>{{ loadError }}</p>
            <button type="button" class="subscription-button subscription-button--secondary" @click="loadPlans">重新加载</button>
        </div>
        <template v-else-if="catalog">
            <p v-if="!catalog.can_purchase" class="subscription-feedback" role="status">
                {{ catalog.purchase_disabled_reason || '当前账号暂不可购买套餐。' }}
            </p>
            <div class="subscription-editions">
                <section v-for="edition in editionGroups" :key="edition.id" class="subscription-edition"
                    :class="{ 'subscription-edition--pro': edition.id === 'pro' }" :aria-label="edition.name">
                    <h2>{{ edition.name }}</h2>
                    <div class="subscription-plans">
                        <article v-for="plan in edition.plans" :key="plan.id" class="subscription-plan">
                            <h3>{{ plan.name }}</h3>
                            <p class="subscription-plan__price">{{ subscriptionPrice(plan) }}</p>
                            <p class="subscription-plan__duration">有效期 {{ plan.days }} 天 · 单次购买</p>
                            <button type="button" class="subscription-button"
                                :disabled="!catalog.can_purchase || !isSubscriptionPlanAvailable(plan) || Boolean(creatingPlanID)"
                                @click="createPurchaseLink(plan)">
                                {{ creatingPlanID === plan.id ? '正在准备…' : '前往小程序购买' }}
                            </button>
                            <p v-if="plan.purchase_disabled_reason || !isSubscriptionPlanAvailable(plan)"
                                class="subscription-plan__unavailable">
                                {{ plan.purchase_disabled_reason || '该套餐暂未开放购买' }}
                            </p>
                        </article>
                    </div>
                </section>
            </div>
            <p v-if="!catalog.plans.length" class="subscription-feedback">暂未开放套餐，请稍后再来。</p>
            <p v-if="!catalog.ios_available" class="subscription-help">iPhone 端购买暂未开放，可使用支持的微信终端购买。</p>
        </template>

        <p v-if="purchaseError" class="subscription-feedback subscription-feedback--error" role="alert">{{ purchaseError }}</p>
        <section v-if="purchaseLink" class="subscription-purchase" aria-label="在小程序完成购买">
            <div class="subscription-purchase__code">
                <img v-if="!linkExpired" :src="purchaseLink.qr_code" alt="微信扫一扫，进入小程序确认账号并购买套餐" />
                <p v-else class="subscription-feedback" role="status">购买入口已过期，请重新生成。</p>
            </div>
            <div class="subscription-purchase__instructions">
                <h2>{{ selectedPlan?.name || '在小程序完成购买' }}</h2>
                <p>使用微信扫一扫，在小程序中核对账号和套餐后付款。</p>
                <p class="subscription-purchase__account">开通账号：{{ purchaseLink.account_name }}</p>
                <p>请在小程序中确认开通账号与上方当前账号一致。</p>
                <p v-if="!linkExpired">入口有效至 {{ formatDeadline(purchaseLink.expires_at) }}。</p>
                <a v-if="miniProgramURL && !linkExpired" :href="miniProgramURL" class="subscription-button"
                    target="_blank" rel="noopener noreferrer">在手机上打开小程序</a>
                <p v-else-if="!linkExpired" class="subscription-help">请使用另一台设备的微信扫描小程序码。</p>
                <button v-if="linkExpired && selectedPlan" type="button" class="subscription-button"
                    :disabled="Boolean(creatingPlanID) || !catalog?.can_purchase || !isSubscriptionPlanAvailable(selectedPlan)"
                    @click="createPurchaseLink(selectedPlan)">
                    {{ creatingPlanID ? '正在准备…' : '重新生成购买入口' }}
                </button>
            </div>
        </section>
        <p class="subscription-help">付款完成后点击“已购买，刷新权益”同步使用期限。购买和扣款均在微信小程序内完成。</p>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createSubscriptionPurchaseLink, fetchSubscriptionPlans } from '@/api/subscription'
import PageHeader from '@/components/common/PageHeader.vue'
import { useCacheStore } from '@/stores/cacheStore'
import { useSessionStore } from '@/stores/sessionStore'
import { isApiRequestError } from '@/types/api'
import type { SubscriptionPlan, SubscriptionPlanID, SubscriptionPlans, SubscriptionPurchaseLink } from '@/types/subscription'
import {
    isSubscriptionPlanAvailable, isSubscriptionPurchaseLinkValid, subscriptionMiniProgramLink, subscriptionPrice,
} from '@/utils/subscription'

const cacheStore = useCacheStore()
const sessionStore = useSessionStore()
const catalog = ref<SubscriptionPlans | null>(null)
const loading = ref(false)
const loadError = ref('')
const creatingPlanID = ref<SubscriptionPlanID>('')
const purchaseError = ref('')
const purchaseLink = ref<SubscriptionPurchaseLink | null>(null)
const refreshing = ref(false)
const now = ref(Date.now())
let generation = 0
let disposed = false
let deadlineTimer: ReturnType<typeof setInterval> | undefined

const editionGroups = computed(() => [
    { id: 'common', name: '普通版', plans: catalog.value?.plans.filter(plan => plan.edition === 'common') || [] },
    { id: 'pro', name: 'Pro 版', plans: catalog.value?.plans.filter(plan => plan.edition === 'pro') || [] },
].filter(edition => edition.plans.length))
const selectedPlan = computed(() => catalog.value?.plans.find(plan => plan.id === purchaseLink.value?.plan_id))
const linkExpired = computed(() => !purchaseLink.value || Date.parse(purchaseLink.value.expires_at) <= now.value)
const miniProgramURL = computed(() => subscriptionMiniProgramLink(purchaseLink.value?.url_link || ''))
const paidDeadline = computed(() => cacheStore.profile?.entitlement?.paid_expires_at
    ? formatDeadline(cacheStore.profile.entitlement.paid_expires_at) : '')

function formatDeadline(value: string): string {
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }) : ''
}

function clearPurchaseLink(): void {
    clearInterval(deadlineTimer)
    deadlineTimer = undefined
    purchaseLink.value = null
}

async function loadPlans(): Promise<void> {
    if (loading.value) return
    const version = generation
    loading.value = true
    loadError.value = ''
    try {
        const response = await fetchSubscriptionPlans()
        if (disposed || version !== generation) return
        catalog.value = response.data
    } catch (error) {
        if (disposed || version !== generation) return
        loadError.value = error instanceof Error ? error.message : '套餐加载失败，请重试。'
    } finally {
        if (!disposed && version === generation) loading.value = false
    }
}

async function createPurchaseLink(plan: SubscriptionPlan): Promise<void> {
    if (creatingPlanID.value || !catalog.value?.can_purchase || !isSubscriptionPlanAvailable(plan)) return
    const version = generation
    const userID = cacheStore.profile?.id
    const token = cacheStore.token
    if (!token || !userID) return
    creatingPlanID.value = plan.id
    purchaseError.value = ''
    clearPurchaseLink()
    try {
        const response = await createSubscriptionPurchaseLink(plan.id)
        if (disposed || version !== generation || cacheStore.token !== token || cacheStore.profile?.id !== userID) return
        now.value = Date.now()
        if (response.data.plan_id !== plan.id || !isSubscriptionPurchaseLinkValid(response.data, now.value)) {
            throw new Error('购买入口无效或已过期，请重新生成。')
        }
        purchaseLink.value = response.data
        deadlineTimer = setInterval(() => {
            now.value = Date.now()
            if (linkExpired.value) {
                clearInterval(deadlineTimer)
                deadlineTimer = undefined
            }
        }, 1000)
    } catch (error) {
        if (disposed || version !== generation) return
        purchaseError.value = error instanceof Error ? error.message : '暂时无法生成购买入口，请重试。'
    } finally {
        if (!disposed && version === generation) creatingPlanID.value = ''
    }
}

async function refreshEntitlement(): Promise<void> {
    if (refreshing.value) return
    const version = generation
    refreshing.value = true
    try {
        await sessionStore.refreshAfterMutation()
        if (disposed || version !== generation) return
        ElMessage.success('账号权益已同步')
        await loadPlans()
    } catch (error) {
        if (!disposed && version === generation && !isApiRequestError(error)) {
            ElMessage.error('权益同步失败，请稍后重试')
        }
    } finally {
        if (!disposed && version === generation) refreshing.value = false
    }
}

watch([() => cacheStore.token, () => cacheStore.profile?.id], ([token, userID]) => {
    generation += 1
    clearPurchaseLink()
    catalog.value = null
    loading.value = false
    creatingPlanID.value = ''
    refreshing.value = false
    purchaseError.value = ''
    loadError.value = ''
    if (token && userID) void loadPlans()
}, { immediate: true, flush: 'sync' })

onBeforeUnmount(() => {
    disposed = true
    generation += 1
    clearPurchaseLink()
})
</script>

<style scoped>
.subscription-view {
    display: grid;
    gap: 22px;
    max-width: 1040px;
}

.subscription-account {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 18px 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-small);
    background: var(--ta-surface-muted);
    overflow-wrap: anywhere;
}

.subscription-account strong {
    font-size: 15px;
}

.subscription-account p,
.subscription-account__status {
    margin: 6px 0 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.6;
}

.subscription-account__status {
    display: grid;
    gap: 4px;
    text-align: right;
}

.subscription-policy {
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 14px;
}

.subscription-editions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px;
}

.subscription-edition {
    padding: 24px;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
    background: var(--ta-surface);
}

.subscription-edition--pro {
    border-color: var(--ta-blue);
}

.subscription-edition h2,
.subscription-purchase h2 {
    margin: 0 0 20px;
    color: var(--ta-text);
    font-size: 19px;
    font-weight: 650;
}

.subscription-plans {
    display: grid;
    gap: 24px;
}

.subscription-plan + .subscription-plan {
    padding-top: 22px;
    border-top: 1px solid var(--ta-line);
}

.subscription-plan h3 {
    margin: 0;
    color: var(--ta-text);
    font-size: 14px;
    font-weight: 600;
}

.subscription-plan__price {
    margin: 14px 0 8px;
    color: var(--ta-text);
    font-size: 32px;
    line-height: 1.2;
    font-weight: 650;
    letter-spacing: -0.8px;
}

.subscription-plan__duration,
.subscription-plan__unavailable,
.subscription-help {
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.7;
}

.subscription-plan__duration {
    margin: 0 0 18px;
}

.subscription-plan__unavailable {
    margin: 10px 0 0;
}

.subscription-button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    max-width: 100%;
    padding: 8px 14px;
    border: 0;
    border-radius: var(--ta-radius-small);
    background: var(--ta-blue);
    color: #ffffff;
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.5;
    text-decoration: none;
    text-align: center;
    cursor: pointer;
}

.subscription-button:hover {
    background: var(--ta-blue-hover);
}

.subscription-button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 3px;
}

.subscription-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.subscription-button--secondary {
    border: 1px solid var(--ta-line);
    color: var(--ta-text);
    background: var(--ta-surface);
}

.subscription-button--secondary:hover {
    background: var(--ta-surface-muted);
}

.subscription-feedback {
    margin: 0;
    padding: 16px;
    border-radius: var(--ta-radius-small);
    background: var(--ta-surface-muted);
    color: var(--ta-text-secondary);
    font-size: 14px;
    line-height: 1.7;
}

.subscription-feedback--error {
    background: var(--ta-orange-soft);
}

.subscription-feedback p {
    margin: 0 0 10px;
}

.subscription-purchase {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    align-items: center;
    gap: 28px;
    padding: 24px;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
}

.subscription-purchase__code img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
}

.subscription-purchase__instructions {
    min-width: 0;
    overflow-wrap: anywhere;
}

.subscription-purchase__instructions p {
    margin: 0 0 10px;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.7;
}

.subscription-purchase__instructions .subscription-purchase__account {
    color: var(--ta-text);
    font-weight: 600;
}

.subscription-help {
    margin: 0;
}

@media (max-width: 720px) {
    .subscription-editions {
        grid-template-columns: 1fr;
    }

    .subscription-account {
        align-items: flex-start;
        flex-direction: column;
        gap: 10px;
    }

    .subscription-account__status {
        text-align: left;
    }

    .subscription-purchase {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 20px;
    }

    .subscription-purchase__code {
        width: min(220px, 100%);
        margin-inline: auto;
    }
}
</style>
