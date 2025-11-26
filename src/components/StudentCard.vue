<script setup lang="ts">
import type { Student } from '@/types/student'

const props = defineProps<{ student: Student }>()
const emit = defineEmits<{
    (e: 'remove', name: string): void
    (e: 'edit', student: Student): void
    (e: 'view-stats', student: Student): void
}>()

function onRemove() {
    emit('remove', props.student.studentName)
}

function onEdit() {
    emit('edit', props.student)
}

function onViewStats() {
    emit('view-stats', props.student)
}
</script>

<template>
    <div class="student-card">
        <div class="card-main">
            <div class="overlay-actions">
                <el-button text class="overlay-btn" @click.stop="onEdit" title="编辑">
                    <i-ep-edit />
                </el-button>
                <el-button text class="overlay-btn danger" @click.stop="onRemove" title="删除">
                    <i-ep-delete />
                </el-button>
            </div>
            
            <div :class="['student-avatar', student.gender]">
                <i-ep-male v-if="student.gender === 'male'" />
                <i-ep-female v-else />
            </div>
            <div class="student-name">{{ student.studentName }}</div>
        </div>
        
        <div class="card-footer">
            <el-button text class="action-btn primary" @click.stop="onViewStats">
                <i-ep-trend-charts />
            </el-button>
        </div>
    </div>
    
</template>

<style scoped>
.student-card {
    position: relative;
    border: 1px solid #eee;
    border-radius: 12px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s ease;
}

.student-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-color: #e0e0e0;
}

.card-main {
    position: relative;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    flex: 1;
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
    z-index: 2;
}

.card-main:hover .overlay-actions,
.card-main:focus-within .overlay-actions,
.card-main:active .overlay-actions {
    opacity: 1;
    pointer-events: auto;
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

.student-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 24px;
    box-shadow: var(--shadow-light);
}

.student-avatar.male {
    background: linear-gradient(135deg, #4f8df9, #6aa2ff);
}

.student-avatar.female {
    background: linear-gradient(135deg, #f975a8, #f9948a);
}

.student-name {
    font-size: 17px;
    font-weight: 600;
    color: #333;
}

.card-footer {
    background: #fcfcfc;
    border-top: 1px solid #f0f0f0;
    height: 40px;
    display: flex;
    padding: 0;
    width: 100%;
}

.action-btn {
    width: 100%;
    height: 100%;
    border-radius: 0;
    margin: 0 !important;
    padding: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #909399;
    font-size: 18px;
}

.action-btn:hover {
    background: #f5f7fa;
    color: #606266;
}

.action-btn.primary {
    color: #909399; /* 默认灰色 */
}

.action-btn.primary:hover {
    background: #ecf5ff;
    color: #409eff;
}

</style>
