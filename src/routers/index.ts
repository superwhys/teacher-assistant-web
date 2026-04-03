import { createRouter, createWebHistory } from "vue-router";
import { useCacheStore } from '@/stores/cacheStore'
import { useMainLoadingStore } from '@/stores/mainLoadingStore'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/points',
      },
      {
        path: 'students',
        component: () => import('@/views/ClassView.vue'),
        meta: { keepAlive: false },
      },
      {
        path: 'points',
        component: () => import('@/views/PointsView.vue'),
        meta: { keepAlive: false },
      },
      {
        path: 'points/history',
        component: () => import('@/views/PointsHistoryView.vue'),
        meta: { keepAlive: false },
      },
      {
        path: 'points/shop',
        component: () => import('@/views/ShopView.vue'),
        meta: { keepAlive: false },
      },
      {
        path: 'tools',
        component: () => import('@/views/ToolsView.vue'),
        meta: { keepAlive: true },
      },
      {
        path: 'tools/timer',
        component: () => import('@/components/tools/TimerView.vue'),
        meta: { keepAlive: true },
      },
      {
        path: 'tools/rollcall',
        component: () => import('@/components/tools/RollCallView.vue'),
        meta: { keepAlive: true },
      },
      {
        path: 'tools/lottery',
        component: () => import('@/components/tools/LotteryView.vue'),
        meta: { keepAlive: true },
      },
      {
        path: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { keepAlive: false },
      },
      {
        path: 'opinion',
        component: () => import('@/views/OpinionView.vue'),
        meta: { keepAlive: false },
      },
    ],
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('@/views/AuthView.vue'),
        meta: { keepAlive: false },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  const mainLoading = useMainLoadingStore()
  const token = mainLoading.beginRoute()
    ; (to as any).__mainLoadingToken = token

  const cache = useCacheStore()
  if (!cache.isAuthenticated && to.path !== '/auth') {
    mainLoading.endRoute(token)
    return { path: '/auth', query: { redirect: to.fullPath } }
  }
  if (cache.isAuthenticated && to.path === '/auth') {
    mainLoading.endRoute(token)
    return { path: '/points' }
  }
  return true
})

router.afterEach((to) => {
  const token = (to as any).__mainLoadingToken
  if (typeof token === 'number') {
    const mainLoading = useMainLoadingStore()
    mainLoading.endRoute(token)
  }
})

router.onError(() => {
  const mainLoading = useMainLoadingStore()
  mainLoading.clearRoutes()
})

export default router;
