<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import SecretKeyForm from '@/components/SecretKeyForm.vue'
import { useLicenseStore } from '@/stores/licenseStore'
import { LicenseStatus } from '@/types/license'

/**
 * 授权页面
 */
const router = useRouter()
const license = useLicenseStore()

function onSaved() {
    router.push('/class')
}

onMounted(async () => {
    // 进入授权页时，根据授权状态决定是否弹出提示
    try {
        await license.verifyCurrent()
    } catch {}
    if (license.status === LicenseStatus.Invalid || license.status === LicenseStatus.Expired) {
        try {
            await ElMessageBox.alert('您的授权无效或已过期，请先验证密钥。', '需要授权', {
                confirmButtonText: '我知道了',
                type: 'warning',
                closeOnClickModal: false,
                showClose: false,
            })
        } catch {}
    }
})
</script>

<template>
    <div class="auth-guard">
        <div class="auth-card">
            <div class="auth-title">请输入访问密钥以解锁功能</div>
            <SecretKeyForm @saved="onSaved" />
        </div>
    </div>
    
</template>

<style scoped>
.auth-guard {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
}

.auth-card {
    width: 100%;
    max-width: 520px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(0, 0, 0, 0.06);
    padding: 20px;
}

.auth-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
}
</style>


