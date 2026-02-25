<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { submitOpinion } from '@/api/opinion'

const opinionContent = ref('')
const submitting = ref(false)

async function handleSubmit() {
  if (!opinionContent.value.trim()) {
    ElMessage.warning('请输入反馈内容')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定提交反馈吗？', '确认提交', {
      type: 'info',
      confirmButtonText: '提交',
      cancelButtonText: '取消'
    })
    
    submitting.value = true
    await submitOpinion({ content: opinionContent.value.trim() })
    ElMessage.success('反馈已提交，感谢您的宝贵意见！')
    opinionContent.value = ''
  } catch {
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="opinion-view">
    <el-card class="opinion-card">
      <template #header>
        <div class="card-header">
          <span>意见反馈</span>
        </div>
      </template>
      <el-form>
        <el-form-item label="">
          <el-input
            v-model="opinionContent"
            type="textarea"
            :rows="8"
            placeholder="请输入您的宝贵意见或建议..."
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="submitting"
            style="width: 100%"
          >
            提交反馈
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.opinion-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.opinion-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>