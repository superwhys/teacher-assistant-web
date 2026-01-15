<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import type { PointsItem, PointsSign } from '@/types/pointsItem'

type Props = {
    modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
}>()

const pointsItemStore = usePointsItemStore()

const innerVisible = computed({
    get: () => props.modelValue,
    set: (val: boolean) => emit('update:modelValue', val),
})

const itemGroups = computed(() => pointsItemStore.listGroups())

const manageSelectedGroupId = ref<string | ''>('')
const newGroupName = ref('')
const newGroupIcon = ref('')

const newItemName = ref('')
const newItemValue = ref<number>(1)
const newItemSign = ref<PointsSign>('plus')
const newItemValueError = ref('')

const itemEditVisible = ref(false)
const itemEditMode = ref<'create' | 'edit'>('create')
const editingItemId = ref<string>('')

watch(() => props.modelValue, (val) => {
    if (val) {
        manageSelectedGroupId.value = itemGroups.value[0]?.id ?? ''
    }
})

function onAddGroup() {
    const name = newGroupName.value.trim()
    if (!name) {
        ElMessage.error('请输入分组名称')
        return
    }
    const g = pointsItemStore.addGroup(name, newGroupIcon.value.trim() || undefined)
    newGroupName.value = ''
    newGroupIcon.value = ''
    manageSelectedGroupId.value = g.id
    ElMessage.success('已新增分组')
}

function openCreateItem() {
    itemEditMode.value = 'create'
    newItemName.value = ''
    newItemValue.value = 1
    newItemSign.value = 'plus'
    newItemValueError.value = ''
    itemEditVisible.value = true
}

function openEditItem(it: PointsItem) {
    itemEditMode.value = 'edit'
    editingItemId.value = it.id
    newItemName.value = it.name
    newItemValue.value = it.value
    newItemSign.value = it.sign
    newItemValueError.value = ''
    itemEditVisible.value = true
}

function validateNewItemValue(val: unknown): string {
    const n = Number(val)
    if (!Number.isFinite(n)) return '请输入正确的分值'
    if (!Number.isInteger(Math.abs(n))) return '分值必须为整数'
    if (Math.abs(n) <= 0) return '请输入大于 0 的分值'
    return ''
}

watch(newItemValue, (val) => {
    newItemValueError.value = validateNewItemValue(val)
})

async function onRemoveGroupManage(groupId: string) {
    const g = itemGroups.value.find(x => x.id === groupId)
    if (!g) return
    try {
        await ElMessageBox.confirm(`确定删除分组「${g.name}」及其下的所有分值项吗？`, '删除确认', { type: 'warning' })
        pointsItemStore.removeGroup(groupId)
        const next = itemGroups.value[0]?.id ?? ''
        manageSelectedGroupId.value = next
        ElMessage.success('已删除分组及其分值项')
    } catch { }
}

async function onRemoveItem(it: PointsItem) {
    try {
        await ElMessageBox.confirm(`确定删除分值项「${it.name}」吗？`, '删除确认', { type: 'warning' })
        pointsItemStore.removeItem(it.id)
        ElMessage.success('已删除')
    } catch { }
}

function onAddItem() {
    if (!manageSelectedGroupId.value) return
    const name = newItemName.value.trim()
    const rawValue = Number(newItemValue.value || 0)
    const value = Math.abs(rawValue)
    if (!name) {
        ElMessage.error('请输入积分项名称')
        return
    }
    const valueError = validateNewItemValue(rawValue)
    newItemValueError.value = valueError
    if (valueError) {
        return
    }
    if (itemEditMode.value === 'create') {
        pointsItemStore.addItem(manageSelectedGroupId.value, name, value, newItemSign.value)
        ElMessage.success('已新增积分项')
    } else {
        pointsItemStore.updateItem(editingItemId.value, { name, value, sign: newItemSign.value })
        ElMessage.success('已保存修改')
    }
    itemEditVisible.value = false
}
</script>

<template>
    <el-dialog v-model="innerVisible" title="分值项管理" width="1000px">
        <div class="manage-grid">
            <div class="manage-left">
                <div class="manage-block">
                    <div class="manage-toolbar">
                        <el-input v-model="newGroupName" placeholder="分组名称" class="group-name-input" />
                        <el-input v-model="newGroupIcon" placeholder="emoji" class="icon-input" />
                        <el-button type="primary" @click="onAddGroup"><i-ep-plus /> 新建分组</el-button>
                    </div>
                    <div class="group-list">
                        <div class="group-list-header">分组</div>
                        <div v-for="g in itemGroups" :key="g.id"
                            :class="['group-item', manageSelectedGroupId === g.id ? 'is-active' : '']"
                            @click="manageSelectedGroupId = g.id">
                            <div class="group-item-main">
                                <span class="group-icon">{{ g.icon || '📁' }}</span>
                                <span class="group-name">{{ g.name }}</span>
                            </div>
                            <div class="group-item-ops">
                                <el-button type="danger" link size="small"
                                    @click.stop="onRemoveGroupManage(g.id)">删除</el-button>
                            </div>
                        </div>
                        <div v-if="itemGroups.length === 0" class="item-empty">暂无分组，请先新增</div>
                    </div>
                </div>
            </div>
            <div class="manage-right">
                <div class="manage-block">
                    <div class="manage-title-row">
                        <div class="manage-title">
                            {{(itemGroups.find(g => g.id === manageSelectedGroupId) || { name: '未选择' }).name}}
                        </div>
                        <el-button type="primary" :disabled="!manageSelectedGroupId" @click="openCreateItem">
                            <i-ep-plus />
                            新增分值项
                        </el-button>
                    </div>
                    <el-table v-if="manageSelectedGroupId"
                        :data="pointsItemStore.listItemsByGroup(manageSelectedGroupId, 'all')" border
                        size="large" height="52vh">
                        <el-table-column type="index" label="#" width="60" />
                        <el-table-column label="名称" min-width="240">
                            <template #default="{ row }">
                                {{ row.name }}
                            </template>
                        </el-table-column>
                        <el-table-column label="分值" width="120" align="center">
                            <template #default="{ row }">
                                <span :class="['badge', row.sign === 'plus' ? 'plus' : 'minus']">
                                    {{ row.sign === 'plus' ? '+' : '-' }}{{ row.value }}
                                </span>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="160" align="center">
                            <template #default="{ row }">
                                <el-button type="primary" link @click="openEditItem(row)">编辑</el-button>
                                <el-button type="danger" link @click="onRemoveItem(row)">删除</el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                    <div v-else class="item-empty">请先从左侧选择一个分组</div>
                </div>
            </div>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="innerVisible = false">关闭</el-button>
            </span>
        </template>
    </el-dialog>

    <el-dialog v-model="itemEditVisible" :title="itemEditMode === 'create' ? '新增分值项' : '编辑分值项'" width="520px">
        <div class="row">
            <el-input v-model="newItemName" placeholder="积分项名称" />
        </div>
        <div class="row" style="margin-top:10px;">
            <div class="value-field">
                <el-input-number v-model="newItemValue" :min="1" :max="99" :step="1"
                    :class="['value-input', newItemValueError ? 'is-error' : '']" />
                <div class="field-error" :style="{ visibility: newItemValueError ? 'visible' : 'hidden' }">
                    {{ newItemValueError || '占位' }}
                </div>
            </div>
            <el-radio-group v-model="newItemSign">
                <el-radio-button label="plus">加分</el-radio-button>
                <el-radio-button label="minus">扣分</el-radio-button>
            </el-radio-group>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="itemEditVisible = false">取消</el-button>
                <el-button type="primary" :disabled="!!newItemValueError" @click="onAddItem">保存</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
.manage-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
}

.manage-left,
.manage-right {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.manage-block {
    border-radius: 12px;
    padding: 12px;
    background: #fff;
}

.manage-title {
    font-weight: 700;
    margin-bottom: 10px;
}

.manage-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.value-field {
    display: flex;
    flex-direction: column;
    width: 190px;
}

.field-error {
    font-size: 12px;
    line-height: 1.2;
    padding-top: 4px;
    color: var(--el-color-danger);
    max-width: 190px;
    white-space: normal;
    word-break: break-all;
    min-height: 15px;
}

.value-input.is-error :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.icon-input {
    width: 120px;
}

.group-name-input {
    flex: 1;
    flex-basis: 100%;
}
/* toolbar layout spacing */
.manage-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
}


.group-list {
    border: 1px solid #e6e8f0;
    border-radius: 12px;
    overflow: hidden;
    max-height: 52vh;
    overflow-y: auto;
}

.group-list-header {
    padding: 10px 14px;
    font-weight: 700;
    background: #fafbff;
    border-bottom: 1px solid #eef0f6;
}

.group-item {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
}

.group-item-main {
    display: flex;
    align-items: center;
    gap: 10px;
}

.group-item-ops {
    visibility: visible;
}

.group-item:hover {
    background: #fafafa;
}

.group-item.is-active {
    background: #edf5ff;
}

.group-item+.group-item {
    border-top: 1px solid #f2f2f2;
}

.group-name {
    font-size: 15px;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    background: #f5f7ff;
    color: #2d5cf6;
}

.badge.minus {
    background: #fff2f2;
    color: #ef4444;
}

.item-empty {
    color: #999;
    font-size: 13px;
    padding: 6px;
}

@media (max-width: 900px) {
    .manage-grid {
        grid-template-columns: 1fr;
    }
}
</style>


