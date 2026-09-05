import { createApp } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import router from './routers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { useMainLoadingStore } from '@/stores/mainLoadingStore'
import { useCacheStore } from '@/stores/cacheStore'
import { useSessionStore } from '@/stores/sessionStore'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
setActivePinia(pinia)
const app = createApp(App)
app.use(pinia)

function clearTokenFromCurrentUrl(): void {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('token')) return
    url.searchParams.delete('token')
    const query = url.searchParams.toString()
    const nextUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`
    window.history.replaceState(window.history.state, '', nextUrl)
}

async function initSessionBeforeMount(): Promise<void> {
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

await initSessionBeforeMount()

app.use(router)
app.use(ElementPlus)

const mainLoadingStore = useMainLoadingStore(pinia)
const bootToken = mainLoadingStore.beginRoute()
router.isReady().finally(() => {
    mainLoadingStore.endRoute(bootToken)
})

app.mount('#app')
