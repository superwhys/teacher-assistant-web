<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ApiGender } from '@/types/student'
import type { UiStudent } from './ClassStudentList.vue'

const props = defineProps<{
    modelValue: boolean
    student: UiStudent | null
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'save', payload: { id: number, name: string, gender: ApiGender }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const editName = ref('')
const editGender = ref<ApiGender>(1)

watch(() => props.student, (s) => {
    if (!s) {
        editName.value = ''
        editGender.value = 1
        return
    }
    editName.value = s.name
    if (s.gender === 'female') editGender.value = 2
    else if (s.gender === 'male') editGender.value = 1
    else editGender.value = 0
}, { immediate: true })

function onSave() {
    if (!props.student) return
    const name = editName.value.trim()
    if (!name) {
        ElMessage.error('请输入学生姓名')
        return
    }
    emit('save', { id: props.student.id, name, gender: editGender.value })
}
</script>

<template>
    <el-dialog v-model="visible" title="编辑学生" width="420px">
        <el-form label-position="top">
            <el-form-item label="姓名">
                <el-input v-model="editName" placeholder="请输入学生姓名" />
            </el-form-item>
            <el-form-item label="性别">
                <el-radio-group v-model="editGender">
                    <el-radio-button :label="1">男</el-radio-button>
                    <el-radio-button :label="2">女</el-radio-button>
                    <el-radio-button :label="0">未知</el-radio-button>
                </el-radio-group>
            </el-form-item>
        </el-form>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="visible = false">取消</el-button>
                <el-button type="primary" @click="onSave">保存</el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
.dialog-footer {
    display: inline-flex;
    gap: 8px;
}
</style>
