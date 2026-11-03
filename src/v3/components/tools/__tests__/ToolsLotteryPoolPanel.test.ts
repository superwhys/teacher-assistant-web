import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, ssrContextKey, type App } from 'vue'
import ToolsLotteryPoolPanel from '../ToolsLotteryPoolPanel.vue'

vi.mock('@/v3/components/tools/ToolsLotteryPrizeItem.vue', () => ({ default: { render: () => null } }))

interface PanelState {
    showProbability: boolean
    toggleProbability: () => void
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
let storage: Map<string, string>

function mountPanel(): PanelState {
    app = renderer.createApp({ ...ToolsLotteryPoolPanel, render: () => null }, {
        prizes: [],
        probabilities: {},
    })
    app.provide(ssrContextKey, { modules: new Set() })
    return (app.mount({}).$ as unknown as { setupState: PanelState }).setupState
}

beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('window', {
        localStorage: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
        },
    })
})

afterEach(() => {
    app?.unmount()
    app = undefined
    vi.unstubAllGlobals()
})

describe('lottery probability visibility', () => {
    it('hides probabilities by default', () => {
        expect(mountPanel().showProbability).toBe(false)
    })

    it('restores a previously hidden probability preference', () => {
        storage.set('ta_lottery_show_probability_v1', '0')
        expect(mountPanel().showProbability).toBe(false)
    })

    it('restores a previously shown probability preference', () => {
        storage.set('ta_lottery_show_probability_v1', '1')
        expect(mountPanel().showProbability).toBe(true)
    })

    it('remembers showing and hiding probabilities when the panel is reopened', () => {
        let panel = mountPanel()
        panel.toggleProbability()
        expect(panel.showProbability).toBe(true)

        app?.unmount()
        panel = mountPanel()
        expect(panel.showProbability).toBe(true)

        panel.toggleProbability()
        expect(panel.showProbability).toBe(false)

        app?.unmount()
        expect(mountPanel().showProbability).toBe(false)
    })

    it('keeps the toggle usable when local storage is unavailable', () => {
        vi.stubGlobal('window', {
            localStorage: {
                getItem: () => { throw new Error('storage unavailable') },
                setItem: () => { throw new Error('storage unavailable') },
            },
        })
        const panel = mountPanel()
        expect(panel.showProbability).toBe(false)
        panel.toggleProbability()
        expect(panel.showProbability).toBe(true)
        panel.toggleProbability()
        expect(panel.showProbability).toBe(false)
    })
})
