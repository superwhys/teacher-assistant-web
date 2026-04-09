<template>
    <ToolsStandalonePageFrame content-width="wide">
        <section class="tools-lottery-page__content">
            <ToolsLotteryWorkspace />
        </section>
    </ToolsStandalonePageFrame>
</template>

<script setup lang="ts">
import ToolsStandalonePageFrame from "@/v3/components/tools/ToolsStandalonePageFrame.vue";
import ToolsLotteryWorkspace from "@/v3/components/tools/ToolsLotteryWorkspace.vue";

defineOptions({ name: "ToolsLotteryPage" })
</script>

<style scoped>
.tools-lottery-page__content {
    flex: 1 1 0;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    min-width: 0;
    display: flex;
    overflow: hidden;
}

.tools-lottery-page__content :deep(.tools-lottery-workspace) {
    flex: 1;
    height: 100%;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
}

@media (max-width: 1080px) {
    .tools-lottery-page__content {
        height: auto;
        max-height: none;
        overflow: visible;
    }
}
</style>
