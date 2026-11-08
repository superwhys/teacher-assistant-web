<script setup lang="ts">
defineProps<{ message: string }>()

function retry(): void {
    window.location.reload()
}
</script>

<template>
    <main class="startup-error">
        <section class="startup-error__card" role="alert">
            <h1>页面初始化失败</h1>
            <p>{{ message }}</p>
            <button type="button" @click="retry">重新加载</button>
        </section>
    </main>
</template>

<style scoped>
.startup-error {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
}

.startup-error__card {
    width: min(420px, 100%);
    padding: 32px;
    border: 1px solid var(--ta-line);
    border-radius: var(--ta-radius-large);
    background: var(--ta-surface-solid);
    text-align: center;
}

h1 {
    margin: 0 0 12px;
    font-size: 23px;
}

p {
    margin: 0 0 24px;
    color: var(--ta-text-secondary);
    line-height: 1.7;
}

button {
    min-height: 40px;
    padding: 0 18px;
    border: 0;
    border-radius: var(--ta-radius-small);
    color: #ffffff;
    background: var(--ta-blue);
    cursor: pointer;
}
</style>
