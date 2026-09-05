<template>
    <AppDialogShell v-model="visible" title="分组管理" eyebrow="学生分组" width="980px">
        <div class="group-manage-dialog">
            <section class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>创建新分组</h4>
                        <p>支持先建组再分配成员，也可以稍后通过导入批量整理。</p>
                    </div>
                    <button type="button" class="ghost-button" :disabled="!active" @click="emit('open-import')">
                        Excel 导入分组
                    </button>
                </div>

                <div class="action-row">
                    <el-input v-model="newGroupName" size="large" placeholder="请输入新分组名称" :disabled="!active" />
                    <button type="button" class="primary-button" :disabled="!active" @click="handleAddGroup">
                        新建分组
                    </button>
                </div>
            </section>

            <section class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>选择分组</h4>
                        <p>切换后可调整该组成员，也可以删除当前分组。</p>
                    </div>
                    <div class="meta-tags">
                        <span class="meta-tag">{{ props.groups.length }} 个分组</span>
                        <span class="meta-tag">未分组 {{ ungroupedStudents.length }} 人</span>
                    </div>
                </div>

                <div class="action-row">
                    <el-select v-model="selectedGroupId" size="large" placeholder="请选择要编辑的分组" :disabled="!active"
                        class="group-select">
                        <el-option v-for="group in groupOptions" :key="group.id" :label="group.label"
                            :value="group.id" />
                    </el-select>

                    <button type="button" class="danger-button" :disabled="!active || !selectedGroupId"
                        @click="openDeleteConfirm">
                        删除该组
                    </button>
                </div>
            </section>

            <section v-if="selectedGroupId" class="surface-card">
                <div class="section-head">
                    <div>
                        <h4>分组成员调整</h4>
                        <p>左侧显示未分组学生，右侧显示当前分组成员，拖动或筛选后统一保存。</p>
                    </div>
                    <div class="meta-tags">
                        <span class="meta-tag">本组 {{ groupStudents.length }} 人</span>
                    </div>
                </div>

                <el-transfer v-model="targetKeys" filterable class="v3-transfer" :data="transferData"
                    :titles="['未分组', '本组成员']" v-loading="loading" />
            </section>

            <section v-else class="empty-card">
                <strong>请选择或新建一个分组后再编辑成员</strong>
                <p>当前还没有可编辑的分组时，可以先在上方创建一个新分组。</p>
            </section>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="visible = false">
                    关闭
                </button>
                <button type="button" class="primary-button" :disabled="!active || !selectedGroupId"
                    @click="handleSaveMembers">
                    保存成员
                </button>
            </div>
        </template>
    </AppDialogShell>

    <AppDialogShell v-model="deleteConfirmVisible" title="删除分组" eyebrow="风险操作"
        description="删除分组不会删除学生本身，只会移除该组关系。确认后将立即生效。" width="460px">
        <div class="confirm-card">
            <strong>确定删除分组「{{ selectedGroupName }}」吗？</strong>
            <p>删除后，本组学生会回到未分组状态。</p>
        </div>

        <template #footer>
            <div class="dialog-actions">
                <button type="button" class="ghost-button" @click="deleteConfirmVisible = false">
                    取消
                </button>
                <button type="button" class="danger-button" @click="handleDeleteGroup">
                    确认删除
                </button>
            </div>
        </template>
    </AppDialogShell>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, ref, watch } from "vue";
import { studentManager } from "@/managers/student";
import type { StudentDTO } from "@/types/student";
import AppDialogShell from "@/v3/components/AppDialogShell.vue";

/** 定义分组管理弹窗使用的分组结构。 */
export interface UiGroup {
    id: number
    memberIds: number[]
    name: string
}

/** 定义分组管理弹窗属性结构。 */
interface StudentsGroupManageDialogProps {
    active: boolean
    classId: number | null
    groups: UiGroup[]
    modelValue: boolean
}

/** 定义穿梭框学生项结构。 */
interface TransferStudentItem {
    id: number
    name: string
}

const props = defineProps<StudentsGroupManageDialogProps>()

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void
    (e: "create-group", payload: { name: string }): void
    (e: "delete-group", payload: { groupId: number }): void
    (e: "save-members", payload: { groupId: number, memberIds: number[] }): void
    (e: "open-import"): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit("update:modelValue", value)
})

const newGroupName = ref("")
const selectedGroupId = ref<number | null>(null)
const targetKeys = ref<number[]>([])
const loading = ref(false)
const deleteConfirmVisible = ref(false)
const groupStudents = ref<TransferStudentItem[]>([])
const ungroupedStudents = ref<TransferStudentItem[]>([])
let lastLoadRequestId = 0

/** 返回分组下拉选项。 */
const groupOptions = computed(() => {
    return props.groups.map((group) => ({
        id: group.id,
        label: group.name
    }))
})

/** 返回当前选中的分组名称。 */
const selectedGroupName = computed<string>(() => {
    return props.groups.find((group) => group.id === selectedGroupId.value)?.name ?? "当前分组"
})

/** 返回穿梭框使用的数据结构。 */
const transferData = computed(() => {
    const nameMap = new Map<number, string>()
    ungroupedStudents.value.forEach((student) => nameMap.set(student.id, student.name))
    groupStudents.value.forEach((student) => nameMap.set(student.id, student.name))

    return Array.from(nameMap.entries()).map(([id, name]) => ({
        key: id,
        label: name
    }))
})

/** 将学生接口数据转换为穿梭框展示结构。 */
function toTransferStudents(list: StudentDTO[]): TransferStudentItem[] {
    return (list ?? [])
        .map((student) => ({
            id: typeof student.id === "number" ? student.id : 0,
            name: student.name?.trim() || ""
        }))
        .filter((student) => student.id > 0 && student.name.length > 0)
}

/** 根据当前分组加载成员与未分组学生。 */
async function loadStudentsForGroup(): Promise<void> {
    if (!props.active || !props.classId || !selectedGroupId.value) {
        groupStudents.value = []
        ungroupedStudents.value = []
        targetKeys.value = []
        return
    }

    const requestId = ++lastLoadRequestId
    loading.value = true
    try {
        const [groupInfo, ungrouped] = await Promise.all([
            studentManager.list(props.classId, selectedGroupId.value),
            studentManager.listUngrouped(props.classId)
        ])

        if (requestId !== lastLoadRequestId) {
            return
        }

        groupStudents.value = toTransferStudents(groupInfo)
        ungroupedStudents.value = toTransferStudents(ungrouped)
        targetKeys.value = groupStudents.value.map((student) => student.id)
    } catch (error) {
        console.error("加载分组成员失败", error)
        if (requestId !== lastLoadRequestId) {
            return
        }

        groupStudents.value = []
        ungroupedStudents.value = []
        targetKeys.value = []
    } finally {
        if (requestId === lastLoadRequestId) {
            loading.value = false
        }
    }
}

/** 打开弹窗时同步默认选中的分组。 */
watch(visible, (isVisible) => {
    if (!isVisible) {
        return
    }

    const currentGroupId = selectedGroupId.value
    const stillExists = currentGroupId ? props.groups.some((group) => group.id === currentGroupId) : false
    selectedGroupId.value = stillExists ? currentGroupId : (props.groups[0]?.id ?? null)
})

/** 在分组列表更新时校正当前选中项。 */
watch(() => props.groups, (groups) => {
    if (!visible.value) {
        return
    }

    if (groups.length === 0) {
        selectedGroupId.value = null
        return
    }

    const currentGroupId = selectedGroupId.value
    if (!currentGroupId || !groups.some((group) => group.id === currentGroupId)) {
        selectedGroupId.value = groups[0]!.id
    }
})

/** 在分组或班级变化时重新加载成员数据。 */
watch([selectedGroupId, () => props.classId], async () => {
    await loadStudentsForGroup()
})

/** 校验并创建新分组。 */
function handleAddGroup(): void {
    if (!props.active) {
        return
    }

    const name = newGroupName.value.trim()
    if (!name) {
        ElMessage.error("请输入分组名称")
        return
    }

    emit("create-group", { name })
    newGroupName.value = ""
}

/** 打开删除分组确认弹窗。 */
function openDeleteConfirm(): void {
    if (!props.active || !selectedGroupId.value) {
        return
    }

    deleteConfirmVisible.value = true
}

/** 确认删除当前选中的分组。 */
function handleDeleteGroup(): void {
    if (!selectedGroupId.value) {
        return
    }

    emit("delete-group", { groupId: selectedGroupId.value })
    deleteConfirmVisible.value = false
}

/** 保存当前分组的成员调整结果。 */
function handleSaveMembers(): void {
    if (!props.active || !selectedGroupId.value) {
        return
    }

    emit("save-members", {
        groupId: selectedGroupId.value,
        memberIds: targetKeys.value
    })
}
</script>

<style scoped>
.group-manage-dialog {
    display: grid;
    gap: 18px;
}

.surface-card,
.empty-card,
.confirm-card {
    padding: 20px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.78);
}

.empty-card {
    background: rgba(85, 104, 255, 0.06);
}

.empty-card strong,
.confirm-card strong {
    display: block;
    margin: 0;
    color: #16213e;
    font-size: 19px;
}

.empty-card p,
.confirm-card p {
    margin: 10px 0 0;
    color: #627099;
    line-height: 1.7;
}

.section-head,
.dialog-actions,
.action-row,
.dialog-actions__group,
.meta-tags {
    display: flex;
    align-items: center;
}

.section-head,
.dialog-actions {
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
}

.action-row,
.dialog-actions__group,
.meta-tags {
    gap: 10px;
}

.section-head h4,
.section-head p {
    margin: 0;
}

.section-head h4 {
    color: #16213e;
    font-size: 19px;
}

.section-head p {
    margin-top: 6px;
    color: #627099;
    line-height: 1.7;
}

.meta-tags {
    flex-wrap: wrap;
    justify-content: flex-end;
}

.meta-tag {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 13px;
    font-weight: 700;
}

.group-select {
    flex: 1;
}

.ghost-button,
.primary-button,
.danger-button {
    min-height: 44px;
    padding: 0 16px;
    border: none;
    border-radius: 16px;
    font: inherit;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
    white-space: nowrap;
}

.ghost-button {
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
    color: #16213e;
}

.primary-button {
    background: linear-gradient(135deg, #5568ff, #8e6cff);
    color: #ffffff;
    box-shadow: 0 12px 24px rgba(85, 104, 255, 0.22);
}

.danger-button {
    background: rgba(239, 68, 68, 0.14);
    color: #d92d20;
}

.ghost-button:hover,
.primary-button:hover,
.danger-button:hover {
    transform: translateY(-2px);
}

.ghost-button:disabled,
.primary-button:disabled,
.danger-button:disabled {
    opacity: 0.56;
    cursor: not-allowed;
    transform: none;
}

.group-manage-dialog :deep(.el-input__wrapper),
.group-manage-dialog :deep(.el-select__wrapper) {
    border-radius: 16px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.22);
    background: rgba(255, 255, 255, 0.88);
}

.group-manage-dialog :deep(.el-input__wrapper.is-focus),
.group-manage-dialog :deep(.el-select__wrapper.is-focused) {
    border-color: rgba(85, 104, 255, 0.36);
    box-shadow: 0 0 0 4px rgba(85, 104, 255, 0.08);
}

.action-row>.ghost-button,
.action-row>.primary-button,
.action-row>.danger-button {
    flex-shrink: 0;
}

.v3-transfer :deep(.el-transfer-panel) {
    width: min(100%, 360px);
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.92);
}

.v3-transfer :deep(.el-transfer-panel__header) {
    background: rgba(85, 104, 255, 0.08);
    color: #16213e;
}

.v3-transfer :deep(.el-transfer-panel__body) {
    height: 320px;
}

.v3-transfer :deep(.el-transfer-panel__filter .el-input__wrapper) {
    margin: 10px;
    border-radius: 14px;
    box-shadow: none;
    border: 1px solid rgba(122, 141, 198, 0.2);
}

.v3-transfer :deep(.el-transfer__buttons) {
    padding: 0 18px;
}

.v3-transfer :deep(.el-button) {
    border-radius: 14px;
}

@media (max-width: 900px) {
    .action-row {
        flex-direction: column;
        align-items: stretch;
    }

    .section-head,
    .dialog-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .meta-tags,
    .dialog-actions__group {
        justify-content: flex-start;
    }

    .v3-transfer :deep(.el-transfer) {
        display: grid;
        gap: 14px;
    }

    .v3-transfer :deep(.el-transfer-panel) {
        width: 100%;
    }

    .v3-transfer :deep(.el-transfer__buttons) {
        display: flex;
        justify-content: center;
        padding: 0;
    }
}
</style>
