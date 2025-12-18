<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLotteryStore } from '@/stores/lotteryStore'
import { useShopStore } from '@/stores/shopStore'
import type { Prize, PrizePool } from '@/types/lottery'
import type { ShopItem } from '@/types/shopItem'

defineOptions({
    name: 'LotteryView'
})

const lotteryStore = useLotteryStore()
const shopStore = useShopStore()

onMounted(() => {
    void Promise.all([lotteryStore.hydrate(), shopStore.hydrate?.()])
        .then(() => {
            pools.value = lotteryStore.getAllPools()
            currentPoolId.value = lotteryStore.currentPool?.id || null
            refreshPrizes()
            records.value = lotteryStore.getAllRecords()
        })
        .catch(() => {})
})

const prizes = ref<Prize[]>([])
const records = ref(lotteryStore.getAllRecords())
const pools = ref(lotteryStore.getAllPools())
const currentPoolId = ref<string | null>(lotteryStore.currentPool?.id || null)

function refreshPrizes() {
    prizes.value = lotteryStore.getAllPrizes()
    records.value = lotteryStore.getAllRecords()
}
refreshPrizes()

const enabledPrizes = computed(() => prizes.value.filter(p => p.enabled && p.weight > 0))

const addDialogVisible = ref(false)
const editMode = ref<'add' | 'edit'>('add')
const prizeForm = reactive({
    id: '',
    name: '',
    weight: 1,
    enabled: true as boolean,
})

function handleDeleteCurrentPrize() {
    if (editMode.value !== 'edit' || !prizeForm.id) return
    const target = prizes.value.find(p => p.id === prizeForm.id)
    if (!target) return
    deletePrize(target)
    addDialogVisible.value = false
}

function openAddDialog() {
    editMode.value = 'add'
    prizeForm.id = ''
    prizeForm.name = ''
    prizeForm.weight = 1
    prizeForm.enabled = true
    addDialogVisible.value = true
}

function openEditDialog(item: Prize) {
    editMode.value = 'edit'
    prizeForm.id = item.id
    prizeForm.name = item.name
    prizeForm.weight = item.weight
    prizeForm.enabled = item.enabled
    addDialogVisible.value = true
}

function savePrize() {
    if (!prizeForm.name.trim()) {
        ElMessage.warning('请输入奖品名称')
        return
    }
    if (prizeForm.weight <= 0) {
        ElMessage.warning('权重必须大于 0')
        return
    }
    if (editMode.value === 'add') {
        lotteryStore.addPrize({
            name: prizeForm.name.trim(),
            weight: prizeForm.weight,
            enabled: prizeForm.enabled,
            source: 'custom',
        })
        ElMessage.success('已添加奖品')
    } else {
        lotteryStore.updatePrize(prizeForm.id, {
            name: prizeForm.name.trim(),
            weight: prizeForm.weight,
            enabled: prizeForm.enabled,
        })
        ElMessage.success('已更新奖品')
    }
    addDialogVisible.value = false
    refreshPrizes()
}

function deletePrize(item: Prize) {
    ElMessageBox.confirm(`确定删除奖品「${item.name}」吗？`, '删除确认', {
        type: 'warning'
    }).then(() => {
        lotteryStore.deletePrize(item.id)
        refreshPrizes()
        ElMessage.success('已删除')
    }).catch(() => {})
}

function toggleEnabled(item: Prize) {
    lotteryStore.updatePrize(item.id, { enabled: !item.enabled })
    refreshPrizes()
}

const importDialogVisible = ref(false)
const importSelection = ref<string[]>([])
const importWeightStrategy = ref<'fixed' | 'stock'>('fixed')
const shopItems = computed<ShopItem[]>(() => shopStore.getAllItems())

function openImportDialog() {
    importSelection.value = []
    importWeightStrategy.value = 'fixed'
    importDialogVisible.value = true
}

function confirmImport(overwrite = false) {
    if (importSelection.value.length === 0) {
        ElMessage.warning('请选择要导入的商品')
        return
    }
    const selected = shopItems.value.filter(i => importSelection.value.includes(i.id))
    const count = lotteryStore.importFromShop(selected, importWeightStrategy.value, overwrite)
    ElMessage.success(`导入成功：${count} 个奖品`)
    importDialogVisible.value = false
    refreshPrizes()
}

// rolling like RollCallView
const isRolling = ref(false)
const currentName = ref<string>('')
const isSelected = ref(false)
let rollingTimer: number | undefined
let selectedTimer: number | undefined

function weightedRandom(items: Prize[]): Prize | null {
    if (items.length === 0) return null
    const weights = items.map(i => i.weight)
    const sum = weights.reduce((a, b) => a + b, 0)
    if (sum <= 0) return null
    let r = Math.random() * sum
    for (let i = 0; i < items.length; i++) {
        r -= items[i]!.weight
        if (r < 0) return items[i]!
    }
    return items[items.length - 1] || null
}

function getCandidates(): Prize[] {
    return enabledPrizes.value
}

function pickRandomOne(): Prize | null {
    const list = getCandidates()
    if (list.length === 0) return null
    const idx = Math.floor(Math.random() * list.length)
    return list[idx] ?? null
}

function triggerSelectedEffect() {
    isSelected.value = true
    if (selectedTimer !== undefined) window.clearTimeout(selectedTimer)
    selectedTimer = window.setTimeout(() => {
        isSelected.value = false
    }, 3000)
}

function startRolling() {
    const candidates = getCandidates()
    if (candidates.length === 0) {
        ElMessage.warning('请先添加并启用至少一个奖品')
        return
    }
    if (isRolling.value) return
    isRolling.value = true
    rollingTimer = window.setInterval(() => {
        const one = pickRandomOne()
        currentName.value = one ? one.name : ''
    }, 60)
}

function stopRolling() {
    if (!isRolling.value) return
    isRolling.value = false
    if (rollingTimer !== undefined) {
        window.clearInterval(rollingTimer)
        rollingTimer = undefined
    }
    const picked = weightedRandom(getCandidates())
    if (!picked) {
        ElMessage.warning('没有可抽取的奖品')
        return
    }
    currentName.value = picked.name
    lotteryStore.addRecord(picked)
    records.value = lotteryStore.getAllRecords()
    triggerSelectedEffect()
}

function toggleRolling() {
    isRolling.value ? stopRolling() : startRolling()
}

function drawOnce() {
    if (isRolling.value) return
    const picked = weightedRandom(getCandidates())
    if (!picked) {
        ElMessage.warning('没有可抽取的奖品')
        return
    }
    currentName.value = picked.name
    lotteryStore.addRecord(picked)
    records.value = lotteryStore.getAllRecords()
    triggerSelectedEffect()
}

function clearAll() {
    ElMessageBox.confirm('确定清空所有奖品吗？此操作不可撤销', '清空确认', {
        type: 'warning'
    }).then(() => {
        lotteryStore.clearPrizes()
        refreshPrizes()
        ElMessage.success('已清空')
    }).catch(() => {})
}

function clearRecords() {
    ElMessageBox.confirm('确定清空抽奖历史吗？', '清空确认', {
        type: 'warning'
    }).then(() => {
        lotteryStore.clearRecords()
        records.value = lotteryStore.getAllRecords()
        ElMessage.success('已清空')
    }).catch(() => {})
}

const poolManageDialogVisible = ref(false)
const poolForm = reactive({
    id: '',
    name: '',
})
const poolEditMode = ref<'add' | 'edit'>('add')

function openAddPoolDialog() {
    poolEditMode.value = 'add'
    poolForm.id = ''
    poolForm.name = ''
    poolManageDialogVisible.value = true
}

function openEditPoolDialog(pool: PrizePool) {
    poolEditMode.value = 'edit'
    poolForm.id = pool.id
    poolForm.name = pool.name
    poolManageDialogVisible.value = true
}

function savePool() {
    if (!poolForm.name.trim()) {
        ElMessage.warning('请输入奖池名称')
        return
    }
    if (poolEditMode.value === 'add') {
        const newPool = lotteryStore.createPool(poolForm.name.trim())
        lotteryStore.setCurrentPool(newPool.id)
        currentPoolId.value = newPool.id
        pools.value = lotteryStore.getAllPools()
        refreshPrizes()
        ElMessage.success('已创建奖池')
    } else {
        lotteryStore.updatePool(poolForm.id, { name: poolForm.name.trim() })
        pools.value = lotteryStore.getAllPools()
        ElMessage.success('已更新奖池')
    }
    poolManageDialogVisible.value = false
}

function deletePool(pool: PrizePool) {
    if (lotteryStore.getAllPools().length <= 1) {
        ElMessage.warning('至少需要保留一个奖池')
        return
    }
    ElMessageBox.confirm(`确定删除奖池「${pool.name}」吗？此操作将删除该奖池下的所有奖品和记录，且不可撤销。`, '删除确认', {
        type: 'warning'
    }).then(() => {
        lotteryStore.deletePool(pool.id)
        pools.value = lotteryStore.getAllPools()
        currentPoolId.value = lotteryStore.currentPool?.id || null
        refreshPrizes()
        ElMessage.success('已删除')
    }).catch(() => {})
}

function handlePoolChange(poolId: string | null) {
    if (!poolId) return
    lotteryStore.setCurrentPool(poolId)
    currentPoolId.value = poolId
    refreshPrizes()
}

watch(() => lotteryStore.currentPool?.id, (newId) => {
    if (newId !== currentPoolId.value) {
        currentPoolId.value = newId || null
    }
    refreshPrizes()
})

onBeforeUnmount(() => {
    if (rollingTimer !== undefined) window.clearInterval(rollingTimer)
    if (selectedTimer !== undefined) window.clearTimeout(selectedTimer)
})
</script>

<template>
    <div class="lottery-page">
        <div class="layout">
            <aside class="side-panel">
                <div class="panel-header">
                    <div class="panel-title">
                        <i-ep-trophy class="panel-icon" />
                        抽奖器
                    </div>
                    <div class="pool-section">
                        <div class="pool-selector-group">
                            <el-select
                                v-model="currentPoolId"
                                @change="handlePoolChange"
                                size="small"
                                class="pool-selector"
                                placeholder="选择奖池"
                            >
                                <el-option
                                    v-for="pool in pools"
                                    :key="pool.id"
                                    :label="pool.name"
                                    :value="pool.id"
                                />
                                <template #empty>
                                    <div class="pool-selector-empty">
                                        <el-button text type="primary" size="small" @click.stop="openAddPoolDialog">
                                            <i-ep-plus /> 新建奖池
                                        </el-button>
                                    </div>
                                </template>
                            </el-select>
                            <el-button
                                v-if="lotteryStore.currentPool"
                                text
                                type="primary"
                                size="small"
                                @click="openEditPoolDialog(lotteryStore.currentPool)"
                                class="pool-action-btn"
                                title="编辑奖池"
                            >
                                <i-ep-edit />
                            </el-button>
                            <el-button
                                text
                                type="primary"
                                size="small"
                                @click="openAddPoolDialog"
                                class="pool-action-btn"
                                title="新建奖池"
                            >
                                <i-ep-folder-add />
                            </el-button>
                        </div>
                    </div>
                    <div class="prize-actions">
                        <el-button size="small" type="primary" @click="openAddDialog">
                            <i-ep-plus /> 添加奖品
                        </el-button>
                        <el-button size="small" type="success" plain @click="openImportDialog">
                            <i-ep-upload-filled /> 导入
                        </el-button>
                        <el-button size="small" type="danger" plain @click="clearAll" :disabled="prizes.length===0">
                            <i-ep-delete /> 清空
                        </el-button>
                    </div>
                </div>

                <div class="panel-body">
                    <div v-if="prizes.length > 0" class="prize-list">
                        <div
                            v-for="p in prizes"
                            :key="p.id"
                            class="prize-item"
                            :class="{ disabled: !p.enabled }"
                        >
                            <div class="pi-icon">
                                <i-ep-star-filled />
                                <el-button
                                    class="pi-edit-btn"
                                    text
                                    type="primary"
                                    @click="openEditDialog(p)"
                                >
                                    <i-ep-edit />
                                </el-button>
                            </div>
                            <div class="pi-main">
                                <div class="pi-header">
                                    <span class="pi-name" :title="p.name">{{ p.name }}</span>
                                </div>
                                <div class="pi-tags">
                                    <span v-if="p.source==='shop'" class="pi-tag origin">商城商品</span>
                                    <span class="pi-tag weight">权重 {{ p.weight }}</span>
                                </div>
                            </div>
                            <div class="pi-actions">
                            </div>
                            <div class="pi-switch">
                                <el-switch size="small" :model-value="p.enabled" @change="toggleEnabled(p)" />
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-prize side-empty">
                        <i-ep-goods-filled class="empty-icon" />
                        <div class="empty-title">暂无奖品</div>
                        <div class="empty-sub">点击上方按钮添加或导入</div>
                    </div>
                </div>
            </aside>

            <main class="display-panel">
                <div class="display-card" :class="{ selected: isSelected }">
                    <div class="display-name" :class="{ placeholder: !currentName, selected: isSelected }">
                        {{ currentName || '准备就绪' }}
                    </div>
                    <transition name="celebrate">
                        <div v-if="isSelected" class="selected-overlay">
                            <div class="celebrate-icon">🎉</div>
                        </div>
                    </transition>
                </div>

                <div class="control-panel">
                    <el-button
                        size="large"
                        type="primary"
                        class="control-btn"
                        @click="toggleRolling"
                        :disabled="enabledPrizes.length===0"
                    >
                        <i-ep-video-play v-if="!isRolling" />
                        <i-ep-video-pause v-else />
                        {{ isRolling ? '停止抽奖' : '开始抽奖' }}
                    </el-button>
                    <el-button size="large" class="control-btn" @click="drawOnce" :disabled="isRolling">
                        <i-ep-magic-stick />
                        抽取 1 次
                    </el-button>
                    <el-button size="large" class="control-btn" type="danger" plain :disabled="records.length===0" @click="clearRecords">
                        <i-ep-delete /> 清空历史
                    </el-button>
                </div>

                <div class="history-card">
                    <div class="history-header">
                        <div class="history-title">
                            <i-ep-document class="history-icon" />
                            抽奖历史
                        </div>
                        <el-tag type="info" effect="light">共 {{ records.length }} 条</el-tag>
                    </div>
                    <div v-if="records.length > 0" class="history-list">
                        <el-scrollbar height="100%">
                            <div class="history-items">
                                <div v-for="r in records" :key="r.id" class="history-item">
                                    <span class="history-dot">🎯</span>
                                    <span class="history-name">{{ r.prizeName }}</span>
                                    <span class="history-time">{{ new Date(r.drawnAt).toLocaleTimeString() }}</span>
                                </div>
                            </div>
                        </el-scrollbar>
                    </div>
                    <div v-else class="history-empty">
                        暂无抽奖记录
                    </div>
                </div>
            </main>
        </div>

        <el-dialog v-model="addDialogVisible" :title="editMode==='add' ? '添加奖品' : '编辑奖品'" width="520px">
            <el-form :model="prizeForm" label-position="top" class="prize-form">
                <el-form-item label="奖品名称" required>
                    <el-input v-model="prizeForm.name" placeholder="请输入奖品名称" />
                </el-form-item>
                <el-form-item label="权重（越大概率越高）" required>
                    <el-input-number v-model="prizeForm.weight" :min="1" :step="1" style="width: 100%;" />
                </el-form-item>
                <el-form-item label="是否启用">
                    <el-switch v-model="prizeForm.enabled" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="addDialogVisible=false">取消</el-button>
                    <el-button v-if="editMode==='edit'" type="danger" plain @click="handleDeleteCurrentPrize">
                        删除
                    </el-button>
                    <el-button type="primary" @click="savePrize">保存</el-button>
                </div>
            </template>
        </el-dialog>

        <el-dialog v-model="importDialogVisible" title="从商品导入奖品" width="760px">
            <div class="import-toolbar">
                <el-radio-group v-model="importWeightStrategy" size="small" class="import-radio">
                    <el-radio-button label="fixed">权重=1</el-radio-button>
                    <el-radio-button label="stock">权重=库存</el-radio-button>
                </el-radio-group>
                <div class="import-actions">
                    <el-button type="primary" :disabled="importSelection.length===0" @click="confirmImport(false)">
                        <i-ep-upload-filled /> 追加导入
                    </el-button>
                    <el-button type="warning" plain :disabled="importSelection.length===0" @click="confirmImport(true)">
                        覆盖现有
                    </el-button>
                </div>
            </div>
            <el-table
                :data="shopItems"
                border
                height="360px"
                @selection-change="(rows:any[])=>{importSelection = rows.map(r=>r.id)}"
            >
                <el-table-column type="selection" width="60" />
                <el-table-column label="商品" prop="name" min-width="160" />
                <el-table-column label="库存" prop="stock" width="100" align="center" />
                <el-table-column label="积分" prop="points" width="100" align="center" />
                <el-table-column label="描述" prop="description" min-width="200" show-overflow-tooltip />
            </el-table>
        </el-dialog>

        <el-dialog v-model="poolManageDialogVisible" :title="poolEditMode==='add' ? '新建奖池' : '编辑奖池'" width="480px">
            <el-form :model="poolForm" label-position="top" class="pool-form">
                <el-form-item label="奖池名称" required>
                    <el-input v-model="poolForm.name" placeholder="请输入奖池名称" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="poolManageDialogVisible=false">取消</el-button>
                    <el-button v-if="poolEditMode==='edit'" type="danger" plain @click="() => {
                        const pool = pools.find(p => p.id === poolForm.id)
                        if (pool) {
                            deletePool(pool)
                            poolManageDialogVisible = false
                        }
                    }">
                        删除
                    </el-button>
                    <el-button type="primary" @click="savePool">保存</el-button>
                </div>
            </template>
        </el-dialog>
        
    </div>
</template>

<style scoped>
.lottery-page {
    width: 100%;
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
}

.layout {
    width: 100%;
    height: 100%;
    /* max-width: 1200px; */
    margin: 0 auto;
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 20px;
    min-height: 0;
}

.side-panel {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    border: 1px solid #edf1f7;
    padding: 18px;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.panel-header {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
}

.panel-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 20px;
    font-weight: 700;
    color: #1f2937;
}

.panel-icon {
    font-size: 22px;
    color: #f59e0b;
}

.pool-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.pool-selector-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #f8f9fa;
    border-radius: 10px;
    border: 1px solid #e5e7eb;
}

.pool-selector {
    flex: 1;
    min-width: 0;
}

.pool-action-btn {
    flex-shrink: 0;
    padding: 8px 12px;
    font-size: 16px;
}

.pool-action-btn :deep(.el-icon) {
    font-size: 16px;
}

.pool-selector-empty {
    padding: 8px;
    text-align: center;
}

.prize-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.panel-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding-right: 4px;
}

.prize-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.prize-item {
    display: flex;
    align-items: stretch;
    gap: 12px;
    padding: 16px 18px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid rgba(148, 163, 184, 0.18);
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    transition: transform .15s ease, box-shadow .2s ease;
    position: relative;
}

.prize-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 26px rgba(59, 130, 246, 0.18);
}

.prize-item.disabled {
    opacity: 0.55;
}

.pi-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 6px 16px rgba(245, 158, 11, 0.32);
    position: relative;
    overflow: hidden;
}

.pi-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
}

.pi-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
}

.pi-name {
    font-weight: 700;
    font-size: 16px;
    color: #1f2937;
    flex: 1;
    min-width: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.pi-tags {
    display: flex;
    gap: 8px;
    flex-wrap: nowrap;
}

.pi-tag {
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
}

.pi-tag.weight {
    background: #fff7ed;
    color: #c2410c;
}

.pi-tag.origin {
    background: #eef2ff;
    color: #4338ca;
}

.pi-switch {
    display: flex;
    align-items: center;
}

.pi-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

.pi-edit-btn {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.12);
    color: #2563eb;
    backdrop-filter: blur(8px);
    border: none;
    border-radius: inherit;
    opacity: 0;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    transition: opacity .2s ease;
    pointer-events: none;
}

.pi-icon:hover .pi-edit-btn {
    opacity: 1;
    pointer-events: auto;
    background: rgba(255, 255, 255, 0.11);
}


.display-panel {
    background: #f8f9ff;
    border-radius: 18px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
    min-height: 0;
}

.empty-prize,
.empty-records {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 6px;
}

.empty-sub {
    font-size: 13px;
    color: #999;
}

.display-card {
    width: 100%;
    height: 300px;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06), inset 0 0 0 1px #eee;
    padding: 36px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.5s ease;
}

.display-name {
    font-size: 42px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #111111;
    min-height: 1.2em;
    transition: transform .15s ease;
}

.display-name.placeholder {
    color: #c5c5c5;
}

.selected-overlay {
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
}

.celebrate-icon {
    font-size: 80px;
    animation: celebrate-spin 1s ease-in-out infinite;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

@keyframes celebrate-spin {
    0% { transform: rotate(0deg) scale(1); }
    25% { transform: rotate(-15deg) scale(1.2); }
    50% { transform: rotate(15deg) scale(1); }
    75% { transform: rotate(-10deg) scale(1.2); }
    100% { transform: rotate(0deg) scale(1); }
}

.display-card.selected {
    animation: pulse-gold 1s ease-in-out infinite;
}

@keyframes pulse-gold {
    0%, 100% {
        background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
        box-shadow: 0 8px 32px rgba(255, 215, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.3);
        transform: scale(1);
    }
    50% {
        background: linear-gradient(135deg, #ffed4e 0%, #ffd700 50%, #ffed4e 100%);
        box-shadow: 0 12px 40px rgba(255, 237, 78, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
        transform: scale(1.02);
    }
}

.display-name.selected {
    color: #8b4513;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    animation: name-bounce 0.8s ease-in-out infinite;
}

.control-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
}

.control-btn {
    min-width: 160px;
    height: 54px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 14px;
}

.history-card {
    background: #ffffff;
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    border: 1px solid #e5e7eb;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.history-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: #1f2937;
}

.history-icon {
    font-size: 18px;
    color: #6366f1;
}

.history-list {
    flex: 1;
    min-height: 0;
}

.history-items {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 6px;
}

.history-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
}

.history-dot {
    font-size: 16px;
}

.history-name {
    flex: 1;
}

.history-time {
    font-size: 12px;
    color: #6b7280;
}

.history-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #9ca3af;
    background: #f9fafb;
    border-radius: 10px;
    border: 1px dashed #e5e7eb;
    min-height: 120px;
}

.empty-prize,
.empty-records {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #888;
}

.side-empty {
    padding: 30px 16px;
    border-radius: 12px;
    background: #f9fafb;
    border: 1px dashed #d1d5db;
    color: #6b7280;
    gap: 6px;
    text-align: center;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 6px;
}

.empty-sub {
    font-size: 13px;
    color: #999;
}

@keyframes name-bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

@media (max-width: 960px) {
    .layout {
        grid-template-columns: 1fr;
    }
    .side-panel {
        order: 2;
        max-height: 320px;
    }
    .display-panel {
        order: 1;
    }
}

@media (max-width: 600px) {
    .lottery-page {
        padding: 12px;
    }
    .panel-title {
        font-size: 18px;
    }
    .panel-header {
        gap: 12px;
        padding-bottom: 12px;
    }
    .pool-selector-group {
        flex-wrap: wrap;
        padding: 8px 10px;
    }
    .pool-selector {
        width: 100%;
        min-width: 0;
    }
    .pool-action-btn {
        flex: 1;
        min-width: 0;
    }
    .prize-actions {
        flex-direction: column;
    }
    .prize-actions .el-button {
        width: 100%;
    }
    .display-panel {
        padding: 18px;
    }
    .display-card {
        padding: 28px 16px;
    }
    .display-name {
        font-size: 42px;
    }
    .control-btn {
        min-width: 140px;
        height: 50px;
    }
    .history-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
    }
}

.import-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
}

.import-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-end;
}

.import-actions :deep(.el-button) {
    min-width: 120px;
}

@media (max-width: 600px) {
    .import-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
    .import-actions {
        width: 100%;
        justify-content: space-between;
    }
    .import-actions :deep(.el-button) {
        flex: 1;
        min-width: 0;
    }
}
</style>
*** End Patch】}럼 4 (assistant to=functions.apply_patch.Code) invalid json: Expecting value: line 1 column 1 (char 0) ***!


