<template>
    <button type="button" class="floating-timer-strip" :class="{ 'is-paused': paused }"
        :aria-label="`查看计时器，${caption}，${title}，剩余 ${countdown}，总进度 ${progress}%${paused ? '，已暂停' : ''}`"
        @click="emit('open')">
        <span class="timer-strip__icon"><Clock aria-hidden="true" /></span>
        <span class="timer-strip__details">
            <span class="timer-strip__caption">{{ caption }}<span v-if="paused" class="timer-strip__paused">已暂停</span></span>
            <strong class="timer-strip__title" :title="title">{{ title }}</strong>
        </span>
        <span class="timer-strip__reading">
            <strong class="timer-strip__countdown">{{ countdown }}</strong>
            <span class="timer-strip__percent">总进度 {{ progress }}%</span>
        </span>
        <progress class="timer-strip__progress" :value="progress" max="100" aria-label="计时总进度" />
    </button>
</template>

<script setup lang="ts">
import { Clock } from "@element-plus/icons-vue";

defineProps<{
    caption: string
    title: string
    countdown: string
    progress: number
    paused: boolean
}>()

const emit = defineEmits<{
    (e: "open"): void
}>()
</script>

<style scoped>
.floating-timer-strip {
    --timer-accent: var(--ta-blue);
    width: min(760px, 100%);
    min-width: 0;
    padding: 12px 16px 10px;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 8px 12px;
    align-items: center;
    border: 1px solid var(--ta-line);
    border-radius: 15px;
    color: var(--ta-text);
    background: rgba(255, 255, 255, 0.96);
    box-shadow: var(--ta-shadow-1);
    text-align: left;
    font: inherit;
    cursor: pointer;
}

.floating-timer-strip.is-paused {
    --timer-accent: var(--ta-orange);
}

.floating-timer-strip:hover {
    border-color: var(--timer-accent);
}

.floating-timer-strip:focus-visible {
    outline: 2px solid var(--timer-accent);
    outline-offset: 3px;
}

.timer-strip__icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: var(--timer-accent);
    background: var(--ta-surface-muted);
}

.timer-strip__icon svg {
    width: 21px;
    height: 21px;
}

.timer-strip__details,
.timer-strip__reading {
    min-width: 0;
    display: grid;
    gap: 4px;
}

.timer-strip__caption {
    display: flex;
    gap: 8px;
    align-items: center;
    color: var(--ta-text-secondary);
    font-size: 12px;
}

.timer-strip__paused {
    color: var(--ta-orange);
}

.timer-strip__title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    font-weight: 650;
}

.timer-strip__reading {
    text-align: right;
    white-space: nowrap;
}

.timer-strip__countdown {
    color: var(--timer-accent);
    font-size: 24px;
    line-height: 1;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.timer-strip__percent {
    color: var(--ta-text-secondary);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}

.timer-strip__progress {
    grid-column: 1 / -1;
    width: 100%;
    height: 4px;
    overflow: hidden;
    border: 0;
    border-radius: 4px;
    background: var(--ta-surface-muted);
    appearance: none;
}

.timer-strip__progress::-webkit-progress-bar {
    background: var(--ta-surface-muted);
}

.timer-strip__progress::-webkit-progress-value {
    border-radius: 4px;
    background: var(--timer-accent);
}

.timer-strip__progress::-moz-progress-bar {
    border-radius: 4px;
    background: var(--timer-accent);
}

@media (max-width: 440px) {
    .floating-timer-strip {
        padding: 10px 12px 8px;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: 10px;
    }

    .timer-strip__icon {
        display: none;
    }

    .timer-strip__caption {
        flex-wrap: wrap;
        gap: 3px 8px;
        font-size: 11px;
    }

    .timer-strip__countdown {
        font-size: 23px;
    }
}
</style>
