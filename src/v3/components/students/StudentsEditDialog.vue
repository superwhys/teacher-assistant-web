<template>
    <AppDialogShell
        v-model="visible"
        title="编辑学生"
        eyebrow="学生管理"
        description="修改当前学生的基础信息，样式与学生管理主页面保持一致。"
        width="520px"
    >
        <div class="students-edit-dialog">
            <section class="surface-card">
                <div class="form-grid">
                    <label class="field-block field-block--full">
                        <span class="field-block__label">姓名</span>
                        <el-input v-model="editName" size="large" placeholder="请输入学生姓名" />
                    </label>

                    <div class="field-block field-block--full">
                        <span class="field-block__label">性别</span>
                        <div class="gender-switch">
                            <button
                                type="button"
                                class="gender-switch__button"
                                :class="{ 'is-active': editGender === 1 }"
                                @click="editGender = 1"
                            >
                                男
                            </button>
                            <button
                                type="button"
                                class="gender-switch__button"
                                :class="{ 'is-active': editGender === 2 }"
                                @click="editGender = 2"
                            >
                                女
                            </button>
                            <button
                                type="button"
                                class="gender-switch__button"
                                :class="{ 'is-active': editGender === 0 }"
                                @click="editGender = 0"
                            >
                                未知
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">
                    取消
                </button>
                <button type="button" class="primary-button" @click="handleSave">
                    保存
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import type { ApiGender } from "@/types/student";
import type { UiStudent } from "@/components/class/ClassStudentList.vue";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

/** 定义学生编辑弹窗属性结构。 */
interface StudentsEditDialogProps {
    modelValue: boolean
    student: UiStudent | null
}

const props = defineProps<StudentsEditDialogProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "save", payload: { id: number, name: string, gender: ApiGender }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const editName = ref("")
const editGender = ref<ApiGender>(1)

/** 根据传入学生对象同步编辑表单内容。 */
watch(
    () => props.student,
    (student) => {
        if (!student) {
            editName.value = ""
            editGender.value = 1
            return
        }

        editName.value = student.name
        if (student.gender === "female") {
            editGender.value = 2
            return
        }

        if (student.gender === "male") {
            editGender.value = 1
            return
        }

        editGender.value = 0
    },
    { immediate: true }
)

/** 校验并提交学生编辑结果。 */
function handleSave(): void {
    if (!props.student) {
        return
    }

    const name = editName.value.trim()
    if (!name) {
        ElMessage.error("请输入学生姓名")
        return
    }

    emit("save", {
        id: props.student.id,
        name,
        gender: editGender.value
    })
}
</script>

<style scoped>
.students-edit-dialog {
    display: grid;
    gap: 18px;
}

.surface-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
}

.form-grid,
.gender-switch,
.dialog-actions {
    display: grid;
    gap: 16px;
}

.gender-switch,
.dialog-actions {
    display: flex;
    align-items: center;
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

.gender-switch {
    flex-wrap: wrap;
    gap: 10px;
}

.gender-switch__button,
.ghost-button,
.primary-button {
    min-height: 44px;
    padding: 0 16px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
}

.gender-switch__button,
.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.gender-switch__button.is-active {
    border-color: rgba(85, 104, 255, 0.24);
    background: rgba(85, 104, 255, 0.12);
    color: #5568ff;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.22);
}

.gender-switch__button:hover,
.ghost-button:hover,
.primary-button:hover {
    transform: translateY(-2px);
}

.dialog-actions {
    justify-content: space-between;
}

.students-edit-dialog :deep(.el-input__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.students-edit-dialog :deep(.el-input__wrapper.is-focus) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

@media (max-width: 768px) {
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
