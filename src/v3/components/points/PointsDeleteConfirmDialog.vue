<template>
    <StudentsConfirmDialog
        v-model="visible"
        :title="title"
        eyebrow="风险操作"
        :description="description"
        :message="message"
        confirm-text="确认删除"
        @confirm="handleConfirm"
    />
</template>

<script setup lang="ts">
import StudentsConfirmDialog from "@/v3/components/students/StudentsConfirmDialog.vue";
import { computed } from "vue";

defineOptions({ name: "PointsDeleteConfirmDialog" })

/** 定义积分删除确认弹窗属性。 */
interface PointsDeleteConfirmDialogProps {
    modelValue: boolean
    targetName: string
    targetType: "group" | "rule"
}

const props = defineProps<PointsDeleteConfirmDialogProps>()

const emit = defineEmits<{
    (e: "confirm"): void
    (e: "update:modelValue", value: boolean): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const title = computed<string>(() => {
    return props.targetType === "group" ? "删除规则组" : "删除积分项"
})

const description = computed<string>(() => {
    return props.targetType === "group"
        ? "删除规则组后，其下所有积分项将一并移除。"
        : "删除积分项后，该规则将不能继续被用于后续积分操作。"
})

const message = computed<string>(() => {
    return props.targetType === "group"
        ? `确定删除规则组「${props.targetName}」吗？`
        : `确定删除积分项「${props.targetName}」吗？`
})

/** 确认当前删除操作。 */
function handleConfirm(): void {
    emit("confirm")
}
</script>
