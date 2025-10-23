<script setup lang="ts">
const props = withDefaults(defineProps<{
    title?: string
    shadow?: 'always' | 'hover' | 'never'
    cardClass?: string
}>(), {
    shadow: 'hover',
    title: '',
    cardClass: '',
})
</script>

<template>
    <el-card :shadow="props.shadow" :class="['base-card', props.cardClass]">
        <template #header>
            <slot name="header">
                <div v-if="props.title" class="base-card-title">{{ props.title }}</div>
            </slot>
        </template>
        <slot />
    </el-card>

</template>

<style scoped>
.base-card {
    border-radius: 16px;
}

.base-card-title {
    font-size: 18px;
    font-weight: 700;
}
</style>
