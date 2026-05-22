# Markdown & Documentation Standards

This manual defines the formatting, layout, and styling standards for project documentation, manuals, and workspace `.md` files.

## 1. GitHub Alert Banners

GitHub supports native alert banners (`> [!NOTE]`, `> [!IMPORTANT]`, `> [!TIP]`, `> [!WARNING]`, and `> [!CAUTION]`) to highlight key information.

### Column 0 Constraint

For the markdown parser to correctly render an alert banner instead of a standard blockquote:
- The blockquote quote character `>` **MUST** begin at column 0 of the line.
- There must be no preceding indentation, spaces, list bullet points (`- `), or list numbers.

#### ❌ Incorrect Indentations
```markdown
  > [!NOTE]
  > This is indented by spaces and will not render as a banner.

- > [!IMPORTANT]
  > This is preceded by a list bullet and will render as a bullet item.
```

####  Correct Setup
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

####  Correct List Separation
```markdown
1. First step.
2. Second step.

> [!NOTE]
> Keep notes outside list scopes to prevent parser reset.

3. Third step (retains correct numbering sequence).
```
