<template>
    <article id="mini-program-binding" class="settings-section">
        <div class="settings-section__intro">
            <h3>绑定小程序</h3>
            <p>绑定后可在微信小程序中使用同一账号，也可以扫码登录网页。</p>
        </div>
        <div class="settings-section__body">
            <p v-if="wechatBound" class="binding-status binding-status--success">已绑定小程序</p>
            <template v-else-if="wechatBound === false">
                <p class="binding-status">当前账号尚未绑定小程序</p>
                <QrLoginPanel v-if="showQrCode" :key="userId" purpose="bind" @bound="emit('bound')" />
                <button v-else type="button" class="binding-button" @click="showQrCode = true">生成绑定二维码</button>
            </template>
            <p v-else class="binding-status">暂未获取到绑定状态，请刷新页面后重试。</p>
        </div>
    </article>
</template>

<script setup lang="ts">
import { ref } from "vue";
import QrLoginPanel from "@/components/login/QrLoginPanel.vue";

defineProps<{ userId: string; wechatBound?: boolean }>();
const emit = defineEmits<{ bound: [] }>();
const showQrCode = ref(false);
</script>

<style scoped>
.settings-section {
    padding: 28px 4px;
    display: grid;
    grid-template-columns: minmax(180px, 230px) minmax(0, 1fr);
    gap: clamp(28px, 5vw, 72px);
    border-bottom: 1px solid var(--ta-line);
}

.settings-section__intro h3 {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.015em;
}

.settings-section__intro p,
.binding-status {
    margin: 7px 0 16px;
    color: var(--ta-text-tertiary);
    font-size: 13px;
    line-height: 1.6;
}

.settings-section__body {
    min-width: 0;
}

.binding-status--success {
    color: #1b7133;
}

.binding-button {
    min-height: 38px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    color: #ffffff;
    background: var(--ta-blue);
    font-size: 14px;
    font-weight: 620;
    cursor: pointer;
}

@media (max-width: 920px) {
    .settings-section {
        grid-template-columns: minmax(150px, 190px) minmax(0, 1fr);
        gap: 28px;
    }
}

@media (max-width: 660px) {
    .settings-section {
        grid-template-columns: 1fr;
        gap: 16px;
        padding-block: 22px;
    }
}
</style>
