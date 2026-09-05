import { post } from '@/api/api'

export interface SubmitOpinionReq {
  content: string
}

export async function submitOpinion(data: SubmitOpinionReq): Promise<void> {
  await post('/feedback/submit', data)
}