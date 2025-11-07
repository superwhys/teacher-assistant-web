<script setup lang="ts">
import { computed } from 'vue'
import type { Student } from '@/types/student'

interface Props {
    students: Student[]
    pointsMap: Record<string, number>
    maxDisplay?: number
}

const props = withDefaults(defineProps<Props>(), {
    maxDisplay: 10
})

const rankedStudents = computed(() => {
    const studentsWithPoints = props.students.map(s => ({
        ...s,
        points: props.pointsMap[s.studentName] ?? 0
    }))
    
    return studentsWithPoints
        .sort((a, b) => b.points - a.points)
        .slice(0, props.maxDisplay)
})

function getRankIcon(rank: number) {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
}

function getRankClass(rank: number) {
    if (rank === 1) return 'rank-first'
    if (rank === 2) return 'rank-second'
    if (rank === 3) return 'rank-third'
    return ''
}
</script>

<template>
    <el-card shadow="never" class="ranking-card">
        <template #header>
            <div class="ranking-header">
                <div class="header-left">
                    <i-ep-trophy class="trophy-icon" />
                    <span class="header-title">积分排行榜</span>
                </div>
                <el-button type="primary" size="small" @click="$router.push('/points/shop')">
                    <i-ep-shop /> 商城
                </el-button>
            </div>
        </template>

        <div v-if="rankedStudents.length > 0" class="ranking-list">
            <div 
                v-for="(student, index) in rankedStudents" 
                :key="student.studentName"
                :class="['ranking-item', getRankClass(index + 1)]"
            >
                <div class="rank-number">
                    <span v-if="getRankIcon(index + 1)" class="rank-icon">
                        {{ getRankIcon(index + 1) }}
                    </span>
                    <span v-else class="rank-text">{{ index + 1 }}</span>
                </div>
                
                <div :class="['avatar', student.gender]">
                    <i-ep-male v-if="student.gender === 'male'" />
                    <i-ep-female v-else />
                </div>
                
                <div class="student-info">
                    <div class="student-name">{{ student.studentName }}</div>
                </div>
                
                <div class="student-points">
                    {{ student.points }}
                </div>
            </div>
        </div>
        
        <div v-else class="empty-ranking">
            <i-ep-data-analysis class="empty-icon" />
            <div class="empty-text">暂无排行数据</div>
        </div>
    </el-card>
</template>

<style scoped>
.ranking-card {
    height: 100%;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
}

.ranking-card :deep(.el-card__body) {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.ranking-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 700;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.trophy-icon {
    font-size: 20px;
    color: #f59e0b;
}

.header-title {
    color: #333;
}

.ranking-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.ranking-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    background: #fafafa;
    transition: all 0.2s;
}

.ranking-item:hover {
    background: #f0f0f0;
    transform: translateX(4px);
}

.ranking-item.rank-first {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
}

.ranking-item.rank-second {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border: 2px solid #9ca3af;
}

.ranking-item.rank-third {
    background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
    border: 2px solid #ea580c;
}

.rank-number {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.rank-icon {
    font-size: 24px;
}

.rank-text {
    font-size: 16px;
    font-weight: 700;
    color: #666;
}

.avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.student-info {
    flex: 1;
    min-width: 0;
}

.student-name {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.student-points {
    padding: 4px 12px;
    background: #fff;
    color: #2d5cf6;
    border-radius: 999px;
    font-weight: 700;
    font-size: 16px;
    flex-shrink: 0;
}

.empty-ranking {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 12px;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-text {
    font-size: 14px;
}

@media (max-width: 768px) {
    .ranking-card :deep(.el-card__body) {
        padding: 12px;
    }
    
    .ranking-item {
        padding: 10px;
        gap: 10px;
    }
    
    .rank-number {
        width: 28px;
        height: 28px;
    }
    
    .rank-icon {
        font-size: 20px;
    }
    
    .rank-text {
        font-size: 14px;
    }
    
    .avatar {
        width: 32px;
        height: 32px;
        font-size: 18px;
    }
    
    .student-name {
        font-size: 14px;
    }
    
    .student-points {
        font-size: 14px;
        padding: 3px 10px;
    }
}
</style>

