<script setup lang="ts">
import { ref } from 'vue'
import PointsRuleManageDialog from '@/components/points/PointsRuleManageDialog.vue'

defineOptions({ name: 'PointsManageItemsButton' })

const emit = defineEmits<{
    (e: 'changed'): void
}>()

const manageVisible = ref(false)

function openManageDialog() {
    manageVisible.value = true
}
</script>

<template>
    <el-button type="primary" plain @click="openManageDialog">
        <i-ep-setting /> 管理分值项
    </el-button>

    <PointsRuleManageDialog v-model="manageVisible" @changed="emit('changed')" />
</template>


