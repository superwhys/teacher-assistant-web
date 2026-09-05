<template>
    <button type="button" class="switch-trigger" @click="openDialog">
        <i-ep-user-filled aria-hidden="true" />
        <span>{{ triggerLabel || "切换班级" }}</span>
        <i-ep-arrow-down aria-hidden="true" />
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
                <div class="tab-row">
                    <button type="button" class="tab-button" :class="{ 'is-active': activeTab === 'switch' }" @click="activeTab = 'switch'">
                        切换班级
                    </button>
                    <button type="button" class="tab-button" :class="{ 'is-active': activeTab === 'create' }" @click="activeTab = 'create'">
                        创建班级
                    </button>
                </div>

                <div v-if="activeTab === 'switch'" class="tab-panel">
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
                </div>

                <div v-else class="tab-panel">
                    <div class="section-head">
                        <div>
                            <span class="field-block__label">快速新建班级</span>
                            <p class="section-head__desc">创建完成后会自动切换到新班级，并同步进入你填写的学期。</p>
                        </div>
                    </div>

                    <div class="create-form">
                        <label class="field-block">
                            <span class="field-block__label">班级名称</span>
                            <el-input v-model="createClassName" placeholder="例如：一年级三班" />
                        </label>

                        <label class="field-block">
                            <span class="field-block__label">学期名称</span>
                            <el-input v-model="createSemesterName" placeholder="例如：2025-2026学年上学期" />
                        </label>
                    </div>

                    <div class="create-actions">
                        <button type="button" class="primary-button" :disabled="createClassLoading" @click="handleCreateClass">
                            {{ createClassLoading ? "创建中..." : "创建" }}
                        </button>
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="dialogVisible = false">取消</button>
                <button v-if="activeTab === 'switch'" type="button" class="primary-button" @click="applyClassSwitch">应用切换</button>
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

type ClassDialogTab = "switch" | "create"

const props = defineProps<{
    activeClassId: number | null
    triggerLabel?: string
}>()

const emit = defineEmits<{
    switched: [classId: number]
}>()

const dialogVisible = ref(false)
const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const selectedClassId = ref<number | null>(null)
const activeTab = ref<ClassDialogTab>("switch")
const createClassName = ref("")
const createSemesterName = ref("")
const createClassLoading = ref(false)

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

/** 重置新建班级表单。 */
function resetCreateClassForm(): void {
    createClassName.value = ""
    createSemesterName.value = ""
    createClassLoading.value = false
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

/** 创建班级并自动切换到新班级。 */
async function handleCreateClass(): Promise<void> {
    if (createClassLoading.value) {
        return
    }

    const className = createClassName.value.trim()
    if (!className) {
        ElMessage.warning("请输入班级名称")
        return
    }

    const semesterName = createSemesterName.value.trim()
    if (!semesterName) {
        ElMessage.warning("请输入学期名称")
        return
    }

    if (classes.value.some((item) => item.name?.trim() === className)) {
        ElMessage.warning("班级名称已存在")
        return
    }

    createClassLoading.value = true
    try {
        const created = await classManager.create(className, semesterName)
        await loadClasses()
        resetCreateClassForm()
        ElMessage.success("已创建班级")

        if (typeof created?.id === "number") {
            selectedClassId.value = created.id
        }

        activeTab.value = "switch"
        await loadClasses()
    } finally {
        createClassLoading.value = false
    }
}

/** 在弹窗打开时同步班级列表和当前选中值。 */
watch(dialogVisible, async (visible) => {
    if (!visible) {
        activeTab.value = "switch"
        resetCreateClassForm()
        return
    }

    activeTab.value = "switch"
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
    font-size: 15px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
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

.tab-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 8px;
    border-radius: 20px;
    background: rgba(85, 104, 255, 0.06);
}

.tab-button {
    min-height: 44px;
    border: none;
    border-radius: 16px;
    background: transparent;
    color: #627099;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.tab-button.is-active {
    background: linear-gradient(135deg, rgba(85, 104, 255, 0.16), rgba(142, 108, 255, 0.18));
    color: #16213e;
    box-shadow: 0 10px 22px rgba(85, 104, 255, 0.12);
}

.tab-button:hover {
    transform: translateY(-1px);
}

.tab-panel {
    margin-top: 18px;
}

.section-head__desc {
    margin: 8px 0 0;
    color: #627099;
    line-height: 1.7;
}

.field-block {
    display: grid;
    gap: 10px;
}

.field-block__label {
    display: block;
    color: #627099;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.switch-dialog__select {
    width: 100%;
}

.create-form {
    display: grid;
    gap: 14px;
    margin-top: 16px;
}

.create-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
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
