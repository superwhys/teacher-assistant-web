<template>
    <AppDialogShell v-model="visible" title="自动分组" eyebrow="随机分组" width="780px" :busy="busy"
        description="随机分配全班学生，先预览，再确认替换当前分组。">
        <div class="random-group-dialog">
            <div class="group-mode" role="group" aria-label="分组方式">
                <button type="button" :aria-pressed="mode === 'count'" :disabled="busy"
                    @click="mode = 'count'">按组数</button>
                <button type="button" :aria-pressed="mode === 'size'" :disabled="busy"
                    @click="mode = 'size'">按每组人数</button>
            </div>

            <div class="group-settings">
                <label class="group-amount">
                    <span>{{ mode === 'count' ? '分成几组' : '每组最多几人' }}</span>
                    <input v-model="amountInput" type="number" min="1" step="1" :disabled="busy"
                        :aria-label="mode === 'count' ? '组数' : '每组人数上限'" @keydown.enter.prevent="generatePreview">
                </label>
                <button type="button" class="primary-button" :disabled="!active || busy || !students.length"
                    @click="generatePreview">{{ preview.length ? '重新随机' : '生成预览' }}</button>
            </div>
            <p class="group-hint">全班 {{ students.length }} 人参与，组间人数尽量均匀，每位学生只分配一次。</p>
            <p v-if="validationError || error" class="group-error" role="alert">{{ validationError || error }}</p>

            <div v-if="preview.length" class="group-preview" aria-live="polite">
                <article v-for="group in preview" :key="group.name" class="preview-card">
                    <div class="preview-head">
                        <strong>{{ group.name }}</strong>
                        <span>{{ group.students.length }} 人</span>
                    </div>
                    <div class="preview-members">
                        <span v-for="student in group.students" :key="student.id">{{ student.name }}</span>
                    </div>
                </article>
            </div>
            <div v-else class="group-empty">设置组数或每组人数，生成结果后可重新随机。</div>

            <p class="replace-notice">
                确认后将替换当前 {{ existingGroupCount }} 个分组及成员安排，学生资料和积分保持不变。
            </p>
        </div>
        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" :disabled="busy" @click="visible = false">取消</button>
                <button type="button" class="primary-button" :disabled="busy || !active || !preview.length"
                    @click="confirmGroups">{{ busy ? '正在保存...' : '确认并替换分组' }}</button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ApplyRandomGroupsReq } from "@/types/student";
import { createRandomGroups, type RandomGroupingMode, type RandomGroupStudent, type RandomStudentGroup } from "@/utils/randomGroups";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

interface StudentsRandomGroupDialogProps {
    active: boolean
    busy: boolean
    error: string
    existingGroupCount: number
    modelValue: boolean
    students: RandomGroupStudent[]
}

const props = defineProps<StudentsRandomGroupDialogProps>()
const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "confirm", groups: ApplyRandomGroupsReq["groups"]): void
    (e: "clear-error"): void
}>()
const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})
const mode = ref<RandomGroupingMode>("count")
const amountInput = ref("4")
const preview = ref<RandomStudentGroup[]>([])
const validationError = ref("")

function generatePreview(): void {
    if (!props.active || props.busy) return
    emit("clear-error")
    try {
        preview.value = createRandomGroups(props.students, mode.value, Number(amountInput.value))
        validationError.value = ""
    } catch (error) {
        preview.value = []
        validationError.value = error instanceof Error ? error.message : "无法生成分组，请检查设置"
    }
}

function confirmGroups(): void {
    if (!props.active || props.busy || !preview.value.length) return
    emit("confirm", preview.value.map(group => ({
        name: group.name,
        student_ids: group.students.map(student => student.id)
    })))
}

watch(() => props.modelValue, (isOpen) => {
    if (!isOpen) return
    mode.value = "count"
    amountInput.value = String(Math.min(4, props.students.length) || 1)
    preview.value = []
    validationError.value = ""
})

watch([mode, amountInput, () => props.students.map(student => student.id).join(",")], () => {
    preview.value = []
    validationError.value = ""
    emit("clear-error")
})
</script>

<style scoped>
.random-group-dialog {
    display: grid;
    gap: 14px;
}

.dialog-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

.group-mode {
    display: flex;
    gap: 6px;
    padding: 4px;
    border-radius: 12px;
    background: var(--ta-surface-muted);
}

.group-mode button {
    flex: 1;
    min-height: 40px;
    border: 0;
    border-radius: 9px;
    color: var(--ta-text-secondary);
    background: transparent;
    font: inherit;
    cursor: pointer;
}

.group-mode button[aria-pressed="true"] {
    color: var(--ta-blue);
    background: var(--ta-surface-solid);
}

.group-settings {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}

.group-amount {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 8px;
    color: var(--ta-text);
    font-size: 14px;
}

.group-amount input {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    padding: 0 12px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 10px;
    color: var(--ta-text);
    background: var(--ta-surface-solid);
    font: inherit;
}

.group-settings button {
    min-height: 44px;
}

.group-hint,
.group-error,
.replace-notice {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
}

.group-hint {
    color: var(--ta-text-secondary);
}

.group-error {
    color: var(--ta-red);
}

.group-preview {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.preview-card {
    padding: 14px;
    border: 1px solid var(--ta-line);
    border-radius: 12px;
    background: var(--ta-surface-solid);
}

.preview-head {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
    color: var(--ta-text);
    font-size: 14px;
}

.preview-head span {
    flex-shrink: 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
}

.preview-members {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
}

.preview-members span {
    max-width: 100%;
    padding: 5px 8px;
    border-radius: 7px;
    color: var(--ta-text-secondary);
    background: var(--ta-surface-muted);
    font-size: 13px;
    overflow-wrap: anywhere;
}

.group-empty {
    padding: 30px 14px;
    border: 1px dashed var(--ta-line-strong);
    border-radius: 12px;
    color: var(--ta-text-secondary);
    text-align: center;
    font-size: 14px;
}

.replace-notice {
    padding: 12px;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: var(--ta-orange-soft);
}

@media (max-width: 560px) {
    .group-preview {
        grid-template-columns: 1fr;
    }

    .group-settings {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
