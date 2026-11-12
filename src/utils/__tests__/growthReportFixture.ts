import type { GrowthReport } from '@/types/studentGrowth'

export function growthReportFixture(overrides: Partial<GrowthReport> = {}): GrowthReport {
    return {
        id: 0, student_id: 11, student_name: '小明', class_id: 7, class_name: '一班',
        semester_id: 70, semester_name: '秋季', from: '2026-11-02', to: '2026-11-08',
        previous_from: '2026-10-26', previous_to: '2026-11-01', previous_period_complete: true,
        generated_at: '2026-11-11T10:00:00+08:00', snapshot_hash: 'snapshot-1',
        summary: { records: 3, awarded_count: 2, deducted_count: 1, awarded_points: 4, deducted_points: 1, recorded_days: 2 },
        previous_summary: { records: 0, awarded_count: 0, deducted_count: 0, awarded_points: 0, deducted_points: 0, recorded_days: 0 },
        daily: [{ date: '2026-11-02', awarded_count: 2, deducted_count: 1, awarded_points: 4, deducted_points: 1 }],
        rules: [{ rule_id: 3, rule_name: '积极发言', type: 1, count: 2, points: 4, previous_count: 0, previous_points: 0 }],
        records: [{ id: 8, rule_id: 3, description: '积极发言', type: 1, amount: 2, created_at: '2026-11-02T10:00:00+08:00' }],
        interpretation: '', ...overrides,
    }
}
