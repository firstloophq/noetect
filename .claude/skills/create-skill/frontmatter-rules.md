# YAML Frontmatter Rules

## name Field

**Requirements:**
- Maximum 64 characters
- Lowercase letters, numbers, and hyphens only
- No XML tags
- No reserved words: "anthropic", "claude"

**Valid:**
- `pdf-processing`
- `git-commit-helper`
- `data-validation-v2`

**Invalid:**
- `PDF_Processing` (uppercase, underscore)
- `claude-helper` (reserved word)
- `my skill` (space)

## description Field

**Requirements:**
- Maximum 1024 characters
- Cannot be empty
- No XML tags
- Write in third person

**Structure:**
1. What the skill does
2. When to use it
3. Key trigger words

**Good:**
```yaml
description: Extract text and tables from PDF files. Use when working with PDFs, forms, or document extraction.
```

**Bad:**
```yaml
description: I help you with PDFs
```
(Uses first person "I")

## Complete Example

```yaml
---
name: code-formatter
description: Format code files according to project style guides. Use when formatting code, fixing style issues, or preparing code for review.
---
```
