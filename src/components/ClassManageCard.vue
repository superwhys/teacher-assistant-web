<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BaseCard from '@/components/BaseCard.vue'
import { useClassStore } from '@/stores/classStore'

const classStore = useClassStore()
const activeClass = computed(() => classStore.activeClass)
const activeClassId = computed({
    get: () => classStore.activeClassId,
    set: (val: string | null) => { if (val) classStore.setActiveClass(val) }
})

async function removeCurrentClass() {
    if (!activeClassId.value) return
    try {
        await ElMessageBox.confirm(`确定删除班级「${activeClass.value?.name ?? ''}」吗？`, '删除确认', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        })
        classStore.removeClass(activeClassId.value)
        ElMessage.success('已删除班级')
    } catch (e) {
        // 用户取消
    }
}
</script>

<template>
    <div class="left">
        <BaseCard title="班级管理" shadow="hover" cardClass="class-card">
            <div class="class-manage">
                <div class="current-class" v-if="activeClass">
                    当前班级：<span class="class-name">{{ activeClass.name }}</span>
                </div>
                <div class="class-actions">
                    <el-button type="danger" plain :disabled="!activeClassId" @click="removeCurrentClass">
                        <i-ep-delete /> 删除当前班级
                    </el-button>
                </div>
            </div>
        </BaseCard>
    </div>
</template>

<style scoped>
.class-manage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 10px;
}

.current-class {
    flex: 1;
    min-width: 0;
    color: #666666;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.class-name {
    color: #333333;
    font-weight: 600;
}

.class-actions {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
}
</style>
