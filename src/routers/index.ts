import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from '@/stores/userStore'

const routes = [
  {
    path: '/',
    redirect: '/points',
  },
  {
    path: '/students',
    component: () => import('@/views/ClassView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/points',
    component: () => import('@/views/PointsView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/points/history',
    component: () => import('@/views/PointsHistoryView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/points/shop',
    component: () => import('@/views/ShopView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/tools',
    component: () => import('@/views/ToolsView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/tools/timer',
    component: () => import('@/views/TimerView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/tools/rollcall',
    component: () => import('@/views/RollCallView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/tools/lottery',
    component: () => import('@/views/LotteryView.vue'),
    meta: { keepAlive: true },
  },
  {
    path: '/settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { keepAlive: false },
  },
  {
    path: '/auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { hideFooter: true, keepAlive: false },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const user = useUserStore()
  if (!user.isAuthenticated && to.path !== '/auth') {
    return { path: '/auth', query: { redirect: to.fullPath } }
  }
  if (user.isAuthenticated && to.path === '/auth') {
    return { path: '/points' }
  }
  return true
})

export default router;
