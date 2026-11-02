import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, reactive } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ToolsLotteryDisplayPanel from '../ToolsLotteryDisplayPanel.vue'

const session = reactive({ canWrite: true, canPrepare: true, canImportExport: true, entitlementMessage: '试用已到期，仅可查看' })
vi.mock('@/stores/sessionStore', () => ({ useSessionStore: () => session }))
vi.mock('element-plus', () => ({ ElMessage: { warning: vi.fn() } }))

beforeEach(() => { session.canWrite = true })

async function renderDrawControls(): Promise<string[]> {
    const app = createSSRApp(ToolsLotteryDisplayPanel, {
        currentName: '', currentPoolName: '奖励', enabledPrizeCount: 1,
        isRolling: false, isSelected: false, saving: false, loading: false,
        hasClass: true, currentClassName: '一班',
    })
    const html = await renderToString(app)
    return html.match(/<button\b[^>]*>/g) ?? []
}

describe('lottery visible access controls', () => {
    it('renders available draw buttons while active and disabled buttons after expiry', async () => {
        const activeButtons = await renderDrawControls()
        expect(activeButtons).toHaveLength(2)
        expect(activeButtons.every(button => !button.includes('disabled'))).toBe(true)

        session.canWrite = false
        const expiredButtons = await renderDrawControls()
        expect(expiredButtons).toHaveLength(2)
        expect(expiredButtons.every(button => button.includes('disabled'))).toBe(true)
    })
})
