<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCacheStore } from '@/stores/cacheStore'
import { useSessionStore } from '@/stores/sessionStore'

const router = useRouter()
const cacheStore = useCacheStore()
const sessionStore = useSessionStore()

async function retrySession() {
    try {
        await sessionStore.initialize(true)
        await router.replace(sessionStore.firstRoute || '/no-access')
    } catch {
        // 错误状态由 session store 展示。
    }
}
</script>

<template>
    <div v-if="cacheStore.isAuthenticated && sessionStore.error" class="session-error-page">
        <div class="session-error-card">
            <i-ep-warning-filled class="session-error-icon" />
            <h1>页面初始化失败</h1>
            <p>{{ sessionStore.error }}</p>
            <el-button type="primary" :loading="sessionStore.loading" @click="retrySession">重新加载</el-button>
        </div>
    </div>
    <div v-else style="width: 100%; min-height: 100vh;">
        <router-view />
    </div>
</template>

<style scoped>
.session-error-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f8fafc; }
.session-error-card { width: min(420px, 100%); padding: 32px; border-radius: 20px; background: #fff; box-shadow: 0 18px 50px rgba(15, 23, 42, .08); text-align: center; }
.session-error-icon { width: 42px; height: 42px; color: #f59e0b; }
.session-error-card h1 { margin: 16px 0 8px; font-size: 23px; color: #0f172a; }
.session-error-card p { margin: 0 0 20px; color: #64748b; }
</style>
