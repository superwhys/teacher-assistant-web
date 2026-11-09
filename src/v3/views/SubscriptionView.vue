<template>
    <div class="subscription-view">
        <PageHeader eyebrow="SUBSCRIPTION" title="为课堂，添一份从容" description="了解每个版本包含的功能，再选择适合自己的使用期限。">
            <template #actions>
                <RouterLink to="/subscription/orders" class="subscription-button subscription-button--secondary">我的订单</RouterLink>
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

        <p class="subscription-policy">
            <span class="subscription-policy__mark" aria-hidden="true">✓</span>
            每次购买仅支付一次，到期后手动续费，不会自动扣款。
        </p>

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
                    <div class="subscription-edition__header">
                        <h2>{{ edition.name }}</h2>
                        <span class="subscription-edition__label">{{ edition.label }}</span>
                    </div>
                    <ul class="subscription-highlights" aria-label="版本特点">
                        <li v-for="highlight in edition.highlights" :key="highlight.title">
                            <strong>{{ highlight.title }}</strong>
                            <p v-if="highlight.description">{{ highlight.description }}</p>
                        </li>
                    </ul>

                    <div class="subscription-edition__contents">
                        <p class="subscription-edition__caption">套餐能力</p>
                        <ul class="subscription-features">
                            <li v-for="feature in edition.features" :key="feature.title"
                                :class="{ 'subscription-features__item--excluded': feature.included === false }">
                                <svg class="subscription-features__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path v-if="feature.included === false" d="M5 10h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                                    <path v-else d="m5 10 3.1 3.1L15 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                <div>
                                    <strong>{{ feature.title }}</strong>
                                    <p>{{ feature.description }}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div v-if="edition.activePlan" class="subscription-edition__checkout">
                        <div class="subscription-term" role="group" :aria-label="`${edition.name}使用期限`">
                            <button v-for="plan in edition.plans" :key="plan.id" type="button"
                                :aria-pressed="edition.activePlan.id === plan.id" :aria-label="plan.name"
                                :disabled="Boolean(creatingPlanID)"
                                @click="selectEditionPlan(edition.id, plan.id)">
                                {{ plan.days === 365 ? '年卡' : plan.days === 30 ? '月卡' : `${plan.days} 天` }}
                            </button>
                        </div>
                        <div class="subscription-edition__price" aria-live="polite">
                            <strong>{{ subscriptionPrice(edition.activePlan) }}</strong>
                            <span>/ {{ edition.activePlan.days === 365 ? '年卡' : edition.activePlan.days === 30 ? '月卡' : '次' }}</span>
                        </div>
                        <p class="subscription-edition__duration">有效期 {{ edition.activePlan.days }} 天 · 一次付款</p>
                        <button type="button" class="subscription-button subscription-edition__subscribe"
                            :disabled="!catalog.can_purchase || !isSubscriptionPlanAvailable(edition.activePlan) || Boolean(creatingPlanID)"
                            @click="createPurchaseLink(edition.activePlan)">
                            {{ creatingPlanID === edition.activePlan.id ? '正在准备…' : `订阅${edition.name}` }}
                            <span v-if="!creatingPlanID" aria-hidden="true">↗</span>
                        </button>
                        <p v-if="edition.activePlan.purchase_disabled_reason || !isSubscriptionPlanAvailable(edition.activePlan)"
                            class="subscription-plan__unavailable">
                            {{ edition.activePlan.purchase_disabled_reason || '该套餐暂未开放购买' }}
                        </p>
                        <p class="subscription-edition__note">前往微信小程序完成购买</p>
                    </div>
                </section>
            </div>
            <p v-if="editionGroups.length" class="subscription-help">月卡与年卡包含相同的版本功能。有效期内可续费当前版本，到期后可更换版本。</p>
            <p v-if="!catalog.ios_available" class="subscription-help">iPhone 端购买暂未开放，可使用支持的微信终端购买。</p>
        </template>

        <p v-if="purchaseError" class="subscription-feedback subscription-feedback--error" role="alert">{{ purchaseError }}</p>
        <section v-if="purchaseLink" ref="purchaseSection" class="subscription-purchase" aria-label="在小程序完成购买">
            <div class="subscription-purchase__code">
                <img v-if="!linkExpired" :src="purchaseLink.qr_code" alt="微信扫一扫，为当前网页账号购买套餐" />
                <p v-else class="subscription-feedback" role="status">购买入口已过期，请重新生成。</p>
            </div>
            <div class="subscription-purchase__instructions">
                <h2>{{ selectedPlan?.name || '在小程序完成购买' }}</h2>
                <p>使用微信扫一扫，在小程序页面核对开通账号和套餐后付款。</p>
                <p class="subscription-purchase__account">开通账号：{{ purchaseLink.account_name }}</p>
                <p>权益将开通至当前网页账号，扫码购买无需登录或切换小程序账号。</p>
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
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
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
const purchaseSection = ref<HTMLElement | null>(null)
const refreshing = ref(false)
const now = ref(Date.now())
type EditionID = 'common' | 'pro'
const editionPlanIDs = ref<Partial<Record<EditionID, SubscriptionPlanID>>>({})
let generation = 0
let disposed = false
let deadlineTimer: ReturnType<typeof setInterval> | undefined

type EditionFeature = { title: string; description: string; included?: boolean }
type EditionPlan = Pick<SubscriptionPlan, 'id' | 'name' | 'days' | 'price_fen'>
const editionDetails: { id: EditionID; name: string; label: string; highlights: EditionFeature[]; features: EditionFeature[]; plans: EditionPlan[] }[] = [
    { id: 'common', name: '普通版', label: 'COMMON', highlights: [
        { title: '1 个班级', description: '最多创建 1 个班级' },
        { title: '不支持批量导入导出', description: '可逐条维护数据' },
    ], features: [
        { title: '学生维护', description: '逐条添加、编辑学生' },
        { title: '学生分组', description: '基础学生名单，不提供分组操作', included: false },
        { title: 'AI 助手', description: '不提供', included: false },
        { title: '日常课堂功能', description: '积分评分、排行榜、商城兑换、计时、点名、抽奖' },
    ], plans: [
        { id: 'common_month', name: '普通版月卡', days: 30, price_fen: 190 },
        { id: 'common_year', name: '普通版年卡', days: 365, price_fen: 1290 },
    ] },
    { id: 'pro', name: 'Pro 版', label: 'PRO', highlights: [
        { title: '多班级管理', description: '支持创建和管理多个班级' },
        { title: '批量导入导出', description: '名单、评分规则、积分记录等批量处理' },
    ], features: [
        { title: '学生维护', description: '逐条维护、批量添加；Excel 导入在网页版使用' },
        { title: '学生分组', description: '手动分组、随机自动分组；分组导入在网页版使用' },
        { title: 'AI 助手', description: '在网页版查学生和积分、汇总记录，确认后加分或兑换奖品' },
        { title: '日常课堂功能', description: '积分评分、排行榜、商城兑换、计时、点名、抽奖' },
    ], plans: [
        { id: 'pro_month', name: 'Pro 月卡', days: 30, price_fen: 390 },
        { id: 'pro_year', name: 'Pro 年卡', days: 365, price_fen: 1990 },
    ] },
]
const editionGroups = computed(() => editionDetails.map(edition => {
    const plans = catalog.value?.plans.filter(plan => plan.edition === edition.id) || []
    const activePlan = plans.find(plan => plan.id === editionPlanIDs.value[edition.id])
        || plans.find(plan => plan.days === 30) || plans[0]
    return { ...edition, plans, activePlan }
}).filter(edition => edition.plans.length))
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

function selectEditionPlan(edition: EditionID, planID: SubscriptionPlanID): void {
    if (creatingPlanID.value) return
    const group = editionGroups.value.find(group => group.id === edition)
    if (!group?.plans.some(plan => plan.id === planID) || group.activePlan?.id === planID) return
    editionPlanIDs.value[edition] = planID
    clearPurchaseLink()
    purchaseError.value = ''
}

async function loadPlans(): Promise<void> {
    if (loading.value) return
    const version = generation
    loading.value = true
    loadError.value = ''
    try {
        const response = await fetchSubscriptionPlans()
        if (disposed || version !== generation) return
        catalog.value = { ...response.data, plans: editionDetails.flatMap(edition => edition.plans.map(plan => {
            const eligibility = response.data.plans.find(candidate => candidate.id === plan.id)
            return { ...plan, edition: edition.id, available: eligibility?.available === true,
                purchase_disabled_reason: eligibility?.purchase_disabled_reason || (eligibility ? '' : '该套餐暂未开放购买') }
        })) }
    } catch (error) {
        if (disposed || version !== generation) return
        loadError.value = error instanceof Error ? error.message : '套餐加载失败，请重试。'
    } finally {
        if (!disposed && version === generation) loading.value = false
    }
}

async function createPurchaseLink(plan: SubscriptionPlan): Promise<void> {
    const currentPlan = catalog.value?.plans.find(candidate => candidate.id === plan.id)
    if (creatingPlanID.value || !catalog.value?.can_purchase || !isSubscriptionPlanAvailable(plan)
        || !currentPlan || !isSubscriptionPlanAvailable(currentPlan)) return
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
        await nextTick()
        if (!disposed && version === generation && purchaseSection.value) {
            purchaseSection.value.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'start',
            })
        }
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
    editionPlanIDs.value = {}
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
    gap: 16px;
    max-width: 900px;
    width: 100%;
}

.subscription-account {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
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
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 14px;
    line-height: 1.7;
}

.subscription-policy__mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 21px;
    height: 21px;
    border-radius: 50%;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
    font-size: 12px;
}

.subscription-editions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;
    row-gap: 0;
}

.subscription-edition {
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 4;
    row-gap: 0;
    flex-direction: column;
    min-width: 0;
    padding: 22px;
    border: 1px solid var(--ta-line);
    border-radius: 18px;
    background: var(--ta-surface);
    box-shadow: 0 5px 18px #23352f03;
}

.subscription-edition--pro {
    border-color: #a7cec1;
    background: linear-gradient(150deg, #ffffff 8%, #f0f8f3 100%);
}

.subscription-edition__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.subscription-edition h2 {
    margin: 0;
    color: var(--ta-text);
    font-size: 20px;
    font-weight: 650;
    letter-spacing: -0.4px;
}

.subscription-edition__label {
    padding: 4px 9px;
    border: 1px solid var(--ta-line);
    border-radius: 6px;
    color: var(--ta-text-tertiary);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
}

.subscription-edition--pro .subscription-edition__label {
    border-color: #c9e2d7;
    color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.subscription-edition__contents {
    margin: 18px 0 20px;
}

.subscription-highlights {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 14px 0 0;
    padding: 12px;
    border: 1px solid var(--ta-line);
    border-radius: 10px;
    background: var(--ta-surface-muted);
    list-style: none;
}

.subscription-highlights strong {
    color: var(--ta-blue);
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
}

.subscription-highlights p {
    margin: 5px 0 0;
    color: var(--ta-text-secondary);
    font-size: 11px;
    line-height: 1.65;
}

.subscription-edition__caption {
    margin: 0 0 12px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.subscription-features {
    display: grid;
    gap: 11px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.subscription-features li {
    display: flex;
    align-items: flex-start;
    gap: 9px;
}

.subscription-features__icon {
    width: 19px;
    height: 19px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--ta-blue-soft);
    color: var(--ta-blue);
}

.subscription-features__item--excluded .subscription-features__icon {
    background: #eef1ef;
    color: var(--ta-text-tertiary);
}

.subscription-features__item--excluded strong {
    color: var(--ta-text-secondary);
}

.subscription-features strong {
    display: inline;
    margin-right: 7px;
    color: var(--ta-text);
    font-size: 13px;
    font-weight: 550;
    line-height: 1.6;
}

.subscription-features p {
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 12px;
    line-height: 1.7;
    overflow-wrap: anywhere;
}

.subscription-features p {
    display: inline;
}

.subscription-edition__checkout {
    margin-top: 0;
    padding-top: 15px;
    border-top: 1px solid var(--ta-line);
}

.subscription-term {
    display: flex;
    gap: 4px;
    padding: 3px;
    border: 1px solid var(--ta-line);
    border-radius: 999px;
    background: #eaf0ec;
}

.subscription-term button {
    flex: 1;
    min-width: 0;
    min-height: 32px;
    padding: 5px 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ta-text-secondary);
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
    cursor: pointer;
}

.subscription-term button[aria-pressed="true"] {
    background: var(--ta-surface);
    color: var(--ta-text);
    font-weight: 600;
    box-shadow: 0 2px 5px #23352f0d;
}

.subscription-term button:disabled {
    cursor: wait;
}

.subscription-purchase h2 {
    margin: 0 0 20px;
    color: var(--ta-text);
    font-size: 19px;
    font-weight: 650;
}

.subscription-edition__price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin: 15px 0 3px;
    color: var(--ta-text);
}

.subscription-edition__price strong {
    font-size: 30px;
    line-height: 1.2;
    font-weight: 650;
    letter-spacing: -1px;
    font-variant-numeric: tabular-nums;
}

.subscription-edition__price span {
    color: var(--ta-text-secondary);
    font-size: 13px;
}

.subscription-edition__duration,
.subscription-plan__unavailable,
.subscription-help {
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.7;
}

.subscription-edition__duration {
    margin: 4px 0 13px;
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
    transition: transform 160ms ease-out;
}

.subscription-edition__subscribe {
    width: 100%;
    min-height: 42px;
    gap: 8px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 550;
}

.subscription-edition__note {
    margin: 8px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 11px;
    line-height: 1.7;
    text-align: center;
}

.subscription-button:not(:disabled):active {
    transform: scale(0.98);
}

.subscription-button:focus-visible,
.subscription-term button:focus-visible {
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
    scroll-margin-top: 88px;
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

@media (hover: hover) and (pointer: fine) {
    .subscription-button:not(:disabled):hover {
        background: var(--ta-blue-hover);
    }

    .subscription-button--secondary:not(:disabled):hover {
        background: var(--ta-surface-muted);
    }
}

@media (prefers-reduced-motion: reduce) {
    .subscription-button {
        transition: none;
    }

    .subscription-button:not(:disabled):active {
        transform: none;
    }
}

@media (max-width: 720px) {
    .subscription-editions {
        grid-template-columns: 1fr;
        row-gap: 16px;
    }

    .subscription-edition {
        display: flex;
        grid-row: auto;
        padding: 20px;
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
