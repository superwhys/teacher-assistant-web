<script setup lang="ts">
defineOptions({ name: 'ShopExchangeDialog' })

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const props = defineProps<{
    modelValue: boolean
    form: {
        prizeId: number
        studentId: number | null
        count: number
    }
    students: Array<{ id: number; name: string; availablePoints: number }>
    requiredPoints: number
    availablePointsByStudentId: Record<number, number>
    maxCount: number
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'confirm'): void
}>()

function getStudentOptionClass(studentId: number): string {
    const availablePoints = props.availablePointsByStudentId[studentId] ?? 0
    if (availablePoints >= props.requiredPoints) {
        return 'student-option-enough'
    } else {
        return 'student-option-insufficient'
    }
}

function getSelectedStudentClass(): string {
    if (!props.form.studentId) return ''
    const studentClass = getStudentOptionClass(props.form.studentId)
    if (studentClass === 'student-option-insufficient') {
        return 'select-insufficient'
    } else if (studentClass === 'student-option-enough') {
        return 'select-enough'
    }
    return ''
}
</script>

<template>
    <el-dialog
        :model-value="props.modelValue"
        title="兑换商品"
        width="500px"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <el-form :model="props.form" label-position="top" class="exchange-form">
            <el-form-item label="选择学生" required>
                <el-select
                    v-model="props.form.studentId"
                    placeholder="请选择学生"
                    size="large"
                    filterable
                    clearable
                    style="width: 100%;"
                    :class="getSelectedStudentClass()"
                >
                    <el-option
                        v-for="s in props.students"
                        :key="s.id"
                        :label="`${s.name}（可用积分：${toNumber(s.availablePoints, 0)}）`"
                        :value="s.id"
                        :class="getStudentOptionClass(s.id)"
                    >
                        <div :class="getStudentOptionClass(s.id)">
                            {{ s.name }}（可用积分：{{ toNumber(s.availablePoints, 0) }}）
                        </div>
                    </el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="兑换数量" required>
                <el-input-number
                    v-model="props.form.count"
                    :min="1"
                    :max="props.maxCount || 1"
                    style="width: 100%;"
                />
            </el-form-item>
            <el-alert
                v-if="props.form.studentId && props.form.prizeId"
                :title="`需要消耗：${props.requiredPoints} 积分`"
                type="info"
                :closable="false"
                style="margin-top: 12px;"
            />
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="emit('update:modelValue', false)">取消</el-button>
                <el-button type="primary" @click="emit('confirm')">确认兑换</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.exchange-form {
    padding-top: 10px;
}

.student-option-enough {
    color: #10b981;
    font-weight: 500;
}

.student-option-insufficient {
    color: #ef4444;
    font-weight: 500;
}

.select-insufficient :deep(.el-input__wrapper) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient :deep(.el-input__wrapper:hover) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient :deep(.el-input__wrapper.is-focus) {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 1px #ef4444 inset !important;
}

.select-insufficient :deep(.el-input__inner) {
    color: #ef4444 !important;
    font-weight: 500 !important;
}

.select-insufficient :deep(.el-select__placeholder) {
    color: #ef4444 !important;
}

.select-insufficient :deep(.el-select__selected-item) {
    color: #ef4444 !important;
}

.select-insufficient :deep(input) {
    color: #ef4444 !important;
}

.select-enough :deep(.el-input__wrapper) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough :deep(.el-input__wrapper:hover) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough :deep(.el-input__wrapper.is-focus) {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 1px #10b981 inset !important;
}

.select-enough :deep(.el-input__inner) {
    color: #10b981 !important;
    font-weight: 500 !important;
}

.select-enough :deep(.el-select__placeholder) {
    color: #10b981 !important;
}

.select-enough :deep(.el-select__selected-item) {
    color: #10b981 !important;
}

.select-enough :deep(input) {
    color: #10b981 !important;
}
</style>

