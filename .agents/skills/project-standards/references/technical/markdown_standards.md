# Markdown & Documentation Standards

This manual defines the formatting, layout, and styling standards for project documentation, manuals, and workspace `.md` files.

## 1. GitHub Alert Banners

GitHub supports native alert banners (`> [!NOTE]`, `> [!IMPORTANT]`, `> [!TIP]`, `> [!WARNING]`, and `> [!CAUTION]`) to highlight key information.

### Column 0 Constraint

For the markdown parser to correctly render an alert banner instead of a standard blockquote:

- The blockquote quote character `>` **MUST** begin at column 0 of the line.
- There must be no preceding indentation, spaces, list bullet points (`-`), or list numbers.

#### ❌ Incorrect Indentations

```markdown
  > [!NOTE]
  > This is indented by spaces and will not render as a banner.

- > [!IMPORTANT]
  > This is preceded by a list bullet and will render as a bullet item.
```

#### 👍 Correct Setup

```markdown
> [!NOTE]
> This starts at column 0 and will render as a native blue note banner.
```

## 2. List Continuity and Alert Placement

Placing a native alert banner in the middle of a numbered list breaks the list parser. This causes the subsequent list items to restart their numbering from `1.`.

### Structural Segregation

To maintain continuous numbering:

1. Conclude the ordered list before introducing the alert block.
2. Structure the documentation into distinct header subsections if notes are lengthy or critical.

#### ❌ Incorrect List Interruption

```markdown
1. First step.
2. Second step.
   > [!NOTE]
   > This breaks the list numbering.
3. Third step (will render as 1. Third step).
```

#### 👍 Correct List Separation

```markdown
1. First step.
2. Second step.

> [!NOTE]
> Keep notes outside list scopes to prevent parser reset.

3. Third step (retains correct numbering sequence).
```

## 3. File Links, Anchors, and Media

To ensure cross-compatibility and easy navigation within development environments:

### Clickable File Links

- Always use standard markdown link syntax with relative paths: `[link text](./relative/path/to/file)` or `[link text](../path/to/file)`.
- For specific line ranges, append the line anchor: `[link text](./relative/path/to/file#L123-L145)`.
- **Absolute Paths Prohibited**: Do NOT use absolute file paths or `file:///` URLs in documentation files (`.md` / `AGENTS.md`) to maintain portability across platforms.

### Embedding Media

- To embed images and videos, you **MUST** use the image syntax: `![caption](/absolute/path/to/file.jpg)`. Standard links will not display the media inline.
- Provide a brief, descriptive caption.
- **Artifact Sandbox**: If you are embedding a file in an artifact or markdown file and it is not already in the designated assets/artifacts folder, you **MUST** first copy it to the local media directory before referencing it.

## 4. Technical Content & Referential Integrity (Zero-Hardcoding)

Manuals and project documentation must reflect logical concepts and structures rather than ephemeral values.

- **Referential Integrity**: Documentation and manuals MUST avoid hardcoded game constants (e.g., pixel sizes, coordinate values).
- **Source of Truth**: Always point to the centralized logic file (e.g., `spatialCoordinator.ts`) or `visuals.ts` as the owner of the numbers.
- **Relativity**: Explain technical specs using symbolic names (e.g., `ENTITY_SIZE_P1/P2`) and logical relationships (e.g., `SAFE_ZONE_BOTTOM - ENTITY_SIZE_P1`) rather than absolute values.

---

## 5. Zero Mechanical Truncation & Forensic Commit Audit Mandate

When modernizing, reorganizing, or cleaning documentation (such as converting raw web scrapes or legacy reference articles into canonical project manuals):

1. **Zero Mechanical Truncation**:
   - It is **STRICTLY FORBIDDEN** to discard, omit, or aggressively summarize mechanical formulas, specific branching tables (e.g., all 25 natures and flavor preferences, complete evolution branch conditions, gym leader rosters, minigame payout formulas, or status synergy matrices).
   - The cleanup process must **exclusively strip web-scraping junk** (BBCode formatting, forum comments, guestbook links, and HTML ads), while retaining **100% of the game rules, mathematical formulas, branching paths, and data matrices** within the canonical SSoT manual.

2. **Forensic Commit Comparison Protocol**:
   - Whenever refactoring or consolidating reference documents, agents **MUST** execute a forensic line-by-line comparison against previous commits (`git show HEAD:<path>`) across all affected topics.
   - A documentation refactor cannot be declared complete until verifying that zero game mechanics, thresholds, or domain parameters were inadvertently lost or truncated.

