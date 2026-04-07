<template>
    <button type="button" class="switch-trigger" @click="openDialog">
        切换班级
    </button>

    <el-dialog v-model="dialogVisible" title="切换班级" width="420px" @opened="onDialogOpened">
        <div class="switch-dialog__body">
            <p class="switch-dialog__hint">请选择要切换到的班级</p>
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
        </div>
        <template #footer>
            <span class="switch-dialog__footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="applyClassSwitch">应用切换</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { classManager } from "@/managers/class"
import type { ClassDTO } from "@/types/class"
import { ElMessage } from "element-plus"
import { computed, ref } from "vue"

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

/** 打开弹窗后同步当前选中班级。 */
async function onDialogOpened(): Promise<void> {
    selectedClassId.value = props.activeClassId
    await loadClasses()
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

.switch-dialog__body {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.switch-dialog__hint {
    margin: 0;
    color: #627099;
    font-size: 14px;
    line-height: 1.7;
}

.switch-dialog__select {
    width: 100%;
}

.switch-dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
</style>
