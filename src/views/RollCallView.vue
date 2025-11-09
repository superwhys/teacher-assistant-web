<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import type { Student } from '@/types/student'

defineOptions({
    name: 'RollCallView'
})

const classStore = useClassStore()
const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()

const activeClassId = computed(() => classStore.activeClassId)
const students = computed<Student[]>(() => activeClassId.value ? studentStore.listByClassId(activeClassId.value) : [])
const groupsOfActive = computed(() => activeClassId.value ? groupStore.listByClassId(activeClassId.value) : [])
const selectedGroupId = ref<string>('')

const isRolling = ref(false)
const noRepeat = ref(true)
const currentName = ref<string>('')
const usedNames = ref<Set<string>>(new Set())
const history = ref<string[]>([])

let timer: number | undefined

function getCandidates(): Student[] {
    const baseList = students.value
    let list = baseList
    if (selectedGroupId.value) {
        const g = groupsOfActive.value.find(x => x.id === selectedGroupId.value)
        if (g) {
            const memberSet = new Set(g.members)
            list = baseList.filter(s => memberSet.has(s.studentName))
        }
    }
    if (!noRepeat.value) return list
    const filtered = list.filter(s => !usedNames.value.has(s.studentName))
    return filtered.length > 0 ? filtered : list
}

function pickRandomOne(): Student | null {
    const list = getCandidates()
    if (list.length === 0) return null
    const idx = Math.floor(Math.random() * list.length)
    return list[idx] ?? null
}

function startRolling() {
    if (!activeClassId.value) {
        ElMessage.error('请先在底部选择一个班级')
        return
    }
    const candidates = getCandidates()
    if (candidates.length === 0) {
        ElMessage.warning(selectedGroupId.value ? '该分组暂无成员' : '当前班级还没有学生')
        return
    }
    if (isRolling.value) return
    isRolling.value = true
    timer = window.setInterval(() => {
        const one = pickRandomOne()
        currentName.value = one ? one.studentName : ''
    }, 60)
}

function stopRolling() {
    if (!isRolling.value) return
    isRolling.value = false
    if (timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
    }
    if (currentName.value) {
        if (noRepeat.value) usedNames.value.add(currentName.value)
        history.value.unshift(currentName.value)
    }
}

function toggleRolling() {
    isRolling.value ? stopRolling() : startRolling()
}

function drawOnce() {
    if (!activeClassId.value) {
        ElMessage.error('请先在底部选择一个班级')
        return
    }
    if (isRolling.value) return
    const one = pickRandomOne()
    if (!one) {
        ElMessage.warning('没有可抽取的学生')
        return
    }
    currentName.value = one.studentName
    if (noRepeat.value) usedNames.value.add(one.studentName)
    history.value.unshift(one.studentName)
}

function resetHistory() {
    usedNames.value = new Set()
    history.value = []
    currentName.value = ''
}

watch(selectedGroupId, () => {
    resetHistory()
})

watch(activeClassId, () => {
    selectedGroupId.value = ''
    resetHistory()
})

onBeforeUnmount(() => {
    if (timer !== undefined) window.clearInterval(timer)
})
</script>

<template>
    <div class="roll-page">
        <div class="content-area">
            <div class="main-panel">
                <div class="display-card">
                    <div class="display-name" :class="{ placeholder: !currentName }">
                        {{ currentName || '准备就绪' }}
                    </div>
                    <div class="sub-info">
                        <el-text type="info">
                            班级：{{ activeClassId ? (classStore.activeClass?.name || '未命名班级') : '未选择班级' }}
                        </el-text>
                    </div>
                </div>

                <div class="history" v-if="history.length">
                    <div class="history-title">抽取历史</div>
                    <div class="history-list">
                        <el-tag v-for="name in history" :key="name" round class="history-tag">{{ name }}</el-tag>
                    </div>
                </div>
            </div>
        </div>

        <div class="bottom-actions">
            <div class="controls-row">
                <el-button size="large" type="primary" class="control-btn" @click="toggleRolling">
                    <i-ep-video-play v-if="!isRolling" />
                    <i-ep-video-pause v-else />
                    {{ isRolling ? '停止' : '开始抽取' }}
                </el-button>
                <el-button size="large" class="control-btn" @click="drawOnce" :disabled="isRolling">
                    <i-ep-magic-stick />
                    抽取1人
                </el-button>
                <el-button size="large" class="control-btn" @click="resetHistory" :disabled="isRolling && history.length === 0">
                    <i-ep-refresh />
                    重置
                </el-button>
            </div>
            <div class="settings-row">
                <el-select v-model="selectedGroupId" placeholder="选择分组（可选）" :disabled="!activeClassId" 
                    size="large" clearable class="group-select">
                    <el-option label="全部学生" value="" />
                    <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`" :value="g.id" />
                </el-select>
                <div class="switcher">
                    <el-switch v-model="noRepeat" active-text="不重复抽取" inactive-text="允许重复" size="large" />
                </div>
            </div>
        </div>
    </div>
    
</template>

<style scoped>
.roll-page {
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
}

.display-name {
    font-size: 56px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #111111;
    min-height: 1.2em;
    transition: transform .15s ease;
}

.display-name.placeholder {
    color: #c5c5c5;
}

.sub-info {
    margin-top: 10px;
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

.settings-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
}

.group-select {
    min-width: 240px;
}

.switcher {
    display: flex;
    align-items: center;
}

.history {
    width: 100%;
}

.history-title {
    font-size: 14px;
    color: #666666;
    margin-bottom: 8px;
}

.history-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.history-tag {
    background: #f5f7ff;
}

@media (max-width: 768px) {
    .content-area {
        padding: 16px;
    }

    .display-name {
        font-size: 44px;
    }

    .controls-row {
        flex-direction: column;
        width: 100%;
    }

    .control-btn {
        width: 100%;
        min-width: unset;
    }

    .settings-row {
        flex-direction: column;
        width: 100%;
        gap: 12px;
    }

    .group-select {
        width: 100%;
    }

    .switcher {
        width: 100%;
        justify-content: center;
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

    .display-name {
        font-size: 32px;
    }

    .control-btn {
        height: 50px;
        font-size: 15px;
    }
}
</style>


