import { pointsApi } from '@/api/points'
import type {
    ExportPointsRecordsPreviewReq,
    ExportPointsRecordsPreviewResp,
    GetClassRankingQuery,
    GetClassRankingResp,
    GetRuleRankingQuery,
    GetRuleRankingResp,
    ImportPointsRecordsReq,
    ListApplyRecordsQuery,
    PaginatedRecordResp,
    Record,
    CreateRuleGroupItem,
    UpdateRuleGroupReq,
    CreateRuleItem,
    UpdateRuleReq,
    Rule,
    RuleGroup,
    Wallet
} from '@/types/points'

export type PointsRuleSign = 'plus' | 'minus'

export type UiPointsRule = {
    id: number
    name: string
    description: string
    icon: string
    points: number
    sign: PointsRuleSign
    groupId: number
    groupName: string
}

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

function inferRuleSign(rule: Rule): PointsRuleSign {
    // swagger: points_type 可能表示加分/扣分类型；兜底用 points 正负判断
    const t = toNumber(rule.points_type, 0)
    if (t === 2) return 'minus'
    if (t === 1) return 'plus'
    const p = toNumber(rule.points, 0)
    return p < 0 ? 'minus' : 'plus'
}

export const pointsManager = {
    async listRuleGroups(): Promise<RuleGroup[]> {
        const resp = await pointsApi.listGroups()
        return resp.data?.groups ?? []
    },

    async importRuleRecords(payload: ImportPointsRecordsReq): Promise<string[]> {
        const resp = await pointsApi.importRuleRecords(payload)
        return resp.data ?? []
    },

    async exportRuleRecordsPreview(payload: ExportPointsRecordsPreviewReq): Promise<ExportPointsRecordsPreviewResp> {
        const resp = await pointsApi.exportRuleRecordsPreview(payload)
        return resp.data ?? {}
    },

    async exportRuleRecords(key: string): Promise<Blob> {
        const k = String(key ?? '').trim()
        if (!k) throw new Error('导出 key 为空')
        return await pointsApi.exportRuleRecords({ key: k })
    },

    async createRuleGroups(groups: CreateRuleGroupItem[]): Promise<void> {
        const items = (groups ?? [])
            .map(g => ({
                name: (g?.name ?? '').trim(),
                icon: (g?.icon ?? '').trim(),
                description: (g?.description ?? '').trim(),
            }))
            .filter(g => !!g.name)

        if (items.length === 0) return
        await pointsApi.createGroup({ groups: items })
    },

    async createRuleGroup(payload: CreateRuleGroupItem): Promise<void> {
        await this.createRuleGroups([payload])
    },

    async createRuleGroupAndGetId(payload: CreateRuleGroupItem): Promise<number> {
        const name = (payload?.name ?? '').trim()
        if (!name) return 0

        const before = await this.listRuleGroups()
        const existed = before.find(g => (g.name ?? '').trim() === name)
        if (existed) return toNumber(existed.id, 0)

        await this.createRuleGroup(payload)

        const after = await this.listRuleGroups()
        const created = after.find(g => (g.name ?? '').trim() === name)
        return created ? toNumber(created.id, 0) : 0
    },

    async updateRuleGroup(groupId: number, payload: UpdateRuleGroupReq): Promise<void> {
        await pointsApi.updateGroup(groupId, payload)
    },

    async deleteRuleGroup(groupId: number): Promise<void> {
        await pointsApi.deleteGroup(groupId)
    },

    async createRules(rules: CreateRuleItem[]): Promise<void> {
        const items = (rules ?? [])
            .map(r => ({
                rule_group_id: toNumber((r as any)?.rule_group_id, 0),
                points: Math.abs(toNumber((r as any)?.points, 0)),
                type: toNumber((r as any)?.type, 0),
                name: ((r as any)?.name ?? '').trim(),
                icon: ((r as any)?.icon ?? '').trim(),
                description: ((r as any)?.description ?? '').trim(),
            }))
            .filter(r => !!r.name && r.rule_group_id > 0 && r.points > 0 && (r.type === 1 || r.type === 2))

        if (items.length === 0) return
        await pointsApi.createRule({ rules: items })
    },

    async createRule(payload: CreateRuleItem): Promise<void> {
        await this.createRules([payload])
    },

    async updateRule(ruleId: number, payload: UpdateRuleReq): Promise<void> {
        await pointsApi.updateRule(ruleId, payload)
    },

    async deleteRule(ruleId: number): Promise<void> {
        await pointsApi.deleteRule(ruleId)
    },

    async listRulesFlat(): Promise<UiPointsRule[]> {
        const groups = await this.listRuleGroups()
        const flat: UiPointsRule[] = []

        for (const g of groups) {
            const groupId = toNumber(g.id, 0)
            const groupName = (g.name ?? '').trim()
            const groupIcon = (g.icon ?? '').trim()
            const groupDesc = (g.description ?? '').trim()
            const rules = g.rules ?? []

            for (const r of rules) {
                const id = toNumber(r.id, 0)
                const name = (r.name ?? '').trim()
                if (!id || !name) continue
                flat.push({
                    id,
                    name,
                    description: (r.description ?? '').trim() || groupDesc,
                    icon: (r.icon ?? '').trim() || groupIcon,
                    points: toNumber(r.points, 0),
                    sign: inferRuleSign(r),
                    groupId,
                    groupName,
                })
            }
        }
        return flat
    },

    async applyRule(ruleId: number, studentId: number): Promise<Wallet> {
        const resp = await pointsApi.applyRule({ rule_id: ruleId, student_id: studentId })
        return resp.data ?? {}
    },

    async applyRuleBatch(ruleId: number, studentIds: number[]): Promise<void> {
        const ids = studentIds.filter(id => id > 0)
        if (ids.length === 0) return
        // 简单串行，避免并发过高导致后端限流/失败
        for (const sid of ids) {
            await this.applyRule(ruleId, sid)
        }
    },

    async undoApply(applyId: number): Promise<Wallet> {
        const resp = await pointsApi.undoApply(applyId)
        return resp.data ?? {}
    },

    async listApplyRecords(query?: ListApplyRecordsQuery): Promise<PaginatedRecordResp> {
        const resp = await pointsApi.listApplyRecords(query)
        return resp.data ?? {}
    },

    async getClassRanking(query: GetClassRankingQuery): Promise<GetClassRankingResp> {
        const resp = await pointsApi.getClassRanking(query)
        return resp.data ?? {}
    },

    async getRuleRanking(query: GetRuleRankingQuery): Promise<GetRuleRankingResp> {
        const resp = await pointsApi.getRuleRanking(query)
        return resp.data ?? {}
    },

    async listAllApplyRecordsByClass(classId: number, chunkSize = 2000, maxItems = 20000): Promise<Record[]> {
        if (!classId) return []
        const items: Record[] = []
        let offset = 0

        while (items.length < maxItems) {
            const resp = await this.listApplyRecords({
                class_id: classId,
                limit: chunkSize,
                offset,
            })
            const batch = resp.items ?? []
            items.push(...batch)
            if (batch.length < chunkSize) break
            offset += chunkSize
        }

        return items
    },
}


