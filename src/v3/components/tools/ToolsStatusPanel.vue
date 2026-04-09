<template>
    <section class="tools-status-panel">
        <div class="tools-status-panel__head">
            <div>
                <span class="tools-status-panel__eyebrow">工具状态</span>
                <h3>课堂启动前，把可用工具和关联入口集中放在一个面板里</h3>
                <p>保留原有工具能力，同时补齐商城奖品、学生名册和更多扩展入口的联动说明。</p>
            </div>
            <span class="tools-status-panel__meta">当前共 {{ statusItems.length }} 项状态摘要</span>
        </div>

        <div class="tools-status-panel__grid">
            <article v-for="item in statusItems" :key="item.id" class="status-card" :class="item.toneClass">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.detail }}</small>
            </article>
        </div>

        <div class="tools-status-panel__bottom">
            <div class="tools-status-panel__tips">
                <div class="sub-head">
                    <span class="sub-head__eyebrow">使用建议</span>
                    <strong>更适合大屏课堂操作的工作流提示</strong>
                </div>

                <ul class="tips-list">
                    <li v-for="item in tips" :key="item">{{ item }}</li>
                </ul>
            </div>

            <div class="tools-status-panel__shortcuts">
                <div class="sub-head">
                    <span class="sub-head__eyebrow">快捷入口</span>
                    <strong>关联页面也可以从这里直达</strong>
                </div>

                <div class="shortcut-grid">
                    <button
                        v-for="item in shortcutItems"
                        :key="item.id"
                        type="button"
                        class="shortcut-card"
                        :class="item.toneClass"
                        @click="emit('shortcut', item.id)"
                    >
                        <span>{{ item.label }}</span>
                        <strong>{{ item.title }}</strong>
                        <p>{{ item.description }}</p>
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
defineOptions({ name: "ToolsStatusPanel" })

/** 定义工具状态摘要项结构。 */
interface ToolsStatusItem {
    detail: string
    id: string
    label: string
    toneClass: string
    value: string
}

/** 定义工具快捷入口结构。 */
interface ToolsShortcutItem {
    description: string
    id: string
    label: string
    title: string
    toneClass: string
}

/** 定义工具状态面板属性。 */
interface ToolsStatusPanelProps {
    shortcutItems: ToolsShortcutItem[]
    statusItems: ToolsStatusItem[]
    tips: string[]
}

defineProps<ToolsStatusPanelProps>()

const emit = defineEmits<{
    (e: "shortcut", shortcutId: string): void
}>()
</script>

<style scoped>
.tools-status-panel {
    padding: 22px;
    border: 1px solid rgba(122, 141, 198, 0.18);
    border-radius: 32px;
    background: rgba(255, 255, 255, 0.76);
    box-shadow: 0 14px 30px rgba(71, 90, 150, 0.12);
    backdrop-filter: blur(16px);
}

.tools-status-panel__head,
.tools-status-panel__bottom {
    display: grid;
    gap: 18px;
}

.tools-status-panel__head {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
}

.tools-status-panel__head h3,
.tools-status-panel__head p,
.status-card span,
.status-card strong,
.status-card small,
.shortcut-card p {
    margin: 0;
}

.tools-status-panel__eyebrow,
.sub-head__eyebrow {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(85, 104, 255, 0.1);
    color: #5568ff;
    font-size: 12px;
    font-weight: 700;
}

.tools-status-panel__head h3 {
    margin-top: 12px;
    color: #16213e;
    font-size: 24px;
    line-height: 1.35;
}

.tools-status-panel__head p {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.tools-status-panel__meta {
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(22, 33, 62, 0.06);
    color: #627099;
    font-size: 13px;
    font-weight: 700;
}

.tools-status-panel__grid {
    margin-top: 18px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
}

.status-card {
    min-height: 132px;
    padding: 18px 20px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.status-card:hover,
.shortcut-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 18px 28px rgba(71, 90, 150, 0.14);
}

.status-card span {
    display: block;
    color: #627099;
    font-size: 13px;
}

.status-card strong {
    display: block;
    margin-top: 10px;
    color: #16213e;
    font-size: 20px;
}

.status-card small {
    display: block;
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.status-card--violet {
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.08), rgba(255, 255, 255, 0.96));
}

.status-card--rose {
    background: linear-gradient(180deg, rgba(255, 107, 129, 0.12), rgba(255, 255, 255, 0.96));
}

.status-card--emerald {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.14), rgba(255, 255, 255, 0.92));
}

.status-card--amber {
    background: linear-gradient(180deg, rgba(255, 182, 72, 0.16), rgba(255, 255, 255, 0.92));
}

.tools-status-panel__bottom {
    margin-top: 18px;
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
}

.tools-status-panel__tips,
.tools-status-panel__shortcuts {
    padding: 18px;
    border-radius: 26px;
    border: 1px solid rgba(122, 141, 198, 0.14);
    background: rgba(255, 255, 255, 0.66);
}

.sub-head {
    display: grid;
    gap: 10px;
}

.sub-head strong {
    color: #16213e;
    font-size: 18px;
}

.tips-list {
    margin: 16px 0 0;
    padding-left: 18px;
    display: grid;
    gap: 10px;
    color: #627099;
    line-height: 1.7;
}

.shortcut-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.shortcut-card {
    padding: 16px 18px;
    border: 1px solid rgba(122, 141, 198, 0.16);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.76);
    color: #16213e;
    text-align: left;
    font: inherit;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.shortcut-card span {
    display: block;
    color: #627099;
    font-size: 12px;
    font-weight: 700;
}

.shortcut-card strong {
    display: block;
    margin-top: 10px;
    font-size: 18px;
}

.shortcut-card p {
    margin-top: 8px;
    color: #627099;
    line-height: 1.7;
}

.shortcut-card--violet {
    background: linear-gradient(180deg, rgba(85, 104, 255, 0.08), rgba(255, 255, 255, 0.96));
}

.shortcut-card--sky {
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.1), rgba(255, 255, 255, 0.96));
}

.shortcut-card--emerald {
    background: linear-gradient(180deg, rgba(18, 185, 129, 0.12), rgba(255, 255, 255, 0.96));
}

.shortcut-card--amber {
    background: linear-gradient(180deg, rgba(255, 182, 72, 0.14), rgba(255, 255, 255, 0.96));
}

@media (max-width: 1280px) {
    .tools-status-panel__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 1080px) {
    .tools-status-panel__head,
    .tools-status-panel__bottom {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .tools-status-panel {
        padding: 16px;
        border-radius: 28px;
    }

    .tools-status-panel__grid,
    .shortcut-grid {
        grid-template-columns: 1fr;
    }
}
</style>
