import { describe, expect, it } from 'vitest'
import { renderAgentMarkdown } from '../agentMarkdown'

describe('Agent Markdown', () => {
    it('renders headings, emphasis, lists, tables, quotes and code from a classroom answer', () => {
        const html = renderAgentMarkdown([
            '## 本周班级积分总结',
            '',
            '**总体数据**',
            '- 加分合计：+10 分',
            '- 涉及学生：2 人',
            '',
            '| 学生 | 变动 |',
            '| --- | --- |',
            '| 张三 | +5 |',
            '',
            '> 数据来自本周积分记录。',
            '',
            '使用 `total_points` 查询。',
            '',
            '```json',
            '{"awarded":10}',
            '```',
        ].join('\n'))

        expect(html).toContain('<h2>本周班级积分总结</h2>')
        expect(html).toContain('<strong>总体数据</strong>')
        expect(html).toContain('<li>加分合计：+10 分</li>')
        expect(html).toContain('class="agent-markdown__table-scroll"')
        expect(html).toContain('<th>学生</th>')
        expect(html).toContain('<td>张三</td>')
        expect(html).toContain('<blockquote>')
        expect(html).toContain('<code>total_points</code>')
        expect(html).toContain('<code class="language-json">{&quot;awarded&quot;:10}')
    })

    it('escapes raw HTML and script content instead of creating executable elements', () => {
        const html = renderAgentMarkdown('<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n<svg/onload=alert(1)>')

        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
        expect(html).not.toMatch(/<(script|img|svg)\b/)
    })

    it.each([
        'javascript:alert(1)',
        'JaVaScRiPt:alert(1)',
        'javascript&#58;alert(1)',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
        'data:text/html;base64,PHNjcmlwdD4=',
    ])('does not create a link for the unsafe destination %s', destination => {
        expect(renderAgentMarkdown(`[点击](${destination})`)).not.toContain('<a ')
    })

    it('opens valid Markdown links and autolinks without granting window.opener access', () => {
        const html = renderAgentMarkdown('[查看说明](https://example.com/help "说明")\nhttps://example.com')

        expect(html).toContain('href="https://example.com/help" title="说明" target="_blank" rel="noopener noreferrer"')
        expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"')
    })

    it('renders image alt text without loading remote or embedded image resources', () => {
        const html = renderAgentMarkdown('![学生 **积分** <img src=x onerror=alert(1)>](https://example.com/tracking.png)\n![图片](data:image/png;base64,aGVsbG8=)')

        expect(html).toContain('学生 积分 &lt;img src=x onerror=alert(1)&gt;')
        expect(html).toContain('图片')
        expect(html).not.toContain('<img')
        expect(html).not.toContain('data:image/png')
        expect(html).not.toContain('tracking.png')
    })

    it('keeps partial streaming Markdown visible and renders it when the delimiter arrives', () => {
        expect(renderAgentMarkdown('**本周加分')).toContain('**本周加分')
        expect(renderAgentMarkdown('**本周加分**')).toContain('<strong>本周加分</strong>')
        expect(renderAgentMarkdown('```json\n{"awarded":')).toContain('<pre><code class="language-json">{&quot;awarded&quot;:')
        expect(renderAgentMarkdown('[查看说明](https://example')).toContain('[查看说明](')
    })

    it('escapes code even when the language fence contains HTML-like input', () => {
        const html = renderAgentMarkdown('```"><img\n<script>alert(1)</script>\n```')

        expect(html).not.toContain('<script>')
        expect(html).not.toContain('<img')
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    })
})
