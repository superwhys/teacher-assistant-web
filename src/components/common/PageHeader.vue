<script setup lang="ts">
defineProps<{
    eyebrow?: string
    title: string
    description: string
}>()
</script>

<template>
    <header class="page-header">
        <div class="page-header__copy">
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
    align-items: center;
    justify-content: space-between;
    gap: 20px;
}

.page-header__copy {
    min-width: 0;
}

h1 {
    margin: 0;
    color: var(--ta-text);
    font-size: 30px;
    font-weight: 650;
    letter-spacing: -0.8px;
    line-height: 1.25;
}

p {
    margin: 8px 0 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.6;
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
