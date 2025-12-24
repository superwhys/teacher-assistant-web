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
    <el-dialog v-model="innerVisible" title="分值项管理" width="1000px">
        <div class="manage-grid" v-loading="loading" element-loading-text="加载中...">
            <div class="manage-left">
                <div class="manage-block">
                    <div class="manage-toolbar">
                        <el-input v-model="newGroupName" placeholder="分组名称" class="group-name-input" />
                        <el-input v-model="newGroupIcon" placeholder="emoji" class="icon-input" />
                        <el-button type="primary" :disabled="!newGroupName.trim()" @click="onAddGroup">
                            <i-ep-plus /> 新建分组
                        </el-button>
                    </div>
                    <div class="group-list">
                        <div class="group-list-header">分组</div>
                        <div
                            v-for="g in groups"
                            :key="g.id"
                            :class="['group-item', selectedGroupId === toNumber(g.id, 0) ? 'is-active' : '']"
                            @click="selectedGroupId = toNumber(g.id, 0)"
                        >
                            <div class="group-item-main">
                                <span class="group-icon">{{ g.icon || '📁' }}</span>
                                <span class="group-name">{{ g.name }}</span>
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
                        <div v-if="(groups?.length ?? 0) === 0" class="item-empty">暂无分组，请先新增</div>
                    </div>
                </div>
            </div>
            <div class="manage-right">
                <div class="manage-block">
                    <div class="manage-title-row">
                        <div class="manage-title">{{ selectedGroup?.name || '未选择' }}</div>
                        <el-button type="primary" :disabled="!selectedGroupId" @click="openCreateItem">
                            <i-ep-plus />
                            新增分值项
                        </el-button>
                    </div>

                    <el-table
                        v-if="selectedGroupId"
                        :data="selectedGroupRules"
                        border
                        size="large"
                        height="52vh"
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
            <el-input-number v-model="newItemValue" :min="0.5" :max="99" :step="0.5" />
            <el-radio-group v-model="newItemSign">
                <el-radio-button label="plus">加分</el-radio-button>
                <el-radio-button label="minus">扣分</el-radio-button>
            </el-radio-group>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button :disabled="loading" @click="itemEditVisible = false">取消</el-button>
                <el-button type="primary" :loading="loading" @click="onSaveItem">保存</el-button>
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
    align-items: center;
    gap: 10px;
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

.group-item:hover {
    background: #fafafa;
}

.group-item.is-active {
    background: #edf5ff;
}

.group-item + .group-item {
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


