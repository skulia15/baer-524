import { describe, expect, it } from 'vitest'
import { notificationEmailHtml } from './email'

describe('notificationEmailHtml', () => {
  it('escapes user-supplied text so it cannot inject markup', () => {
    const html = notificationEmailHtml(
      'Beiðni hafnað: <b>nei</b>',
      '/tilkynningar/beidni/r1',
      '<a href="https://evil.example">smelltu</a>',
    )

    expect(html).not.toContain('<a href="https://evil.example">')
    expect(html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;smelltu&lt;/a&gt;')
    expect(html).toContain('Beiðni hafnað: &lt;b&gt;nei&lt;/b&gt;')
  })
})
