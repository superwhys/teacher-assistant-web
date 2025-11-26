<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import { usePointsStore } from '@/stores/pointsStore'
import type { PointsItem } from '@/types/pointsItem'
import PointsItemSelectorDialog from '@/components/PointsItemSelectorDialog.vue'
import PointsHeaderActions from '@/components/PointsHeaderActions.vue'
import PointsRankingCard from '@/components/PointsRankingCard.vue'
import PointsItemRankingCard from '@/components/PointsItemRankingCard.vue'
import { pinyin } from 'pinyin-pro'

defineOptions({
    name: 'PointsView'
})

const classStore = useClassStore()
const studentStore = useStudentStore()
const groupStore = useStudentGroupStore()
const pointsStore = usePointsStore()

const isRankingCollapsed = ref(false)
const isRankingAnimating = ref(false)
const showRankingContent = ref(true)
const activeRankingTab = ref('total')
const windowWidth = ref(window.innerWidth)

function handleResize() {
    windowWidth.value = window.innerWidth
    if (windowWidth.value <= 768) {
        isRankingCollapsed.value = false
        showRankingContent.value = true
    }
}

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})

watch(isRankingCollapsed, (val) => {
    localStorage.setItem('ranking-collapsed', String(val))
})

function toggleRanking() {
    if (isRankingAnimating.value) return

    isRankingAnimating.value = true

    if (isRankingCollapsed.value) {
        isRankingCollapsed.value = false
        setTimeout(() => {
            showRankingContent.value = true
            isRankingAnimating.value = false
        }, 300)
    } else {
        showRankingContent.value = false
        setTimeout(() => {
            isRankingCollapsed.value = true
            isRankingAnimating.value = false
        }, 50)
    }
}

const activeClass = computed(() => classStore.activeClass)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})

const studentsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? studentStore.listByClassId(id) : []
})

const groupsOfActive = computed(() => {
    const id = activeClassId.value
    return id ? groupStore.listByClassId(id) : []
})

const pointsMap = computed(() => pointsStore.getPointsOf(activeClassId.value))

const availablePointsMap = computed(() => {
    const map: Record<string, number> = {}
    const rawMap = pointsMap.value
    for (const name in rawMap) {
        const points = rawMap[name]
        if (points) {
            map[name] = points.available
        }
    }
    return map
})

const totalPointsMap = computed(() => {
    const map: Record<string, number> = {}
    const rawMap = pointsMap.value
    for (const name in rawMap) {
        const points = rawMap[name]
        if (points) {
            map[name] = points.total
        }
    }
    return map
})

// 学生搜索
const studentKeyword = ref('')

// 学生排序
type SortOption = 'default' | 'name-asc' | 'name-desc' | 'available-asc' | 'available-desc' | 'total-asc' | 'total-desc'
const sortBy = ref<SortOption>('default')

// 布局模式
type LayoutMode = 'card' | 'list'
const layoutMode = ref<LayoutMode>('card')

onMounted(() => {
    const saved = localStorage.getItem('ranking-collapsed')
    if (windowWidth.value > 768 && saved !== null) {
        isRankingCollapsed.value = saved === 'true'
        showRankingContent.value = !isRankingCollapsed.value
    } else if (windowWidth.value <= 768) {
        isRankingCollapsed.value = false
        showRankingContent.value = true
    }

    const savedSort = localStorage.getItem('students-sort')
    if (savedSort) {
        const validSortOptions: SortOption[] = ['default', 'name-asc', 'name-desc', 'available-asc', 'available-desc', 'total-asc', 'total-desc']
        if (savedSort === 'index') {
            sortBy.value = 'default'
            localStorage.setItem('students-sort', 'default')
        } else if ((validSortOptions as string[]).includes(savedSort)) {
            sortBy.value = savedSort as SortOption
        }
    }

    const savedLayout = localStorage.getItem('points-layout') as LayoutMode | null
    if (savedLayout === 'card' || savedLayout === 'list') {
        layoutMode.value = savedLayout
    }

    const savedTab = localStorage.getItem('ranking-tab')
    if (savedTab) {
        activeRankingTab.value = savedTab
    }

    window.addEventListener('resize', handleResize)
})

watch(activeRankingTab, (val) => {
    localStorage.setItem('ranking-tab', val)
})

watch(sortBy, (val) => {
    localStorage.setItem('students-sort', val)
})

watch(layoutMode, (val) => {
    localStorage.setItem('points-layout', val)
})

function setLayoutMode(mode: LayoutMode) {
    if (layoutMode.value !== mode) {
        layoutMode.value = mode
    }
}

const filteredStudents = computed(() => {
    const keyword = studentKeyword.value.trim().toLowerCase()
    const gid = selectedGroupId.value
    let list = studentsOfActive.value
    if (gid) {
        const g = groupsOfActive.value.find(x => x.id === gid)
        const nameSet = new Set(g?.members ?? [])
        list = list.filter(s => nameSet.has(s.studentName))
    }
    if (keyword) {
        list = list.filter(s => s.studentName.toLowerCase().includes(keyword))
    }

    const sort = sortBy.value
    if (sort === 'default') return list

    const sorted = [...list]
    if (sort === 'name-asc') {
        sorted.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-CN'))
    } else if (sort === 'name-desc') {
        sorted.sort((a, b) => b.studentName.localeCompare(a.studentName, 'zh-CN'))
    } else if (sort === 'available-asc') {
        sorted.sort((a, b) => {
            const aPoints = availablePointsMap.value[a.studentName] ?? 0
            const bPoints = availablePointsMap.value[b.studentName] ?? 0
            return aPoints - bPoints
        })
    } else if (sort === 'available-desc') {
        sorted.sort((a, b) => {
            const aPoints = availablePointsMap.value[a.studentName] ?? 0
            const bPoints = availablePointsMap.value[b.studentName] ?? 0
            return bPoints - aPoints
        })
    } else if (sort === 'total-asc') {
        sorted.sort((a, b) => {
            const aPoints = totalPointsMap.value[a.studentName] ?? 0
            const bPoints = totalPointsMap.value[b.studentName] ?? 0
            return aPoints - bPoints
        })
    } else if (sort === 'total-desc') {
        sorted.sort((a, b) => {
            const aPoints = totalPointsMap.value[a.studentName] ?? 0
            const bPoints = totalPointsMap.value[b.studentName] ?? 0
            return bPoints - aPoints
        })
    }

    return sorted
})

// 分组操作
const selectedGroupId = ref<string | ''>('')

// 批量选择学生
const selectedStudents = ref<string[]>([])

const isIndeterminate = computed(() => {
    return selectedStudents.value.length > 0 && selectedStudents.value.length < filteredStudents.value.length
})

const isAllSelected = computed({
    get: () => {
        return filteredStudents.value.length > 0 && selectedStudents.value.length === filteredStudents.value.length
    },
    set: (val: boolean) => {
        if (val) {
            selectedStudents.value = filteredStudents.value.map(s => s.studentName)
        } else {
            selectedStudents.value = []
        }
    }
})

function toggleStudentSelection(studentName: string) {
    const index = selectedStudents.value.indexOf(studentName)
    if (index > -1) {
        selectedStudents.value.splice(index, 1)
    } else {
        selectedStudents.value.push(studentName)
    }
}

function isStudentSelected(studentName: string) {
    return selectedStudents.value.includes(studentName)
}

function clearSelection() {
    selectedStudents.value = []
}

watch(activeClassId, () => {
    clearSelection()
    selectedGroupId.value = ''
})

watch(selectedGroupId, () => {
    clearSelection()
})

// 分值项选择弹窗
type SelectorTab = 'all' | 'plus' | 'minus'
const selectorVisible = ref(false)
const selectorTab = ref<SelectorTab>('plus')
const selectorTargets = ref<string[]>([])


function openSelectorForStudents(studentNames: string[], tab: SelectorTab) {
    selectorTargets.value = studentNames
    selectorTab.value = tab
    selectorVisible.value = true
}

function openSelectorForAll(tab: SelectorTab) {
    const names = selectedStudents.value.length > 0
        ? selectedStudents.value
        : filteredStudents.value.map(s => s.studentName)

    if (!activeClassId.value || names.length === 0) {
        ElMessage.info('没有可操作的学生')
        return
    }
    openSelectorForStudents(names, tab)
}

function onSelectItem(item: PointsItem) {
    if (!activeClassId.value) return
    const delta = item.sign === 'minus' ? -Math.abs(item.value) : Math.abs(item.value)
    pointsStore.addPoints(activeClassId.value, selectorTargets.value, delta, {
        itemId: item.id,
        itemName: item.name,
        itemSign: item.sign,
        itemValue: item.value,
    })
    selectorVisible.value = false
    const target = selectorTargets.value.length > 3
        ? `${selectorTargets.value.slice(0, 3).join('、')} 等${selectorTargets.value.length}人`
        : selectorTargets.value.join('、')
    ElMessage.success(`已对「${target}」${delta > 0 ? '加' : '减'}${Math.abs(delta)} 分（${item.name}）`)

    if (selectedStudents.value.length > 0) {
        clearSelection()
    }
}

// 撤回最近一次操作
function undoOnce() {
    if (!activeClassId.value) return
    const action = pointsStore.undoLast(activeClassId.value)
    if (!action) {
        ElMessage.info('没有可撤回的操作')
        return
    }
    const target = action.studentNames.length > 3
        ? `${action.studentNames.slice(0, 3).join('、')} 等${action.studentNames.length}人`
        : action.studentNames.join('、')
    ElMessage.success(`已撤回对「${target}」${action.delta > 0 ? '加' : '减'}${Math.abs(action.delta)} 分`)
}

// 获取学生姓名首字母
function getFirstLetter(name: string): string {
    if (!name || name.length === 0) {
        return '#'
    }

    const firstChar = name.charAt(0)
    // 判断是否为英文字母
    if (/[a-zA-Z]/.test(firstChar)) {
        return firstChar.toUpperCase()
    }

    // 对于中文字符，使用 pinyin-pro 获取拼音首字母
    try {
        const py = pinyin(firstChar, { toneType: 'none', type: 'array' })
        if (Array.isArray(py) && py.length > 0) {
            const firstPinyin = py[0]
            if (typeof firstPinyin === 'string' && firstPinyin.length > 0) {
                return firstPinyin.charAt(0).toUpperCase()
            }
        }
    } catch (error) {
        console.warn('Failed to get pinyin for character:', firstChar, error)
    }

    // 对于其他字符，统一归为'#'
    return '#'
}

// 按首字母分组学生
const studentsGroupedByLetter = computed(() => {
    if (layoutMode.value !== 'list') {
        return []
    }

    const groups: Record<string, typeof studentsOfActive.value> = {}
    const lettersInOrder: string[] = []
    const students = filteredStudents.value

    students.forEach(student => {
        const letter = getFirstLetter(student.studentName)
        if (!groups[letter]) {
            groups[letter] = []
            lettersInOrder.push(letter)
        }
        groups[letter]!.push(student)
    })

    return lettersInOrder.map(letter => ({
        letter,
        students: groups[letter]!
    }))
})

// 所有可用的字母索引
const availableLetters = computed(() => {
    const letters = studentsGroupedByLetter.value.map(group => group.letter)
    return letters.slice().sort((a, b) => {
        if (a === b) return 0
        if (a === '#') return 1
        if (b === '#') return -1
        return a.localeCompare(b)
    })
})

// 滚动到指定字母分组
function scrollToLetter(letter: string) {
    const element = document.getElementById(`letter-group-${letter}`)
    if (element) {
        // 获取list-card的滚动容器
        const scrollContainer = element.closest('.list-card')?.querySelector('.el-card__body') as HTMLElement | null
        if (scrollContainer) {
            // 计算相对于滚动容器的位置
            const containerRect = scrollContainer.getBoundingClientRect()
            const elementRect = element.getBoundingClientRect()
            const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - 20 // 减去一些偏移量
            scrollContainer.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
            })
        }
    }
}

</script>

<template>
    <div class="points-page">
        <div class="content-area" :class="{ 'ranking-collapsed': isRankingCollapsed }">
            <div class="ranking-column">
                <Transition name="ranking-fade">
                    <div v-show="showRankingContent" class="ranking-container">
                        <el-tabs v-model="activeRankingTab" class="ranking-tabs" stretch>
                            <el-tab-pane label="总积分榜" name="total">
                                <PointsRankingCard :students="studentsOfActive" :points-map="totalPointsMap" :max-display="10" />
                            </el-tab-pane>
                            <el-tab-pane label="单项榜" name="item">
                                <PointsItemRankingCard :students="studentsOfActive" :class-id="activeClassId" :max-display="10" />
                            </el-tab-pane>
                        </el-tabs>
                    </div>
                </Transition>
            </div>

            <button class="ranking-toggle-btn" @click="toggleRanking" :title="isRankingCollapsed ? '展开排行榜' : '收起排行榜'">
                <i-ep-d-arrow-right v-if="isRankingCollapsed" />
                <i-ep-d-arrow-left v-else />
            </button>

            <div class="list-column">
                <div v-if="layoutMode === 'list' && studentsGroupedByLetter.length > 0" class="index-container">
                    <div class="letter-index">
                        <div v-for="letter in availableLetters" :key="letter" class="index-item"
                            @click="scrollToLetter(letter)">
                            {{ letter }}
                        </div>
                    </div>
                </div>
                <el-card shadow="never"
                    :class="['list-card', 'list-content', { 'is-list-mode': layoutMode === 'list' }]">
                    <template #header>
                        <div class="list-header">
                            <span v-if="activeClass" class="class-name">{{ activeClass.name }}</span>
                            <span v-else>学生积分</span>
                            <div class="header-actions">
                                <el-checkbox v-if="activeClass && filteredStudents.length > 0" v-model="isAllSelected"
                                    :indeterminate="isIndeterminate" class="select-all-checkbox" border>全选</el-checkbox>
                                <div class="layout-toggle">
                                    <el-button-group>
                                        <el-button :class="['layout-btn', { 'is-active': layoutMode === 'card' }]"
                                            size="small" :type="layoutMode === 'card' ? 'primary' : undefined"
                                            :plain="layoutMode !== 'card'" @click="setLayoutMode('card')">
                                            <i-ep-grid />
                                        </el-button>
                                        <el-button :class="['layout-btn', { 'is-active': layoutMode === 'list' }]"
                                            size="small" :type="layoutMode === 'list' ? 'primary' : undefined"
                                            :plain="layoutMode !== 'list'" @click="setLayoutMode('list')">
                                            <i-ep-list />
                                        </el-button>
                                    </el-button-group>
                                </div>
                                <PointsHeaderActions :active-class-id="activeClassId"
                                    :active-class-name="activeClass?.name || '未命名班级'" />
                            </div>
                        </div>
                    </template>

                    <div v-if="activeClass">
                        <div v-if="studentsOfActive.length > 0">
                            <div v-if="filteredStudents.length > 0">
                                <template v-if="layoutMode === 'list'">
                                    <div v-for="group in studentsGroupedByLetter" :key="group.letter"
                                        :id="`letter-group-${group.letter}`" class="letter-group">
                                        <div class="letter-header">{{ group.letter }}</div>
                                        <div class="student-list">
                                            <div v-for="s in group.students" :key="s.studentName" :class="[
                                                'student-row',
                                                'list-mode',
                                                { 'is-selected': isStudentSelected(s.studentName) }
                                            ]" @click="toggleStudentSelection(s.studentName)">
                                                <div :class="['avatar', s.gender]">
                                                    <i-ep-male v-if="s.gender === 'male'" />
                                                    <i-ep-female v-else />
                                                </div>
                                                <div class="info">
                                                    <div class="name">{{ s.studentName }}</div>
                                                    <div class="points-info list">
                                                        <div class="score available">{{
                                                            availablePointsMap[s.studentName] ?? 0 }}</div>
                                                        <div class="score-label">可用</div>
                                                        <div class="score total">{{ totalPointsMap[s.studentName] ?? 0
                                                            }}</div>
                                                        <div class="score-label">总分</div>
                                                    </div>
                                                </div>
                                                <div class="ops" @click.stop>
                                                    <el-button class="op" type="primary" plain size="small"
                                                        @click="openSelectorForStudents([s.studentName], 'plus')">
                                                        <i-ep-plus />
                                                    </el-button>
                                                    <el-button class="op" type="danger" plain size="small"
                                                        @click="openSelectorForStudents([s.studentName], 'minus')">
                                                        <i-ep-minus />
                                                    </el-button>
                                                    <el-button class="op" type="default" plain size="small"
                                                        @click="$router.push({ path: '/points/history', query: { q: s.studentName } })">
                                                        <i-ep-document />
                                                    </el-button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                                <template v-else>
                                    <div class="student-grid">
                                        <div v-for="s in filteredStudents" :key="s.studentName" :class="[
                                            'student-row',
                                            'card-mode',
                                            { 'is-selected': isStudentSelected(s.studentName) }
                                        ]" @click="toggleStudentSelection(s.studentName)">
                                            <div :class="['avatar', s.gender]">
                                                <i-ep-male v-if="s.gender === 'male'" />
                                                <i-ep-female v-else />
                                            </div>
                                            <div class="info">
                                                <div class="name">{{ s.studentName }}</div>
                                                <div class="points-info">
                                                    <div class="score available">{{ availablePointsMap[s.studentName] ??
                                                        0 }}</div>
                                                    <div class="score-label">可用</div>
                                                    <div class="score total">{{ totalPointsMap[s.studentName] ?? 0 }}
                                                    </div>
                                                    <div class="score-label">总分</div>
                                                </div>
                                            </div>
                                            <div class="ops" @click.stop>
                                                <el-button class="op" type="primary" plain size="small"
                                                    @click="openSelectorForStudents([s.studentName], 'plus')"><i-ep-plus />
                                                    加分</el-button>
                                                <el-button class="op" type="danger" plain size="small"
                                                    @click="openSelectorForStudents([s.studentName], 'minus')"><i-ep-minus />
                                                    扣分</el-button>
                                                <el-button class="op" type="default" plain size="small"
                                                    @click="$router.push({ path: '/points/history', query: { q: s.studentName } })"><i-ep-document />
                                                    记录</el-button>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                            </div>
                            <div v-else class="empty empty-students">
                                <i-ep-user class="empty-icon" />
                                <div class="empty-title">没有匹配的学生</div>
                                <div class="empty-sub">请修改搜索关键词</div>
                            </div>
                        </div>
                        <div v-else class="empty empty-students">
                            <i-ep-user class="empty-icon" />
                            <div class="empty-title">还没有学生</div>
                            <div class="empty-sub">请先在班级管理中添加学生</div>
                        </div>
                    </div>
                    <div v-else class="empty">
                        <i-ep-school class="empty-icon" />
                        <div class="empty-title">还没有班级</div>
                        <div class="empty-sub">请先创建一个班级</div>
                    </div>
                </el-card>
            </div>
        </div>

        <div class="bottom-actions">
            <div class="filter-row">
                <el-select v-model="selectedGroupId" placeholder="全部学生" class="group-filter" :disabled="!activeClassId"
                    clearable size="large">
                    <el-option label="全部学生" value="" />
                    <el-option v-for="g in groupsOfActive" :key="g.id" :label="`${g.name}（${g.members.length}）`"
                        :value="g.id" />
                </el-select>
                <el-select v-model="sortBy" placeholder="排序方式" class="sort-filter" :disabled="!activeClassId"
                    size="large">
                    <el-option label="默认排序" value="default" />
                    <el-option label="姓名 A-Z" value="name-asc">
                        <div class="sort-option">
                            <i-ep-sort-up />
                            <span>姓名 A-Z</span>
                        </div>
                    </el-option>
                    <el-option label="姓名 Z-A" value="name-desc">
                        <div class="sort-option">
                            <i-ep-sort-down />
                            <span>姓名 Z-A</span>
                        </div>
                    </el-option>
                    <el-option label="可用积分 ↑" value="available-asc">
                        <div class="sort-option">
                            <i-ep-sort-up />
                            <span>可用积分 ↑</span>
                        </div>
                    </el-option>
                    <el-option label="可用积分 ↓" value="available-desc">
                        <div class="sort-option">
                            <i-ep-sort-down />
                            <span>可用积分 ↓</span>
                        </div>
                    </el-option>
                    <el-option label="总积分 ↑" value="total-asc">
                        <div class="sort-option">
                            <i-ep-sort-up />
                            <span>总积分 ↑</span>
                        </div>
                    </el-option>
                    <el-option label="总积分 ↓" value="total-desc">
                        <div class="sort-option">
                            <i-ep-sort-down />
                            <span>总积分 ↓</span>
                        </div>
                    </el-option>
                </el-select>
                <el-input v-model="studentKeyword" class="search-input" placeholder="搜索学生" clearable size="large">
                    <template #prefix>
                        <i-ep-search />
                    </template>
                </el-input>
            </div>

            <div class="main-actions-row">
                <el-button size="large" type="primary" class="action-btn"
                    :disabled="!activeClassId || filteredStudents.length === 0" @click="openSelectorForAll('plus')">
                    <template #icon>
                        <i-ep-plus />
                    </template>
                    {{ selectedStudents.length > 0 ? `批量加分（${selectedStudents.length}）` : '全体加分' }}
                </el-button>
                <el-button v-if="selectedStudents.length > 0" size="large" type="info" plain class="clear-btn"
                    @click="clearSelection">
                    <template #icon>
                        <i-ep-close />
                    </template>
                    清空
                </el-button>
                <el-button v-else size="large" type="warning" plain class="undo-btn" :disabled="!activeClassId"
                    @click="undoOnce">
                    <template #icon>
                        <i-ep-refresh-left />
                    </template>
                    撤回
                </el-button>
                <el-button size="large" type="danger" class="action-btn"
                    :disabled="!activeClassId || filteredStudents.length === 0" @click="openSelectorForAll('minus')">
                    <template #icon>
                        <i-ep-minus />
                    </template>
                    {{ selectedStudents.length > 0 ? `批量扣分（${selectedStudents.length}）` : '全体扣分' }}
                </el-button>
            </div>
        </div>

        <PointsItemSelectorDialog v-model="selectorVisible" v-model:tab="selectorTab" @select="onSelectItem" />
    </div>
</template>

<style scoped>
.points-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 0;
}

.content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    padding-bottom: 16px;
    display: grid;
    grid-template-columns: 360px auto 1fr;
    gap: 0;
    transition: grid-template-columns 0.3s ease;
}

.content-area.ranking-collapsed {
    grid-template-columns: 0px auto 1fr;
}

.ranking-column {
    height: 100%;
    overflow: hidden;
    transition: all 0.3s ease;
    padding-right: 8px;
}

.ranking-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.ranking-tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.ranking-tabs :deep(.el-tabs__header) {
    margin: 0;
    background: #fafbff;
    border-bottom: 1px solid #e6e8f0;
}

.ranking-tabs :deep(.el-tabs__nav-wrap::after) {
    height: 1px;
    background-color: #e6e8f0;
}

.ranking-tabs :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0;
}

.ranking-tabs :deep(.el-tab-pane) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.ranking-tabs :deep(.ranking-card) {
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
}

.ranking-fade-enter-active {
    transition: opacity 0.2s ease 0.1s;
}

.ranking-fade-leave-active {
    transition: opacity 0.15s ease;
}

.ranking-fade-enter-from,
.ranking-fade-leave-to {
    opacity: 0;
}

.ranking-toggle-btn {
    width: 32px;
    height: 80px;
    border: none;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.04);
    color: #999;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    padding: 0;
}

.ranking-toggle-btn :deep(.el-icon) {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.04);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.ranking-toggle-btn:hover {
    color: #667eea;
}

.ranking-toggle-btn:hover :deep(.el-icon) {
    background: rgba(102, 126, 234, 0.08);
    transform: scale(1.1);
}

.ranking-toggle-btn:active :deep(.el-icon) {
    transform: scale(0.95);
}

.list-column {
    height: 100%;
    overflow: hidden;
    margin-left: 12px;
    display: flex;
    flex-direction: row;
    min-width: 0;
}

.list-content {
    flex: 1;
    min-width: 0;
}

.index-container {
    width: 32px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-right: 12px;
}

.letter-index {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
}

.index-item {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.index-item:hover {
    background-color: #f0f0f0;
    color: #333;
}

.letter-group {
    margin-bottom: 20px;
}

.letter-header {
    font-size: 18px;
    font-weight: 700;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e6e8f0;
}

.ranking-collapsed+.ranking-toggle-btn {
    margin-left: 12px;
}

.list-card {
    height: 100%;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
}

.list-card :deep(.el-card__body) {
    flex: 1;
    overflow-y: auto;
}

.is-list-mode :deep(.el-card__body) {
    overflow-x: auto;
}

.is-list-mode .student-row.list-mode {
    min-width: 640px;
}

.card-title {
    font-size: 18px;
    font-weight: 700;
}

.group-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.group-select {
    width: 100%;
}

.group-actions {
    display: flex;
    gap: 10px;
}

.selector-tabs {
    margin-bottom: 8px;
}

.item-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 60vh;
    overflow: auto;
}

.group-block {
    border-top: 1px solid #f0f0f0;
    padding-top: 8px;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    padding: 6px 2px;
}

.group-icon {
    font-size: 18px;
}

.items {
    display: flex;
    flex-direction: column;
}

.item-row {
    display: grid;
    grid-template-columns: 1fr auto 16px;
    align-items: center;
    padding: 10px 6px;
    border-bottom: 1px solid #f5f5f5;
    cursor: pointer;
    border-radius: 8px;
}

.item-row:hover {
    background: rgba(0, 0, 0, 0.03);
}

.item-name {
    font-size: 15px;
}

.item-value {
    font-weight: 700;
}

.item-value.plus {
    color: #1db954;
}

.item-value.minus {
    color: #ef4444;
}

.item-arrow {
    color: #bbb;
}

.item-empty {
    color: #999;
    font-size: 13px;
    padding: 6px;
}

.manage-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
}

.manage-left,
.manage-right {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.manage-block {
    border-radius: 12px;
    padding: 12px;
    background: #fff;
}

.manage-title {
    font-weight: 700;
    margin-bottom: 10px;
}

.manage-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.icon-input {
    width: 120px;
}

.group-name-input {
    flex: 1;
}

.group-radio-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.manage-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 2px 10px;
    border-radius: 999px;
    font-weight: 700;
    background: #f5f7ff;
    color: #2d5cf6;
}

.badge.minus {
    background: #fff2f2;
    color: #ef4444;
}

/* group list */
.group-list {
    border: 1px solid #e6e8f0;
    border-radius: 12px;
    overflow: hidden;
    max-height: 52vh;
    overflow-y: auto;
}

.group-list-header {
    padding: 10px 14px;
    font-weight: 700;
    background: #fafbff;
    border-bottom: 1px solid #eef0f6;
}

.group-item {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    cursor: pointer;
}

.group-item-main {
    display: flex;
    align-items: center;
    gap: 10px;
}

.group-item-ops {
    visibility: visible;
}

.group-item:hover {
    background: #fafafa;
}

.group-item.is-active {
    background: #edf5ff;
}

.group-item+.group-item {
    border-top: 1px solid #f2f2f2;
}

.group-name {
    font-size: 15px;
}

@media (max-width: 900px) {
    .manage-grid {
        grid-template-columns: 1fr;
    }
}

.list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 18px;
    font-weight: 700;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.layout-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
}

.select-all-checkbox {
    margin-right: 0 !important;
    height: 32px;
}

.layout-btn {
    font-weight: 600;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 32px;
    padding: 0;
}

.layout-btn.is-active {
    box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.35);
}

.layout-btn :deep(.el-icon) {
    margin-right: 0;
    font-size: 18px;
}

.class-name {
    color: #333;
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

.filter-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.group-filter {
    flex: 1;
}

.sort-filter {
    flex: 1;
}

.sort-option {
    display: flex;
    align-items: center;
    gap: 8px;
}

.search-input {
    flex: 1;
}

.main-actions-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
}

.action-btn {
    flex: 1;
    max-width: 280px;
    height: 56px;
    font-size: 18px;
    font-weight: 600;
    border-radius: 12px;
}

.undo-btn,
.clear-btn {
    width: 140px;
    height: 56px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
    flex-shrink: 0;
}


.delta-label {
    color: #666;
    font-size: 13px;
}

/* 导入弹窗样式，与添加学生保持一致风格 */
.upload-file-name {
    margin-top: 4px;
    color: var(--el-text-color-regular);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.upload-file-name .file-icon {
    font-size: 16px;
}

.upload-file-name .change-hint {
    color: var(--el-text-color-secondary);
}

.excel-guide {
    margin-top: 8px;
    color: var(--el-text-color-regular);
    font-size: 13px;
}

.guide-title {
    font-weight: 600;
    margin-bottom: 4px;
}

.guide-list {
    padding-left: 18px;
    margin: 0;
}

.excel-preview {
    margin-top: 12px;
    padding: 12px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
}

.preview-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 8px;
}

.preview-title {
    font-weight: 600;
}

.preview-meta {
    width: 100%;
}

.preview-actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.student-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
}

.student-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.student-row {
    padding: 12px;
    border: 2px solid #eee;
    border-radius: 12px;
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
}

.student-row.card-mode {
    display: grid;
    grid-template-columns: 40px 1fr;
    grid-template-rows: auto auto;
    align-items: start;
    gap: 10px;
}

.student-row.list-mode {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
}

.student-row:hover {
    border-color: #d0d0d0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.student-row.is-selected {
    border-color: #667eea;
    background: linear-gradient(135deg, #f5f7ff 0%, #eef2ff 100%);
    box-shadow: 0 2px 12px rgba(102, 126, 234, 0.2);
}

.student-row.is-selected .name {
    color: #667eea;
}

.avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    box-shadow: var(--shadow-light);
}

.avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.student-row.list-mode .info {
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.student-row.list-mode .name {
    flex: 0 0 auto;
    min-width: 3em;
    max-width: 3em;
}

.student-row.list-mode .points-info.list {
    margin-left: 0;
}

.name {
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.points-info {
    display: flex;
    align-items: center;
    gap: 6px;
}

.points-info.list {
    gap: 12px;
    white-space: nowrap;
}

.score {
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 14px;
}

.score.available {
    background: #f5f7ff;
    color: #2d5cf6;
}

.score.total {
    background: #fff7ed;
    color: #ea580c;
}

.score-label {
    font-size: 12px;
    color: #666;
}

.student-row.card-mode .ops {
    grid-column: 1 / -1;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e6e8f0;
}

.student-row.list-mode .ops {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    align-items: center;
}

.op {
    flex: 1;
    height: 40px;
    border-radius: 24px;
}

.student-row.list-mode .op {
    flex: none;
    min-width: 96px;
}

.op :deep(.el-icon) {
    margin-right: 4px;
}

.empty {
    padding: 48px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #888;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 8px;
    color: #c6c6c6;
}

.empty-students {
    padding: 64px 12px;
}

@media (max-width: 1024px) {
    .content-area {
        grid-template-columns: 300px auto 1fr;
    }

    .content-area.ranking-collapsed {
        grid-template-columns: 0px auto 1fr;
    }

    .ranking-toggle-btn {
        width: 28px;
    }

    .list-column {
        margin-left: 10px;
        flex-direction: row;
    }

    .index-container {
        width: 32px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin-right: 12px;
    }

    .letter-index {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 0;
    }

    .index-item {
        width: 24px;
        height: 24px;
        font-size: 12px;
    }

    .ranking-collapsed+.ranking-toggle-btn {
        margin-left: 10px;
    }
}

@media (max-width: 768px) {
    .content-area {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        gap: 12px;
    }

    .content-area.ranking-collapsed {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
    }

    .ranking-column {
        display: none;
        max-height: 350px;
        padding-right: 0;
    }

    .ranking-toggle-btn {
        display: none;
    }

    .list-column {
        margin-left: 0;
    }

    .bottom-actions {
        padding: 14px;
        gap: 10px;
    }

    .filter-row {
        gap: 8px;
    }

    .main-actions-row {
        gap: 10px;
    }

    .action-btn {
        max-width: 180px;
        height: 50px;
        font-size: 16px;
    }

    .undo-btn,
    .clear-btn {
        width: 100px;
        height: 50px;
        font-size: 14px;
    }

    .student-grid {
        grid-template-columns: 1fr;
    }

    .student-row.list-mode {
        grid-template-columns: 44px 1fr auto;
        gap: 12px;
        padding: 12px;
    }

    .student-row.list-mode .points-info.list {
        gap: 10px;
        flex-wrap: nowrap;
    }

    .student-row.list-mode .op {
        min-width: 88px;
        padding: 0 10px;
    }
}

@media (max-width: 640px) {
    .ranking-column {
        display: none;
        max-height: 320px;
    }

    .filter-row {
        gap: 8px;
    }

    .group-filter {
        min-width: 0;
        flex: 1;
    }

    .sort-filter {
        min-width: 0;
        flex: 1;
    }

    .search-input {
        min-width: 0;
        flex: 1;
    }

    .main-actions-row {
        gap: 8px;
    }

    .action-btn {
        flex: 1;
        max-width: none;
        height: 48px;
        font-size: 15px;
    }

    .undo-btn,
    .clear-btn {
        width: 85px;
        height: 48px;
        font-size: 13px;
    }

    .student-row.list-mode {
        grid-template-columns: 44px 1fr auto;
        align-items: center;
        gap: 8px;
    }

    .student-row.list-mode .points-info.list {
        gap: 8px;
    }

    .student-row.list-mode .ops {
        grid-column: auto;
        width: auto;
        justify-content: flex-end;
    }

    .student-row.list-mode .op {
        flex: 1;
        min-width: 0;
    }
}

@media (max-width: 480px) {
    .ranking-column {
        display: none;
        max-height: 280px;
    }

    .bottom-actions {
        padding: 10px;
        gap: 8px;
    }

    .filter-row {
        gap: 6px;
    }

    .main-actions-row {
        gap: 6px;
    }

    .action-btn {
        height: 46px;
        font-size: 14px;
        padding: 0 12px;
    }

    .undo-btn,
    .clear-btn {
        width: 75px;
        height: 46px;
        font-size: 12px;
        padding: 0 8px;
    }

    .student-row {
        padding: 10px;
    }

    .student-row.card-mode {
        gap: 8px;
    }

    .student-row.list-mode {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        gap: 8px;
        align-items: start;
    }

    .student-row.card-mode .ops,
    .student-row.list-mode .ops {
        gap: 8px;
        margin-top: 10px;
        padding-top: 10px;
    }

    .student-row.list-mode .op {
        flex: 1;
        min-width: 0;
    }

    .op {
        height: 38px;
        font-size: 13px;
        padding: 0 8px;
    }
}

@media (max-width: 420px) {
    .action-btn {
        font-size: 14px;
        padding: 0 10px;
    }

    .undo-btn,
    .clear-btn {
        width: 70px;
        font-size: 12px;
    }

    .student-row.list-mode .points-info.list {
        gap: 6px;
    }

    .student-row.list-mode .ops {
        gap: 6px;
        width: 100%;
    }

    .student-row.list-mode .op {
        flex: 1;
        min-width: 0;
    }
}

@media (max-width: 390px) {
    .ranking-column {
        display: none;
        max-height: 260px;
    }

    .bottom-actions {
        padding: 8px;
        gap: 6px;
    }

    .filter-row {
        flex-direction: column;
        gap: 6px;
    }

    .group-filter,
    .sort-filter,
    .search-input {
        width: 100%;
    }

    .group-filter :deep(.el-input__wrapper),
    .sort-filter :deep(.el-input__wrapper),
    .search-input :deep(.el-input__wrapper) {
        padding: 8px 12px;
    }

    .main-actions-row {
        gap: 6px;
    }

    .action-btn {
        height: 44px;
        font-size: 13px;
        padding: 0 8px;
    }

    .undo-btn,
    .clear-btn {
        width: 64px;
        height: 44px;
        font-size: 11px;
        padding: 0 4px;
    }

    .student-row {
        padding: 10px;
    }

    .student-row.card-mode {
        gap: 8px;
    }

    .student-row.list-mode {
        grid-template-columns: 36px 1fr auto;
        gap: 8px;
        align-items: center;
    }

    .student-row.list-mode .points-info.list {
        gap: 6px;
    }

    .student-row.list-mode .ops {
        gap: 6px;
        width: auto;
        justify-content: flex-end;
    }

    .avatar {
        width: 32px;
        height: 32px;
        font-size: 18px;
    }

    .name {
        font-size: 15px;
    }

    .score {
        padding: 2px 6px;
        font-size: 13px;
    }

    .score-label {
        font-size: 11px;
    }

    .student-row.card-mode .ops,
    .student-row.list-mode .ops {
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
        width: 100%;
    }

    .op {
        height: 36px;
        font-size: 12px;
        padding: 0 6px;
    }

    .student-row.list-mode .op {
        height: 36px;
        font-size: 12px;
        padding: 0 6px;
    }

    .op :deep(.el-icon) {
        margin-right: 2px;
    }

    .list-card :deep(.el-card__header) {
        padding: 14px;
    }
}

/* 列表模式下：操作按钮缩小为仅图标并保持胶囊外观 */
.student-row.list-mode .ops .op {
    min-width: 44px;
    width: 44px;
    height: 32px;
    padding: 0;
    border-radius: 999px;
}

.student-row.list-mode .ops .op :deep(.el-icon) {
    margin-right: 0;
    font-size: 16px;
}

@media (max-width: 480px) {
    .student-row.list-mode .ops .op {
        min-width: 40px;
        width: 40px;
        height: 30px;
    }
}

@media (max-width: 390px) {
    .student-row.list-mode .ops .op {
        min-width: 36px;
        width: 36px;
        height: 28px;
    }
}
</style>
