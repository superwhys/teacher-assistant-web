import { classApi } from "@/api/class"
import type { ClassDTO } from "@/types/class"

export const classManager = {
    async create(name: string) {
        const resp = await classApi.create({ name })
        return resp.data
    },
    async list(): Promise<ClassDTO[]> {
        const resp = await classApi.list()
        return resp.data?.classes ?? []
    },
    async update(classId: number, name: string): Promise<void> {
        await classApi.update(classId, { id: classId, name })
    },
    async delete(classId: number): Promise<void> {
        await classApi.delete(classId)
    },
}