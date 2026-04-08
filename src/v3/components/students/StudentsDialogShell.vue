<template>
    <el-dialog
        v-model="visible"
        :width="width"
        :show-close="showClose"
        destroy-on-close
        align-center
        append-to-body
        class="students-dialog-shell"
        modal-class="students-dialog-shell__overlay"
    >
        <template #header>
            <div class="students-dialog-shell__header">
                <span v-if="eyebrow" class="students-dialog-shell__eyebrow">{{ eyebrow }}</span>
                <h3 class="students-dialog-shell__title">{{ title }}</h3>
                <p v-if="description" class="students-dialog-shell__description">{{ description }}</p>
            </div>
        </template>

        <div class="students-dialog-shell__body">
            <slot />
        </div>

        <template v-if="$slots.footer" #footer>
            <div class="students-dialog-shell__footer">
                <slot name="footer" />
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";

/** 定义学生页统一弹窗壳组件的属性结构。 */
interface StudentsDialogShellProps {
    description?: string
    eyebrow?: string
    modelValue: boolean
    showClose?: boolean
    title: string
    width?: string
}

const props = withDefaults(defineProps<StudentsDialogShellProps>(), {
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
:global(.students-dialog-shell__overlay) {
    background: rgba(18, 27, 54, 0.46);
    backdrop-filter: blur(16px);
}

:global(.students-dialog-shell__overlay .el-overlay-dialog) {
    padding: 24px;
}

.students-dialog-shell :deep(.el-dialog) {
    margin: 0 auto;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 48px);
    overflow: hidden;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background:
        radial-gradient(circle at top right, rgba(142, 108, 255, 0.16), transparent 28%),
        radial-gradient(circle at bottom left, rgba(85, 104, 255, 0.1), transparent 24%),
        rgba(255, 255, 255, 0.94);
    box-shadow: 0 24px 60px rgba(40, 56, 105, 0.24);
    display: flex;
    flex-direction: column;
}

.students-dialog-shell :deep(.el-dialog__header) {
    margin: 0;
    padding: 0;
}

.students-dialog-shell :deep(.el-dialog__body),
.students-dialog-shell :deep(.el-dialog__footer) {
    padding: 0;
}

.students-dialog-shell :deep(.el-dialog__headerbtn) {
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    transition: transform 0.16s ease, background-color 0.16s ease;
}

.students-dialog-shell :deep(.el-dialog__headerbtn:hover) {
    transform: translateY(-2px);
    background: rgba(85, 104, 255, 0.16);
}

.students-dialog-shell__header {
    padding: 24px 24px 0;
}

.students-dialog-shell__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.students-dialog-shell__title,
.students-dialog-shell__description {
    margin: 0;
}

.students-dialog-shell__title {
    margin-top: 12px;
    color: #16213e;
    font-size: 28px;
    font-weight: 800;
    line-height: 1.2;
}

.students-dialog-shell__description {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.students-dialog-shell__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px 24px 24px;
}

.students-dialog-shell__footer {
    padding: 0 24px 24px;
}

@media (max-width: 768px) {
    :global(.students-dialog-shell__overlay .el-overlay-dialog) {
        padding: 10px;
    }

    .students-dialog-shell__header,
    .students-dialog-shell__body,
    .students-dialog-shell__footer {
        padding-left: 16px;
        padding-right: 16px;
    }

    .students-dialog-shell__header {
        padding-top: 16px;
    }

    .students-dialog-shell__body {
        padding-top: 16px;
        padding-bottom: 16px;
    }

    .students-dialog-shell__footer {
        padding-bottom: 16px;
    }

    .students-dialog-shell__title {
        font-size: 24px;
    }
}
</style>
