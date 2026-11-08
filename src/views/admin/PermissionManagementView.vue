<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
    createPermission,
    createRole,
    deletePermission,
    getMenuList,
    getPermissionList,
    getRoleList,
    replaceRolePermissions,
    updatePermission,
} from '@/api/admin'
import type {
    CreatePermissionRequest,
    PermissionAPIBinding,
    PermissionPoint,
    RbacMenu,
    Role,
} from '@/types/admin'

interface MatrixRow {
    permission: PermissionPoint
    menu: RbacMenu | null
    moduleCode: string
    moduleName: string
    rowSpan: number
}

const loading = ref(false)
const loadError = ref(false)
const roles = ref<Role[]>([])
const permissions = ref<PermissionPoint[]>([])
const menus = ref<RbacMenu[]>([])
const savingRoleIds = ref<Set<number>>(new Set())

const roleDialogVisible = ref(false)
const roleForm = reactive({ code: '', name: '', timeout: 604800 })

const abilityDialogVisible = ref(false)
const abilityDialogMode = ref<'create' | 'edit'>('create')
const abilityModuleLocked = ref(false)
const editingPermissionId = ref<number | null>(null)
const abilityForm = reactive<CreatePermissionRequest>({
    code: '',
    name: '',
    module: '',
    action: '',
    api_bindings: [],
})

const apiDialogVisible = ref(false)
const apiTarget = ref<PermissionPoint | null>(null)
const apiBindings = ref<PermissionAPIBinding[]>([])
const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', '*']

const abilityCode = computed(() => {
    if (abilityDialogMode.value === 'edit') return abilityForm.code
    const module = abilityForm.module.trim()
    const action = abilityForm.action.trim()
    return module && action ? `${module}.${action}` : ''
})

const matrixRows = computed<MatrixRow[]>(() => {
    const result: MatrixRow[] = []
    for (const menu of [...menus.value].sort((a, b) => a.sort - b.sort || a.id - b.id)) {
        const items = permissions.value
            .filter((item) => item.module === menu.code)
            .sort((a, b) => (a.action === 'view' ? -1 : b.action === 'view' ? 1 : a.action.localeCompare(b.action)))
        items.forEach((permission, index) => {
            result.push({
                permission,
                menu,
                moduleCode: menu.code,
                moduleName: menu.name,
                rowSpan: index === 0 ? items.length : 0,
            })
        })
    }

    return result
})

async function loadData() {
    loading.value = true
    loadError.value = false
    try {
        const [roleResp, permissionResp, menuResp] = await Promise.all([
            getRoleList(),
            getPermissionList(),
            getMenuList(),
        ])
        roles.value = roleResp.data ?? []
        permissions.value = permissionResp.data ?? []
        menus.value = menuResp.data ?? []
    } catch {
        loadError.value = true
    } finally {
        loading.value = false
    }
}

function spanMethod({ row, columnIndex }: { row: MatrixRow; columnIndex: number }) {
    if (columnIndex !== 0) return { rowspan: 1, colspan: 1 }
    return row.rowSpan > 0 ? { rowspan: row.rowSpan, colspan: 1 } : { rowspan: 0, colspan: 0 }
}

function isGranted(role: Role, permissionId: number): boolean {
    return role.system || role.permissions.some((item) => item.id === permissionId)
}

function markRoleSaving(roleId: number, saving: boolean) {
    const next = new Set(savingRoleIds.value)
    if (saving) next.add(roleId)
    else next.delete(roleId)
    savingRoleIds.value = next
}

function setLocalRolePermissions(roleId: number, permissionIds: Set<number>) {
    roles.value = roles.value.map((role) => role.id === roleId
        ? { ...role, permissions: permissions.value.filter((item) => permissionIds.has(item.id)) }
        : role)
}

async function toggleRolePermission(role: Role, permission: PermissionPoint) {
    if (role.system || savingRoleIds.value.has(role.id)) return
    const before = new Set(role.permissions.map((item) => item.id))
    const next = new Set(before)
    if (next.has(permission.id)) next.delete(permission.id)
    else next.add(permission.id)

    setLocalRolePermissions(role.id, next)
    markRoleSaving(role.id, true)
    try {
        await replaceRolePermissions(role.id, [...next])
    } catch (error) {
        setLocalRolePermissions(role.id, before)
        throw error
    } finally {
        markRoleSaving(role.id, false)
    }
}

function openRoleDialog() {
    Object.assign(roleForm, { code: '', name: '', timeout: 604800 })
    roleDialogVisible.value = true
}

async function submitRole() {
    if (!roleForm.code.trim() || !roleForm.name.trim() || roleForm.timeout <= 0) return
    await createRole({ ...roleForm, code: roleForm.code.trim(), name: roleForm.name.trim() })
    ElMessage.success('角色已创建')
    roleDialogVisible.value = false
    await loadData()
}

function openCreateAbility(moduleCode?: string, lockModule = false) {
    abilityDialogMode.value = 'create'
    abilityModuleLocked.value = lockModule
    editingPermissionId.value = null
    Object.assign(abilityForm, {
        code: '',
        name: '',
        module: moduleCode || menus.value[0]?.code || '',
        action: '',
        api_bindings: [],
    })
    abilityDialogVisible.value = true
}

function openEditAbility(item: PermissionPoint) {
    abilityDialogMode.value = 'edit'
    abilityModuleLocked.value = true
    editingPermissionId.value = item.id
    Object.assign(abilityForm, {
        code: item.code,
        name: item.name,
        module: item.module,
        action: item.action,
        api_bindings: item.api_bindings.map((binding) => ({ ...binding })),
    })
    abilityDialogVisible.value = true
}

async function submitAbility() {
    const data = {
        code: abilityCode.value,
        name: abilityForm.name.trim(),
        module: abilityForm.module.trim(),
        action: abilityForm.action.trim(),
        api_bindings: abilityForm.api_bindings,
    }
    if (!data.code || !data.name || !data.module || !data.action) return
    if (editingPermissionId.value) {
        await updatePermission(editingPermissionId.value, data)
        ElMessage.success('能力已更新')
    } else {
        await createPermission(data)
        ElMessage.success('能力已创建')
    }
    abilityDialogVisible.value = false
    await loadData()
}

function openAPIEditor(item: PermissionPoint) {
    apiTarget.value = item
    apiBindings.value = item.api_bindings.map((binding) => ({ ...binding }))
    apiDialogVisible.value = true
}

function addAPIBinding() {
    apiBindings.value.push({ method: 'GET', path: '' })
}

function removeAPIBinding(index: number) {
    apiBindings.value.splice(index, 1)
}

async function saveAPIBindings() {
    if (!apiTarget.value) return
    const bindings = apiBindings.value
        .map((item) => ({ method: item.method.trim().toUpperCase(), path: item.path.trim() }))
        .filter((item) => item.method && item.path)
    await updatePermission(apiTarget.value.id, {
        name: apiTarget.value.name,
        module: apiTarget.value.module,
        action: apiTarget.value.action,
        api_bindings: bindings,
    })
    ElMessage.success('接口绑定已保存')
    apiDialogVisible.value = false
    await loadData()
}

async function confirmDeleteAbility(item: PermissionPoint) {
    if (item.action === 'view' && menus.value.some((menu) => menu.view_permission_id === item.id)) return
    await ElMessageBox.confirm(`确定删除能力“${item.name}”吗？角色授权和接口绑定将同步移除。`, '删除能力', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
    })
    await deletePermission(item.id)
    ElMessage.success('能力已删除')
    await loadData()
}

onMounted(loadData)
</script>

<template>
    <div class="permission-page admin-page platform-page">
        <PageHeader
            eyebrow="ACCESS CONTROL"
            title="权限配置"
            description="以模块组织能力，为每个角色配置清晰、适当的访问权限。"
        >
            <template #actions>
                <el-button @click="openRoleDialog">
                    <i-ep-plus aria-hidden="true" />
                    新建角色
                </el-button>
                <el-button type="primary" :disabled="menus.length === 0" @click="openCreateAbility()">
                    <i-ep-plus aria-hidden="true" />
                    新建能力
                </el-button>
            </template>
        </PageHeader>

        <el-alert v-if="loadError" type="error" :closable="false" show-icon class="page-alert">
            <template #title>
                <div class="load-error">
                    <span>权限数据加载失败，请重试。</span>
                    <el-button link type="primary" :loading="loading" @click="loadData">重新加载</el-button>
                </div>
            </template>
        </el-alert>
        <el-alert
            v-else-if="!loading && menus.length === 0"
            type="warning"
            :closable="false"
            show-icon
            title="请先在“侧栏菜单”中创建模块，再为模块添加能力。"
            class="page-alert"
        />

        <section class="panel matrix-panel" v-loading="loading">
            <div class="panel-heading matrix-heading">
                <div>
                    <h2 class="panel-title">角色权限矩阵</h2>
                    <p class="panel-description">点击开关调整授权，系统角色拥有全部能力且不可修改。</p>
                </div>
                <div class="save-hint" role="status">
                    <span class="save-dot" />
                    {{ savingRoleIds.size ? '正在保存权限…' : '修改后自动保存' }}
                </div>
            </div>
            <p v-if="!loadError" class="table-scroll-hint">左右滑动表格，查看角色授权和管理操作 →</p>
            <el-table
                v-if="matrixRows.length || !loadError"
                :data="matrixRows"
                :span-method="spanMethod"
                row-key="permission.id"
                class="permission-matrix"
            >
                <el-table-column label="模块" width="154" fixed="left">
                    <template #default="{ row }">
                        <div class="module-cell">
                            <strong>{{ row.moduleName }}</strong>
                            <code>{{ row.moduleCode }}</code>
                            <el-button
                                v-if="row.menu"
                                link
                                type="primary"
                                @click="openCreateAbility(row.moduleCode, true)"
                            >新增能力</el-button>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column label="能力" min-width="260">
                    <template #default="{ row }">
                        <div class="ability-cell">
                            <strong>{{ row.permission.name }}</strong>
                            <span>
                                {{ row.permission.code }}
                                · {{ row.permission.action === 'view' ? `关联侧栏「${row.moduleName}」` : '模块能力' }}
                                · {{ row.permission.api_bindings.length }} 个接口
                            </span>
                        </div>
                    </template>
                </el-table-column>

                <el-table-column v-for="role in roles" :key="role.id" :label="role.name" min-width="132" align="center">
                    <template #header>
                        <div class="role-heading">
                            <span>{{ role.name }}</span>
                            <span v-if="role.system" class="system-role">系统只读</span>
                        </div>
                    </template>
                    <template #default="{ row }">
                        <button
                            type="button"
                            class="permission-toggle"
                            :class="{ 'is-enabled': isGranted(role, row.permission.id), 'is-saving': savingRoleIds.has(role.id) }"
                            :disabled="role.system || savingRoleIds.has(role.id)"
                            :aria-pressed="isGranted(role, row.permission.id)"
                            :aria-label="`${role.name} · ${row.permission.name}：${isGranted(role, row.permission.id) ? '已授权' : '未授权'}${role.system ? '，系统角色不可修改' : ''}`"
                            @click="toggleRolePermission(role, row.permission)"
                        >
                            <span class="toggle-dot" aria-hidden="true" />
                            {{ isGranted(role, row.permission.id) ? '已授权' : '未授权' }}
                        </button>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="176" align="center">
                    <template #default="{ row }">
                        <el-button link type="primary" @click="openEditAbility(row.permission)">编辑</el-button>
                        <el-button link type="primary" @click="openAPIEditor(row.permission)">接口</el-button>
                        <el-button
                            link
                            type="danger"
                            :disabled="row.permission.action === 'view' && row.menu?.view_permission_id === row.permission.id"
                            @click="confirmDeleteAbility(row.permission)"
                        >删除</el-button>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty description="暂无能力，请先创建模块并添加能力" :image-size="80" />
                </template>
            </el-table>
            <div class="table-footer matrix-footer">
                <span class="muted-text">按模块管理能力与接口绑定</span>
                <div class="matrix-counts">
                    <span>{{ menus.length }} 个模块</span>
                    <span>{{ permissions.length }} 项能力</span>
                    <span>{{ roles.length }} 个角色</span>
                </div>
            </div>
        </section>

        <el-dialog v-model="roleDialogVisible" title="新建角色" width="480px" class="admin-dialog">
            <el-form label-width="90px">
                <el-form-item label="角色编码">
                    <el-input v-model="roleForm.code" placeholder="例如 class_manager" aria-label="角色编码" />
                </el-form-item>
                <el-form-item label="角色名称">
                    <el-input v-model="roleForm.name" aria-label="角色名称" />
                </el-form-item>
                <el-form-item label="有效期">
                    <el-input-number v-model="roleForm.timeout" :min="1" :max="31536000" aria-label="角色有效期" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="roleDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitRole">创建</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="abilityDialogVisible" :title="abilityDialogMode === 'create' ? '新建能力' : '编辑能力'" width="560px" class="admin-dialog">
            <el-form label-width="90px">
                <el-form-item label="所属模块">
                    <el-select v-model="abilityForm.module" :disabled="abilityDialogMode === 'edit' || abilityModuleLocked" style="width: 100%">
                        <el-option v-for="menu in menus" :key="menu.id" :label="`${menu.name} (${menu.code})`" :value="menu.code" />
                    </el-select>
                </el-form-item>
                <el-form-item label="能力名称">
                    <el-input v-model="abilityForm.name" placeholder="例如 编辑学生" aria-label="能力名称" />
                </el-form-item>
                <el-form-item label="能力动作">
                    <el-input v-model="abilityForm.action" :disabled="abilityDialogMode === 'edit'" placeholder="例如 edit" aria-label="能力动作" />
                </el-form-item>
                <el-form-item label="权限码">
                    <el-input :model-value="abilityCode" disabled aria-label="权限码" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="abilityDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitAbility">保存</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="apiDialogVisible" :title="`接口绑定 · ${apiTarget?.name || ''}`" width="720px" class="admin-dialog">
            <div class="api-bindings">
                <div v-for="(binding, index) in apiBindings" :key="index" class="api-binding-row">
                    <el-select v-model="binding.method" :aria-label="`接口 ${index + 1} 请求方法`">
                        <el-option v-for="method in methodOptions" :key="method" :label="method" :value="method" />
                    </el-select>
                    <el-input v-model="binding.path" placeholder="/student/:student_id" :aria-label="`接口 ${index + 1} 路径`" />
                    <el-button type="danger" plain @click="removeAPIBinding(index)">删除</el-button>
                </div>
                <el-empty v-if="apiBindings.length === 0" description="暂未绑定接口" :image-size="72" />
                <el-button plain @click="addAPIBinding">添加接口</el-button>
            </div>
            <template #footer>
                <el-button @click="apiDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveAPIBindings">保存接口</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.page-alert {
    margin-bottom: 20px;
}

.matrix-panel {
    min-width: 0;
    overflow: hidden;
}

.matrix-heading {
    gap: 20px;
}

.save-hint {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 7px;
    color: #81908a;
    font-size: 12px;
}

.save-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #187464;
}

.load-error {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.role-heading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.system-role {
    color: #81908a;
    font-size: 10px;
    font-weight: 400;
}

.module-cell,
.ability-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.module-cell strong,
.ability-cell strong {
    color: #23352f;
    font-weight: 600;
}

.module-cell code,
.ability-cell span {
    color: #81908a;
    font-size: 12px;
    line-height: 1.6;
}

.module-cell .el-button {
    padding: 0;
    height: auto;
    margin-top: 3px;
    font-size: 12px;
}

.permission-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-width: 92px;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid #e5ebe8;
    border-radius: 7px;
    background: #f5f7f6;
    color: #81908a;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 160ms ease, border-color 160ms ease;
}

.permission-toggle:hover:not(:disabled) {
    border-color: #a8c9bf;
}

.permission-toggle:focus-visible {
    outline: 2px solid #187464;
    outline-offset: 3px;
}

.permission-toggle.is-enabled {
    border-color: #d0e6de;
    background: #eaf4ef;
    color: #187464;
}

.permission-toggle:disabled {
    cursor: default;
}

.permission-toggle.is-saving {
    opacity: .6;
}

.toggle-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #adb8b3;
}

.permission-toggle.is-enabled .toggle-dot {
    background: #187464;
}

.matrix-counts {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    color: #65756d;
    font-size: 12px;
}

.api-bindings {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.api-binding-row {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr) auto;
    gap: 8px;
}

@media (max-width: 680px) {
    .matrix-heading {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
    }

    .matrix-footer {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
    }

    .api-binding-row {
        grid-template-columns: minmax(0, 1fr) auto;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5ebe8;
    }

    .api-binding-row > .el-select {
        grid-column: 1 / -1;
    }
}

@media (prefers-reduced-motion: reduce) {
    .permission-toggle {
        transition: none;
    }
}
</style>
