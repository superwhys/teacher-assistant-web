<template>
  <div class="login-demo">
    <div class="panel">
      <div class="form-column">
        <h1 class="title">Welcome back!</h1>
        <p class="subtitle">这个示例只演示登录页动画状态联动。</p>

        <div class="field">
          <label class="label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            class="input"
            type="email"
            placeholder="you@example.com"
            @focus="handleInputFocus"
            @blur="handleInputBlur"
          />
        </div>

        <div class="field">
          <label class="label" for="password">Password</label>
          <div class="password-row">
            <input
              id="password"
              v-model="password"
              class="input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
            />
            <button class="toggle-button" type="button" @click="togglePassword">
              {{ showPassword ? "隐藏" : "显示" }}
            </button>
          </div>
        </div>
      </div>

      <div class="animation-column">
        <AnimatedCharacters
          :is-typing="isTyping"
          :show-password="showPassword"
          :password-length="password.length"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import AnimatedCharacters from "./AnimatedCharacters.vue";

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const isTyping = ref(false);

/** 处理输入框聚焦状态。 */
function handleInputFocus() {
  isTyping.value = true;
}

/** 处理输入框失焦状态。 */
function handleInputBlur() {
  isTyping.value = false;
}

/** 切换密码显隐状态。 */
function togglePassword() {
  showPassword.value = !showPassword.value;
}
</script>

<style scoped>
.login-demo {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: #f4f5f7;
  box-sizing: border-box;
}

.panel {
  width: 100%;
  max-width: 1180px;
  min-height: 720px;
  display: grid;
  grid-template-columns: 420px 1fr;
  border-radius: 24px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(17, 24, 39, 0.08);
}

.form-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px;
}

.title {
  margin: 0 0 8px;
  font-size: 32px;
  line-height: 1.2;
  color: #111827;
}

.subtitle {
  margin: 0 0 32px;
  color: #6b7280;
}

.field {
  margin-bottom: 20px;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input:focus {
  border-color: #5d63ff;
  box-shadow: 0 0 0 3px rgba(93, 99, 255, 0.12);
}

.password-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.toggle-button {
  height: 48px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
}

.animation-column {
  display: flex;
  align-items: end;
  justify-content: center;
  padding: 48px;
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 52%, #4b5563 100%);
}

@media (max-width: 1024px) {
  .panel {
    grid-template-columns: 1fr;
  }

  .animation-column {
    min-height: 420px;
    align-items: center;
  }
}
</style>
