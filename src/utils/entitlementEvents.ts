export const ENTITLEMENT_REJECTED_EVENT = 'teacher-entitlement-rejected'

export function notifyEntitlementRejected(token: string, code: number): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(ENTITLEMENT_REJECTED_EVENT, { detail: { token, code } }))
    }
}
