<script setup lang="ts">
import { ref } from 'vue'
import PointsItemManageDialog from './PointsItemManageDialog.vue'

const manageVisible = ref(false)

function openManageDialog() {
    manageVisible.value = true
}
</script>

<template>
    <el-button type="primary" plain @click="openManageDialog">
        <i-ep-setting /> 管理分值项
    </el-button>

    <PointsItemManageDialog v-model="manageVisible" />
</template>

