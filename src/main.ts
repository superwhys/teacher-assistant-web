import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import App from './App.vue'
import router from './routers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { useMainLoadingStore } from '@/stores/mainLoadingStore'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(ElementPlus)

const mainLoadingStore = useMainLoadingStore(pinia)
const bootToken = mainLoadingStore.beginRoute()
router.isReady().finally(() => {
    mainLoadingStore.endRoute(bootToken)
})

app.mount('#app')
