<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '@/api/auth'
import { useCacheStore } from '@/stores/cacheStore'
import { sha256Hex } from '@/utils/crypto'
import { decodeJwtPayload } from '@/utils/jwt'
import type { JwtPayload } from '@/types/auth'

const router = useRouter()
const route = useRoute()
const cacheStore = useCacheStore()

const activeTab = ref<'login' | 'register'>('login')
const loginLoading = ref(false)
const registerLoading = ref(false)
const sendLoading = ref(false)
const countdown = ref(0)

const loginForm = reactive({
    email: '',
    password: '',
})

const registerForm = reactive({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    code: '',
})

let countdownTimer: number | undefined

const redirectPath = computed(() => {
    const target = route.query.redirect
    return typeof target === 'string' && target.trim() ? target : '/points'
})

function clearCountdown(): void {
    if (countdownTimer !== undefined) {
        window.clearInterval(countdownTimer)
        countdownTimer = undefined
    }
}

function startCountdown(): void {
    clearCountdown()
    countdown.value = 60
    countdownTimer = window.setInterval(() => {
        if (countdown.value <= 1) {
            clearCountdown()
            countdown.value = 0
        } else {
            countdown.value -= 1
        }
    }, 1000)
}

async function maybeRedirect(): Promise<void> {
    if (cacheStore.isAuthenticated) {
        clearCountdown()
        await router.replace(redirectPath.value)
    }
}

function validateEmail(email: string): boolean {
    return /.+@.+/.test(email)
}

async function handleSendEmailCode(): Promise<void> {
    if (sendLoading.value || countdown.value > 0) return
    const email = registerForm.email.trim()
    if (!email) {
        ElMessage.error('请先输入邮箱')
        return
    }
    if (!validateEmail(email)) {
        ElMessage.error('请输入有效的邮箱地址')
        return
    }
    sendLoading.value = true
    try {
        await authApi.sendEmailCode({ email })
        ElMessage.success('验证码已发送，请查收邮箱')
        startCountdown()
    } catch (err) {
        const message = (err as Error).message || '验证码发送失败'
        ElMessage.error(message)
    } finally {
        sendLoading.value = false
    }
}

async function handleLogin(): Promise<void> {
    if (loginLoading.value) return
    const email = loginForm.email.trim()
    const password = loginForm.password.trim()
    if (!email || !password) {
        ElMessage.error('请输入邮箱与密码')
        return
    }
    if (!validateEmail(email)) {
        ElMessage.error('请输入有效的邮箱地址')
        return
    }
    loginLoading.value = true
    try {
        const hashedPassword = await sha256Hex(password)
        const res = await authApi.login({ email, login_type: 'password', password: hashedPassword, code: '' })
        const token = res.data?.token
        if (!token) {
            ElMessage.error('登录返回数据异常')
            return
        }
        const decoded = decodeJwtPayload<JwtPayload>(token)
        const info = decoded?.user ?? { id: email, email }
        const profile = {
            id: info.id !== undefined ? String(info.id) : email,
            email: info.email ?? email,
            name: info.name ?? info.email ?? email,
        }
        const trial = decoded?.is_trial ?? false
        const expiresAt = typeof decoded?.exp === 'number' ? decoded.exp : null
        cacheStore.setAuth(token, profile, trial, expiresAt)
        ElMessage.success('登录成功')
        await maybeRedirect()
    } catch (err) {
        const message = (err as Error).message || '登录失败'
        ElMessage.error(message)
    } finally {
        loginLoading.value = false
    }
}

async function handleRegister(): Promise<void> {
    if (registerLoading.value) return
    const name = registerForm.name.trim()
    const email = registerForm.email.trim()
    const password = registerForm.password.trim()
    const confirmPassword = registerForm.confirmPassword.trim()
    const code = registerForm.code.trim()
    if (!name) {
        ElMessage.error('请输入姓名')
        return
    }
    if (!email) {
        ElMessage.error('请输入邮箱')
        return
    }
    if (!validateEmail(email)) {
        ElMessage.error('请输入有效的邮箱地址')
        return
    }
    if (!password || password.length < 6) {
        ElMessage.error('密码至少 6 位')
        return
    }
    if (password !== confirmPassword) {
        ElMessage.error('两次输入的密码不一致')
        return
    }
    if (!code) {
        ElMessage.error('请输入邮箱验证码')
        return
    }
    registerLoading.value = true
    try {
        const hashedPassword = await sha256Hex(password)
        await authApi.register({ name, email, password: hashedPassword, code })
        ElMessage.success('注册成功，请使用账号登录')
        activeTab.value = 'login'
        loginForm.email = email
        loginForm.password = ''
        registerForm.code = ''
    } catch (err) {
        const message = (err as Error).message || '注册失败'
        ElMessage.error(message)
    } finally {
        registerLoading.value = false
    }
}

onMounted(async () => {
    await maybeRedirect()
})

onBeforeUnmount(() => {
    clearCountdown()
})
</script>

<template>
    <div class="auth-page">
        <div class="auth-shell">
            <div class="brand-area">
                <img class="logo" src="/icon.svg" alt="教师助手" />
                <div class="brand-text">
                    <div class="brand-title">教师助手</div>
                    <div class="brand-sub">Teacher Assistant</div>
                </div>
            </div>
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title">欢迎登录</div>
                    <div class="panel-desc">首次登录可免费试用 7 天。 过期后如需继续试用，请购买正式版授权码</div>
                </div>

                <div class="card">
                    <el-tabs v-model="activeTab" stretch class="auth-tabs">
                        <el-tab-pane label="登录" name="login">
                            <el-form label-position="top" class="form-block">
                                <el-form-item label="邮箱">
                                    <el-input v-model="loginForm.email" placeholder="输入邮箱" autocomplete="email" />
                                </el-form-item>
                                <el-form-item label="密码">
                                    <el-input v-model="loginForm.password" type="password" placeholder="输入密码"
                                        autocomplete="current-password" @keyup.enter="handleLogin" show-password />
                                </el-form-item>
                                <div class="form-actions">
                                    <el-button type="primary" size="large" :loading="loginLoading" :disabled="loginLoading"
                                        @click="handleLogin">
                                        <i-ep-user-filled class="btn-icon" /> 登录
                                    </el-button>
                                </div>
                            </el-form>
                        </el-tab-pane>
                        <el-tab-pane label="注册" name="register">
                            <el-form label-position="top" class="form-block">
                                <el-form-item label="姓名">
                                    <el-input v-model="registerForm.name" placeholder="输入姓名" autocomplete="name" />
                                </el-form-item>
                                <el-form-item label="邮箱">
                                    <el-input v-model="registerForm.email" placeholder="输入邮箱" autocomplete="email" />
                                </el-form-item>
                                <el-form-item label="密码">
                                    <el-input v-model="registerForm.password" type="password"
                                        placeholder="设置密码（至少 6 位）" autocomplete="new-password" show-password />
                                </el-form-item>
                                <el-form-item label="确认密码">
                                    <el-input v-model="registerForm.confirmPassword" type="password"
                                        placeholder="再次输入密码" autocomplete="new-password" @keyup.enter="handleRegister" show-password />
                                </el-form-item>
                                <el-form-item label="邮箱验证码">
                                    <div class="code-row">
                                        <el-input v-model="registerForm.code" placeholder="输入邮箱验证码" maxlength="6" />
                                        <el-button class="send-code-btn" type="primary" plain size="large"
                                            :loading="sendLoading" :disabled="sendLoading || countdown > 0"
                                            @click="handleSendEmailCode">
                                            {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                                        </el-button>
                                    </div>
                                </el-form-item>
                                <div class="form-actions">
                                    <el-button type="primary" size="large" plain :loading="registerLoading"
                                        :disabled="registerLoading" @click="handleRegister">
                                        <i-ep-edit class="btn-icon" /> 注册账号
                                    </el-button>
                                </div>
                            </el-form>
                        </el-tab-pane>
                    </el-tabs>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

.auth-page {
    width: 100%;
    min-height: 100vh;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    box-sizing: border-box;
    /* background: #ffffff; */
}

.auth-shell {
    width: min(100%, 960px);
    margin: 0 auto;
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(46, 64, 138, 0.18);
    padding: 36px;
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 32px;
}

.brand-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 16px;
}

.logo {
    width: 120px;
    height: 120px;
    border-radius: 24px;
    box-shadow: 0 18px 45px rgba(53, 83, 180, 0.25);
}

.brand-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: #1f1f1f;
}

.brand-title {
    font-size: 28px;
    font-weight: 700;
}

.brand-sub {
    font-size: 16px;
    color: #5a5a5a;
}

.panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.panel-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.panel-title {
    font-size: 24px;
    font-weight: 700;
    color: #111111;
}

.panel-desc {
    color: #666666;
    font-size: 14px;
}

.card {
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(0, 0, 0, 0.04);
    padding: 20px 22px;
}

.auth-tabs :deep(.el-tabs__header) {
    margin-bottom: 16px;
}

.form-block :deep(.el-form-item) {
    margin-bottom: 16px;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
}

.code-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.code-row :deep(.el-input) {
    flex: 1;
}

.send-code-btn {
    white-space: nowrap;
    min-width: 120px;
}

.btn-icon {
    margin-right: 6px;
}

@media (max-width: 960px) {
    .auth-shell {
        grid-template-columns: 1fr;
        padding: 28px;
    }

    .brand-area {
        flex-direction: row;
        justify-content: flex-start;
    }

    .logo {
        width: 84px;
        height: 84px;
    }

    .brand-text {
        align-items: flex-start;
    }
}

@media (max-width: 600px) {
    .auth-page {
        padding: 16px 12px;
    }

    .auth-shell {
        padding: 22px 18px;
        gap: 18px;
    }

    .panel-title {
        font-size: 22px;
    }

    .card {
        padding: 18px;
        border-radius: 14px;
    }

    .code-row {
        flex-direction: column;
        align-items: stretch;
    }

    .send-code-btn {
        width: 100%;
    }
}

@media (max-width: 420px) {
    .auth-shell {
        padding: 18px 14px;
        border-radius: 16px;
    }

    .brand-area {
        flex-direction: column;
        align-items: flex-start;
    }

    .logo {
        width: 72px;
        height: 72px;
    }
}
</style>
