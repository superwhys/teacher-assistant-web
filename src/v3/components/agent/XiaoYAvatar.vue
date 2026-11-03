<template>
    <svg class="xiao-y" :class="[`xiao-y--${mood}`, { 'xiao-y--animated': animated }]"
        :width="size" :height="size" viewBox="0 0 64 64" fill="none"
        aria-hidden="true" focusable="false">
        <defs>
            <linearGradient :id="bodyGradientId" x1="20" y1="16" x2="46" y2="58" gradientUnits="userSpaceOnUse">
                <stop stop-color="#73B9FF" />
                <stop offset="1" stop-color="var(--ta-blue, #007AFF)" />
            </linearGradient>
        </defs>

        <g class="xiao-y__greeting">
            <g class="xiao-y__pose">
                <g class="xiao-y__sprout">
                    <path d="M32 20V11M32 12L25 7M32 12L39 6" stroke="#36BFA6"
                        stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M29 10C23 11 20 8 20 4C25 3 29 5 29 10Z" fill="#8CE2C8" />
                    <path d="M34 10C34 5 38 2 43 3C43 8 39 11 34 10Z" fill="#67D6B6" />
                </g>

                <path d="M13 34C8 32 5 35 7 39C8 42 11 43 15 42L13 34Z" fill="#419BFF" />
                <path d="M51 34C56 30 59 33 57 37C56 40 53 42 49 42L51 34Z" fill="#419BFF" />
                <path d="M11 36C11 23 19 15 32 15C45 15 53 23 53 36V41C53 52 45 58 32 58C19 58 11 52 11 41V36Z"
                    :fill="`url(#${bodyGradientId})`" />
                <path d="M18 24C21 20 25 19 29 19" stroke="#C5E5FF" stroke-width="2.5"
                    stroke-linecap="round" opacity=".75" />
                <path d="M16 36C16 27 22 23 32 23C42 23 48 27 48 36V40C48 48 42 52 32 52C22 52 16 48 16 40V36Z"
                    fill="#FFFDF8" />

                <ellipse cx="21" cy="42" rx="3.5" ry="2.1" fill="#FFB1AA" opacity=".8" />
                <ellipse cx="43" cy="42" rx="3.5" ry="2.1" fill="#FFB1AA" opacity=".8" />
                <g class="xiao-y__gaze">
                    <g class="xiao-y__eye xiao-y__eye--left">
                        <ellipse cx="25" cy="35.5" rx="2.7" ry="4.5" fill="#153E72" />
                        <circle cx="25.8" cy="33.6" r="1" fill="white" />
                    </g>
                    <g class="xiao-y__eye xiao-y__eye--right">
                        <ellipse cx="39" cy="35.5" rx="2.7" ry="4.5" fill="#153E72" />
                        <circle cx="39.8" cy="33.6" r="1" fill="white" />
                    </g>
                </g>
                <path class="xiao-y__smile" d="M28.5 43C30.5 45.5 33.5 45.5 35.5 43"
                    stroke="#153E72" stroke-width="2.1" stroke-linecap="round" />
            </g>
        </g>
    </svg>
</template>

<script setup lang="ts">
import { useId } from "vue";

withDefaults(defineProps<{
    size?: number;
    animated?: boolean;
    mood?: "idle" | "thinking" | "speaking";
}>(), {
    size: 48,
    animated: false,
    mood: "idle",
});

const bodyGradientId = `xiao-y-body-${useId()}`;
</script>

<style scoped>
.xiao-y {
    display: block;
    flex: none;
    overflow: visible;
}

.xiao-y__greeting,
.xiao-y__pose {
    transform-origin: 32px 39px;
}

.xiao-y__greeting {
    transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
}

.xiao-y__eye {
    transform-box: fill-box;
    transform-origin: center;
}

.xiao-y__sprout {
    transform-origin: 32px 18px;
}

.xiao-y__smile {
    transform-box: fill-box;
    transform-origin: center;
}

/* Long rests keep the idle avatar quiet while the teacher reads. */
.xiao-y--animated .xiao-y__eye {
    animation: xiao-y-blink 7s linear infinite;
}

.xiao-y--animated.xiao-y--idle .xiao-y__pose {
    animation: xiao-y-listen 9s linear infinite;
}

/* The face changes locally; the launcher itself stays in place. */
.xiao-y--animated.xiao-y--thinking .xiao-y__pose {
    animation: xiao-y-think 3.2s cubic-bezier(0.77, 0, 0.175, 1) infinite;
}

.xiao-y--animated.xiao-y--thinking .xiao-y__gaze {
    transform: translate(1px, -1px);
}

.xiao-y--animated.xiao-y--speaking .xiao-y__sprout {
    animation: xiao-y-answer 1.6s cubic-bezier(0.77, 0, 0.175, 1) infinite;
}

.xiao-y--animated.xiao-y--speaking .xiao-y__smile {
    animation: xiao-y-smile 1.6s cubic-bezier(0.77, 0, 0.175, 1) infinite;
}

@keyframes xiao-y-blink {
    0%, 43%, 47%, 100% { transform: scaleY(1); }
    44.5%, 45.5% { transform: scaleY(.12); }
}

@keyframes xiao-y-listen {
    0%, 70%, 76%, 100% { transform: rotate(0); }
    72%, 74% { transform: rotate(-2deg); }
}

@keyframes xiao-y-think {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(2deg); }
}

@keyframes xiao-y-answer {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(5deg); }
}

@keyframes xiao-y-smile {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.2); }
}

@media (hover: hover) and (pointer: fine) {
    button:hover .xiao-y--animated .xiao-y__greeting {
        transform: rotate(-5deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .xiao-y__greeting {
        transition: none;
    }

    .xiao-y--animated .xiao-y__eye,
    .xiao-y--animated .xiao-y__pose,
    .xiao-y--animated .xiao-y__sprout,
    .xiao-y--animated .xiao-y__smile {
        animation: none;
        transform: none;
    }

    .xiao-y--animated.xiao-y--thinking .xiao-y__gaze {
        transform: none;
    }

    .xiao-y--animated.xiao-y--thinking,
    .xiao-y--animated.xiao-y--speaking {
        animation: xiao-y-status 1.6s linear infinite;
    }

    button:hover .xiao-y--animated .xiao-y__greeting {
        transform: none;
    }
}

@keyframes xiao-y-status {
    0%, 100% { opacity: 1; }
    50% { opacity: .82; }
}
</style>
