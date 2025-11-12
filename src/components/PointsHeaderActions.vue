<script setup lang="ts">
import { ref } from 'vue'
import ManagePointsItemsButton from './ManagePointsItemsButton.vue'
import ImportPointsItemsButton from './ImportPointsItemsButton.vue'
import PointsHistoryButton from './PointsHistoryButton.vue'
import ImportPointsButton from './ImportPointsButton.vue'
import ExportPointsButton from './ExportPointsButton.vue'

defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

const mobileMenuVisible = ref(false)
</script>

<template>
    <div class="points-header-actions">
        <div class="desktop-actions">
            <ManagePointsItemsButton />
            <ImportPointsItemsButton />
            <PointsHistoryButton :active-class-id="activeClassId" />
            <ImportPointsButton :active-class-id="activeClassId" :active-class-name="activeClassName" />
            <ExportPointsButton :active-class-id="activeClassId" :active-class-name="activeClassName" />
        </div>

        <el-button type="primary" class="mobile-menu-btn" @click="mobileMenuVisible = true">
            <i-ep-menu /> 菜单
        </el-button>

        <el-dialog v-model="mobileMenuVisible" title="功能菜单" width="400px" :close-on-click-modal="true">
            <div class="mobile-menu-list">
                <ManagePointsItemsButton @click="mobileMenuVisible = false" />
                <ImportPointsItemsButton />
                <PointsHistoryButton :active-class-id="activeClassId" @click="mobileMenuVisible = false" />
                <ImportPointsButton :active-class-id="activeClassId" :active-class-name="activeClassName" />
                <ExportPointsButton :active-class-id="activeClassId" :active-class-name="activeClassName" />
            </div>
        </el-dialog>
    </div>
</template>

<style scoped>
.points-header-actions {
    display: flex;
    align-items: center;
}

.desktop-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.mobile-menu-btn {
    display: none;
}

.mobile-menu-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.mobile-menu-list :deep(.el-button) {
    width: 100%;
    height: 48px;
    font-size: 16px;
    justify-content: center;
    margin-left: 0 !important;
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}

@media (max-width: 1580px) {
    .desktop-actions {
        display: none;
    }

    .mobile-menu-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }
}

@media (max-width: 768px) {
    .mobile-menu-btn {
        font-size: 14px;
    }
}
</style>

