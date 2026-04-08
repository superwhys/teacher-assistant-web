<template>
    <button type="button" class="switch-trigger" @click="openDialog">
        切换班级
    </button>

    <AppDialogShell
        v-model="dialogVisible"
        title="切换班级"
        eyebrow="主导航"
        description="选择当前要进入的班级，切换后页面会同步更新对应班级和学期数据。"
        width="520px"
    >
        <div class="switch-dialog">
            <section class="surface-card">
                <label class="field-block">
                    <span class="field-block__label">当前班级</span>
                    <el-select
                        v-model="selectedClassId"
                        class="switch-dialog__select"
                        size="large"
                        :loading="classesLoading"
                        :disabled="classesLoading || classOptions.length === 0"
                        :placeholder="classesLoading ? '加载班级中…' : '请选择班级'"
                    >
                        <el-option
                            v-for="item in classOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </label>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="dialogVisible = false">取消</button>
                <button type="button" class="primary-button" @click="applyClassSwitch">应用切换</button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { classManager } from "@/managers/class"
import type { ClassDTO } from "@/types/class"
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { ElMessage } from "element-plus"
import { computed, ref, watch } from "vue"

/** 定义班级切换选项结构。 */
interface ClassOption {
    id: number
    name: string
}

const props = defineProps<{
    activeClassId: number | null
}>()

const emit = defineEmits<{
    switched: [classId: number]
}>()

const dialogVisible = ref(false)
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const selectedClassId = ref<number | null>(null)

/** 返回可用于切换的班级列表。 */
const classOptions = computed<ClassOption[]>(() => {
    return classes.value.filter((item): item is ClassOption => {
        return typeof item.id === "number" && typeof item.name === "string" && item.name.trim().length > 0
    })
})

/** 打开班级切换弹窗。 */
function openDialog(): void {
    dialogVisible.value = true
}

/** 加载班级切换列表。 */
async function loadClasses(): Promise<void> {
    if (classesLoading.value) {
        return
    }

    classesLoading.value = true
    try {
        classes.value = await classManager.list()
    } finally {
        classesLoading.value = false
    }
}

/** 应用当前选中的班级。 */
function applyClassSwitch(): void {
    if (!selectedClassId.value) {
        ElMessage.warning("请选择班级")
        return
    }

    if (selectedClassId.value === props.activeClassId) {
        dialogVisible.value = false
        return
    }

    emit("switched", selectedClassId.value)
    dialogVisible.value = false
}

/** 在弹窗打开时同步班级列表和当前选中值。 */
watch(dialogVisible, async (visible) => {
    if (!visible) {
        return
    }

    selectedClassId.value = props.activeClassId
    await loadClasses()
})
</script>

<style scoped>
.switch-trigger {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
    text-decoration: none;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
    cursor: pointer;
}

.switch-trigger:hover {
    transform: translateY(-2px);
}

.switch-dialog {
    display: grid;
    gap: 16px;
}

.surface-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    display: block;
    color: #627099;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.switch-dialog__select {
    width: 100%;
}

.dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.ghost-button,
.primary-button {
    min-height: 46px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    border: none;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.24);
    background: rgba(255, 255, 255, 0.82);
    color: #16213e;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.26);
}

.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.switch-dialog :deep(.el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.switch-dialog :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}
</style>
