<script setup lang="ts">
import { ref } from 'vue'
import PointsManageItemsButton from '@/components/points/PointsManageItemsButton.vue'
import PointsImportItemsButton from '@/components/points/PointsImportItemsButton.vue'
import PointsHistoryButton from '@/components/points/PointsHistoryButton.vue'
import ImportPointsButton from '@/components/points/ImportPointsButton.vue'
import ExportPointsButton from '@/components/points/ExportPointsButton.vue'

defineOptions({ name: 'PointsHeaderActionsPanel' })

defineProps<{
    activeClassId: string | null
    activeClassName: string
}>()

const emit = defineEmits<{
    (e: 'changed'): void
}>()

const mobileMenuVisible = ref(false)
</script>

<template>
    <div class="points-header-actions">
        <div class="desktop-actions">
            <PointsManageItemsButton @changed="emit('changed')" />
            <PointsImportItemsButton @changed="emit('changed')" />
            <PointsHistoryButton :active-class-id="activeClassId" />
            <ImportPointsButton :active-class-id="activeClassId" :active-class-name="activeClassName" />
            <ExportPointsButton :active-class-id="activeClassId" :active-class-name="activeClassName" />
        </div>

        <el-button type="primary" class="mobile-menu-btn" @click="mobileMenuVisible = true">
            <i-ep-menu /> 菜单
        </el-button>

        <el-dialog v-model="mobileMenuVisible" title="功能菜单" width="400px" :close-on-click-modal="true">
            <div class="mobile-menu-list">
                <PointsManageItemsButton
                    @changed="emit('changed')"
                    @click="mobileMenuVisible = false"
                />
                <PointsImportItemsButton
                    @changed="emit('changed')"
                    @click="mobileMenuVisible = false"
                />
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


