# Runtime Human — Archival Workstation

> A modern career workstation for a programmer-life simulation. The application shell belongs to the present; each playable month opens a carefully framed historical workspace.

## Visual Theme & Atmosphere

Runtime Human is quiet, focused, and archival rather than futuristic. The shell feels like a professional desktop tool: matte dark surfaces, restrained chrome, strong information hierarchy, and enough whitespace to make each decision consequential. Historical gameplay appears on a warm paper-like surface, while source code and machine state remain in a dedicated dark terminal context.

The distinctive move is the contrast between a contemporary career shell and an era-specific work surface. Do not turn the whole interface into a retro computer skin. History is content, not decoration.

## Color Roles

- **Application background:** near-black green `--bg`; never pure black.
- **Shell surfaces:** `--surface`, `--surface-raised`, and `--surface-subtle` establish three quiet levels without glass effects.
- **Narrative surface:** warm paper `--surface-paper`; results may use semantic soft surfaces.
- **Terminal surface:** `--surface-terminal` with phosphor-like `--terminal-fg` only inside code context.
- **Foreground ramp:** `--fg`, `--fg-2`, `--muted`, and `--meta` distinguish content, supporting text, and metadata.
- **Paper ink ramp:** `--ink`, `--ink-2`, and `--ink-muted` must be used on warm surfaces.
- **Accent:** `--accent` is reserved for the current action, progress, active navigation index, and local-ready signal. Do not distribute it across decorative elements.
- **Semantic colors:** success, warning, and danger communicate real authoritative states, not decoration.

Raw palette values belong in `runtime-human-tokens.css`. Components use semantic variables.

## Typography

- **Display:** `--font-display`, a readable editorial serif stack, for historical decisions, outcomes, and significant numbers.
- **Body and application chrome:** `--font-body`, a system sans-serif stack.
- **Code, revisions, indices, and machine states:** `--font-mono`.
- Display headings use tight leading and restrained negative tracking. Body text stays at comfortable reading width and approximately 1.55 line-height.
- Uppercase labels are small, sparse, and use `--tracking-label`. Never uppercase long sentences.

## Layout & Composition

- Desktop uses a permanent career sidebar, top context bar, and a bounded main stage.
- The active month is composed as an asymmetric two-column workspace: a broad narrative/decision surface and a narrower machine/context column.
- Tablet stacks the narrative and context areas while preserving their hierarchy.
- Mobile converts the sidebar into a compact horizontal rail and keeps the decision surface first.
- Future sections may appear disabled for orientation, but they must not masquerade as implemented routes.
- Prefer one dominant narrative surface over grids of equal dashboard cards.

## Components & Interaction States

- **Primary action:** flat accent fill, medium radius, strong text, subtle press movement. One primary action per state.
- **Decision rows:** warm raised surface, thin neutral border, keyboard index, descriptive copy, and directional arrow. Hover shifts horizontally rather than floating vertically like a generic card.
- **Navigation:** active entry uses a quiet raised shell surface and one accent index. Disabled entries are visibly unavailable and non-interactive.
- **Status:** save/runtime state uses an `aria-live` region and concise product-specific language.
- **Terminal:** fixed code context with real listing and state values. No fake streaming animation or invented diagnostics.
- **Quality results:** use real metric values and real maxima. Never fabricate analytics to fill space.

## Depth, Motion & Focus

- Two practical elevation levels: flat/ring and raised. No glassmorphism, neumorphism, glowing card stacks, or ambient blob shadows.
- Hover and focus transitions use `--motion-fast` (about 140 ms); larger state changes use `--motion-base` (about 200 ms).
- Use the strong ease-out `--ease-standard`. Do not use ease-in for interface entry and do not animate from scale zero.
- Keyboard focus is always visible through `--focus-ring`.
- `prefers-reduced-motion` removes non-essential component transitions without changing content or state.

## Accessibility

- Normal text must target at least 4.5:1 contrast and large text at least 3:1 on its actual paired surface.
- Preserve native buttons, links, landmarks, progressbars, definition lists, and status semantics.
- Disabled future navigation must expose `aria-disabled="true"` and must not be focusable as a fake link.
- Busy state disables every gameplay command while keeping context readable.
- The layout must remain usable with keyboard navigation, 200% text zoom, and narrow windows.
- Color is never the only signal for success, warning, error, active state, or progress.

## Do

- Let typography and proportion carry the interface.
- Keep the shell contemporary and historical details localized to playable content.
- Use one memorable product-specific detail per screen, such as a real code listing, save boundary status, or era label.
- Keep authoritative data visually distinct from explanatory copy.
- Extend semantic tokens when a role genuinely appears in more than one component.

## Avoid

- No purple/blue trust gradients or decorative hero gradients.
- No glass cards, translucent blur frames, blob backgrounds, or meaningless wave graphics.
- No emoji used as interface icons.
- No invented performance, career, or quality metrics.
- No uniform grid of rounded dashboard tiles.
- No retro skeuomorphism across the entire application.
- No raw colors in feature CSS when a semantic role exists.
- No functional-looking navigation for features that are not implemented.
