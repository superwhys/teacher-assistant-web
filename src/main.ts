import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
import router from './routers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import './styles/admin.css'
import { useMainLoadingStore } from '@/stores/mainLoadingStore'
import { useCacheStore } from '@/stores/cacheStore'
import { useSessionStore } from '@/stores/sessionStore'
import { ensureAuthStorage } from '@/utils/authStorage'
import StartupErrorView from '@/views/StartupErrorView.vue'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
setActivePinia(pinia)
const app = createApp(App)
app.use(pinia)

function clearTokenFromCurrentUrl(): void {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('token')) return
    url.searchParams.delete('token')
    if (url.searchParams.get('session') === 'tab') url.searchParams.delete('session')
    const query = url.searchParams.toString()
    const nextUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
    window.history.replaceState(window.history.state, '', nextUrl)
}

async function initSessionBeforeMount(): Promise<void> {
    ensureAuthStorage()
    const cacheStore = useCacheStore(pinia)
    const sessionStore = useSessionStore(pinia)
    const tokenFromQuery = new URL(window.location.href).searchParams.get('token')?.trim() ?? ''
    if (tokenFromQuery) {
        cacheStore.setTokenOnly(tokenFromQuery)
        cacheStore.setExpired(false)
    }
    if (!cacheStore.token) {
        clearTokenFromCurrentUrl()
        return
    }
    try {
        await sessionStore.initialize(true)
    } catch {
        // 401 会由请求层清理 Token；其他错误由 App 的会话错误页承接。
    } finally {
        clearTokenFromCurrentUrl()
    }
}

let startupFailed = false
try {
    await initSessionBeforeMount()
} catch (error) {
    startupFailed = true
    createApp(StartupErrorView, {
        message: error instanceof Error ? error.message : '初始化失败，请重新加载页面',
    }).mount('#app')
}

if (!startupFailed) {
    app.use(router)
    app.use(ElementPlus)

    const mainLoadingStore = useMainLoadingStore(pinia)
    const bootToken = mainLoadingStore.beginRoute()
    router.isReady().finally(() => {
        mainLoadingStore.endRoute(bootToken)
    })

    app.mount('#app')
}
