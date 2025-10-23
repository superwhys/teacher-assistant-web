<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { ElMessage } from 'element-plus'
import { secretApi } from '@/api/secret'
import { useLicenseStore } from '@/stores/licenseStore'

/**
 * 密钥设置表单
 */
const emit = defineEmits<{ (e: 'saved'): void }>()
const settingsStore = useSettingsStore()
const licenseStore = useLicenseStore()
const input = ref<string>('')
const saving = ref<boolean>(false)

const KEY_MASK = '********'

onMounted(() => {
    if (settingsStore.secretKey || localStorage.getItem('token')) {
        input.value = KEY_MASK
    }
})

watch(() => settingsStore.secretKey, (val) => {
    input.value = val ? KEY_MASK : ''
})

async function onSave() {
    if (saving.value) return
    const trimmed = input.value.trim()
    if (!trimmed || trimmed === KEY_MASK) {
        ElMessage.error('请输入有效密钥')
        return
    }
    if (trimmed.length < 6) {
        ElMessage.error('密钥无效：长度至少 6 位')
        return
    }
    saving.value = true
    try {
        const res = await secretApi.verifySecretKey({ secret: trimmed })
        const token = res.data
        if (token) {
            localStorage.setItem('token', token)
            settingsStore.secretKey = trimmed
            settingsStore.persist()
            try {
                await licenseStore.setTokenAndVerify(token)
            } catch {}
            input.value = KEY_MASK
            ElMessage.success('密钥已保存')
            emit('saved')
        } else {
            ElMessage.error('验证失败：未返回令牌')
        }
    } finally {
        saving.value = false
    }
}

function onFocus() {
    if (input.value === KEY_MASK) {
        input.value = ''
    }
}
</script>

<template>
    <el-form label-position="top" class="secret-form">
        <el-form-item label="访问密钥">
            <el-input v-model="input" type="password" show-password placeholder="请输入访问密钥" @focus="onFocus" />
        </el-form-item>
        <div class="actions">
            <el-button type="primary" :loading="saving" :disabled="saving" @click="onSave">
                <i-ep-key class="btn-icon" /> 保存密钥
            </el-button>
        </div>
        <div class="tips">保存有效密钥后方可使用其他功能</div>
    </el-form>
</template>

<style scoped>
.secret-form :deep(.el-form-item) {
    margin-bottom: 12px;
}

.actions {
    display: flex;
    gap: 8px;
}

.btn-icon {
    margin-right: 6px;
}

.tips {
    margin-top: 8px;
    color: #9e9e9e;
    font-size: 12px;
}
</style>


