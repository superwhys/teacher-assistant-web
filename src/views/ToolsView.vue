<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { Component } from 'vue'
import { useRouter } from 'vue-router'
import IEpTimer from '~icons/ep/timer'
import IEpUser from '~icons/ep/user'
import ToolCard from '@/components/ToolCard.vue'

defineOptions({
    name: 'ToolsView'
})

interface ToolItem {
    key: string
    title: string
    desc: string
    icon: Component
    to?: string
}

const tools: ToolItem[] = [
    { key: 'timer', title: '计时器', desc: '课堂倒计时', icon: IEpTimer, to: '/tools/timer' },
    { key: 'rollcall', title: '点名器', desc: '随机选择学生', icon: IEpUser, to: '/tools/rollcall' },
]

const router = useRouter()

function onToolClick(item: ToolItem) {
    if (item.to) {
        router.push(item.to)
        return
    }
    ElMessage.info(`${item.title} 功能即将上线`)
}
</script>

<template>
    <div class="tools-page">
        <div class="tools-grid">
            <ToolCard v-for="t in tools" :key="t.key" :icon="t.icon" :title="t.title" :desc="t.desc"
                @click="onToolClick(t)" />

            <div class="tool-card more-card" aria-hidden="true">
                <i-ep-more-filled class="tool-icon" />
                <div class="tool-title">更多工具</div>
                <div class="tool-desc">正在开发中</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tools-page {
    width: 100%;
    height: 100%;
    padding: 20px;
}

.tools-grid {
    max-width: 1000px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
}

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

.more-card {
    background: #f3fbf5;
    box-shadow: inset 0 0 0 1px #e3f3e8, 0 6px 18px rgba(0, 0, 0, 0.06);
}

@media (max-width: 900px) {
    .tools-page {
        padding: 16px;
    }

    .tools-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    .tool-icon {
        width: 54px;
        height: 54px;
    }

    .tool-title {
        font-size: 18px;
    }
}

@media (max-width: 480px) {
    .tools-page {
        padding: 12px;
    }

    .tools-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .tool-card {
        border-radius: 14px;
        padding: 20px 12px;
    }

    .tool-icon {
        width: 48px;
        height: 48px;
    }

    .tool-title {
        font-size: 16px;
    }

    .tool-desc {
        font-size: 13px;
    }
}
</style>
