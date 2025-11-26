<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import html2canvas from 'html2canvas'
import { usePointsStore } from '@/stores/pointsStore'
import { useStudentStore } from '@/stores/studentStore'
import { formatChineseDateWithWeek } from '@/utils/date'
import type { Student } from '@/types/student'

const props = defineProps<{
    visible: boolean
    classId: string
    className: string
    student: Student | null
}>()

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
}>()

const pointsStore = usePointsStore()
const studentStore = useStudentStore()
const cardRef = ref<HTMLElement>()
const generating = ref(false)

const dialogVisible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
})

const studentName = computed(() => props.student?.studentName || '')
const currentDate = computed(() => formatChineseDateWithWeek(new Date()))

// 获取所有学生，用于计算排名
const allStudents = computed(() => props.classId ? studentStore.listByClassId(props.classId) : [])

// 获取该学生的积分历史
const history = computed(() => {
    if (!props.classId || !props.student) return []
    const allHistory = pointsStore.getHistoryOf(props.classId)
    return allHistory.filter(action =>
        action.studentNames.includes(props.student!.studentName)
    ).sort((a, b) => b.at - a.at)
})

// 1. 总积分与排名
const totalPoints = computed(() => {
    if (!props.classId || !props.student) return 0
    return pointsStore.getTotalPoints(props.classId, props.student.studentName)
})

const ranking = computed(() => {
    if (!props.classId || !props.student) return '-'
    const scores = allStudents.value.map(s => ({
        name: s.studentName,
        score: pointsStore.getTotalPoints(props.classId, s.studentName)
    })).sort((a, b) => b.score - a.score)
    
    const rank = scores.findIndex(s => s.name === props.student?.studentName) + 1
    const total = scores.length
    if (total === 0) return '-'
    
    // 计算百分比
    const percentile = Math.round(((total - rank) / total) * 100)
    return {
        rank,
        total,
        percentile,
        text: `第 ${rank} 名`
    }
})

// 2. 周期增长 (本月)
const monthlyGrowth = computed(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    
    let growth = 0
    history.value.forEach(h => {
        if (h.at >= startOfMonth && h.delta > 0) {
            growth += h.delta
        }
    })
    return growth
})

const weeklyGrowth = computed(() => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1)).setHours(0,0,0,0)
    
    let growth = 0
    history.value.forEach(h => {
        if (h.at >= startOfWeek && h.delta > 0) {
            growth += h.delta
        }
    })
    return growth
})

// 3. 荣誉勋章 (Badges)
const badges = computed(() => {
    const list: { label: string; color: string; icon: string }[] = []
    
    // 进步之星：本周增长 > 10
    if (weeklyGrowth.value > 10) {
        list.push({ label: '进步之星', color: '#ff9c6e', icon: 'i-ep-top' })
    }
    
    // 全勤宝宝：最近30条无扣分
    const recent30 = history.value.slice(0, 30)
    const hasDeduction = recent30.some(h => h.delta < 0 && h.type !== 'shop')
    if (recent30.length > 5 && !hasDeduction) {
        list.push({ label: '守纪标兵', color: '#95de64', icon: 'i-ep-medal' })
    }
    
    // 排名靠前
    if (typeof ranking.value !== 'string' && ranking.value.rank <= 3) {
        list.push({ label: '领军人物', color: '#ffd666', icon: 'i-ep-trophy' })
    } else if (typeof ranking.value !== 'string' && ranking.value.rank <= 10) {
        list.push({ label: '班级十强', color: '#85a5ff', icon: 'i-ep-star' })
    }

    return list.slice(0, 3) // 最多显示3个
})

// 4. 统计数据
const topAwards = computed(() => {
    const map = new Map<string, number>()
    history.value.forEach(h => {
        if (h.delta > 0 && h.itemName) {
            map.set(h.itemName, (map.get(h.itemName) || 0) + 1)
        }
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4)
})

const topDeductions = computed(() => {
    const map = new Map<string, number>()
    history.value.forEach(h => {
        if (h.delta < 0 && h.type !== 'shop' && h.itemName) {
            map.set(h.itemName, (map.get(h.itemName) || 0) + 1)
        }
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4)
})

async function downloadImage() {
    if (!cardRef.value) return
    generating.value = true
    try {
        await nextTick()
        const canvas = await html2canvas(cardRef.value, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true
        })
        const link = document.createElement('a')
        link.download = `${props.className}-${studentName.value}-详细报告.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        ElMessage.success('图片生成成功')
    } catch (e) {
        console.error(e)
        ElMessage.error('生成图片失败')
    } finally {
        generating.value = false
    }
}
</script>

<template>
    <el-dialog v-model="dialogVisible" title="生成详细表现报告" width="600px" destroy-on-close top="5vh">
        <div class="preview-container">
            <div ref="cardRef" class="report-card">
                <!-- 头部 -->
                <div class="card-header">
                    <div class="header-main">
                        <div class="school-title">学生成长周报</div>
                        <div class="report-date">{{ currentDate }}</div>
                    </div>
                    <div class="class-badge">{{ className }}</div>
                </div>
                
                <!-- 个人概览 -->
                <div class="overview-section">
                    <div class="student-profile-row">
                        <div class="avatar-wrapper">
                            <div class="student-avatar">
                                {{ studentName.slice(0, 1) }}
                            </div>
                            <div v-if="badges.length && badges[0]" class="medal-icon">
                                <div :class="badges[0].icon"></div>
                            </div>
                        </div>
                        <div class="name-badge-col">
                            <div class="name-row">
                                <span class="name">{{ studentName }}</span>
                                <div class="badges-row">
                                    <span v-for="b in badges" :key="b.label" class="honor-tag" :style="{ background: b.color }">
                                        {{ b.label }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-data-row">
                        <div class="rank-info-box">
                            <div class="rank-label">班级超越</div>
                            <div class="rank-main">
                                <span class="rank-val">{{ typeof ranking === 'object' ? `超过 ${ranking.percentile}%` : '-' }}</span>
                                <span v-if="typeof ranking === 'object'" class="percentile-tag">的同学</span>
                            </div>
                        </div>
                        
                        <div class="score-cards">
                            <div class="score-card total">
                                <div class="label">总积分</div>
                                <div class="val">{{ totalPoints }}</div>
                            </div>
                            <div class="score-card growth">
                                <div class="label">本月成长</div>
                                <div class="val">+{{ monthlyGrowth }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 数据可视化区域 -->
                <div class="viz-section">
                    <div class="stat-group">
                        <div class="section-title positive">🎉 高光时刻</div>
                        <div v-if="topAwards.length > 0" class="stat-list">
                            <div v-for="(item, idx) in topAwards" :key="idx" class="stat-item">
                                <span class="item-name">{{ item[0] }}</span>
                                <div class="progress-bar">
                                    <div class="progress-fill" :style="{ width: Math.min(100, item[1]*10) + '%' }"></div>
                                </div>
                                <span class="item-count">x{{ item[1] }}</span>
                            </div>
                        </div>
                        <div v-else class="empty-stat">暂无奖励记录</div>
                    </div>
                    
                    <div class="stat-group mt-2">
                        <div class="section-title negative">💡 待改进</div>
                        <div v-if="topDeductions.length > 0" class="stat-list">
                            <div v-for="(item, idx) in topDeductions" :key="idx" class="stat-item">
                                <span class="item-name">{{ item[0] }}</span>
                                <div class="progress-bar">
                                    <div class="progress-fill warning" :style="{ width: Math.min(100, item[1]*10) + '%' }"></div>
                                </div>
                                <span class="item-count">x{{ item[1] }}</span>
                            </div>
                        </div>
                        <div v-else class="empty-stat">表现完美，继续保持！</div>
                    </div>
                </div>

                <!-- 底部 -->
                <div class="card-footer">
                    <div class="quote">“ 每个孩子都是一颗独特的种子，静待花开。 ”</div>
                    <div class="sign-area">
                        <div class="date">日期：{{ new Date().toLocaleDateString() }}</div>
                        <div class="teacher-sign">教师签名：_________________</div>
                    </div>
                </div>
            </div>
        </div>
        
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="dialogVisible = false">关闭</el-button>
                <el-button type="primary" :loading="generating" @click="downloadImage">
                    <i-ep-download /> 下载高清图片
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
.preview-container {
    background: #f0f2f5;
    padding: 20px;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    overflow: auto;
    max-height: 70vh;
}

.report-card {
    width: 420px;
    min-height: 600px;
    background: #ffffff;
    background-image: radial-gradient(#f3f4f6 1px, transparent 1px);
    background-size: 20px 20px;
    padding: 32px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    gap: 24px;
    color: #333;
    position: relative;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 16px;
}

.school-title {
    font-size: 22px;
    font-weight: 800;
    color: #1a1a1a;
    letter-spacing: 1px;
}

.report-date {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}

.class-badge {
    background: linear-gradient(135deg, #409eff, #3a8ee6);
    color: #fff;
    padding: 4px 12px;
    border-radius: 8px 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
}

.overview-section {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.student-profile-row {
    display: flex;
    align-items: center;
    gap: 16px;
}

.name-badge-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.stats-data-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafc;
    border-radius: 12px;
    padding: 12px 16px;
    border: 1px solid #f0f0f0;
}

.rank-info-box {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.rank-label {
    font-size: 11px;
    color: #909399;
}

.rank-main {
    display: flex;
    align-items: baseline;
    gap: 6px;
}

.rank-val {
    font-size: 16px;
    font-weight: 700;
    color: #333;
}

.percentile-tag {
    font-size: 10px;
    color: #999;
}

/* 保留原有的 avatar, medal-icon, name, badges, score-card 样式 */
.avatar-wrapper {
    position: relative;
}

.student-avatar {
    width: 64px;
    height: 64px;
    background: linear-gradient(135deg, #6aa2ff, #4f8df9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    color: #fff;
    font-weight: 700;
    border: 3px solid #fff;
    box-shadow: 0 4px 12px rgba(79, 141, 249, 0.3);
}

.medal-icon {
    position: absolute;
    bottom: -4px;
    right: -4px;
    background: #fff;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.name-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.name {
    font-size: 22px;
    font-weight: 700;
    color: #333;
}

.badges-row {
    display: flex;
    gap: 6px;
}

.honor-tag {
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 4px;
    color: #fff;
    font-weight: 600;
}

.score-cards {
    display: flex;
    gap: 12px;
}

.score-card {
    text-align: center;
    min-width: 60px;
    padding: 0 8px;
    border-left: 1px solid #eee;
}

.score-card:first-child {
    border-left: none;
}

.score-card.total { background: transparent; }
.score-card.growth { background: transparent; }

.score-card .label {
    font-size: 10px;
    color: #909399;
    margin-bottom: 2px;
}

.score-card .val {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
}

.total .val { color: #409eff; }
.growth .val { color: #67c23a; }

.viz-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: #fff;
    border-radius: 12px;
    border: 1px solid #eee;
    padding: 16px;
}

.radar-chart {
    display: none;
}

.viz-right {
    display: contents;
}

.stat-group {
    margin-bottom: 8px;
}

.mt-2 {
    margin-top: 12px;
}

.section-title {
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: #333;
}

.section-title.positive { color: #67c23a; }
.section-title.negative { color: #e6a23c; }

.stat-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.stat-item {
    display: grid;
    grid-template-columns: 100px 1fr 30px;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    margin-bottom: 8px;
}

.item-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.progress-bar {
    height: 6px;
    background: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: #67c23a;
    border-radius: 3px;
}

.progress-fill.warning {
    background: #e6a23c;
}

.item-count {
    text-align: right;
    color: #999;
}

.empty-stat {
    font-size: 11px;
    color: #ccc;
    padding: 4px 0;
}

.history-section {
    flex: 1;
}

.history-timeline {
    display: flex;
    flex-direction: column;
    position: relative;
    padding-left: 8px;
}

.timeline-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    position: relative;
}

.timeline-item::before {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: #e4e7ed;
    z-index: 0;
}

.timeline-item:first-child::before { top: 50%; }
.timeline-item:last-child::before { bottom: 50%; }

.dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #e4e7ed;
    z-index: 1;
    flex-shrink: 0;
}

.dot.plus { background: #67c23a; }
.dot.minus { background: #f56c6c; }

.timeline-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: #f9fafc;
    border-radius: 6px;
    font-size: 13px;
}

.action-delta {
    font-weight: 700;
}

.action-delta.plus { color: #67c23a; }
.action-delta.minus { color: #f56c6c; }

.card-footer {
    margin-top: auto;
    border-top: 1px dashed #eee;
    padding-top: 24px;
}

.quote {
    text-align: center;
    font-size: 12px;
    color: #909399;
    font-style: italic;
    margin-bottom: 24px;
}

.sign-area {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 13px;
    color: #606266;
}

.teacher-sign {
    font-family: 'Courier New', Courier, monospace;
    font-weight: 700;
}
</style>
