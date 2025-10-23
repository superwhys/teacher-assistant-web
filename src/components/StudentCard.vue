<script setup lang="ts">
import type { Student } from '@/types/student'

const props = defineProps<{ student: Student }>()
const emit = defineEmits<{
    (e: 'remove', name: string): void
    (e: 'edit', student: Student): void
}>()

function onRemove() {
    emit('remove', props.student.studentName)
}

function onEdit() {
    emit('edit', props.student)
}
</script>

<template>
    <div class="student-card">
        <div class="overlay-actions">
            <el-button text class="overlay-btn" @click.stop="onEdit">
                <i-ep-edit />
            </el-button>
            <el-button text class="overlay-btn danger" @click.stop="onRemove">
                <i-ep-delete />
            </el-button>
        </div>
        <div :class="['student-avatar', student.gender]">
            <i-ep-male v-if="student.gender === 'male'" />
            <i-ep-female v-else />
        </div>
        <div class="student-name">{{ student.studentName }}</div>
    </div>
    
</template>

<style scoped>
.student-card {
    position: relative;
    padding: 16px 12px;
    border: 1px solid #eee;
    border-radius: 14px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    overflow: hidden;
}

.overlay-actions {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.85);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
}

.student-card:hover .overlay-actions,
.student-card:focus-within .overlay-actions,
.student-card:active .overlay-actions {
    opacity: 1;
    pointer-events: auto;
}

.student-avatar {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 22px;
    box-shadow: var(--shadow-light);
}

.student-avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.student-avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.student-name {
    font-size: 18px;
    font-weight: 600;
}

.overlay-btn {
    color: #666;
    font-size: 18px;
    padding: 0;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.04);
}

.overlay-btn:hover {
    background: rgba(0, 0, 0, 0.08);
}

.overlay-btn.danger {
    color: #e24a4a;
}
</style>


