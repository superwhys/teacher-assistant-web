<template>
    <el-dialog
        v-model="visible"
        :width="width"
        :show-close="showClose"
        destroy-on-close
        align-center
        append-to-body
        class="app-dialog-shell"
        modal-class="app-dialog-shell__overlay"
    >
        <template #header>
            <div class="app-dialog-shell__header">
                <span v-if="eyebrow" class="app-dialog-shell__eyebrow">{{ eyebrow }}</span>
                <h3 class="app-dialog-shell__title">{{ title }}</h3>
                <p v-if="description" class="app-dialog-shell__description">{{ description }}</p>
            </div>
        </template>

        <div class="app-dialog-shell__body">
            <slot />
        </div>

        <template v-if="$slots.footer" #footer>
            <div class="app-dialog-shell__footer">
                <slot name="footer" />
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";

defineOptions({ name: "AppDialogShell" })

/** 定义通用弹窗壳组件的属性结构。 */
interface AppDialogShellProps {
    description?: string
    eyebrow?: string
    modelValue: boolean
    showClose?: boolean
    title: string
    width?: string
}

const props = withDefaults(defineProps<AppDialogShellProps>(), {
    description: "",
    eyebrow: "",
    showClose: true,
    width: "760px"
})

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})
</script>

<style scoped>
:global(.app-dialog-shell__overlay) {
    background: rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(12px) saturate(130%);
}

:global(.app-dialog-shell__overlay .el-overlay-dialog) {
    padding: 20px;
    align-items: center;
    justify-content: center;
}

:global(.el-dialog.app-dialog-shell) {
    margin: 0 auto;
    padding: 0 !important;
    align-self: center;
    max-width: calc(100vw - 24px);
    height: auto !important;
    min-height: 0;
    max-height: calc(100vh - 40px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.78);
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(24px) saturate(160%);
}

:global(.app-dialog-shell .el-dialog__header),
:global(.app-dialog-shell .el-dialog__body),
:global(.app-dialog-shell .el-dialog__footer) {
    margin: 0;
    padding: 0;
}

:global(.app-dialog-shell .el-dialog__headerbtn) {
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 9px;
    color: var(--ta-text-tertiary);
    background: var(--ta-surface-muted);
}

:global(.app-dialog-shell .el-dialog__headerbtn:hover) {
    color: var(--ta-text);
    background: #e9e9ed;
}

.app-dialog-shell__header {
    padding: 20px 52px 0 20px;
}

.app-dialog-shell__eyebrow {
    color: var(--ta-blue);
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.02em;
}

.app-dialog-shell__title,
.app-dialog-shell__description {
    margin: 0;
}

.app-dialog-shell__title {
    margin-top: 5px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.02em;
}

.app-dialog-shell__description {
    margin-top: 6px;
    color: var(--ta-text-tertiary);
    font-size: 12px;
    line-height: 1.55;
}

.app-dialog-shell__body {
    min-height: 0;
    max-height: calc(100vh - 180px);
    flex: 0 1 auto;
    overflow-y: auto;
    padding: 16px 20px 20px;
}

.app-dialog-shell__footer {
    padding: 14px 20px 20px;
    border-top: 1px solid var(--ta-line);
}

@media (max-width: 660px) {
    :global(.app-dialog-shell__overlay .el-overlay-dialog) {
        align-items: flex-end;
        padding: 8px;
    }

    :global(.el-dialog.app-dialog-shell) {
        width: 100% !important;
        max-width: none;
        max-height: calc(100vh - 16px);
        border-radius: 20px;
    }

    .app-dialog-shell__header {
        padding: 18px 48px 0 16px;
    }

    .app-dialog-shell__body {
        padding: 14px 16px 16px;
    }

    .app-dialog-shell__footer {
        padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
    }
}
</style>
