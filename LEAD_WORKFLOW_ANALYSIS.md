# Current Lead Workflow Analysis

## Overview

This document provides a detailed analysis of the current lead workflow in the CRM system, explaining how leads are created, how tasks are generated, what happens when tasks are completed, and where data is stored. This analysis is intended to help understand the system before refactoring.

---

## 1. How a New Lead is Created

### Entry Point
**File:** `app/api/leads/route.js` (POST handler, lines 103-222)

### Control Flow

1. **User Action**: User fills out form in `app/components/buttons/addLeadModal.jsx` (lines 73-123)
   - Form fields: name, phone, email, contactName, source, status, priority, assignedTo

2. **API Call**: POST request to `/api/leads` with form data

3. **Backend Processing** (`app/api/leads/route.js`):
   - Validates required fields (name, phone, email, contactName, source)
   - Determines `finalAssignedTo`:
     - **Sales role**: Always uses their own `salesPersonId` (lines 145-153)
     - **Admin role**: Must explicitly provide `assignedTo` or error (lines 155-163)
   - Inserts into `leads_table` with:
     - `is_manual: true` (line 183) - **🔥 BLOCKS AUTO ASSIGN TRIGGER**
     - `status: "New"` (or provided status)
     - `assigned_to: finalAssignedTo`
     - Contact info, source, priority, etc.

4. **Response**: Returns created lead data

### Key Points
- Manual leads set `is_manual: true` to prevent round-robin trigger from overriding assignment
- Sales users cannot assign leads to others (always self-assigned)
- Admin users must explicitly select salesperson

---

## 2. Where and How "Initial call to {client name}" Task is Created

### Mechanism: PostgreSQL Database Trigger

**Location**: Database trigger (NOT in application code - likely in Supabase)

### Evidence from Code

1. **Documentation** (`TASK_TABLE_SYSTEM_DOCUMENTATION.md`, lines 176-191):
   - States triggers automatically create tasks when:
     - Lead status changes to `"New"`
     - Lead `assigned_to` is set for the first time
     - Lead `current_stage` transitions to a new stage

2. **Code Comments**:
   - `app/api/leads/route.js` line 335: `"Note: Task creation for 'New' stage is handled by database trigger"`
   - `app/leads/[slug]/components/taskstab.jsx` line 422: `"NOTE: Task creation for next stage is handled by PostgreSQL triggers."`

3. **Task Title Generation**:
   - **File**: `lib/utils/taskTitleGenerator.js` (lines 11-67)
   - For "New" stage: Returns `"First Call – {leadName}"` (line 43)
   - Title generation happens in frontend when manually creating tasks, but initial task is created by trigger

### Task Creation Flow

1. Lead inserted with `assigned_to` set and `status = "New"`
2. Database trigger fires (AFTER INSERT or AFTER UPDATE on `leads_table`)
3. Trigger creates task in `tasks_table`:
   - `type: "Call"`
   - `stage: "New"`
   - `status: "Pending"`
   - `sales_person_id`: Inherits from lead's `assigned_to`
   - `title`: Auto-generated (likely "First Call – {leadName}")
   - `due_date`: Calculated (typically 1 day from creation)

### Tight Coupling
- Trigger depends on `assigned_to` being set
- Trigger depends on `status` or `current_stage` being "New"
- Manual leads with `is_manual: true` may bypass trigger if trigger checks this flag

---

## 3. What Happens When a Task is Marked as COMPLETED

### Files Involved
- `app/leads/[slug]/components/taskstab.jsx` (lines 344-506)
- `app/components/tables/tasksTable.jsx` (lines 642-783)
- `app/api/tasks/route.js` (PATCH handler, lines 191-292)
- `app/api/task-activities/route.js` (POST handler)
- `app/api/leads/route.js` (PATCH handler, lines 407-416)

### 3-Step Process (Strict Order)

#### STEP 1: Insert into `task_activities`
**File**: `app/api/task-activities/route.js` (POST handler)

**Data Stored**:
- `comments`: Current stage comment (REQUIRED)
- `connect_through`: Call/Email/WhatsApp/Meeting
- `activity`: "Stage completed"
- `type`: "manual"
- `source`: "ui"
- `assigned_to`: Sales person ID from lead

**Code**: `app/leads/[slug]/components/taskstab.jsx` lines 370-382

#### STEP 2: Update `tasks_table` - Mark Task as Completed
**File**: `app/api/tasks/route.js` (PATCH handler, lines 191-292)

**Updates**:
- `status: "Completed"`
- `completed_at`: Automatically set when status changes to "Completed" (line 231)

**Code**: `app/leads/[slug]/components/taskstab.jsx` lines 390-402

#### STEP 3: Update `leads_table` - Move to Next Stage
**File**: `app/api/leads/route.js` (PATCH handler, lines 407-416)

**Updates**:
- `current_stage`: Next stage (e.g., "New" → "Contacted")
- `status`: Also updated to next stage for consistency
- `next_stage_notes`: Optional comment about next stage

**Code**: `app/leads/[slug]/components/taskstab.jsx` lines 407-420

### Next Task Creation

After STEP 3, the database trigger automatically creates the next task when `current_stage` changes.

**Frontend Handling** (`app/leads/[slug]/components/taskstab.jsx` lines 428-462):
1. Frontend waits 500ms for trigger to create task
2. Fetches newly created task for the lead and next stage
3. Updates that task's `due_date` if user provided one in modal

### Stage Progression Logic

**File**: `app/leads/[slug]/components/taskstab.jsx` (lines 119-127)

```javascript
const NEXT_STAGE_MAP = {
  "New": "Contacted",
  "Contacted": "Demo",
  "Demo": "Proposal",
  "Proposal": "Follow-Up",
  "Follow-Up": "Won",
  "Won": null  // No next stage after Won
};
```

### Special Cases

#### 1. First Task Completion (Initial call from "New" stage)
**File**: `app/leads/[slug]/components/taskstab.jsx` (lines 281-291, 717-890)

- Shows **Qualification Modal** instead of normal completion modal
- Options:
  - **Responded**: Proceeds to normal completion flow
  - **Not Responded**: Task stays pending, lead remains in "New" stage
  - **Junk Lead**: Lead marked as "Junk", task completed

#### 2. Demo Scheduling Task
**File**: `app/leads/[slug]/components/taskstab.jsx` (lines 294-302, 525-704)

- Shows **Demo Outcome Modal**
- Options:
  - **YES (requires second demo)**: Lead moves to "Second Demo" stage
  - **NO (proceed to next)**: Lead moves to "Proposal" stage

### Tight Couplings

1. **Task → Status Coupling**:
   - Task completion MUST update lead status
   - Frontend must complete task before updating lead
   - Breaking 3-step order causes data inconsistencies

2. **Status → Task Coupling**:
   - Lead status change triggers next task creation (database trigger)
   - Frontend cannot create tasks directly (documented rule)
   - Frontend waits 500ms for trigger, then updates task `due_date`

---

## 4. Where Modal Data is Handled

### Task Completion Modal

**File**: `app/leads/[slug]/components/taskstab.jsx` (Task Completion Modal, lines 1215-1530)

**Modal State Structure** (lines 230-240):
```javascript
taskCompletionModal: {
  comment: "",           // Current stage notes
  nextStageComments: "",  // Next stage notes
  connectThrough: "",     // Connect through
  dueDate: "",           // Next due date
  outcome: "Success"      // Outcome
}
```

### Data Storage Mapping

#### 1. Current Stage Notes (`comment`)
- **Stored in**: `task_activities.comments`
- **File**: `app/api/task-activities/route.js` (line 23)
- **Required field**: Validation in `app/leads/[slug]/components/taskstab.jsx` line 347

#### 2. Next Stage Notes (`nextStageComments`)
- **Stored in**: `leads_table.next_stage_notes`
- **File**: `app/api/leads/route.js` (line 414)
- **Optional field**

#### 3. Connect Through (`connectThrough`)
- **Stored in**: `task_activities.connect_through`
- **File**: `app/api/task-activities/route.js` (line 29)
- **Options**: "call", "email", "meeting", "whatsapp"
- **UI**: Radio buttons in modal (lines 1272-1294)

#### 4. Next Due Date (`dueDate`)
- **Stored in**: `tasks_table.due_date` (for the NEXT task)
- **File**: `app/leads/[slug]/components/taskstab.jsx` (lines 428-462)
- **Process**:
  1. User provides date in modal (lines 1364-1490)
  2. After STEP 3 completes, frontend waits 500ms
  3. Fetches newly created task (created by trigger)
  4. Updates that task's `due_date` via PATCH `/api/tasks`

### Additional Storage

**`stage_notes` table** (lines 465-480):
- Stores historical notes: `current_stage_notes`, `next_stage_notes`, `outcome`
- **File**: `app/api/stage-notes/route.js`
- Used for historical tracking (optional, doesn't fail if save fails)

---

## 5. Which Tables Store Data

### Lead Notes

#### Primary: `task_activities` table
- **Column**: `comments`
- **File**: `app/api/task-activities/route.js`
- **Additional columns**:
  - `activity`: Description of activity
  - `type`: Activity type (e.g., "manual", "task", "note")
  - `connect_through`: Communication channel
  - `source`: Origin ("ui", "system", "user")
  - `assigned_to`: Sales person ID
  - `created_at`: Timestamp

#### Secondary: `stage_notes` table
- **Columns**: `current_stage_notes`, `next_stage_notes`
- **File**: `app/api/stage-notes/route.js`
- **Additional columns**:
  - `lead_id`: Foreign key to leads
  - `outcome`: Success/Reschedule/No response
  - `created_at`: Timestamp
  - `created_by`: User ID
- **Purpose**: Historical tracking of stage transitions

### Tasks

#### `tasks_table`
- **Columns**:
  - `id`: Primary key
  - `lead_id`: Foreign key to `leads_table.id`
  - `sales_person_id`: Foreign key to `sales_persons.id`
  - `stage`: Pipeline stage (New, Contacted, Demo, etc.)
  - `type`: Task type (Call, Meeting, Follow-Up, etc.)
  - `title`: Task title
  - `status`: Pending/Completed/Missed/Cancelled
  - `priority`: Hot/Warm/Medium/Cold
  - `due_date`: Target completion date
  - `completed_at`: Completion timestamp
  - `created_at`: Creation timestamp
- **File**: `app/api/tasks/route.js`

### Lead Status History

#### `stage_notes` table
- **Primary table for status history**
- **Columns**:
  - `id`: Primary key
  - `lead_id`: Foreign key
  - `current_stage_notes`: Notes for current stage
  - `next_stage_notes`: Notes for next stage
  - `outcome`: Success/Reschedule/No response/Junk
  - `created_at`: Timestamp
  - `created_by`: User ID
- **File**: `app/api/stage-notes/route.js`

#### `task_activities` table
- **Also tracks status changes**
- **Via `activity` field**: e.g., "Status changed to {stage}"
- **File**: `app/api/task-activities/route.js`

**Note**: `leads_table` stores CURRENT state (`status`, `current_stage`, `next_stage_notes`), but HISTORY is in `stage_notes` and `task_activities`.

---

## Tight Couplings Identified

### 1. Task → Status Coupling
- **Direction**: Task completion → Lead status update
- **Mechanism**: Frontend 3-step process
- **Risk**: Breaking order causes data inconsistencies
- **Files**: `app/leads/[slug]/components/taskstab.jsx` lines 344-506

### 2. Status → Task Coupling
- **Direction**: Lead status change → Next task creation
- **Mechanism**: Database trigger (not in codebase)
- **Risk**: Frontend must wait for trigger, then update task
- **Files**: `app/leads/[slug]/components/taskstab.jsx` lines 422-425, 428-462

### 3. Stage → Task Title Coupling
- **Direction**: Stage determines task title
- **Mechanism**: `lib/utils/taskTitleGenerator.js`
- **Risk**: Stage changes require matching task title patterns
- **Special**: Demo stage has logic for first vs second demo

### 4. Modal → Database Coupling
- **Direction**: Modal fields map directly to database columns
- **Mapping**:
  - Current stage notes → `task_activities.comments`
  - Next stage notes → `leads_table.next_stage_notes`
  - Connect through → `task_activities.connect_through`
  - Next due date → `tasks_table.due_date` (for next task)
- **Files**: `app/leads/[slug]/components/taskstab.jsx` lines 1215-1530

---

## Summary

The system uses a **database-trigger-driven workflow** where:

1. **Lead Creation** → Database trigger creates initial task
2. **Task Completion** → 3-step process updates activity, task, and lead
3. **Lead Status Change** → Database trigger creates next task
4. **Frontend** → Coordinates flow but doesn't create tasks directly

**Critical Dependencies**:
- Database triggers (not in codebase, likely in Supabase)
- 3-step completion process (must maintain order)
- Stage progression map (hardcoded in frontend)
- Task title generation (stage-based)

**Key Files**:
- `app/api/leads/route.js` - Lead CRUD operations
- `app/api/tasks/route.js` - Task CRUD operations
- `app/api/task-activities/route.js` - Activity logging
- `app/api/stage-notes/route.js` - Stage history
- `app/leads/[slug]/components/taskstab.jsx` - Task completion UI
- `lib/utils/taskTitleGenerator.js` - Task title generation

---

## Notes for Refactoring

1. **Database triggers are not in codebase** - Need to document or migrate to application logic
2. **3-step process is tightly coupled** - Consider transaction or single API call
3. **Frontend waits 500ms for trigger** - Fragile timing dependency
4. **Stage progression is hardcoded** - Consider configuration
5. **Task title generation is in frontend** - Consider moving to backend or trigger
