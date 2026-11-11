<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AppDialogShell from '@/v3/components/AppDialogShell.vue'
import StudentGrowthStatistics from '@/v3/components/students/StudentGrowthStatistics.vue'
import { useBusinessAccess } from '@/composables/useBusinessAccess'
import { useCacheStore } from '@/stores/cacheStore'
import { useStudentGrowthReport } from '@/v3/composables/useStudentGrowthReport'
import { classApi } from '@/api/class'
import { constrainGrowthPeriod, growthPeriodError, growthReportHtml, growthSemesterDate, previousGrowthPeriod, shanghaiToday } from '@/utils/studentGrowth'

const props = defineProps<{
    modelValue: boolean
    studentId: number
    studentName: string
    classId: number
    semesterId: number
}>()
const emit = defineEmits<{ (event: 'update:modelValue', value: boolean): void }>()
const visible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const cache = useCacheStore()
const { canWrite, canImportExport, allowWrite, allowImportExport } = useBusinessAccess()
const canInterpret = computed(() => canWrite.value && cache.profile?.roleCode !== 'common')
const isCommon = computed(() => cache.profile?.roleCode === 'common')
const {
    report, history, loading, saving, interpreting, historyLoading, error, historyError,
    actionError, dataChanged, loadReport, loadHistory, save, interpret, retry,
} = useStudentGrowthReport({ studentId: props.studentId, semesterId: props.semesterId })
const initialPeriod = previousGrowthPeriod('week')
const preset = shallowRef<'week' | 'month' | 'custom'>('week')
const from = shallowRef(initialPeriod.from)
const to = shallowRef(initialPeriod.to)
const teacherNote = shallowRef('')
const interpretation = shallowRef('')
const savedMessage = shallowRef('')
const historyVisible = shallowRef(false)
const semesterLoading = shallowRef(false)
const semesterError = shallowRef('')
const semesterStart = shallowRef('')
const semesterEnd = shallowRef('')
const periodAdjusted = shallowRef(false)
const maxDate = computed(() => semesterEnd.value && semesterEnd.value < shanghaiToday() ? semesterEnd.value : shanghaiToday())
const periodError = computed(() => growthPeriodError({ from: from.value, to: to.value })
    || (semesterStart.value && from.value < semesterStart.value ? '开始日期不能早于当前学期开始日期' : '')
    || (to.value > maxDate.value ? '结束日期不能晚于当前学期结束日期' : ''))
const busy = computed(() => semesterLoading.value || loading.value || saving.value || interpreting.value)
const displayError = computed(() => semesterError.value || error.value)
const hasDraftChanges = computed(() => !!report.value && (teacherNote.value !== report.value.teacher_note
    || interpretation.value !== report.value.interpretation))
const originalExportOnly = computed(() => dataChanged.value && !!report.value?.id)

watch(report, value => {
    teacherNote.value = value?.teacher_note ?? ''
    interpretation.value = value?.interpretation ?? ''
    savedMessage.value = ''
})

async function applyPeriod(): Promise<void> {
    if (busy.value || periodError.value) return
    await loadReport({ from: from.value, to: to.value })
}

async function selectPreset(value: 'week' | 'month' | 'custom'): Promise<void> {
    preset.value = value
    if (value === 'custom') {
        periodAdjusted.value = false
        return
    }
    const period = previousGrowthPeriod(value)
    const bounded = constrainGrowthPeriod(period, semesterStart.value, maxDate.value, value === 'week' ? 7 : 31)
    periodAdjusted.value = bounded.from !== period.from || bounded.to !== period.to
    from.value = bounded.from
    to.value = bounded.to
    await applyPeriod()
}

async function openSaved(id: number): Promise<void> {
    if (busy.value) return
    await loadReport(id)
    if (report.value) {
        preset.value = 'custom'
        from.value = report.value.from
        to.value = report.value.to
    }
}

async function saveSnapshot(): Promise<void> {
    if (!allowWrite()) return
    if (await save(teacherNote.value, interpretation.value)) savedMessage.value = '已保存一份报告快照，可在历史中重新打开。'
}

async function generateInterpretation(): Promise<void> {
    if (!canInterpret.value || !allowWrite()) return
    const value = await interpret()
    if (value !== null && canInterpret.value) interpretation.value = value
}

function exportReport(): void {
    if (!allowImportExport() || !report.value) return
    const snapshot = originalExportOnly.value ? report.value : {
        ...report.value,
        id: hasDraftChanges.value ? 0 : report.value.id,
        teacher_note: teacherNote.value,
        interpretation: interpretation.value,
    }
    const file = new Blob([growthReportHtml(snapshot)], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${snapshot.student_name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')}_成长报告_${snapshot.from}_${snapshot.to}.html`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    ElMessage.success('已导出离线报告，可用浏览器打开并打印为 PDF')
}

const semesterRequest = new AbortController()
onScopeDispose(() => semesterRequest.abort())

async function initialize(): Promise<void> {
    semesterLoading.value = true
    semesterError.value = ''
    try {
        const response = await classApi.listSemesters(props.classId, semesterRequest.signal)
        if (semesterRequest.signal.aborted) return
        const semester = response.data?.semesters?.find(item => item.id === props.semesterId)
        if (!semester) throw new Error('未找到当前学期，请刷新班级后重试')
        semesterStart.value = growthSemesterDate(semester.start_date)
        semesterEnd.value = growthSemesterDate(semester.end_date)
        const bounded = constrainGrowthPeriod(initialPeriod, semesterStart.value, maxDate.value, 7)
        periodAdjusted.value = bounded.from !== initialPeriod.from || bounded.to !== initialPeriod.to
        from.value = bounded.from
        to.value = bounded.to
        if (periodError.value) throw new Error(periodError.value)
        await loadReport(bounded)
    } catch (cause) {
        if (!semesterRequest.signal.aborted) semesterError.value = cause instanceof Error ? cause.message : '读取学期失败，请重试'
    } finally {
        if (!semesterRequest.signal.aborted) semesterLoading.value = false
    }
}

void initialize()
void loadHistory()
</script>

<template>
    <AppDialogShell v-model="visible" :title="`${studentName}的成长报告`" eyebrow="STUDENT GROWTH"
        description="基于课堂奖励与提醒记录，回看具体变化，留下老师的观察与鼓励。"
        width="980px" height="min(900px, calc(100dvh - 40px))">
        <div class="growth-report">
            <section class="growth-period" aria-label="报告周期">
                <div class="growth-presets" role="group" aria-label="选择周期">
                    <button type="button" :aria-pressed="preset === 'week'" :disabled="busy" @click="selectPreset('week')">上一完整周</button>
                    <button type="button" :aria-pressed="preset === 'month'" :disabled="busy" @click="selectPreset('month')">上一完整月</button>
                    <button type="button" :aria-pressed="preset === 'custom'" :disabled="busy" @click="selectPreset('custom')">自定义</button>
                </div>
                <div class="growth-period-fields">
                    <label>开始日期<input v-model="from" type="date" :disabled="busy || preset !== 'custom'" :min="semesterStart" :max="maxDate" /></label>
                    <span aria-hidden="true">—</span>
                    <label>结束日期<input v-model="to" type="date" :disabled="busy || preset !== 'custom'" :min="semesterStart" :max="maxDate" /></label>
                    <button type="button" class="secondary-button" :disabled="busy || !!periodError" @click="applyPeriod">生成报告</button>
                </div>
                <p v-if="periodError" class="growth-error" role="alert">{{ periodError }}</p>
                <p v-if="periodAdjusted" class="growth-caption">默认周期超出学期范围，已调整为学期内可查看的日期。</p>
                <p v-if="semesterStart" class="growth-caption">当前学期可查看：{{ semesterStart }} 至 {{ maxDate }}</p>
                <p class="growth-caption">每次可查看 1–93 天，统计来自服务端，仅包含规则产生的记录，不含兑换和导入。</p>
            </section>

            <section class="growth-history" aria-label="已保存的报告">
                <div class="growth-section-head">
                    <button type="button" class="growth-text-button" :aria-expanded="historyVisible" @click="historyVisible = !historyVisible">
                        已保存的报告 <span>{{ history.length }} 份</span> {{ historyVisible ? '收起' : '展开' }}
                    </button>
                    <button v-if="historyVisible" type="button" class="growth-text-button" :disabled="historyLoading" @click="loadHistory">{{ historyLoading ? '正在加载…' : '刷新历史' }}</button>
                </div>
                <div v-if="historyVisible">
                    <p v-if="historyLoading" class="growth-caption" role="status">正在加载历史报告…</p>
                    <p v-else-if="historyError" class="growth-error" role="alert">{{ historyError }} <button type="button" class="growth-text-button" @click="loadHistory">重试</button></p>
                    <ul v-else-if="history.length" class="growth-history-list">
                        <li v-for="item in history" :key="item.id"><button type="button" :disabled="busy" @click="openSaved(item.id)">
                            <strong>{{ item.from }} — {{ item.to }}</strong><span>保存于 {{ item.created_at.slice(0, 19).replace('T', ' ') }}</span>
                        </button></li>
                    </ul>
                    <p v-else class="growth-caption">尚无已保存报告。填写寄语后可保存一份快照。</p>
                </div>
            </section>

            <div v-if="semesterLoading || loading" class="growth-state" role="status"><strong>正在整理成长记录…</strong><p>正在核对学期范围、本期、上期及每日规则记录。</p></div>
            <div v-else-if="displayError" class="growth-state" role="alert"><strong>报告加载失败</strong><p>{{ displayError }}</p><button type="button" class="secondary-button" @click="semesterError ? initialize() : retry()">重试</button></div>
            <template v-else-if="report">
                <div class="growth-report-meta">
                    <strong>{{ report.class_name }} · {{ report.semester_name }}</strong>
                    <span>{{ report.from }} — {{ report.to }}</span>
                    <span>{{ report.id ? `已保存快照 #${report.id}` : '实时报告 · 尚未保存' }}</span>
                </div>
                <p v-if="report.id" class="growth-caption">当前展示保存时的统计数据。修改寄语后会另存一份，原报告保持不变。</p>
                <StudentGrowthStatistics :report="report" />

                <section class="growth-editor" aria-label="老师寄语">
                    <label for="growth-teacher-note">老师寄语</label>
                    <p class="growth-caption">记录你亲眼观察到的变化，给学生一句具体的鼓励。</p>
                    <textarea id="growth-teacher-note" v-model="teacherNote" rows="4" maxlength="4000"
                        :disabled="!canWrite || saving" placeholder="例如：这周你主动举手分享了自己的想法，希望你继续保持这份勇气。" />
                </section>

                <section class="growth-editor" aria-label="可选 AI 解读">
                    <div class="growth-section-head">
                        <label for="growth-interpretation">AI 解读 <span class="growth-optional">可选</span></label>
                        <button type="button" class="secondary-button" :disabled="!canInterpret || busy || dataChanged || report.summary.records === 0"
                            @click="generateInterpretation">{{ interpreting ? '正在生成解读…' : isCommon ? 'Pro 版可生成 AI 解读' : interpretation ? '重新生成 AI 解读' : '生成 AI 解读' }}</button>
                    </div>
                    <p class="growth-caption">仅依据本报告记录生成，可能需要约 45 秒。请结合课堂实际核对并编辑，不推断学生能力或成绩。</p>
                    <textarea id="growth-interpretation" v-model="interpretation" rows="5" maxlength="4000"
                        :disabled="!canWrite || saving || interpreting" placeholder="可选择生成 AI 解读，也可以直接填写老师寄语并保存报告。" />
                </section>

                <p v-if="dataChanged" class="growth-error" role="alert">报告数据已变化，请点击“生成报告”重新获取数据后再保存或生成解读。{{ originalExportOnly ? '仍可导出原已保存报告，不含当前未保存的修改。' : '导出保留当前快照和生成时间。' }}</p>
                <p v-else-if="actionError" class="growth-error" role="alert">{{ actionError }}</p>
                <p v-if="savedMessage" class="growth-success" role="status">{{ savedMessage }}</p>
                <p v-if="!canWrite" class="growth-caption">当前仅可查看报告，权益有效时可编辑寄语、保存和生成解读。</p>
                <p class="growth-caption">数据生成于 {{ report.generated_at }}。记录次数反映记录情况，不等同于学生能力或成绩。</p>
            </template>
        </div>
        <template #footer>
            <div class="growth-footer">
                <span>离线 HTML 可直接打开，或通过浏览器打印为 PDF。</span>
                <button type="button" class="secondary-button" :disabled="!report || busy || !canImportExport" @click="exportReport">{{ originalExportOnly ? '导出原已保存报告' : '导出报告' }}</button>
                <button type="button" class="primary-button" :disabled="!report || busy || !canWrite || dataChanged" @click="saveSnapshot">{{ saving ? '正在保存…' : report?.id ? '另存一份快照' : '保存报告快照' }}</button>
            </div>
        </template>
    </AppDialogShell>
</template>

<style scoped>
.growth-report {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    color: var(--ta-text);
}

.growth-report > * {
    min-width: 0;
}

.growth-period {
    display: grid;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    background: var(--ta-surface-muted);
}

.growth-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.growth-presets button {
    padding: 8px 12px;
    border: 1px solid var(--ta-line);
    border-radius: 8px;
    background: var(--ta-surface-solid);
    color: var(--ta-text-secondary);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
}

.growth-presets button[aria-pressed="true"] {
    color: var(--ta-blue);
    border-color: var(--ta-blue);
    background: var(--ta-blue-soft);
}

.growth-period-fields {
    display: flex;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 10px;
}

.growth-period-fields > span {
    align-self: center;
    padding-top: 18px;
    color: var(--ta-text-tertiary);
}

.growth-period-fields label {
    min-width: 0;
    display: grid;
    gap: 5px;
    color: var(--ta-text-secondary);
    font-size: 12px;
}

.growth-period-fields input {
    min-width: 0;
    min-height: 36px;
    padding: 6px 10px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 8px;
    color: var(--ta-text);
    background: var(--ta-surface-solid);
    font: inherit;
}

.growth-caption {
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
    color: var(--ta-text-secondary);
    overflow-wrap: anywhere;
}

.growth-error, .growth-success {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    overflow-wrap: anywhere;
}

.growth-error {
    color: var(--ta-red);
}

.growth-success {
    color: var(--ta-blue);
}

.growth-section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.growth-text-button {
    padding: 6px 0;
    border: 0;
    color: var(--ta-blue);
    background: transparent;
    font: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
}

.growth-text-button span {
    margin: 0 8px;
    color: var(--ta-text-secondary);
}

.growth-history {
    border-bottom: 1px solid var(--ta-line);
    padding-bottom: 14px;
}

.growth-history-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    max-height: 180px;
    overflow-y: auto;
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
}

.growth-history-list button {
    display: grid;
    gap: 4px;
    width: 100%;
    padding: 10px;
    border: 1px solid var(--ta-line);
    border-radius: 8px;
    text-align: left;
    background: var(--ta-surface-solid);
    color: var(--ta-text);
    cursor: pointer;
}

.growth-history-list strong {
    font-size: 12px;
}

.growth-history-list span {
    color: var(--ta-text-secondary);
    font-size: 11px;
}

.growth-state {
    display: grid;
    justify-items: center;
    gap: 12px;
    min-height: 220px;
    align-content: center;
    text-align: center;
    padding: 20px;
    background: var(--ta-surface-muted);
    border-radius: 12px;
}

.growth-state p {
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
}

.growth-report-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: center;
    font-size: 13px;
}

.growth-report-meta > span {
    color: var(--ta-text-secondary);
    font-size: 12px;
}

.growth-editor {
    display: grid;
    gap: 10px;
}

.growth-editor label {
    font-size: 15px;
    font-weight: 600;
}

.growth-optional {
    margin-left: 7px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    font-weight: 400;
}

.growth-editor textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 110px;
    padding: 12px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 10px;
    color: var(--ta-text);
    background: var(--ta-surface-solid);
    font: inherit;
    font-size: 13px;
    line-height: 1.7;
}

.growth-editor textarea:focus {
    outline: 2px solid var(--ta-blue-soft);
    border-color: var(--ta-blue);
}

.growth-footer {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
}

.growth-footer > span {
    flex: 1 1 200px;
    color: var(--ta-text-secondary);
    font-size: 11px;
    line-height: 1.6;
}

.growth-report button:disabled, .growth-footer button:disabled {
    opacity: .45;
    cursor: not-allowed;
}

@media (max-width: 660px) {
    .growth-period {
        padding: 12px;
    }

    .growth-period-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }

    .growth-period-fields > span {
        display: none;
    }

    .growth-period-fields input {
        width: 100%;
        box-sizing: border-box;
        min-height: 42px;
    }

    .growth-period-fields .secondary-button {
        grid-column: 1 / -1;
    }

    .growth-history-list {
        grid-template-columns: 1fr;
    }

    .growth-editor textarea {
        font-size: 16px;
    }

    .growth-footer > span {
        flex-basis: 100%;
    }

    .growth-footer button {
        flex: 1;
        min-height: 42px;
        padding-left: 8px;
        padding-right: 8px;
    }

}
</style>
