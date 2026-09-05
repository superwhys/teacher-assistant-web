<template>
    <section class="tools-standalone-page-frame">
        <div class="tools-standalone-page-frame__toolbar">
            <RouterLink to="/tools" class="tools-standalone-page-frame__back">
                <i-ep-arrow-left aria-hidden="true" />
                <span>返回工具列表</span>
            </RouterLink>
        </div>
        <div class="tools-standalone-page-frame__content" :class="`tools-standalone-page-frame__content--${contentWidth}`">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineOptions({ name: "ToolsStandalonePageFrame" })

/** 定义工具独立页面框架属性。 */
interface ToolsStandalonePageFrameProps {
    contentWidth?: "default" | "wide"
}

withDefaults(defineProps<ToolsStandalonePageFrameProps>(), {
    contentWidth: "default"
})
</script>

<style scoped>
.tools-standalone-page-frame,
.tools-standalone-page-frame__content {
    width: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
}

.tools-standalone-page-frame {
    gap: 12px;
}

.tools-standalone-page-frame__toolbar {
    display: flex;
    align-items: center;
}

.tools-standalone-page-frame__back {
    min-height: 36px;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid var(--ta-line-strong);
    border-radius: 10px;
    color: var(--ta-text-secondary);
    background: #ffffff;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: color 140ms ease, background-color 140ms ease, transform 100ms ease;
}

.tools-standalone-page-frame__back:hover {
    color: var(--ta-text);
    background: #fafafa;
}

.tools-standalone-page-frame__back:active {
    transform: scale(0.97);
}

.tools-standalone-page-frame__back svg {
    width: 16px;
    height: 16px;
}
</style>
