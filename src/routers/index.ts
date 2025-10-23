import { createRouter, createWebHistory } from "vue-router";
import { useSettingsStore } from '@/stores/settingsStore'
import { useLicenseStore } from '@/stores/licenseStore'
import { LicenseStatus } from '@/types/license'

const routes = [
  {
    path: '/',
    redirect: '/class',
  },
  {
    path: '/class',
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
    meta: { hideFooter: true },
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
  const settings = useSettingsStore()
  const license = useLicenseStore()
  if (!settings.secretKey) {
    await settings.hydrate()
  }
  if (!settings.secretKey && to.path !== '/auth') {
    return '/auth'
  }

  // 授权 token 验签与到期检查
  if (to.path !== '/auth') {
    await license.verifyCurrent()
    if (license.status !== LicenseStatus.Valid) {
      return '/auth'
    }
  }

  return true
})

export default router;
