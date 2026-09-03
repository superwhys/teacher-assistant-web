<template>
    <section class="shop-overview-banner">
        <div class="shop-overview-banner__hero">
            <div class="shop-overview-banner__copy">
                <span class="shop-overview-banner__eyebrow">积分商城</span>
                <p>
                    {{ activeClassName }} · {{ activeSemesterName }}
                    <span class="shop-overview-banner__dot">/</span>
                    {{ isArchivedSemester ? "当前学期仅可浏览商品" : "当前学期支持正常兑换与商品维护" }}
                </p>

                <div class="shop-overview-banner__chips">
                    <span class="status-chip status-chip--sky">奖品总数 {{ prizeCount }}</span>
                    <span class="status-chip" :class="isArchivedSemester ? 'status-chip--amber' : 'status-chip--green'">
                        {{ isArchivedSemester ? "归档学期" : "最新学期" }}
                    </span>
                    <span class="status-chip status-chip--slate">
                        {{ canMutateShop ? "允许兑换与编辑" : "仅支持查看" }}
                    </span>
                </div>
            </div>

            <div class="shop-overview-banner__actions">
                <button type="button" class="banner-button" @click="emit('openImport')">
                    <i-ep-upload-filled />
                    导入奖品
                </button>
                <button type="button" class="banner-button" @click="emit('viewRecords')">
                    <i-ep-tickets />
                    查看兑换记录
                </button>
                <button type="button" class="banner-button banner-button--primary" @click="emit('addPrize')">
                    <i-ep-plus />
                    新增奖品
                </button>
            </div>
        </div>

        <div class="shop-overview-banner__metrics">
            <article v-for="item in metricItems" :key="item.id" class="metric-card" :class="item.toneClass">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.detail }}</small>
            </article>
        </div>
    </section>
</template>

<script setup lang="ts">
defineOptions({ name: "ShopOverviewBanner" })

/** 定义商城概览指标结构。 */
interface ShopOverviewMetricItem {
    detail: string
    id: string
    label: string
    toneClass: string
    value: string
}

/** 定义商城横幅组件属性。 */
interface ShopOverviewBannerProps {
    activeClassName: string
    activeSemesterName: string
    canMutateShop: boolean
    isArchivedSemester: boolean
    metricItems: ShopOverviewMetricItem[]
    prizeCount: number
}

defineProps<ShopOverviewBannerProps>()

const emit = defineEmits<{
    (e: "addPrize"): void
    (e: "openImport"): void
    (e: "viewRecords"): void
}>()
</script>

<style scoped>
.shop-overview-banner {
    display: grid;
    gap: 14px;
}

.shop-overview-banner__hero {
    min-width: 0;
    padding: 2px 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--ta-line);
}

.shop-overview-banner__copy {
    min-width: 0;
}

.shop-overview-banner__eyebrow {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.shop-overview-banner__copy p {
    margin: 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1.5;
}

.shop-overview-banner__dot {
    margin: 0 7px;
}

.shop-overview-banner__chips,
.shop-overview-banner__actions {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
}

.shop-overview-banner__chips {
    margin-top: 7px;
}

.status-chip {
    min-height: 26px;
    padding: 0 9px;
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
}

.status-chip--sky {
    color: #0064cf;
    background: #e6f2ff;
}

.status-chip--green {
    color: #1b7133;
    background: var(--ta-green-soft);
}

.status-chip--amber {
    color: #a53400;
    background: var(--ta-orange-soft);
}

.banner-button {
    min-height: 38px;
    padding: 0 13px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 13px;
    font-weight: 620;
    white-space: nowrap;
    cursor: pointer;
}

.banner-button svg {
    width: 16px;
    height: 16px;
}

.banner-button--primary {
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 5px 14px rgba(0, 122, 255, 0.18);
}

.shop-overview-banner__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.metric-card {
    min-height: 112px;
    padding: 17px;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--ta-line);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: var(--ta-shadow-1);
}

.metric-card::after {
    content: "";
    position: absolute;
    width: 74px;
    height: 74px;
    right: -24px;
    bottom: -30px;
    border-radius: 50%;
    background: var(--metric-soft, var(--ta-blue-soft));
}

.metric-card span,
.metric-card strong,
.metric-card small {
    position: relative;
    z-index: 1;
    display: block;
}

.metric-card span {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.metric-card strong {
    margin-top: 8px;
    font-size: 27px;
    line-height: 1;
    letter-spacing: -0.025em;
    font-variant-numeric: tabular-nums;
}

.metric-card small {
    margin-top: 9px;
    color: var(--ta-text-secondary);
    font-size: 12px;
    line-height: 1.4;
}

.metric-card--violet {
    --metric-soft: #eee1f6;
}

.metric-card--amber {
    --metric-soft: #ffe6d6;
}

.metric-card--emerald {
    --metric-soft: #dcf2e1;
}

@media (max-width: 920px) {
    .shop-overview-banner__hero {
        align-items: stretch;
        flex-direction: column;
    }

    .shop-overview-banner__actions {
        justify-content: flex-start;
    }
}

@media (max-width: 660px) {
    .shop-overview-banner__actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .banner-button {
        min-width: 0;
        width: 100%;
        padding-inline: 7px;
        font-size: 11px;
    }

    .shop-overview-banner__metrics {
        gap: 8px;
    }

    .metric-card {
        min-height: 104px;
        padding: 13px;
    }

    .metric-card strong {
        font-size: 24px;
    }

    .metric-card small {
        font-size: 10px;
    }
}
</style>
