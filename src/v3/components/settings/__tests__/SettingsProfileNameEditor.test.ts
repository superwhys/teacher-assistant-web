import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, reactive, ssrContextKey, type App } from 'vue'
import type { UserProfile } from '@/types/user'
import SettingsProfileNameEditor from '../SettingsProfileNameEditor.vue'

type Cache = { token: string | null; profile: UserProfile | null; isLocked: boolean; updateProfile: (profile: UserProfile) => void }
const mocks = vi.hoisted(() => ({ update: vi.fn(), updateProfile: vi.fn(), success: vi.fn(), cache: null as unknown as Cache }))
vi.mock('@/api/user', () => ({ userApi: { updateName: mocks.update } }))
vi.mock('@/stores/cacheStore', () => ({ useCacheStore: () => mocks.cache }))
vi.mock('element-plus', () => ({ ElMessage: { success: mocks.success } }))
vi.mock('@/v3/components/AppDialogShell.vue', () => ({ default: { render: () => null } }))

interface EditorState {
    visible: boolean; name: string; saving: boolean; error: string; nameLength: number;
    open: () => void; close: () => void; save: () => Promise<void>;
}
const renderer = createRenderer<object, object>({
    patchProp: () => {}, insert: () => {}, remove: () => {},
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, parentNode: () => null, nextSibling: () => null,
})
let app: App | undefined
function mountEditor(promptDefaultName = false): EditorState {
    app = renderer.createApp({ ...SettingsProfileNameEditor, render: () => null }, { promptDefaultName })
    app.provide(ssrContextKey, { modules: new Set() })
    return (app.mount({}).$ as unknown as { setupState: EditorState }).setupState
}
beforeEach(() => {
    vi.resetAllMocks()
    mocks.cache = reactive({ token: 'token-a', profile: {
        id: 'teacher-a', name: '原姓名', email: 'a@example.com', roleCode: 'common', wechatBound: true,
        entitlement: { state: 'paid_expired', permanent: false, trial_started_at: null, trial_expires_at: null, paid_expires_at: '2026-11-01T00:00:00Z' },
    }, isLocked: false, updateProfile: mocks.updateProfile })
    mocks.updateProfile.mockImplementation(profile => { mocks.cache.profile = profile })
    mocks.update.mockImplementation((name: string) => Promise.resolve({ data: { id: 'teacher-a', name } }))
})
afterEach(() => { app?.unmount(); app = undefined })

describe('current account name editor', () => {
    it('keeps the manual editor closed for the default name', () => {
        mocks.cache.profile!.name = '微信用户'
        const editor = mountEditor()
        expect(editor.visible).toBe(false)
        expect(mocks.update).not.toHaveBeenCalled()
    })
    it('automatically opens the editor for the default name when prompting is enabled', () => {
        mocks.cache.profile!.name = '微信用户'
        const editor = mountEditor(true)
        expect(editor.visible).toBe(true)
        expect(editor.name).toBe('微信用户')
        expect(mocks.update).not.toHaveBeenCalled()
    })
    it.each(['张老师', '微信用户老师', ' 微信用户 '])('does not prompt for the different name %j', name => {
        mocks.cache.profile!.name = name
        const editor = mountEditor(true)
        expect(editor.visible).toBe(false)
    })
    it('does not reopen after cancellation when the same account profile refreshes', async () => {
        mocks.cache.profile!.name = '微信用户'
        const editor = mountEditor(true)
        expect(editor.visible).toBe(true)
        editor.close()
        mocks.cache.profile = { ...mocks.cache.profile!, wechatBound: false }
        await nextTick()
        expect(editor.visible).toBe(false)
        mocks.cache.isLocked = true
        await nextTick()
        mocks.cache.isLocked = false
        await nextTick()
        expect(editor.visible).toBe(false)
        expect(mocks.update).not.toHaveBeenCalled()
    })
    it('keeps the prompt closed after saving and refreshing the updated profile', async () => {
        mocks.cache.profile!.name = '微信用户'
        const editor = mountEditor(true)
        expect(editor.visible).toBe(true)
        editor.name = '张老师'
        await editor.save()
        mocks.cache.profile = { ...mocks.cache.profile! }
        await nextTick()
        expect(mocks.cache.profile!.name).toBe('张老师')
        expect(editor.visible).toBe(false)
    })
    it('delays the default-name prompt until the account is unlocked', async () => {
        mocks.cache.profile!.name = '微信用户'
        mocks.cache.isLocked = true
        const editor = mountEditor(true)
        expect(editor.visible).toBe(false)
        mocks.cache.isLocked = false
        await nextTick()
        expect(editor.visible).toBe(true)
    })
    it('prompts again after a token change for the same default-name account', async () => {
        mocks.cache.profile!.name = '微信用户'
        const editor = mountEditor(true)
        editor.close()
        mocks.cache.token = 'token-b'
        await nextTick()
        expect(editor.visible).toBe(true)
    })
    it('prompts again for a different default-name account', async () => {
        mocks.cache.profile!.name = '微信用户'
        const editor = mountEditor(true)
        editor.close()
        mocks.cache.profile = { id: 'teacher-b', name: '微信用户', email: 'b@example.com' }
        await nextTick()
        expect(editor.visible).toBe(true)
    })
    it('waits for credentials and profile before opening the default-name prompt', async () => {
        mocks.cache.token = null
        mocks.cache.profile = null
        const editor = mountEditor(true)
        expect(editor.visible).toBe(false)
        mocks.cache.profile = { id: 'teacher-a', name: '微信用户', email: 'a@example.com' }
        await nextTick()
        expect(editor.visible).toBe(false)
        mocks.cache.profile = null
        mocks.cache.token = 'token-a'
        await nextTick()
        expect(editor.visible).toBe(false)
        mocks.cache.profile = { id: 'teacher-a', name: '微信用户', email: 'a@example.com' }
        await nextTick()
        expect(editor.visible).toBe(true)
    })
    it('opens the current name, cancels without a request, and starts the next edit from live profile data', () => {
        const editor = mountEditor()
        editor.open()
        expect(editor.name).toBe('原姓名')
        editor.name = '未保存'
        editor.close()
        expect(editor.visible).toBe(false)
        expect(mocks.update).not.toHaveBeenCalled()
        editor.open()
        expect(editor.name).toBe('原姓名')
    })
    it.each(['', '   ', '名'.repeat(65), '\n姓名', '\t姓名', '姓名\u007f', '姓名\u0085'])('rejects invalid raw input %j before issuing a request', async name => {
        const editor = mountEditor()
        editor.open()
        editor.name = name
        await editor.save()
        expect(mocks.update).not.toHaveBeenCalled()
        expect(editor.error).not.toBe('')
        expect(editor.visible).toBe(true)
    })
    it('permits an expired account to save trimmed names with internal spaces and emoji', async () => {
        const editor = mountEditor()
        editor.open()
        editor.name = '  张 三 🙂  '
        await editor.save()
        expect(mocks.update).toHaveBeenCalledExactlyOnceWith('张 三 🙂')
        expect(mocks.cache.profile?.name).toBe('张 三 🙂')
        expect(mocks.cache.profile?.roleCode).toBe('common')
        expect(mocks.cache.profile?.wechatBound).toBe(true)
        expect(mocks.cache.profile?.entitlement?.state).toBe('paid_expired')
        expect(editor.visible).toBe(false)
        expect(mocks.success).toHaveBeenCalledWith('姓名已修改')
    })
    it('counts Unicode code points so 64 emoji are accepted', async () => {
        const editor = mountEditor()
        editor.open()
        editor.name = '🙂'.repeat(64)
        expect(editor.nameLength).toBe(64)
        await editor.save()
        expect(mocks.update).toHaveBeenCalledExactlyOnceWith('🙂'.repeat(64))
    })
    it('prevents duplicate writes and preserves the draft and retry on request failure', async () => {
        const editor = mountEditor()
        editor.open()
        editor.name = '新姓名'
        let reject!: (cause: Error) => void
        mocks.update.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail }))
        const pending = editor.save()
        await editor.save()
        editor.close()
        expect(editor.visible).toBe(true)
        expect(mocks.update).toHaveBeenCalledTimes(1)
        reject(new Error('网络暂不可用'))
        await pending
        expect(editor.name).toBe('新姓名')
        expect(editor.error).toBe('网络暂不可用')
        expect(editor.saving).toBe(false)
        await editor.save()
        expect(mocks.cache.profile?.name).toBe('新姓名')
    })
    it('merges only the canonical returned name into the latest matching profile', async () => {
        const editor = mountEditor()
        editor.open()
        editor.name = '新姓名'
        let finish!: (value: { data: { id: string; name: string } }) => void
        mocks.update.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const pending = editor.save()
        mocks.cache.profile = { ...mocks.cache.profile!, roleCode: 'pro', wechatBound: false }
        finish({ data: { id: 'teacher-a', name: '规范姓名' } })
        await pending
        expect(mocks.cache.profile?.name).toBe('规范姓名')
        expect(mocks.cache.profile?.roleCode).toBe('pro')
        expect(mocks.cache.profile?.wechatBound).toBe(false)
    })
    it('closes on identity changes and discards a response from the previous account', async () => {
        const editor = mountEditor()
        editor.open()
        editor.name = '旧账号姓名'
        let finish!: (value: { data: { id: string; name: string } }) => void
        mocks.update.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const pending = editor.save()
        mocks.cache.token = 'token-b'
        mocks.cache.profile = { id: 'teacher-b', name: '新账号', email: 'b@example.com' }
        expect(editor.visible).toBe(false)
        finish({ data: { id: 'teacher-a', name: '旧账号姓名' } })
        await pending
        expect(mocks.cache.profile.name).toBe('新账号')
        expect(mocks.updateProfile).not.toHaveBeenCalled()
        expect(mocks.success).not.toHaveBeenCalled()
    })
    it('rejects a different response account and ignores a request resolving after unmount', async () => {
        const editor = mountEditor()
        editor.open()
        editor.name = '新姓名'
        mocks.update.mockResolvedValueOnce({ data: { id: 'other-user', name: '其他账号' } })
        await editor.save()
        expect(editor.error).toContain('账号信息不一致')
        expect(mocks.updateProfile).not.toHaveBeenCalled()
        let finish!: (value: { data: { id: string; name: string } }) => void
        mocks.update.mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
        const pending = editor.save()
        app?.unmount(); app = undefined
        finish({ data: { id: 'teacher-a', name: '新姓名' } })
        await pending
        expect(mocks.updateProfile).not.toHaveBeenCalled()
    })
})
