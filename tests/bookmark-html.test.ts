import { expect, test } from 'bun:test'
import { DOMParser } from 'linkedom'
import {
  countImportedNodes,
  parseBookmarkDocument,
  serializeBookmarkHtml,
} from '../src/lib/bookmark-html'
import type { BrowserBookmarkCatalog } from '../src/lib/types'

const sourceHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3 ADD_DATE="1725000000">开发 &amp; 文档</H3>
  <DL><p>
    <DT><A HREF="https://example.com/?a=1&amp;b=2" ADD_DATE="1725000001">Example &lt;Docs&gt;</A>
    <DT><H3>空文件夹</H3>
    <DL><p></p></DL>
  </DL><p>
  <DT><A HREF="chrome://bookmarks/">Chrome Bookmarks</A>
</DL><p>`

test('parses nested and empty folders in sibling order', () => {
  const document = new DOMParser().parseFromString(sourceHtml, 'text/html')
  const nodes = parseBookmarkDocument(document as unknown as Document)

  expect(nodes).toEqual([
    {
      kind: 'folder',
      title: '开发 & 文档',
      children: [
        {
          kind: 'bookmark',
          title: 'Example <Docs>',
          url: 'https://example.com/?a=1&b=2',
          dateAdded: 1_725_000_001_000,
        },
        { kind: 'folder', title: '空文件夹', children: [] },
      ],
    },
    {
      kind: 'bookmark',
      title: 'Chrome Bookmarks',
      url: 'chrome://bookmarks/',
    },
  ])
  expect(countImportedNodes(nodes)).toBe(4)
})

test('serializes folders, links, ordering, escaping, and timestamps', () => {
  const catalog: BrowserBookmarkCatalog = {
    folders: [
      {
        id: 'bar',
        title: '书签栏 & <main>',
        index: 0,
        unmodifiable: false,
        path: ['书签栏 & <main>'],
        bookmarkCount: 2,
        children: [
          {
            id: 'empty',
            title: '空 "夹"',
            parentId: 'bar',
            index: 1,
            unmodifiable: false,
            path: ['书签栏 & <main>', '空 "夹"'],
            bookmarkCount: 0,
            children: [],
          },
        ],
      },
    ],
    bookmarks: [
      {
        id: 'first',
        title: 'A < B',
        url: 'https://example.com/?a=1&b="two"',
        parentId: 'bar',
        index: 0,
        folderPath: '书签栏 & <main>',
        dateAdded: 1_725_000_001_999,
        unmodifiable: false,
      },
      {
        id: 'last',
        title: 'Last',
        url: 'chrome://bookmarks/',
        parentId: 'bar',
        index: 2,
        folderPath: '书签栏 & <main>',
        unmodifiable: false,
      },
    ],
  }

  const html = serializeBookmarkHtml(catalog)

  expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
  expect(html).toContain('<H3>书签栏 &amp; &lt;main&gt;</H3>')
  expect(html).toContain('HREF="https://example.com/?a=1&amp;b=&quot;two&quot;"')
  expect(html).toContain('ADD_DATE="1725000001"')
  expect(html).toContain('>A &lt; B</A>')
  expect(html).toContain('<H3>空 &quot;夹&quot;</H3>')
  expect(html.indexOf('>A &lt; B</A>')).toBeLessThan(html.indexOf('空 &quot;夹&quot;'))
  expect(html.indexOf('空 &quot;夹&quot;')).toBeLessThan(html.indexOf('>Last</A>'))
})
