<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useBusinessAccess } from '@/composables/useBusinessAccess'
import { useCacheStore } from '@/stores/cacheStore'
import CollectionTaskWorkspace from '@/v3/components/collections/CollectionTaskWorkspace.vue'

const cache = useCacheStore()
const { canWrite } = useBusinessAccess()
const classId = computed(() => cache.getActiveClassId())
const semesterId = computed(() => cache.getActiveSemesterId())
const semesterStatus = computed(() => cache.getActiveSemesterStatus())
</script>

<template>
    <div class="collection-view">
        <PageHeader title="作业收交清单" description="按次登记作业，查看待交名单并记录补交。" />
        <p v-if="!classId || !semesterId" role="status">请先选择班级和学期。</p>
        <template v-else>
            <p v-if="semesterStatus === 2" role="status">当前为归档学期，可查看历史收交记录。</p>
            <CollectionTaskWorkspace :key="[cache.profile?.id, classId, semesterId].join(':')"
                :class-id="classId" :semester-id="semesterId" :writable="canWrite && semesterStatus === 1" />
        </template>
    </div>
</template>

<style scoped>
.collection-view { display: grid; gap: 20px; }
.collection-view > p { margin: 0; color: var(--ta-text-secondary); }
</style>
