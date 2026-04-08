<template>
    <button type="button" class="switch-trigger" @click="openDialog">
        切换学期
    </button>

    <AppDialogShell
        v-model="dialogVisible"
        title="切换学期"
        eyebrow="主导航"
        description="选择当前班级下要查看和操作的学期，切换后页面状态会同步刷新。"
        width="520px"
    >
        <div class="switch-dialog">
            <section class="surface-card">
                <label class="field-block">
                    <span class="field-block__label">当前学期</span>
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
                </label>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="dialogVisible = false">取消</button>
                <button type="button" class="primary-button" :disabled="semesterSwitching" @click="applySemesterSwitch">
                    {{ semesterSwitching ? "切换中..." : "应用切换" }}
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { classManager } from "@/managers/class"
import type { SemesterDTO } from "@/types/class"
import AppDialogShell from "@/v3/components/AppDialogShell.vue";
import { ElMessage } from "element-plus"
import { computed, ref, watch } from "vue"

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

/** 在弹窗打开时同步学期列表和当前选中值。 */
watch(dialogVisible, async (visible) => {
    if (!visible) {
        return
    }

    selectedSemesterId.value = props.currentSemesterId
    await loadSemesters()
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

.ghost-button:disabled,
.primary-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
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
