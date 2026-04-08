<template>
    <article class="panel-card">
        <div class="panel-head">
            <div>
                <h3>排行榜</h3>
            </div>
            <div class="panel-actions">
                <button class="text-button" type="button" @click="toggleRankingPreviewMask">
                    {{ isRankingPreviewMasked ? "显示" : "隐藏" }}
                </button>
                <button class="text-button" type="button" @click="goToPointsPage">查看完整排行榜</button>
            </div>
        </div>

        <div class="ranking-filter">
            <div class="ranking-filter__group" role="tablist" aria-label="排行榜周期">
                <button v-for="item in rankingTimeRangeOptions" :key="item.value" type="button"
                    class="ranking-filter__button" :class="{ 'is-active': rankingTimeRange === item.value }"
                    @click="rankingTimeRange = item.value">
                    {{ item.label }}
                </button>
            </div>
        </div>

        <div v-if="rankingPreview.length === 0" class="ranking-empty-state">
            <strong>暂无排行榜数据</strong>
            <p>当前周期下还没有可展示的积分排名。</p>
        </div>

        <div v-else class="preview-list">
            <article v-for="item in rankingPreview" :key="item.rank" class="preview-item">
                <div>
                    <strong>{{ item.title }}</strong>
                </div>
                <span>{{ item.value }}</span>
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
const isRankingPreviewMasked = ref(false)
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
    return `积分 ${totalPoints}`
}

/** 返回排行榜脱敏后的展示文本。 */
function getMaskedRankingText(): string {
    return "***"
}

/** 切换排行榜预览的脱敏状态。 */
function toggleRankingPreviewMask(): void {
    isRankingPreviewMasked.value = !isRankingPreviewMasked.value
}

/** 跳转到积分主页面查看完整排行榜。 */
function goToPointsPage(): void {
    void router.push("/v3/points")
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
.panel-card,
.preview-item {
    border: 1px solid rgba(122, 141, 198, 0.18);
    box-shadow: 0 18px 36px rgba(71, 90, 150, 0.12);
}

.panel-card {
    padding: 24px;
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px);
}

.panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 18px;
}

.panel-head h3 {
    margin: 0;
}

.panel-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
}

.ranking-filter {
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
}

.ranking-filter__group {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.08);
    border: 1px solid rgba(122, 141, 198, 0.14);
}

.ranking-filter__button {
    min-width: 72px;
    min-height: 36px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.ranking-filter__button:hover {
    color: #3c4fb0;
    transform: translateY(-1px);
}

.ranking-filter__button.is-active {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 10px 18px rgba(85, 104, 255, 0.22);
}

.panel-card,
.preview-item,
.text-button {
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.panel-card:hover,
.preview-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 20px 34px rgba(71, 90, 150, 0.14);
}

.text-button {
    cursor: pointer;
    padding: 0;
    border: none;
    background: transparent;
    color: #5568ff;
    font-weight: 700;
}

.text-button:hover {
    transform: translateX(2px);
}

.preview-list {
    display: grid;
    gap: 14px;
}

.ranking-empty-state {
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 180px;
    padding: 24px;
    border: 1px dashed rgba(122, 141, 198, 0.24);
    border-radius: 24px;
    background: rgba(247, 249, 255, 0.72);
    text-align: center;
}

.ranking-empty-state strong {
    color: #16213e;
    font-size: 16px;
}

.ranking-empty-state p {
    margin: 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

.preview-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 16px 18px;
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(247, 249, 255, 0.96), rgba(255, 255, 255, 0.9));
}

.preview-item strong {
    display: block;
    margin: 0;
    font-size: 17px;
}

.preview-item span {
    font-weight: 800;
    white-space: nowrap;
}

@media (max-width: 768px) {
    .panel-actions {
        justify-content: flex-start;
    }
}
</style>
