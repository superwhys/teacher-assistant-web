<template>
    <ToolsStandalonePageFrame>
        <section class="tools-rollcall-page__content">
            <ToolsRollCallCard :show-open-page-action="false" @open-students="goToStudents" />
        </section>
    </ToolsStandalonePageFrame>
</template>

<script setup lang="ts">
import ToolsRollCallCard from "@/v3/components/tools/ToolsRollCallCard.vue";
import ToolsStandalonePageFrame from "@/v3/components/tools/ToolsStandalonePageFrame.vue";
import { useRouter } from "vue-router";

defineOptions({ name: "ToolsRollCallPage" })

const router = useRouter()
/** 跳转到学生管理页。 */
function goToStudents(): void {
    void router.push("/students")
}
</script>

<style scoped>
.tools-rollcall-page__content {
    height: 100%;
    min-height: 0;
    display: flex;
}

.tools-rollcall-page__content :deep(.tools-card-panel) {
    flex: 1;
    min-height: 0;
}
</style>
