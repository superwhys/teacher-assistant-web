<template>
    <StudentsDialogShell
        v-model="visible"
        :title="title"
        :eyebrow="eyebrow"
        :description="description"
        width="460px"
    >
        <div class="confirm-card">
            <strong>{{ message }}</strong>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">
                    {{ cancelText }}
                </button>
                <button type="button" class="danger-button" @click="handleConfirm">
                    {{ confirmText }}
                </button>
            </div>
        </template>
    </StudentsDialogShell>
</template>

<script setup lang="ts">
import { computed } from "vue";
import StudentsDialogShell from "@/v3/components/students/StudentsDialogShell.vue";

/** 定义确认弹窗属性结构。 */
interface StudentsConfirmDialogProps {
    cancelText?: string
    confirmText?: string
    description?: string
    eyebrow?: string
    message: string
    modelValue: boolean
    title: string
}

const props = withDefaults(defineProps<StudentsConfirmDialogProps>(), {
    cancelText: "取消",
    confirmText: "确认",
    description: "",
    eyebrow: "风险操作"
})

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "confirm"): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

/** 确认当前风险操作。 */
function handleConfirm(): void {
    emit("confirm")
}
</script>

<style scoped>
.confirm-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
}

.confirm-card strong {
    display: block;
    margin: 0;
    color: #16213e;
    font-size: 18px;
    line-height: 1.7;
}

.dialog-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.ghost-button,
.danger-button {
    min-height: 44px;
    padding: 0 16px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.danger-button {
    background: rgba(239, 68, 68, 0.14);
    color: #d92d20;
}

.ghost-button:hover,
.danger-button:hover {
    transform: translateY(-2px);
}

@media (max-width: 768px) {
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
