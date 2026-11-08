<template>
    <div class="auth-page">
        <div class="brand-row page-brand">
            <BrandLogo class="brand-logo" />
            <div>
                <div class="brand-title">教师助手</div>
                <div class="brand-subtitle">TEACHER ASSISTANT</div>
            </div>
        </div>

        <div class="auth-shell">
            <div class="form-column">
                <div class="form-inner">
                    <div class="heading-block">
                        <span class="login-eyebrow"><span></span> 教师入口</span>
                        <h1 class="title">{{ panelTitle }}</h1>
                        <p class="subtitle">{{ panelDesc }}</p>
                    </div>

                    <div v-if="!showResetCard" class="tab-switch">
                        <button
                            class="tab-button"
                            :class="{ 'tab-button-active': activeTab === 'login' }"
                            type="button"
                            @click="switchTab('login')"
                        >
                            登录
                        </button>
                        <button
                            class="tab-button"
                            :class="{ 'tab-button-active': activeTab === 'register' }"
                            type="button"
                            @click="switchTab('register')"
                        >
                            注册
                        </button>
                    </div>

                    <form
                        class="form-block"
                        @submit.prevent="showResetCard ? handlePasswordReset() : activeTab === 'login' ? handleLogin() : handleRegister()"
                    >
                        <template v-if="showResetCard">
                            <div class="field">
                                <label class="label" for="reset-email">邮箱</label>
                                <input
                                    id="reset-email"
                                    v-model="resetForm.email"
                                    class="input auth-input"
                                    type="email"
                                    placeholder="输入邮箱"
                                    autocomplete="email"
                                    @focus="handleInputFocus"
                                    @blur="handleInputBlur"
                                />
                            </div>

                            <div class="field">
                                <label class="label" for="reset-code">邮箱验证码</label>
                                <div class="code-row">
                                    <input
                                        id="reset-code"
                                        v-model="resetForm.code"
                                        class="input auth-input"
                                        type="text"
                                        placeholder="输入邮箱验证码"
                                        maxlength="6"
                                        @focus="handleInputFocus"
                                        @blur="handleInputBlur"
                                    />
                                    <button
                                        class="secondary-button send-code-button"
                                        type="button"
                                        :disabled="resetSendLoading || resetCountdown > 0"
                                        @click="handleSendResetCode"
                                    >
                                        {{ resetSendLoading ? "发送中..." : resetCountdown > 0 ? `${resetCountdown}s` : "获取验证码" }}
                                    </button>
                                </div>
                            </div>

                            <div class="field">
                                <label class="label" for="reset-password">新密码</label>
                                <div class="password-row">
                                    <input
                                        id="reset-password"
                                        v-model="resetForm.password"
                                        class="input auth-input"
                                        :type="passwordInputType"
                                        placeholder="设置新密码（至少 6 位）"
                                        autocomplete="new-password"
                                        @focus="handleInputFocus"
                                        @blur="handleInputBlur"
                                    />
                                    <button class="toggle-button" type="button" @click="togglePassword">
                                        {{ showPassword ? "隐藏" : "显示" }}
                                    </button>
                                </div>
                            </div>

                            <div class="field">
                                <label class="label" for="reset-confirm-password">确认新密码</label>
                                <input
                                    id="reset-confirm-password"
                                    v-model="resetForm.confirmPassword"
                                    class="input auth-input"
                                    :type="passwordInputType"
                                    placeholder="再次输入新密码"
                                    autocomplete="new-password"
                                    @focus="handleInputFocus"
                                    @blur="handleInputBlur"
                                />
                            </div>

                            <div class="action-row action-row-between">
                                <button class="ghost-button" type="button" @click="closeResetCard">返回登录</button>
                                <button class="primary-button" type="submit" :disabled="resetLoading">
                                    {{ resetLoading ? "提交中..." : "重置密码" }}
                                </button>
                            </div>
                        </template>

                        <template v-else-if="activeTab === 'login'">
                            <div class="login-method-switch" role="group" aria-label="登录方式">
                                <button
                                    class="login-method-button"
                                    :class="{ 'login-method-button-active': loginType === 'password' }"
                                    type="button"
                                    :aria-pressed="loginType === 'password'"
                                    :disabled="loginLoading || loginSendLoading"
                                    @click="switchLoginType('password')"
                                >
                                    密码登录
                                </button>
                                <button
                                    class="login-method-button"
                                    :class="{ 'login-method-button-active': loginType === 'code' }"
                                    type="button"
                                    :aria-pressed="loginType === 'code'"
                                    :disabled="loginLoading || loginSendLoading"
                                    @click="switchLoginType('code')"
                                >
                                    邮箱验证码登录
                                </button>
                                <button
                                    class="login-method-button"
                                    :class="{ 'login-method-button-active': loginType === 'qr' }"
                                    type="button"
                                    :aria-pressed="loginType === 'qr'"
                                    :disabled="loginLoading || loginSendLoading"
                                    @click="switchLoginType('qr')"
                                >
                                    小程序登录
                                </button>
                            </div>

                            <div class="login-content">
                                <div v-show="loginType !== 'qr'" class="login-fields" :inert="loginType === 'qr'">
                                    <div class="field">
                                        <label class="label" for="login-email">邮箱</label>
                                        <input
                                            id="login-email"
                                            v-model="loginForm.email"
                                            class="input auth-input"
                                            type="email"
                                            placeholder="输入邮箱"
                                            autocomplete="email"
                                            :disabled="loginLoading || loginSendLoading"
                                            @focus="handleInputFocus"
                                            @blur="handleInputBlur"
                                        />
                                    </div>

                                    <div class="login-credential">
                                        <Transition name="login-field">
                                            <div
                                                v-show="loginType === 'password'"
                                                class="field"
                                                :inert="loginType !== 'password'"
                                            >
                                                <label class="label" for="login-password">密码</label>
                                                <div class="password-row">
                                                    <input
                                                        id="login-password"
                                                        v-model="loginForm.password"
                                                        class="input auth-input"
                                                        :type="passwordInputType"
                                                        placeholder="输入密码"
                                                        autocomplete="current-password"
                                                        @focus="handleInputFocus"
                                                        @blur="handleInputBlur"
                                                    />
                                                    <button class="toggle-button" type="button" @click="togglePassword">
                                                        {{ showPassword ? "隐藏" : "显示" }}
                                                    </button>
                                                </div>
                                            </div>
                                        </Transition>

                                        <Transition name="login-field">
                                            <div
                                                v-show="loginType === 'code'"
                                                class="field"
                                                :inert="loginType !== 'code'"
                                            >
                                                <label class="label" for="login-code">邮箱验证码</label>
                                                <div class="code-row">
                                                    <input
                                                        id="login-code"
                                                        v-model="loginForm.code"
                                                        class="input auth-input"
                                                        type="text"
                                                        inputmode="numeric"
                                                        autocomplete="one-time-code"
                                                        placeholder="输入 6 位验证码"
                                                        maxlength="6"
                                                        :disabled="loginLoading"
                                                        @focus="handleInputFocus"
                                                        @blur="handleInputBlur"
                                                    />
                                                    <button
                                                        class="secondary-button send-code-button"
                                                        type="button"
                                                        :disabled="loginSendLoading || loginCountdown > 0 || loginLoading"
                                                        @click="handleSendLoginCode"
                                                    >
                                                        {{ loginSendLoading ? "发送中..." : loginCountdown > 0 ? `${loginCountdown}s` : "获取验证码" }}
                                                    </button>
                                                </div>
                                            </div>
                                        </Transition>
                                    </div>

                                    <div class="helper-row" :class="{ 'login-helper-hidden': loginType === 'code' }">
                                        <button class="link-button" type="button" @click="openResetCard">忘记密码？</button>
                                    </div>

                                    <div class="action-row">
                                        <button
                                            class="primary-button primary-button-full"
                                            type="submit"
                                            :disabled="loginLoading || loginSendLoading"
                                        >
                                            {{ loginLoading ? "登录中..." : "登录" }}
                                        </button>
                                    </div>
                                </div>
                                <QrLoginPanel v-if="loginType === 'qr'" @authenticated="handleQrLogin" />
                            </div>
                        </template>

                        <template v-else>
                            <div class="field">
                                <label class="label" for="register-name">姓名</label>
                                <input
                                    id="register-name"
                                    v-model="registerForm.name"
                                    class="input auth-input"
                                    type="text"
                                    placeholder="输入姓名"
                                    autocomplete="name"
                                    @focus="handleInputFocus"
                                    @blur="handleInputBlur"
                                />
                            </div>

                            <div class="field">
                                <label class="label" for="register-email">邮箱</label>
                                <input
                                    id="register-email"
                                    v-model="registerForm.email"
                                    class="input auth-input"
                                    type="email"
                                    placeholder="输入邮箱"
                                    autocomplete="email"
                                    @focus="handleInputFocus"
                                    @blur="handleInputBlur"
                                />
                            </div>

                            <div class="field">
                                <label class="label" for="register-password">密码</label>
                                <div class="password-row">
                                    <input
                                        id="register-password"
                                        v-model="registerForm.password"
                                        class="input auth-input"
                                        :type="passwordInputType"
                                        placeholder="设置密码（至少 6 位）"
                                        autocomplete="new-password"
                                        @focus="handleInputFocus"
                                        @blur="handleInputBlur"
                                    />
                                    <button class="toggle-button" type="button" @click="togglePassword">
                                        {{ showPassword ? "隐藏" : "显示" }}
                                    </button>
                                </div>
                            </div>

                            <div class="field">
                                <label class="label" for="register-confirm-password">确认密码</label>
                                <input
                                    id="register-confirm-password"
                                    v-model="registerForm.confirmPassword"
                                    class="input auth-input"
                                    :type="passwordInputType"
                                    placeholder="再次输入密码"
                                    autocomplete="new-password"
                                    @focus="handleInputFocus"
                                    @blur="handleInputBlur"
                                />
                            </div>

                            <div class="field">
                                <label class="label" for="register-code">邮箱验证码</label>
                                <div class="code-row">
                                    <input
                                        id="register-code"
                                        v-model="registerForm.code"
                                        class="input auth-input"
                                        type="text"
                                        placeholder="输入邮箱验证码"
                                        maxlength="6"
                                        @focus="handleInputFocus"
                                        @blur="handleInputBlur"
                                    />
                                    <button
                                        class="secondary-button send-code-button"
                                        type="button"
                                        :disabled="registerSendLoading || registerCountdown > 0"
                                        @click="handleSendRegisterCode"
                                    >
                                        {{ registerSendLoading ? "发送中..." : registerCountdown > 0 ? `${registerCountdown}s` : "获取验证码" }}
                                    </button>
                                </div>
                            </div>

                            <div class="action-row">
                                <button class="primary-button primary-button-full" type="submit" :disabled="registerLoading">
                                    {{ registerLoading ? "注册中..." : "注册账号" }}
                                </button>
                            </div>
                        </template>
                    </form>
                </div>
                <p class="login-footer">教师助手 <span>·</span> 教学工作台</p>
            </div>

            <div class="animation-column">
                <div class="brand-intro">
                    <span class="brand-eyebrow">TEACHER ASSISTANT</span>
                    <h2>专注教学，<br />让成长有迹可循。</h2>
                    <p>记录课堂里的每一次努力，<br />让日常教学，清晰有序。</p>
                    <div class="brand-capabilities">
                        <span>班级管理</span>
                        <span>课堂积分</span>
                        <span>学生成长</span>
                    </div>
                </div>
                <div class="animation-content">
                    <div class="animation-stage">
                        <AnimatedCharacters
                            :is-typing="isTyping"
                            :show-password="showPassword"
                            :password-length="currentPasswordLength"
                        />
                    </div>
                </div>
                <p class="brand-footer">为教学留出更多时间</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import BrandLogo from "@/components/common/BrandLogo.vue";
import AnimatedCharacters from "@/components/login/AnimatedCharacters.vue";
import QrLoginPanel from "@/components/login/QrLoginPanel.vue";
import { authApi } from "@/api/auth";
import { useCacheStore } from "@/stores/cacheStore";
import { useSessionStore } from "@/stores/sessionStore";
import { isApiRequestError } from "@/types/api";
import type { LoginType } from "@/types/api";
import { sha256Hex } from "@/utils/crypto";

type AuthTab = "login" | "register";
type LoginMethod = LoginType | "qr";

const router = useRouter();
const route = useRoute();
const cacheStore = useCacheStore();
const sessionStore = useSessionStore();

const activeTab = ref<AuthTab>("login");
const loginType = ref<LoginMethod>("password");
const showResetCard = ref(false);
const loginLoading = ref(false);
const registerLoading = ref(false);
const resetLoading = ref(false);
const loginSendLoading = ref(false);
const registerSendLoading = ref(false);
const resetSendLoading = ref(false);
const loginCountdown = ref(0);
const registerCountdown = ref(0);
const resetCountdown = ref(0);
const showPassword = ref(false);
const isTyping = ref(false);

const loginForm = reactive({
    email: "",
    password: "",
    code: "",
});

const registerForm = reactive({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
});

const resetForm = reactive({
    email: "",
    password: "",
    confirmPassword: "",
    code: "",
});

let loginCountdownTimer: number | undefined;
let registerCountdownTimer: number | undefined;
let resetCountdownTimer: number | undefined;
let isUnmounted = false;

const redirectPath = computed(() => {
    const target = route.query.redirect;
    return typeof target === "string" && target.trim() ? target : "/points";
});

const panelTitle = computed(() => {
    if (showResetCard.value) {
        return "重置密码";
    }
    return activeTab.value === "login" ? "欢迎登录" : "创建你的账号";
});

const panelDesc = computed(() => {
    if (showResetCard.value) {
        return "请输入邮箱验证码并设置新密码。";
    }
    return activeTab.value === "login"
        ? "新账号可先准备班级、学生和分组，自主开启 14 天免费试用。"
        : "注册后可先准备资料，准备就绪后再开启 14 天免费试用。";
});

const passwordInputType = computed(() => showPassword.value ? "text" : "password");

const currentPasswordLength = computed(() => {
    if (showResetCard.value) {
        return resetForm.password.length;
    }
    if (activeTab.value === "register") {
        return registerForm.password.length;
    }
    return loginType.value === "password" ? loginForm.password.length : 0;
});

/** 清理登录验证码倒计时。 */
function clearLoginCountdown(): void {
    if (loginCountdownTimer !== undefined) {
        window.clearInterval(loginCountdownTimer);
        loginCountdownTimer = undefined;
    }
}

/** 清理注册验证码倒计时。 */
function clearRegisterCountdown(): void {
    if (registerCountdownTimer !== undefined) {
        window.clearInterval(registerCountdownTimer);
        registerCountdownTimer = undefined;
    }
}

/** 清理重置密码验证码倒计时。 */
function clearResetCountdown(): void {
    if (resetCountdownTimer !== undefined) {
        window.clearInterval(resetCountdownTimer);
        resetCountdownTimer = undefined;
    }
}

/** 启动登录验证码倒计时。 */
function startLoginCountdown(): void {
    clearLoginCountdown();
    loginCountdown.value = 60;
    loginCountdownTimer = window.setInterval(() => {
        if (loginCountdown.value <= 1) {
            clearLoginCountdown();
            loginCountdown.value = 0;
            return;
        }
        loginCountdown.value -= 1;
    }, 1000);
}

/** 启动注册验证码倒计时。 */
function startRegisterCountdown(): void {
    clearRegisterCountdown();
    registerCountdown.value = 60;
    registerCountdownTimer = window.setInterval(() => {
        if (registerCountdown.value <= 1) {
            clearRegisterCountdown();
            registerCountdown.value = 0;
            return;
        }
        registerCountdown.value -= 1;
    }, 1000);
}

/** 启动重置密码验证码倒计时。 */
function startResetCountdown(): void {
    clearResetCountdown();
    resetCountdown.value = 60;
    resetCountdownTimer = window.setInterval(() => {
        if (resetCountdown.value <= 1) {
            clearResetCountdown();
            resetCountdown.value = 0;
            return;
        }
        resetCountdown.value -= 1;
    }, 1000);
}

/** 根据当前焦点更新动画输入状态。 */
function syncTypingState(): void {
    const activeElement = document.activeElement;
    isTyping.value = activeElement instanceof HTMLElement && activeElement.classList.contains("auth-input");
}

/** 校验邮箱格式是否有效。 */
function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+$/.test(email);
}

/** 根据登录态跳转到目标页面。 */
async function maybeRedirect(): Promise<void> {
    if (!cacheStore.isAuthenticated) {
        return;
    }
    clearLoginCountdown();
    clearRegisterCountdown();
    clearResetCountdown();
    await router.replace(redirectPath.value);
}

/** 切换登录或注册面板。 */
function switchTab(tab: AuthTab): void {
    activeTab.value = tab;
    showResetCard.value = false;
    showPassword.value = false;
}

/** 切换登录方式。 */
function switchLoginType(type: LoginMethod): void {
    if (loginLoading.value || loginSendLoading.value) {
        return;
    }
    loginType.value = type;
    showPassword.value = false;
    isTyping.value = false;
}

/** 打开重置密码面板。 */
function openResetCard(): void {
    showResetCard.value = true;
    showPassword.value = false;
    resetForm.email = loginForm.email.trim();
    resetForm.password = "";
    resetForm.confirmPassword = "";
    resetForm.code = "";
}

/** 关闭重置密码面板。 */
function closeResetCard(): void {
    showResetCard.value = false;
    showPassword.value = false;
}

/** 处理输入框聚焦后的动画状态。 */
function handleInputFocus(): void {
    isTyping.value = true;
}

/** 处理输入框失焦后的动画状态。 */
function handleInputBlur(): void {
    window.setTimeout(() => {
        syncTypingState();
    }, 0);
}

/** 切换密码显示与隐藏状态。 */
function togglePassword(): void {
    showPassword.value = !showPassword.value;
}

/** 发送登录验证码。 */
async function handleSendLoginCode(): Promise<void> {
    if (loginSendLoading.value || loginCountdown.value > 0 || loginLoading.value) {
        return;
    }
    const email = loginForm.email.trim();
    if (!email) {
        ElMessage.error("请先输入邮箱");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    loginSendLoading.value = true;
    try {
        await authApi.sendEmailCode({ email });
        if (isUnmounted) {
            return;
        }
        ElMessage.success("验证码已发送，请查收邮箱");
        startLoginCountdown();
    } catch (err) {
        if (!isUnmounted && !isApiRequestError(err)) {
            ElMessage.error("验证码发送失败，请稍后重试");
        }
    } finally {
        loginSendLoading.value = false;
    }
}

/** 发送注册验证码。 */
async function handleSendRegisterCode(): Promise<void> {
    if (registerSendLoading.value || registerCountdown.value > 0) {
        return;
    }
    const email = registerForm.email.trim();
    if (!email) {
        ElMessage.error("请先输入邮箱");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    registerSendLoading.value = true;
    try {
        await authApi.sendEmailCode({ email });
        ElMessage.success("验证码已发送，请查收邮箱");
        startRegisterCountdown();
    } catch {
    } finally {
        registerSendLoading.value = false;
    }
}

/** 发送重置密码验证码。 */
async function handleSendResetCode(): Promise<void> {
    if (resetSendLoading.value || resetCountdown.value > 0) {
        return;
    }
    const email = resetForm.email.trim();
    if (!email) {
        ElMessage.error("请先输入邮箱");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    resetSendLoading.value = true;
    try {
        await authApi.sendEmailCode({ email });
        ElMessage.success("验证码已发送，请查收邮箱");
        startResetCountdown();
    } catch {
    } finally {
        resetSendLoading.value = false;
    }
}

/** 提交登录请求并写入登录态。 */
async function handleLogin(): Promise<void> {
    if (loginLoading.value || loginSendLoading.value || loginType.value === "qr") {
        return;
    }
    const email = loginForm.email.trim();
    const password = loginForm.password.trim();
    const code = loginForm.code.trim();
    const type = loginType.value;
    if (!email) {
        ElMessage.error("请输入邮箱");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    if (type === "password" && !password) {
        ElMessage.error("请输入密码");
        return;
    }
    if (type === "code" && !/^\d{6}$/.test(code)) {
        ElMessage.error("请输入 6 位数字邮箱验证码");
        return;
    }
    loginLoading.value = true;
    let tokenReceived = false;
    try {
        const hashedPassword = type === "password" ? await sha256Hex(password) : "";
        const res = await authApi.login({
            email,
            login_type: type,
            password: hashedPassword,
            code: type === "code" ? code : "",
        });
        const token = res.data?.token;
        if (!token) {
            ElMessage.error("登录失败！请稍后再试");
            return;
        }
        cacheStore.setTokenOnly(token);
        tokenReceived = true;
        await sessionStore.initialize(true);
        ElMessage.success("登录成功");
        await maybeRedirect();
    } catch (err) {
        if (!tokenReceived) {
            sessionStore.reset();
            cacheStore.logout();
            if (!isApiRequestError(err)) {
                ElMessage.error("登录失败，请稍后重试");
            }
        }
    } finally {
        loginLoading.value = false;
    }
}

/** 使用扫码确认后的凭证初始化会话。 */
async function handleQrLogin(token: string): Promise<void> {
    if (isUnmounted || loginLoading.value || loginType.value !== "qr" || activeTab.value !== "login" || showResetCard.value) {
        return;
    }
    if (!token.trim()) {
        ElMessage.error("扫码登录失败，请刷新二维码重试");
        return;
    }
    loginLoading.value = true;
    cacheStore.setTokenOnly(token);
    try {
        await sessionStore.initialize(true);
        ElMessage.success("登录成功");
        await maybeRedirect();
    } catch {
        // 保留已确认的登录态，初始化错误由 App 的会话错误页承接。
    } finally {
        loginLoading.value = false;
    }
}

/** 提交注册请求。 */
async function handleRegister(): Promise<void> {
    if (registerLoading.value) {
        return;
    }
    const name = registerForm.name.trim();
    const email = registerForm.email.trim();
    const password = registerForm.password.trim();
    const confirmPassword = registerForm.confirmPassword.trim();
    const code = registerForm.code.trim();
    if (!name) {
        ElMessage.error("请输入姓名");
        return;
    }
    if (!email) {
        ElMessage.error("请输入邮箱");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    if (!password || password.length < 6) {
        ElMessage.error("密码至少 6 位");
        return;
    }
    if (password !== confirmPassword) {
        ElMessage.error("两次输入的密码不一致");
        return;
    }
    if (!code) {
        ElMessage.error("请输入邮箱验证码");
        return;
    }
    registerLoading.value = true;
    try {
        const hashedPassword = await sha256Hex(password);
        await authApi.register({ name, email, password: hashedPassword, code });
        clearRegisterCountdown();
        registerCountdown.value = 0;
        ElMessage.success("注册成功，请使用账号登录");
        activeTab.value = "login";
        loginType.value = "password";
        showPassword.value = false;
        loginForm.email = email;
        loginForm.password = "";
        registerForm.code = "";
    } catch (err) {
        if (!isApiRequestError(err)) {
            console.error(err);
            ElMessage.error("注册失败");
        }
    } finally {
        registerLoading.value = false;
    }
}

/** 提交密码重置请求。 */
async function handlePasswordReset(): Promise<void> {
    if (resetLoading.value) {
        return;
    }
    const email = resetForm.email.trim();
    const password = resetForm.password.trim();
    const confirmPassword = resetForm.confirmPassword.trim();
    const code = resetForm.code.trim();
    if (!email) {
        ElMessage.error("请输入邮箱");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    if (!password || password.length < 6) {
        ElMessage.error("密码至少 6 位");
        return;
    }
    if (password !== confirmPassword) {
        ElMessage.error("两次输入的密码不一致");
        return;
    }
    if (!code) {
        ElMessage.error("请输入邮箱验证码");
        return;
    }
    resetLoading.value = true;
    try {
        const hashedPassword = await sha256Hex(password);
        await authApi.passwordReset({ email, password: hashedPassword, code });
        clearResetCountdown();
        resetCountdown.value = 0;
        ElMessage.success("密码重置成功，请使用新密码登录");
        closeResetCard();
        activeTab.value = "login";
        loginType.value = "password";
        loginForm.email = email;
        loginForm.password = "";
        resetForm.password = "";
        resetForm.confirmPassword = "";
        resetForm.code = "";
    } catch (err) {
        if (!isApiRequestError(err)) {
            console.error(err);
            ElMessage.error("重置密码失败");
        }
    } finally {
        resetLoading.value = false;
    }
}

onMounted(async () => {
    await maybeRedirect();
});

onBeforeUnmount(() => {
    isUnmounted = true;
    clearLoginCountdown();
    clearRegisterCountdown();
    clearResetCountdown();
});
</script>

<style scoped>
.auth-page {
    position: relative;
    width: 100%;
    min-height: 100vh;
    color: var(--ta-text);
    background: var(--ta-bg);
}

.auth-shell {
    width: 100%;
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(380px, 44%) minmax(0, 1fr);
}

.form-column {
    position: relative;
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    padding: 70px 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.form-inner {
    width: 100%;
    max-width: 440px;
    padding: 36px;
    border: 1px solid var(--ta-line);
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 8px 40px #23352f05;
}

.brand-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.page-brand {
    position: absolute;
    top: 48px;
    left: clamp(32px, 4.5vw, 80px);
    z-index: 2;
    color: #ffffff;
}

.brand-title {
    font-size: 18px;
    font-weight: 650;
    line-height: 1.15;
    letter-spacing: 0.5px;
}

.brand-subtitle {
    margin-top: 3px;
    color: #adc4ba;
    font-size: 8px;
    letter-spacing: 1px;
}

.heading-block {
    margin-bottom: 24px;
}

.login-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--ta-blue);
    font-size: 12px;
    font-weight: 500;
}

.login-eyebrow > span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ta-blue);
}

.title {
    margin: 16px 0 8px;
    font-size: 28px;
    line-height: 1.3;
    font-weight: 650;
    letter-spacing: -0.5px;
}

.subtitle {
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 13px;
    line-height: 1.7;
}

.tab-switch {
    min-height: 44px;
    margin-bottom: 20px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-bottom: 1px solid var(--ta-line);
}

.tab-button {
    min-height: 44px;
    padding: 0 8px;
    border: 0;
    border-bottom: 2px solid transparent;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
}

.tab-button-active {
    border-bottom-color: var(--ta-blue);
    color: var(--ta-blue);
}

.form-block {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.login-method-switch {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    padding: 3px;
    border-radius: 8px;
    background: #f2f6f3;
}

.login-method-button {
    min-height: 36px;
    padding: 0 4px;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
}

.login-method-button-active {
    border-color: var(--ta-line);
    color: var(--ta-blue);
    background: #ffffff;
    box-shadow: 0 1px 3px #23352f05;
}

.login-method-button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.login-credential {
    display: grid;
}

.login-content {
    display: grid;
    min-height: 280px;
}

.login-fields {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.login-credential > .field {
    grid-area: 1 / 1;
}

.login-field-enter-active,
.login-field-leave-active {
    transition: opacity 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.login-field-enter-from,
.login-field-leave-to {
    opacity: 0;
}

.login-helper-hidden {
    visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
    .login-field-enter-active,
    .login-field-leave-active {
        transition: none;
    }
}

.field {
    display: flex;
    flex-direction: column;
    gap: 7px;
}

.label {
    color: #46584e;
    font-size: 12px;
    line-height: 20px;
    font-weight: 500;
}

.input {
    min-width: 0;
    width: 100%;
    height: 44px;
    padding: 0 13px;
    border: 1px solid #dce5df;
    border-radius: 8px;
    color: var(--ta-text);
    background: #ffffff;
    font-size: 13px;
    outline: 0;
}

.input::placeholder {
    color: #9aa69f;
}

.input:focus {
    border-color: var(--ta-blue);
    box-shadow: 0 0 0 3px #18746412;
}

.password-row,
.code-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
}

.toggle-button,
.secondary-button,
.ghost-button,
.primary-button,
.link-button {
    border: 0;
    cursor: pointer;
}

.toggle-button,
.secondary-button,
.ghost-button {
    min-height: 44px;
    padding: 0 13px;
    border-radius: 8px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px #dce5df;
    font-size: 12px;
    font-weight: 500;
}

.toggle-button {
    color: var(--ta-blue);
}

.secondary-button {
    color: var(--ta-blue);
    background: #f2f6f3;
    box-shadow: inset 0 0 0 1px var(--ta-line);
}

.send-code-button {
    min-width: 104px;
}

.helper-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -4px;
}

.link-button {
    padding: 3px 0;
    color: var(--ta-blue);
    background: transparent;
    font-size: 12px;
    font-weight: 500;
}

.action-row {
    margin-top: 2px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.action-row-between {
    justify-content: space-between;
}

.primary-button {
    min-width: 126px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 8px;
    color: #ffffff;
    background: var(--ta-blue);
    font-size: 13px;
    font-weight: 500;
}

.primary-button:hover:not(:disabled) {
    background: #206959;
}

.primary-button-full {
    width: 100%;
}

.secondary-button:disabled,
.primary-button:disabled,
.toggle-button:disabled,
.ghost-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

button:focus-visible {
    outline: 2px solid var(--ta-blue);
    outline-offset: 3px;
}

.login-footer {
    position: absolute;
    bottom: 28px;
    margin: 0;
    color: var(--ta-text-secondary);
    font-size: 11px;
}

.login-footer span {
    padding: 0 8px;
}

.animation-column {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    min-height: 100vh;
    padding: 168px clamp(32px, 4.5vw, 80px) 32px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: #ffffff;
    background: #184c40;
}

.brand-intro {
    margin-top: clamp(12px, 3vh, 36px);
}

.brand-eyebrow {
    color: #a5c2b5;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
}

.brand-intro h2 {
    margin: 18px 0 20px;
    font-size: clamp(32px, 3.1vw, 48px);
    font-weight: 550;
    line-height: 1.45;
    letter-spacing: 2px;
}

.brand-intro p {
    margin: 0;
    color: #b9cec4;
    font-size: 14px;
    line-height: 1.9;
}

.brand-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 32px;
    color: #d3e1d9;
    font-size: 12px;
}

.brand-capabilities > span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}

.brand-capabilities > span::before {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #a4c4b3;
    content: "";
}

.animation-content {
    width: 100%;
    margin: 24px 0;
}

.animation-stage {
    height: 210px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.animation-stage :deep(.animated-characters) {
    flex-shrink: 0;
    transform: scale(0.55);
}

.brand-footer {
    margin: auto 0 0;
    padding-top: 20px;
    color: #91b1a1;
    font-size: 11px;
    letter-spacing: 2px;
}

@media (max-height: 780px) and (min-width: 761px) {
    .animation-column {
        padding-top: 128px;
    }

    .brand-intro {
        margin-top: 12px;
    }

    .animation-stage {
        height: 160px;
    }

    .animation-stage :deep(.animated-characters) {
        transform: scale(0.45);
    }
}

@media (max-width: 1000px) {
    .auth-shell {
        grid-template-columns: minmax(320px, 42%) minmax(0, 1fr);
    }

    .page-brand {
        top: 36px;
        left: 28px;
    }

    .animation-column {
        padding-right: 28px;
        padding-left: 28px;
    }

    .brand-intro h2 {
        font-size: 32px;
    }

    .brand-capabilities {
        gap: 12px;
    }

    .form-column {
        padding: 64px 24px;
    }

    .form-inner {
        padding: 30px;
    }
}

@media (max-width: 760px) {
    .auth-page {
        padding-top: 80px;
    }

    .auth-shell {
        display: flex;
        flex-direction: column;
        min-height: calc(100vh - 80px);
    }

    .page-brand {
        top: 0;
        left: 0;
        width: 100%;
        height: 80px;
        padding: 0 24px;
        background: #184c40;
    }

    .brand-logo {
        --brand-logo-size: 32px;
    }

    .brand-title {
        font-size: 16px;
    }

    .animation-column {
        display: none;
    }

    .form-column {
        flex: 1;
        padding: 44px 20px 72px;
    }

    .form-inner {
        max-width: 440px;
        padding: 30px 24px;
    }

    .login-footer {
        bottom: 24px;
    }
}

@media (max-width: 480px) {
    .form-column {
        padding-right: 16px;
        padding-left: 16px;
    }

    .form-inner {
        padding: 28px 20px;
    }

    .toggle-button {
        min-width: 52px;
        padding-inline: 10px;
    }

    .send-code-button {
        min-width: 94px;
        padding-inline: 9px;
    }
}
</style>
