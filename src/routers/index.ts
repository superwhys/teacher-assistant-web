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
  },
  {
    path: '/points',
    component: () => import('@/views/PointsView.vue'),
  },
  {
    path: '/points/history',
    component: () => import('@/views/PointsHistoryView.vue'),
  },
  {
    path: '/tools',
    component: () => import('@/views/ToolsView.vue'),
  },
  {
    path: '/tools/timer',
    component: () => import('@/views/TimerView.vue'),
  },
  {
    path: '/tools/rollcall',
    component: () => import('@/views/RollCallView.vue'),
  },
  {
    path: '/settings',
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { hideFooter: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const user = useUserStore()
  if (!user.hydrated) {
    await user.hydrate()
  }
  if (!user.isAuthenticated && to.path !== '/auth') {
    return { path: '/auth', query: { redirect: to.fullPath } }
  }
  if (user.isAuthenticated && to.path === '/auth') {
    return { path: '/class' }
  }
  return true
})

export default router;
