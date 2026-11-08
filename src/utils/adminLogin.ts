export function buildTeacherAppLoginUrl(token: string, origin: string, baseUrl: string): string {
    const url = new URL(origin)
    url.pathname = new URL(baseUrl, url).pathname
    url.searchParams.set('token', token)
    url.searchParams.set('session', 'tab')
    return url.toString()
}
