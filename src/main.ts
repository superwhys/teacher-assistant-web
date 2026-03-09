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
import { userApi } from '@/api/user'
import { computeTrialFromProfile, normalizeUserProfile } from '@/utils/userProfile'

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

async function initAuthBeforeMount(): Promise<void> {
    const cacheStore = useCacheStore(pinia)
    const tokenFromQuery = new URL(window.location.href).searchParams.get('token')?.trim() ?? ''
    if (!tokenFromQuery) return

    cacheStore.setTokenOnly(tokenFromQuery)
    cacheStore.setExpired(false)
    try {
        const res = await userApi.getUserProfile()
        const profile = normalizeUserProfile(res.data, cacheStore.profile?.email ?? '')
        const { trial, expiresAt } = computeTrialFromProfile(profile)
        cacheStore.setAuth(tokenFromQuery, profile, trial, expiresAt)
    } finally {
        clearTokenFromCurrentUrl()
    }
}

await initAuthBeforeMount()

app.use(router)
app.use(ElementPlus)

const mainLoadingStore = useMainLoadingStore(pinia)
const bootToken = mainLoadingStore.beginRoute()
router.isReady().finally(() => {
    mainLoadingStore.endRoute(bootToken)
})

app.mount('#app')
