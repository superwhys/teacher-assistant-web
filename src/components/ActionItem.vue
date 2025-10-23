<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface Props {
    /** 按钮文字 */
    label: string
    /** 路由路径 */
    to: string
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()

// 包含前缀就代表是当前页面
const isActive = computed(() => route.path.startsWith(props.to))

function onClick() {
    if (route.path !== props.to) {
        router.push({ path: props.to })
    }
}
</script>

<template>
    <button :class="['action-item', { 'is-active': isActive }]" type="button" @click="onClick">
        <i-ep-arrow-right class="action-corner" />
        <slot name="icon" />
        <span class="action-text">{{ label }}</span>
    </button>
    
</template>

<style scoped>
.action-item {
    appearance: none;
    border: none;
    outline: none;
    cursor: pointer;
    position: relative;
    border-radius: 14px;
    background: #f6f6f6;
    box-shadow: inset 0 0 0 1px #eee;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #111111;
    transition: transform .15s ease, background-color .25s ease, box-shadow .25s ease;
}

.action-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0,0,0,.08);
}

.action-item.is-active {
    background: #111111;
    color: #ffffff;
    box-shadow: inset 0 0 0 1px #000, 0 8px 24px rgba(0,0,0,.18);
    animation: activePulse .22s ease;
}

.action-corner {
    position: absolute;
    right: 12px;
    top: 12px;
    width: 16px;
    height: 16px;
    color: rgba(0,0,0,.45);
    transition: color .25s ease, transform .2s ease;
}

.action-item.is-active .action-corner {
    color: rgba(255,255,255,.85);
}

.action-text {
    margin-top: 8px;
    font-size: 16px;
    font-weight: 600;
    color: currentColor;
    transition: color .25s ease;
}


@keyframes activePulse {
    0% { transform: translateY(0) scale(0.98); }
    60% { transform: translateY(-1px) scale(1.01); }
    100% { transform: translateY(0) scale(1); }
}

@media (max-width: 768px) {
    .action-item {
        padding: 8px 4px;
    }
    .action-corner {
        right: 10px;
        top: 10px;
        width: 14px;
        height: 14px;
    }
    .action-text { font-size: 14px; }
}

@media (max-width: 432px) {
    .action-item {
        padding: 8px 4px;
        border-radius: 12px;
    }
    .action-corner {
        right: 8px;
        top: 8px;
        width: 12px;
        height: 12px;
    }
    .action-text {
        font-size: 14px;
    }
}
</style>


