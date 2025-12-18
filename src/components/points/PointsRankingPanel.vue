<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { Student } from '@/types/student'
import PointsRankingCard from '@/components/PointsRankingCard.vue'
import PointsRuleRankingCard, { type UiRuleOption } from '@/components/points/PointsRuleRankingCard.vue'
import type { RankingTimeRange } from '@/types/points'

defineOptions({ name: 'PointsRankingPanel' })

interface Props {
    students: Student[]
    classId: number | null
    totalPointsMap: Record<string, number>
    rules: UiRuleOption[]
    studentIdNameMap: Record<number, string>
    timeRange: RankingTimeRange
    activeTab: 'total' | 'item'
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:timeRange', v: RankingTimeRange): void
    (e: 'update:activeTab', v: 'total' | 'item'): void
}>()

const isRankingCollapsed = ref(false)
const isRankingAnimating = ref(false)
const showRankingContent = ref(true)
const windowWidth = ref(window.innerWidth)

function handleResize() {
    windowWidth.value = window.innerWidth
    if (windowWidth.value <= 768) {
        isRankingCollapsed.value = false
        showRankingContent.value = true
    }
}

onMounted(() => {
    const saved = localStorage.getItem('ranking-collapsed')
    if (windowWidth.value > 768 && saved !== null) {
        isRankingCollapsed.value = saved === 'true'
        showRankingContent.value = !isRankingCollapsed.value
    } else if (windowWidth.value <= 768) {
        isRankingCollapsed.value = false
        showRankingContent.value = true
    }

    window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})

watch(isRankingCollapsed, (val) => {
    localStorage.setItem('ranking-collapsed', String(val))
})

function toggleRanking() {
    if (isRankingAnimating.value) return
    isRankingAnimating.value = true

    if (isRankingCollapsed.value) {
        isRankingCollapsed.value = false
        setTimeout(() => {
            showRankingContent.value = true
            isRankingAnimating.value = false
        }, 300)
    } else {
        showRankingContent.value = false
        setTimeout(() => {
            isRankingCollapsed.value = true
            isRankingAnimating.value = false
        }, 50)
    }
}

const innerTimeRange = computed<RankingTimeRange>({
    get: () => props.timeRange,
    set: (v) => emit('update:timeRange', v),
})

const innerActiveTab = computed<'total' | 'item'>({
    get: () => props.activeTab,
    set: (v) => emit('update:activeTab', v),
})
</script>

<template>
    <div class="content-area" :class="{ 'ranking-collapsed': isRankingCollapsed }">
        <div class="ranking-column">
            <Transition name="ranking-fade">
                <div v-show="showRankingContent" class="ranking-container">
                    <div class="ranking-filter">
                        <el-radio-group v-model="innerTimeRange" size="small">
                            <el-radio-button label="all">全部</el-radio-button>
                            <el-radio-button label="weekly">周榜</el-radio-button>
                            <el-radio-button label="monthly">月榜</el-radio-button>
                        </el-radio-group>
                    </div>
                    <el-tabs v-model="innerActiveTab" class="ranking-tabs" stretch>
                        <el-tab-pane label="积分榜" name="total">
                            <PointsRankingCard :students="students" :points-map="totalPointsMap" :max-display="10" />
                        </el-tab-pane>
                        <el-tab-pane label="单项榜" name="item">
                            <PointsRuleRankingCard
                                :students="students"
                                :rules="rules"
                                :student-id-name-map="studentIdNameMap"
                                :class-id="classId"
                                :max-display="10"
                                :time-range="innerTimeRange"
                            />
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </Transition>
        </div>

        <button class="ranking-toggle-btn" @click="toggleRanking" :title="isRankingCollapsed ? '展开排行榜' : '收起排行榜'">
            <i-ep-d-arrow-right v-if="isRankingCollapsed" />
            <i-ep-d-arrow-left v-else />
        </button>

        <slot />
    </div>
</template>

<style scoped>
.content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 16px;
    display: grid;
    grid-template-columns: 360px auto 1fr;
    gap: 0;
    transition: grid-template-columns 0.3s ease;
}

.content-area.ranking-collapsed {
    grid-template-columns: 0px auto 1fr;
}

.ranking-column {
    height: 100%;
    overflow: hidden;
    transition: all 0.3s ease;
    padding-right: 8px;
}

.ranking-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ranking-filter {
    display: flex;
    justify-content: center;
    padding: 0 4px;
}

.ranking-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.ranking-tabs :deep(.el-tabs__header) {
    margin: 0;
    background: #fafbff;
    border-bottom: 1px solid #e6e8f0;
}

.ranking-tabs :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background-color: #e6e8f0;
}

.ranking-tabs :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
}

.ranking-tabs :deep(.el-tab-pane) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.ranking-tabs :deep(.ranking-card) {
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
}

.ranking-fade-enter-active {
    transition: opacity 0.2s ease 0.1s;
}

.ranking-fade-leave-active {
    transition: opacity 0.15s ease;
}

.ranking-fade-enter-from,
.ranking-fade-leave-to {
    opacity: 0;
}

.ranking-toggle-btn {
    width: 32px;
    height: 80px;
    border: none;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.04);
    color: #999;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    padding: 0;
}

.ranking-toggle-btn :deep(.el-icon) {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.04);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.ranking-toggle-btn:hover {
    color: #667eea;
}

.ranking-toggle-btn:hover :deep(.el-icon) {
    background: rgba(102, 126, 234, 0.08);
    transform: scale(1.1);
}

.ranking-toggle-btn:active :deep(.el-icon) {
    transform: scale(0.95);
}

@media (max-width: 1024px) {
    .content-area {
        grid-template-columns: 300px auto 1fr;
    }

    .content-area.ranking-collapsed {
        grid-template-columns: 0px auto 1fr;
    }

    .ranking-toggle-btn {
        width: 28px;
    }
}

@media (max-width: 768px) {
    .content-area {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        gap: 12px;
    }

    .content-area.ranking-collapsed {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
    }

    .ranking-column {
        display: none;
        max-height: 350px;
        padding-right: 0;
    }

    .ranking-toggle-btn {
        display: none;
    }
}
</style>


