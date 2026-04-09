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
    gap: 18px;
}

.shop-overview-banner__hero {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.9fr);
    gap: 18px;
    padding: 26px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background:
        radial-gradient(circle at top right, rgba(142, 108, 255, 0.18), transparent 28%),
        radial-gradient(circle at bottom left, rgba(85, 104, 255, 0.12), transparent 26%),
        rgba(255, 255, 255, 0.82);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.shop-overview-banner__copy h2,
.shop-overview-banner__copy p,
.metric-card span,
.metric-card strong,
.metric-card small {
    margin: 0;
}

.shop-overview-banner__copy {
    min-width: 0;
}

.shop-overview-banner__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.shop-overview-banner__copy h2 {
    margin-top: 14px;
    color: #16213e;
    font-size: clamp(26px, 2.7vw, 34px);
    line-height: 1.2;
}

.shop-overview-banner__copy p {
    margin-top: 12px;
    color: #627099;
    line-height: 1.8;
}

.shop-overview-banner__dot {
    margin: 0 10px;
    color: #98a2b3;
}

.shop-overview-banner__chips,
.shop-overview-banner__actions,
.shop-overview-banner__metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.shop-overview-banner__chips {
    margin-top: 16px;
}

.status-chip {
    display: inline-flex;
    align-items: center;
    min-height: 38px;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
}

.status-chip--sky {
    color: #2563eb;
    background: rgba(59, 130, 246, 0.12);
}

.status-chip--green {
    color: #067647;
    background: rgba(18, 185, 129, 0.12);
}

.status-chip--slate {
    color: #475467;
    background: rgba(71, 84, 103, 0.12);
}

.status-chip--amber {
    color: #b54708;
    background: rgba(247, 144, 9, 0.14);
}

.shop-overview-banner__actions {
    align-content: start;
    justify-content: flex-end;
}

.banner-button {
    min-height: 48px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.78);
    color: #16213e;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.banner-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(85, 104, 255, 0.12);
}

.banner-button--primary {
    border: none;
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.24);
}

.shop-overview-banner__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card {
    padding: 20px 22px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
}

.metric-card span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.metric-card strong {
    display: block;
    margin-top: 10px;
    color: #16213e;
    font-size: clamp(24px, 2vw, 32px);
    line-height: 1.2;
}

.metric-card small {
    display: block;
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.metric-card--violet {
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.12), rgba(255, 255, 255, 0.92));
}

.metric-card--amber {
    background: linear-gradient(180deg, rgba(255, 182, 72, 0.16), rgba(255, 255, 255, 0.92));
}

.metric-card--emerald {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.14), rgba(255, 255, 255, 0.92));
}

@media (max-width: 1080px) {
    .shop-overview-banner__hero {
        grid-template-columns: 1fr;
    }

    .shop-overview-banner__actions {
        justify-content: flex-start;
    }

    .shop-overview-banner__metrics {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .shop-overview-banner__hero {
        padding: 20px;
        border-radius: 28px;
    }

    .shop-overview-banner__copy h2 {
        font-size: 24px;
    }

    .shop-overview-banner__dot {
        display: none;
    }

    .banner-button {
        width: 100%;
    }
}
</style>
