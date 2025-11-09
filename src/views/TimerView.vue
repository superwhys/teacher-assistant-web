<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'

defineOptions({
    name: 'TimerView'
})

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
        <div class="content-area">
            <div class="main-panel">
                <div class="display-card">
                    <div class="time-display">{{ display }}</div>
                    <el-progress :percentage="progress" :stroke-width="10" :show-text="false" status="success" />
                </div>
            </div>
        </div>

        <div class="bottom-actions">
            <div class="presets-row">
                <el-button class="preset-btn" @click="setPreset(1)">1 分钟</el-button>
                <el-button class="preset-btn" @click="setPreset(3)">3 分钟</el-button>
                <el-button class="preset-btn" @click="setPreset(5)">5 分钟</el-button>
                <el-button class="preset-btn" @click="setPreset(10)">10 分钟</el-button>
                <el-button class="preset-btn" @click="setPreset(15)">15 分钟</el-button>
            </div>

            <div class="inputs-row">
                <el-input-number v-model="minutesInput" :min="0" :max="999" :step="1" size="large" 
                    :disabled="isRunning" class="time-input" />
                <span class="sep">分</span>
                <el-input-number v-model="secondsInput" :min="0" :max="59" :step="5" size="large" 
                    :disabled="isRunning" class="time-input" />
                <span class="sep">秒</span>
            </div>

            <div class="controls-row">
                <el-button size="large" type="primary" class="control-btn" @click="isRunning ? stop() : start()">
                    <i-ep-video-play v-if="!isRunning" />
                    <i-ep-video-pause v-else />
                    {{ isRunning ? '暂停' : '开始' }}
                </el-button>
                <el-button size="large" class="control-btn" @click="reset" :disabled="isRunning">
                    <i-ep-refresh />
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
    display: flex;
    flex-direction: column;
    padding: 0;
}

.content-area {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
    padding-bottom: 16px;
}

.main-panel {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
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

.bottom-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
}

.presets-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.preset-btn {
    min-width: 100px;
    height: 48px;
    font-size: 15px;
}

.inputs-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
}

.time-input {
    width: 120px;
}

.sep {
    color: #666;
    font-size: 16px;
    font-weight: 500;
}

.controls-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
}

.control-btn {
    min-width: 140px;
    height: 56px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
}

@media (max-width: 768px) {
    .content-area {
        padding: 16px;
    }

    .time-display {
        font-size: 44px;
    }

    .presets-row {
        width: 100%;
    }

    .preset-btn {
        flex: 1;
        min-width: 80px;
    }

    .controls-row {
        width: 100%;
        flex-direction: column;
    }

    .control-btn {
        width: 100%;
        min-width: unset;
    }

    .bottom-actions {
        padding: 16px;
    }
}

@media (max-width: 480px) {
    .content-area {
        padding: 12px;
    }

    .display-card {
        border-radius: 14px;
        padding: 26px 16px;
    }

    .time-display {
        font-size: 32px;
    }

    .preset-btn {
        height: 44px;
        font-size: 14px;
        min-width: 70px;
    }

    .control-btn {
        height: 50px;
        font-size: 15px;
    }

    .time-input {
        width: 100px;
    }

    .sep {
        font-size: 14px;
    }
}
</style>


