import { computed, onScopeDispose, ref, watch } from "vue";
import { useBusinessAccess } from "@/composables/useBusinessAccess";
import { flattenRuleGroups, pointsManager, type UiPointsRule } from "@/managers/points";
import { studentManager } from "@/managers/student";
import { useCacheStore } from "@/stores/cacheStore";
import { isApiRequestError } from "@/types/api";
import type { RuleGroup } from "@/types/points";

type RollCallStudent = { id: number; name: string; availablePoints: number }
type RuleSelection = Pick<UiPointsRule, "id">
type ScoreFeedback = { text: string; uncertain: boolean }

export function useRollCall() {
    const cache = useCacheStore()
    const { canWrite, allowWrite } = useBusinessAccess()
    const classId = computed(() => cache.getActiveClassId())
    const semesterId = computed(() => cache.getActiveSemesterId())
    const canScore = computed(() => canWrite.value && !!semesterId.value && cache.getActiveSemesterStatus() === 1)
    const students = ref<RollCallStudent[]>([])
    const selected = ref<RollCallStudent | null>(null)
    const loading = ref(false)
    const rosterError = ref(false)
    const groups = ref<RuleGroup[]>([])
    const rulesLoading = ref(false)
    const rulesError = ref("")
    const selectorVisible = ref(false)
    const selectorTab = ref<"all" | "plus" | "minus">("plus")
    const applying = ref(false)
    const feedback = ref<ScoreFeedback | null>(null)
    const lastRuleId = ref<number | null>(null)
    let scopeVersion = 0
    let rulesLoaded = false

    const rules = computed(() => flattenRuleGroups(groups.value))
    const quickRules = computed(() => {
        const recent = rules.value.find(rule => rule.id === lastRuleId.value)
        const positive = rules.value.filter(rule => rule.sign === "plus" && rule.id !== recent?.id)
        return (recent ? [recent, ...positive] : positive).slice(0, 2)
    })

    async function loadRoster() {
        const version = scopeVersion
        const id = classId.value
        if (!id || loading.value) return
        loading.value = true
        rosterError.value = false
        try {
            const list = await studentManager.list(id)
            if (version !== scopeVersion) return
            students.value = list.flatMap(student => student.id && student.name?.trim()
                ? [{ id: student.id, name: student.name.trim(), availablePoints: Number(student.available_points) || 0 }] : [])
        } catch {
            if (version === scopeVersion) rosterError.value = true
        } finally {
            if (version === scopeVersion) loading.value = false
        }
    }

    async function loadRules() {
        if (rulesLoaded || rulesLoading.value || !selected.value || !canScore.value) return
        const version = scopeVersion
        rulesError.value = ""
        rulesLoading.value = true
        try {
            const result = await pointsManager.listRuleGroups()
            if (version !== scopeVersion) return
            groups.value = result
            rulesLoaded = true
        } catch {
            if (version === scopeVersion) rulesError.value = "积分规则加载失败，请重试。"
        } finally {
            if (version === scopeVersion) rulesLoading.value = false
        }
    }

    function draw() {
        if (!allowWrite() || applying.value || loading.value || !students.value.length) return
        selected.value = students.value[Math.floor(Math.random() * students.value.length)] ?? null
        feedback.value = null
        selectorVisible.value = false
        void loadRules()
    }

    function openSelector() {
        if (!allowWrite() || !canScore.value || !selected.value || applying.value || feedback.value?.uncertain) return
        selectorTab.value = "plus"
        selectorVisible.value = true
        void loadRules()
    }

    async function applyRule(selection: RuleSelection, count = 1) {
        const student = selected.value
        const rule = rules.value.find(item => item.id === selection.id)
        const targetClassId = classId.value
        const targetSemesterId = semesterId.value
        if (!allowWrite() || !canScore.value || !student || !rule || !targetClassId || !targetSemesterId
            || applying.value || feedback.value?.uncertain || (feedback.value && !selectorVisible.value)
            || !Number.isInteger(count) || count < 1 || count > 100) return

        const version = scopeVersion
        applying.value = true
        try {
            const wallet = await pointsManager.applyRule(targetClassId, rule.id, student.id, count, targetSemesterId)
            if (version !== scopeVersion) return
            if (wallet.available_points !== undefined) student.availablePoints = wallet.available_points
            lastRuleId.value = rule.id
            feedback.value = {
                text: `${student.name} · ${rule.name} ${rule.sign === "plus" ? "+" : "−"}${Math.abs(rule.points) * count} 分`,
                uncertain: false,
            }
            selectorVisible.value = false
        } catch (error) {
            if (version !== scopeVersion) return
            // 业务拒绝已由请求层展示。连接中断时先核对流水，避免将同一次操作再次发出。
            if (!isApiRequestError(error) || error.code === undefined) {
                feedback.value = { text: `${student.name}的评分结果未确认，请先核对积分记录。`, uncertain: true }
                selectorVisible.value = false
            }
        } finally {
            if (version === scopeVersion) applying.value = false
        }
    }

    watch([classId, semesterId, () => cache.token], () => {
        scopeVersion++
        students.value = []
        selected.value = null
        loading.value = false
        rosterError.value = false
        groups.value = []
        rulesLoaded = false
        rulesLoading.value = false
        rulesError.value = ""
        selectorVisible.value = false
        applying.value = false
        feedback.value = null
        lastRuleId.value = null
        void loadRoster()
    }, { immediate: true, flush: "sync" })
    watch(canScore, allowed => {
        if (!allowed) selectorVisible.value = false
        else if (selected.value) void loadRules()
    })
    onScopeDispose(() => { scopeVersion++ })

    return {
        students, selected, loading, rosterError, canWrite, canScore, groups, quickRules, rulesLoading, rulesError,
        selectorVisible, selectorTab, applying, feedback, loadRoster, loadRules, draw, openSelector, applyRule,
    }
}
