export interface GrowthSummary {
    records: number
    awarded_count: number
    deducted_count: number
    awarded_points: number
    deducted_points: number
    recorded_days: number
}

export interface GrowthDaily {
    date: string
    awarded_count: number
    deducted_count: number
    awarded_points: number
    deducted_points: number
}

export interface GrowthRule {
    rule_id: number
    rule_name: string
    type: number
    count: number
    points: number
    previous_count: number
    previous_points: number
}

export interface GrowthRecord {
    id: number
    rule_id: number
    description: string
    type: number
    amount: number
    created_at: string
}

export interface GrowthReport {
    id: number
    student_id: number
    student_name: string
    class_id: number
    class_name: string
    semester_id: number
    semester_name: string
    from: string
    to: string
    previous_from: string
    previous_to: string
    previous_period_complete: boolean
    generated_at: string
    snapshot_hash: string
    summary: GrowthSummary
    previous_summary: GrowthSummary
    daily: GrowthDaily[]
    rules: GrowthRule[]
    records: GrowthRecord[]
    teacher_note: string
    interpretation: string
}

export interface GrowthReportQuery {
    semester_id: number
    from: string
    to: string
}

export interface SaveGrowthReportRequest extends GrowthReportQuery {
    snapshot_hash: string
    teacher_note: string
    interpretation: string
}

export interface GrowthReportHistoryItem {
    id: number
    from: string
    to: string
    created_at: string
}

export interface GrowthInterpretationTask {
    id: string
    snapshot_hash: string
    status: 'queued' | 'running' | 'succeeded' | 'failed'
    interpretation: string
    error: string
    error_code: number
    created_at: string
    updated_at: string
}

export interface GrowthInterpretationQuery extends GrowthReportQuery {
    snapshot_hash: string
}
