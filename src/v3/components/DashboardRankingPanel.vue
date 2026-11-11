<template>
    <article class="panel-card">
        <div class="panel-head">
            <div>
                <h3>排行榜</h3>
            </div>
            <div class="panel-actions">
                <button class="text-button" type="button" :aria-pressed="isRankingPreviewMasked"
                    @click="toggleRankingPreviewMask">
                    <i-ep-view aria-hidden="true" />
                    <span>{{ isRankingPreviewMasked ? "显示" : "隐藏" }}</span>
                </button>
                <button class="text-button" type="button" @click="goToPointsPage">
                    查看完整排行榜<i-ep-arrow-right aria-hidden="true" />
                </button>
            </div>
        </div>

        <div class="ranking-filter">
            <div class="ranking-filter__group" role="group" aria-label="排行榜周期">
                <button v-for="item in rankingTimeRangeOptions" :key="item.value" type="button"
                    class="ranking-filter__button" :class="{ 'is-active': rankingTimeRange === item.value }"
                    :aria-pressed="rankingTimeRange === item.value"
                    @click="rankingTimeRange = item.value">
                    {{ item.label }}
                </button>
            </div>
            <span class="ranking-filter__label">总积分</span>
        </div>

        <div v-if="rankingPreview.length === 0" class="ranking-empty-state">
            <strong>暂无排行榜数据</strong>
            <p>当前周期下还没有可展示的积分排名。</p>
        </div>

        <div v-else class="preview-list">
            <article v-for="item in rankingPreview" :key="item.rank" class="preview-item">
                <span class="preview-rank" :class="{ 'is-top': item.rank <= 3, 'is-first': item.rank === 1 }">
                    {{ String(item.rank).padStart(2, "0") }}
                </span>
                <strong class="preview-name" :title="item.title">{{ item.title }}</strong>
                <span class="preview-score">{{ item.value }}</span>
            </article>
        </div>
    </article>
</template>

<script setup lang="ts">
import { pointsManager } from "@/managers/points"
import { studentManager } from "@/managers/student"
import { useCacheStore } from "@/stores/cacheStore"
import type { RankingTimeRange, StudentRankingItem } from "@/types/points"
import type { StudentDTO } from "@/types/student"
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"

/** 定义排行榜面板属性。 */
interface DashboardRankingPanelProps {
    activeClassId: number | null
    currentSemesterId: number | null
}

/** 定义排行榜列表项结构。 */
interface PreviewItem {
    rank: number
    title: string
    value: string
}

/** 定义排行榜周期选项结构。 */
interface RankingTimeRangeOption {
    value: RankingTimeRange
    label: string
}

const props = defineProps<DashboardRankingPanelProps>()

const cacheStore = useCacheStore()
const router = useRouter()
const rankingTimeRange = ref<RankingTimeRange>(cacheStore.getPointsRankingTimeRange())
const rankingStudents = ref<StudentDTO[]>([])
const rankingPreviewResponse = ref<StudentRankingItem[]>([])
const isRankingPreviewMasked = ref<boolean>(cacheStore.getDashboardRankingPreviewMasked())
const rankingTimeRangeOptions: RankingTimeRangeOption[] = [
    { value: "all", label: "全部" },
    { value: "weekly", label: "周榜" },
    { value: "monthly", label: "月榜" }
]

/** 返回学生 ID 到姓名的映射表。 */
const studentIdNameMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {}

    for (const student of rankingStudents.value) {
        const id = student.id ?? 0
        const name = student.name?.trim() ?? ""
        if (!id || !name) {
            continue
        }
        map[id] = name
    }

    return map
})

/** 返回排行榜预览展示数据。 */
const rankingPreview = computed<PreviewItem[]>(() => {
    return rankingPreviewResponse.value.map((item, index) => {
        const rank = typeof item.rank === "number" ? item.rank : index + 1
        const studentId = item.student_id ?? 0
        const studentName = studentIdNameMap.value[studentId] ?? `学生 ${rank}`
        const score = typeof item.score === "number" ? item.score : 0

        return {
            rank,
            title: isRankingPreviewMasked.value ? getMaskedRankingText() : studentName,
            value: isRankingPreviewMasked.value ? getMaskedRankingText() : formatRankingValue(score)
        }
    })
})

/** 格式化排行榜积分展示文本。 */
function formatRankingValue(totalPoints: number): string {
    return String(totalPoints)
}

/** 返回排行榜脱敏后的展示文本。 */
function getMaskedRankingText(): string {
    return "***"
}

/** 切换排行榜预览的脱敏状态。 */
function toggleRankingPreviewMask(): void {
    isRankingPreviewMasked.value = !isRankingPreviewMasked.value
    cacheStore.setDashboardRankingPreviewMasked(isRankingPreviewMasked.value)
}

/** 跳转到积分主页面查看完整排行榜。 */
function goToPointsPage(): void {
    void router.push("/points")
}

/** 加载排行榜所需的学生姓名映射。 */
async function loadRankingStudents(): Promise<void> {
    const classId = props.activeClassId
    if (!classId) {
        rankingStudents.value = []
        return
    }

    try {
        rankingStudents.value = await studentManager.list(classId)
    } catch (error) {
        console.error("获取排行榜学生数据失败", error)
        rankingStudents.value = []
    }
}

/** 加载排行榜接口数据。 */
async function loadRankingPreview(): Promise<void> {
    const classId = props.activeClassId
    if (!classId) {
        rankingPreviewResponse.value = []
        return
    }

    try {
        const response = await pointsManager.getClassRanking({
            class_id: classId,
            time_range: rankingTimeRange.value,
            limit: 10,
        })
        rankingPreviewResponse.value = response.items ?? []
    } catch (error) {
        console.error("获取排行榜数据失败", error)
        rankingPreviewResponse.value = []
    }
}

/** 监听排行榜周期并同步缓存。 */
watch(rankingTimeRange, (value) => {
    cacheStore.setPointsRankingTimeRange(value)
    void loadRankingPreview()
})

/** 监听班级与学期变化后重新加载排行榜数据。 */
watch(() => [props.activeClassId, props.currentSemesterId], async () => {
    await Promise.all([
        loadRankingStudents(),
        loadRankingPreview(),
    ])
}, { immediate: true })
</script>

<style scoped>
.panel-card {
    min-width: 0;
    padding: 22px;
    border: 1px solid var(--ta-line);
    border-radius: 14px;
    background: var(--ta-surface);
    box-shadow: var(--ta-shadow-1);
}

.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 18px;
}

.panel-head h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.015em;
}

.panel-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
}

.text-button {
    padding: 4px 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    color: var(--ta-blue);
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.2;
    cursor: pointer;
    transition: color 140ms ease;
}

.text-button svg {
    width: 16px;
    height: 16px;
}

.ranking-filter {
    margin-bottom: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.ranking-filter__label {
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.ranking-filter__group {
    min-height: 34px;
    padding: 3px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    border: 1px solid var(--ta-line);
    border-radius: 9px;
    background: var(--ta-surface-muted);
}

.ranking-filter__button {
    min-width: 49px;
    min-height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: var(--ta-radius-small);
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 12px;
    cursor: pointer;
}

.ranking-filter__button.is-active {
    color: var(--ta-blue);
    background: var(--ta-surface-solid);
    box-shadow: 0 1px 3px #243a2e0d;
    font-weight: 620;
}

.preview-list {
    display: grid;
}

.preview-item {
    min-height: 47px;
    padding: 9px 0;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--ta-line);
}

.preview-item:first-child {
    border-top: 0;
}

.preview-rank {
    min-height: 24px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}

.preview-rank.is-top {
    color: var(--ta-green);
    background: var(--ta-green-soft);
}

.preview-rank.is-first {
    color: var(--ta-orange);
    background: var(--ta-orange-soft);
}

.preview-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 550;
}

.preview-score {
    color: var(--ta-text);
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.ranking-empty-state,
.empty-state {
    min-height: 180px;
    padding: 24px;
    display: grid;
    place-items: center;
    gap: 7px;
    border-radius: var(--ta-radius-large);
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
    text-align: center;
}

.ranking-empty-state strong,
.empty-state strong {
    color: var(--ta-text);
    font-size: 15px;
}

.ranking-empty-state p,
.empty-state p {
    margin: 0;
    font-size: 13px;
}

@media (hover: hover) and (pointer: fine) {
    .text-button:hover {
        color: var(--ta-blue-hover);
    }
}

@media (max-width: 660px) {
    .panel-head {
        align-items: stretch;
        flex-direction: column;
    }

    .panel-actions {
        justify-content: flex-start;
    }
}
</style>
