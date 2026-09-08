# Crabase design guidelines

Crabase is a shared workspace for conversations, notes, and agent work. Its interface should feel calm, compact, and dependable. The conversation and the next useful action take priority over branding, explanation, and status chrome.

This document defines the intended design, not a claim that every rule is already implemented. Use it when adding or changing UI. Existing behavior and backend validation remain authoritative; design must not imply capabilities the product does not have.

## Reference and adaptation

Inspired by [Vercel’s design.md](https://vercel.com/design.md), reviewed on September 8, 2026. That document primarily addresses Vercel-authored report websites. Crabase adopts its principles of hierarchy, alignment, typography, restraint, honest information, and accessible interaction.

Crabase keeps its own identity, bundled DM Sans, React/Vite stack, Lucide icons, and semantic CSS variables. Do not import Vercel branding, its report stylesheet, a report grid, or a new component library to follow these guidelines. The application’s controls and ongoing conversations determine its layout.

## Design priorities

When requirements compete, use this order:

1. Preserve message content, user identity, draft text, and accurate task state.
2. Make the primary action obvious and accessible.
3. Keep conversations readable and navigation fast.
4. Maintain consistent spacing, type, alignment, and control behavior.
5. Add visual refinement only where it supports the first four priorities.

A polished interface comes from consistent decisions. Extra cards, larger headings, decorative icons, and empty space do not compensate for unclear structure.

## Product language and hierarchy

- Use **chat** in interface copy. Reserve **thread** for internal runtime terminology.
- Use the configured agent name; `Crab` is the default, not a hardcoded product label.
- Write short, sentence-case labels: “New chat”, “Add project”, “Send note”.
- Show the chat title once in the header. Do not repeat it as a large conversation heading.
- New-chat screens lead with a short heading and the composer. Do not add slogans, suggestion cards, recent-chat sections, or promotional footers.
- Remove routine environment commentary such as “Local workspace”, “On this machine”, and “Workspace connected”. Surface a connection problem when it affects an action.
- Never claim that all information stays on the machine: files may be local while model requests use a remote service.

## Visual foundation

Keep the existing warm neutral palette. Most hierarchy should come from position, spacing, and type weight. Use color to explain selection, focus, errors, and task state, with a text or icon cue alongside it.

### Typography

Use bundled DM Sans for application text. Use a system monospace stack for code, commands, and paths. Do not load a new font service.

All font sizes use semantic `rem` tokens. At the browser’s default root size, **1rem = 16px**. Keep the root at `100%` so browser text-size preferences remain effective. Do not add 13px/15px font sizes or per-component pixel overrides.

| Role | Token | Size | Default equivalent |
| --- | --- | --- | --- |
| Avatar initials and overflow | `--type-avatar` | 0.625rem | 10px |
| Supporting metadata | `--type-meta` | 0.75rem | 12px |
| Navigation and compact labels | `--type-label` | 0.875rem | 14px |
| Controls | `--type-control` | 0.875rem | 14px |
| Messages and composer | `--type-body` | 1rem | 16px |
| Dialog/section headings | `--type-section` | 1.25rem | 20px |
| Mobile new-chat heading | `--type-title-mobile` | 1.75rem | 28px |
| Desktop new-chat heading | `--type-title` | 2rem | 32px |

Label and control roles intentionally share one size. Inline code uses the label token. Use regular weight for reading text and medium weight for headings and controls; preserve unitless line heights.

Never shrink an individual label just because it is long. Allow reflow or truncate navigation text with its full value available through an accessible name or tooltip. Keep message text intact. Aim for roughly 60–80 characters per line in prose.

### Spacing and geometry

Use a small spacing scale: **4, 8, 12, 16, 20, 24, 32px**. Each gap has one owner: a parent’s `gap` or padding, or an explicit child margin, not several competing rules.

| Area                      | Target                                                   |
| ------------------------- | -------------------------------------------------------- |
| Sidebar                   | 8px horizontal and 12px top padding                      |
| Navigation and chat rows  | 8px gap, approximately 36px minimum height               |
| Project chat list         | Full available width, no left rail or nested indentation |
| Main content gutter       | 16–24px desktop; 12–16px narrow screens                  |
| Heading to composer group | 24px                                                     |
| Composer padding          | 12–16px; compact initial input, grows with text          |
| Dialog content            | 24px desktop; 16px mobile                                |

Align the conversation and composer to the same content edges. Keep desktop reading width around 740–840px; code may scroll within that area. Dense navigation can coexist with comfortable message spacing.

Use 6–8px radii for rows and controls, 16–20px for the composer and dialogs, and circles for avatars. Avoid introducing intermediate radii for individual elements.

### Surfaces and themes

- Reuse `--surface`, `--sidebar`, `--paper`, `--text`, `--subtle`, `--muted`, `--line`, `--hover`, and `--accent`.
- Use one continuous conversation surface. Reserve borders for inputs, separation that spacing cannot provide, and meaningful control boundaries.
- Keep shadows subtle and limited to actual elevation such as a dialog or menu.
- No decorative gradients, glowing accents, icon tiles, nested cards, or ornamental status pills.
- Light and dark themes must preserve the same hierarchy and readable contrast. Keep appearance preferences in Settings.
- Consolidate changes into the owning CSS rules; do not accumulate trailing overrides or hardcoded light-only colors.

## Component contracts

### Sidebar

- ⌘B (Ctrl+B on Windows/Linux) toggles the sidebar; on mobile it toggles the drawer.

- Desktop sidebar width is draggable from its right edge, from 200px to a maximum of 500px (default 232px). The separator supports Left/Right arrows and Home/End. Mobile keeps the fixed-width drawer.

- Keep “New chat”, search, standalone chats, projects, and the user profile easy to scan.
- Clicking “Projects” expands or collapses the project groups. Use a keyboard-operable button with `aria-expanded`.
- Clicking a project label toggles that project’s chats. Use closed/open folder icons to communicate state; no additional right-side chevron.
- The adjacent plus button starts a new chat for that project.
- Chat rows use the full available width. Selected rows get one quiet background treatment.
- Show participant avatar stacks for both project and standalone chats. Do not use generic people or message icons as substitutes.
- Keep running state recognizable without replacing participant identity or making the row jump.

### Identity and avatars

- Resolve an avatar from the message author or participant identity, never from the currently selected viewer.
- The same user has the same avatar in the profile, conversation, and participant stacks. Avatar changes should update these surfaces consistently.
- Stacks show only known human participants. Until explicit membership exists, define participation as having authored a message or note in that chat. Exclude guide and agent messages.
- Do not insert default users into empty chats or infer that both dummy users participate everywhere.
- Use 20px avatars in stacks with approximately 5px overlap; use 28–32px avatars in messages and the profile.
- For crowded stacks, show up to three avatars plus a readable overflow count. Expose participant names accessibly.
- Dummy photo URLs are preview fixtures, not real user identities. If an image fails, show that user’s initials. Do not display a broken image or an invented portrait for an unknown author.

### Composer

- The send arrow is the single primary action. Enter sends to the agent; Shift+Enter inserts a line break. Preserve IME composition behavior.
- A secondary note icon beside send saves a note without invoking the agent. No duplicate Crab send button or separate mode trigger.
- While work can be cancelled, Stop replaces the send arrow in the same primary-action position. Never show Stop and Send together. Enter still sends another agent message while work is active, allowing sequential queued messages; the Stop button cancels active and queued requests.
- Keep model and reasoning selectors compact, readable, and keyboard accessible. Use real backend model capabilities.
- Preserve drafts on failure. Explain errors near the composer with a useful recovery action.
- For a new project chat, show a shallow, quiet bar immediately above the input with the project name and current Git branch when available. Standalone chats have no project bar.
- The project bar shares the input’s alignment and reads as part of the composer. Do not add environment labels, permission badges, or unavailable controls from reference screenshots.
- Do not fabricate `main` when branch lookup fails. Distinguish a failed lookup from a folder without Git when recovery is useful.

### Conversation

- Agent messages align left; human messages and notes align right, with readable text and clear authorship.
- Keep avatar and author as one compact group. Place the timestamp below the message body, aligned right for human messages. Mark notes with a quiet “Note” label.
- Do not restore the removed chat heading, “Chat · time” row, or bottom status bar.
- Keep terminal output and file details in disclosures. Make approvals visible and specific enough to support a decision.
- Streaming must not steal the reader’s scroll position when they scroll upward. Resume following only when they return to the bottom or explicitly request it.
- Archived chats need a clear restore action even if archive controls move out of the conversation header.

## State, accessibility, and responsiveness

Every interactive component needs a deliberate default, hover, focus, disabled, loading, and failure treatment where applicable. Loading must not look like an empty successful result.

- Use native buttons, selects, dialogs, and disclosure elements before custom behavior.
- Icon-only actions need accessible names and useful tooltips. Use one Lucide icon family at consistent sizes.
- Provide visible keyboard focus, including text inputs. Return focus to the opener after a dialog closes.
- Meet WCAG AA contrast. Avoid tiny gray text as a density solution. Color alone must not carry state.
- Maintain at least 24px pointer targets with adequate separation; prefer 44px touch targets on mobile.
- Respect reduced motion. Default to stillness; animate only meaningful transitions and actual progress.
- At narrow widths, move the sidebar into a drawer and reflow composer controls before reducing text size.
- Use `min-width: 0` in flex/grid children. Keep horizontal scrolling inside code or genuinely wide content, not across the page.
- Ensure the composer remains usable with the mobile keyboard open. Long chat names, branches, errors, and translated labels must not break the layout.

## Implementation and review

Work within the existing WebSocket commands and patch events. Do not add polling, HTTP refresh fallbacks, or a new agent process to implement visual state.

When removing an element, remove its JSX, unused logic, and exclusive styles. Do not leave `false &&` trees or hide entire discarded features with CSS. Reuse the existing component or semantic token before introducing another abstraction.

Before calling a UI change finished:

1. Inspect the actual screen in light and dark themes at roughly 390px, 836px, and 1440px widths.
2. Verify standalone and project chats, empty and long histories, and long titles/branch names.
3. Check keyboard navigation, focus, draft preservation, and the affected loading/error states.
4. Check that spacing has one owner, equivalent controls align, and every icon or label serves a user action or decision.
5. Run `npm run build` and `npm test` for implementation changes. Check the live WebSocket path after backend changes; a running worker may still hold old code.

## Implemented system and ownership

The design system lives in `web/src/styles/tokens.css`; `web/src/style.css` owns component layouts and states. These files replace scattered component-specific overrides.

| Token family   | Values / role                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Surface        | Warm canvas `#faf9f6`, sidebar `#f0efec`, paper `#ffffff`; dark equivalents `#20211f`, `#191a18`, `#282925` |
| Text           | Primary `#292a27`, secondary `#62645e`, muted `#686b63`; theme-aware equivalents in dark mode               |
| Semantic color | Focus `#52754a`, error `#ae352e`; dedicated dark-mode values                                                |
| Space          | `--space-1/2/3/4/5/6/8`: 4/8/12/16/20/24/32px                                                               |
| Type           | `--type-meta/label/control/body/section/title`: 0.75/0.875/0.875/1/1.25/2rem                                         |
| Shape          | `--radius-small/panel/composer`: 8/16/20px                                                                  |
| Layout         | `--sidebar-width`: 232px; `--content-width`: 800px                                                          |

`App.tsx` composes the screen and coordinates mutations. `pages/` owns page structure; `components/` owns reusable visual and interaction units. `hooks/` owns WebSocket, route, and preference lifecycles. `lib/` holds small pure helpers with native Node checks. Use explicit typed props; do not introduce a global state layer simply to shorten prop lists.

The implemented pass removes discarded home-screen content, consolidates both avatar surfaces, adds accessible project toggles, keeps archive recovery available, and establishes the tokens above. Avatar preferences remain browser-local. Project selection still uses the existing folder-path form; a browsable folder picker is separate feature work.

A change is successful when the app becomes easier to use and more consistent, not merely more decorated.

### Generated deliverables

Published raster image links show an inline preview and a download action. Other deliverables show their linked label with a download icon. Use `/files/<chat-id>/<filename>` URLs returned by the publisher; never present absolute filesystem paths as working browser links. HTML and SVG download rather than execute within the application.

The right sidebar exposes a collapsible Files section for the selected chat, with compact filename/type/size rows, raster thumbnails, and download links. Distinguish loading from an empty list and clear the list when switching chats.

The top bar is 48px tall and has no archive action. Omit the composer keyboard-hint footer; Enter/Shift+Enter behavior remains unchanged.

The right sidebar stays in the shell flex layout at every viewport size, taking up to 280px (40vw on narrow screens). Opening it reduces the chat width; it never overlays the conversation.

The right sidebar has a single “Artifacts” heading and the current chat’s file list. Omit workspace/project paths, agent runtime, activity, and duplicate section headings.
