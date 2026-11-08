<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { getUserList, adminLoginAsUser, getRoleList, assignRoleToUser } from '@/api/admin'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/common/PageHeader.vue'
import { isApiRequestError } from '@/types/api'
import { buildTeacherAppLoginUrl } from '@/utils/adminLogin'
import type { User, Role } from '@/types/admin'

const loading = ref(false)
const loadError = ref(false)
const usersLoaded = ref(false)
const rolesLoaded = ref(false)
const rolesLoading = ref(false)
const keyword = ref('')
const users = ref<User[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const sortOrder = ref<'asc' | 'desc'>('asc')
let usersRequestId = 0
const roles = ref<Role[]>([])
const roleDialogVisible = ref(false)
const selectedRoleId = ref<number | null>(null)
const currentEditingUser = ref<User | null>(null)
const assigningRole = ref(false)
const filteredUsers = computed(() => {
    const query = keyword.value.trim().toLowerCase()
    return users.value.filter((user) => !query || `${user.name} ${user.email}`.toLowerCase().includes(query))
})

const pageStart = computed(() => users.value.length ? (currentPage.value - 1) * pageSize.value + 1 : 0)
const pageEnd = computed(() => users.value.length ? pageStart.value + users.value.length - 1 : 0)
const loadUsers = async () => {
    const requestId = ++usersRequestId
    loading.value = true
    loadError.value = false
    try {
        const offset = (currentPage.value - 1) * pageSize.value
        const response = await getUserList({ offset, limit: pageSize.value, sort_order: sortOrder.value })
        if (requestId !== usersRequestId) return
        users.value = response.data.items || []
        total.value = response.data.total || 0
        usersLoaded.value = true
    } catch (error: unknown) {
        if (requestId !== usersRequestId) return
        loadError.value = true
        if (!isApiRequestError(error)) {
            ElMessage.error(error instanceof Error && error.message ? error.message : '加载用户列表失败')
        }
    } finally {
        if (requestId === usersRequestId) {
            loading.value = false
        }
    }
}

const loadRoles = async () => {
    rolesLoading.value = true
    rolesLoaded.value = false
    try {
        const response = await getRoleList()
        roles.value = response.data || []
        rolesLoaded.value = true
    } catch (error: unknown) {
        if (!isApiRequestError(error)) {
            ElMessage.error(error instanceof Error && error.message ? error.message : '加载角色列表失败')
        }
    } finally {
        rolesLoading.value = false
    }
}

const handleSortChange = ({ order }: { order: 'ascending' | 'descending' | null }) => {
    const nextOrder = order === 'descending' ? 'desc' : 'asc'
    if (nextOrder === sortOrder.value) return
    sortOrder.value = nextOrder
    currentPage.value = 1
}

const formatDateTime = (value?: string): string => {
    if (!value) {
        return '-'
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return value
    }
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const handleQuickLogin = async (user: User) => {
    try {
        await ElMessageBox.confirm(
            `确认以用户 ${user.email} 身份登录吗？`,
            '一键登录确认',
            {
                confirmButtonText: '确认登录',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )

        const response = await adminLoginAsUser(user.id)
        const token = response.data.token
        if (!token) {
            ElMessage.error('登录失败：未获取到 token')
            return
        }

        const targetUrl = buildTeacherAppLoginUrl(token, window.location.origin, import.meta.env.BASE_URL)
        const newWindow = window.open(targetUrl, '_blank')
        if (!newWindow) {
            ElMessage.warning('浏览器拦截了新标签页，请允许弹窗后重试')
            return
        }
        newWindow.opener = null
    } catch (error: unknown) {
        if (error === 'cancel' || error === 'close') {
            return
        }
        if (!isApiRequestError(error)) {
            ElMessage.error(error instanceof Error && error.message ? error.message : '一键登录失败')
        }
    }
}

const handleOpenAssignRoleDialog = (user: User) => {
    currentEditingUser.value = user
    selectedRoleId.value = user.role_id || null
    roleDialogVisible.value = true
}

const handleAssignRole = async () => {
    if (assigningRole.value) return
    if (!currentEditingUser.value) {
        ElMessage.warning('未选择用户')
        return
    }
    if (!selectedRoleId.value) {
        ElMessage.warning('请选择角色')
        return
    }
    assigningRole.value = true
    try {
        await assignRoleToUser({
            user_id: currentEditingUser.value.id,
            role_id: selectedRoleId.value
        })
        ElMessage.success('角色分配成功')
        roleDialogVisible.value = false
        await loadUsers()
    } catch (error: unknown) {
        if (!isApiRequestError(error)) {
            ElMessage.error(error instanceof Error && error.message ? error.message : '角色分配失败')
        }
    } finally {
        assigningRole.value = false
    }
}

watch([currentPage, sortOrder], loadUsers)

onMounted(() => {
    loadUsers()
    loadRoles()
})
</script>

<template>
    <div class="admin-page platform-page user-management">
        <PageHeader
            eyebrow="USER MANAGEMENT"
            title="用户管理"
            description="了解每一位用户，管理账号角色与访问权限。"
        >
            <template #actions>
                <el-button :loading="loading" @click="loadUsers">
                    <i-ep-refresh v-if="!loading" aria-hidden="true" />
                    刷新列表
                </el-button>
                <el-button type="primary" @click="$router.push('/platform/permissions')">
                    <i-ep-key aria-hidden="true" />
                    管理角色权限
                </el-button>
            </template>
        </PageHeader>

        <section class="user-overview" aria-label="用户概况">
            <div class="overview-card">
                <div class="overview-label">注册用户<span class="overview-icon"><i-ep-user aria-hidden="true" /></span></div>
                <strong>{{ usersLoaded && !loadError ? total.toLocaleString() : '—' }}<small>位</small></strong>
                <p>平台内全部注册账号</p>
            </div>
            <div class="overview-card">
                <div class="overview-label">可分配角色<span class="overview-icon roles-icon"><i-ep-key aria-hidden="true" /></span></div>
                <strong>{{ rolesLoaded ? roles.length : '—' }}<small>种</small></strong>
                <p>通过角色统一管理用户权限</p>
            </div>
            <div class="overview-card">
                <div class="overview-label">当前页用户<span class="overview-icon page-icon"><i-ep-document aria-hidden="true" /></span></div>
                <strong>{{ usersLoaded && !loadError ? users.length : '—' }}<small>位</small></strong>
                <p>每页展示 {{ pageSize }} 位用户</p>
            </div>
        </section>

        <section class="panel" aria-label="用户目录">
            <div class="panel-heading">
                <div>
                    <h2 class="panel-title">用户目录 <span class="count-badge">{{ total }}</span></h2>
                    <p class="panel-description">查看账号信息，为用户分配合适的角色。</p>
                </div>
                <el-input
                    v-model="keyword"
                    clearable
                    placeholder="搜索本页姓名或邮箱…"
                    aria-label="搜索本页用户姓名或邮箱"
                    class="user-search"
                    :disabled="loadError"
                >
                    <template #prefix><i-ep-search aria-hidden="true" /></template>
                </el-input>
            </div>

            <div v-if="loadError" class="load-error" role="alert">
                <el-empty description="用户列表加载失败，请重试" :image-size="80">
                    <el-button @click="loadUsers">重新加载</el-button>
                </el-empty>
            </div>
            <p v-if="!loadError" class="table-scroll-hint">左右滑动表格，查看角色和管理操作 →</p>
            <el-table
                v-if="!loadError"
                v-loading="loading"
                :data="filteredUsers"
                :default-sort="{ prop: 'created_at', order: sortOrder === 'desc' ? 'descending' : 'ascending' }"
                row-key="id"
                style="width: 100%"
                @sort-change="handleSortChange"
            >
                <el-table-column label="用户" width="260">
                    <template #default="{ row }">
                        <div class="user-identity">
                            <span class="user-avatar">{{ (row.name || row.email || '?').slice(0, 1).toUpperCase() }}</span>
                            <div class="user-identity-copy">
                                <strong :title="row.name">{{ row.name || '未设置姓名' }}</strong>
                                <span :title="row.email">{{ row.email }}</span>
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="id" label="用户 ID" min-width="320" show-overflow-tooltip>
                    <template #default="{ row }"><span class="user-id">{{ row.id }}</span></template>
                </el-table-column>
                <el-table-column label="角色" min-width="145">
                    <template #default="{ row }">
                        <span class="user-role" :class="{ 'is-unassigned': !row.role }">
                            <span class="role-dot" />{{ row.role?.name || row.role?.code || '未分配' }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column
                    prop="created_at"
                    label="创建时间"
                    min-width="190"
                    sortable="custom"
                    :sort-orders="['ascending', 'descending']"
                >
                    <template #default="{ row }"><span class="user-date">{{ formatDateTime(row.created_at) }}</span></template>
                </el-table-column>
                <el-table-column label="操作" width="205" align="right">
                    <template #default="{ row }">
                        <div class="user-actions">
                            <el-button type="primary" link @click="handleOpenAssignRoleDialog(row)">分配角色</el-button>
                            <span class="action-divider" />
                            <el-button link @click="handleQuickLogin(row)">一键登录 <i-ep-top-right aria-hidden="true" /></el-button>
                        </div>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty :description="keyword ? '本页没有匹配的用户' : '暂无用户'" :image-size="80">
                        <el-button v-if="keyword" @click="keyword = ''">清除筛选</el-button>
                    </el-empty>
                </template>
            </el-table>

            <div class="table-footer">
                <span v-if="loadError">加载失败后可重新获取列表</span>
                <span v-else-if="keyword">本页匹配 {{ filteredUsers.length }} 位 · 平台共 {{ total }} 位用户</span>
                <span v-else>显示 <strong>{{ pageStart }}–{{ pageEnd }}</strong> 位，共 <strong>{{ total }}</strong> 位用户</span>
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    :total="total"
                    :disabled="loading || loadError"
                    :pager-count="5"
                    layout="prev, pager, next"
                />
            </div>
        </section>

        <p class="user-page-note"><i-ep-info-filled aria-hidden="true" />角色决定用户可使用的功能，可前往「权限配置」调整角色能力。</p>

        <el-dialog v-model="roleDialogVisible" title="分配角色" width="440px" class="admin-dialog" destroy-on-close>
            <div class="assign-role-account">
                <span class="user-avatar">{{ (currentEditingUser?.name || currentEditingUser?.email || '?').slice(0, 1).toUpperCase() }}</span>
                <div><strong>{{ currentEditingUser?.name || '未设置姓名' }}</strong><span>{{ currentEditingUser?.email }}</span></div>
            </div>
            <el-form label-position="top">
                <el-form-item label="用户角色">
                    <el-select
                        v-model="selectedRoleId"
                        placeholder="请选择角色"
                        aria-label="用户角色"
                        :loading="rolesLoading"
                        :disabled="!rolesLoaded || assigningRole"
                        style="width: 100%"
                    >
                        <el-option v-for="item in roles" :key="item.id" :label="`${item.name} (${item.code})`" :value="item.id" />
                    </el-select>
                </el-form-item>
            </el-form>
            <p v-if="!rolesLoaded && !rolesLoading" class="roles-error">
                角色列表加载失败 <el-button link type="primary" @click="loadRoles">重新加载</el-button>
            </p>
            <p v-else class="muted-text">保存后，该用户将获得所选角色对应的功能权限。</p>
            <template #footer>
                <el-button :disabled="assigningRole" @click="roleDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="assigningRole" :disabled="!rolesLoaded" @click="handleAssignRole">确认分配</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.user-overview {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 26px;
}

.overview-card {
    padding: 19px 22px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: white;
}

.overview-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #7a8b80;
    font-size: 12px;
}

.overview-icon {
    display: grid;
    width: 31px;
    height: 31px;
    place-items: center;
    border-radius: 8px;
    background: #edf6f1;
    color: #568d75;
    font-size: 16px;
}

.roles-icon {
    background: #f6f4e9;
    color: #a89657;
}

.page-icon {
    background: #f0f2f8;
    color: #828da5;
}

.overview-card > strong {
    display: block;
    margin-top: 4px;
    font-size: 32px;
    font-weight: 600;
    letter-spacing: -1px;
    font-variant-numeric: tabular-nums;
}

.overview-card small {
    margin-left: 8px;
    color: #93a095;
    font-size: 11px;
    font-weight: 400;
}

.overview-card p {
    margin: 8px 0 0;
    color: #9aa69e;
    font-size: 11px;
}

.user-search {
    width: 250px;
    max-width: 100%;
}

.user-search :deep(.el-input__wrapper) {
    background: #fbfcfb;
}

.user-identity,
.assign-role-account {
    display: flex;
    align-items: center;
    gap: 12px;
}

.user-avatar {
    display: grid;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    place-items: center;
    border: 1px solid #e1e9e0;
    border-radius: 50%;
    background: #f1f5ef;
    color: #778d6f;
    font-size: 13px;
    font-weight: 500;
}

.user-identity-copy {
    min-width: 0;
}

.user-identity-copy strong,
.user-identity-copy span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.user-identity-copy strong {
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
}

.user-identity-copy span {
    margin-top: 3px;
    color: #687a70;
    font-size: 12px;
    line-height: 17px;
}

.user-id,
.user-date {
    color: #687a70;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}

.user-id {
    font-family: 'SFMono-Regular', Consolas, monospace;
}

.user-role {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border: 1px solid #dcece2;
    border-radius: 5px;
    background: #eff7f1;
    color: #5c8468;
    font-size: 10px;
    white-space: nowrap;
    line-height: 18px;
}

.role-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: currentColor;
}

.is-unassigned {
    border-color: #e8ece8;
    background: #f5f6f5;
    color: #98a29b;
}

.user-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
}

.user-actions :deep(.el-button) {
    margin-left: 0;
    font-size: 11px;
}

.action-divider {
    width: 1px;
    height: 11px;
    background: var(--border-color);
}

.table-footer strong {
    color: #5c7062;
    font-weight: 500;
}

.user-page-note {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 18px 0 0;
    color: #9aa69e;
    font-size: 11px;
    line-height: 1.8;
}

.user-page-note > svg {
    flex-shrink: 0;
}

.assign-role-account {
    margin-bottom: 22px;
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: #f8faf8;
}

.assign-role-account strong,
.assign-role-account div > span {
    display: block;
    overflow-wrap: anywhere;
}

.assign-role-account strong {
    font-size: 13px;
    font-weight: 500;
}

.assign-role-account div > span {
    margin-top: 3px;
    color: var(--text-secondary);
    font-size: 12px;
}

.roles-error {
    color: #ae6e4a;
    font-size: 12px;
}

@media (max-width: 1050px) {
    .overview-card {
        padding: 15px;
    }
}

@media (max-width: 600px) {
    .user-overview {
        gap: 8px;
        margin-bottom: 20px;
    }

    .overview-card {
        padding: 12px 10px;
    }

    .overview-label {
        font-size: 10px;
    }

    .overview-icon,
    .overview-card p {
        display: none;
    }

    .overview-card > strong {
        margin-top: 12px;
        font-size: 25px;
    }

    .overview-card small {
        margin-left: 4px;
        font-size: 9px;
    }

    .user-search {
        width: 100%;
    }
}
</style>
