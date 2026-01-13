# Task Table System Documentation

## 1. Purpose of the Task Table

The `tasks_table` serves as the operational layer between leads and sales persons in the Sales CRM. It represents the bridge between potential opportunities (leads) and actual work execution (tasks).

### Core Function

- **Leads are containers**: Leads represent potential customers sourced from Meta Ads or manual entry. They contain contact information, qualification status, and pipeline stage.

- **Tasks are actions**: Tasks represent concrete, actionable work items that sales persons must execute. Each task has a specific type (call, follow-up, meeting), a due date, and a status.

- **One-to-many relationship**: A single lead can have multiple tasks across its lifecycle. For example:
  - Initial Contact Call (New stage)
  - Follow-up Call (Contacted stage)
  - Demo Meeting (Qualified stage)
  - Second Demo (Demo stage)
  - Proposal Discussion (Proposal stage)

### Why Tasks Drive Dashboards

Dashboards and performance metrics depend on tasks, not leads directly, because:

1. **Tasks represent actual work**: A lead may exist, but until a task is created and completed, no sales activity has occurred.

2. **Tasks track effort**: Metrics like "calls attempted", "meetings scheduled", and "follow-ups completed" are derived from task completion, not lead status alone.

3. **Tasks enable accountability**: Each task is assigned to a specific sales person (`sales_person_id`), enabling per-person performance tracking.

4. **Tasks provide audit trail**: The `task_activities` table records all task-related actions, creating a complete history of sales interactions.

### Operational Model

```
Lead Created → Sales Person Assigned → First Task Created (Pending) → Task Completed → Next Task Created → Lead Progresses
```

The task table is the source of truth for:
- What work needs to be done
- Who is responsible for that work
- When work is due
- What work has been completed

---

## 2. Task Table Structure (Conceptual)

The `tasks_table` contains the following logical fields:

### Primary Identifiers

- **`task_id`** (or `id`): Unique identifier for each task. Auto-generated primary key.

- **`lead_id`**: Foreign key reference to `leads_table.id`. Links the task to its originating lead. Required field.

- **`sales_person_id`**: Foreign key reference to `sales_persons.id`. Identifies which sales person is responsible for completing this task. Required for task assignment and filtering.

### Task Classification

- **`task_type`** (or `type`): Categorizes the nature of the task. Common values:
  - `"Call"`: Phone call to the lead
  - `"Follow-Up"`: Subsequent contact after initial call
  - `"Meeting"`: Scheduled meeting or demo
  - `"Email"`: Email communication
  - `"WhatsApp"`: WhatsApp message

- **`stage`**: The pipeline stage this task belongs to. Must match the lead's `current_stage` at creation time. Examples:
  - `"New"`: Initial contact stage
  - `"Contacted"`: Lead has been contacted
  - `"Qualified"`: Lead meets qualification criteria
  - `"Demo"`: Demo scheduled or completed
  - `"Proposal"`: Proposal stage
  - `"Won"`: Deal closed

- **`title`**: Human-readable task description. Often auto-generated based on stage and lead name (e.g., "Initial Contact Call - John Doe").

### Task Status and Timing

- **`status`**: Current state of the task. Values:
  - `"Pending"`: Task is not yet completed (default state)
  - `"Completed"`: Task has been finished by the sales person
  - `"Missed"`: Task was not completed by the due date (system or manual)
  - `"Cancelled"`: Task was cancelled (e.g., lead disqualified)

- **`priority`**: Urgency level. Values: `"Hot"`, `"Warm"`, `"Medium"`, `"Cold"`. Affects task ordering and visibility.

- **`due_date`**: Target completion date/time. Used for:
  - Task prioritization
  - Overdue detection
  - Scheduling
  - Next task due date assignment

- **`completed_at`**: Timestamp when task status changed to `"Completed"`. Automatically set by the system when status transitions to completed. Used for performance metrics and audit trails.

- **`created_at`**: Timestamp when the task record was created. Used for chronological ordering and duplicate detection.

### Additional Fields

- **`comments`**: Optional notes or instructions for the sales person. Note: Detailed activity comments are stored in `task_activities` table, not in `tasks_table.comments`.

- **`lead_stage`**: Denormalized field that may store the lead's stage at task creation time. Used for filtering and historical reference.

---

## 3. Task Creation Flow

Task creation follows a deterministic, idempotent flow to prevent duplicates and ensure data consistency.

### Automatic Task Creation (Primary Flow)

When a new lead is assigned to a sales person:

1. **Lead Creation**: Lead is created in `leads_table` with:
   - Contact information (name, phone, email)
   - Source (Meta Ads or manual)
   - Initial status: `"New"` or `null`
   - `assigned_to`: Sales person ID (set via round-robin in n8n)

2. **Sales Person Assignment**: The `assigned_to` field is populated via:
   - **Meta Ads leads**: Round-robin assignment via n8n workflow
   - **Manual leads**: Admin explicitly selects sales person

3. **First Task Creation**: System automatically creates the first task:
   - **Type**: `"Call"` (Initial Contact Call)
   - **Stage**: `"New"` (matches lead's initial stage)
   - **Status**: `"Pending"`
   - **Sales Person**: Inherits from lead's `assigned_to`
   - **Title**: Auto-generated (e.g., "Initial Contact Call - [Lead Name]")
   - **Due Date**: Calculated from creation time (typically 1 day from creation)

4. **Task Activity Record**: A corresponding record is created in `task_activities` table:
   - Records the task creation event
   - Stores `assigned_to` (sales person ID)
   - Sets `source` to `"system"` or `"user"` depending on creation method

### Manual Task Creation

Sales persons or admins can manually create tasks via the UI:

1. **User Action**: User selects a lead and clicks "Add Task"
2. **Validation**: System validates:
   - Lead exists and is accessible
   - Stage is valid (not null/undefined)
   - Sales person assignment is valid
3. **Task Creation**: Task is inserted with:
   - User-provided type, title, priority, due_date
   - Stage derived from lead's `current_stage`
   - Sales person from lead's `assigned_to` (or explicitly set by admin)
4. **Activity Log**: Task activity record created with `source: "user"`

### Idempotency and Duplicate Prevention

Task creation must be idempotent to handle:

- **Replayed events**: If a webhook or workflow is retried, duplicate tasks must not be created
- **Concurrent execution**: Multiple processes attempting to create the same task simultaneously

**Implementation Strategy**:

1. **Unique constraints**: Database-level unique constraint on `(lead_id, stage, type, status='Pending')` prevents duplicate pending tasks for the same stage.

2. **Pre-insertion check**: Before creating a task, system checks:
   ```sql
   SELECT id FROM tasks_table 
   WHERE lead_id = ? 
     AND stage = ? 
     AND type = ? 
     AND status = 'Pending'
   ```
   If a matching pending task exists, creation is skipped.

3. **Workflow-level deduplication**: n8n workflows use idempotency keys or check task existence before triggering creation.

4. **Stage-based uniqueness**: Only one pending task per `(lead_id, stage)` combination is allowed. When a task is completed and lead moves to next stage, a new task for that stage can be created.

### Task Creation Triggers

Tasks are created via multiple mechanisms:

1. **Database Triggers**: PostgreSQL triggers on `leads_table` automatically create tasks when:
   - Lead status changes to `"New"`
   - Lead `assigned_to` is set for the first time
   - Lead `current_stage` transitions to a new stage

2. **API Endpoints**: `POST /api/tasks` allows manual task creation with validation.

3. **Workflow Orchestration**: n8n workflows create tasks as part of lead assignment flow.

4. **Calendar Integration**: Cal.com webhook creates meeting tasks when appointments are booked.

**Critical Rule**: Frontend should NEVER create tasks directly. All task creation must go through backend APIs or database triggers to ensure consistency and prevent duplicates.

---

## 4. Task Status Lifecycle

Task status transitions follow a strict state machine with explicit transitions.

### Status: Pending

**When set**: 
- Automatically when task is created
- Manually when a completed task is reopened

**Who sets it**: 
- System (on creation)
- Sales person (via UI to reopen a task)

**Business meaning**: 
- Work item is active and awaiting completion
- Task appears in sales person's task list
- Task is included in "pending tasks" metrics
- Task can be completed, missed, or cancelled

**Transition rules**:
- `Pending` → `Completed`: Sales person marks task as done
- `Pending` → `Missed`: System detects overdue task, or sales person marks as missed
- `Pending` → `Cancelled`: Lead is disqualified or task is no longer relevant

### Status: Completed

**When set**: 
- When sales person completes the task via UI
- When task completion modal is submitted with required comment

**Who sets it**: 
- Sales person (via UI action)
- System (sets `completed_at` timestamp automatically)

**Business meaning**: 
- Work item has been finished
- Task is removed from active task list
- Task completion triggers:
  - Lead stage progression (if applicable)
  - Next task creation (via trigger or workflow)
  - KPI metric updates (calls, meetings counters)
  - Activity log entry in `task_activities`

**Transition rules**:
- `Completed` → `Pending`: Rare, only if task was marked complete by mistake
- `Completed` is terminal for most workflows (task cannot transition to `Missed` or `Cancelled` after completion)

**Completion Requirements**:
- Sales person must provide a comment (stored in `task_activities.comments`)
- Sales person may specify `connect_through` (Call, Email, Meeting, WhatsApp)
- Sales person may provide `outcome` (Success, Reschedule, No response)
- If lead has a next stage, sales person can set `next_stage_notes` and `due_date` for the next task

### Status: Missed

**When set**: 
- System detects task is overdue (past `due_date` and still `Pending`)
- Sales person manually marks task as missed

**Who sets it**: 
- System (automated overdue detection)
- Sales person (via UI)

**Business meaning**: 
- Task was not completed by the due date
- Task may be rescheduled or marked as missed
- Missed tasks may affect performance metrics
- Lead may remain in current stage if critical task is missed

**Transition rules**:
- `Missed` → `Pending`: Task is rescheduled with new due date
- `Missed` → `Cancelled`: Task is no longer relevant

### Status: Cancelled

**When set**: 
- When lead is disqualified
- When task is no longer relevant (e.g., lead already contacted via different channel)
- When sales person reassignment makes task invalid

**Who sets it**: 
- System (when lead is disqualified)
- Admin or sales person (via UI)

**Business meaning**: 
- Task will not be completed
- Task is excluded from active metrics
- Task remains in history for audit purposes

**Transition rules**:
- `Cancelled` is typically terminal (no transitions back to active states)

### Status Transition Audit

All status transitions are logged in `task_activities` table:
- `activity`: Description of the transition (e.g., "Task completed", "Task marked as missed")
- `type`: Activity type (e.g., "manual", "system")
- `source`: Origin of the change (e.g., "ui", "system", "workflow")
- `created_at`: Timestamp of the transition

---

## 5. Relationship Between Tasks and Lead Status

The relationship between tasks and leads is unidirectional: **Tasks drive lead progress, not the reverse**.

### Lead Fields Derived from Tasks

Lead-level fields in `leads_table` are derived or updated based on task completion:

#### `first_call_done`

**Source**: Task completion
- Set to `true` (or `"Done"`) when the first task of type `"Call"` with stage `"New"` is completed
- Updated via task completion handler in frontend/backend
- Used in KPI calculations for "calls attempted" metrics

**Update mechanism**:
```javascript
// When task is completed:
if (task.stage === "New" && task.type === "Call" && isFirstTask) {
  await updateLead({ first_call_done: true });
}
```

#### `total_call_attempted`

**Source**: Aggregate count of completed call tasks
- Calculated as: `COUNT(*) FROM tasks_table WHERE lead_id = ? AND type = 'Call' AND status = 'Completed'`
- May be cached in `leads_table` or calculated on-demand
- Used for lead scoring and qualification

#### `total_call_connected`

**Source**: Task completion with `outcome = "Success"`
- Counts only call tasks where sales person successfully connected with lead
- Derived from `task_activities` where `outcome = "Success"` and `type = "Call"`
- More accurate than `total_call_attempted` for qualification metrics

#### `last_attempted_at`

**Source**: Task `completed_at` timestamp
- Updated whenever a task is completed
- Set to the most recent `completed_at` from any completed task for the lead
- Used for:
  - Lead freshness metrics
  - "Days since last contact" calculations
  - Dashboard sorting and filtering

**Update mechanism**:
```javascript
// On task completion:
await updateLead({ 
  last_attempted_at: task.completed_at 
});
```

#### `current_stage`

**Source**: Task completion triggers stage progression
- Updated when a task is completed and lead moves to the next pipeline stage
- Stage progression logic:
  - `"New"` → `"Contacted"` (after first call task completed)
  - `"Contacted"` → `"Qualified"` (after qualification task completed)
  - `"Qualified"` → `"Demo"` (after demo scheduling task completed)
  - `"Demo"` → `"Second Demo"` or `"Proposal"` (based on demo outcome)
  - `"Proposal"` → `"Won"` (after proposal acceptance)

**Update mechanism**:
```javascript
// On task completion:
const nextStage = getNextStage(currentStage);
if (nextStage) {
  await updateLead({ 
    current_stage: nextStage,
    status: nextStage  // Also update status for consistency
  });
}
```

### Why Tasks Drive Leads

**Principle**: Leads are passive containers; tasks are active work items.

1. **Tasks represent actual work**: A lead may exist, but until a task is completed, no progress has been made.

2. **Tasks enable granular tracking**: Multiple tasks per lead allow tracking of:
   - Number of contact attempts
   - Types of interactions (call, email, meeting)
   - Time between interactions
   - Sales person effort per lead

3. **Tasks provide audit trail**: `task_activities` records every action, creating a complete history that lead-level fields cannot capture.

4. **Tasks enable reassignment**: If a sales person is reassigned, their tasks can be transferred, but lead ownership may remain unchanged until tasks are completed.

### Lead Status as Cache

Lead-level fields like `first_call_done`, `last_attempted_at`, and `current_stage` are effectively cached summaries of task activity. They are:

- **Derived**: Calculated from task completion events
- **Denormalized**: Stored in `leads_table` for performance (avoiding joins on every query)
- **Eventually consistent**: Updated asynchronously when tasks are completed

**Best Practice**: When building dashboards or reports, prefer querying `tasks_table` directly for accuracy, and use lead-level fields only for filtering or quick summaries.

---

## 6. KPI & Dashboard Impact

Dashboards and performance metrics are calculated from task data, not lead data directly. This ensures accuracy and enables granular analysis.

### Metrics Calculated from Tasks

#### Calls Attempted per Sales Person

**Source**: `tasks_table`
**Calculation**:
```sql
SELECT sales_person_id, COUNT(*) as calls_attempted
FROM tasks_table
WHERE type IN ('Call', 'Follow-Up')
  AND status = 'Completed'
  AND sales_person_id = ?
  AND completed_at BETWEEN ? AND ?
GROUP BY sales_person_id
```

**Alternative (from leads_table)**: Some dashboards use `leads_table.first_call_done = true`, but this is less accurate as it only counts the first call, not subsequent follow-up calls.

**Best Practice**: Always query `tasks_table` for accurate call counts.

#### Calls Completed

**Source**: `tasks_table`
**Calculation**: Count of tasks where:
- `type = 'Call'` or `type = 'Follow-Up'`
- `status = 'Completed'`
- `completed_at` is within the reporting period

**Distinction from "Attempted"**: 
- "Attempted" includes all completed calls
- "Completed" may filter by `outcome = 'Success'` from `task_activities` to count only successful connections

#### Pending Tasks

**Source**: `tasks_table`
**Calculation**:
```sql
SELECT COUNT(*) as pending_tasks
FROM tasks_table
WHERE status = 'Pending'
  AND sales_person_id = ?
  AND (due_date IS NULL OR due_date >= NOW())
```

**Usage**:
- Workload metrics per sales person
- Task queue management
- Performance pressure indicators

#### Conversion Probability

**Source**: `tasks_table` + `leads_table`
**Calculation**: Based on:
- Number of completed tasks per lead (more tasks = higher engagement)
- Task types completed (meetings > calls > emails)
- Time to conversion (faster task completion = higher probability)
- Lead stage progression (leads in "Proposal" stage have higher conversion probability)

**Formula** (simplified):
```
conversion_probability = (
  (completed_tasks_count / total_tasks_count) * 0.3 +
  (has_meeting_task ? 0.4 : 0) +
  (stage_weight[current_stage] * 0.3)
) * 100
```

#### Performance Charts (Daily / Weekly)

**Source**: `tasks_table` with time-based aggregation

**Daily Metrics**:
```sql
SELECT 
  DATE(completed_at) as date,
  COUNT(*) as tasks_completed,
  COUNT(DISTINCT CASE WHEN type = 'Call' THEN id END) as calls,
  COUNT(DISTINCT CASE WHEN type = 'Meeting' THEN id END) as meetings
FROM tasks_table
WHERE status = 'Completed'
  AND sales_person_id = ?
  AND completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(completed_at)
ORDER BY date ASC
```

**Weekly Metrics**: Aggregate daily metrics by week.

**Usage**:
- Trend analysis
- Performance tracking over time
- Identifying patterns (e.g., more calls on Mondays)

### Dashboard Data Flow

```
tasks_table (source of truth)
    ↓
API Endpoint (/api/dashboard/salesperson-performance)
    ↓
Aggregation Logic (JavaScript in API route)
    ↓
Formatted Response (calls, meetings, conversions per sales person)
    ↓
Frontend Chart Component (ApexCharts, Recharts, etc.)
    ↓
Dashboard Visualization
```

### Why Tasks, Not Leads

**Accuracy**: 
- Tasks represent actual work done
- Leads may exist but have no activity (no tasks completed)
- Task completion timestamps provide precise activity timing

**Granularity**:
- Tasks enable per-interaction tracking
- Leads only provide stage-level tracking
- Tasks capture effort (multiple calls, follow-ups, meetings)

**Accountability**:
- Each task is assigned to a specific sales person
- Task completion directly attributes work to individuals
- Lead assignment may change, but task assignment remains historical

**Audit Trail**:
- `task_activities` provides complete history
- Lead-level fields are summaries that may miss details

### Current Implementation Note

**Important**: Some dashboard endpoints currently query `leads_table` directly (e.g., `first_call_done`, `meeting_status`). This is acceptable for performance but should be considered a cached/denormalized view. For new features or critical metrics, always prefer querying `tasks_table` directly.

---

## 7. Failure & Edge Case Handling

The task system must handle various failure scenarios and edge cases to ensure data consistency and prevent duplicate work.

### Replayed Events

**Scenario**: Webhook or workflow is retried, causing the same event to be processed multiple times.

**Handling**:
1. **Idempotency keys**: Webhook handlers check for existing task before creation:
   ```javascript
   const existingTask = await findTask({ lead_id, stage, type, status: 'Pending' });
   if (existingTask) {
     return; // Skip creation, task already exists
   }
   ```

2. **Database constraints**: Unique constraint on `(lead_id, stage, type, status='Pending')` prevents duplicate inserts.

3. **Workflow-level deduplication**: n8n workflows use idempotency keys or check task existence before triggering.

**Result**: Duplicate tasks are not created, system remains consistent.

### Meta Retries

**Scenario**: Meta Ads webhook is retried due to network issues or Meta's retry logic.

**Handling**:
1. **Lead-level deduplication**: Check if lead already exists by `phone` or `email` before creating new lead.
2. **Task-level deduplication**: If lead exists, check if first task already exists before creating.
3. **Idempotent operations**: All webhook handlers are idempotent (safe to retry).

**Result**: Retries do not create duplicate leads or tasks.

### Duplicate Workflow Execution

**Scenario**: n8n workflow is triggered multiple times (manual trigger, scheduled trigger, webhook trigger all fire).

**Handling**:
1. **Pre-insertion check**: Workflow checks for existing task before creating:
   ```javascript
   const existing = await supabase
     .from('tasks_table')
     .select('id')
     .eq('lead_id', leadId)
     .eq('stage', 'New')
     .eq('type', 'Call')
     .eq('status', 'Pending')
     .single();
   
   if (existing.data) {
     return; // Task already exists, skip creation
   }
   ```

2. **Database transaction**: Task creation wrapped in transaction to prevent race conditions.

3. **Workflow locking**: n8n workflows use locking mechanisms to prevent concurrent execution.

**Result**: Only one task is created per workflow execution, even if workflow runs multiple times.

### Sales Person Reassignment

**Scenario**: Lead is reassigned from Sales Person A to Sales Person B.

**Handling**:
1. **Pending tasks**: All pending tasks for the lead are updated:
   ```javascript
   await updateTasks({
     lead_id: leadId,
     status: 'Pending'
   }, {
     sales_person_id: newSalesPersonId
   });
   ```

2. **Completed tasks**: Completed tasks retain original `sales_person_id` for historical accuracy and performance attribution.

3. **New task creation**: New tasks created after reassignment use the new `sales_person_id` from lead's `assigned_to`.

4. **Activity log**: Reassignment is logged in `task_activities` with `activity: "Lead reassigned"`.

**Result**: 
- Pending work transfers to new sales person
- Historical performance remains attributed to original sales person
- New tasks are assigned to new sales person

### Task Reassignment

**Scenario**: Individual task is reassigned from Sales Person A to Sales Person B (without reassigning the entire lead).

**Handling**:
1. **Update task**: Task's `sales_person_id` is updated directly.
2. **Activity log**: Reassignment logged in `task_activities`.
3. **Notification**: New sales person may receive notification (if notification system exists).

**Result**: Task ownership changes, but lead ownership may remain unchanged.

### Lead Disqualification

**Scenario**: Lead is marked as disqualified (not qualified, wrong contact, etc.).

**Handling**:
1. **Cancel pending tasks**: All pending tasks for the lead are set to `status = 'Cancelled'`:
   ```javascript
   await updateTasks({
     lead_id: leadId,
     status: 'Pending'
   }, {
     status: 'Cancelled'
   });
   ```

2. **Preserve completed tasks**: Completed tasks remain in `'Completed'` status for historical record.

3. **Activity log**: Disqualification logged with reason in `task_activities`.

**Result**: 
- No active work remains for disqualified lead
- Historical work is preserved for audit
- Lead can be reactivated later (tasks can be recreated)

### Concurrent Task Completion

**Scenario**: Multiple users attempt to complete the same task simultaneously.

**Handling**:
1. **Optimistic locking**: Task update checks current status before updating:
   ```javascript
   const task = await getTask(taskId);
   if (task.status === 'Completed') {
     return error('Task already completed');
   }
   await updateTask(taskId, { status: 'Completed' });
   ```

2. **Database constraints**: Database-level checks prevent invalid state transitions.

3. **Transaction isolation**: Task completion wrapped in transaction to ensure atomicity.

**Result**: Only one completion is recorded, preventing duplicate stage progression.

### Missing Sales Person Assignment

**Scenario**: Task is created but `sales_person_id` is null or invalid.

**Handling**:
1. **Validation on creation**: Task creation API validates `sales_person_id` exists in `sales_persons` table.
2. **Fallback to lead assignment**: If task `sales_person_id` is null, system uses lead's `assigned_to`.
3. **Default assignment**: If lead also has no `assigned_to`, task creation fails with error (manual assignment required).

**Result**: All tasks have valid `sales_person_id`, ensuring proper filtering and assignment.

### Stage Mismatch

**Scenario**: Task is created with `stage` that doesn't match lead's `current_stage`.

**Handling**:
1. **Validation on creation**: Task creation validates stage matches lead's current stage (or allows explicit override for admins).
2. **Automatic correction**: If mismatch detected, system may update task's `stage` to match lead's `current_stage`.
3. **Warning logs**: Mismatches are logged for investigation.

**Result**: Tasks remain synchronized with lead stages, preventing workflow inconsistencies.

---

## 8. Design Principles

The task system follows these core principles to ensure maintainability, scalability, and data integrity.

### Tasks are the Source of Truth for Work

**Principle**: All sales activity is represented as tasks. If work was done, a task was completed. If no task exists, no work occurred.

**Implications**:
- Dashboards query `tasks_table` for metrics, not `leads_table` directly
- Lead-level fields (`first_call_done`, `last_attempted_at`) are derived from tasks
- Task completion drives all business logic (stage progression, KPI updates)

**Anti-pattern to avoid**: Updating lead status without completing a task. This breaks the audit trail and makes metrics inaccurate.

### Leads are Containers, Not Activities

**Principle**: Leads represent potential customers and their information. Tasks represent work done on those leads.

**Implications**:
- Leads can exist without tasks (newly created, not yet assigned)
- Leads can have multiple tasks (multiple interactions over time)
- Lead status is a summary of task completion, not the driver of tasks

**Anti-pattern to avoid**: Creating tasks based solely on lead status without considering task completion history.

### No Business Logic in SQL Triggers

**Principle**: Database triggers handle data consistency (e.g., setting `completed_at` on status change), but complex business logic lives in application code.

**Implications**:
- Triggers may create tasks when leads are assigned
- Triggers may set timestamps on status changes
- Triggers do NOT:
  - Determine next stage based on task outcome
  - Calculate KPI metrics
  - Send notifications
  - Update multiple related tables with complex logic

**Rationale**: Application code is easier to test, debug, and modify than database triggers. Business logic changes should not require database migrations.

### Workflow Orchestration Owns Task Creation

**Principle**: Task creation is orchestrated by workflows (n8n) or API endpoints, not ad-hoc frontend code.

**Implications**:
- Frontend never directly inserts into `tasks_table`
- All task creation goes through:
  - Backend API endpoints (`POST /api/tasks`)
  - Database triggers (for automatic first task creation)
  - Workflow orchestration (n8n for round-robin assignment)
- Task creation logic is centralized and testable

**Anti-pattern to avoid**: Frontend components directly calling Supabase client to insert tasks. This bypasses validation, duplicate prevention, and activity logging.

### Status Transitions Must be Explicit and Auditable

**Principle**: Every status change is logged, traceable, and requires explicit user action or system event.

**Implications**:
- Status transitions are not automatic based on time (e.g., tasks don't auto-complete)
- Every status change creates a record in `task_activities`
- Status transitions are validated (e.g., cannot complete a task without a comment)
- Status history is queryable for audit purposes

**Anti-pattern to avoid**: Silent status changes or status updates without activity logs. This breaks audit trails and makes debugging impossible.

### Idempotency is Required

**Principle**: All task creation and update operations are idempotent (safe to retry).

**Implications**:
- Task creation checks for existing tasks before inserting
- Task updates are conditional (only update if current state allows)
- Webhook handlers can be safely retried
- Workflow failures can be safely retried

**Rationale**: In distributed systems, retries are inevitable. Idempotency prevents duplicate data and inconsistent states.

### Performance Metrics are Derived, Not Stored

**Principle**: KPI metrics are calculated from `tasks_table` on-demand, not stored in summary tables (with exceptions for caching).

**Implications**:
- Dashboard APIs query `tasks_table` and aggregate in real-time
- Lead-level fields (`first_call_done`, etc.) are cached summaries, not source of truth
- Historical metrics are calculated from historical task data
- Metrics can be recalculated at any time from task data

**Exception**: Some summary tables may exist for performance (e.g., `daily_metrics`), but they are considered cached views that can be regenerated from `tasks_table`.

### Task Assignment Follows Lead Assignment

**Principle**: Tasks inherit `sales_person_id` from lead's `assigned_to` at creation time.

**Implications**:
- When lead is assigned, first task is automatically assigned to the same sales person
- When lead is reassigned, pending tasks are reassigned
- Completed tasks retain original assignment for historical accuracy
- Manual task creation uses lead's `assigned_to` as default

**Rationale**: Ensures work is assigned to the correct sales person and prevents orphaned tasks.

---

## Summary

The `tasks_table` is the operational heart of the Sales CRM. It:

- **Represents work**: Every sales activity is a task
- **Drives progress**: Task completion moves leads through the pipeline
- **Enables metrics**: All KPIs are calculated from task data
- **Provides audit trail**: Complete history of sales interactions
- **Ensures accountability**: Each task is assigned to a specific sales person

Understanding this system is critical for:
- Building accurate dashboards
- Implementing new features
- Debugging data inconsistencies
- Optimizing performance
- Maintaining data integrity

When in doubt, remember: **Tasks drive leads, not the reverse**.
