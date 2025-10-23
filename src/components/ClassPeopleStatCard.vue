<script setup lang="ts">
import { computed } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import { useClassStore } from '@/stores/classStore'
import { useStudentStore } from '@/stores/studentStore'

const classStore = useClassStore()
const studentStore = useStudentStore()
const activeClassId = computed(() => classStore.activeClassId)
const totalStudents = computed(() => {
    const id = activeClassId.value
    return id ? studentStore.totalByClassId(id) : 0
})
</script>

<template>
    <BaseCard shadow="hover" cardClass="stat-card stat-people">
        <div class="stat">
            <div class="stat-icon"><i-ep-user /></div>
            <div class="stat-content">
                <div class="stat-label">班级人数</div>
                <div class="stat-value">{{ totalStudents }}</div>
            </div>
        </div>
    </BaseCard>
</template>

<style scoped>
.stat-card {
    border-radius: 16px;
}

.stat {
    display: flex;
    align-items: center;
    gap: 16px;
}

.stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    background: #f2f2f3;
}

.stat-content {
    display: flex;
    flex-direction: column;
}

.stat-label {
    color: #666;
}

.stat-value {
    margin-top: 4px;
    font-size: 32px;
    font-weight: 700;
}

.stat-people {
    background: linear-gradient(180deg, #eef6ff, #ffffff);
}

@media (max-width: 600px) {
    .stat-value {
        font-size: 26px;
    }
}
</style>
