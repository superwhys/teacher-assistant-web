<template>
    <el-dialog
        v-model="visible"
        title="教师节祝福"
        width="780px"
        align-center
        append-to-body
        destroy-on-close
        :show-close="false"
        :close-on-click-modal="false"
        class="teachers-day-dialog"
        modal-class="teachers-day-dialog__overlay"
        transition="teachers-day-celebration"
    >
        <template #header="{ titleId, titleClass }">
            <h2 :id="titleId" :class="[titleClass, 'teachers-day-dialog__sr-only']">教师节祝福</h2>
        </template>

        <article class="teachers-day-card">
            <button type="button" class="teachers-day-card__close" aria-label="关闭教师节祝福" @click="visible = false">
                <i-ep-close aria-hidden="true" />
            </button>

            <section class="teachers-day-card__art" aria-hidden="true">
                <span class="teachers-day-card__glow" />
                <span class="teachers-day-card__spark teachers-day-card__spark--one" />
                <span class="teachers-day-card__spark teachers-day-card__spark--two" />
                <span class="teachers-day-card__spark teachers-day-card__spark--three" />

                <div class="teachers-day-card__date">
                    <span>SEP</span>
                    <strong>10</strong>
                </div>

                <svg class="teachers-day-card__illustration" viewBox="0 0 330 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M59 197C95 178 129 178 165 198V239C128 219 94 219 59 238V197Z" fill="#FFF7DF" />
                    <path d="M271 197C235 178 201 178 165 198V239C202 219 236 219 271 238V197Z" fill="#FFF7DF" />
                    <path d="M165 198V239" stroke="#D9B56D" stroke-width="3" stroke-linecap="round" />
                    <path d="M75 206C106 192 134 192 155 203M255 206C224 192 196 192 175 203" stroke="#DFC88D" stroke-width="3" stroke-linecap="round" />
                    <path d="M165 190C157 150 161 116 188 89" stroke="#E4C26C" stroke-width="5" stroke-linecap="round" />
                    <path d="M181 99C190 80 207 72 224 77C222 94 208 105 188 105" fill="#F6D87B" />
                    <path d="M165 139C145 123 126 122 110 133C120 151 139 157 160 149" fill="#8AB59A" />
                    <path d="M174 122C196 111 215 115 228 130C214 145 195 147 176 135" fill="#A9C8A9" />
                    <circle cx="190" cy="86" r="13" fill="#FFB7A5" />
                    <path d="M190 67C196 75 197 82 190 86C181 84 179 76 182 68C184 63 188 63 190 67Z" fill="#FFD97D" />
                    <path d="M209 79C201 85 197 91 190 86C187 77 193 72 201 70C206 69 210 74 209 79Z" fill="#FFD97D" />
                    <path d="M202 100C194 96 187 94 190 86C198 81 204 85 208 92C211 97 207 101 202 100Z" fill="#FFD97D" />
                    <path d="M179 103C182 94 184 88 190 86C198 90 197 98 192 104C189 108 182 107 179 103Z" fill="#FFD97D" />
                    <path d="M171 82C180 82 186 83 190 86C191 95 184 99 176 97C171 96 168 87 171 82Z" fill="#FFD97D" />
                    <circle cx="190" cy="86" r="5" fill="#C47A55" />
                </svg>

                <p class="teachers-day-card__art-caption">把平凡的日子<br>讲成闪闪发光的故事</p>
            </section>

            <section class="teachers-day-card__message">
                <p class="teachers-day-card__eyebrow">HAPPY TEACHER'S DAY</p>
                <h2>{{ greetingTitle }}</h2>
                <p class="teachers-day-card__lead">
                    谢谢你把一次次耐心的讲解，变成孩子眼里的光。愿你在忙碌的讲台之外，也一直被温柔与掌声照亮。
                </p>

                <blockquote>
                    <span aria-hidden="true">“</span>
                    教育不是注满一桶水，<br>而是点燃一把火。
                </blockquote>

                <div class="teachers-day-card__footer">
                    <div class="teachers-day-card__signature">
                        <span>致每一位认真陪伴成长的老师</span>
                        <strong>教师助手</strong>
                    </div>
                    <button type="button" class="teachers-day-card__accept" @click="visible = false">
                        收下祝福
                        <i-ep-arrow-right aria-hidden="true" />
                    </button>
                </div>
            </section>
        </article>
    </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TeachersDayWelcomeDialogProps {
    modelValue: boolean
    teacherName?: string
}

const props = withDefaults(defineProps<TeachersDayWelcomeDialogProps>(), {
    teacherName: '',
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
})

const greetingTitle = computed(() => {
    const name = props.teacherName.trim()
    if (!name) return '老师，节日快乐'
    return `${name.endsWith('老师') ? name : `${name}老师`}，节日快乐`
})
</script>

<style scoped>
:global(.teachers-day-dialog__overlay) {
    background: rgba(18, 29, 25, 0.5);
    backdrop-filter: blur(14px) saturate(115%);
}

:global(.teachers-day-dialog__overlay .el-overlay-dialog) {
    padding: 20px;
    align-items: center;
    justify-content: center;
}

:global(.el-dialog.teachers-day-dialog) {
    --teachers-day-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    margin: 0 auto;
    padding: 0 !important;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 40px);
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.52);
    border-radius: 28px;
    background: #fffaf0;
    box-shadow: 0 30px 90px rgba(20, 46, 36, 0.3);
}

:global(.teachers-day-dialog .el-dialog__header),
:global(.teachers-day-dialog .el-dialog__body) {
    margin: 0;
    padding: 0;
}

:global(.teachers-day-dialog .el-dialog__body) {
    max-height: calc(100vh - 40px);
    overflow-y: auto;
}

:global(.teachers-day-celebration-enter-active),
:global(.teachers-day-celebration-leave-active) {
    transition: opacity 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

:global(.teachers-day-celebration-enter-active .teachers-day-dialog),
:global(.teachers-day-celebration-leave-active .teachers-day-dialog) {
    transform-origin: center;
    transition:
        opacity 250ms cubic-bezier(0.23, 1, 0.32, 1),
        transform 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

:global(.teachers-day-celebration-enter-from),
:global(.teachers-day-celebration-leave-to),
:global(.teachers-day-celebration-enter-from .teachers-day-dialog),
:global(.teachers-day-celebration-leave-to .teachers-day-dialog) {
    opacity: 0;
}

:global(.teachers-day-celebration-enter-from .teachers-day-dialog) {
    transform: scale(0.96);
}

:global(.teachers-day-celebration-leave-to .teachers-day-dialog) {
    transform: scale(0.98);
}

.teachers-day-dialog__sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.teachers-day-card {
    position: relative;
    min-height: 472px;
    display: grid;
    grid-template-columns: minmax(270px, 0.9fr) minmax(0, 1.1fr);
    background: #fffaf0;
}

.teachers-day-card__close {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 3;
    width: 38px;
    height: 38px;
    padding: 0;
    display: grid;
    place-items: center;
    border: 1px solid rgba(36, 65, 54, 0.12);
    border-radius: 50%;
    color: #496058;
    background: rgba(255, 250, 240, 0.82);
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition:
        color 160ms var(--teachers-day-ease-out),
        background-color 160ms var(--teachers-day-ease-out),
        transform 160ms var(--teachers-day-ease-out);
}

.teachers-day-card__close svg {
    width: 17px;
    height: 17px;
}

.teachers-day-card__close:active,
.teachers-day-card__accept:active {
    transform: scale(0.97);
}

.teachers-day-card__art {
    position: relative;
    min-width: 0;
    overflow: hidden;
    padding: 34px 34px 28px;
    display: flex;
    flex-direction: column;
    color: #fff8e8;
    background:
        radial-gradient(circle at 22% 16%, rgba(255, 217, 125, 0.26), transparent 30%),
        linear-gradient(155deg, #244f40 0%, #17362e 62%, #102a23 100%);
}

.teachers-day-card__art::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.12;
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
    background-size: 28px 28px;
    mask-image: linear-gradient(to bottom, black, transparent 88%);
}

.teachers-day-card__glow {
    position: absolute;
    top: -88px;
    left: -70px;
    width: 260px;
    height: 260px;
    border-radius: 50%;
    background: rgba(246, 216, 123, 0.13);
}

.teachers-day-card__date {
    position: relative;
    z-index: 1;
    width: 80px;
    height: 84px;
    padding: 12px 13px;
    display: grid;
    align-content: center;
    border: 1px solid rgba(255, 248, 232, 0.32);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(12px);
}

.teachers-day-card__date span {
    color: #f6d87b;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
}

.teachers-day-card__date strong {
    margin-top: 2px;
    font-size: 34px;
    font-weight: 720;
    line-height: 1;
    letter-spacing: -0.06em;
}

.teachers-day-card__illustration {
    position: relative;
    z-index: 1;
    width: min(100%, 320px);
    margin: auto auto -8px;
    filter: drop-shadow(0 18px 25px rgba(2, 20, 14, 0.24));
    animation: teachers-day-art-rise 500ms var(--teachers-day-ease-out) 80ms both;
}

.teachers-day-card__art-caption {
    position: relative;
    z-index: 1;
    margin: 5px 0 0;
    color: rgba(255, 248, 232, 0.78);
    font-size: 12px;
    line-height: 1.65;
    letter-spacing: 0.06em;
}

.teachers-day-card__spark {
    position: absolute;
    z-index: 1;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f6d87b;
    box-shadow: 0 0 0 5px rgba(246, 216, 123, 0.1);
    animation: teachers-day-sparkle 3s cubic-bezier(0.77, 0, 0.175, 1) infinite;
}

.teachers-day-card__spark--one {
    top: 23%;
    right: 17%;
}

.teachers-day-card__spark--two {
    top: 40%;
    left: 14%;
    width: 5px;
    height: 5px;
    animation-delay: -1s;
}

.teachers-day-card__spark--three {
    right: 10%;
    bottom: 23%;
    width: 6px;
    height: 6px;
    animation-delay: -2s;
}

.teachers-day-card__message {
    min-width: 0;
    padding: 58px 52px 40px;
    display: flex;
    flex-direction: column;
    background:
        linear-gradient(rgba(223, 200, 141, 0.16) 1px, transparent 1px) 0 102px / 100% 32px,
        #fffaf0;
}

.teachers-day-card__message > * {
    animation: teachers-day-message-in 400ms var(--teachers-day-ease-out) both;
}

.teachers-day-card__eyebrow {
    margin: 0;
    color: #b2704f;
    font-size: 11px;
    font-weight: 750;
    letter-spacing: 0.16em;
    animation-delay: 80ms;
}

.teachers-day-card__message h2 {
    margin: 13px 0 0;
    color: #17362e;
    font-family: "Songti SC", "STSong", "Noto Serif CJK SC", serif;
    font-size: clamp(29px, 4vw, 39px);
    font-weight: 700;
    line-height: 1.18;
    letter-spacing: -0.035em;
    animation-delay: 130ms;
}

.teachers-day-card__lead {
    margin: 19px 0 0;
    color: #52645d;
    font-size: 14px;
    line-height: 1.9;
    animation-delay: 180ms;
}

.teachers-day-card blockquote {
    position: relative;
    margin: 22px 0 0;
    padding: 14px 18px 14px 47px;
    border-left: 3px solid #e4c26c;
    border-radius: 0 14px 14px 0;
    color: #2f4c42;
    background: rgba(228, 194, 108, 0.12);
    font-family: "Songti SC", "STSong", "Noto Serif CJK SC", serif;
    font-size: 15px;
    line-height: 1.7;
    animation-delay: 230ms;
}

.teachers-day-card blockquote span {
    position: absolute;
    top: -3px;
    left: 13px;
    color: rgba(178, 112, 79, 0.42);
    font-size: 48px;
    line-height: 1;
}

.teachers-day-card__footer {
    margin-top: auto;
    padding-top: 26px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    animation-delay: 280ms;
}

.teachers-day-card__signature {
    display: grid;
    gap: 5px;
    color: #7a8a84;
    font-size: 11px;
    line-height: 1.5;
}

.teachers-day-card__signature strong {
    color: #355449;
    font-size: 13px;
    letter-spacing: 0.08em;
}

.teachers-day-card__accept {
    min-width: 132px;
    min-height: 44px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 14px;
    color: #fffaf0;
    background: #244f40;
    box-shadow: 0 10px 24px rgba(36, 79, 64, 0.2);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition:
        background-color 160ms var(--teachers-day-ease-out),
        transform 160ms var(--teachers-day-ease-out);
}

.teachers-day-card__accept svg {
    width: 15px;
    height: 15px;
}

@media (hover: hover) and (pointer: fine) {
    .teachers-day-card__close:hover {
        color: #17362e;
        background: #fffaf0;
    }

    .teachers-day-card__accept:hover {
        background: #173b30;
    }
}

@keyframes teachers-day-art-rise {
    from {
        opacity: 0;
        transform: translateY(12px) scale(0.98);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes teachers-day-message-in {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes teachers-day-sparkle {
    0%, 100% {
        opacity: 0.42;
        transform: scale(0.84);
    }
    50% {
        opacity: 1;
        transform: scale(1.08);
    }
}

@media (max-width: 700px) {
    :global(.teachers-day-dialog__overlay .el-overlay-dialog) {
        padding: 10px;
    }

    :global(.el-dialog.teachers-day-dialog) {
        width: 100% !important;
        max-width: none;
        max-height: calc(100vh - 20px);
        border-radius: 24px;
    }

    :global(.teachers-day-dialog .el-dialog__body) {
        max-height: calc(100vh - 20px);
    }

    .teachers-day-card {
        min-height: 0;
        grid-template-columns: 1fr;
    }

    .teachers-day-card__art {
        min-height: 190px;
        padding: 24px;
    }

    .teachers-day-card__date {
        width: 66px;
        height: 68px;
        padding: 9px 11px;
        border-radius: 18px;
    }

    .teachers-day-card__date strong {
        font-size: 28px;
    }

    .teachers-day-card__illustration {
        position: absolute;
        right: 12px;
        bottom: -16px;
        width: 225px;
    }

    .teachers-day-card__art-caption {
        margin-top: auto;
        max-width: 135px;
    }

    .teachers-day-card__message {
        padding: 36px 24px 26px;
        background: #fffaf0;
    }

    .teachers-day-card__message h2 {
        padding-right: 24px;
        font-size: 30px;
    }

    .teachers-day-card__lead {
        margin-top: 14px;
        line-height: 1.75;
    }

    .teachers-day-card blockquote {
        margin-top: 18px;
    }

    .teachers-day-card__footer {
        padding-top: 22px;
        align-items: stretch;
        flex-direction: column;
        gap: 16px;
    }

    .teachers-day-card__accept {
        width: 100%;
    }
}

@media (prefers-reduced-motion: reduce) {
    .teachers-day-card__illustration,
    .teachers-day-card__message > *,
    .teachers-day-card__spark {
        animation: none;
    }
}
</style>
