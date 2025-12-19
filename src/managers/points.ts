import { pointsApi } from '@/api/points'
import type {
    GetClassRankingQuery,
    GetClassRankingResp,
    GetRuleRankingQuery,
    GetRuleRankingResp,
    ListApplyRecordsQuery,
    PaginatedRecordResp,
    Record,
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


