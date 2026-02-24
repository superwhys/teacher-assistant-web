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

<style scoped>
.shop-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 20px;
    flex-shrink: 0;
}

@media (max-width: 768px) {
    .shop-toolbar {
        gap: 10px;
        margin-bottom: 16px;
    }

    .shop-toolbar :deep(.el-button) {
        flex: 1;
        min-width: 0;
    }
}

@media (max-width: 480px) {
    .shop-toolbar {
        gap: 8px;
        margin-bottom: 12px;
    }

    .shop-toolbar :deep(.el-button) {
        flex: 1;
        min-width: 0;
        font-size: 13px;
        padding: 8px 10px;
    }
}

@media (max-width: 360px) {
    .shop-toolbar {
        gap: 6px;
    }

    .shop-toolbar :deep(.el-button) {
        font-size: 12px;
        padding: 8px 8px;
    }

    .shop-toolbar :deep(.el-button span) {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>

