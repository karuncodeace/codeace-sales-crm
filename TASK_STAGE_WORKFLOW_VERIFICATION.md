# Task + Stage Workflow Verification Report

## 1. Enumerated Expected Stage Flow

Based on code analysis, the expected pipeline stages are:

| Stage | Next Stage | Task Type | Task Title Pattern | Default Due Date | Status at Creation |
|-------|------------|-----------|-------------------|-------------------|---------------------|
| **New** | Contacted | Call | `First Call – {LeadName}` | 1 day from creation | Pending |
| **Contacted** | Demo | Meeting | `Schedule Demo – {LeadName}` | Unknown (not in code) | Pending |
| **Demo** | Proposal | Meeting | `Demo with {LeadName}` or `Second Demo – {LeadName}` | Unknown (not in code) | Pending |
| **Proposal** | Follow-Up | Follow-Up | `Proposal Follow-up – {LeadName}` | Unknown (not in code) | Pending |
| **Follow-Up** | Won | Call | `Follow Up Call – {LeadName}` | Unknown (not in code) | Pending |
| **Won** | null | N/A | No tasks created | N/A | N/A |

### Stage Flow Definition

**Source**: `app/components/tables/tasksTable.jsx:123-130`

```javascript
const NEXT_STAGE_MAP = {
  "New": "Contacted",
  "Contacted": "Demo",
  "Demo": "Proposal",
  "Proposal": "Follow-Up",
  "Follow-Up": "Won",
  "Won": null,
};
```

### Special Cases

1. **"Second Demo" Stage**: Code references `STAGE_CONSTANTS.SECOND_DEMO = "Second Demo"` but this is NOT in `NEXT_STAGE_MAP`. This creates an inconsistency.

2. **Task Title Generation**: `lib/utils/taskTitleGenerator.js` generates titles, but task types are hardcoded in frontend logic, not in a single source of truth.

---

## 2. Task Completion → Stage Transition Validation

### Current Implementation

**Location**: `app/components/tables/tasksTable.jsx:626-723`

**Flow**:
1. STEP 1: Insert into `task_activities` (activity log)
2. STEP 2: Update `tasks_table` - set `status = "Completed"`, `completed_at = NOW()`
3. STEP 3: Update `leads_table` - set `current_stage = nextStage`, `status = nextStage`
4. STEP 4: Wait 500ms, then update next task's `due_date` (if provided)

### Lead Fields Update Analysis

| Field | Should Update? | Actually Updates? | Location | Sync/Async |
|-------|---------------|-------------------|----------|------------|
| `current_stage` | ✅ Yes | ✅ Yes | STEP 3 | Synchronous |
| `status` | ✅ Yes | ✅ Yes | STEP 3 | Synchronous |
| `next_stage_notes` | ✅ Yes | ✅ Yes | STEP 3 | Synchronous |
| `first_call_done` | ✅ Yes | ❌ **NO** | Missing | N/A |
| `last_attempted_at` | ✅ Yes | ❌ **NO** | Missing | N/A |

### Critical Gaps

1. **`first_call_done` is NEVER updated**: Code checks `isFirstTask()` but never updates `first_call_done` field in `leads_table`. This breaks KPI calculations.

2. **`last_attempted_at` is NEVER updated**: No code updates this field on task completion. Dashboard metrics relying on this will be incorrect.

3. **No validation of stage transition**: Code does not verify that the task being completed matches the lead's current stage before transitioning.

### Synchronous vs Async

All updates are **synchronous** (await in sequence), but:
- Task completion API call may fail independently
- Lead update API call may fail independently
- No transaction wrapping - partial failures possible

---

## 3. Next Task Creation Logic Validation

### Expected Behavior

When a task is completed and lead moves to next stage:
- Next task should be created automatically
- Task should be assigned to same sales person
- Task should have correct stage, type, and title
- Task should be idempotent (no duplicates)

### Actual Implementation

**Code Claims**: "Task creation for next stage is handled by PostgreSQL triggers"

**Reality Check**: 
- ❌ **NO TRIGGER SQL FOUND**: Searched all `.sql` files - no trigger that creates tasks on `current_stage` change
- ✅ **API Fallback**: `/api/leads` route (line 334-398) creates tasks when `status` changes, but:
  - Only creates tasks for non-"New" stages
  - Creates tasks with wrong titles (e.g., "Follow-up to {name}" instead of "Schedule Demo – {name}")
  - Uses `crmUser.id` instead of lead's `assigned_to` for sales person assignment
  - Not idempotent - can create duplicates

### Next Task Creation by Stage

| Current Stage | Next Stage | Should Create Task? | Actually Creates? | Method | Issues |
|---------------|------------|---------------------|-------------------|--------|--------|
| New | Contacted | ✅ Yes | ❓ Unknown (trigger not found) | Trigger (claimed) | Trigger may not exist |
| Contacted | Demo | ✅ Yes | ⚠️ Partial (API fallback) | API fallback | Wrong title, wrong assignment |
| Demo | Proposal | ✅ Yes | ⚠️ Partial (API fallback) | API fallback | Wrong title, wrong assignment |
| Proposal | Follow-Up | ✅ Yes | ⚠️ Partial (API fallback) | API fallback | Wrong title, wrong assignment |
| Follow-Up | Won | ❌ No | ❌ No | N/A | Correct |
| Won | null | ❌ No | ❌ No | N/A | Correct |

### Idempotency Check

**Frontend Code**: Waits 500ms then queries for next task:
```javascript
await new Promise(resolve => setTimeout(resolve, 500));
const nextTaskRes = await fetch(`/api/tasks?lead_id=${leadId}`);
```

**Problems**:
1. **Hardcoded 500ms delay**: No guarantee trigger completes in 500ms
2. **No duplicate check**: If trigger fires twice, both tasks will be created
3. **Race condition**: If task creation is slow, frontend may not find it
4. **No retry logic**: If task not found, silently fails

**API Fallback** (`/api/leads` route):
- ❌ **NOT idempotent**: No check for existing task before creating
- ❌ **Can create duplicates**: If called multiple times, creates multiple tasks

---

## 4. Edge Cases Analysis

### Edge Case 1: Completing Same Task Twice

**Scenario**: User clicks "Complete" button twice rapidly, or API is called twice.

**Expected**: Second completion should be ignored (task already completed).

**Actual**:
- ✅ Task status check exists: `if (task.status?.toLowerCase() === "completed") return;`
- ⚠️ **Race condition**: If two requests arrive simultaneously, both may pass the check
- ❌ **No database-level lock**: Concurrent updates possible

**Verdict**: **RISKY** - Race condition exists.

### Edge Case 2: Replaying Same Completion Event

**Scenario**: Webhook retry, workflow retry, or user refreshes and resubmits.

**Expected**: Duplicate task completion should be ignored, or operation should be idempotent.

**Actual**:
- ❌ **No idempotency key**: Each completion creates new `task_activities` record
- ❌ **Stage can be updated multiple times**: If lead update is retried, `current_stage` may be set multiple times
- ⚠️ **Task status update is idempotent**: Setting status to "Completed" multiple times is safe, but `completed_at` may be overwritten

**Verdict**: **RISKY** - No idempotency protection.

### Edge Case 3: Sales Person Reassignment Mid-Stage

**Scenario**: Lead is reassigned from Sales Person A to Sales Person B while task is pending.

**Expected**: 
- Pending tasks should be reassigned to new sales person
- Completed tasks should retain original assignment

**Actual**:
- ❌ **No reassignment logic found**: Code does not handle this case
- ❌ **Tasks retain old `sales_person_id`**: Reassigned leads may have tasks assigned to wrong person
- ⚠️ **New tasks use lead's `assigned_to`**: Only new tasks get correct assignment

**Verdict**: **BROKEN** - Reassignment not handled.

### Edge Case 4: Lead Disqualification

**Scenario**: Lead is marked as disqualified (not qualified, wrong contact, etc.).

**Expected**: All pending tasks should be cancelled.

**Actual**:
- ❌ **No disqualification handler found**: Code does not cancel tasks on disqualification
- ❌ **Tasks remain pending**: Disqualified leads may still show active tasks

**Verdict**: **BROKEN** - Disqualification not handled.

### Edge Case 5: Task Marked as Missed Instead of Completed

**Scenario**: Task is overdue and marked as "Missed" instead of "Completed".

**Expected**: 
- Lead should NOT progress to next stage
- No next task should be created
- Task can be rescheduled

**Actual**:
- ✅ **Correct**: Only "Completed" status triggers stage progression
- ⚠️ **No reschedule logic**: Code does not handle "Missed" → "Pending" transition
- ❌ **No automatic missed detection**: System does not auto-mark overdue tasks as missed

**Verdict**: **PARTIALLY WORKING** - Missed tasks don't break flow, but no reschedule mechanism.

### Edge Case 6: Database Trigger Fails

**Scenario**: PostgreSQL trigger that creates next task fails (error, timeout, constraint violation).

**Expected**: Error should be surfaced, operation should rollback or retry.

**Actual**:
- ❌ **No error handling**: Frontend waits 500ms and assumes task exists
- ❌ **Silent failure**: If trigger fails, frontend continues without next task
- ❌ **No rollback**: Lead stage is updated even if task creation fails
- ⚠️ **Partial success**: Lead progresses but no task created

**Verdict**: **BROKEN** - No error handling for trigger failures.

---

## 5. Identified Gaps & Bugs

### Critical Bugs

1. **Missing Database Trigger**
   - **Location**: Code references trigger, but trigger SQL not found
   - **Impact**: Next tasks may not be created automatically
   - **Severity**: CRITICAL
   - **Fix**: Create trigger or remove trigger dependency

2. **`first_call_done` Never Updated**
   - **Location**: Task completion handler
   - **Impact**: KPI calculations will be incorrect
   - **Severity**: HIGH
   - **Fix**: Update `first_call_done` when first call task is completed

3. **`last_attempted_at` Never Updated**
   - **Location**: Task completion handler
   - **Impact**: Dashboard metrics will be incorrect
   - **Severity**: HIGH
   - **Fix**: Update `last_attempted_at` on every task completion

4. **No Task Reassignment on Lead Reassignment**
   - **Location**: Lead update handler
   - **Impact**: Tasks assigned to wrong sales person
   - **Severity**: HIGH
   - **Fix**: Update pending tasks' `sales_person_id` when lead `assigned_to` changes

5. **No Task Cancellation on Lead Disqualification**
   - **Location**: Lead update handler
   - **Impact**: Disqualified leads show active tasks
   - **Severity**: MEDIUM
   - **Fix**: Cancel all pending tasks when lead is disqualified

### Design Issues

6. **Inconsistent Stage Mapping**
   - **Issue**: `NEXT_STAGE_MAP` shows "Demo" → "Proposal", but code also handles "Second Demo"
   - **Impact**: Confusion about actual stage flow
   - **Severity**: MEDIUM
   - **Fix**: Clarify if "Second Demo" is a separate stage or handled within "Demo"

7. **API Fallback Creates Wrong Tasks**
   - **Location**: `/api/leads` route line 334-398
   - **Issue**: Creates tasks with wrong titles and wrong sales person assignment
   - **Impact**: Incorrect tasks created
   - **Severity**: HIGH
   - **Fix**: Remove API fallback or fix task creation logic

8. **No Idempotency for Task Creation**
   - **Location**: API routes and trigger (if exists)
   - **Issue**: Duplicate tasks can be created
   - **Impact**: Data inconsistency
   - **Severity**: HIGH
   - **Fix**: Add unique constraint or pre-insertion check

9. **Hardcoded 500ms Delay**
   - **Location**: Task completion handler
   - **Issue**: Assumes trigger completes in 500ms
   - **Impact**: Race conditions, missed tasks
   - **Severity**: MEDIUM
   - **Fix**: Poll with retry logic or use webhook/event system

10. **No Transaction Wrapping**
    - **Location**: Task completion handler
    - **Issue**: Partial failures possible (task completed but lead not updated)
    - **Impact**: Data inconsistency
    - **Severity**: HIGH
    - **Fix**: Wrap in database transaction or implement compensation logic

### Missing Validations

11. **No Stage Validation on Task Completion**
    - **Issue**: Task can be completed even if lead is in different stage
    - **Impact**: Incorrect stage progression
    - **Severity**: MEDIUM
    - **Fix**: Validate task stage matches lead stage before completion

12. **No Duplicate Task Prevention**
    - **Issue**: Multiple pending tasks can exist for same stage
    - **Impact**: Confusion, duplicate work
    - **Severity**: MEDIUM
    - **Fix**: Add unique constraint on `(lead_id, stage, status='Pending')`

---

## 6. Verification Queries

### Query 1: Leads Stuck in Stage with No Pending Task

```sql
SELECT 
  l.id as lead_id,
  l.lead_name,
  l.current_stage,
  l.status,
  l.assigned_to,
  COUNT(t.id) as pending_task_count
FROM leads_table l
LEFT JOIN tasks_table t 
  ON t.lead_id = l.id 
  AND t.status = 'Pending'
  AND (t.stage = l.current_stage OR t.lead_stage = l.current_stage)
WHERE l.current_stage IS NOT NULL
  AND l.current_stage != 'Won'
  AND l.current_stage != 'Lost'
GROUP BY l.id, l.lead_name, l.current_stage, l.status, l.assigned_to
HAVING COUNT(t.id) = 0
ORDER BY l.current_stage, l.created_at DESC;
```

**Expected Result**: Should return 0 rows (every lead in a stage should have a pending task).

**If Rows Returned**: Indicates missing task creation.

### Query 2: Leads with Multiple Pending Tasks in Same Stage

```sql
SELECT 
  l.id as lead_id,
  l.lead_name,
  l.current_stage,
  COUNT(t.id) as duplicate_task_count,
  STRING_AGG(t.id::text, ', ') as task_ids
FROM leads_table l
INNER JOIN tasks_table t 
  ON t.lead_id = l.id 
  AND t.status = 'Pending'
  AND (t.stage = l.current_stage OR t.lead_stage = l.current_stage)
WHERE l.current_stage IS NOT NULL
GROUP BY l.id, l.lead_name, l.current_stage
HAVING COUNT(t.id) > 1
ORDER BY duplicate_task_count DESC;
```

**Expected Result**: Should return 0 rows (only one pending task per stage).

**If Rows Returned**: Indicates duplicate task creation bug.

### Query 3: Completed Tasks Without Next Task Created

```sql
WITH completed_tasks AS (
  SELECT 
    t.id as task_id,
    t.lead_id,
    t.stage as task_stage,
    t.completed_at,
    l.current_stage as lead_current_stage,
    CASE 
      WHEN t.stage = 'New' THEN 'Contacted'
      WHEN t.stage = 'Contacted' THEN 'Demo'
      WHEN t.stage = 'Demo' THEN 'Proposal'
      WHEN t.stage = 'Proposal' THEN 'Follow-Up'
      WHEN t.stage = 'Follow-Up' THEN 'Won'
      ELSE NULL
    END as expected_next_stage
  FROM tasks_table t
  INNER JOIN leads_table l ON l.id = t.lead_id
  WHERE t.status = 'Completed'
    AND t.completed_at >= NOW() - INTERVAL '7 days'
    AND t.stage != 'Won'
),
next_tasks_check AS (
  SELECT 
    ct.*,
    COUNT(nt.id) as next_task_count
  FROM completed_tasks ct
  LEFT JOIN tasks_table nt 
    ON nt.lead_id = ct.lead_id
    AND nt.status = 'Pending'
    AND (nt.stage = ct.expected_next_stage OR nt.lead_stage = ct.expected_next_stage)
    AND nt.created_at > ct.completed_at
  GROUP BY ct.task_id, ct.lead_id, ct.task_stage, ct.completed_at, 
           ct.lead_current_stage, ct.expected_next_stage
)
SELECT 
  task_id,
  lead_id,
  task_stage,
  expected_next_stage,
  lead_current_stage,
  next_task_count,
  completed_at
FROM next_tasks_check
WHERE expected_next_stage IS NOT NULL
  AND next_task_count = 0
  AND lead_current_stage != expected_next_stage
ORDER BY completed_at DESC;
```

**Expected Result**: Should return 0 rows (every completed task should have next task created).

**If Rows Returned**: Indicates next task creation is failing.

### Query 4: Leads with `first_call_done = false` but Completed Call Tasks

```sql
SELECT 
  l.id as lead_id,
  l.lead_name,
  l.first_call_done,
  COUNT(t.id) as completed_call_tasks
FROM leads_table l
INNER JOIN tasks_table t 
  ON t.lead_id = l.id
  AND t.status = 'Completed'
  AND (t.type = 'Call' OR t.type ILIKE '%call%')
  AND (t.stage = 'New' OR t.lead_stage = 'New')
WHERE l.first_call_done IS NULL 
   OR l.first_call_done = false
   OR (l.first_call_done::text NOT ILIKE '%done%' AND l.first_call_done::text NOT ILIKE '%true%')
GROUP BY l.id, l.lead_name, l.first_call_done
HAVING COUNT(t.id) > 0
ORDER BY completed_call_tasks DESC;
```

**Expected Result**: Should return 0 rows (if call task completed, `first_call_done` should be true).

**If Rows Returned**: Indicates `first_call_done` update bug.

### Query 5: Tasks Assigned to Wrong Sales Person

```sql
SELECT 
  t.id as task_id,
  t.lead_id,
  t.sales_person_id as task_assigned_to,
  l.assigned_to as lead_assigned_to,
  t.status,
  t.stage,
  l.lead_name
FROM tasks_table t
INNER JOIN leads_table l ON l.id = t.lead_id
WHERE t.status = 'Pending'
  AND t.sales_person_id IS DISTINCT FROM l.assigned_to
  AND t.sales_person_id IS NOT NULL
  AND l.assigned_to IS NOT NULL
ORDER BY t.created_at DESC;
```

**Expected Result**: Should return 0 rows (pending tasks should match lead assignment).

**If Rows Returned**: Indicates reassignment bug.

### Query 6: Disqualified Leads with Pending Tasks

```sql
SELECT 
  l.id as lead_id,
  l.lead_name,
  l.status,
  l.lead_qualification,
  COUNT(t.id) as pending_task_count
FROM leads_table l
INNER JOIN tasks_table t 
  ON t.lead_id = l.id 
  AND t.status = 'Pending'
WHERE (l.lead_qualification ILIKE '%not qualified%' 
    OR l.lead_qualification ILIKE '%disqualified%'
    OR l.status = 'Lost'
    OR l.status = 'Disqualified')
GROUP BY l.id, l.lead_name, l.status, l.lead_qualification
HAVING COUNT(t.id) > 0
ORDER BY pending_task_count DESC;
```

**Expected Result**: Should return 0 rows (disqualified leads should have no pending tasks).

**If Rows Returned**: Indicates disqualification handling bug.

---

## 7. Final Verdict

### Overall Assessment: **RISKY** ⚠️

The current implementation has **critical gaps** that make it unsafe for production use without fixes.

### Risk Level by Stage

| Stage | Risk Level | Issues |
|-------|------------|--------|
| **New → Contacted** | 🔴 **CRITICAL** | Missing trigger, `first_call_done` not updated |
| **Contacted → Demo** | 🟠 **HIGH** | API fallback creates wrong tasks, no idempotency |
| **Demo → Proposal** | 🟠 **HIGH** | API fallback creates wrong tasks, "Second Demo" confusion |
| **Proposal → Follow-Up** | 🟠 **HIGH** | API fallback creates wrong tasks |
| **Follow-Up → Won** | 🟢 **LOW** | No next task needed, flow ends |

### Most Likely Broken Stages

1. **New → Contacted**: 
   - Trigger may not exist
   - `first_call_done` never updated
   - `last_attempted_at` never updated

2. **Contacted → Demo**:
   - API fallback creates task with wrong title ("Follow-up to {name}" instead of "Schedule Demo – {name}")
   - Task assigned to wrong sales person (`crmUser.id` instead of `lead.assigned_to`)

3. **Demo → Proposal**:
   - Same issues as Contacted → Demo
   - Additional confusion with "Second Demo" stage

### Priority Order of Fixes

#### **P0 - Critical (Fix Immediately)**

1. **Verify/Create Database Trigger**
   - Check if trigger exists in database
   - If missing, create trigger that creates tasks on `current_stage` change
   - Ensure trigger is idempotent

2. **Update `first_call_done` on Task Completion**
   - Add logic to set `first_call_done = true` when first call task is completed
   - Location: Task completion handler

3. **Update `last_attempted_at` on Task Completion**
   - Add logic to set `last_attempted_at = task.completed_at` on every task completion
   - Location: Task completion handler

4. **Fix API Fallback Task Creation**
   - Remove or fix task creation in `/api/leads` route
   - Use correct task titles from `taskTitleGenerator`
   - Use `lead.assigned_to` instead of `crmUser.id`

#### **P1 - High (Fix Soon)**

5. **Add Idempotency to Task Creation**
   - Add unique constraint: `(lead_id, stage, status='Pending')`
   - Add pre-insertion check in API routes
   - Add pre-insertion check in trigger (if exists)

6. **Handle Sales Person Reassignment**
   - Update pending tasks' `sales_person_id` when lead `assigned_to` changes
   - Location: Lead update handler

7. **Replace Hardcoded 500ms Delay**
   - Implement polling with retry logic
   - Or use webhook/event system for task creation confirmation
   - Or remove delay and query immediately with retry

8. **Add Transaction Wrapping**
   - Wrap task completion + lead update in transaction
   - Or implement compensation logic for partial failures

#### **P2 - Medium (Fix When Possible)**

9. **Handle Lead Disqualification**
   - Cancel all pending tasks when lead is disqualified
   - Location: Lead update handler

10. **Add Stage Validation**
    - Validate task stage matches lead stage before completion
    - Location: Task completion handler

11. **Clarify "Second Demo" Stage**
    - Determine if "Second Demo" is separate stage or handled within "Demo"
    - Update `NEXT_STAGE_MAP` accordingly

12. **Add Automatic Missed Task Detection**
    - Implement cron job or scheduled function to mark overdue tasks as "Missed"
    - Add reschedule functionality for missed tasks

### Recommended Action Plan

1. **Immediate**: Run verification queries to identify current data issues
2. **Week 1**: Fix P0 issues (trigger, field updates, API fallback)
3. **Week 2**: Fix P1 issues (idempotency, reassignment, delay)
4. **Week 3**: Fix P2 issues (disqualification, validation, clarification)
5. **Ongoing**: Monitor verification queries weekly to catch regressions

### Testing Checklist

Before deploying fixes, verify:

- [ ] Database trigger exists and creates tasks correctly
- [ ] `first_call_done` updates when first call task completed
- [ ] `last_attempted_at` updates on every task completion
- [ ] Next task created with correct title, type, and assignment
- [ ] No duplicate tasks created on retry
- [ ] Tasks reassigned when lead reassigned
- [ ] Tasks cancelled when lead disqualified
- [ ] All verification queries return 0 rows

---

## Conclusion

The task + stage workflow has **fundamental gaps** that prevent reliable operation:

1. **Missing trigger implementation** (or trigger doesn't exist)
2. **Critical fields never updated** (`first_call_done`, `last_attempted_at`)
3. **No idempotency protection** (duplicate tasks possible)
4. **API fallback creates incorrect tasks** (wrong titles, wrong assignment)
5. **No error handling** for trigger failures

**Recommendation**: Do not rely on this workflow in production until P0 and P1 issues are fixed. Current implementation will cause data inconsistencies and incorrect metrics.
