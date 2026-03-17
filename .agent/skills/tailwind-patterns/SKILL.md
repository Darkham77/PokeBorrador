---
name: tailwind-patterns
description: Tailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Tailwind CSS Patterns (v4 - 2025)

> Modern utility-first CSS with CSS-native configuration.

---

## 1. Tailwind v4 Architecture

### What Changed from v3

| v3 (Legacy) | v4 (Current) |
| :--- | :--- |
| `tailwind.config.js` | CSS-based `@theme` directive |
| PostCSS plugin | Oxide engine (10x faster) |
| JIT mode | Native, always-on |
| Plugin system | CSS-native features |
| `@apply` directive | Still works, discouraged |

### v4 Core Concepts

| Concept | Description |
| :--- | :--- |
| **CSS-first** | Define configuration in CSS, not JavaScript. |
| **Oxide Engine** | Use the Rust-based compiler for 10x faster builds. |
| **Native Nesting** | Leverage CSS nesting without requiring PostCSS. |
| **CSS Variables** | Reference all tokens as `--*` CSS variables. |

---

## 2. CSS-Based Configuration

### Theme Definition

```css
@theme {
  /* Colors - use semantic names */
  --color-primary: oklch(0.7 0.15 250);
  --color-surface: oklch(0.98 0 0);
  --color-surface-dark: oklch(0.15 0 0);
  
  /* Spacing scale */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### When to Extend vs Override

| Action | Use When |
| :--- | :--- |
| **Extend** | Add new values alongside established defaults. |
| **Override** | Replace the default scale entirely. |
| **Semantic tokens** | Implement project-specific naming (e.g., primary, surface). |

---

## 3. Container Queries (v4 Native)

### Breakpoint vs Container

| Type | Responds To |
| :--- | :--- |
| **Breakpoint** (`md:`) | Viewport width. |
| **Container** (`@container`) | Parent element width. |

### Container Query Usage

| Pattern | Classes |
| :--- | :--- |
| **Define container** | Apply `@container` on the parent element. |
| **Container breakpoint** | Apply `@sm:`, `@md:`, or `@lg:` on child elements. |
| **Name containers** | Use `@container/card` for specific targeting. |

### When to Use

| Scenario | Use |
| :--- | :--- |
| Page-level layouts | Viewport breakpoints. |
| Component-level responsive | Container queries. |
| Reusable components | Container queries (to ensure context-independence). |

---

## 4. Responsive Design

### Breakpoint System

| Prefix | Min Width | Target |
| :--- | :--- | :--- |
| (none) | 0px | Mobile-first base. |
| `sm:` | 640px | Large phone / small tablet. |
| `md:` | 768px | Tablet. |
| `lg:` | 1024px | Laptop. |
| `xl:` | 1280px | Desktop. |
| `2xl:` | 1536px | Large desktop. |

### Mobile-First Principle

1. **Write mobile styles first:** Start with the base classes (no prefix).
2. **Add larger screen overrides:** Use prefixes for tablet and desktop views.
3. **Draft example:** `w-full md:w-1/2 lg:w-1/3`

---

## 5. Dark Mode

### Configuration Strategies

| Method | Behavior | Use When |
| :--- | :--- | :--- |
| `class` | Toggles with `.dark` class. | Implement manual theme switchers. |
| `media` | Follows system preference. | Defer to OS-level control. |
| `selector` | Custom selector (v4). | Build complex, multi-theme systems. |

### Dark Mode Pattern

| Element | Light | Dark |
| :--- | :--- | :--- |
| Background | `bg-white` | `dark:bg-zinc-900` |
| Text | `text-zinc-900` | `dark:text-zinc-100` |
| Borders | `border-zinc-200` | `dark:border-zinc-700` |

---

## 6. Modern Layout Patterns

### Flexbox Patterns

| Pattern | Classes |
| :--- | :--- |
| Center (both axes) | `flex items-center justify-center` |
| Vertical stack | `flex flex-col gap-4` |
| Horizontal row | `flex gap-4` |
| Space between | `flex justify-between items-center` |
| Wrap grid | `flex flex-wrap gap-4` |

### Grid Patterns

| Pattern | Classes |
| :--- | :--- |
| Auto-fit responsive | `grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]` |
| Asymmetric (Bento) | `grid grid-cols-3 grid-rows-2` with spans |
| Sidebar layout | `grid grid-cols-[auto_1fr]` |

> [!TIP]
> **Prioritize asymmetric/Bento layouts** over symmetric 3-column grids to create a premium feel.

---

## 7. Modern Color System

### OKLCH vs RGB/HSL

| Format | Advantage |
| :--- | :--- |
| **OKLCH** | Achieve perceptual uniformity; ideal for modern design. |
| **HSL** | Leverage intuitive hue/saturation values. |
| **RGB** | Maintain legacy browser compatibility. |

### Color Token Architecture

| Layer | Example | Purpose |
| :--- | :--- | :--- |
| **Primitive** | `--blue-500` | Define raw color values. |
| **Semantic** | `--color-primary` | Apply purpose-based naming convention. |
| **Component** | `--button-bg` | Isolate component-specific overrides. |

---

## 8. Typography System

### Font Stack Pattern

| Type | Recommended |
| :--- | :--- |
| Sans | `'Inter', 'SF Pro', system-ui, sans-serif` |
| Mono | `'JetBrains Mono', 'Fira Code', monospace` |
| Display | `'Outfit', 'Poppins', sans-serif` |

### Type Scale

| Class | Size | Use |
| :--- | :--- | :--- |
| `text-xs` | 0.75rem | Use for labels and captions. |
| `text-sm` | 0.875rem | Use for secondary text. |
| `text-base` | 1rem | Use for body text. |
| `text-lg` | 1.125rem | Use for lead text. |
| `text-xl`+ | 1.25rem+ | Use for headings. |

---

## 9. Animation & Transitions

### Built-in Animations

| Class | Effect |
| :--- | :--- |
| `animate-spin` | Apply continuous rotation. |
| `animate-ping` | Create attention-grabbing pulse. |
| `animate-pulse` | Apply subtle opacity pulse. |
| `animate-bounce` | Trigger bouncing effect. |

### Transition Patterns

| Pattern | Classes |
| :--- | :--- |
| All properties | `transition-all duration-200` |
| Specific context | `transition-colors duration-150` |
| Easing control | Use `ease-out` or `ease-in-out` for smoothness. |
| Hover reaction | `hover:scale-105 transition-transform` |

---

## 10. Component Extraction

### When to Extract

| Signal | Action |
| :--- | :--- |
| Same class combo 3+ times | **Extract** into a reusable component. |
| Complex state variants | **Extract** to manage complexity. |
| Design system element | **Extract and document** for team usage. |

### Extraction Methods

| Method | Use When |
| :--- | :--- |
| **React/Vue component** | Logic or dynamic state is required. |
| **@apply in CSS** | Static design is sufficient; no JS needed. |
| **Design tokens** | Managing reusable theme values. |

---

## 11. Anti-Patterns

| Avoid | Instead |
| :--- | :--- |
| Arbitrary values (`w-[311px]`) | **Use** the established design system scale. |
| Heavy `!important` usage | **Fix** specificity issues at the source. |
| Inline `style=` attributes | **Apply** utility classes for consistency. |
| Duplicate long class lists | **Extract** into a component. |
| Mixing v3 config with v4 | **Migrate** fully to the CSS-first architecture. |
| Heavy reliance on `@apply` | **Prefer** actual framework components. |

---

## 12. Performance Principles

| Principle | Implementation |
| :--- | :--- |
| **Purge unused** | Automatic in v4; no action needed. |
| **Avoid dynamism** | Avoid generating classes with template strings. |
| **Utilize Oxide** | Defaults to enabled in v4 (10x faster). |
| **Cache builds** | Configure CI/CD to cache build results. |

---

> [!IMPORTANT]
> **Embrace Tailwind v4 as CSS-first.** Use CSS variables, native container queries, and the Oxide engine. Remember that the JavaScript config file is now optional.
