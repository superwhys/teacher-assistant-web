import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, isVNode, type VNode } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { confirmDialog } from '../confirmDialog'

const mocks = vi.hoisted(() => ({ confirm: vi.fn() }))
vi.mock('element-plus', async () => {
    const { defineComponent, h } = await import('vue')
    return {
        ElMessageBox: { confirm: mocks.confirm },
        ElScrollbar: defineComponent({
            setup: (_, { slots }) => () => h('div', slots.default?.()),
        }),
    }
})

beforeEach(() => vi.resetAllMocks())

describe('shared confirmation dialog', () => {
    it('keeps the title, options and original confirmation promise', () => {
        const result = Promise.resolve('confirm')
        const beforeClose = vi.fn()
        const options = {
            type: 'warning' as const,
            confirmButtonText: '确认删除',
            cancelButtonText: '取消',
            customClass: 'prize-confirmation',
            distinguishCancelAndClose: true,
            beforeClose,
        }
        mocks.confirm.mockReturnValue(result)

        expect(confirmDialog('确定删除？', '删除确认', options)).toBe(result)
        expect(mocks.confirm).toHaveBeenCalledWith(expect.any(Object), '删除确认', {
            ...options,
            customClass: 'app-confirm-dialog prize-confirmation',
        })
        expect(options.customClass).toBe('prize-confirmation')
    })

    it('renders the message as text inside the scrollbar', async () => {
        mocks.confirm.mockResolvedValue('confirm')
        await confirmDialog('第一行\n<学生姓名>', '确认操作')
        const message = mocks.confirm.mock.calls[0]?.[0] as VNode
        expect(isVNode(message)).toBe(true)
        expect(message.props).toMatchObject({ height: '100%', always: true })
        const html = await renderToString(createSSRApp({ render: () => message }))
        expect(html).toContain('第一行\n&lt;学生姓名&gt;')
    })

    it.each(['cancel', 'close'])('preserves the %s rejection for existing callers', async (action) => {
        mocks.confirm.mockRejectedValue(action)
        await expect(confirmDialog('确定继续？', '确认操作')).rejects.toBe(action)
    })
})
