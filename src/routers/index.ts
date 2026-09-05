import { createRouter, createWebHistory } from "vue-router";
import { useCacheStore } from '@/stores/cacheStore'
import { useMainLoadingStore } from '@/stores/mainLoadingStore'
import { useSessionStore } from '@/stores/sessionStore'

const routes = [
  {
    path: '/v3/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/',
    component: () => import('@/v3/views/MainView.vue'),
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        component: () => import('@/v3/views/DashboardView.vue'),
      },
      {
        path: 'students',
        component: () => import('@/v3/views/StudentsView.vue'),
      },
      {
        path: 'points',
        component: () => import('@/v3/views/PointsView.vue'),
      },
      {
        path: 'shop',
        component: () => import('@/v3/views/ShopView.vue'),
      },
      {
        path: 'tools',
        component: () => import('@/v3/views/ToolsView.vue'),
      },
      {
        path: 'tools/timer',
        component: () => import('@/v3/views/ToolsTimerPage.vue'),
      },
      {
        path: 'tools/rollcall',
        component: () => import('@/v3/views/ToolsRollCallPage.vue'),
      },
      {
        path: 'tools/lottery',
        component: () => import('@/v3/views/ToolsLotteryPage.vue'),
      },
      {
        path: 'settings',
        component: () => import('@/v3/views/SettingsView.vue'),
      },
      {
        path: 'no-access',
        component: () => import('@/v3/views/NoAccessView.vue'),
      },
      {
        path: ':pathMatch(.*)*',
        component: () => import('@/v3/views/ComingSoonView.vue'),
      },
    ]
  },
  // {
  //   path: '/',
  //   component: () => import('@/layouts/AppLayout.vue'),
  //   // children: [
  //   //   {
  //   //     path: '',
  //   //     redirect: '/points',
  //   //   },
  //   //   {
  //   //     path: 'students',
  //   //     component: () => import('@/views/ClassView.vue'),
  //   //     meta: { keepAlive: false },
  //   //   },
  //   //   {
  //   //     path: 'points',
  //   //     component: () => import('@/views/PointsView.vue'),
  //   //     meta: { keepAlive: false },
  //   //   },
  //   //   {
  //   //     path: 'points/history',
  //   //     component: () => import('@/views/PointsHistoryView.vue'),
  //   //     meta: { keepAlive: false },
  //   //   },
  //   //   {
  //   //     path: 'points/shop',
  //   //     component: () => import('@/views/ShopView.vue'),
  //   //     meta: { keepAlive: false },
  //   //   },
  //   //   {
  //   //     path: 'tools',
  //   //     component: () => import('@/views/ToolsView.vue'),
  //   //     meta: { keepAlive: true },
  //   //   },
  //   //   {
  //   //     path: 'tools/timer',
  //   //     component: () => import('@/components/tools/TimerView.vue'),
  //   //     meta: { keepAlive: true },
  //   //   },
  //   //   {
  //   //     path: 'tools/rollcall',
  //   //     component: () => import('@/components/tools/RollCallView.vue'),
  //   //     meta: { keepAlive: true },
  //   //   },
  //   //   {
  //   //     path: 'tools/lottery',
  //   //     component: () => import('@/components/tools/LotteryView.vue'),
  //   //     meta: { keepAlive: true },
  //   //   },
  //   //   {
  //   //     path: 'settings',
  //   //     component: () => import('@/views/SettingsView.vue'),
  //   //     meta: { keepAlive: false },
  //   //   },
  //   //   {
  //   //     path: 'opinion',
  //   //     component: () => import('@/views/OpinionView.vue'),
  //   //     meta: { keepAlive: false },
  //   //   },
  //   // ],
  // },
  {
    path: '/auth',
    component: () => import('@/views/AuthView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const mainLoading = useMainLoadingStore()
  const token = mainLoading.beginRoute()
    ; (to as any).__mainLoadingToken = token

  const cache = useCacheStore()
  const session = useSessionStore()
  if (!cache.isAuthenticated) {
    session.reset()
    if (to.path === '/auth') return true
    mainLoading.endRoute(token)
    return { path: '/auth', query: { redirect: to.fullPath } }
  }

  try {
    await session.initialize()
  } catch {
    mainLoading.endRoute(token)
    if (!cache.isAuthenticated) {
      return { path: '/auth', query: { redirect: to.fullPath } }
    }
    return false
  }

  const fallback = session.firstRoute || '/no-access'
  if (to.path === '/auth' || to.path === '/') {
    mainLoading.endRoute(token)
    return fallback
  }
  if (to.path === '/no-access') {
    if (!session.firstRoute) return true
    mainLoading.endRoute(token)
    return session.firstRoute
  }
  if (!session.canAccess(to.path)) {
    mainLoading.endRoute(token)
    return fallback
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
