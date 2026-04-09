<template>
    <ToolsStandalonePageFrame>
        <section class="tools-rollcall-page__content">
            <ToolsRollCallCard :disabled="students.length === 0" :initials="currentRollCallInitials"
                :show-open-page-action="false" :student-count="students.length" :student-meta="currentRollCallMeta"
                :student-name="currentRollCallName" @open-students="goToStudents" @random="drawRandomStudent" />
        </section>
    </ToolsStandalonePageFrame>
</template>

<script setup lang="ts">
import ToolsRollCallCard from "@/v3/components/tools/ToolsRollCallCard.vue";
import ToolsStandalonePageFrame from "@/v3/components/tools/ToolsStandalonePageFrame.vue";
import { useToolsWorkspace } from "@/v3/composables/useToolsWorkspace";
import { useRouter } from "vue-router";

defineOptions({ name: "ToolsRollCallPage" })

const router = useRouter()
const {
    currentRollCallInitials,
    currentRollCallMeta,
    currentRollCallName,
    drawRandomStudent,
    students
} = useToolsWorkspace()

/** 跳转到学生管理页。 */
function goToStudents(): void {
    void router.push("/v3/students")
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
