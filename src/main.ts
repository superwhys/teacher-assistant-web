import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './routers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUserStore } from '@/stores/userStore'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)
app.use(ElementPlus)

await Promise.all([
    useClassStore(pinia).hydrate(),
    useStudentStore(pinia).hydrate(),
    useStudentGroupStore(pinia).hydrate(),
    usePointsStore(pinia).hydrate(),
    usePointsItemStore(pinia).hydrate(),
    useSettingsStore(pinia).hydrate(),
    useUserStore(pinia).hydrate(),
])

app.mount('#app')
