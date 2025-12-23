<script setup lang="ts">
import { shopIconOptions } from '@/components/shop/shopIcons'

defineOptions({ name: 'ShopPrizeEditorDialog' })

type Mode = 'add' | 'edit'

const props = defineProps<{
    modelValue: boolean
    mode: Mode
    form: {
        id: number
        name: string
        points: number
        stock: number
        description: string
        icon: string
    }
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void
    (e: 'save'): void
}>()

function close() {
    emit('update:modelValue', false)
}
</script>

<template>
    <el-dialog
        :model-value="props.modelValue"
        :title="props.mode === 'add' ? '添加商品' : '编辑商品'"
        width="500px"
        @update:model-value="emit('update:modelValue', $event)"
    >
        <el-form :model="props.form" label-position="top" class="item-form">
            <el-form-item label="商品名称" required>
                <el-input v-model="props.form.name" placeholder="请输入商品名称" />
            </el-form-item>
            <el-form-item label="消耗积分" required>
                <el-input-number v-model="props.form.points" :min="1" :step="10" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="库存数量" required>
                <el-input-number v-model="props.form.stock" :min="0" style="width: 100%;" />
            </el-form-item>
            <el-form-item label="图标">
                <el-select v-model="props.form.icon" placeholder="选择图标" style="width: 100%;">
                    <el-option
                        v-for="opt in shopIconOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                    >
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <component :is="opt.icon" />
                            <span>{{ opt.label }}</span>
                        </div>
                    </el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="商品描述">
                <el-input
                    v-model="props.form.description"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入商品描述（可选）"
                />
            </el-form-item>
        </el-form>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="close">取消</el-button>
                <el-button type="primary" @click="emit('save')">保存</el-button>
            </div>
        </template>
    </el-dialog>
</template>


