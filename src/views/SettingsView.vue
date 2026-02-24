<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCacheStore } from '@/stores/cacheStore'
import { classManager } from '@/managers/class'
import type { ClassDTO } from '@/types/class'

const cacheStore = useCacheStore()
const profile = computed(() => cacheStore.profile)
const displayName = computed(() => cacheStore.displayName || '未登录')
const userEmail = computed(() => profile.value?.email ?? '')
const userAvatar = computed(() => profile.value?.avatar ?? null)
const userId = computed(() => profile.value?.id ?? '')
const roleId = computed(() => profile.value?.roleId ?? null)
const isTrial = computed(() => cacheStore.isTrial)
const isLoginExpired = computed(() => cacheStore.isExpired)
const isAuthenticated = computed(() => cacheStore.isAuthenticated)
const activeClassId = computed(() => cacheStore.getActiveClassId())
const activeClassName = computed(() => cacheStore.getActiveClassName())
const userInitial = computed(() => {
    const name = String(displayName.value ?? '').trim()
    if (!name || name === '未登录') return '用'
    return name.charAt(0).toUpperCase()
})

const newPwd = ref<string>('')
const confirmPwd = ref<string>('')
const oldPwd = ref<string>('')
const savingPwd = ref<boolean>(false)
const hasPwd = computed(() => cacheStore.hasLockPassword())

const classes = ref<ClassDTO[]>([])
const classesLoading = ref(false)
const currentClass = computed(() => {
    if (!activeClassId.value) return null
    return classes.value.find(c => c.id === activeClassId.value) ?? null
})
const currentClassName = computed(() => currentClass.value?.name ?? activeClassName.value ?? '')
const currentSemesterName = computed(() => currentClass.value?.semester_name?.trim() ?? '')
const nextSemesterDialogVisible = ref(false)
const nextSemesterName = ref('')
const nextSemesterClearPoints = ref(false)
const nextSemesterLoading = ref(false)

async function loadClassesFromApi() {
    if (!isAuthenticated.value || classesLoading.value) return
    classesLoading.value = true
    try {
        classes.value = await classManager.list()
    } finally {
        classesLoading.value = false
    }
}

function openNextSemesterDialog() {
    if (!activeClassId.value) return
    nextSemesterDialogVisible.value = true
}

function onNextSemesterDialogClosed() {
    nextSemesterName.value = ''
    nextSemesterClearPoints.value = false
    nextSemesterLoading.value = false
}

async function confirmNextSemester() {
    if (!activeClassId.value || nextSemesterLoading.value) return
    const name = nextSemesterName.value.trim()
    if (!name) {
        ElMessage.error('请输入新学期名称')
        return
    }
    nextSemesterLoading.value = true
    try {
        await classManager.nextSemester(activeClassId.value, {
            semester_name: name,
            is_clear_points: nextSemesterClearPoints.value,
        })
        nextSemesterDialogVisible.value = false
        nextSemesterName.value = ''
        nextSemesterClearPoints.value = false
        ElMessage.success('已切换至新学期')
        window.setTimeout(() => {
            window.location.reload()
        }, 300)
    } catch {
    } finally {
        nextSemesterLoading.value = false
    }
}

async function onSaveLockPassword() {
    if (savingPwd.value) return
    const a = newPwd.value.trim()
    const b = confirmPwd.value.trim()
    if (!a || a.length < 4) {
        ElMessage.error('密码长度至少为 4 位')
        return
    }
    if (a !== b) {
        ElMessage.error('两次输入的密码不一致')
        return
    }
    if (hasPwd.value) {
        const origin = oldPwd.value.trim()
        if (!origin) {
            ElMessage.error('请输入原密码')
            return
        }
        const okOld = await cacheStore.verifyLockPassword(origin)
        if (!okOld) {
            ElMessage.error('原密码不正确')
            return
        }
    }
    savingPwd.value = true
    try {
        const ok = await cacheStore.setLockPassword(a)
        if (ok) {
            newPwd.value = ''
            confirmPwd.value = ''
            oldPwd.value = ''
            ElMessage.success('锁屏密码已保存')
        } else {
            ElMessage.error('保存失败')
        }
    } finally {
        savingPwd.value = false
    }
}

async function onClearLockPassword() {
    try {
        await ElMessageBox.confirm('确定清除锁屏密码？此操作需要验证当前密码。', '确认操作', { type: 'warning' })
    } catch {
        return
    }

    const origin = oldPwd.value.trim()

    if (!origin) {
        ElMessage.error('请输入当前密码')
        return
    }

    const okOld = await cacheStore.verifyLockPassword(origin)
    if (!okOld) {
        ElMessage.error('当前密码不正确')
        return
    }

    cacheStore.clearLockPassword()
    oldPwd.value = ''
    ElMessage.success('已清除锁屏密码')
}

function onLockNow() {
    if (!hasPwd.value) {
        ElMessage.error('请先设置锁屏密码')
        return
    }
    cacheStore.lock()
    ElMessage.success('已锁定')
}

onMounted(() => {
    void loadClassesFromApi()
})

watch([isAuthenticated, () => cacheStore.profile?.id], ([authed]) => {
    if (authed) {
        void loadClassesFromApi()
    } else {
        classes.value = []
    }
})
</script>

<template>
    <div class="settings-page">
        <div class="cards">
            <BaseCard title="我的" shadow="never">
                <div v-if="profile" class="me-card">
                    <div class="me-hero">
                        <div class="me-hero-inner">
                            <el-avatar class="me-avatar" :size="58" :src="userAvatar || undefined">
                                {{ userInitial }}
                            </el-avatar>
                            <div class="me-meta">
                                <div class="me-name-row">
                                    <div class="me-name">{{ displayName }}</div>
                                    <div class="me-tags">
                                        <el-tag v-if="isLoginExpired" type="danger" effect="dark" size="small">登录已过期</el-tag>
                                        <el-tag v-else type="success" effect="dark" size="small">已登录</el-tag>
                                        <el-tag v-if="isTrial" type="warning" effect="dark" size="small">试用</el-tag>
                                    </div>
                                </div>
                                <div v-if="userEmail" class="me-email">{{ userEmail }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="me-grid">
                        <div class="me-item">
                            <div class="me-k">用户 ID</div>
                            <div class="me-v mono">{{ userId || '-' }}</div>
                        </div>
                        <div class="me-item">
                            <div class="me-k">角色 ID</div>
                            <div class="me-v mono">{{ roleId ?? '-' }}</div>
                        </div>
                        <div class="me-item wide">
                            <div class="me-k">邮箱</div>
                            <div class="me-v">{{ userEmail || '-' }}</div>
                        </div>
                    </div>
                </div>
                <div v-else class="me-empty">
                    <el-empty description="当前未登录" />
                </div>
            </BaseCard>

            <BaseCard title="学期设置" shadow="never">
                <div class="semester-card">
                    <div class="semester-meta">
                        <div class="semester-item">
                            <div class="semester-k">当前班级</div>
                            <div class="semester-v">{{ currentClassName || '-' }}</div>
                        </div>
                        <div class="semester-item">
                            <div class="semester-k">当前学期</div>
                            <div class="semester-v">{{ currentSemesterName || '未设置' }}</div>
                        </div>
                    </div>
                    <div class="semester-actions">
                        <el-button
                            type="success"
                            plain
                            size="large"
                            :loading="classesLoading"
                            :disabled="!activeClassId || classesLoading"
                            @click="openNextSemesterDialog"
                        >
                            <i-ep-refresh-right class="btn-icon" /> 切换学期
                        </el-button>
                    </div>
                    <div class="semester-tips">切换新学期后，当前学期的积分数据将被归档，无法查看。</div>
                </div>
            </BaseCard>

            <BaseCard title="锁屏设置" shadow="never">
                <div class="lock-vertical">
                    <div class="lock-top">
                        <div class="status-row">
                            <i-ep-lock v-if="hasPwd" class="status-icon ok" />
                            <i-ep-unlock v-else class="status-icon" />
                            <span class="status-text">{{ hasPwd ? '已设置锁屏密码' : '未设置锁屏密码' }}</span>
                        </div>
                        <el-button size="large" type="primary" plain @click="onLockNow">
                            <i-ep-lock class="btn-icon" /> 立即锁定
                        </el-button>
                    </div>
                    <div class="form-area">
                        <el-form label-position="top">
                            <el-form-item v-if="hasPwd" label="原密码">
                                <el-input v-model="oldPwd" type="password" show-password placeholder="输入当前锁屏密码" />
                            </el-form-item>
                            <el-form-item label="设置密码">
                                <el-input v-model="newPwd" type="password" show-password placeholder="输入新的锁屏密码（至少 4 位）" />
                            </el-form-item>
                            <el-form-item label="确认密码">
                                <el-input v-model="confirmPwd" type="password" show-password placeholder="再次输入锁屏密码" />
                            </el-form-item>
                            <div class="actions">
                                <el-button type="primary" :loading="savingPwd" :disabled="savingPwd" @click="onSaveLockPassword">
                                    <i-ep-check class="btn-icon" /> 保存密码
                                </el-button>
                                <el-button v-if="hasPwd" type="warning" @click="onClearLockPassword">
                                    <i-ep-delete class="btn-icon" /> 清除密码
                                </el-button>
                            </div>
                            <div class="tips">
                                {{ hasPwd ? '修改密码需要输入原密码' : '首次设置密码后可立即启用锁屏功能' }}。
                                设置后可通过右上角锁图标或此处按钮立即锁定。
                            </div>
                        </el-form>
                    </div>
                </div>
            </BaseCard>
        </div>
    </div>

    <el-dialog v-model="nextSemesterDialogVisible" title="切换到新学期" width="460px" @closed="onNextSemesterDialogClosed">
        <div class="semester-warning">
            <i-ep-warning-filled class="warning-icon" />
            <div class="warning-text">切换新学期后，当前学期的积分数据将被归档，无法查看</div>
        </div>
        <el-form label-position="top">
            <el-form-item label="新学期名称">
                <el-input v-model="nextSemesterName" placeholder="例如：2026年春季学期" />
            </el-form-item>
            <el-form-item label="是否清空学生积分">
                <el-radio-group v-model="nextSemesterClearPoints">
                    <el-radio :label="false">不清空</el-radio>
                    <el-radio :label="true">清空</el-radio>
                </el-radio-group>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button :disabled="nextSemesterLoading" @click="nextSemesterDialogVisible = false">取 消</el-button>
                <el-button type="primary" :loading="nextSemesterLoading" @click="confirmNextSemester">确 定</el-button>
            </span>
        </template>
    </el-dialog>

</template>

<style scoped>
.settings-page {
    width: 100%;
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
}

.btn-icon {
    margin-right: 6px;
}

.cards {
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding-bottom: 20px;
}

.settings-form :deep(.el-form-item) {
    margin-bottom: 14px;
}

.last-sync {
    color: #9e9e9e;
    font-size: 12px;
}

.tips {
    margin-top: 6px;
    color: #9e9e9e;
    font-size: 12px;
}

.me-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.me-hero {
    position: relative;
    border-radius: 16px;
    padding: 16px;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(99, 102, 241, 0.10) 40%, rgba(16, 185, 129, 0.10) 100%);
    border: 1px solid rgba(99, 102, 241, 0.16);
}

.me-hero::before {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    right: -60px;
    top: -70px;
    background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.35), rgba(99, 102, 241, 0) 62%);
}

.me-hero::after {
    content: '';
    position: absolute;
    width: 220px;
    height: 220px;
    left: -90px;
    bottom: -110px;
    background: radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.28), rgba(59, 130, 246, 0) 62%);
}

.me-hero-inner {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 14px;
}

.me-avatar {
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.9);
}

.me-name {
    font-size: 18px;
    font-weight: 700;
    color: #111111;
    line-height: 1.2;
}

.me-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.me-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
}

.me-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    flex: 1;
}

.me-email {
    font-size: 13px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.me-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.me-item {
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.92));
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
    transition: transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.me-item:hover {
    border-color: rgba(59, 130, 246, 0.35);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    transform: translateY(-2px);
}

.me-item.wide {
    grid-column: 1 / -1;
}

.me-k {
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
    letter-spacing: 0.4px;
}

.me-v {
    font-size: 14px;
    color: #111827;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mono {
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.me-empty {
    padding: 10px 0;
}

.semester-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.semester-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.semester-item {
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: #ffffff;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
}

.semester-k {
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
    letter-spacing: 0.4px;
}

.semester-v {
    font-size: 14px;
    color: #111827;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.semester-actions {
    display: flex;
    justify-content: flex-start;
}

.semester-tips {
    color: #8a4b07;
    font-size: 12px;
    line-height: 1.5;
    background: #fff7e6;
    border: 1px solid #ffe1b3;
    border-radius: 10px;
    padding: 8px 10px;
}

.lock-vertical {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.semester-warning {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: #fff7e6;
    border: 1px solid #ffe1b3;
    color: #8a4b07;
    font-size: 13px;
    margin-bottom: 12px;
}

.warning-icon {
    font-size: 18px;
    margin-top: 2px;
}

.warning-text {
    line-height: 1.5;
}

.form-area .actions {
    display: flex;
    gap: 10px;
}

.lock-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #eef2f5;
    border-radius: 14px;
    padding: 14px 16px;
    background: #ffffff;
}

.status-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0;
}

.status-icon {
    font-size: 22px;
    color: #909399;
}

.status-icon.ok {
    color: var(--el-color-success);
}

.status-text {
    font-size: 14px;
    color: #606266;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 900px) {
    .cards {
        grid-template-columns: 1fr;
        gap: 14px;
    }
}

@media (max-width: 480px) {
    .cards {
        gap: 12px;
    }

    .me-grid {
        grid-template-columns: 1fr;
    }

    .semester-meta {
        grid-template-columns: 1fr;
    }

    .me-name-row {
        flex-direction: column;
        align-items: flex-start;
    }

    .me-tags {
        justify-content: flex-start;
    }
}
</style>
