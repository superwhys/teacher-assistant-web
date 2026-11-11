import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, h, ref, ssrContextKey, type App, type VNode } from 'vue'
import * as Vue from 'vue'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'
import StudentsListCard, { type StudentsListCardItem } from '../StudentsListCard.vue'
import StudentsListPanel from '../StudentsListPanel.vue'
import cardSource from '../StudentsListCard.vue?raw'
import panelSource from '../StudentsListPanel.vue?raw'

vi.mock('@/composables/useBusinessAccess', () => ({ useBusinessAccess: () => ({ canWrite: ref(true), canPrepare: ref(true) }) }))
vi.mock('element-plus', async () => {
    const { defineComponent } = await import('vue')
    const slot = defineComponent({ setup: (_, { slots }) => () => slots.default?.() })
    return { ElDropdown: slot, ElDropdownMenu: slot, ElDropdownItem: slot }
})

// Vitest loads SSR SFCs in this repository. Compile the actual template for native click handlers.
for (const [component, source, filename] of [[StudentsListCard, cardSource, 'StudentsListCard.vue'], [StudentsListPanel, panelSource, 'StudentsListPanel.vue']] as const) {
    const { descriptor } = parse(source)
    const script = compileScript(descriptor, { id: filename })
    const compiled = compileTemplate({
        source: descriptor.template!.content, filename, id: filename,
        compilerOptions: { bindingMetadata: script.bindings },
    })
    const code = compiled.code.replace(/import \{([^}]+)\} from "vue"/g,
        (_, imports: string) => `const {${imports.replace(/ as /g, ': ')}} = Vue`)
        .replace('export function render', 'return function render')
    Object.assign(component, { render: new Function('Vue', code)(Vue) })
}

const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
const student: StudentsListCardItem = {
    id: 11, name: '小明', gender: 'male', groupId: 2, groupName: '第一组', initials: '明',
    tags: [], availablePoints: 8, totalPoints: 10,
}
let app: App | undefined
afterEach(() => { app?.unmount(); app = undefined })

function findVNode(vnode: VNode, predicate: (node: VNode) => boolean): VNode | undefined {
    if (predicate(vnode)) return vnode
    if (vnode.component) return findVNode(vnode.component.subTree, predicate)
    if (Array.isArray(vnode.children)) {
        for (const child of vnode.children) {
            if (typeof child === 'object' && child && 'type' in child) {
                const match = findVNode(child as VNode, predicate)
                if (match) return match
            }
        }
    }
}

function mount(vnode: VNode): VNode {
    const root = defineComponent({ render: () => vnode })
    app = renderer.createApp(root)
    const slot = defineComponent({ setup: (_, { slots }) => () => slots.default?.() })
    for (const name of ['el-dropdown', 'el-dropdown-menu', 'el-dropdown-item']) app.component(name, slot)
    for (const name of ['i-ep-more-filled', 'i-ep-edit-pen', 'i-ep-delete', 'i-ep-data-analysis', 'i-ep-circle-check-filled']) {
        app.component(name, defineComponent({ render: () => null }))
    }
    app.provide(ssrContextKey, { modules: new Set() })
    const instance = app.mount({})
    return instance.$.subTree
}

describe('student growth report entry', () => {
    it.each(['card', 'list', 'group'] as const)('opens the %s card report without selecting the student or bubbling to its group', mode => {
        const view = vi.fn()
        const select = vi.fn()
        const root = mount(h(StudentsListCard, { student, displayMode: mode, selected: false, onViewReport: view, onSelect: select }))
        const button = findVNode(root, node => node.props?.class === 'student-card__report')
        expect(button?.props?.['aria-label']).toBe('查看小明的成长报告')
        const stopPropagation = vi.fn()
        button!.props!.onClick({ stopPropagation })
        expect(stopPropagation).toHaveBeenCalledOnce()
        expect(view).toHaveBeenCalledExactlyOnceWith(student)
        expect(select).not.toHaveBeenCalled()
    })

    it.each(['card', 'list', 'group'] as const)('forwards the report event through the %s roster layout', layoutMode => {
        const view = vi.fn()
        const root = mount(h(StudentsListPanel, {
            students: [student], groups: [{ id: 2, name: '第一组' }], selectedStudentIds: [],
            hasActiveClass: true, isAllSelected: false, layoutMode, loading: false,
            multiSelectEnabled: false, sortBy: 'points-desc', onViewReport: view,
        }))
        const card = findVNode(root, node => node.type === StudentsListCard)
        expect(card).toBeDefined()
        card!.props!.onViewReport(student)
        expect(view).toHaveBeenCalledExactlyOnceWith(student)
    })
})
