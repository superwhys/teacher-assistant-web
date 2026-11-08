<script setup lang="ts">
defineProps<{
    eyebrow: string
    title: string
    description: string
}>()
</script>

<template>
    <header class="page-header">
        <div class="page-header__copy">
            <span class="page-header__eyebrow">{{ eyebrow }}</span>
            <h1>{{ title }}</h1>
            <p>{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="page-header__actions">
            <slot name="actions" />
        </div>
    </header>
</template>

<style scoped>
.page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    padding-bottom: 8px;
}

.page-header__copy {
    min-width: 0;
}

.page-header__eyebrow {
    display: block;
    margin-bottom: 9px;
    color: var(--ta-blue);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.8px;
}

h1 {
    margin: 0;
    color: var(--ta-text);
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.8px;
    line-height: 1.4;
}

p {
    margin: 9px 0 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.8;
}

.page-header__actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 10px;
    padding-bottom: 2px;
}

.page-header__actions :deep(svg) {
    width: 16px;
    height: 16px;
}

@media (max-width: 900px) {
    .page-header {
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 16px;
    }

    .page-header__actions {
        flex-wrap: wrap;
    }
}

@media (max-width: 600px) {
    h1 {
        font-size: 25px;
    }
}
</style>
