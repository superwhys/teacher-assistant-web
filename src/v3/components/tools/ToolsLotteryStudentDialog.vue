<template>
    <AppDialogShell
        v-model="visible"
        title="记录中奖学生"
        eyebrow="抽奖记录"
        :description="prizeName"
        :busy="saving"
        width="460px"
    >
        <div class="lottery-student-form">
            <p>所属班级：{{ className }}</p>
            <label class="field-block">
                <span>中奖学生（可选）</span>
                <el-select
                    :model-value="studentId"
                    :loading="loading"
                    :disabled="saving || loading"
                    filterable
                    clearable
                    placeholder="不绑定学生"
                    @update:model-value="emit('update:studentId', $event || null)"
                >
                    <el-option v-for="item in students" :key="item.id" :label="item.name" :value="item.id!" />
                </el-select>
            </label>
            <p>清空学生选择后保存，即可解除绑定。</p>
            <div v-if="loadError" class="load-error">
                <span>学生列表加载失败</span>
                <el-button link type="primary" :disabled="loading || saving" @click="emit('retry')">重试</el-button>
            </div>
        </div>
        <template #footer>
            <div class="dialog-actions">
                <el-button :disabled="saving" @click="visible = false">取消</el-button>
                <el-button type="primary" :loading="saving" :disabled="loading" @click="emit('save')">保存</el-button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StudentDTO } from "@/types/student";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

defineOptions({ name: "ToolsLotteryStudentDialog" })

const props = defineProps<{
    modelValue: boolean
    prizeName: string
    students: StudentDTO[]
    className: string
    studentId: number | null
    loading: boolean
    loadError: boolean
    saving: boolean
}>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "update:studentId", value: number | null): void
    (e: "retry"): void
    (e: "save"): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})
</script>

<style scoped>
.lottery-student-form,
.field-block {
    display: grid;
    gap: 10px;
}

.lottery-student-form {
    gap: 18px;
}

.field-block > span {
    color: var(--ta-text-secondary);
    font-size: 13px;
}

.lottery-student-form p {
    margin: 0;
    color: var(--ta-text-tertiary);
    font-size: 12px;
}

.load-error,
.dialog-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.load-error {
    color: var(--ta-red);
    font-size: 13px;
}
</style>
