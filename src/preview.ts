import type { App } from 'obsidian'

export const PREVIEW_PATH = 'StyleMate Preview.md'

const SAMPLE = `# Heading 1 — StyleMate sample note
This note shows every element StyleMate can change. Edit settings in **Settings > StyleMate** and watch this page. Left: Live Preview. Right: Reading view.

## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

## Text
Normal text with **bold**, *italic*, ==highlighted text==, ~~strikethrough~~, \`inline code\`, an [[StyleMate Preview|internal link]], an [external link](https://obsidian.md) and a #sample-tag. A longer paragraph follows so line height and paragraph spacing are visible: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

## Links and tags
Link in this note: [[#Heading 2|a heading]]. Links to another note: [[StyleMate Preview|this sample note by name]], [a Markdown one](StyleMate%20Preview.md) and [[A note that does not exist yet]] (Obsidian fades these). Web links: [Obsidian](https://obsidian.md) and https://help.obsidian.md. Tags: #sample-tag and #another-tag.

A second paragraph, to show the space between paragraphs.

## Bullet list
- Level 1 item
	- Level 2 item
		- Level 3 item
			- Level 4 item
		- Level 3 again, with a long line that wraps onto a second line so the hanging indent can be checked at a glance
	- Level 2 again
- Level 1 again

## Numbered list
1. First
	1. First, nested
	2. Second, nested
		1. Third level
2. Second
3. Third

## Checkboxes
- [ ] To do
- [x] Done
- [/] In progress
- [>] Deferred
- [-] Cancelled
- [!] Important
	- [ ] Nested to do
	- [x] Nested done

## Quote, callout, code, rule
> A block quote. Its bar, text and background can be changed.

> [!note] A callout
> Callouts take their color from the type.

\`\`\`js
const code = 'fenced code block'
\`\`\`

---

| Table | Header |
|---|---|
| Cell | Cell |
`

// Opens the sample note twice side by side: Live Preview on the left, Reading view on the right. Reuses it if already open.
export async function openPreview(app: App) {
  const ws = app.workspace
  const open = ws.getLeavesOfType('markdown').filter(l => (l.view as { file?: { path: string } }).file?.path === PREVIEW_PATH)
  if (open.length) { void ws.revealLeaf(open[0]); return }
  const file = app.vault.getFileByPath(PREVIEW_PATH) ?? (await app.vault.create(PREVIEW_PATH, SAMPLE))
  const left = ws.getLeaf('split', 'vertical')
  await left.setViewState({ type: 'markdown', state: { file: file.path, mode: 'source', source: false } })
  const right = ws.createLeafBySplit(left, 'vertical')
  await right.setViewState({ type: 'markdown', state: { file: file.path, mode: 'preview' } })
  void ws.revealLeaf(left)
}
