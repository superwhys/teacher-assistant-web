<script setup lang="ts">
import PageHeader from '@/components/common/PageHeader.vue'
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createMenu, getMenuList, reorderMenus, updateMenu } from '@/api/admin'
import type { CreateMenuRequest, RbacMenu } from '@/types/admin'

const loading = ref(false)
const loadError = ref('')
const savingId = ref<number | null>(null)
const menus = ref<RbacMenu[]>([])
const menuDialogVisible = ref(false)
const menuCreating = ref(false)
const menuForm = reactive<CreateMenuRequest>({ code: '', name: '', route_key: '', icon: 'Menu', sort: 0 })
const iconSuggestions = ['Menu', 'HomeFilled', 'UserFilled', 'StarFilled', 'Present', 'Tools', 'Setting', 'DataAnalysis']

async function loadData() {
    loading.value = true
    loadError.value = ''
    try {
        const response = await getMenuList()
        menus.value = (response.data ?? []).map((item) => ({ ...item, role_codes: [...(item.role_codes ?? [])] }))
    } catch (error: unknown) {
        loadError.value = error instanceof Error ? error.message : '加载侧栏菜单失败，请稍后重试'
    } finally {
        loading.value = false
    }
}

function openCreateMenu() {
    Object.assign(menuForm, { code: '', name: '', route_key: '', icon: 'Menu', sort: 0 })
    menuDialogVisible.value = true
}

async function submitMenu() {
    const data: CreateMenuRequest = {
        code: menuForm.code.trim(),
        name: menuForm.name.trim(),
        route_key: menuForm.route_key.trim().replace(/^\/+|\/+$/g, ''),
        icon: menuForm.icon.trim(),
        sort: menuForm.sort,
    }
    if (!data.code || !data.name || !data.route_key || !data.icon) return
    menuCreating.value = true
    try {
        await createMenu(data)
        ElMessage.success('菜单及默认查看能力已创建')
        menuDialogVisible.value = false
        await loadData()
    } finally {
        menuCreating.value = false
    }
}

async function saveMenu(row: RbacMenu) {
    savingId.value = row.id
    try {
        await updateMenu(row.id, { name: row.name.trim(), icon: row.icon.trim(), enabled: row.enabled })
        ElMessage.success('菜单已保存')
        await loadData()
    } finally {
        savingId.value = null
    }
}

async function move(index: number, offset: -1 | 1) {
    const next = index + offset
    if (next < 0 || next >= menus.value.length) return
    const copy = [...menus.value]
    ;[copy[index], copy[next]] = [copy[next]!, copy[index]!]
    menus.value = copy
    await reorderMenus(copy.map((item) => item.id))
    ElMessage.success('菜单顺序已更新')
    await loadData()
}

function iconSuggestionsQuery(query: string, callback: (items: Array<{ value: string }>) => void) {
    callback(iconSuggestions
        .filter((item) => item.toLowerCase().includes(query.toLowerCase()))
        .map((value) => ({ value })))
}

onMounted(loadData)
</script>

<template>
    <div class="admin-page platform-page menu-page">
        <PageHeader eyebrow="NAVIGATION" title="侧栏菜单" description="管理教师端的导航入口，让每个角色看到合适的功能。">
            <template #actions>
                <el-button :loading="loading" @click="loadData">
                    <i-ep-refresh aria-hidden="true" />
                    刷新
                </el-button>
                <el-button type="primary" @click="openCreateMenu">
                    <i-ep-plus aria-hidden="true" />
                    新建菜单
                </el-button>
            </template>
        </PageHeader>

        <div class="menu-note">
            <i-ep-info-filled aria-hidden="true" />
            <span>每个菜单对应一个权限模块，创建后会自动生成默认查看能力。</span>
        </div>

        <section class="panel menu-panel" v-loading="loading">
            <div class="panel-heading">
                <div class="panel-heading-copy">
                    <h2 class="panel-title">菜单列表 <span class="count-badge">{{ menus.length }}</span></h2>
                    <p class="panel-description">调整名称、图标和启用状态后，点击该行「保存」。</p>
                </div>
                <span class="menu-order-hint">按列表顺序展示</span>
            </div>
            <div v-if="loadError" class="load-error" role="alert">
                <span>{{ loadError }}</span>
                <el-button link type="primary" @click="loadData">重新加载</el-button>
            </div>
            <p v-if="!loadError" class="table-scroll-hint">左右滑动表格，查看菜单配置和排序 →</p>
            <el-table v-if="menus.length || !loadError" :data="menus" row-key="id">
                <el-table-column prop="code" label="模块码" width="130" />
                <el-table-column prop="route_key" label="路由" min-width="150">
                    <template #default="{ row }">
                        <code>/{{ row.route_key }}</code>
                    </template>
                </el-table-column>
                <el-table-column label="名称" min-width="150">
                    <template #default="{ row }">
                        <el-input v-model="row.name" :aria-label="`${row.code} 菜单名称`" />
                    </template>
                </el-table-column>
                <el-table-column label="图标" width="160">
                    <template #default="{ row }">
                        <el-input v-model="row.icon" :aria-label="`${row.code} 图标名称`" />
                    </template>
                </el-table-column>
                <el-table-column label="默认查看能力" min-width="210">
                    <template #default="{ row }">
                        <code>{{ row.view_permission_code }}</code>
                    </template>
                </el-table-column>
                <el-table-column label="可见角色" min-width="180">
                    <template #default="{ row }">
                        <el-tag v-for="code in row.role_codes" :key="code" size="small" effect="plain" class="role-tag">
                            {{ code }}
                        </el-tag>
                        <span v-if="!row.role_codes.length" class="muted-text">暂未配置</span>
                    </template>
                </el-table-column>
                <el-table-column label="启用" width="80">
                    <template #default="{ row }">
                        <el-switch v-model="row.enabled" :aria-label="`启用 ${row.name} 菜单`" />
                    </template>
                </el-table-column>
                <el-table-column label="排序" width="120">
                    <template #default="{ $index }">
                        <el-button link :disabled="$index === 0" @click="move($index, -1)">上移</el-button>
                        <el-button link :disabled="$index === menus.length - 1" @click="move($index, 1)">下移</el-button>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="90" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link :loading="savingId === row.id" @click="saveMenu(row)">保存</el-button>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty description="还没有侧栏菜单" :image-size="80">
                        <el-button type="primary" @click="openCreateMenu">创建第一个菜单</el-button>
                    </el-empty>
                </template>
            </el-table>
            <div class="table-footer menu-footer">
                <span class="muted-text">共 {{ menus.length }} 个菜单</span>
                <span class="muted-text">菜单权限可在「权限配置」中管理</span>
            </div>
        </section>

        <el-dialog v-model="menuDialogVisible" title="新建侧栏菜单" width="560px" class="admin-dialog">
            <el-alert type="info" :closable="false" show-icon title="创建后会自动生成同名模块及 code.view 查看能力。" class="dialog-alert" />
            <el-form label-width="100px">
                <el-form-item label="模块码">
                    <el-input v-model="menuForm.code" placeholder="例如 reports" aria-label="模块码" />
                </el-form-item>
                <el-form-item label="菜单名称">
                    <el-input v-model="menuForm.name" placeholder="例如 数据报表" aria-label="菜单名称" />
                </el-form-item>
                <el-form-item label="路由">
                    <el-input v-model="menuForm.route_key" placeholder="例如 reports 或 reports/weekly" aria-label="菜单路由">
                        <template #prepend>/</template>
                    </el-input>
                </el-form-item>
                <el-form-item label="图标名称">
                    <el-autocomplete
                        v-model="menuForm.icon"
                        :fetch-suggestions="iconSuggestionsQuery"
                        placeholder="未知图标会使用默认菜单图标"
                        aria-label="图标名称"
                        class="icon-autocomplete"
                    />
                </el-form-item>
                <el-form-item label="初始排序">
                    <el-input-number v-model="menuForm.sort" :min="0" :step="10" aria-label="初始排序" />
                    <span class="form-hint">填 0 时自动排到最后</span>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="menuDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="menuCreating" @click="submitMenu">创建</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.menu-note {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding: 14px 18px;
    border: 1px solid #e0eae4;
    border-radius: 10px;
    background: #eef4f0;
    color: #5e766a;
    font-size: 13px;
}

.menu-note svg {
    flex: none;
    color: #187464;
    font-size: 16px;
}

.menu-panel {
    overflow: hidden;
}

.menu-order-hint {
    flex: none;
    color: #81908a;
    font-size: 12px;
}

.load-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e5ebe8;
    color: #8d5c3e;
    font-size: 13px;
}

.role-tag {
    margin: 3px 5px 3px 0;
}

.dialog-alert {
    margin-bottom: 22px;
}

.icon-autocomplete {
    width: 100%;
}

.form-hint {
    margin-left: 10px;
    color: #81908a;
    font-size: 12px;
}

@media (max-width: 760px) {
    .menu-order-hint {
        display: none;
    }

    .menu-footer {
        align-items: flex-start;
        gap: 8px;
    }
}
</style>
