# Vue3 登录页动画

这个目录放的是从当前项目登录页视觉里拆出来的 `Vue3` 动画版本，只保留角色动画联动逻辑，不包含原项目里的 `Next.js`、`Firebase` 和表单校验逻辑。

## 文件说明

- `AnimatedCharacters.vue`
  - 核心动画组件
  - 接收 3 个参数：
    - `isTyping`
    - `showPassword`
    - `passwordLength`
- `LoginAnimationExample.vue`
  - 最小接入示例
  - 演示输入框聚焦、密码输入、密码显隐如何驱动动画

## 在你的 Vue3 项目中使用

```vue
<template>
  <AnimatedCharacters
    :is-typing="isTyping"
    :show-password="showPassword"
    :password-length="password.length"
  />
</template>

<script setup lang="ts">
import { ref } from "vue";
import AnimatedCharacters from "./AnimatedCharacters.vue";

const password = ref("");
const showPassword = ref(false);
const isTyping = ref(false);
</script>
```

## 动画行为

- 鼠标移动时，角色会跟随鼠标方向轻微转头和倾斜
- 输入框聚焦时，紫色和黑色角色会短暂互看
- 密码有内容且为隐藏状态时，角色姿态会发生变化
- 密码有内容且为显示状态时，紫色角色会周期性偷看

## 迁移建议

- 如果你的项目已经在用 `Vue3 + TypeScript`，可以直接复制这两个 `.vue` 文件
- 如果你想接到真实登录页，只需要把父组件里的状态改成你的表单状态即可
