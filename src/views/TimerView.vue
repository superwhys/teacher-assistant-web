<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'

const isRunning = ref(false)
const totalSeconds = ref(300)
const remainingSeconds = ref<number>(totalSeconds.value)

const minutesInput = ref(5)
const secondsInput = ref(0)

let timer: number | undefined

const display = computed(() => {
    const s = Math.max(0, remainingSeconds.value)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

const progress = computed(() => {
    if (totalSeconds.value <= 0) return 0
    return Math.round(((totalSeconds.value - remainingSeconds.value) / totalSeconds.value) * 100)
})

function applyInputToTotal() {
    const mins = Math.max(0, Math.min(999, minutesInput.value | 0))
    const secs = Math.max(0, Math.min(59, secondsInput.value | 0))
    const sum = mins * 60 + secs
    totalSeconds.value = Math.max(0, sum)
    remainingSeconds.value = totalSeconds.value
}

function setPreset(mins: number) {
    minutesInput.value = mins
    secondsInput.value = 0
    applyInputToTotal()
}

function start() {
    if (isRunning.value) return
    if (totalSeconds.value === 0) {
        ElMessage.warning('请先设置计时长度')
        return
    }
    if (remainingSeconds.value <= 0) remainingSeconds.value = totalSeconds.value
    isRunning.value = true
    timer = window.setInterval(() => {
        if (remainingSeconds.value > 0) {
            remainingSeconds.value -= 1
        } else {
            stop()
            ElMessage.success('时间到')
        }
    }, 1000)
}

function stop() {
    if (!isRunning.value) return
    isRunning.value = false
    if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
    }
}

function reset() {
    stop()
    remainingSeconds.value = totalSeconds.value
}

watch([minutesInput, secondsInput], () => {
    if (!isRunning.value) applyInputToTotal()
})

onBeforeUnmount(() => {
    if (timer !== undefined) window.clearInterval(timer)
})
</script>

<template>
    <div class="timer-page">
        <div class="header-row">
            <div class="title">
                <i-ep-timer class="title-icon" />
                <span class="title-text">计时器</span>
            </div>
            <div class="header-actions">
                <el-button type="default" plain @click="$router.push('/tools')">
                    <i-ep-arrow-left /> 返回课堂工具
                </el-button>
            </div>
        </div>

        <div class="main-panel">
            <div class="display-card">
                <div class="time-display">{{ display }}</div>
                <el-progress :percentage="progress" :stroke-width="10" :show-text="false" status="success" />
            </div>

            <div class="inputs">
                <el-input-number v-model="minutesInput" :min="0" :max="999" :step="1" size="large" />
                <span class="sep">分</span>
                <el-input-number v-model="secondsInput" :min="0" :max="59" :step="5" size="large" />
                <span class="sep">秒</span>
            </div>

            <div class="presets">
                <el-button class="preset" @click="setPreset(1)">1 分钟</el-button>
                <el-button class="preset" @click="setPreset(3)">3 分钟</el-button>
                <el-button class="preset" @click="setPreset(5)">5 分钟</el-button>
                <el-button class="preset" @click="setPreset(10)">10 分钟</el-button>
                <el-button class="preset" @click="setPreset(15)">15 分钟</el-button>
            </div>

            <div class="controls">
                <el-button size="large" type="primary" class="control-btn" @click="isRunning ? stop() : start()">
                    <template #icon>
                        <i-ep-video-play v-if="!isRunning" />
                        <i-ep-video-pause v-else />
                    </template>
                    {{ isRunning ? '暂停' : '开始' }}
                </el-button>
                <el-button size="large" class="control-btn" @click="reset" :disabled="isRunning">
                    <template #icon>
                        <i-ep-refresh />
                    </template>
                    重置
                </el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.timer-page {
    width: 100%;
    height: 100%;
    padding: 20px;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.title-icon {
    width: 24px;
    height: 24px;
}

.title-text {
    font-size: 18px;
    font-weight: 700;
}

.header-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.main-panel {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    padding-bottom: 120px;
}

.display-card {
    width: 100%;
    border-radius: 18px;
    background: #ffffff;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06), inset 0 0 0 1px #eee;
    padding: 36px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.time-display {
    font-size: 56px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #111111;
}

.inputs {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.sep {
    color: #666;
    padding: 0 4px;
}

.presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.preset {
    min-width: 96px;
}

.controls {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    align-items: center;
}

.control-btn {
    height: 54px;
}

@media (max-width: 900px) {
    .timer-page {
        padding: 16px;
    }
    .time-display {
        font-size: 44px;
    }
}

@media (max-width: 480px) {
    .timer-page {
        padding: 12px;
    }
    .display-card {
        border-radius: 14px;
        padding: 26px 16px;
    }
    .time-display {
        font-size: 32px;
    }
}
</style>


