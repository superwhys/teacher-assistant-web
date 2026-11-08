<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getOpinionList } from '@/api/admin'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/common/PageHeader.vue'
import { isApiRequestError } from '@/types/api'
import type { Opinion } from '@/types/admin'

const loading = ref(false)
const loadError = ref('')
const opinions = ref<Opinion[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-CN')
}

const loadOpinions = async () => {
    loading.value = true
    loadError.value = ''
    try {
        const offset = (currentPage.value - 1) * pageSize.value
        const response = await getOpinionList({ offset, limit: pageSize.value })
        opinions.value = response.data.items || []
        total.value = response.data.total || 0
    } catch (error: unknown) {
        loadError.value = error instanceof Error && error.message ? error.message : '加载意见反馈列表失败'
        if (!isApiRequestError(error)) {
            ElMessage.error(error instanceof Error && error.message ? error.message : '加载意见反馈列表失败')
        }
    } finally {
        loading.value = false
    }
}

const handleCurrentChange = (page: number) => {
    currentPage.value = page
    loadOpinions()
}

onMounted(() => {
    loadOpinions()
})
</script>

<template>
    <div class="admin-page platform-page opinion-management">
        <PageHeader eyebrow="FEEDBACK" title="意见反馈" description="倾听使用中的真实声音，让教师助手持续变得更好。">
            <template #actions>
                <el-button :loading="loading" @click="loadOpinions">
                    <i-ep-refresh aria-hidden="true" />
                    刷新反馈
                </el-button>
            </template>
        </PageHeader>

        <section class="panel feedback-panel">
            <div class="panel-heading">
                <div>
                    <h2 class="panel-title">全部反馈 <span class="count-badge">{{ total }}</span></h2>
                    <p class="panel-description">来自用户的建议与使用反馈</p>
                </div>
                <div class="feedback-count">
                    <i-ep-chat-dot-round aria-hidden="true" />
                    <span>累计收到 <strong>{{ total }}</strong> 条反馈</span>
                </div>
            </div>
            <div v-if="loadError" class="load-error" role="alert">
                <span>{{ loadError }}</span>
                <el-button link type="primary" @click="loadOpinions">重新加载</el-button>
            </div>
            <p v-if="!loadError" class="table-scroll-hint">左右滑动表格，查看完整反馈信息 →</p>
            <el-table
                v-if="opinions.length || !loadError"
                v-loading="loading"
                :data="opinions"
                row-key="id"
                style="width: 100%"
            >
                <el-table-column prop="id" label="反馈编号" width="110">
                    <template #default="{ row }">
                        <span class="feedback-id">#{{ row.id }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="内容" min-width="300">
                    <template #default="{ row }">
                        <el-tooltip :content="row.content" placement="top" :show-after="350" popper-class="feedback-content-tooltip">
                            <el-text class="opinion-content" line-clamp="2">{{ row.content }}</el-text>
                        </el-tooltip>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="120">
                    <template #default="{ row }">
                        <span class="feedback-status"><span aria-hidden="true" />{{ row.status }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="提交时间" width="200">
                    <template #default="{ row }">
                        <span class="muted-text">{{ formatDate(row.created_at) }}</span>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty description="暂时还没有反馈，新的声音会在这里出现" :image-size="88" />
                </template>
            </el-table>

            <div class="table-footer">
                <span class="muted-text">共 {{ total }} 条反馈 · 每页 {{ pageSize }} 条</span>
                <el-pagination
                    v-model:current-page="currentPage"
                    :page-size="pageSize"
                    :total="total"
                    :pager-count="5"
                    layout="prev, pager, next"
                    @current-change="handleCurrentChange"
                />
            </div>
        </section>
    </div>
</template>

<style scoped>
.feedback-panel {
    overflow: hidden;
}

.feedback-count {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #81908a;
    font-size: 12px;
}

.feedback-count svg {
    color: #187464;
    font-size: 17px;
}

.feedback-count strong {
    color: #23352f;
    font-weight: 600;
}

.feedback-id {
    color: #81908a;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 12px;
}

.opinion-content {
    color: #23352f;
    line-height: 1.7;
    word-break: break-word;
    white-space: pre-line;
}

.feedback-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border: 1px solid #e5ebe8;
    border-radius: 6px;
    background: #f5f7f6;
    color: #667b70;
    font-size: 12px;
}

.feedback-status > span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #81908a;
}

.load-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e5ebe8;
    color: #8d5c3e;
    font-size: 13px;
}

@media (max-width: 760px) {
    .feedback-count {
        display: none;
    }
}
</style>

<style>
.feedback-content-tooltip {
    max-width: min(560px, calc(100vw - 40px));
    white-space: pre-wrap;
    word-break: break-word;
}
</style>

