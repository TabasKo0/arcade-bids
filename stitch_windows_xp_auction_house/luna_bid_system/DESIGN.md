---
name: Luna Bid System
colors:
  surface: '#fdfae8'
  surface-dim: '#dddaca'
  surface-bright: '#fdfae8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f4e3'
  surface-container: '#f1eedd'
  surface-container-high: '#ece9d8'
  surface-container-highest: '#e6e3d2'
  on-surface: '#1c1c12'
  on-surface-variant: '#434655'
  inverse-surface: '#313126'
  inverse-on-surface: '#f4f1e0'
  outline: '#737687'
  outline-variant: '#c3c5d8'
  surface-tint: '#0051e0'
  primary: '#0040b5'
  on-primary: '#ffffff'
  primary-container: '#0055ea'
  on-primary-container: '#d8dfff'
  inverse-primary: '#b5c4ff'
  secondary: '#106d20'
  on-secondary: '#ffffff'
  secondary-container: '#9df898'
  on-secondary-container: '#1a7425'
  tertiary: '#704000'
  on-tertiary: '#ffffff'
  tertiary-container: '#915500'
  on-tertiary-container: '#ffdab8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00164d'
  on-primary-fixed-variant: '#003cac'
  secondary-fixed: '#9df898'
  secondary-fixed-dim: '#82db7e'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#ffb86f'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#fdfae8'
  on-background: '#1c1c12'
  surface-variant: '#e6e3d2'
typography:
  headline-lg:
    fontFamily: Work Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-md:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  headline-sm:
    fontFamily: Work Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  title-md:
    fontFamily: Work Sans
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
  body-lg:
    fontFamily: Work Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-md:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  body-sm:
    fontFamily: Work Sans
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
  label-lg:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
  label-md:
    fontFamily: Work Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  label-sm:
    fontFamily: Work Sans
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 12px
    letterSpacing: 0.2px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.5rem
  margin: 0.75rem
  space-xs: 0.125rem
  space-sm: 0.25rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
---

## Brand & Style

This design system delivers an authentic early-2000s desktop computing aesthetic modeled on the iconic Windows XP Luna Blue interface, tailored specifically for a high-velocity online auction platform. It merges utilitarian desktop density with rich, tactile skeuomorphism: high-gloss blue gradient title bars, soft light-cream/beige window surfaces, vibrant green primary CTA anchors reminiscent of the classic Start button, and explicit dual-tone 3D beveled surfaces.

The visual tone is earnest, mechanical, and nostalgic. Users interact with auction listings not as transient web cards, but as persistent "windows," "property sheets," and "recessed data ledgers." The atmosphere delivers high information density, razor-sharp edge contrast, and tangible feedback states (embossed resting items, debossed clicked surfaces) that inspire transactional confidence and retro charm.

## Colors

The palette reproduces the chromatic identity of early 2000s desktop operating systems:

- **Primary (`#0055EA`)**: Classic Luna Royal Blue. Used for active window header gradients (interpolating between `#0A246A`, `#0055EA`, and `#2683FF`), active table headers, and focused selections.
- **Secondary (`#388E3C` to `#4CAF50`)**: Start-Button Green. Reserved for high-value transactional commitments: "Place Bid," "Buy It Now," and live auction confirmations.
- **Tertiary (`#FF9900`)**: Warning and highlight amber. Used for urgent auction countdowns, reserve-not-met flags, and outbid badges.
- **Neutral Base (`#ECE9D8`)**: Windows XP System Beige/Silver. Serves as the primary canvas for window chassis, dialog panels, property sheets, and menu strips.

### Supporting Chromatics & Bevel Hues
- **Surface Pure (`#FFFFFF`)**: Pure white reserved for editable inputs, recessed list boxes, document canvas bodies, and 3D top/left highlight edges.
- **Bevel Highlight (`#FFFFFF`)**: Top-left edge highlight for outset elements.
- **Bevel Shadow Light (`#D4D0C8`)**: Soft inner bevel for depth steps.
- **Bevel Shadow Dark (`#808080`)**: Standard medium gray for outset bottom/right borders.
- **Bevel Pure Black (`#000000`)**: Deep bottom-right drop shadow for intense outset buttons and crisp border strokes.
- **Title Bar Inactive Gradient**: `#7A96DF` to `#9CB9EF`, providing immediate background-window visual hierarchy.

## Typography

Type choices prioritize the structured, legible, utilitarian rhythm of the classic MS Sans Serif and Tahoma era. `Work Sans` provides clean grotesque geometry, clear character distinctions, and rigid rendering at small, compact pixel sizes.

Key rules:
- **Zero Antialiasing Softness**: Body copy sits tightly at 11px to 13px with controlled line heights to maximize data density in multi-column bid tables and parameter grids.
- **Title Bar Text**: Rendered at 12px or 13px with bold weight, `#FFFFFF` color, and a subtle dropped drop-shadow (`drop-shadow(1px 1px 0px rgba(10, 36, 106, 0.8))`).
- **Data Cells & Values**: Number fields (currency values, lots, timestamps) use `label-md` or `body-md` tabular numerals to preserve grid vertical alignment across listings.

## Layout & Spacing

Layout behaves as a physical desktop workspace rather than an expansive, airy document. Spatial scales are compact, governed by an 8px base grid stepped down to 2px and 4px micro-increments:

- **Window Chassis**: Primary workspaces mimic floating or tiled MDI (Multi-Document Interface) windows. Inner margins within window panels are fixed at `space-md` (8px) or `space-lg` (12px).
- **Layout Model**: Fluid multi-pane splitters. Left rail features Explorer-style collapsible task panes (width 200px–260px); main stage is a data-dense grid or lot property inspector.
- **Screen Adaptation**:
  - **Desktop (1024px+)**: True multi-pane layout with toolbars, sidebar task panes, docked bid ledgers, and floating dialog windows.
  - **Tablet (768px - 1023px)**: Left task sidebar collapses into an icon shelf; main table retains rigid column headers with horizontal scrolling.
  - **Mobile (<768px)**: Windows maximize automatically to fill the viewport; tabbed property controls switch to stacked accordion blocks; taskbars collapse to docked bottom action strips.

## Elevation & Depth

Depth is defined strictly through classic 3D structural bevels, lighting models, and specular gradients rather than soft ambient drop shadows.

### The 3D Bevel Engine
- **Outset Surface (Elevated / Clickable)**:
  - Top edge: 1px solid `#FFFFFF`
  - Left edge: 1px solid `#FFFFFF`
  - Bottom edge: 1px solid `#808080` (outer: `#000000` on active focus)
  - Right edge: 1px solid `#808080` (outer: `#000000` on active focus)
- **Inset Surface (Sunken / Editable / Data Fields)**:
  - Top edge: 1px solid `#808080` (outer: `#404040`)
  - Left edge: 1px solid `#808080` (outer: `#404040`)
  - Bottom edge: 1px solid `#FFFFFF`
  - Right edge: 1px solid `#FFFFFF`
  - Fill: Pure `#FFFFFF` for entry fields, `#DCD8C8` for disabled wells.
- **Window Drop Shadows**: Floating dialogs utilize a harsh, offset dual-stop shadow: `2px 2px 0px rgba(0, 0, 0, 0.28)`.

### Skeuomorphic Gloss
- Title bars feature a three-stop horizontal and vertical sheen: a brighter cyan-blue linear gloss band across the top 45% of the title bar, transitioning to deep royal blue at the lower edge.

## Shapes

The shape hierarchy combines rounded window caps with razor-sharp structural interiors:

- **Window Top Edges**: Soft cornering (`6px 6px 0px 0px`) matching the distinctive XP window head, where the blue title bar curves slightly at the outer corners.
- **System Buttons & Panels**: Gentle `3px` radius with high-sheen gradient fills on primary push-buttons.
- **Interior Data Elements**: `0px` radius on all data grids, list boxes, status panels, tabs, and bevel frames. All inner functional interfaces remain strictly orthogonal.

## Components

### Window Frames & Dialogs
- **Structure**: Blue header (active: `#0055EA` gradient; inactive: `#7A96DF`), beige chassis (`#ECE9D8`), 3px solid border framing.
- **Controls**: Top-right system buttons (Minimize `_`, Maximize `□`, Close `✕`). The close button uses the signature red highlight with an inner white cross.

### Buttons & Action Bars
- **Push Buttons**: Light cream background with a subtle linear gradient, 1px white highlight border, outer gray border, and 3px rounded corners.
- **Action 'Start' Button (Primary CTA)**: Vibrant green pill-like button (`#388E3C` to `#4CAF50` gradient), curved left-cap, bold italicized white typography, and inset press state.

### Property Sheets & Tabs
- Classic XP tab rows overlapping a beveled white/beige container. Active tab is taller by 2px, white-backed with top rounded corners (`3px`), seamlessly connecting to the interior card. Inactive tabs are inset gray (`#D8D4C4`).

### Data Grids & Auction Ledgers
- Recessed (`inset`) white viewport with rigid column headers. Headers display an outset 3D bevel and sort indicators (up/down triangles). Rows feature alternating `#FFFFFF` and `#F5F3EB` fills; selected row renders in solid royal blue (`#0A246A`) with crisp white text.

### Inputs & Number Spinners
- Sunken 2-layer beveled edge (`inset 1px 1px 0px #808080`). Crisp vertical numeric spinners with stacked up/down outset arrow triggers.

### Taskbar & Status Strip
- **Bottom Taskbar**: Deep blue gloss bar (`#1F4CB8` to `#245EDC`) anchoring active window tiles.
- **Status Bar**: Anchored to bottom of window panels, subdivided into recessed bevel segments displaying auction status, connection ping, item counts, and countdown timers.