<script setup lang="ts">
const logoUrl = `${import.meta.env.BASE_URL}icon.svg?v=brand-20261108`
</script>

<template>
    <img class="brand-logo-mark" :src="logoUrl" alt="教师助手" width="40" height="40" />
</template>

<style scoped>
.brand-logo-mark {
    display: block;
    width: var(--brand-logo-size, 40px);
    height: var(--brand-logo-size, 40px);
    flex: 0 0 auto;
    object-fit: contain;
}
</style>
