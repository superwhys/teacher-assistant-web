<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import { useCacheStore } from '@/stores/cacheStore'
import { studentManager } from '@/managers/student'
import { pointsManager } from '@/managers/points'

import type { ApiGender, StudentDTO, StudentGroupDTO } from '@/types/student'
import type { RankingTimeRange, StudentRankingItem, RuleGroup } from '@/types/points'

import PointsRankingPanel from '@/components/points/PointsRankingPanel.vue'
import PointsStudentList, { type UiPointsStudent } from '@/components/points/PointsStudentList.vue'
import PointsBottomActions, { type SortOption } from '@/components/points/PointsBottomActions.vue'
import PointsRuleSelectorDialog from '@/components/points/PointsRuleSelectorDialog.vue'

defineOptions({ name: 'PointsView' })

const router = useRouter()
const cacheStore = useCacheStore()

const students = ref<StudentDTO[]>([])
const groups = ref<StudentGroupDTO[]>([])
const ruleGroups = ref<RuleGroup[]>([])
const classRankingItems = ref<StudentRankingItem[]>([])

const activeClassId = computed<number | null>(() => cacheStore.getActiveClassId())
const activeClassName = computed(() => cacheStore.getActiveClassName() ?? '')

function toUiGender(gender?: ApiGender): UiPointsStudent['gender'] {
    if (gender === 2) return 'female'
    if (gender === 1) return 'male'
    return 'unknown'
}

const uiStudents = computed<UiPointsStudent[]>(() => {
    return (students.value ?? [])
        .map(s => ({
            id: s.id ?? 0,
            name: s.name ?? '',
            gender: toUiGender(s.gender),
        }))
        .filter(s => s.id > 0 && !!s.name)
})

const studentIdNameMap = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    for (const s of uiStudents.value) {
        map[s.id] = s.name
    }
    return map
})

const groupOptions = computed(() => {
    return (groups.value ?? [])
        .map(g => ({
            id: g.id ?? 0,
            name: g.name ?? '',
            memberCount: (g.students ?? []).length,
            memberIds: (g.students ?? []).map(s => s.id ?? 0).filter(id => id > 0),
        }))
        .filter(g => g.id > 0 && !!g.name)
})

const groupIdToMemberSet = computed(() => {
    const map = new Map<number, Set<number>>()
    for (const g of groupOptions.value) {
        map.set(g.id, new Set(g.memberIds))
    }
    return map
})

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const activeRankingTab = ref<'total' | 'item'>(
    (localStorage.getItem('ranking-tab') === 'item' ? 'item' : 'total')
)
const rankingTimeRange = ref<RankingTimeRange>(
    (['all', 'weekly', 'monthly'] as string[]).includes(localStorage.getItem('ranking-time-range') || '')
        ? (localStorage.getItem('ranking-time-range') as RankingTimeRange)
        : 'all'
)

watch(activeRankingTab, (val) => {
    localStorage.setItem('ranking-tab', val)
})

watch(rankingTimeRange, (val) => {
    localStorage.setItem('ranking-time-range', val)
})

const rulesFlat = computed(() => {
    const flat: Array<{ id: number; name: string; sign: 'plus' | 'minus'; points: number }> = []
    for (const g of ruleGroups.value ?? []) {
        for (const r of g.rules ?? []) {
            const id = toNumber(r.id, 0)
            const name = (r.name ?? '').trim()
            if (!id || !name) continue
            const points = toNumber(r.points, 0)
            const t = toNumber(r.points_type, 0)
            const sign = t === 2 ? 'minus' : (t === 1 ? 'plus' : (points < 0 ? 'minus' : 'plus'))
            flat.push({ id, name, sign, points })
        }
    }
    return flat
})

const totalPointsById = computed<Record<number, number>>(() => {
    const map: Record<number, number> = {}
    for (const s of students.value ?? []) {
        const id = s.id ?? 0
        if (!id) continue
        map[id] = toNumber(s.total_points, 0)
    }
    return map
})

const availablePointsById = computed<Record<number, number>>(() => {
    const map: Record<number, number> = {}
    for (const s of students.value ?? []) {
        const id = s.id ?? 0
        if (!id) continue
        map[id] = toNumber(s.available_points, 0)
    }
    return map
})

const rankingPointsMapByName = computed<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    if ((classRankingItems.value ?? []).length > 0) {
        for (const it of classRankingItems.value ?? []) {
            const sid = toNumber(it.student_id, 0)
            const name = studentIdNameMap.value[sid] ?? ''
            if (!name) continue
            map[name] = toNumber(it.score, 0)
        }
        return map
    }

    // 后端排行榜未接入前兜底：使用学生列表返回的 total_points
    for (const s of uiStudents.value) {
        map[s.name] = totalPointsById.value[s.id] ?? 0
    }
    return map
})

const selectedGroupId = ref<number | null>(null)
const keyword = ref('')
const sortBy = ref<SortOption>('default')
const layoutMode = ref<'card' | 'list'>('card')

onMounted(async () => {
    const savedSort = localStorage.getItem('students-sort')
    if (savedSort) {
        const valid: SortOption[] = ['default', 'name-asc', 'name-desc', 'available-asc', 'available-desc', 'total-asc', 'total-desc']
        if ((valid as string[]).includes(savedSort)) sortBy.value = savedSort as SortOption
    }

    const savedLayout = localStorage.getItem('points-layout')
    if (savedLayout === 'card' || savedLayout === 'list') layoutMode.value = savedLayout

    await refreshBase()
    if (activeRankingTab.value === 'item') {
        await ensureRuleGroupsLoaded()
    }
})

watch(sortBy, (val) => {
    localStorage.setItem('students-sort', val)
})

watch(layoutMode, (val) => {
    localStorage.setItem('points-layout', val)
})

watch(activeClassId, async () => {
    selectedGroupId.value = null
    keyword.value = ''
    selectedIds.value = []
    ruleGroups.value = []
    classRankingItems.value = []
    await refreshBase()
    if (activeRankingTab.value === 'item') {
        await ensureRuleGroupsLoaded()
    }
})

watch(selectedGroupId, () => {
    selectedIds.value = []
})

watch(rankingTimeRange, async () => {
    await loadRanking()
})

watch(activeRankingTab, async (tab) => {
    if (tab === 'item') {
        await ensureRuleGroupsLoaded()
    }
})

async function refreshBase() {
    if (!activeClassId.value) {
        students.value = []
        groups.value = []
        classRankingItems.value = []
        return
    }

    try {
        const clsId = activeClassId.value
        const [stu, grp] = await Promise.all([
            studentManager.list(clsId),
            studentManager.listGroups(clsId),
        ])
        students.value = stu
        groups.value = grp
        await loadRanking()
    } catch (err) {
        console.error(err)
    }
}

async function loadRanking() {
    if (!activeClassId.value) {
        classRankingItems.value = []
        return
    }
    try {
        const resp = await pointsManager.getClassRanking({
            class_id: activeClassId.value,
            time_range: rankingTimeRange.value,
            limit: 50,
        })
        classRankingItems.value = resp.items ?? []
    } catch (err) {
        console.error(err)
        classRankingItems.value = []
    }
}

const ruleGroupsLoading = ref(false)
async function ensureRuleGroupsLoaded() {
    if (ruleGroups.value.length > 0) return
    if (ruleGroupsLoading.value) return
    ruleGroupsLoading.value = true
    try {
        ruleGroups.value = await pointsManager.listRuleGroups()
    } catch (err) {
        console.error(err)
        ruleGroups.value = []
    } finally {
        ruleGroupsLoading.value = false
    }
}

const filteredStudents = computed<UiPointsStudent[]>(() => {
    let list = uiStudents.value

    if (selectedGroupId.value) {
        const set = groupIdToMemberSet.value.get(selectedGroupId.value)
        if (set) list = list.filter(s => set.has(s.id))
    }

    const kw = keyword.value.trim().toLowerCase()
    if (kw) {
        list = list.filter(s => s.name.toLowerCase().includes(kw))
    }

    const sort = sortBy.value
    if (sort === 'default') return list

    const sorted = [...list]
    if (sort === 'name-asc') {
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    } else if (sort === 'name-desc') {
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
    } else if (sort === 'available-asc') {
        sorted.sort((a, b) => (availablePointsById.value[a.id] ?? 0) - (availablePointsById.value[b.id] ?? 0))
    } else if (sort === 'available-desc') {
        sorted.sort((a, b) => (availablePointsById.value[b.id] ?? 0) - (availablePointsById.value[a.id] ?? 0))
    } else if (sort === 'total-asc') {
        sorted.sort((a, b) => (totalPointsById.value[a.id] ?? 0) - (totalPointsById.value[b.id] ?? 0))
    } else if (sort === 'total-desc') {
        sorted.sort((a, b) => (totalPointsById.value[b.id] ?? 0) - (totalPointsById.value[a.id] ?? 0))
    }
    return sorted
})

const selectedIds = ref<number[]>([])

function clearSelection() {
    selectedIds.value = []
}

type SelectorTab = 'all' | 'plus' | 'minus'
const selectorVisible = ref(false)
const selectorTab = ref<SelectorTab>('plus')
const selectorTargets = ref<number[]>([])

async function openSelectorForStudents(studentIds: number[], tab: SelectorTab) {
    await ensureRuleGroupsLoaded()
    selectorTargets.value = studentIds
    selectorTab.value = tab
    selectorVisible.value = true
}

async function openSelectorForAll(tab: SelectorTab) {
    const ids = selectedIds.value.length > 0 ? selectedIds.value : filteredStudents.value.map(s => s.id)
    if (!activeClassId.value || ids.length === 0) {
        ElMessage.info('没有可操作的学生')
        return
    }
    await openSelectorForStudents(ids, tab)
}

async function refreshStudentsAndRanking() {
    if (!activeClassId.value) return
    try {
        students.value = await studentManager.list(activeClassId.value)
    } catch (err) {
        console.error(err)
    }
    await loadRanking()
}

async function onSelectRule(rule: { id: number; name: string; sign: 'plus' | 'minus'; points: number }) {
    if (!activeClassId.value) return
    const ids = selectorTargets.value.filter(id => id > 0)
    if (ids.length === 0) return

    try {
        await pointsManager.applyRuleBatch(rule.id, ids)
        await refreshStudentsAndRanking()
        selectorVisible.value = false
        const target = ids.length > 3
            ? `${ids.slice(0, 3).map(id => studentIdNameMap.value[id]).filter(Boolean).join('、')} 等${ids.length}人`
            : ids.map(id => studentIdNameMap.value[id]).filter(Boolean).join('、')
        ElMessage.success(`已对「${target}」${rule.sign === 'plus' ? '加' : '减'}${Math.abs(rule.points)} 分（${rule.name}）`)
        if (selectedIds.value.length > 0) clearSelection()
    } catch {
        ElMessage.error('操作失败')
    }
}

async function undoOnce() {
    if (!activeClassId.value) return
    const resp = await pointsManager.listApplyRecords({ class_id: activeClassId.value, limit: 1, offset: 0 })
    const latestId = toNumber(resp.items?.[0]?.id, 0)
    if (!latestId) {
        ElMessage.info('没有可撤回的操作')
        return
    }
    try {
        await pointsManager.undoApply(latestId)
        await refreshStudentsAndRanking()
        ElMessage.success('已撤回最近一次操作')
    } catch {
        ElMessage.error('撤回失败')
    }
}

function openHistory(studentName: string) {
    router.push({ path: '/points/history', query: { q: studentName } })
}
</script>

<template>
    <div class="points-page">
        <PointsRankingPanel
            :students="uiStudents.map(s => ({ studentName: s.name, gender: (s.gender === 'unknown' ? 'male' : s.gender) }))"
            :class-id="activeClassId"
            :total-points-map="rankingPointsMapByName"
            :rules="rulesFlat"
            :student-id-name-map="studentIdNameMap"
            v-model:time-range="rankingTimeRange"
            v-model:active-tab="activeRankingTab"
        >
            <PointsStudentList
                :active="!!activeClassId"
                :class-name="activeClassName"
                :students="filteredStudents"
                :layout-mode="layoutMode"
                :selected-ids="selectedIds"
                :available-points-map="availablePointsById"
                :total-points-map="totalPointsById"
                @update:layout-mode="layoutMode = $event"
                @update:selected-ids="selectedIds = $event"
                @open-apply="openSelectorForStudents($event.studentIds, $event.tab)"
                @open-history="openHistory($event.studentName)"
            />
        </PointsRankingPanel>

        <PointsBottomActions
            :active-class-id="activeClassId"
            :groups="groupOptions.map(g => ({ id: g.id, name: g.name, memberCount: g.memberCount }))"
            :selected-group-id="selectedGroupId"
            :sort-by="sortBy"
            :keyword="keyword"
            :selected-count="selectedIds.length"
            :can-undo="!!activeClassId"
            :has-students="filteredStudents.length > 0"
            @update:selected-group-id="selectedGroupId = $event"
            @update:sort-by="sortBy = $event"
            @update:keyword="keyword = $event"
            @open-apply-all="openSelectorForAll($event.tab)"
            @clear-selection="clearSelection"
            @undo-once="undoOnce"
        />

        <PointsRuleSelectorDialog
            v-model="selectorVisible"
            v-model:tab="selectorTab"
            :groups="ruleGroups"
            @select="onSelectRule"
        />
    </div>
</template>

<style scoped>
.points-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
}
</style>
