# Design System Rules

This project uses Untitled UI as the visual baseline and adapts it into a React + Tailwind v4 codebase with shared primitives, CSS tokens, and a `json-render` presentation layer.

## Figma Source

- File: `6xsA6zUjVZbUVq5swqZtvU`
- Root canvas: `1480:0`
- Foundation nodes used for adoption:
  - Modal: `2200:441940`
  - Text styles: `6825:10916`
  - Gray palette: `7034:44832`

The modal node is the strongest source of truth for controls, radius, typography, and elevation. The typography and palette pages are used to confirm type scale and neutrals.

## 1. Token Definitions

### Where tokens live

- Global CSS tokens: [`src/index.css`](/Users/stas-studio/Developer/orc-demo-guide/src/index.css)
- Shared semantic class maps: [`src/design-system/system.ts`](/Users/stas-studio/Developer/orc-demo-guide/src/design-system/system.ts)

### Token structure

`src/index.css` is the runtime source of truth. It defines:

- gray scale
- brand scale
- semantic status colors
- workflow lane colors
- surface tokens
- shadows
- Tailwind theme aliases

Example:

```css
:root {
  --gray-25: #fcfcfd;
  --brand-600: #7f56d9;
  --surface-panel: rgba(255, 255, 255, 0.96);
  --shadow-xl: 0px 20px 24px -4px rgba(10, 13, 18, 0.08),
    0px 8px 8px -4px rgba(10, 13, 18, 0.03);
}
```

Shared semantic class maps live in `src/design-system/system.ts`:

```ts
export const surfaceClasses = {
  elevatedPanel: "bg-[color:var(--surface-panel)] shadow-[var(--shadow-xl)]",
  queryBubble:
    "border-[color:var(--brand-200)] bg-[color:var(--brand-50)] text-foreground shadow-[var(--shadow-xs)]",
}
```

### Rules

- Add new colors as CSS variables first.
- Put reused semantic class maps in `src/design-system/system.ts`.
- Prefer semantic tokens like `--surface-panel` and `--warning-700` over local hex values.
- Avoid introducing one-off shadows or radii in feature code.

## 2. Component Library

### Where components live

- Core primitives: [`src/components/ui`](/Users/stas-studio/Developer/orc-demo-guide/src/components/ui)
- Product-level wrappers: [`src/components`](/Users/stas-studio/Developer/orc-demo-guide/src/components)
- `json-render` registry bridge: [`src/render/registry.tsx`](/Users/stas-studio/Developer/orc-demo-guide/src/render/registry.tsx)

### Architecture

- Base primitives come from `@base-ui/react`.
- Variants are managed with `class-variance-authority`.
- Styling is done with Tailwind utility classes backed by CSS variables.
- Product-specific status styles come from `src/design-system/system.ts`.

Example button pattern:

```ts
const buttonVariants = cva(
  "rounded-lg text-sm font-semibold",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]",
      },
    },
  }
)
```

### Rules

- Use an existing primitive before creating a new component.
- Extend components through variants or wrappers, not duplicate implementations.
- Keep app chrome aligned to shared surfaces and tokenized badge maps.
- Do not add custom modal/button/input implementations outside `src/components/ui`.

## 3. Frameworks & Libraries

- Framework: React 19
- Language: TypeScript
- Bundler: Vite
- Styling: Tailwind CSS v4 + global CSS custom properties
- UI primitives: `@base-ui/react`
- Utility variants: `class-variance-authority`
- Structured rendering: `@json-render/react`, `@json-render/shadcn`
- Icons: `lucide-react`
- Rich answer rendering: `streamdown`

Relevant files:

- [`package.json`](/Users/stas-studio/Developer/orc-demo-guide/package.json)
- [`vite.config.ts`](/Users/stas-studio/Developer/orc-demo-guide/vite.config.ts)
- [`tsconfig.json`](/Users/stas-studio/Developer/orc-demo-guide/tsconfig.json)

## 4. Asset Management

### Current model

- Fonts are installed from packages, not self-hosted files:
  - `@fontsource/inter`
- Most UI visuals are token-driven surfaces rather than image assets.
- There is no dedicated CDN or image optimization pipeline in this repo today.

### Rules

- Prefer tokenized surfaces, gradients, borders, and shadows over decorative bitmap assets.
- If Figma exports an asset, keep it local to the feature and reference it explicitly.
- Do not introduce third-party icon/image sets when the design can be expressed with existing primitives or Lucide.

## 5. Icon System

- Icons come from `lucide-react`.
- Icons are imported directly in the component that uses them.
- Naming follows Lucide export names such as `SendHorizontal`, `PanelRightOpen`, `ChevronRight`.

Example:

```ts
import { ChevronRight, Minus, Plus } from "lucide-react"
```

### Rules

- Use Lucide for product chrome and controls.
- Keep icon sizes explicit through Tailwind size utilities.
- Match icon tone to semantic tokens instead of ad hoc gray values.

## 6. Styling Approach

### Methodology

- Global tokens in `src/index.css`
- Tailwind v4 utility classes in components
- Shared class maps in `src/design-system/system.ts`
- No CSS Modules or styled-components

### Responsive behavior

- Layout shifts are handled with Tailwind breakpoint utilities such as `xl:px-8`.
- Major chrome lives in React layout components, not global CSS selectors.

### Rules

- Use CSS variables for values that come from Figma foundations.
- Use Tailwind utilities for layout and spacing.
- If a value is reused across files, move it into `src/design-system/system.ts` or `src/index.css`.
- Keep feature files free of repeated hex values when a semantic token already exists.

## 7. Project Structure

- App shell and transport: [`src/client`](/Users/stas-studio/Developer/orc-demo-guide/src/client)
- Shared UI: [`src/components/ui`](/Users/stas-studio/Developer/orc-demo-guide/src/components/ui)
- Product-specific components: [`src/components`](/Users/stas-studio/Developer/orc-demo-guide/src/components)
- Design system assets: [`src/design-system`](/Users/stas-studio/Developer/orc-demo-guide/src/design-system)
- Structured response rendering: [`src/render`](/Users/stas-studio/Developer/orc-demo-guide/src/render)

Important composition points:

- [`src/client/App.tsx`](/Users/stas-studio/Developer/orc-demo-guide/src/client/App.tsx): shell, chat stage, composer, inspector
- [`src/components/scenario-sidebar.tsx`](/Users/stas-studio/Developer/orc-demo-guide/src/components/scenario-sidebar.tsx): workflow rail
- [`src/render/registry.tsx`](/Users/stas-studio/Developer/orc-demo-guide/src/render/registry.tsx): maps json-render panels to local primitives

## 8. Figma Implementation Rules

When bringing in more Untitled UI screens or components:

1. Pull the node through Figma MCP and identify whether it is a foundation node or a concrete screen node.
2. Map palette, typography, radius, and elevation to existing runtime tokens first.
3. Reuse `Button`, `Input`, `Textarea`, `Card`, `Badge`, and `Dialog` before creating new UI.
4. Keep workflow lane semantics in `src/design-system/system.ts`, not in feature files.
5. If a new Figma node introduces a reusable style, add a token or class map instead of another local override.

## 9. Current Gaps

- The repo now has a shared Untitled UI token base, but not a full Untitled UI screen-for-screen shell.
- Sidebar navigation, empty states, and page composition are still product-specific adaptations.
- There is no Storybook or component documentation site yet.

The correct next step for deeper adoption is to implement concrete Untitled UI app-shell nodes from Figma, using these rules and tokens as the base rather than starting another isolated restyling pass.
