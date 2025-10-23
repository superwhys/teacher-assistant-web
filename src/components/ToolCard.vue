<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ title: string; desc: string; icon: Component }>()
const emit = defineEmits<{ (e: 'click'): void }>()

function onClick() {
    emit('click')
}
</script>

<template>
    <button type="button" class="tool-card" @click="onClick">
        <component :is="icon" class="tool-icon" />
        <div class="tool-title">{{ title }}</div>
        <div class="tool-desc">{{ desc }}</div>
    </button>
</template>

<style scoped>
.tool-card {
    appearance: none;
    border: none;
    outline: none;
    cursor: pointer;
    width: 100%;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06), inset 0 0 0 1px #eee;
    padding: 28px 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: transform .15s ease, box-shadow .25s ease, background-color .25s ease;
}

.tool-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.10);
}

.tool-icon {
    width: 64px;
    height: 64px;
    color: #111111;
}

.tool-title {
    margin-top: 16px;
    font-size: 22px;
    font-weight: 800;
    color: #111111;
}

.tool-desc {
    margin-top: 6px;
    font-size: 14px;
    color: #8a8a8a;
}

@media (max-width: 900px) {
    .tool-icon { width: 54px; height: 54px; }
    .tool-title { font-size: 18px; }
}

@media (max-width: 480px) {
    .tool-card { border-radius: 14px; padding: 20px 12px; }
    .tool-icon { width: 48px; height: 48px; }
    .tool-title { font-size: 16px; }
    .tool-desc { font-size: 13px; }
}
</style>


