# StyleMate release notes

Newest first.

## 1.0.2
- **Settings background:** StyleMate's settings page is back on Obsidian's normal settings background. Since 1.0.1 the rows sat on a lighter card while the header and group titles did not.
- **Checkbox hover color:** a ticked checkbox no longer changes to the theme's color when you point at it or click it. It keeps your Ticked fill, and the new "Ticked fill, on hover" (Lists > Checkbox lists > Color) can give it its own color.
- **Black and white printing:** new PRINT & PDF group with one switch, "Black and white when printing". When it is on, File > Export to PDF and printing come out in black, white and grays: dark text, headings from black (H1) to gray (H6), underlined links, light gray code, quote and callout boxes, tags and images in gray. What you see on screen does not change.
- **StyleMate in PDFs:** Export to PDF now uses your StyleMate settings (the light theme's colors, since Obsidian always exports in light). Before, PDFs ignored StyleMate.

## 1.0.1
First public release, for the Obsidian community directory.
- **New plugin ID:** `stylemate` (was `customizer`). To keep your settings from an earlier test build, rename `.obsidian/plugins/customizer` to `stylemate` in your vault before installing.
- **Settings search:** Obsidian's settings search now finds StyleMate's settings ("line height" finds Headings and Page, "callouts" finds Quotes & rules).
- **Needs Obsidian 1.13 or later.**
- **Under the hood:** StyleMate's CSS now goes into a stylesheet Obsidian's review allows (a constructed stylesheet instead of a `<style>` element); no inline styles; the slider knobs are styled through Obsidian's own variables instead of `!important`.
- **Exported snippet** is now called `stylemate.css`.

## 0.13.2
Callout fixes, from the notes on the 0.13.1 build.
- **Icon color:** the callout icon has its own color setting (it ignored the title color before). Title color now colors only the title.
- **Starting colors:** the callout swatches (title, icon, text) open on the colors your theme draws now, instead of empty.

## 0.13.1
Notes round 9.
- **Tab goes from box to box:** in Preferences, Tab now moves from one number or text box to the next. Sliders and the reset arrows are skipped by Tab (click them, or use the number box).
- **Callout colors:** new Quotes & rules > Callouts box with Background, Title and icon color, and Text color. They apply to every callout type in Live Preview and Reading view; each has its own reset arrow.

## 0.12.2
- **Renamed to StyleMate:** the plugin's name, settings title and About text now say StyleMate. Saved settings carry over (the plugin id is unchanged).

## 0.12.1
Number boxes and ranges.
- **Number box beside every slider:** type an exact value, or use the up/down arrows. Slider and box stay in step, and the box can go past the slider's ends (up to twice the range) when you need an unusual value.
- **Shift + arrow:** on a slider or a number box, Shift with an arrow key moves ten steps at a time.
- **Wider ranges:** Heading size 0.5-5em, Heading line height 0.8-3, Text line height 0.9-3, All lists Space between items 0-2em.
- **Main headers in capitals:** PAGE, TEXT & LINKS, HEADINGS, LISTS, QUOTES & RULES, EDITOR.

## 0.11.1
Notes round 8.
- **Text size fixed:** Page > Text size now changes only the normal note text; headings keep their size (Live Preview and Reading view).
- **No longer experimental:** Note font, Link to another note and its hover color, all heading settings (Space above and below, Shift left/right, Letter spacing, Letter case, Italic, Underline) and Highlight the cursor line. No setting carries the tag any more.

## 0.10.1
Notes round 7.
- **No longer experimental:** Text color, Bullet color, Number color, the three marker-to-text gaps, and the Indent steps, Space above and Space below boxes of every list type.
- **Box resets:** each Indent steps, Space above and Space below box has its own Reset button for its six levels.
- **Bold color fixed:** with a Text color set, bold and italic text take that color, but their swatches still showed the old theme color, so clicking one applied the wrong color. Bold color and Italic color now follow Text color until you change them, and say so.
- **Links to another note:** new "Link to another note" and "hover" colors for links that open a different note; links to headings in the same note keep the Note link color. Both follow Note link until changed. (The difference you saw in the sample note was Obsidian fading a link to a note that does not exist yet.)
- **Visited links removed:** "Note link, visited", "visited, hover" and "Forget visited links" are gone, with the list of opened notes.

## 0.9.1
Notes round 6.
- **Visited note links fixed in Live Preview:** links written as Markdown links, like `[text](My%20Note.md)`, now get the visited colors in Live Preview too (only Reading view caught them before). The note open when Obsidian starts now counts as visited.
- **Web link visited removed:** Obsidian cannot tell which web links were visited, so "Web link, visited" and "visited, hover" are gone. "Web link, hover" stays and was checked working in both views.
- **Tag hovers removed:** "Tag text, hover" and "Tag background, hover" are gone.
- **Auto palette reset:** a heading color's reset arrow now goes back to its Auto palette color, not Obsidian's. New "Apply palette" button puts the palette back on all six headings at once. Reset Headings still clears everything.
- **Indent guide colors:** Obsidian's guide line colors are see-through (12% white or black), so their swatches showed solid black. They now show the color as it looks on the page.
- **Bullet On hover and When folded fixed:** setting a Bullet color used to block both. On hover now also shows while the mouse is anywhere on the item's line, not only on its fold arrow.
- **Space above / below per level:** Bullet, Numbered and Checkbox lists each have two small boxes, Space above and Space below, with levels 1-6. Each follows All lists' "Space between items" until you change it.

## 0.8.1
Notes round 5.
- **Descriptions instead of tooltips:** every setting now has a short explanation written under its name; hover tooltips are gone. Bracketed notes were taken out of setting names (units like px stay).
- **Icons everywhere:** every setting in Preferences has an icon in front of its name, not only the heading settings.
- **Lists regrouped:** Lists now has four boxes: All lists, Bullet lists, Numbered lists and Checkbox lists. Each box has small Color, Shape and Spacing sections, and the six indent steps sit in a small "Indent steps" box. The separate Checkboxes group moved into Checkbox lists.
- **All lists, then overrides:** All lists sets the marker color and indent for every list. Bullet color, Number color and each Indent step follow it until you change them; the description says "Follows All lists" or "Overrides All lists", and the reset arrow makes it follow again.
- **Auto palette wording:** "Start color: the color applied to main headings (H1)", and the sliders say "All headings (H1-H6)".
- **Heading line height:** the description now says it only shows when a heading wraps onto a second line.
- **Removed:** Side margins (Line width covers it), Sentence case, the In progress / Deferred / Cancelled / Important checkbox colors, and "Margin before the box" (Box to text gap does the same job).
- **Fixed:** the Indent per level slider now shows Obsidian's real default (2.25 em) instead of the middle of the slider.

## 0.7.1
Notes round 4.
- **Links box:** all link colors sit in their own box under Text & links: note link and web link, each with normal, hover, visited and visited-hover colors.
- **Visited links (experimental):** Obsidian has no visited state, so StyleMate remembers the notes you open and the web links you click, and colors those links in Live Preview and Reading view. "Forget visited links" clears the list.
- **Tags box:** tag text and tag background, each with a hover color, in their own box.
- **Tooltips fixed:** no more question-mark mouse pointer. Hover anywhere on a setting's name area and the normal Obsidian tooltip appears after a short pause.
- **Text color fixed:** "Text color (notes only)" now changes body text only; headings and the note title keep their own color.

## 0.6.1
Notes round 3.
- **Tooltips everywhere:** hover over any setting's name for a one-line explanation, e.g. what "Line height" does for a heading.
- **Icons:** every heading setting has a small icon in front of its name (size, weight, color, font, line height, space above/below, shift, letter spacing, style).
- **Style strip:** each heading's letter case, italic and underline now sit in one "Style" row: the case dropdown, then Italic and Underline as icon buttons (highlighted when on). One reset arrow clears all three.
- **More letter cases:** normal, ALL CAPS, lowercase, Capitalize Each Word, Sentence case (first letter only), small caps and all small caps. They work in Reading view and Live Preview.
- **Marker to text gap (experimental):** under Lists, three new sliders: Bullet to text, Number to text, Checkbox to text. Higher moves the marker out to the left, lower pulls it toward the text; the text itself stays in line with the rest of the note. Works in Live Preview and Reading view.
- **Removed, Numbering style:** Obsidian shows list numbers as typed text while editing, so roman numerals or letters could only ever show in Reading view.
- **Fix, slider knobs:** Obsidian's own slider style pushed the knobs of the color picker and the Auto palette off centre (sitting high). They now sit centred on their tracks.
- **Fix, palette strips:** Hue, Saturation, Value and Contrast are now exactly the same length.
- **Testing:** new live checks for each item above, including a pixel check that each knob is centred, a real mouse hover for the tooltip, and the gap measured on screen in both views.

## 0.5.2
- **Fix, color pickers:** 0.5.1 made every color picker's sliders thinner and unreliable (a style rule I shared with the new palette sliders lost to Obsidian's own slider style). The pickers are back to full width and size, and the live check now measures them and drags them with a real mouse click.

## 0.5.1
Notes round 2.
- **Per-level list indents (experimental):** under Lists, three new boxes (Bullet, Numbered, Checkbox list indent steps). Each has a step for levels 1-6: how far that level sits in from the one above, in Live Preview and Reading view. Only the list types you change are touched. Obsidian's indent guide lines keep their normal spacing.
- **Preferences header:** the same About block as the other plugins: name, version and author, a short description, and the Buy Me a Coffee button.
- **Auto palette sliders:** Hue, Saturation, Value (was Brightness) and Contrast now look like the color picker's sliders: a gradient track, the value beside it, and a reset arrow.
- **"Fill from the note background" removed** (with its dropdown and "Make palette" button). Pick the Start and End colors instead.
- **Auto palette stays open** whenever Headings is open.
- **Indent guide thickness, active:** new slider for the active guide line (notes only).
- **Export as CSS:** "Save snippet" writes `.obsidian/snippets/customizer.css` in your vault (turn it on under Appearance > CSS snippets); "Copy CSS" puts it on the clipboard to share.
- **Fix, quote background:** a transparent default showed as black, and picking from it started on black. It now shows a checkerboard ("no color") and the picker opens on a visible gray. A chosen color reaches the quote in both views.
- **Fix, presets:** after loading a preset the dropdown jumped back to the first one in the list, so it looked as if the wrong preset had loaded. It now stays on the preset you picked. Tested with several presets, loaded in and out of order.
- **Testing:** the live check in a real Obsidian now sets, applies, validates and resets every one of the 142 controls, plus checks for each item above.

## 0.4.1
Notes round.
- **Auto palette, redesigned:** pick a Start color (H1) and an End color (H6) with the same color picker as every swatch; H2-H5 blend between them. Hue, Saturation and Brightness sliders move the whole gradient, and the new Contrast slider widens or narrows its range. "Make palette" still fills both swatches from your note background.
- **Inherit from the heading above:** H2-H6 each have a "Copy from H(n-1)" button that copies space above, space below, shift and line height; change them afterwards if you like.
- **Boxed submenus:** each heading (and the palette) sits in its own bordered box. The colored bar for changed settings stays.
- **Text colors:** "Text color (whole app)" and "Muted text color" are removed (menus and tabs are not this plugin's job). "Text color (reading and editing notes)" now changes Live Preview text too, not only Reading view.
- **Presets:** save your settings under a name, then load or delete them at the top of the page.
- **Heading styles (experimental):** per heading: letter case (normal / ALL CAPS / small caps), italic and underline.
- **Letter spacing (experimental):** per heading, the space between letters (CSS "letter-spacing", what designers call tracking; kerning proper, the pair-by-pair spacing, is already on in Obsidian and cannot be adjusted per pair).

## 0.3.1
- **Auto heading palette:** Settings > StyleMate > Headings > "Auto palette". Pick Analogous (neighbouring hues of the note background) or Complement (the opposite hue) and press "Make palette". H1 is the strongest and most saturated color, each level gets a little softer, and H6 ends at the body text brightness. A gray background has no hue, so the accent color's hue is used. Applies to the current theme.
- **Move all six together:** Hue, Saturation and Brightness sliders shift every heading color at once; each keeps its own character. Back to 0 returns the palette.
- You can still fine-tune any single heading color afterwards.

## 0.2.1
First test-round fixes.
- **Color picker:** replaced the native one (it did not work on Linux) with the picker the other plugins use: swatch, hue / saturation / lightness sliders, hex box. The note changes live while you drag.
- **Fonts:** the font boxes now suggest the fonts installed on your computer as you type.
- **Text size:** now works. Obsidian sets it inline, so every variable setting now overrides it with `!important` (this also helps against themes).
- **Text color (notes only):** now only changes note text, not the sidebars. "Text color (whole app)" is labelled as such.
- **Bold:** "Bold weight" became "Bold strength"; Obsidian's bold is the normal weight plus a value, so the old setting did nothing.
- **Lists:** one "Indent per level" setting drives Reading view and Live Preview (the second one only moved the bullets and is gone). Bullet and number colors are grouped under "Marker colors", labelled as overrides of the "Bullets and numbers" color. Indent guide thickness and colors now stay inside notes (File Explorer and Outline are untouched).
- **Corner radius:** bullets and checkboxes use a 0-50% slider instead of a dropdown.
- **Margins:** "Side margins" (experimental) moves only the left and right margins; top and bottom stay as they were.
- **Removed:** code background and code text (code plugins handle those). The group is now "Quotes & rules".

## 0.1.1
- **First build:** Settings > StyleMate holds 104 look settings, grouped and collapsible: Page, Text & links, Headings (H1-H6 each), Lists, Checkboxes, Code/quotes/rules, Editor.
- **Live sample note:** the "Open sample note" button (also a ribbon icon and a command) opens a note in Live Preview and Reading view side by side. Every control changes it as you move it.
- **Easy controls:** slider, color picker, text box or dropdown per setting; a reset arrow per setting, a Reset button per group, Reset all; changed settings get a colored bar; an on/off switch keeps your settings.
- **Light and dark:** colors are kept per theme; choose whether an edit applies to the current theme or both.
- **Experimental (selector CSS, may break on Obsidian updates):** heading space above/below and left/right shift, note font, notes-only text color, bullet-only and number-only colors, colors for `[/]` `[>]` `[-]` `[!]` checkboxes, cursor-line highlight.
- **Not yet:** per-level list indents and bullet symbols, profiles, popout windows.
