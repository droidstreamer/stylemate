// Live Preview: marks links to another note (not to a heading or block in this one) with the class cz-other, so schema.ts can color them.
// Reading view needs no marking: its links carry the target in data-href.
// ponytail: a link to the current note by its own name counts as another note (same as Reading view's data-href test).
import { Decoration, MatchDecorator, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from '@codemirror/view'

// [[note]] / [[note|alias]] / [[note#heading]], and Markdown links to notes: [text](note.md), [text](<my note.md>); [[#heading]] has no note.
const LINKS = /\[\[([^\]|#^]*)[^\]]*\]\]|\[[^\]]*\]\((?![a-z][\w+.-]*:)<?([^)>#]*)[^)]*\)/gi
const mark = Decoration.mark({ class: 'cz-other' })
const matcher = new MatchDecorator({ regexp: LINKS, decoration: m => ((m[1] ?? m[2]).trim() ? mark : null) })

export const otherLinks = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) { this.decorations = matcher.createDeco(view) }
  update(u: ViewUpdate) { this.decorations = matcher.updateDeco(u, this.decorations) }
}, { decorations: v => v.decorations })
