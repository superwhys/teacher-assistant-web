import { afterEach, describe, expect, it, vi } from 'vitest'
import { computed, createRenderer, h, nextTick, reactive, ssrContextKey, type App, type Component } from 'vue'
import StudentsPointsRuleDialog from '../StudentsPointsRuleDialog.vue'

vi.mock('@/composables/useBusinessAccess', () => ({ useBusinessAccess: () => ({
    canWrite: computed(() => true), allowWrite: () => true,
}) }))
vi.mock('element-plus/es', () => ({ ElLoadingDirective: {} }))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/loading/style/css', () => ({}))
vi.mock('element-plus/es/components/input/style/css', () => ({}))
vi.mock('element-plus/es/components/skeleton/style/css', () => ({}))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))

interface DialogState {
    countInput: string
    applicationCount: number
    validCount: boolean
    handleSelectRule: (selectedRule: typeof rule) => void
}

const rule = { id: 3, name: '课堂发言', icon: '', points: 2, sign: 'plus' as const }
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})

let app: App | undefined
function mountDialog() {
    const select = vi.fn()
    const props = reactive({ modelValue: false, groups: [], applying: false, onSelect: select })
    const component = { ...StudentsPointsRuleDialog, render: () => null } as Component
    app = renderer.createApp({ setup: () => () => h(component, props) })
    app.provide(ssrContextKey, { modules: new Set() })
    const root = app.mount({}).$
    const state = (root.subTree.component as unknown as { setupState: DialogState }).setupState
    return { state, props, select }
}

afterEach(() => { app?.unmount(); app = undefined })

describe('student points rule repeat input', () => {
    it('defaults to one and emits the chosen count alongside the rule', () => {
        const { state, select } = mountDialog()
        expect(state.countInput).toBe('1')
        expect(state.validCount).toBe(true)
        state.handleSelectRule(rule)
        expect(select).toHaveBeenLastCalledWith(rule, 1)
        state.countInput = '5'
        expect(state.applicationCount).toBe(5)
        state.handleSelectRule(rule)
        expect(select).toHaveBeenLastCalledWith(rule, 5)
    })

    it.each(['', '0', '-1', '1.5', '101', 'abc'])('blocks invalid repeat input %j', (input) => {
        const { state, select } = mountDialog()
        state.countInput = input
        expect(state.validCount).toBe(false)
        state.handleSelectRule(rule)
        expect(select).not.toHaveBeenCalled()
    })

    it('allows the upper limit and blocks duplicate submission while applying', async () => {
        const { state, props, select } = mountDialog()
        state.countInput = '100'
        state.handleSelectRule(rule)
        expect(select).toHaveBeenCalledWith(rule, 100)
        props.applying = true
        await nextTick()
        state.handleSelectRule(rule)
        expect(select).toHaveBeenCalledOnce()
    })

    it('preserves the count after failure and resets it when reopened', async () => {
        const { state, props } = mountDialog()
        props.modelValue = true
        await nextTick()
        state.countInput = '5'
        props.applying = true
        await nextTick()
        props.applying = false
        await nextTick()
        expect(state.countInput).toBe('5')
        props.modelValue = false
        await nextTick()
        props.modelValue = true
        await nextTick()
        expect(state.countInput).toBe('1')
    })
})
