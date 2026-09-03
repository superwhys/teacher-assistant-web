<template>
    <div class="auth-page">
        <div class="brand-row page-brand">
            <img class="brand-logo" src="/icon.svg" alt="教师助手" />
            <div>
                <div class="brand-title">教师助手</div>
                <div class="brand-subtitle">Teacher Assistant</div>
            </div>
        </div>

        <div class="auth-shell">
            <div class="form-column">
                <div class="form-inner">
                    <div class="heading-block">
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
                            <div class="field">
                                <label class="label" for="login-email">邮箱</label>
                                <input
                                    id="login-email"
                                    v-model="loginForm.email"
                                    class="input auth-input"
                                    type="email"
                                    placeholder="输入邮箱"
                                    autocomplete="email"
                                    @focus="handleInputFocus"
                                    @blur="handleInputBlur"
                                />
                            </div>

                            <div class="field">
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

                            <div class="helper-row">
                                <button class="link-button" type="button" @click="openResetCard">忘记密码？</button>
                            </div>

                            <div class="action-row">
                                <button class="primary-button primary-button-full" type="submit" :disabled="loginLoading">
                                    {{ loginLoading ? "登录中..." : "登录" }}
                                </button>
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
            </div>

            <div class="animation-column">
                <div class="animation-content">
                    <div class="animation-stage">
                        <AnimatedCharacters
                            :is-typing="isTyping"
                            :show-password="showPassword"
                            :password-length="currentPasswordLength"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import AnimatedCharacters from "@/components/login/AnimatedCharacters.vue";
import { authApi } from "@/api/auth";
import { useCacheStore } from "@/stores/cacheStore";
import { isApiRequestError } from "@/types/api";
import { sha256Hex } from "@/utils/crypto";

type AuthTab = "login" | "register";

const router = useRouter();
const route = useRoute();
const cacheStore = useCacheStore();

const activeTab = ref<AuthTab>("login");
const showResetCard = ref(false);
const loginLoading = ref(false);
const registerLoading = ref(false);
const resetLoading = ref(false);
const registerSendLoading = ref(false);
const resetSendLoading = ref(false);
const registerCountdown = ref(0);
const resetCountdown = ref(0);
const showPassword = ref(false);
const isTyping = ref(false);

const loginForm = reactive({
    email: "",
    password: "",
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

let registerCountdownTimer: number | undefined;
let resetCountdownTimer: number | undefined;

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
        ? "首次登录可免费试用 7 天。"
        : "注册成功后即可使用邮箱密码登录系统。";
});

const passwordInputType = computed(() => showPassword.value ? "text" : "password");

const currentPasswordLength = computed(() => {
    if (showResetCard.value) {
        return resetForm.password.length;
    }
    if (activeTab.value === "register") {
        return registerForm.password.length;
    }
    return loginForm.password.length;
});

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
    return /.+@.+/.test(email);
}

/** 根据登录态跳转到目标页面。 */
async function maybeRedirect(): Promise<void> {
    if (!cacheStore.isAuthenticated) {
        return;
    }
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
    if (loginLoading.value) {
        return;
    }
    const email = loginForm.email.trim();
    const password = loginForm.password.trim();
    if (!email || !password) {
        ElMessage.error("请输入邮箱与密码");
        return;
    }
    if (!validateEmail(email)) {
        ElMessage.error("请输入有效的邮箱地址");
        return;
    }
    loginLoading.value = true;
    try {
        const hashedPassword = await sha256Hex(password);
        const res = await authApi.login({
            email,
            login_type: "password",
            password: hashedPassword,
            code: "",
        });
        const token = res.data?.token;
        if (!token) {
            ElMessage.error("登录失败！请稍后再试");
            return;
        }
        cacheStore.setTokenOnly(token);
        ElMessage.success("登录成功");
        await maybeRedirect();
    } catch {
        cacheStore.logout();
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
    clearRegisterCountdown();
    clearResetCountdown();
});
</script>

<style scoped>
.auth-page {
    position: relative;
    width: 100%;
    min-height: 100vh;
    overflow: hidden;
    color: var(--ta-text);
    background: var(--ta-bg);
}

.auth-shell {
    width: 100%;
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(420px, 1fr);
}

.form-column {
    grid-column: 2;
    grid-row: 1;
    min-width: 0;
    padding: 72px clamp(34px, 5vw, 72px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-left: 1px solid var(--ta-line);
    background: rgba(255, 255, 255, 0.9);
}

.form-inner {
    width: min(420px, 100%);
}

.brand-row {
    display: flex;
    align-items: center;
    gap: 11px;
}

.page-brand {
    position: absolute;
    top: 28px;
    left: 32px;
    z-index: 2;
}

.brand-logo {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 122, 255, 0.18);
}

.brand-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.015em;
}

.brand-subtitle {
    margin-top: 2px;
    color: var(--ta-text-tertiary);
    font-size: 11px;
}

.heading-block {
    margin-bottom: 24px;
}

.title {
    margin: 0;
    font-size: 32px;
    line-height: 1.2;
    letter-spacing: -0.035em;
}

.subtitle {
    margin: 8px 0 0;
    color: var(--ta-text-tertiary);
    font-size: 14px;
    line-height: 1.55;
}

.tab-switch {
    min-height: 44px;
    margin-bottom: 22px;
    padding: 4px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px;
    border-radius: 13px;
    background: #e9e9ed;
}

.tab-button {
    min-height: 36px;
    border: 0;
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: transparent;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.tab-button-active {
    color: var(--ta-text);
    background: #ffffff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.12);
}

.form-block {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.label {
    color: var(--ta-text-secondary);
    font-size: 12px;
    font-weight: 600;
}

.input {
    width: 100%;
    height: 44px;
    padding: 0 13px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 11px;
    color: var(--ta-text);
    background: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    outline: 0;
}

.input:focus {
    border-color: rgba(0, 122, 255, 0.65);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
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
    border-radius: 11px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    box-shadow: inset 0 0 0 1px var(--ta-line-strong);
    font-size: 13px;
    font-weight: 600;
}

.toggle-button {
    color: var(--ta-blue);
}

.secondary-button {
    color: #0064cf;
    background: #e6f2ff;
    box-shadow: none;
}

.send-code-button {
    min-width: 112px;
}

.helper-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -2px;
}

.link-button {
    padding: 3px 0;
    color: var(--ta-blue);
    background: transparent;
    font-size: 12px;
    font-weight: 600;
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
    border-radius: 11px;
    color: #ffffff;
    background: var(--ta-blue);
    box-shadow: 0 7px 18px rgba(0, 122, 255, 0.2);
    font-size: 13px;
    font-weight: 650;
}

.primary-button-full {
    width: 100%;
}

.secondary-button:disabled,
.primary-button:disabled,
.toggle-button:disabled,
.ghost-button:disabled {
    opacity: 0.45;
}

.animation-column {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    padding: 70px clamp(30px, 4vw, 56px) 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
        radial-gradient(circle at 22% 14%, rgba(0, 122, 255, 0.11), transparent 28%),
        radial-gradient(circle at 84% 86%, rgba(94, 92, 230, 0.1), transparent 30%),
        #eef2f8;
}

.animation-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.animation-stage {
    min-height: 420px;
    display: flex;
    align-items: center;
    justify-content: center;
}

@media (max-width: 920px) {
    .auth-page {
        overflow: auto;
        background:
            radial-gradient(circle at 20% 10%, rgba(0, 122, 255, 0.12), transparent 28%),
            radial-gradient(circle at 84% 85%, rgba(94, 92, 230, 0.09), transparent 30%),
            var(--ta-bg);
    }

    .auth-shell {
        display: block;
    }

    .animation-column {
        display: none;
    }

    .form-column {
        min-height: 100vh;
        padding: 104px 22px 44px;
        border-left: 0;
        background: transparent;
    }

    .form-inner {
        width: min(460px, 100%);
        padding: 24px;
        border: 1px solid rgba(255, 255, 255, 0.78);
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.86);
        box-shadow: var(--ta-shadow-1);
        backdrop-filter: blur(20px) saturate(150%);
    }

    .page-brand {
        top: 22px;
        left: 22px;
    }
}

@media (max-width: 480px) {
    .form-column {
        padding: 84px 14px 28px;
    }

    .form-inner {
        padding: 20px 16px;
        border-radius: 19px;
    }

    .page-brand {
        top: 16px;
        left: 16px;
    }

    .brand-logo {
        width: 36px;
        height: 36px;
        border-radius: 10px;
    }

    .brand-title {
        font-size: 16px;
    }

    .title {
        font-size: 27px;
    }

    .password-row,
    .code-row {
        grid-template-columns: minmax(0, 1fr) auto;
    }

    .toggle-button {
        min-width: 58px;
        padding-inline: 10px;
    }

    .send-code-button {
        min-width: 96px;
        padding-inline: 9px;
        font-size: 11px;
    }

    .action-row {
        align-items: stretch;
        flex-direction: column;
    }

    .action-row .ghost-button,
    .action-row .primary-button {
        width: 100%;
    }
}
</style>
