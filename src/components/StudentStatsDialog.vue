<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { usePointsStore } from '@/stores/pointsStore'

const props = defineProps<{
    modelValue: boolean
    classId: string | null
    studentName: string
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: boolean): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const pointsStore = usePointsStore()
const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
const activeTab = ref<'total' | 'penalty'>('total')

// 指标数据
const currentTotal = computed(() => {
    return pointsStore.getTotalPoints(props.classId, props.studentName)
})
const currentAvailable = computed(() => {
    return pointsStore.getAvailablePoints(props.classId, props.studentName)
})

// 历史记录分析
const historyStats = computed(() => {
    if (!props.classId || !props.studentName) return { gain: 0, consume: 0, maxDelta: 0, count: 0, totalPenalty: 0 }
    
    const allHistory = pointsStore.getHistoryOf(props.classId)
    const studentHistory = allHistory.filter(h => h.studentNames.includes(props.studentName))
    
    let gain = 0
    let consume = 0 // shop 消耗
    let totalPenalty = 0 // 纯扣分
    let maxDelta = 0
    
    studentHistory.forEach(h => {
        if (h.type === 'shop') {
             consume += Math.abs(h.delta)
        } else {
            // type === 'points'
            if (h.delta > 0) {
                gain += h.delta
                if (h.delta > maxDelta) maxDelta = h.delta
            } else {
                totalPenalty += Math.abs(h.delta)
            }
        }
    })
    
    return {
        gain,
        consume,
        totalPenalty,
        maxDelta,
        count: studentHistory.length
    }
})

function initChart() {
    if (!chartRef.value) return
    
    if (chartInstance) {
        chartInstance.dispose()
    }
    
    chartInstance = echarts.init(chartRef.value)
    const allHistory = pointsStore.getHistoryOf(props.classId)
    
    let option: echarts.EChartsOption = {}

    if (activeTab.value === 'total') {
        // 总积分成长趋势
        const studentHistory = allHistory
            .filter(h => h.studentNames.includes(props.studentName) && (h.type === 'points' || h.type === undefined))
            .sort((a, b) => a.at - b.at)
            
        let runningTotal = 0
        const data: [string, number][] = []
        
        const firstTime = studentHistory.length > 0 ? studentHistory[0]?.at : Date.now()
        if (firstTime !== undefined) {
            data.push([new Date(firstTime - 1000).toISOString(), 0])
        }

        studentHistory.forEach(h => {
            runningTotal += h.delta
            data.push([new Date(h.at).toISOString(), runningTotal])
        })
        
        data.push([new Date().toISOString(), runningTotal])

        option = {
            title: {
                text: '总积分成长趋势',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: function (params: any) {
                    if (!params[0]) return ''
                    const date = new Date(params[0].value[0])
                    const dateStr = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
                    return `${dateStr}<br/>总积分: <b>${params[0].value[1]}</b>`
                }
            },
            grid: { left: '10px', right: '20px', bottom: '10px', top: '40px', containLabel: true },
            xAxis: { type: 'time', boundaryGap: false as unknown as [string | number, string | number] },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{
                name: '总积分',
                type: 'line',
                smooth: true, // 平滑曲线
                symbol: 'none', // 去掉圆点，除非 hover
                data: data,
                areaStyle: {
                    opacity: 0.1,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#409EFF' },
                        { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
                    ])
                },
                itemStyle: { color: '#409EFF' },
                lineStyle: { width: 3 }
            }]
        }
    } else {
        // 每日扣分趋势
        // 筛选扣分记录 (delta < 0)
        const penaltyHistory = allHistory
            .filter(h => h.studentNames.includes(props.studentName) && h.delta < 0)
            
        // 按天聚合
        const dailyMap = new Map<string, number>()
        
        penaltyHistory.forEach(h => {
            const date = new Date(h.at)
            const dayKey = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')}`
            const val = dailyMap.get(dayKey) || 0
            dailyMap.set(dayKey, val + Math.abs(h.delta))
        })
        
        // 转换为数组并排序
        const data = Array.from(dailyMap.entries())
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            
        option = {
            title: {
                text: '每日扣分趋势',
                left: 'center',
                textStyle: { fontSize: 16, fontWeight: 'normal' }
            },
            tooltip: {
                trigger: 'axis',
                formatter: '{b}<br/>扣分: <b>{c}</b> 分'
            },
            grid: { left: '10px', right: '20px', bottom: '10px', top: '40px', containLabel: true },
            xAxis: { 
                type: 'category', 
                data: data.map(d => d[0]),
                boundaryGap: false as unknown as boolean
            },
            yAxis: { type: 'value', minInterval: 1 },
            series: [{
                name: '扣分',
                type: 'line',
                smooth: true,
                data: data.map(d => d[1]),
                areaStyle: {
                    opacity: 0.1,
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#F56C6C' },
                        { offset: 1, color: 'rgba(245, 108, 108, 0.1)' }
                    ])
                },
                itemStyle: { color: '#F56C6C' },
                lineStyle: { width: 3 }
            }]
        }
    }
    
    chartInstance.setOption(option)
}

watch(() => visible.value, (val) => {
    if (val) {
        activeTab.value = 'total' // 重置 Tab
        nextTick(() => {
            initChart()
        })
    }
})

watch(activeTab, () => {
    nextTick(() => {
        initChart()
    })
})

const resizeHandler = () => chartInstance?.resize()
watch(visible, (val) => {
    if (val) {
        window.addEventListener('resize', resizeHandler)
    } else {
        window.removeEventListener('resize', resizeHandler)
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', resizeHandler)
    chartInstance?.dispose()
})

</script>

<template>
    <el-dialog
        v-model="visible"
        :title="`「${studentName}」的积分详情`"
        width="750px"
        align-center
        destroy-on-close
        class="stats-dialog"
    >
        <div class="stats-container">
            <!-- 顶部指标卡片 -->
            <div class="metrics-grid">
                <div class="metric-card primary">
                    <div class="label">当前总积分</div>
                    <div class="value">{{ currentTotal }}</div>
                </div>
                 <div class="metric-card success">
                    <div class="label">可用积分</div>
                    <div class="value">{{ currentAvailable }}</div>
                </div>
                 <div class="metric-card danger">
                    <div class="label">累计扣分</div>
                    <div class="value">{{ historyStats.totalPenalty }}</div>
                </div>
                 <div class="metric-card warning">
                    <div class="label">单次最高获分</div>
                    <div class="value">{{ historyStats.maxDelta > 0 ? '+' + historyStats.maxDelta : '-' }}</div>
                </div>
            </div>

            <!-- 图表区域 -->
            <div class="chart-section">
                <el-tabs v-model="activeTab" class="chart-tabs">
                    <el-tab-pane label="总积分成长" name="total"></el-tab-pane>
                    <el-tab-pane label="每日扣分趋势" name="penalty"></el-tab-pane>
                </el-tabs>
                <div class="chart-wrapper">
                    <div ref="chartRef" class="chart-box"></div>
                    <div v-if="activeTab === 'penalty' && historyStats.totalPenalty === 0" class="empty-chart-mask">
                        暂无扣分记录
                    </div>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<style scoped>
.stats-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 0 4px;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
}

.metric-card {
    padding: 16px;
    border-radius: 12px;
    background: #f5f7fa;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: transform 0.2s;
}

.metric-card:hover {
    transform: translateY(-2px);
}

.metric-card.primary { background: linear-gradient(135deg, #ecf5ff 0%, #e0efff 100%); color: #409eff; }
.metric-card.success { background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%); color: #67c23a; }
.metric-card.warning { background: linear-gradient(135deg, #fdf6ec 0%, #faecd8 100%); color: #e6a23c; }
.metric-card.danger { background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%); color: #f56c6c; }
.metric-card.info { background: linear-gradient(135deg, #f4f4f5 0%, #e9e9eb 100%); color: #909399; }

.label { 
    font-size: 13px; 
    opacity: 0.85; 
    color: inherit; 
}

.value { 
    font-size: 28px; 
    font-weight: 700; 
    color: inherit; 
    font-family: var(--el-font-family);
}

.chart-section {
    display: flex;
    flex-direction: column;
}

.chart-tabs {
    margin-bottom: 0;
}

.chart-tabs :deep(.el-tabs__header) {
    margin-bottom: 10px;
}

.chart-wrapper {
    height: 360px;
    width: 100%;
    border: 1px solid #ebeef5;
    border-radius: 12px;
    padding: 16px;
    background: #fff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    position: relative;
}

.chart-box {
    width: 100%;
    height: 100%;
}

.empty-chart-mask {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.8);
    color: #909399;
    font-size: 14px;
}

@media (max-width: 600px) {
    .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
    }
    
    .chart-wrapper {
        height: 300px;
    }
}
</style>
