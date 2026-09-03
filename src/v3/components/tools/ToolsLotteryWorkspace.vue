<template>
    <section class="tools-lottery-workspace" v-loading="isLoading">
        <div class="tools-lottery-workspace__toolbar">
            <div class="lottery-toolbar__pool">
                <span class="lottery-toolbar__eyebrow">奖池</span>
                <el-select v-model="currentPoolId" placeholder="选择奖池" size="large" class="lottery-toolbar__select">
                    <el-option v-for="pool in pools" :key="pool.id" :label="pool.name" :value="pool.id" />
                    <template #empty>
                        <div class="lottery-toolbar__empty">
                            <button type="button" class="text-button" @click="openAddPoolDialog">新建奖池</button>
                        </div>
                    </template>
                </el-select>
                <button type="button" class="icon-button" title="新建奖池" @click="openAddPoolDialog">
                    <i-ep-plus />
                </button>
                <button type="button" class="icon-button" title="编辑奖池" :disabled="currentPool === null" @click="openCurrentPoolDialog">
                    <i-ep-edit />
                </button>
            </div>

            <div class="lottery-toolbar__actions">
                <button type="button" class="ghost-button" @click="openAddDialog">
                    添加奖品
                </button>
                <button type="button" class="ghost-button" @click="openImportDialog">
                    商城导入
                </button>
                <button type="button" class="ghost-button danger" :disabled="prizes.length === 0"
                    @click="openClearAllDialog">
                    清空奖池
                </button>
            </div>
        </div>

        <div class="tools-lottery-workspace__stage">
            <ToolsLotteryDisplayPanel :current-name="currentName" :current-pool-name="currentPool?.name ?? ''"
                :enabled-prize-count="enabledPrizes.length" :is-rolling="isRolling" :is-selected="isSelected"
                @toggle-rolling="toggleRolling" @draw-once="drawOnce" />

            <div class="tools-lottery-workspace__side">
                <ToolsLotteryPoolPanel :prizes="prizes" @edit-prize="openEditDialog" @toggle-prize="toggleEnabled" />
                <ToolsLotteryHistoryPanel :records="records" @clear-records="openClearRecordsDialog" />
            </div>
        </div>

        <ToolsLotteryPrizeDialog
            v-model="prizeDialogVisible"
            :form="prizeForm"
            :mode="prizeEditMode"
            @delete="handleDeleteCurrentPrize"
            @save="savePrize"
        />

        <ToolsLotteryPoolDialog
            v-model="poolDialogVisible"
            :form="poolForm"
            :mode="poolEditMode"
            @delete="deletePool"
            @save="savePool"
        />

        <ToolsLotteryImportDialog
            v-model="importDialogVisible"
            v-model:weight-strategy="importWeightStrategy"
            :items="shopItems"
            :loading="shopItemsLoading"
            :selection-count="importSelection.length"
            @confirm="confirmImport"
            @selection-change="handleImportSelectionChange"
        />

        <StudentsConfirmDialog
            v-model="clearAllDialogVisible"
            title="清空奖池"
            eyebrow="风险操作"
            description="清空后当前奖池中的全部奖品会被移除，该操作不可撤销。"
            message="确定清空当前奖池中的所有奖品吗？"
            confirm-text="确认清空"
            @confirm="clearAll"
        />

        <StudentsConfirmDialog
            v-model="clearRecordsDialogVisible"
            title="清空记录"
            eyebrow="风险操作"
            description="清空后当前奖池的抽奖历史将被立即移除，但不会影响奖池中的奖品。"
            message="确定清空当前奖池的抽奖历史吗？"
            confirm-text="确认清空"
            @confirm="clearRecords"
        />
    </section>
</template>

<script setup lang="ts">
import { mallApi } from "@/api/mall";
import { lotteryManager, type UiLotteryPool, type UiLotteryPrize } from "@/managers/lottery";
import { useLotteryHistoryStore } from "@/stores/lotteryHistoryStore";
import type { DrawRecord } from "@/types/lottery";
import { isApiRequestError } from "@/types/api";
import type { ShopItem } from "@/types/shopItem";
import StudentsConfirmDialog from "@/v3/components/students/StudentsConfirmDialog.vue";
import ToolsLotteryDisplayPanel from "@/v3/components/tools/ToolsLotteryDisplayPanel.vue";
import ToolsLotteryHistoryPanel from "@/v3/components/tools/ToolsLotteryHistoryPanel.vue";
import ToolsLotteryImportDialog from "@/v3/components/tools/ToolsLotteryImportDialog.vue";
import ToolsLotteryPoolDialog from "@/v3/components/tools/ToolsLotteryPoolDialog.vue";
import ToolsLotteryPoolPanel from "@/v3/components/tools/ToolsLotteryPoolPanel.vue";
import ToolsLotteryPrizeDialog from "@/v3/components/tools/ToolsLotteryPrizeDialog.vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from "vue";

defineOptions({ name: "ToolsLotteryWorkspace" })

/** 定义导入权重策略类型。 */
type ImportWeightStrategy = "fixed" | "stock"

/** 定义奖品弹窗编辑模式。 */
type PrizeEditMode = "add" | "edit"

/** 定义奖池弹窗编辑模式。 */
type PoolEditMode = "add" | "edit"

/** 定义奖品表单结构。 */
interface PrizeFormState {
    enabled: boolean
    id: string
    name: string
    weight: number
}

/** 定义奖池表单结构。 */
interface PoolFormState {
    id: string
    name: string
}

const historyStore = useLotteryHistoryStore()

const isLoading = ref(false)
const prizes = ref<UiLotteryPrize[]>([])
const records = ref<DrawRecord[]>([])
const pools = ref<UiLotteryPool[]>([])
const currentPoolId = ref<string | null>(null)

const prizeDialogVisible = ref(false)
const prizeEditMode = ref<PrizeEditMode>("add")
const prizeForm = reactive<PrizeFormState>({
    id: "",
    name: "",
    weight: 1,
    enabled: true
})

const poolDialogVisible = ref(false)
const poolEditMode = ref<PoolEditMode>("add")
const poolForm = reactive<PoolFormState>({
    id: "",
    name: ""
})

const importDialogVisible = ref(false)
const importSelection = ref<string[]>([])
const importWeightStrategy = ref<ImportWeightStrategy>("fixed")
const shopItems = ref<ShopItem[]>([])
const shopItemsLoading = ref(false)
const clearAllDialogVisible = ref(false)
const clearRecordsDialogVisible = ref(false)

const isRolling = ref(false)
const currentName = ref("")
const isSelected = ref(false)

let rollingTimer: number | undefined
let selectedTimer: number | undefined

/** 返回当前选中的奖池。 */
const currentPool = computed<UiLotteryPool | null>(() => {
    return pools.value.find((item) => item.id === currentPoolId.value) ?? null
})

/** 返回当前启用中的奖品列表。 */
const enabledPrizes = computed<UiLotteryPrize[]>(() => {
    return prizes.value.filter((item) => item.enabled && item.weight > 0)
})

/** 重新加载奖池列表并确保当前奖池有效。 */
async function reloadPools(ensureDefault = false): Promise<boolean> {
    const previousPoolId = currentPoolId.value
    const list = await lotteryManager.listPools()

    if (ensureDefault && list.length === 0) {
        const createdPool = await lotteryManager.createPool("默认奖池")
        pools.value = [createdPool]
        currentPoolId.value = createdPool.id
        return previousPoolId !== createdPool.id
    }

    pools.value = list
    if (!currentPoolId.value || !pools.value.some((item) => item.id === currentPoolId.value)) {
        currentPoolId.value = pools.value[0]?.id ?? null
    }

    return previousPoolId !== currentPoolId.value
}

/** 刷新当前奖池的奖品列表和历史记录。 */
async function refreshCurrentPoolState(): Promise<void> {
    if (!currentPoolId.value) {
        prizes.value = []
        records.value = []
        return
    }

    const currentPoolData = await lotteryManager.getPool(currentPoolId.value)
    prizes.value = currentPoolData?.prizes ?? []
    records.value = historyStore.getRecords(currentPoolId.value)
}

/** 加载商城奖品列表用于导入。 */
async function loadShopItems(): Promise<void> {
    const response = await mallApi.listPrizes()
    const items = response.data?.items ?? []
    shopItems.value = items
        .map((item) => {
            const itemId = String(item?.id ?? "").trim()
            const itemName = String(item?.name ?? "").trim()
            if (!itemId || !itemName) {
                return null
            }

            const normalizedItem: ShopItem = {
                id: itemId,
                name: itemName,
                points: Number(item?.points ?? 0) || 0,
                stock: Number(item?.stock ?? 0) || 0,
                description: item?.description,
                icon: item?.icon,
                createdAt: Date.now(),
            }

            return normalizedItem
        })
        .filter((item): item is ShopItem => item !== null)
}

/** 打开新增奖品弹窗。 */
function openAddDialog(): void {
    prizeEditMode.value = "add"
    prizeForm.id = ""
    prizeForm.name = ""
    prizeForm.weight = 1
    prizeForm.enabled = true
    prizeDialogVisible.value = true
}

/** 打开编辑奖品弹窗。 */
function openEditDialog(item: UiLotteryPrize): void {
    prizeEditMode.value = "edit"
    prizeForm.id = item.name
    prizeForm.name = item.name
    prizeForm.weight = item.weight
    prizeForm.enabled = item.enabled
    prizeDialogVisible.value = true
}

/** 删除当前编辑中的奖品。 */
function handleDeleteCurrentPrize(): void {
    if (prizeEditMode.value !== "edit" || !prizeForm.id) {
        return
    }

    const currentPrize = prizes.value.find((item) => item.name === prizeForm.id)
    if (!currentPrize) {
        return
    }

    void deletePrize(currentPrize)
    prizeDialogVisible.value = false
}

/** 保存奖品表单。 */
async function savePrize(): Promise<void> {
    if (!prizeForm.name.trim()) {
        ElMessage.warning("请输入奖品名称")
        return
    }

    if (prizeForm.weight <= 0) {
        ElMessage.warning("权重必须大于 0")
        return
    }

    if (!currentPoolId.value) {
        ElMessage.warning("请先创建或选择一个奖池")
        return
    }

    isLoading.value = true
    try {
        const prizeName = prizeForm.name.trim()
        const prizeWeight = prizeForm.weight
        const prizeEnabled = prizeForm.enabled

        if (prizeEditMode.value === "add") {
            await lotteryManager.addPrize(currentPoolId.value, {
                name: prizeName,
                weight: prizeWeight,
                enabled: prizeEnabled,
                source: "custom"
            })
            ElMessage.success("已添加奖品")
        } else {
            const originalName = String(prizeForm.id ?? "").trim()
            if (originalName && originalName !== prizeName) {
                await lotteryManager.renamePrize(currentPoolId.value, originalName, prizeName, {
                    weight: prizeWeight,
                    enabled: prizeEnabled
                })
            } else {
                await lotteryManager.updatePrize(currentPoolId.value, prizeName, {
                    weight: prizeWeight,
                    enabled: prizeEnabled
                })
            }
            ElMessage.success("已更新奖品")
        }

        prizeDialogVisible.value = false
        await refreshCurrentPoolState()
    } catch (error) {
        if (!isApiRequestError(error)) {
            console.error(error)
            ElMessage.error("保存奖品失败")
        }
    } finally {
        isLoading.value = false
    }
}

/** 删除指定奖品。 */
async function deletePrize(item: UiLotteryPrize): Promise<void> {
    try {
        await ElMessageBox.confirm(`确定删除奖品「${item.name}」吗？`, "删除确认", {
            type: "warning"
        })
    } catch {
        return
    }

    if (!currentPoolId.value) {
        return
    }

    isLoading.value = true
    try {
        await lotteryManager.removePrize(currentPoolId.value, item.name)
        await refreshCurrentPoolState()
        ElMessage.success("已删除")
    } catch (error) {
        if (!isApiRequestError(error)) {
            console.error(error)
            ElMessage.error("删除奖品失败")
        }
    } finally {
        isLoading.value = false
    }
}

/** 切换奖品启用状态。 */
function toggleEnabled(item: UiLotteryPrize): void {
    void (async () => {
        if (!currentPoolId.value) {
            return
        }

        isLoading.value = true
        try {
            await lotteryManager.updatePrize(currentPoolId.value, item.name, { enabled: !item.enabled })
            await refreshCurrentPoolState()
        } catch (error) {
            if (!isApiRequestError(error)) {
                console.error(error)
                ElMessage.error("更新奖品失败")
            }
        } finally {
            isLoading.value = false
        }
    })()
}

/** 打开新增奖池弹窗。 */
function openAddPoolDialog(): void {
    poolEditMode.value = "add"
    poolForm.id = ""
    poolForm.name = ""
    poolDialogVisible.value = true
}

/** 打开编辑奖池弹窗。 */
function openEditPoolDialog(pool: UiLotteryPool): void {
    poolEditMode.value = "edit"
    poolForm.id = pool.id
    poolForm.name = pool.name
    poolDialogVisible.value = true
}

/** 打开当前选中奖池的编辑弹窗。 */
function openCurrentPoolDialog(): void {
    if (!currentPool.value) {
        return
    }

    openEditPoolDialog(currentPool.value)
}

/** 保存奖池表单。 */
function savePool(): void {
    if (!poolForm.name.trim()) {
        ElMessage.warning("请输入奖池名称")
        return
    }

    void (async () => {
        isLoading.value = true
        try {
            if (poolEditMode.value === "add") {
                const createdPool = await lotteryManager.createPool(poolForm.name.trim())
                await reloadPools()
                currentPoolId.value = createdPool.id
                await refreshCurrentPoolState()
                ElMessage.success("已创建奖池")
            } else {
                await lotteryManager.updatePool(poolForm.id, poolForm.name.trim())
                await reloadPools()
                ElMessage.success("已更新奖池")
            }

            poolDialogVisible.value = false
        } catch (error) {
            if (!isApiRequestError(error)) {
                console.error(error)
                ElMessage.error("保存奖池失败")
            }
        } finally {
            isLoading.value = false
        }
    })()
}

/** 删除奖池时给出当前能力提示。 */
function deletePool(): void {
    ElMessage.warning("当前后端接口暂不支持删除奖池")
}

/** 打开商城奖品导入弹窗。 */
function openImportDialog(): void {
    importSelection.value = []
    importWeightStrategy.value = "fixed"
    importDialogVisible.value = true

    void (async () => {
        shopItemsLoading.value = true
        try {
            await loadShopItems()
        } catch (error) {
            if (!isApiRequestError(error)) {
                console.error(error)
                ElMessage.error("加载商城奖品失败")
            }
            shopItems.value = []
        } finally {
            shopItemsLoading.value = false
        }
    })()
}

/** 打开清空奖池确认弹窗。 */
function openClearAllDialog(): void {
    clearAllDialogVisible.value = true
}

/** 打开清空记录确认弹窗。 */
function openClearRecordsDialog(): void {
    clearRecordsDialogVisible.value = true
}

/** 处理导入弹窗的奖品选择变化。 */
function handleImportSelectionChange(rows: ShopItem[]): void {
    importSelection.value = rows.map((item) => item.id)
}

/** 将选中的商城奖品导入当前奖池。 */
function confirmImport(overwrite = false): void {
    if (importSelection.value.length === 0) {
        ElMessage.warning("请选择要导入的商品")
        return
    }

    if (!currentPoolId.value) {
        ElMessage.warning("请先创建或选择一个奖池")
        return
    }

    const selectedItems = shopItems.value.filter((item) => importSelection.value.includes(item.id))
    void (async () => {
        isLoading.value = true
        try {
            const importedCount = await lotteryManager.importFromShop(
                currentPoolId.value!,
                selectedItems,
                importWeightStrategy.value,
                overwrite
            )
            ElMessage.success(`导入成功：${importedCount} 个奖品`)
            importDialogVisible.value = false
            await refreshCurrentPoolState()
        } catch (error) {
            if (!isApiRequestError(error)) {
                console.error(error)
                ElMessage.error("导入奖品失败")
            }
        } finally {
            isLoading.value = false
        }
    })()
}

/** 根据权重返回一个抽中的奖品。 */
function weightedRandom(items: UiLotteryPrize[]): UiLotteryPrize | null {
    if (items.length === 0) {
        return null
    }

    const weights = items.map((item) => item.weight)
    const totalWeight = weights.reduce((sum, current) => sum + current, 0)
    if (totalWeight <= 0) {
        return null
    }

    let randomWeight = Math.random() * totalWeight
    for (let index = 0; index < items.length; index += 1) {
        randomWeight -= items[index]!.weight
        if (randomWeight < 0) {
            return items[index]!
        }
    }

    return items[items.length - 1] ?? null
}

/** 返回快速滚动展示时使用的候选奖品。 */
function pickRandomOne(): UiLotteryPrize | null {
    if (enabledPrizes.value.length === 0) {
        return null
    }

    const randomIndex = Math.floor(Math.random() * enabledPrizes.value.length)
    return enabledPrizes.value[randomIndex] ?? null
}

/** 触发抽中奖品后的高亮动画。 */
function triggerSelectedEffect(): void {
    isSelected.value = true
    if (selectedTimer !== undefined) {
        window.clearTimeout(selectedTimer)
    }

    selectedTimer = window.setTimeout(() => {
        isSelected.value = false
    }, 3000)
}

/** 开始抽奖滚动展示。 */
function startRolling(): void {
    if (enabledPrizes.value.length === 0) {
        ElMessage.warning("请先添加并启用至少一个奖品")
        return
    }

    if (isRolling.value) {
        return
    }

    isRolling.value = true
    rollingTimer = window.setInterval(() => {
        const randomPrize = pickRandomOne()
        currentName.value = randomPrize?.name ?? ""
    }, 60)
}

/** 停止滚动并生成最终抽奖结果。 */
function stopRolling(): void {
    if (!isRolling.value) {
        return
    }

    isRolling.value = false
    if (rollingTimer !== undefined) {
        window.clearInterval(rollingTimer)
        rollingTimer = undefined
    }

    const pickedPrize = weightedRandom(enabledPrizes.value)
    if (!pickedPrize) {
        ElMessage.warning("没有可抽取的奖品")
        return
    }

    currentName.value = pickedPrize.name
    if (currentPoolId.value) {
        historyStore.addRecord(currentPoolId.value, pickedPrize.name)
        records.value = historyStore.getRecords(currentPoolId.value)
    }
    triggerSelectedEffect()
}

/** 切换抽奖滚动状态。 */
function toggleRolling(): void {
    if (isRolling.value) {
        stopRolling()
        return
    }

    startRolling()
}

/** 直接抽取一次奖品。 */
function drawOnce(): void {
    if (isRolling.value) {
        return
    }

    const pickedPrize = weightedRandom(enabledPrizes.value)
    if (!pickedPrize) {
        ElMessage.warning("没有可抽取的奖品")
        return
    }

    currentName.value = pickedPrize.name
    if (currentPoolId.value) {
        historyStore.addRecord(currentPoolId.value, pickedPrize.name)
        records.value = historyStore.getRecords(currentPoolId.value)
    }
    triggerSelectedEffect()
}

/** 清空当前奖池中的全部奖品。 */
function clearAll(): void {
    void (async () => {
        clearAllDialogVisible.value = false
        if (!currentPoolId.value) {
            return
        }

        isLoading.value = true
        try {
            await lotteryManager.clearPool(currentPoolId.value)
            await refreshCurrentPoolState()
            ElMessage.success("已清空当前奖池")
        } catch (error) {
            if (!isApiRequestError(error)) {
                console.error(error)
                ElMessage.error("清空奖池失败")
            }
        } finally {
            isLoading.value = false
        }
    })()
}

/** 清空当前奖池的抽奖历史。 */
function clearRecords(): void {
    void (async () => {
        clearRecordsDialogVisible.value = false
        if (!currentPoolId.value) {
            return
        }

        historyStore.clearRecords(currentPoolId.value)
        records.value = historyStore.getRecords(currentPoolId.value)
        ElMessage.success("已清空抽奖历史")
    })()
}

/** 初始化新版抽奖器工作区。 */
async function initializeWorkspace(): Promise<void> {
    isLoading.value = true
    try {
        await historyStore.hydrate()
        const poolChanged = await reloadPools(true)
        if (!poolChanged) {
            await refreshCurrentPoolState()
        }
    } catch (error) {
        if (!isApiRequestError(error)) {
            console.error(error)
            ElMessage.error("加载抽奖器数据失败")
        }
    } finally {
        isLoading.value = false
    }
}

watch(() => currentPoolId.value, () => {
    void refreshCurrentPoolState()
})

onMounted(() => {
    void initializeWorkspace()
})

onBeforeUnmount(() => {
    if (rollingTimer !== undefined) {
        window.clearInterval(rollingTimer)
    }
    if (selectedTimer !== undefined) {
        window.clearTimeout(selectedTimer)
    }
})
</script>

<style scoped>
.tools-lottery-workspace {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 14px;
}

.tools-lottery-workspace__toolbar {
    min-width: 0;
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.76);
    box-shadow: var(--ta-shadow-1);
}

.lottery-toolbar__pool,
.lottery-toolbar__actions {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
}

.lottery-toolbar__pool {
    flex: 1 1 300px;
}

.lottery-toolbar__eyebrow {
    color: var(--ta-text-tertiary);
    font-size: 11px;
}

.lottery-toolbar__select {
    min-width: 150px;
    max-width: 300px;
    flex: 1;
}

.lottery-toolbar__empty {
    padding: 10px;
    text-align: center;
}

.icon-button,
.ghost-button,
.text-button {
    border: 0;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 12px;
    font-weight: 620;
    cursor: pointer;
}

.icon-button {
    width: 36px;
    height: 36px;
    padding: 0;
    display: grid;
    place-items: center;
    border-radius: 10px;
}

.ghost-button,
.text-button {
    min-height: 38px;
    padding: 0 13px;
    border-radius: 10px;
}

.text-button {
    color: var(--ta-blue);
    background: transparent;
    box-shadow: none;
}

.ghost-button.danger {
    color: var(--ta-red);
    background: var(--ta-red-soft);
    box-shadow: none;
}

.icon-button:disabled,
.ghost-button:disabled {
    opacity: 0.42;
}

.tools-lottery-workspace__stage {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(360px, 0.65fr);
    gap: 14px;
}

.tools-lottery-workspace__side {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) minmax(180px, 0.6fr);
    gap: 14px;
}

@media (min-width: 2300px) {
    .tools-lottery-workspace__stage {
        grid-template-columns: minmax(0, 1.85fr) 430px;
    }
}

@media (max-width: 1080px) {
    .tools-lottery-workspace__stage {
        grid-template-columns: 1fr;
    }

    .tools-lottery-workspace__side {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: none;
    }
}

@media (max-width: 660px) {
    .tools-lottery-workspace__toolbar {
        align-items: stretch;
        flex-direction: column;
    }

    .lottery-toolbar__pool,
    .lottery-toolbar__actions {
        flex: 0 0 auto;
    }

    .lottery-toolbar__select {
        max-width: none;
    }

    .lottery-toolbar__actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .lottery-toolbar__actions .ghost-button {
        min-width: 0;
        width: 100%;
        padding-inline: 7px;
        font-size: 11px;
    }

    .tools-lottery-workspace__side {
        grid-template-columns: 1fr;
    }
}
</style>
