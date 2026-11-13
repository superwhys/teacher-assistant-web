export type CollectionStatus = 'pending' | 'submitted' | 'exempt'

export interface CollectionTaskSummary {
    id: number
    title: string
    created_at: string
    version: number
    pending_count: number
    submitted_count: number
    exempt_count: number
}

export interface CollectionUpdate {
    student_id: number
    status: CollectionStatus
}

export interface CollectionTaskStudent extends CollectionUpdate {
    student_name: string
    awarded: boolean
}

export interface CollectionTaskDetail extends CollectionTaskSummary {
    students: CollectionTaskStudent[]
}
