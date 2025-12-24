<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pointsManager } from '@/managers/points'
import type { Rule, RuleGroup } from '@/types/points'

defineOptions({ name: 'PointsRuleManageDialog' })

type Props = {
    modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'changed'): void
}>()

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

function inferRuleSign(rule: Rule): 'plus' | 'minus' {
    const t = toNumber((rule as any)?.points_type, 0)
    if (t === 2) return 'minus'
    if (t === 1) return 'plus'
    const p = toNumber(rule.points, 0)
    return p < 0 ? 'minus' : 'plus'
}

const innerVisible = computed({
    get: () => props.modelValue,
    set: (val: boolean) => emit('update:modelValue', val),
})

const loading = ref(false)
const groups = ref<RuleGroup[]>([])

const selectedGroupId = ref<number>(0)
const newGroupName = ref('')
const newGroupIcon = ref('')

const itemEditVisible = ref(false)
const itemEditMode = ref<'create' | 'edit'>('create')
const editingRuleId = ref<number>(0)

const newItemName = ref('')
const newItemValue = ref<number>(1)
const newItemSign = ref<'plus' | 'minus'>('plus')

const selectedGroup = computed(() => {
    const id = selectedGroupId.value
    if (!id) return null
    return (groups.value ?? []).find(g => toNumber(g.id, 0) === id) ?? null
})

const selectedGroupRules = computed<Rule[]>(() => {
    return (selectedGroup.value?.rules ?? []) as Rule[]
})

async function loadGroups() {
    loading.value = true
    try {
        groups.value = await pointsManager.listRuleGroups()
        if (!selectedGroupId.value) {
            selectedGroupId.value = toNumber(groups.value?.[0]?.id, 0)
        } else {
            const exists = (groups.value ?? []).some(g => toNumber(g.id, 0) === selectedGroupId.value)
            if (!exists) selectedGroupId.value = toNumber(groups.value?.[0]?.id, 0)
        }
    } catch (err) {
        console.error(err)
        groups.value = []
        selectedGroupId.value = 0
    } finally {
        loading.value = false
    }
}

watch(() => props.modelValue, (val) => {
    if (val) void loadGroups()
})

async function onAddGroup() {
    const name = newGroupName.value.trim()
    if (!name) {
        ElMessage.error('请输入分组名称')
        return
    }
    loading.value = true
    try {
        const createdId = await pointsManager.createRuleGroupAndGetId({
            name,
            icon: newGroupIcon.value.trim() || undefined,
        })
        newGroupName.value = ''
        newGroupIcon.value = ''
        await loadGroups()
        selectedGroupId.value = createdId || selectedGroupId.value
        ElMessage.success('已新增分组')
        emit('changed')
    } catch (err: any) {
        ElMessage.error(err?.message || '新增分组失败')
    } finally {
        loading.value = false
    }
}

function openCreateItem() {
    if (!selectedGroupId.value) return
    itemEditMode.value = 'create'
    editingRuleId.value = 0
    newItemName.value = ''
    newItemValue.value = 1
    newItemSign.value = 'plus'
    itemEditVisible.value = true
}

function openEditItem(rule: Rule) {
    itemEditMode.value = 'edit'
    editingRuleId.value = toNumber(rule.id, 0)
    newItemName.value = (rule.name ?? '').trim()
    newItemValue.value = Math.abs(toNumber(rule.points, 0))
    newItemSign.value = inferRuleSign(rule)
    itemEditVisible.value = true
}

async function onRemoveGroupManage(groupId: number) {
    const g = (groups.value ?? []).find(x => toNumber(x.id, 0) === groupId)
    if (!g) return
    try {
        await ElMessageBox.confirm(`确定删除分组「${g.name}」及其下的所有分值项吗？`, '删除确认', { type: 'warning' })
        loading.value = true
        await pointsManager.deleteRuleGroup(groupId)
        await loadGroups()
        ElMessage.success('已删除分组及其分值项')
        emit('changed')
    } catch { } finally {
        loading.value = false
    }
}

async function onRemoveItem(rule: Rule) {
    const rid = toNumber(rule.id, 0)
    if (!rid) return
    try {
        await ElMessageBox.confirm(`确定删除分值项「${rule.name}」吗？`, '删除确认', { type: 'warning' })
        loading.value = true
        await pointsManager.deleteRule(rid)
        await loadGroups()
        ElMessage.success('已删除')
        emit('changed')
    } catch { } finally {
        loading.value = false
    }
}

async function onSaveItem() {
    if (!selectedGroupId.value) return
    const name = newItemName.value.trim()
    const value = Math.abs(newItemValue.value || 0)
    if (!name) {
        ElMessage.error('请输入积分项名称')
        return
    }
    if (!value) {
        ElMessage.error('请输入大于 0 的分值')
        return
    }

    loading.value = true
    try {
        const type = newItemSign.value === 'minus' ? 2 : 1
        if (itemEditMode.value === 'create') {
            await pointsManager.createRule({
                name,
                points: value,
                type,
                rule_group_id: selectedGroupId.value,
                icon: '',
                description: '',
            })
            ElMessage.success('已新增积分项')
        } else {
            const rid = editingRuleId.value
            if (!rid) return
            await pointsManager.updateRule(rid, { name, points: value, type })
            ElMessage.success('已保存修改')
        }
        itemEditVisible.value = false
        await loadGroups()
        emit('changed')
    } catch (err: any) {
        ElMessage.error(err?.message || '保存失败')
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <el-dialog
        v-model="innerVisible"
        title="分值项管理"
        width="1000px"
        class="points-rule-manage-dialog"
        modal-class="points-rule-manage-modal"
        align-center
    >
        <div class="manage-grid" v-loading="loading" element-loading-text="加载中...">
            <div class="manage-left">
                <div class="manage-block">
                    <div class="manage-toolbar">
                        <el-input v-model="newGroupName" placeholder="分组名称" class="group-name-input" />
                        <el-input v-model="newGroupIcon" placeholder="emoji" class="icon-input" />
                        <el-button type="primary" size="large" :disabled="!newGroupName.trim()" @click="onAddGroup">
                            <i-ep-plus /> 新建分组
                        </el-button>
                    </div>
                    <div class="group-list">
                        <div class="group-list-header">
                            <div class="group-list-title">分组</div>
                            <el-tag size="small" type="info" effect="light">{{ groups?.length ?? 0 }}</el-tag>
                        </div>

                        <div v-if="(groups?.length ?? 0) === 0" class="group-empty">
                            <el-empty description="暂无分组，请先新增" :image-size="92" />
                        </div>

                        <div v-else class="group-items">
                            <div
                                v-for="g in groups"
                                :key="g.id"
                                :class="['group-item', selectedGroupId === toNumber(g.id, 0) ? 'is-active' : '']"
                                @click="selectedGroupId = toNumber(g.id, 0)"
                            >
                                <div class="group-item-main">
                                    <span class="group-icon">{{ g.icon || '📁' }}</span>
                                    <span class="group-name" :title="g.name">{{ g.name }}</span>
                                </div>
                                <div class="group-item-ops">
                                    <el-button
                                        type="danger"
                                        link
                                        size="small"
                                        @click.stop="onRemoveGroupManage(toNumber(g.id, 0))"
                                    >
                                        删除
                                    </el-button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="manage-right">
                <div class="manage-block">
                    <div class="manage-title-row">
                        <div class="manage-title">
                            <span class="manage-title-icon">{{ selectedGroup?.icon || '📁' }}</span>
                            <span class="manage-title-text">{{ selectedGroup?.name || '未选择' }}</span>
                            <el-tag v-if="selectedGroupId" size="small" effect="light" class="manage-title-tag">
                                {{ selectedGroupRules.length }} 项
                            </el-tag>
                        </div>
                        <el-button type="primary" size="large" :disabled="!selectedGroupId" @click="openCreateItem">
                            <i-ep-plus />
                            新增分值项
                        </el-button>
                    </div>

                    <div class="rule-content">
                        <el-table
                            v-if="selectedGroupId"
                            :data="selectedGroupRules"
                            border
                            stripe
                            size="large"
                            height="100%"
                            class="rule-table"
                        >
                            <el-table-column type="index" label="#" width="60" />
                            <el-table-column label="名称" min-width="240">
                                <template #default="{ row }">
                                    {{ row.name }}
                                </template>
                            </el-table-column>
                            <el-table-column label="分值" width="120" align="center">
                                <template #default="{ row }">
                                    <span :class="['badge', inferRuleSign(row) === 'plus' ? 'plus' : 'minus']">
                                        {{ inferRuleSign(row) === 'plus' ? '+' : '-' }}{{ Math.abs(toNumber(row.points, 0)) }}
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
                        <div v-else class="right-empty">
                            <el-empty description="请先从左侧选择一个分组" :image-size="96" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button type="primary" class="footer-close-btn" @click="innerVisible = false">关闭</el-button>
            </span>
        </template>
    </el-dialog>

    <el-dialog v-model="itemEditVisible" :title="itemEditMode === 'create' ? '新增分值项' : '编辑分值项'" width="520px">
        <el-form label-position="top" class="item-form">
            <el-form-item label="积分项名称">
                <el-input v-model="newItemName" placeholder="例如：作业完成" />
            </el-form-item>
            <div class="item-form-row">
                <el-form-item label="分值" class="item-form-col">
                    <el-input-number v-model="newItemValue" :min="0.5" :max="99" :step="0.5" />
                </el-form-item>
                <el-form-item label="类型" class="item-form-col">
                    <el-radio-group v-model="newItemSign">
                        <el-radio-button label="plus">加分</el-radio-button>
                        <el-radio-button label="minus">扣分</el-radio-button>
                    </el-radio-group>
                </el-form-item>
            </div>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button :disabled="loading" @click="itemEditVisible = false">取消</el-button>
                <el-button type="primary" :loading="loading" @click="onSaveItem">保存</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
:global(.points-rule-manage-modal .el-dialog__footer) {
    padding-top: 12px;
    text-align: initial !important;
}

.dialog-footer {
    display: flex;
    width: 100%;
}

.footer-close-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    justify-content: center;
}

:global(.points-rule-manage-modal .el-overlay-dialog) {
    width: 100%;
    height: 100vh;
    padding: 24px !important;
    box-sizing: border-box;
    display: flex !important;
    align-items: center;
    justify-content: center;
}

:global(.points-rule-manage-modal .el-dialog) {
    width: min(1000px, calc(100vw - 48px)) !important;
    margin: 0 !important;
    height: min(760px, calc(100vh - 48px)) !important;
    max-height: calc(100vh - 48px) !important;
    display: flex !important;
    flex-direction: column;
}

:global(.points-rule-manage-modal .el-dialog.is-align-center) {
    margin: 0 !important;
}

:global(.points-rule-manage-modal .el-dialog__body) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.manage-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 14px;
    height: 100%;
    min-height: 0;
}

.manage-left,
.manage-right {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
}

.manage-block {
    border-radius: 12px;
    padding: 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.manage-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    min-height: 40px;
    max-width: 100%;
}

.manage-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    gap: 12px;
    flex: 0 0 auto;
}

.manage-title-icon {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #f3f6ff;
    border: 1px solid #e6ecff;
    flex: 0 0 auto;
}

.manage-title-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.manage-title-tag {
    flex: 0 0 auto;
}

.icon-input {
    width: 120px;
}

.group-name-input {
    flex: 1;
    flex-basis: 100%;
}

.manage-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    flex-wrap: wrap;
    padding: 10px;
    border-radius: 12px;
    background: #fafbff;
    border: 1px solid #eef0f6;
    flex: 0 0 auto;
}

.group-list {
    border: 1px solid #e6e8f0;
    border-radius: 12px;
    overflow: hidden;
    overflow-y: auto;
    background: #fff;
    flex: 1;
    min-height: 0;
}

.group-list-header {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 14px;
    font-weight: 800;
    background: #fafbff;
    border-bottom: 1px solid #eef0f6;
}

.group-list-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.group-items {
    display: flex;
    flex-direction: column;
}

.group-item {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
    min-height: 54px;
    border-left: 4px solid transparent;
    transition: background-color 0.15s ease, border-color 0.15s ease;
}

.group-item-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.group-item:hover {
    background: #f7f9ff;
}

.group-item.is-active {
    background: #edf5ff;
    border-left-color: #2d5cf6;
}

.group-item + .group-item {
    border-top: 1px solid #f2f2f2;
}

.group-name {
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
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

.group-empty,
.right-empty {
    padding: 12px 6px;
}

.rule-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.rule-table {
    flex: 1;
    min-height: 0;
}

.right-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.rule-table :deep(.el-table__inner-wrapper) {
    border-radius: 10px;
    overflow: hidden;
}

.item-form {
    padding-top: 6px;
}

.item-form-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 12px;
    align-items: end;
}

.item-form-col :deep(.el-form-item__content) {
    justify-content: flex-start;
}

@media (max-width: 900px) {
    :global(.points-rule-manage-modal .el-overlay-dialog) {
        padding: 12px !important;
    }

    :global(.points-rule-manage-modal .el-dialog) {
        width: calc(100vw - 24px) !important;
        height: calc(100vh - 24px) !important;
        max-height: calc(100vh - 24px) !important;
    }

    .manage-grid {
        grid-template-columns: 1fr;
        grid-template-rows: 0.95fr 1.05fr;
    }

    .item-form-row {
        grid-template-columns: 1fr;
    }
}
</style>


