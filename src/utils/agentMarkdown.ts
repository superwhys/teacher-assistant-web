import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
    html: false,
    breaks: true,
    linkify: true,
})

markdown.renderer.rules.link_open = (tokens, index, options, _env, renderer) => {
    const token = tokens[index]
    if (!token) return ''
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    return renderer.renderToken(tokens, index, options)
}

markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const alt = renderer.renderInlineAsText(tokens[index]?.children ?? [], options, env)
    return markdown.utils.escapeHtml(alt)
}

markdown.renderer.rules.table_open = () =>
    '<div class="agent-markdown__table-scroll" role="region" aria-label="数据表格" tabindex="0"><table>\n'
markdown.renderer.rules.table_close = () => '</table></div>\n'

export function renderAgentMarkdown(content: string): string {
    return markdown.render(content)
}
