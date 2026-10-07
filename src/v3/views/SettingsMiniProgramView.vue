<template>
    <SettingsMiniProgramCard :user-id="cacheStore.profile?.id || ''" :wechat-bound="cacheStore.profile?.wechatBound"
        @bound="onMiniProgramBound" />
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { useCacheStore } from "@/stores/cacheStore";
import SettingsMiniProgramCard from "@/v3/components/settings/SettingsMiniProgramCard.vue";

const cacheStore = useCacheStore()

function onMiniProgramBound(): void {
    if (!cacheStore.profile) return
    cacheStore.updateProfile({ ...cacheStore.profile, wechatBound: true })
    cacheStore.bumpDataVersion()
    ElMessage.success("小程序绑定成功")
}
</script>
