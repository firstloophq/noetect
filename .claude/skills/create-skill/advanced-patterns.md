# Advanced Skill Patterns

## Feedback Loop Pattern

For tasks requiring validation:

```markdown
## Document Processing

1. Process the document
2. **Validate**: Run `python scripts/validate.py output/`
3. If validation fails:
   - Review error messages
   - Fix issues
   - Run validation again
4. Only proceed when validation passes
```

## Conditional Workflow Pattern

Guide through decision points:

```markdown
## Processing Workflow

Determine the task type:

**New file?** → Follow "Creation workflow"
**Existing file?** → Follow "Editing workflow"

### Creation Workflow
1. Use template from `templates/`
2. Fill in required fields
3. Validate output

### Editing Workflow
1. Read existing file
2. Make targeted changes
3. Validate changes
```

## Checklist Pattern

For multi-step tasks:

```markdown
## Release Checklist

Copy and track progress:

```
Release Progress:
- [ ] Update version number
- [ ] Run full test suite
- [ ] Update changelog
- [ ] Build artifacts
- [ ] Tag release
```
```

## Examples Pattern

For quality-sensitive output:

```markdown
## Commit Messages

Follow these examples:

**Input**: Added user auth
**Output**:
```
feat(auth): implement JWT authentication

Add login endpoint and token validation
```

**Input**: Fixed date bug
**Output**:
```
fix(reports): correct timezone handling

Use UTC timestamps consistently
```
```

## Domain Organization

For skills with multiple domains:

```
my-skill/
├── SKILL.md
└── reference/
    ├── domain-a.md
    ├── domain-b.md
    └── domain-c.md
```

SKILL.md points to relevant domain file based on task.

## Utility Scripts Best Practices

### Error Handling

```python
def process(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"Creating {path} with defaults")
        with open(path, 'w') as f:
            f.write('')
        return ''
```

### Document Constants

```python
# Timeout for HTTP requests (30s accounts for slow connections)
REQUEST_TIMEOUT = 30

# Retries balance reliability vs speed
MAX_RETRIES = 3
```

## Verifiable Intermediate Outputs

For complex operations, create plan files:

```markdown
## Batch Update Process

1. Analyze files → generate `changes.json`
2. **Validate plan**: `python scripts/validate_plan.py changes.json`
3. If valid, execute: `python scripts/apply_changes.py changes.json`
4. Verify results
```

This catches errors before changes are applied.
