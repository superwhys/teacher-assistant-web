<template>
    <AppDialogShell
        v-model="visible"
        :title="title"
        :eyebrow="eyebrow"
        :description="description"
        width="460px"
        height="auto"
    >
        <div class="confirm-card">
            <strong>{{ message }}</strong>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">
                    {{ cancelText }}
                </button>
                <button type="button" class="danger-button" @click="handleConfirm" :disabled="!canWrite">
                    {{ confirmText }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { useBusinessAccess } from "@/composables/useBusinessAccess";
import { computed } from "vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

const { canWrite, allowWrite } = useBusinessAccess()

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
    allowWrite() && emit("confirm")
}
</script>

<style scoped>
.confirm-card {
    padding: 20px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface-solid);
}

.confirm-card strong {
    display: block;
    margin: 0;
    color: var(--ta-text);
    font-size: 19px;
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
    border-radius: var(--ta-radius-small);
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid var(--ta-line);
    background: var(--ta-surface-solid);
    color: var(--ta-text);
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
