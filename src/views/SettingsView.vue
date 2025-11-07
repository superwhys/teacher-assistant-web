<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { exportAllKV, importAllKV } from '@/utils/storage'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'
import { usePointsStore } from '@/stores/pointsStore'
import { usePointsItemStore } from '@/stores/pointsItemStore'
import { useStudentGroupStore } from '@/stores/studentGroupStore'
import CloudSyncSettings from '@/components/CloudSyncSettings.vue'
import { useUserStore } from '@/stores/userStore'
import { authApi } from '@/api/auth'
import { decodeJwtPayload } from '@/utils/jwt'
import type { JwtPayload } from '@/types/auth'

const settingsStore = useSettingsStore()
const classStore = useClassStore()
const studentStore = useStudentStore()
const pointsStore = usePointsStore()
const pointsItemStore = usePointsItemStore()
const studentGroupStore = useStudentGroupStore()
const userStore = useUserStore()

onMounted(() => {
    void settingsStore.hydrate()
})

const exporting = ref<boolean>(false)
const importing = ref<boolean>(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const newPwd = ref<string>('')
const confirmPwd = ref<string>('')
const oldPwd = ref<string>('')
const savingPwd = ref<boolean>(false)
const hasPwd = computed(() => settingsStore.hasLockPassword())
const secretInput = ref<string>('')
const verifyingSecret = ref<boolean>(false)

function formatNowStr(): string {
    const d = new Date()
    const pad = (n: number) => n.toString().padStart(2, '0')
    const yyyy = d.getFullYear()
    const MM = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const HH = pad(d.getHours())
    const mm = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    return `${yyyy}${MM}${dd}-${HH}${mm}${ss}`
}

async function onExportBackup() {
    if (exporting.value) return
    exporting.value = true
    try {
        const data = await exportAllKV()
        const json = JSON.stringify(data)
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `teacher-assistant-backup-${formatNowStr()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        ElMessage.success('备份数据已导出')
    } catch (e) {
        ElMessage.error('导出失败')
    } finally {
        exporting.value = false
    }
}

function triggerImport() {
    fileInputRef.value?.click()
}

async function onImportFileChange(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files && input.files[0]
    if (!file) return
    try {
        await ElMessageBox.confirm('导入将覆盖本地同名数据，是否继续？', '确认导入', { type: 'warning' })
    } catch {
        input.value = ''
        return
    }
    importing.value = true
    try {
        const text = await file.text()
        let parsed: any
        try {
            parsed = JSON.parse(text)
        } catch {
            throw new Error('文件非合法 JSON')
        }
        const payload = parsed && typeof parsed === 'object' && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
        await importAllKV(payload)
        // 导入后刷新各 store
        await Promise.all([
            settingsStore.hydrate(),
            classStore.hydrate(),
            studentStore.hydrate(),
            pointsStore.hydrate(),
            pointsItemStore.hydrate(),
            studentGroupStore.hydrate(),
        ])
        ElMessage.success('数据已导入并刷新')
    } catch (err) {
        ElMessage.error((err as Error).message || '导入失败')
    } finally {
        importing.value = false
        input.value = ''
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
        const okOld = await settingsStore.verifyLockPassword(origin)
        if (!okOld) {
            ElMessage.error('原密码不正确')
            return
        }
    }
    savingPwd.value = true
    try {
        const ok = await settingsStore.setLockPassword(a)
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

    const okOld = await settingsStore.verifyLockPassword(origin)
    if (!okOld) {
        ElMessage.error('当前密码不正确')
        return
    }

    settingsStore.clearLockPassword()
    oldPwd.value = ''
    ElMessage.success('已清除锁屏密码')
}

async function onVerifySecret() {
    if (verifyingSecret.value) return
    const secret = secretInput.value.trim()
    if (!secret) {
        ElMessage.error('请输入授权码')
        return
    }
    verifyingSecret.value = true
    try {
        const res = await authApi.verifySecret({ secret })
        const token = res.data?.token
        if (!token) {
            ElMessage.error('授权码验证失败：未返回令牌')
            return
        }
        const decoded = decodeJwtPayload<JwtPayload>(token)
        const info = decoded?.user ?? {
            id: userStore.profile?.id ?? secret,
            email: userStore.profile?.email ?? '',
        }
        const profile = {
            id: info.id !== undefined ? String(info.id) : (userStore.profile?.id ?? secret),
            email: info.email ?? userStore.profile?.email ?? '',
            name: info.name ?? info.email ?? userStore.profile?.name ?? '',
            avatar: info.avatar ?? userStore.profile?.avatar ?? null,
        }
        const trial = decoded?.secret == null
        const expiresAt = typeof decoded?.exp === 'number' ? decoded.exp : null
        userStore.setAuth(token, profile, trial, expiresAt)
        ElMessage.success(trial ? '已更新授权码，当前仍为试用状态' : '授权码验证成功，已开启云端功能')
        if (!trial) {
            await settingsStore.hydrate()
        }
        secretInput.value = ''
    } catch (err) {
        const message = (err as Error).message || '授权码验证失败'
        ElMessage.error(message)
    } finally {
        verifyingSecret.value = false
    }
}

function onLockNow() {
    if (!hasPwd.value) {
        ElMessage.error('请先设置锁屏密码')
        return
    }
    settingsStore.lock()
    ElMessage.success('已锁定')
}
</script>

<template>
    <div class="settings-page">
        <div class="cards">
            <BaseCard title="数据授权码" shadow="never">
                <el-form label-position="top" class="settings-form">
                    <el-form-item label="授权码">
                        <el-input v-model="secretInput" placeholder="输入授权码" :disabled="verifyingSecret" />
                    </el-form-item>
                    <div class="secret-actions">
                        <el-button type="primary" :loading="verifyingSecret" :disabled="verifyingSecret"
                            @click="onVerifySecret">
                            <i-ep-check class="btn-icon" /> 验证授权码
                        </el-button>
                    </div>
                    <div class="tips">
                        {{ userStore.isTrial ? '试用状态下请输入正式授权码以解锁所有功能。' : '如需更新授权码，请重新验证。' }}
                    </div>
                </el-form>
            </BaseCard>

            <template v-if="userStore.isTrial">
                <BaseCard title="同步设置" shadow="never">
                    <el-alert type="warning" title="试用版不可使用云端同步功能" show-icon :closable="false" />
                </BaseCard>
            </template>
            <template v-else>
                <CloudSyncSettings />
            </template>

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

            <BaseCard title="备份与恢复" shadow="never">
                <div class="backup-grid">
                    <div class="backup-item">
                        <div class="icon-wrap success"><i-ep-download /></div>
                        <div class="content">
                            <div class="title">导出备份数据</div>
                            <div class="desc">将本地全部数据导出为 JSON 文件，建议定期备份。</div>
                            <div class="actions">
                                <el-button type="primary" size="large" :loading="exporting" :disabled="exporting" @click="onExportBackup">
                                    <i-ep-download class="btn-icon" /> 导出备份数据
                                </el-button>
                            </div>
                        </div>
                    </div>
                    <div class="backup-item">
                        <div class="icon-wrap info"><i-ep-upload /></div>
                        <div class="content">
                            <div class="title">导入备份数据</div>
                            <div class="desc">从 JSON 文件恢复数据，可能覆盖同名数据，操作前请确认。</div>
                            <div class="actions">
                                <el-button size="large" :loading="importing" :disabled="importing" @click="triggerImport">
                                    <i-ep-upload class="btn-icon" /> 导入备份数据
                                </el-button>
                                <input ref="fileInputRef" type="file" accept="application/json" class="hidden-file" @change="onImportFileChange" />
                            </div>
                        </div>
                    </div>
                </div>
            </BaseCard>
        </div>
    </div>

</template>

<style scoped>
.settings-page {
    width: 100%;
    height: 100%;
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

.secret-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 4px;
}

.hidden-file {
    display: none;
}

.backup-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.backup-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 18px 16px 20px;
    border: 1px solid #eef2f5;
    border-radius: 14px;
    background: #ffffff;
    transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.backup-item:hover {
    border-color: #e0e6ed;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04);
}

.backup-item .icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    margin-bottom: 12px;
    background: #f5f7fa;
    color: var(--el-color-primary);
}

.backup-item .icon-wrap.success {
    background: #e8f5e9;
    color: var(--el-color-success);
}

.backup-item .icon-wrap.info {
    background: #f0f5ff;
    color: var(--el-color-primary);
}

.backup-item .content {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.backup-item .content .title {
    font-size: 18px;
    font-weight: 700;
}

.backup-item .content .desc {
    color: #909399;
    font-size: 13px;
}

.backup-item .content .actions {
    margin-top: 8px;
    display: flex;
    justify-content: center;
}

.backup-item .content .actions :deep(.el-button) {
    width: 240px;
}

.lock-vertical {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
}
</style>
