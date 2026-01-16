import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

/**
 * Main 区域通用 Loading：
 * - route：路由导航/懒加载期间自动显示（避免 router-view 短暂空白）
 * - manual：页面/组件可按需包裹首屏请求（ref-count，避免并发请求提前关闭）
 */
export const useMainLoadingStore = defineStore('mainLoading', () => {
    const manualCount = ref(0)
    const routeCount = ref(0)

    let routeSeq = 0
    const routeTokens = new Set<number>()
    const routeTokenTimers = new Map<number, number>()

    const isLoading = computed(() => manualCount.value > 0 || routeCount.value > 0)

    function startManual(): () => void {
        manualCount.value += 1
        let stopped = false
        return () => {
            if (stopped) return
            stopped = true
            manualCount.value = Math.max(0, manualCount.value - 1)
        }
    }

    async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
        const stop = startManual()
        try {
            return await fn()
        } finally {
            stop()
        }
    }

    function beginRoute(maxHoldMs = 15000): number {
        const token = ++routeSeq
        routeTokens.add(token)
        routeCount.value = routeTokens.size

        const timer = window.setTimeout(() => {
            endRoute(token)
        }, maxHoldMs)
        routeTokenTimers.set(token, timer)

        return token
    }

    function endRoute(token: number): void {
        if (!routeTokens.has(token)) return
        routeTokens.delete(token)
        routeCount.value = routeTokens.size

        const t = routeTokenTimers.get(token)
        if (t) {
            window.clearTimeout(t)
            routeTokenTimers.delete(token)
        }
    }

    function clearRoutes(): void {
        routeTokens.clear()
        routeCount.value = 0
        for (const t of routeTokenTimers.values()) {
            window.clearTimeout(t)
        }
        routeTokenTimers.clear()
    }

    return {
        isLoading,
        startManual,
        withLoading,
        beginRoute,
        endRoute,
        clearRoutes,
    }
})

