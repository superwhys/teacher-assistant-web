<script setup lang="ts">
defineOptions({ name: 'ShopHeaderRow' })
</script>

<template>
    <div class="header-row">
        <div class="title">
            <i-ep-shop class="title-icon" />
            积分商城
        </div>
    </div>
</template>

<style scoped>
.header-row {
    margin-bottom: 20px;
}

.title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    font-weight: 700;
}

.title-icon {
    font-size: 28px;
    color: #2d5cf6;
}

@media (max-width: 768px) {
    .header-row {
        margin-bottom: 16px;
    }

    .title {
        font-size: 18px;
        gap: 6px;
    }

    .title-icon {
        font-size: 22px;
    }
}

@media (max-width: 480px) {
    .header-row {
        margin-bottom: 12px;
    }

    .title {
        font-size: 16px;
        gap: 4px;
    }

    .title-icon {
        font-size: 20px;
    }
}

@media (max-width: 360px) {
    .title {
        font-size: 15px;
    }
}
</style>

