<template>
    <section class="tools-standalone-page-frame">
        <div class="tools-standalone-page-frame__content" :class="`tools-standalone-page-frame__content--${contentWidth}`">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
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
.tools-standalone-page-frame {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.tools-standalone-page-frame__content {
    width: 100%;
    margin: 0 auto;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.tools-standalone-page-frame__content--default {
    width: min(920px, 100%);
}

.tools-standalone-page-frame__content--wide {
    width: min(1280px, 100%);
}
</style>
