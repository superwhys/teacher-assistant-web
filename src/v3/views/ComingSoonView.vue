<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/sessionStore'
import { findMenuForPath } from '@/utils/menuAccess'

const route = useRoute()
const sessionStore = useSessionStore()
const menu = computed(() => findMenuForPath(sessionStore.sidebar, route.path))
</script>

<template>
    <section class="coming-soon">
        <div class="coming-soon__icon"><i-ep-tools /></div>
        <span>COMING SOON</span>
        <h1>{{ menu?.name || '该功能' }}正在开发中</h1>
        <p>菜单已经由管理员开放，相关页面功能正在建设中。</p>
    </section>
</template>

<style scoped>
.coming-soon { min-height: 60vh; display: grid; place-content: center; justify-items: center; text-align: center; gap: 10px; color: #64748b; }
.coming-soon__icon { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 20px; background: #eef2ff; color: #4f46e5; font-size: 29px; }
.coming-soon span { color: #6366f1; font-size: 13px; font-weight: 800; letter-spacing: .14em; }
.coming-soon h1 { margin: 0; color: #0f172a; font-size: 27px; }
.coming-soon p { margin: 0; }
</style>
