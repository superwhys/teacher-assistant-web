<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCacheStore } from '@/stores/cacheStore'
import { useSessionStore } from '@/stores/sessionStore'

const router = useRouter()
const cacheStore = useCacheStore()
const sessionStore = useSessionStore()

function logout() {
    sessionStore.reset()
    cacheStore.logout()
    void router.replace('/auth')
}
</script>

<template>
    <section class="no-access">
        <div class="no-access__icon"><i-ep-lock /></div>
        <h1>暂无可用功能</h1>
        <p>当前角色还没有被授予任何菜单权限，请联系管理员。</p>
        <el-button type="primary" @click="logout">退出登录</el-button>
    </section>
</template>

<style scoped>
.no-access { min-height: 60vh; display: grid; place-content: center; justify-items: center; text-align: center; gap: 12px; color: #475569; }
.no-access__icon { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 18px; background: #eef2ff; color: #4f46e5; font-size: 27px; }
.no-access h1, .no-access p { margin: 0; }
</style>
