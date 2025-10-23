<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import type { Student } from '@/types/student'

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
        <div class="header-row">
            <div class="title">
                <i-ep-user class="title-icon" />
                <span class="title-text">点名器</span>
            </div>
            <div class="header-actions">
                <el-button type="default" plain @click="$router.push('/tools')">
                    <i-ep-arrow-left /> 返回课堂工具
                </el-button>
            </div>
        </div>

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

            <div class="controls">
                <el-button size="large" type="primary" class="control-btn" @click="toggleRolling">
                    <template #icon>
                        <i-ep-video-play v-if="!isRolling" />
                        <i-ep-video-pause v-else />
                    </template>
                    {{ isRolling ? '停止' : '开始抽取' }}
                </el-button>
                <el-button size="large" class="control-btn" @click="drawOnce" :disabled="isRolling">
                    <template #icon>
                        <i-ep-magic-stick />
                    </template>
                    抽取1人
                </el-button>
                <el-button size="large" class="control-btn" @click="resetHistory" :disabled="isRolling && history.length === 0">
                    <template #icon>
                        <i-ep-refresh />
                    </template>
                    重置
                </el-button>
                <div class="group-select">
                    <el-select v-model="selectedGroupId" placeholder="选择分组（可选）" :disabled="!activeClassId" size="large" clearable>
                        <el-option label="全部学生" value="" />
                        <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`" :value="g.id" />
                    </el-select>
                </div>
                <div class="switcher">
                    <el-switch v-model="noRepeat" active-text="不重复抽取" inactive-text="允许重复" />
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
    
</template>

<style scoped>
.roll-page {
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

.header-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
}

.title-icon {
    width: 24px;
    height: 24px;
}

.title-text {
    font-size: 18px;
    font-weight: 700;
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

.controls {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    align-items: center;
}

.control-btn {
    height: 54px;
}

.switcher {
    grid-column: 1 / -1;
    display: flex;
    justify-content: center;
}

.group-select {
    grid-column: 1 / -1;
    display: flex;
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

@media (max-width: 900px) {
    .roll-page {
        padding: 16px;
    }
    .display-name {
        font-size: 44px;
    }
}

@media (max-width: 480px) {
    .roll-page {
        padding: 12px;
    }
    .display-card {
        border-radius: 14px;
        padding: 26px 16px;
    }
    .display-name {
        font-size: 32px;
    }
    .controls {
        grid-template-columns: 1fr 1fr;
    }
}
</style>


