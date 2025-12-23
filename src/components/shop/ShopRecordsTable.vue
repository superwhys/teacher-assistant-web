<script setup lang="ts">
import type { Prize, PrizeRecord } from '@/types/mall'

defineOptions({ name: 'ShopRecordsTable' })

function toNumber(v: unknown, fallback = 0): number {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const props = defineProps<{
    records: PrizeRecord[]
    loading: boolean
    total: number
    pageSize: number
    currentPage: number
    studentIdNameMap: Record<number, string>
    prizeIdMap: Record<number, Prize>
}>()

const emit = defineEmits<{
    (e: 'undo', record: PrizeRecord): void
    (e: 'page-change', page: number): void
}>()
</script>

<template>
    <div v-if="props.records.length > 0" class="records-wrapper" v-loading="props.loading">
        <el-table :data="props.records" border size="large">
            <el-table-column label="#" width="90" align="center">
                <template #default="{ $index }">
                    {{ (props.currentPage - 1) * props.pageSize + $index + 1 }}
                </template>
            </el-table-column>
            <el-table-column label="学生" min-width="120">
                <template #default="{ row }">
                    {{ row.student_name || props.studentIdNameMap[toNumber(row.student_id, 0)] || `ID:${toNumber(row.student_id, 0)}` }}
                </template>
            </el-table-column>
            <el-table-column label="商品" min-width="150">
                <template #default="{ row }">
                    {{ props.prizeIdMap[toNumber(row.prize_id, 0)]?.name || `ID:${toNumber(row.prize_id, 0)}` }}
                </template>
            </el-table-column>
            <el-table-column label="数量" width="80" align="center">
                <template #default="{ row }">
                    {{ toNumber(row.count, 0) }}
                </template>
            </el-table-column>
            <el-table-column label="消耗积分" width="120" align="center">
                <template #default="{ row }">
                    <span class="points-badge">{{ toNumber(row.points, 0) }}</span>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
                <template #default="{ row }">
                    <el-button type="warning" plain size="small" @click="emit('undo', row)">
                        撤销
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <div class="records-pagination">
            <el-pagination
                background
                :page-size="props.pageSize"
                :current-page="props.currentPage"
                :total="props.total"
                layout="prev, pager, next, jumper, total"
                @current-change="emit('page-change', $event)"
            />
        </div>
    </div>

    <div v-else class="empty-records" v-loading="props.loading">
        <i-ep-document class="empty-icon" />
        <div class="empty-title">还没有兑换记录</div>
        <div class="empty-sub">学生兑换商品后，记录会显示在这里</div>
    </div>
</template>


