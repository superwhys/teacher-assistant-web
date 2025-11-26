<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import { usePointsStore } from '@/stores/pointsStore'
import type { Student } from '@/types/student'

interface Props {
    students: Student[]
    classId: string | null
    maxDisplay?: number
}

const props = withDefaults(defineProps<Props>(), {
    maxDisplay: 10
})

const pointsItemStore = usePointsItemStore()
const pointsStore = usePointsStore()

const selectedItemId = ref<string>('')
const allItems = computed(() => pointsItemStore.listItems('all'))

// 默认选中第一个积分项
watch(allItems, (items) => {
    if (!selectedItemId.value && items.length > 0 && items[0]) {
        selectedItemId.value = items[0].id
    }
}, { immediate: true })

const rankedStudents = computed(() => {
    if (!selectedItemId.value || !props.classId) return []

    const history = pointsStore.getHistoryOf(props.classId)
    const studentPointsMap: Record<string, number> = {}

    // 初始化所有学生积分为0
    props.students.forEach(s => {
        studentPointsMap[s.studentName] = 0
    })

    // 遍历历史记录累加分数
    history.forEach(action => {
        if (action.itemId === selectedItemId.value) {
            const score = action.delta
            action.studentNames.forEach(name => {
                if (studentPointsMap[name] !== undefined) {
                    studentPointsMap[name] += score
                }
            })
        }
    })

    // 转换为数组并排序
    const result = props.students
        .map(s => ({
            ...s,
            points: studentPointsMap[s.studentName] ?? 0
        }))
        .filter(s => s.points !== 0) // 仅展示有分数的学生，或者是否展示0分的？需求只说查看加分情况排名，通常0分不需要展示，但为了完整性可以展示。这里为了榜单好看，可以过滤掉0分的，或者保留。参考原榜单是所有学生。这里如果只看“加分情况”，可能不包含没加过的。但为了明确，保留所有或者只保留非零。
        // 考虑到是“加分情况的排名”，通常意味着“谁加得最多”。如果都没加，就是0。
        // 既然是“加分情况”，如果选的是减分项，那就是“谁减得最多”（绝对值大）还是“谁分最低”（负数大）？
        // 需求说“加分情况的排名”，这里的“加分”可能是泛指“得分”。
        // 如果是减分项，delta是负数。排名应该按“减分越多排越前”还是“减分越少排越前”？
        // 通常排行榜是“谁表现越‘突出’越靠前”。对于加分项，分高靠前。对于减分项，可能也是分（绝对值）高靠前，表示“这个项发生最频繁的人”。
        // 但为了简单，统一按数值从大到小排？如果是减分项，数值是负的，从大到小就是减得少的排前面。这可能不符合查看“谁经常违纪”的初衷。
        // 让我们看看积分项有没有类型。
        // 如果是减分项，通常想看谁被扣得多。
        // 我们可以按“累计值的绝对值”排序吗？或者分正负项处理。
        // 简单起见，统一按数值降序排列（大的在前）。
        // 如果是减分项，数值都是负的，例如 -2, -5。 -2 > -5，所以 -2 排前面。这表示“扣分少的好学生”排前面。
        // 如果用户想看“谁最调皮”，可能希望 -5 排前面。
        // 让我们看 selectedItem 的 sign。
        
    const selectedItem = allItems.value.find(i => i.id === selectedItemId.value)
    const isMinus = selectedItem?.sign === 'minus'

    return result
        .sort((a, b) => {
            if (isMinus) {
                // 如果是减分项，按分数升序排（越小越靠前，即扣分越多越靠前）
                // 例如 -10 (index 0) vs -2 (index 1)。 -10 < -2。
                return a.points - b.points
            } else {
                // 加分项，按分数降序排
                return b.points - a.points
            }
        })
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
                    <i-ep-list class="list-icon" />
                    <span class="header-title">单项排行</span>
                </div>
                <el-select 
                    v-model="selectedItemId" 
                    placeholder="选择积分项" 
                    size="small" 
                    class="item-select"
                    filterable
                >
                    <el-option
                        v-for="item in allItems"
                        :key="item.id"
                        :label="item.name"
                        :value="item.id"
                    >
                        <span style="float: left">{{ item.name }}</span>
                        <span style="float: right; color: var(--el-text-color-secondary); font-size: 12px; margin-left: 8px;">
                            {{ item.sign === 'plus' ? '+' : '-' }}{{ item.value }}
                        </span>
                    </el-option>
                </el-select>
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
                
                <div class="student-points" :class="{ 'is-minus': student.points < 0 }">
                    {{ student.points > 0 ? '+' + student.points : student.points }}
                </div>
            </div>
        </div>
        
        <div v-else class="empty-ranking">
            <i-ep-data-analysis class="empty-icon" />
            <div class="empty-text">暂无数据</div>
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
    gap: 8px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
}

.list-icon {
    font-size: 20px;
    color: #8b5cf6;
}

.header-title {
    font-size: 18px;
    font-weight: 700;
    color: #333;
}

.item-select {
    width: 140px;
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

.student-points.is-minus {
    color: #ef4444;
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

