<script setup lang="ts">
defineOptions({ name: 'ShopToolbar' })

const emit = defineEmits<{
    (e: 'add'): void
    (e: 'open-import'): void
    (e: 'download-template'): void
}>()
</script>

<template>
    <div class="shop-toolbar">
        <el-button type="primary" @click="emit('add')">
            <i-ep-plus /> 添加商品
        </el-button>
        <el-button type="success" plain @click="emit('open-import')">
            <i-ep-upload-filled /> 导入商品
        </el-button>
        <el-button type="info" plain @click="emit('download-template')">
            <i-ep-download /> 下载模板
        </el-button>
    </div>
</template>


