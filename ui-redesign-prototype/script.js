const students = [
    { id: 1, name: "林若溪", group: "第1组", initials: "林", totalPoints: 138, availablePoints: 126, itemPoints: 34, tags: ["高积分", "可兑换"] },
    { id: 2, name: "周亦辰", group: "第1组", initials: "周", totalPoints: 92, availablePoints: 84, itemPoints: 19, tags: ["待鼓励"] },
    { id: 3, name: "李嘉禾", group: "第2组", initials: "李", totalPoints: 126, availablePoints: 112, itemPoints: 28, tags: ["高积分"] },
    { id: 4, name: "赵思远", group: "第2组", initials: "赵", totalPoints: 144, availablePoints: 131, itemPoints: 31, tags: ["榜单领先", "可兑换"] },
    { id: 5, name: "陈可欣", group: "第3组", initials: "陈", totalPoints: 118, availablePoints: 96, itemPoints: 25, tags: ["稳定提升"] },
    { id: 6, name: "王奕然", group: "第3组", initials: "王", totalPoints: 106, availablePoints: 91, itemPoints: 21, tags: ["待鼓励"] }
]

const pointRecords = [
    {
        studentId: 4,
        name: "赵思远",
        reason: "小组展示加分",
        score: 4,
        time: "08:24",
        type: "positive",
        affectedStudents: [{ studentId: 4, score: 4 }]
    },
    {
        studentId: 1,
        name: "林若溪",
        reason: "阅读测验优秀",
        score: 3,
        time: "08:18",
        type: "positive",
        affectedStudents: [{ studentId: 1, score: 3 }]
    },
    {
        studentId: 2,
        name: "周亦辰",
        reason: "课堂走神提醒",
        score: -1,
        time: "08:15",
        type: "negative",
        affectedStudents: [{ studentId: 2, score: -1 }]
    },
    {
        studentId: 3,
        name: "李嘉禾",
        reason: "主动发言",
        score: 2,
        time: "08:11",
        type: "positive",
        affectedStudents: [{ studentId: 3, score: 2 }]
    }
]

const shopItems = [
    { id: 1, name: "免作业券", points: 120, stock: 3, desc: "可免一次书面作业", visualClass: "visual-ticket", source: "课堂奖励", actionLabel: "查看库存" },
    { id: 2, name: "阅读优先位", points: 80, stock: 6, desc: "课堂展示优先选择", visualClass: "visual-book", source: "阅读活动", actionLabel: "可兑换" },
    { id: 3, name: "文具盲盒", points: 160, stock: 2, desc: "随机文具礼盒奖励", visualClass: "visual-box", source: "节日奖品", actionLabel: "库存紧张" }
]

const rankingRangeConfig = {
    week: { label: "本周", divisor: 0.45, offset: 2 },
    month: { label: "本月", divisor: 0.72, offset: 5 },
    term: { label: "本学期", divisor: 1, offset: 0 }
}

const pointModeConfig = {
    single: { label: "当前单人模式" },
    multiple: { label: "当前多人模式" },
    class: { label: "当前全班模式" }
}

const state = {
    activeSection: "dashboard",
    selectedGroup: "全部",
    searchKeyword: "",
    selectedStudentId: 1,
    studentView: "card",
    studentSort: "points-desc",
    rankingMode: "total",
    rankingRange: "term",
    pointMode: "single",
    settings: {
        hasLockPassword: false,
        lockPassword: "",
        isLocked: false,
        feedbackHistory: [],
        migrationPending: true,
        migrationSummary: "建议首次登录后完成旧版本数据导入。"
    },
    timer: {
        presetMinutes: 15,
        remainingSeconds: 15 * 60,
        isRunning: false,
        intervalId: null
    }
}

const navItems = Array.from(document.querySelectorAll("[data-section-target]"))
const viewSections = Array.from(document.querySelectorAll("[data-section]"))
const shortcutButtons = Array.from(document.querySelectorAll("[data-section-shortcut]"))
const groupFilters = document.getElementById("group-filters")
const studentGrid = document.getElementById("student-grid")
const leaderboard = document.getElementById("leaderboard")
const pointRecordsList = document.getElementById("point-records")
const dashboardLeaderboard = document.getElementById("dashboard-leaderboard")
const dashboardRecords = document.getElementById("dashboard-records")
const shopGrid = document.getElementById("shop-grid")
const studentSearch = document.getElementById("student-search")
const rollcallName = document.getElementById("rollcall-name")
const rollcallMeta = document.getElementById("rollcall-meta")
const rollcallAvatar = document.getElementById("rollcall-avatar")
const rollcallTrigger = document.getElementById("rollcall-trigger")
const timerDisplay = document.getElementById("timer-display")
const timerStatus = document.getElementById("timer-status")
const timerToggle = document.getElementById("timer-toggle")
const timerReset = document.getElementById("timer-reset")
const timerPresetButtons = Array.from(document.querySelectorAll("[data-timer-minutes]"))
const overviewStudentCount = document.getElementById("overview-student-count")
const overviewGroupCount = document.getElementById("overview-group-count")
const overviewRecordCount = document.getElementById("overview-record-count")
const overviewShopCount = document.getElementById("overview-shop-count")
const overviewTopStudent = document.getElementById("overview-top-student")
const overviewTopScore = document.getElementById("overview-top-score")
const overviewLatestRecordName = document.getElementById("overview-latest-record-name")
const overviewLatestRecordMeta = document.getElementById("overview-latest-record-meta")
const overviewClassFocus = document.getElementById("overview-class-focus")
const overviewCardTopStudent = document.getElementById("overview-card-top-student")
const overviewCardTopMeta = document.getElementById("overview-card-top-meta")
const overviewCardRecordName = document.getElementById("overview-card-record-name")
const overviewCardRecordMeta = document.getElementById("overview-card-record-meta")
const selectedStudentName = document.getElementById("selected-student-name")
const selectedStudentGroup = document.getElementById("selected-student-group")
const pointTargetName = document.getElementById("point-target-name")
const pointTargetMeta = document.getElementById("point-target-meta")
const studentViewButtons = Array.from(document.querySelectorAll("[data-student-view]"))
const studentSortButtons = Array.from(document.querySelectorAll("[data-student-sort]"))
const rankingModeButtons = Array.from(document.querySelectorAll("[data-ranking-mode]"))
const rankingRangeButtons = Array.from(document.querySelectorAll("[data-ranking-range]"))
const pointModeButtons = Array.from(document.querySelectorAll("[data-point-mode]"))
const pointAdjustButtons = Array.from(document.querySelectorAll("[data-point-adjust]"))
const undoButtons = [
    document.getElementById("dashboard-undo-last"),
    document.getElementById("points-undo-last")
].filter(Boolean)
const topbarLockTrigger = document.getElementById("topbar-lock-trigger")
const settingsLockTrigger = document.getElementById("settings-lock-trigger")
const settingsLockStatus = document.getElementById("settings-lock-status")
const settingsLockSummary = document.getElementById("settings-lock-summary")
const settingsLockTip = document.getElementById("settings-lock-tip")
const lockPasswordInput = document.getElementById("lock-password-input")
const lockSaveTrigger = document.getElementById("lock-save-trigger")
const lockClearTrigger = document.getElementById("lock-clear-trigger")
const lockScreenPreview = document.getElementById("lock-screen-preview")
const feedbackInput = document.getElementById("feedback-input")
const feedbackSubmitTrigger = document.getElementById("feedback-submit-trigger")
const feedbackClearTrigger = document.getElementById("feedback-clear-trigger")
const settingsFeedbackCount = document.getElementById("settings-feedback-count")
const settingsFeedbackLatest = document.getElementById("settings-feedback-latest")
const settingsMigrationStatus = document.getElementById("settings-migration-status")
const settingsMigrationSummary = document.getElementById("settings-migration-summary")
const migrationStartTrigger = document.getElementById("migration-start-trigger")
const migrationIgnoreTrigger = document.getElementById("migration-ignore-trigger")
const portalLockTrigger = document.getElementById("portal-lock-trigger")
const lockOverlay = document.getElementById("lock-overlay")
const lockOverlayTitle = document.getElementById("lock-overlay-title")
const lockOverlaySummary = document.getElementById("lock-overlay-summary")
const lockUnlockInput = document.getElementById("lock-unlock-input")
const lockUnlockTrigger = document.getElementById("lock-unlock-trigger")
const lockCloseTrigger = document.getElementById("lock-close-trigger")
const lockOverlayStatus = document.getElementById("lock-overlay-status")

/**
 * 返回当前选中的学生对象。
 */
function getSelectedStudent() {
    return students.find((student) => student.id === state.selectedStudentId) ?? students[0]
}

/**
 * 返回当前筛选条件下的学生列表。
 */
function getFilteredStudents() {
    const keyword = state.searchKeyword.trim().toLowerCase()
    const filteredStudents = students.filter((student) => {
        const matchGroup = state.selectedGroup === "全部" || student.group === state.selectedGroup
        const matchKeyword = !keyword
            || student.name.toLowerCase().includes(keyword)
            || student.group.toLowerCase().includes(keyword)
            || student.tags.join(" ").toLowerCase().includes(keyword)

        return matchGroup && matchKeyword
    })

    return filteredStudents.sort((left, right) => {
        if (state.studentSort === "name-asc") {
            return left.name.localeCompare(right.name, "zh-CN")
        }

        return right.totalPoints - left.totalPoints
    })
}

/**
 * 返回当前排行榜使用的分值标签。
 */
function getRankingLabel() {
    return state.rankingMode === "total" ? "总积分" : "单项积分"
}

/**
 * 根据当前排行榜模式和范围计算展示分值。
 */
function getRankingValue(student) {
    const baseScore = state.rankingMode === "total" ? student.totalPoints : student.itemPoints
    const config = rankingRangeConfig[state.rankingRange]
    return Math.max(0, Math.round(baseScore * config.divisor - config.offset))
}

/**
 * 返回当前排行榜使用的已排序学生列表。
 */
function getRankedStudents() {
    return [...students]
        .map((student) => ({
            ...student,
            rankingValue: getRankingValue(student)
        }))
        .sort((left, right) => right.rankingValue - left.rankingValue)
}

/**
 * 将积分数字格式化为带符号的文本。
 */
function formatScore(score) {
    return score > 0 ? `+${score}` : `${score}`
}

/**
 * 生成当前时间的课堂记录时间文本。
 */
function getCurrentTimeLabel() {
    return new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })
}

/**
 * 切换当前显示的主内容区域。
 */
function switchSection(sectionName) {
    state.activeSection = sectionName

    navItems.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.sectionTarget === sectionName)
    })

    viewSections.forEach((section) => {
        section.classList.toggle("is-active", section.dataset.section === sectionName)
    })
}

/**
 * 同步所有分段筛选按钮的激活状态。
 */
function syncSegmentedControls() {
    studentViewButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.studentView === state.studentView)
    })

    studentSortButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.studentSort === state.studentSort)
    })

    rankingModeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.rankingMode === state.rankingMode)
    })

    rankingRangeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.rankingRange === state.rankingRange)
    })

    pointModeButtons.forEach((button) => {
        button.classList.toggle("is-active", button.dataset.pointMode === state.pointMode)
    })
}

/**
 * 渲染学生分组筛选按钮。
 */
function renderGroupFilters() {
    const groups = ["全部", ...new Set(students.map((student) => student.group))]
    groupFilters.innerHTML = groups.map((group) => `
        <button class="chip-button ${state.selectedGroup === group ? "is-active" : ""}" data-group-filter="${group}">
            ${group}
        </button>
    `).join("")
}

/**
 * 返回学生卡片或列表的模板结构。
 */
function getStudentTemplate(student) {
    const footerText = state.studentView === "card" ? "点击卡片后可作为当前操作学生" : "支持编辑学生、删除学生与调整分组"

    return `
        <article class="student-card ${state.selectedStudentId === student.id ? "is-selected" : ""}" data-student-id="${student.id}">
            <div class="student-head">
                <div class="attention-card">
                    <div class="avatar gradient-a">${student.initials}</div>
                    <div class="student-title">
                        <strong>${student.name}</strong>
                        <div class="student-meta">${student.group} · 可用积分 ${student.availablePoints}</div>
                    </div>
                </div>
                <div class="student-score">
                    <span>${state.studentView === "card" ? "可用积分" : "总积分"}</span>
                    <strong>${state.studentView === "card" ? student.availablePoints : student.totalPoints}</strong>
                </div>
            </div>
            <div class="student-tags">
                ${student.tags.map((tag) => `<span class="tag ${tag.includes("待") ? "warn" : ""}">${tag}</span>`).join("")}
                <span class="tag">${student.group}</span>
            </div>
            <div class="student-footer">
                <div class="student-score">
                    <span>${state.studentView === "card" ? "总积分" : "单项积分"}</span>
                    <strong>${state.studentView === "card" ? student.totalPoints : student.itemPoints}</strong>
                </div>
                <div class="student-meta">${footerText}</div>
            </div>
        </article>
    `
}

/**
 * 渲染学生卡片或列表。
 */
function renderStudents() {
    const filteredStudents = getFilteredStudents()
    studentGrid.classList.toggle("is-list", state.studentView === "list")
    studentGrid.innerHTML = filteredStudents.map((student) => getStudentTemplate(student)).join("")
}

/**
 * 渲染积分排行榜。
 */
function renderLeaderboard() {
    const rankedStudents = getRankedStudents()
    const rankingLabel = getRankingLabel()
    const rangeLabel = rankingRangeConfig[state.rankingRange].label

    const rankingTemplate = rankedStudents.map((student, index) => `
        <div class="leaderboard-item">
            <div class="leaderboard-rank">#${index + 1}</div>
            <div>
                <div class="leaderboard-name">${student.name}</div>
                <div class="leaderboard-meta">${student.group} · ${rangeLabel} · 可用积分 ${student.availablePoints}</div>
            </div>
            <div class="leaderboard-score">
                <span>${rankingLabel}</span>
                <strong>${student.rankingValue}</strong>
            </div>
        </div>
    `).join("")

    leaderboard.innerHTML = rankingTemplate
    dashboardLeaderboard.innerHTML = rankedStudents.slice(0, 4).map((student, index) => `
        <div class="leaderboard-item">
            <div class="leaderboard-rank">#${index + 1}</div>
            <div>
                <div class="leaderboard-name">${student.name}</div>
                <div class="leaderboard-meta">${student.group} · ${rangeLabel}</div>
            </div>
            <div class="leaderboard-score">
                <span>${rankingLabel}</span>
                <strong>${student.rankingValue}</strong>
            </div>
        </div>
    `).join("")
}

/**
 * 返回积分记录的展示文案。
 */
function getRecordMeta(record) {
    return `${record.reason}${record.affectedStudents.length > 1 ? ` · ${record.affectedStudents.length} 人` : ""}`
}

/**
 * 渲染最近积分操作记录。
 */
function renderPointRecords() {
    const latestRecords = pointRecords.slice(0, 6)

    pointRecordsList.innerHTML = latestRecords.map((record) => `
        <div class="record-item">
            <div class="record-score ${record.type}">${formatScore(record.score)}</div>
            <div>
                <strong>${record.name}</strong>
                <div class="record-meta">${getRecordMeta(record)}</div>
            </div>
            <div class="record-meta">${record.time}</div>
        </div>
    `).join("")

    dashboardRecords.innerHTML = latestRecords.slice(0, 4).map((record) => `
        <div class="record-item">
            <div class="record-score ${record.type}">${formatScore(record.score)}</div>
            <div>
                <strong>${record.name}</strong>
                <div class="record-meta">${getRecordMeta(record)}</div>
            </div>
            <div class="record-meta">${record.time}</div>
        </div>
    `).join("")

    undoButtons.forEach((button) => {
        button.disabled = pointRecords.length === 0
    })
}

/**
 * 渲染积分商城卡片。
 */
function renderShop() {
    shopGrid.innerHTML = shopItems.map((item) => `
        <article class="shop-card">
            <div class="shop-visual ${item.visualClass}">${item.name}</div>
            <div class="shop-title">
                <strong>${item.name}</strong>
                <div class="shop-meta">${item.desc}</div>
                <div class="student-meta">${item.source}</div>
            </div>
            <div class="shop-footer">
                <div class="shop-points">
                    <span>兑换所需</span>
                    <strong>${item.points}</strong>
                </div>
                <div class="shop-actions">
                    <button class="small-button">${item.actionLabel}</button>
                    <button class="small-button">库存 ${item.stock}</button>
                </div>
            </div>
        </article>
    `).join("")
}

/**
 * 更新当前操作对象相关的提示信息。
 */
function renderSelectedStudentSummary() {
    const selectedStudent = getSelectedStudent()
    selectedStudentName.textContent = selectedStudent.name
    selectedStudentGroup.textContent = `${selectedStudent.group} · 可用积分 ${selectedStudent.availablePoints}`
    pointTargetName.textContent = state.pointMode === "single" ? selectedStudent.name : state.pointMode === "multiple" ? `${selectedStudent.group} 学生` : "高一（2）班全班"
    pointTargetMeta.textContent = `${state.pointMode === "single" ? selectedStudent.group : "当前筛选结果"} · ${pointModeConfig[state.pointMode].label}`
}

/**
 * 渲染设置中心中的系统状态信息。
 */
function renderSettingsPanel() {
    settingsLockStatus.textContent = state.settings.hasLockPassword ? "已设置锁屏密码" : "未设置锁屏密码"
    settingsLockSummary.textContent = state.settings.hasLockPassword ? "锁屏密码已启用，可立即锁屏" : "当前未启用"
    settingsLockTip.textContent = state.settings.hasLockPassword
        ? "锁屏密码已保存，支持立即锁屏和输入密码解锁。"
        : "未设置密码时，不能直接锁屏。"
    settingsFeedbackCount.textContent = `本地已提交 ${state.settings.feedbackHistory.length} 条`
    settingsFeedbackLatest.textContent = state.settings.feedbackHistory[0] ?? "暂无提交记录"
    settingsMigrationStatus.textContent = state.settings.migrationPending ? "检测到迁移提醒" : "迁移提示已处理"
    settingsMigrationSummary.textContent = state.settings.migrationSummary
}

/**
 * 渲染锁屏浮层的显示状态和提示文案。
 */
function renderLockOverlay() {
    lockOverlay.classList.toggle("is-active", state.settings.isLocked)
    lockOverlay.setAttribute("aria-hidden", String(!state.settings.isLocked))
    lockOverlayTitle.textContent = state.settings.isLocked ? "课堂已锁定" : "课堂锁屏预览"
    lockOverlaySummary.textContent = state.settings.hasLockPassword
        ? "请输入锁屏密码后解锁，防止课堂大屏误触。"
        : "请先在设置中心保存锁屏密码，再使用立即锁屏。"
    lockOverlayStatus.textContent = state.settings.isLocked ? "锁屏中" : "当前未锁定"
}

/**
 * 设置当前被选中的学生卡片。
 */
function setSelectedStudent(studentId) {
    state.selectedStudentId = Number(studentId)
    renderStudents()
    renderOverview()
    renderSelectedStudentSummary()
}

/**
 * 渲染首页与侧边概览数据。
 */
function renderOverview() {
    const groups = new Set(students.map((student) => student.group))
    const rankedStudents = getRankedStudents()
    const latestRecord = pointRecords[0]
    const rankingLabel = getRankingLabel()

    overviewStudentCount.textContent = String(students.length)
    overviewGroupCount.textContent = String(groups.size)
    overviewRecordCount.textContent = String(pointRecords.length)
    overviewShopCount.textContent = `${shopItems.length} 个`
    overviewTopStudent.textContent = rankedStudents[0]?.name ?? "-"
    overviewTopScore.textContent = rankedStudents[0] ? `${rankingLabel} ${rankedStudents[0].rankingValue}` : `${rankingLabel} 0`
    overviewLatestRecordName.textContent = latestRecord?.name ?? "-"
    overviewLatestRecordMeta.textContent = latestRecord ? `${formatScore(latestRecord.score)} · ${latestRecord.reason}` : "暂无记录"
    overviewClassFocus.textContent = latestRecord ? `最新课堂焦点：${latestRecord.reason}` : "积分正常进行中"
    overviewCardTopStudent.textContent = rankedStudents[0]?.name ?? "-"
    overviewCardTopMeta.textContent = rankedStudents[0] ? `${rankingLabel} ${rankedStudents[0].rankingValue}` : `${rankingLabel} 0`
    overviewCardRecordName.textContent = latestRecord?.name ?? "-"
    overviewCardRecordMeta.textContent = latestRecord ? `${formatScore(latestRecord.score)} · ${latestRecord.reason}` : "暂无记录"
}

/**
 * 保存当前输入的锁屏密码。
 */
function saveLockPassword() {
    const password = lockPasswordInput.value.trim()
    if (password.length < 4) {
        switchSection("settings")
        settingsLockTip.textContent = "请至少输入 4 位锁屏密码后再保存。"
        return
    }

    state.settings.hasLockPassword = true
    state.settings.lockPassword = password
    lockPasswordInput.value = ""
    renderSettingsPanel()
}

/**
 * 清除已经保存的锁屏密码。
 */
function clearLockPassword() {
    state.settings.hasLockPassword = false
    state.settings.lockPassword = ""
    state.settings.isLocked = false
    lockPasswordInput.value = ""
    lockUnlockInput.value = ""
    renderSettingsPanel()
    renderLockOverlay()
}

/**
 * 打开课堂锁屏浮层。
 */
function openLockScreen() {
    if (!state.settings.hasLockPassword) {
        switchSection("settings")
        settingsLockTip.textContent = "请先设置 4-6 位锁屏密码后再锁屏。"
        return
    }

    state.settings.isLocked = true
    lockUnlockInput.value = ""
    renderSettingsPanel()
    renderLockOverlay()
}

/**
 * 关闭课堂锁屏浮层。
 */
function closeLockScreen() {
    state.settings.isLocked = false
    lockUnlockInput.value = ""
    renderLockOverlay()
}

/**
 * 使用输入的密码尝试解锁当前锁屏状态。
 */
function unlockScreen() {
    if (!state.settings.hasLockPassword) {
        closeLockScreen()
        return
    }

    if (lockUnlockInput.value.trim() !== state.settings.lockPassword) {
        lockOverlayStatus.textContent = "密码错误，请重新输入"
        return
    }

    closeLockScreen()
    lockOverlayStatus.textContent = "解锁成功"
}

/**
 * 提交一条新的意见反馈并更新设置摘要。
 */
function submitFeedback() {
    const feedback = feedbackInput.value.trim()
    if (!feedback) {
        settingsFeedbackLatest.textContent = "请输入反馈内容后再提交"
        return
    }

    state.settings.feedbackHistory.unshift(feedback)
    feedbackInput.value = ""
    renderSettingsPanel()
}

/**
 * 清空反馈输入框中的当前内容。
 */
function clearFeedbackInput() {
    feedbackInput.value = ""
}

/**
 * 标记已经开始旧版本数据迁移流程。
 */
function startMigration() {
    state.settings.migrationPending = false
    state.settings.migrationSummary = "旧版本数据迁移已开始，预计导入班级、学生和积分本地缓存。"
    renderSettingsPanel()
}

/**
 * 标记本次暂不处理旧版本数据迁移提示。
 */
function ignoreMigration() {
    state.settings.migrationPending = false
    state.settings.migrationSummary = "已选择稍后处理旧版本数据迁移提醒。"
    renderSettingsPanel()
}

/**
 * 新增一条积分操作记录。
 */
function pushPointRecord(recordName, score, reason, affectedStudents) {
    pointRecords.unshift({
        studentId: affectedStudents[0]?.studentId ?? null,
        name: recordName,
        reason,
        score,
        time: getCurrentTimeLabel(),
        type: score >= 0 ? "positive" : "negative",
        affectedStudents
    })
}

/**
 * 返回本次积分操作应影响的学生列表。
 */
function getPointTargets() {
    if (state.pointMode === "class") {
        return [...students]
    }

    if (state.pointMode === "multiple") {
        const filteredStudents = getFilteredStudents()
        return (filteredStudents.length > 0 ? filteredStudents : students).slice(0, 3)
    }

    return [getSelectedStudent()]
}

/**
 * 对当前模式下的学生执行积分增减并刷新视图。
 */
function adjustStudentPoints(score, reason) {
    const targets = getPointTargets()
    if (targets.length === 0) {
        return
    }

    const recordName = state.pointMode === "single"
        ? targets[0].name
        : state.pointMode === "multiple"
            ? `${targets[0].group} ${targets.length} 名学生`
            : "高一（2）班全班"

    const affectedStudents = targets.map((student) => {
        student.totalPoints += score
        student.availablePoints = Math.max(0, student.availablePoints + score)
        student.itemPoints = Math.max(0, student.itemPoints + Math.max(score, 0))
        return { studentId: student.id, score }
    })

    pushPointRecord(recordName, score, reason, affectedStudents)
    renderStudents()
    renderLeaderboard()
    renderPointRecords()
    renderOverview()
    renderSelectedStudentSummary()
    updateRollcallCard(getSelectedStudent())
}

/**
 * 撤回最近一次普通积分操作。
 */
function undoLastPointRecord() {
    const latestRecord = pointRecords.shift()
    if (!latestRecord) {
        return
    }

    latestRecord.affectedStudents.forEach((item) => {
        const student = students.find((current) => current.id === item.studentId)
        if (!student) {
            return
        }

        student.totalPoints -= item.score
        student.availablePoints = Math.max(0, student.availablePoints - item.score)
        if (item.score > 0) {
            student.itemPoints = Math.max(0, student.itemPoints - item.score)
        }
    })

    renderStudents()
    renderLeaderboard()
    renderPointRecords()
    renderOverview()
    renderSelectedStudentSummary()
    updateRollcallCard(getSelectedStudent())
}

/**
 * 更新点名卡片中展示的学生信息。
 */
function updateRollcallCard(student) {
    rollcallAvatar.textContent = student.initials
    rollcallName.textContent = student.name
    rollcallMeta.textContent = `${student.group} · 当前积分 ${student.availablePoints}`
}

/**
 * 从当前学生池中随机选择一名学生展示。
 */
function randomRollcall() {
    const pool = getFilteredStudents().length > 0 ? getFilteredStudents() : students
    const student = pool[Math.floor(Math.random() * pool.length)]
    setSelectedStudent(student.id)
    updateRollcallCard(student)
}

/**
 * 按秒数刷新计时器显示文案。
 */
function updateTimerDisplay() {
    const minutes = String(Math.floor(state.timer.remainingSeconds / 60)).padStart(2, "0")
    const seconds = String(state.timer.remainingSeconds % 60).padStart(2, "0")
    timerDisplay.textContent = `${minutes}:${seconds}`
}

/**
 * 应用新的计时器预设时长。
 */
function applyTimerPreset(minutes) {
    state.timer.presetMinutes = Number(minutes)
    state.timer.remainingSeconds = state.timer.presetMinutes * 60
    state.timer.isRunning = false

    if (state.timer.intervalId) {
        window.clearInterval(state.timer.intervalId)
        state.timer.intervalId = null
    }

    timerPresetButtons.forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.timerMinutes) === state.timer.presetMinutes)
    })

    timerStatus.textContent = "待开始"
    timerToggle.textContent = "开始计时"
    updateTimerDisplay()
}

/**
 * 切换计时器的运行和暂停状态。
 */
function toggleTimer() {
    if (state.timer.isRunning) {
        state.timer.isRunning = false
        timerStatus.textContent = "已暂停"
        timerToggle.textContent = "继续计时"

        if (state.timer.intervalId) {
            window.clearInterval(state.timer.intervalId)
            state.timer.intervalId = null
        }
        return
    }

    state.timer.isRunning = true
    timerStatus.textContent = "计时中"
    timerToggle.textContent = "暂停"

    state.timer.intervalId = window.setInterval(() => {
        if (state.timer.remainingSeconds <= 0) {
            state.timer.isRunning = false
            timerStatus.textContent = "已结束"
            timerToggle.textContent = "重新开始"
            window.clearInterval(state.timer.intervalId)
            state.timer.intervalId = null
            return
        }

        state.timer.remainingSeconds -= 1
        updateTimerDisplay()
    }, 1000)
}

/**
 * 将计时器恢复到当前预设时长。
 */
function resetTimer() {
    applyTimerPreset(state.timer.presetMinutes)
}

/**
 * 绑定导航区与快捷跳转按钮事件。
 */
function bindNavigation() {
    navItems.forEach((item) => {
        item.addEventListener("click", () => {
            switchSection(item.dataset.sectionTarget)
        })
    })

    shortcutButtons.forEach((button) => {
        button.addEventListener("click", () => {
            switchSection(button.dataset.sectionShortcut)
        })
    })
}

/**
 * 绑定学生筛选和学生选择事件。
 */
function bindStudentEvents() {
    studentSearch.addEventListener("input", (event) => {
        state.searchKeyword = event.target.value
        renderStudents()
    })

    groupFilters.addEventListener("click", (event) => {
        const target = event.target.closest("[data-group-filter]")
        if (!target) {
            return
        }

        state.selectedGroup = target.dataset.groupFilter
        renderGroupFilters()
        renderStudents()
        renderSelectedStudentSummary()
    })

    studentGrid.addEventListener("click", (event) => {
        const card = event.target.closest("[data-student-id]")
        if (card) {
            setSelectedStudent(card.dataset.studentId)
        }
    })

    studentViewButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.studentView = button.dataset.studentView
            syncSegmentedControls()
            renderStudents()
        })
    })

    studentSortButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.studentSort = button.dataset.studentSort
            syncSegmentedControls()
            renderStudents()
        })
    })
}

/**
 * 绑定积分页面相关交互事件。
 */
function bindPointEvents() {
    rankingModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.rankingMode = button.dataset.rankingMode
            syncSegmentedControls()
            renderLeaderboard()
            renderOverview()
        })
    })

    rankingRangeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.rankingRange = button.dataset.rankingRange
            syncSegmentedControls()
            renderLeaderboard()
            renderOverview()
        })
    })

    pointModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            state.pointMode = button.dataset.pointMode
            syncSegmentedControls()
            renderSelectedStudentSummary()
        })
    })

    pointAdjustButtons.forEach((button) => {
        button.addEventListener("click", () => {
            adjustStudentPoints(Number(button.dataset.pointAdjust), button.dataset.pointReason)
        })
    })

    undoButtons.forEach((button) => {
        button.addEventListener("click", undoLastPointRecord)
    })
}

/**
 * 绑定工具箱相关交互事件。
 */
function bindToolEvents() {
    rollcallTrigger.addEventListener("click", randomRollcall)
    timerToggle.addEventListener("click", toggleTimer)
    timerReset.addEventListener("click", resetTimer)

    timerPresetButtons.forEach((button) => {
        button.addEventListener("click", () => {
            applyTimerPreset(button.dataset.timerMinutes)
        })
    })
}

/**
 * 绑定设置中心与锁屏浮层相关交互事件。
 */
function bindSettingsEvents() {
    topbarLockTrigger.addEventListener("click", openLockScreen)
    settingsLockTrigger.addEventListener("click", openLockScreen)
    portalLockTrigger.addEventListener("click", () => {
        switchSection("settings")
    })
    lockSaveTrigger.addEventListener("click", saveLockPassword)
    lockClearTrigger.addEventListener("click", clearLockPassword)
    lockScreenPreview.addEventListener("click", openLockScreen)
    lockUnlockTrigger.addEventListener("click", unlockScreen)
    lockCloseTrigger.addEventListener("click", closeLockScreen)
    feedbackSubmitTrigger.addEventListener("click", submitFeedback)
    feedbackClearTrigger.addEventListener("click", clearFeedbackInput)
    migrationStartTrigger.addEventListener("click", startMigration)
    migrationIgnoreTrigger.addEventListener("click", ignoreMigration)
}

/**
 * 初始化整个静态原型的假数据和交互。
 */
function init() {
    renderGroupFilters()
    syncSegmentedControls()
    renderStudents()
    renderLeaderboard()
    renderPointRecords()
    renderShop()
    renderOverview()
    renderSelectedStudentSummary()
    renderSettingsPanel()
    renderLockOverlay()
    updateRollcallCard(students[2])
    updateTimerDisplay()
    bindNavigation()
    bindStudentEvents()
    bindPointEvents()
    bindToolEvents()
    bindSettingsEvents()
}

init()
