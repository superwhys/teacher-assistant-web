import { describe, expect, it, vi } from 'vitest'
import { computed, createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { RuleGroup } from '@/types/points'
import PointsRulesManagePanel from '../PointsRulesManagePanel.vue'

const access = vi.hoisted(() => ({ canImportExport: true }))
vi.mock('@/composables/useBusinessAccess', () => ({
    useBusinessAccess: () => ({ canImportExport: computed(() => access.canImportExport) }),
}))
vi.mock('element-plus/es', () => ({ ElLoadingDirective: {}, ElSkeleton: { render: () => null } }))
vi.mock('element-plus/es/components/base/style/css', () => ({}))
vi.mock('element-plus/es/components/loading/style/css', () => ({}))

async function renderCreateButton(ruleGroups: RuleGroup[], canMutatePoints = true) {
    const html = await renderToString(createSSRApp(PointsRulesManagePanel, {
        canMutatePoints,
        hasActiveClass: true,
        ruleGroups,
        ruleGroupsLoading: false,
        selectedRuleGroup: ruleGroups[0] ?? null,
        selectedRuleGroupId: ruleGroups[0]?.id ?? 0,
        selectedRuleGroupRules: [],
    }))
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
    const createButtons = buttons.filter(button => button.includes('新增规则组'))
    expect(createButtons).toHaveLength(1)
    return createButtons[0]!
}

describe('points rule group creation entry', () => {
    it('keeps rule creation available without suggesting or enabling bulk actions for common accounts', async () => {
        access.canImportExport = false
        try {
            const html = await renderToString(createSSRApp(PointsRulesManagePanel, {
                canMutatePoints: true, hasActiveClass: true, ruleGroups: [], ruleGroupsLoading: false,
                selectedRuleGroup: null, selectedRuleGroupId: 0, selectedRuleGroupRules: [],
            }))
            const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
            for (const action of ['导入积分项', '导入积分', '导出结果']) {
                expect(buttons.find(button => button.includes(action)), action).toMatch(/\bdisabled\b/)
            }
            expect(buttons.find(button => button.includes('新增规则组'))).not.toMatch(/\bdisabled\b/)
            expect(html).not.toContain('通过 Excel')
        } finally {
            access.canImportExport = true
        }
    })

    it('shows a retryable error instead of an empty rules explanation', async () => {
        const html = await renderToString(createSSRApp(PointsRulesManagePanel, {
            canMutatePoints: true, hasActiveClass: true, ruleGroups: [], ruleGroupsLoading: false,
            ruleGroupsError: '积分规则加载失败', selectedRuleGroup: null, selectedRuleGroupId: 0, selectedRuleGroupRules: [],
        }))
        expect(html).toContain('积分规则加载失败')
        expect(html).toContain('重新加载')
        expect(html).not.toContain('还没有积分规则')
    })

    it('shows first-load progress instead of an empty rules explanation', async () => {
        const html = await renderToString(createSSRApp(PointsRulesManagePanel, {
            canMutatePoints: true, hasActiveClass: true, ruleGroups: [], ruleGroupsLoading: true,
            selectedRuleGroup: null, selectedRuleGroupId: 0, selectedRuleGroupRules: [],
        }))
        expect(html).toContain('正在加载积分规则')
        expect(html).not.toContain('还没有积分规则')
    })

    it.each<RuleGroup[][]>([
        [[]],
        [[{ id: 1, name: '课堂表现', rules: [] }]],
    ])('shows an enabled creation button with groups %j', async ruleGroups => {
        expect(await renderCreateButton(ruleGroups)).not.toMatch(/\bdisabled\b/)
    })

    it.each<RuleGroup[][]>([
        [[]],
        [[{ id: 1, name: '课堂表现', rules: [] }]],
    ])('disables creation in read-only mode with groups %j', async ruleGroups => {
        expect(await renderCreateButton(ruleGroups, false)).toMatch(/\bdisabled\b/)
    })
})
