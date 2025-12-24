<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
    activeClassId: string | null
}>()

const router = useRouter()

function goToHistory() {
    router.push('/points/history')
}
</script>

<template>
    <el-button type="default" plain :disabled="!activeClassId" @click="goToHistory">
        <i-ep-document /> 积分记录
    </el-button>
</template>


