# Task Report Instructions

## Overview
Every agent must generate a structured task report at the end of execution.

## Report Location
```
workflows/{WORKFLOW_ID}/executions/{EXECUTION_NUM}/task-reports/{SEQUENCE}-{AGENT_NAME}.md
```

Example: `workflows/MEGAM-001/executions/001/task-reports/03-medusa-backend.md`

## Required Format

```markdown
# Task Report: {AGENT_NAME}

**Workflow:** {WORKFLOW_ID}  
**Execution:** {EXECUTION_NUM}  
**Sequence:** {SEQUENCE}  
**Started:** {ISO 8601 timestamp}  
**Completed:** {ISO 8601 timestamp}  
**Duration:** {X}m {Y}s  
**Status:** SUCCESS | PARTIAL | FAILED

## Task Description
{What you were asked to do}

## Work Completed
**Files Modified:**
- {file path}: {what changed}

**Files Created:**
- {file path}: {purpose}

**Key Decisions:**
1. {Decision}: {Why you made this choice}
2. {Decision}: {Why you made this choice}

## Issues Encountered
**Blockers:**
- {Issue description, type: PERMISSION | API_ERROR | BUILD_ERROR | OTHER}

**Warnings:**
- {Non-blocking issues to note}

## Performance
**Duration Breakdown:** {If >5min, explain where time was spent}  
**Token Usage:** {Rough estimate}

## Next Steps
**For Next Agent:**
- {Critical information or actions needed}

**Recommendations:**
- {Suggestions for future improvements}

---
**Report Generated:** {timestamp}
```

## Field Guidelines

**Status:**
- SUCCESS: Task fully completed
- PARTIAL: Mostly done but with gaps
- FAILED: Could not complete

**Timestamps:** Use ISO 8601 format: `2025-10-03T14:30:00Z`

**File Paths:** Relative to project root: `src/api/products.ts`

**Issue Types:**
- PERMISSION: Auth/access errors
- API_ERROR: External API failures
- BUILD_ERROR: Compilation/lint errors
- OTHER: Anything else

## Usage in Agent Specs

Add this to each agent `.md` file:

```markdown
## Task Reporting
At the end of EVERY task, generate a structured task report.

Follow the standard: `.claude/task-report-standard.md`

Save to: `workflows/{WORKFLOW_ID}/executions/{EXECUTION_NUM}/task-reports/{SEQUENCE}-{AGENT_NAME}.md`
```