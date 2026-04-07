<template>
    <button type="button" class="switch-trigger" @click="openDialog">
        切换学期
    </button>

    <el-dialog v-model="dialogVisible" title="切换学期" width="420px" @opened="onDialogOpened">
        <div class="switch-dialog__body">
            <p class="switch-dialog__hint">请选择要切换到的学期</p>
            <el-select
                v-model="selectedSemesterId"
                class="switch-dialog__select"
                size="large"
                :loading="semestersLoading"
                :disabled="semestersLoading || semesterOptions.length === 0"
                :placeholder="semestersLoading ? '加载学期中…' : '请选择学期'"
            >
                <el-option
                    v-for="item in semesterOptions"
                    :key="item.id"
                    :label="item.name"
                    :value="item.id"
                >
                    <div class="semester-option">
                        <span class="semester-option__name">{{ item.name }}</span>
                        <el-tag
                            class="semester-option__status"
                            size="small"
                            :type="item.status === 2 ? 'info' : 'success'"
                            effect="light"
                            round
                        >
                            {{ getSemesterStatusLabel(item.status) }}
                        </el-tag>
                    </div>
                </el-option>
            </el-select>
        </div>
        <template #footer>
            <span class="switch-dialog__footer">
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="semesterSwitching" @click="applySemesterSwitch">
                    应用切换
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { classManager } from "@/managers/class"
import type { SemesterDTO } from "@/types/class"
import { ElMessage } from "element-plus"
import { computed, ref } from "vue"

/** 定义可切换的学期选项结构。 */
interface SemesterOption {
    id: number
    name: string
    status?: number
}

const props = defineProps<{
    activeClassId: number | null
    currentSemesterId: number | null
}>()

const emit = defineEmits<{
    switched: [semester: SemesterDTO]
}>()

const dialogVisible = ref(false)
const semesters = ref<SemesterDTO[]>([])
const semestersLoading = ref(false)
const semesterSwitching = ref(false)
const selectedSemesterId = ref<number | null>(null)

/** 返回可用于切换的学期列表。 */
const semesterOptions = computed<SemesterOption[]>(() => {
    return semesters.value.filter((item): item is SemesterOption => {
        return typeof item.id === "number" && typeof item.name === "string" && item.name.trim().length > 0
    })
})

/** 返回学期状态文案。 */
function getSemesterStatusLabel(status?: number): string {
    return status === 2 ? "已归档" : "正常"
}

/** 打开学期切换弹窗。 */
function openDialog(): void {
    if (!props.activeClassId) {
        ElMessage.warning("当前没有可切换的班级")
        return
    }

    dialogVisible.value = true
}

/** 加载当前班级的学期列表。 */
async function loadSemesters(): Promise<void> {
    if (!props.activeClassId || semestersLoading.value) {
        return
    }

    semestersLoading.value = true
    try {
        semesters.value = await classManager.listSemesters(props.activeClassId)
    } finally {
        semestersLoading.value = false
    }
}

/** 打开弹窗后同步当前选中学期。 */
async function onDialogOpened(): Promise<void> {
    selectedSemesterId.value = props.currentSemesterId
    await loadSemesters()
}

/** 应用当前选中的学期。 */
async function applySemesterSwitch(): Promise<void> {
    const classId = props.activeClassId

    if (!classId) {
        ElMessage.warning("当前没有可切换的班级")
        return
    }

    if (!selectedSemesterId.value) {
        ElMessage.warning("请选择学期")
        return
    }

    if (selectedSemesterId.value === props.currentSemesterId) {
        dialogVisible.value = false
        return
    }

    const selectedSemester = semesters.value.find((item) => item.id === selectedSemesterId.value)
    if (!selectedSemester) {
        ElMessage.error("当前学期不存在")
        return
    }

    semesterSwitching.value = true
    try {
        await classManager.updateSemester(classId, {
            classID: classId,
            semester_id: selectedSemesterId.value,
        })
        emit("switched", selectedSemester)
        dialogVisible.value = false
    } catch (error) {
        console.error("切换学期失败", error)
        ElMessage.error("切换学期失败")
    } finally {
        semesterSwitching.value = false
    }
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

.semester-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
}

.semester-option__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.semester-option__status {
    flex-shrink: 0;
}

.switch-dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
</style>
