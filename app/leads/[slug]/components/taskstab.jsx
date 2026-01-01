"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useTheme } from "../../../context/themeContext";
import toast from "react-hot-toast";
import { Phone, Clock, CheckCircle2, Calendar, Circle, Plus } from "lucide-react";
import { generateTaskTitle, canCreateTaskForStage, getDemoCount } from "../../../../lib/utils/taskTitleGenerator";

const fetcher = (url) => fetch(url).then((res) => res.json());

function getDueDate(task) {
  const base = task.due_date || task.due_datetime || task.created_at;
  if (!base) return null;
  return new Date(base);
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function TaskItem({ task, theme, onToggle }) {
  const isDark = theme === "dark";
  const typeIcon = (() => {
    const t = (task.type || "").toLowerCase();
    if (t.includes("call")) return Phone;
    if (t.includes("follow")) return Clock;
    if (t.includes("meeting")) return Calendar;
    return Calendar;
  })();
  const Icon = typeIcon;
  const isCompleted = String(task.status || "").toLowerCase() === "completed";
  const StatusIcon = isCompleted ? CheckCircle2 : Circle;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors ${
        isDark
          ? "bg-[#1f1f1f] border-gray-700 hover:border-gray-600"
          : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
      }`}
    >
      <button
        onClick={() => onToggle?.(task)}
        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
          isCompleted
            ? "border-emerald-500 bg-emerald-50 hover:bg-emerald-100"
            : isDark
              ? "border-gray-600 bg-gray-800 hover:bg-gray-700"
              : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
        title={isCompleted ? "Mark as not completed" : "Mark as completed"}
      >
        <StatusIcon
          className={`w-4 h-4 ${
            isCompleted
              ? "text-emerald-500"
              : isDark
                ? "text-gray-400"
                : "text-gray-500"
          }`}
          strokeWidth={isCompleted ? 2.5 : 2}
        />
      </button>

      <div className="flex-1 space-y-1 ">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              isDark ? "text-gray-100" : "text-gray-900"
            } ${isCompleted ? "line-through opacity-70" : ""}`}
          >
            {task.title || "Untitled task"}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wide ${
              isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"
            }`}
          >
            {task.type || "Task"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-md ${
              isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-600"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{formatDate(task.completed_at || task.due_date || task.created_at)}</span>
          </div>
          {task.status && (
            <span
              className={`px-2 py-1 rounded-md ${
                isCompleted
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : isDark
                    ? "bg-gray-800 text-gray-300 border border-gray-700"
                    : "bg-white text-gray-700 border border-gray-200"
              } text-xs font-medium`}
            >
              {task.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Single source of truth for stage progression
const NEXT_STAGE_MAP = {
  "New": "Contacted",
  "Contacted": "Demo",
  "Demo": "Proposal",
  "Proposal": "Follow-Up",
  "Follow-Up": "Won",
  "Won": null, // No next stage after Won
};

// Helper function to get next stage
function getNextStage(currentStage) {
  if (!currentStage || typeof currentStage !== "string") {
    return null;
  }
  const next = NEXT_STAGE_MAP[currentStage];
  return next !== undefined ? next : null;
}

// Helper function to get task details for next stage
function getTaskDetailsForNextStage(nextStage, leadName, existingTasks = []) {
  if (!nextStage || !canCreateTaskForStage(nextStage)) return null;
  
  try {
    // For Demo stage, determine if it's first or second demo
    const options = {};
    if (nextStage === "Demo") {
      options.demoCount = getDemoCount(existingTasks);
    }
    
    const title = generateTaskTitle(nextStage, leadName, options);
    
    // Determine task type based on stage
    const taskTypes = {
      "Contacted": "Meeting",
      "Demo": "Meeting",
      "Proposal": "Follow-Up",
      "Follow Up": "Call",
    };
    
    return {
      title,
      type: taskTypes[nextStage] || "Call",
    };
  } catch (error) {
    return null;
  }
}

// Helper function to check if task is a demo scheduling task
function isDemoSchedulingTask(task, leadStatus) {
  if (!task || !task.title) return false;
  if (leadStatus !== "Contacted") return false;
  
  const title = task.title.toLowerCase();
  // Match "Schedule Demo" or "Schedule Product Demo" patterns
  return title.includes("schedule") && title.includes("demo");
}

// Helper function to check if task is the first task (Initial call from New stage)
function isFirstTask(task, leadStatus) {
  if (!task || !task.title) return false;
  
  // Check task stage if available (more reliable than lead status)
  const taskStage = task.stage || task.lead_stage;
  if (taskStage) {
    const normalizedTaskStage = String(taskStage).trim().toLowerCase();
    if (normalizedTaskStage !== "new") return false;
  } else {
    // Fallback to lead status check
    const normalizedStatus = String(leadStatus || "").trim();
    if (normalizedStatus.toLowerCase() !== "new") return false;
  }
  
  const title = task.title.toLowerCase();
  // Match various first task patterns:
  // - "First Call" or "First Call –"
  // - "Initial call" or "Initial call to"
  // - "Initial Contact Call" (handles "initial" + "call" with words in between)
  // - Any combination of "first" or "initial" with "call"
  const hasFirstOrInitial = title.includes("first") || title.includes("initial");
  const hasCall = title.includes("call");
  
  return (title.includes("first call") || 
          title.includes("initial call") || 
          (hasFirstOrInitial && hasCall));
}

export default function TasksTab({ leadId, leadName }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { data: tasksData, mutate } = useSWR(leadId ? `/api/tasks?lead_id=${leadId}` : null, fetcher);
  const { data: leadData } = useSWR(leadId ? `/api/leads/${leadId}` : null, fetcher);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Call");
  const [newDueDate, setNewDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Task completion modal state
  const [taskCompletionModal, setTaskCompletionModal] = useState({
    isOpen: false,
    task: null,
    comment: "",
    nextStageComments: "",
    connectThrough: "",
    dueDate: "",
    outcome: "Success",
    isSubmitting: false,
    showCalendar: false,
  });

  // Demo outcome confirmation modal state
  const [demoOutcomeModal, setDemoOutcomeModal] = useState({
    isOpen: false,
    task: null,
    requiresSecondDemo: null, // null = not selected, true = yes, false = no
    isSubmitting: false,
  });

  // Qualification modal state
  const [qualificationModal, setQualificationModal] = useState({
    isOpen: false,
    task: null,
    isQualified: null, // null = not selected, true = qualified, false = not qualified, "notConnected" = not connected
    disqualificationNote: "",
    isSubmitting: false,
  });

  const toggleStatus = async (task) => {
    const currentStatus = String(task.status || "").toLowerCase();
    
    // If marking as completed, check for special scenarios
    if (currentStatus !== "completed") {
      // Try multiple fields for lead status
      const leadStatus = leadData?.status || leadData?.current_stage || "New";
      
      // Check if this is the first task (Initial call from New stage)
      // Try both lead status and task stage
      const taskStage = task.stage || task.lead_stage;
      const statusToCheck = taskStage || leadStatus;
      
      // Debug: Log to help diagnose issues (remove in production if needed)
      console.log("Task completion check:", {
        taskTitle: task.title,
        taskStage: taskStage,
        leadStatus: leadStatus,
        statusToCheck: statusToCheck,
        isFirstTask: isFirstTask(task, statusToCheck)
      });
      
      if (isFirstTask(task, statusToCheck)) {
        console.log("Showing qualification modal");
        setQualificationModal({
          isOpen: true,
          task: task,
          isQualified: null,
          disqualificationNote: "",
          isSubmitting: false,
        });
        return;
      }
      
      // Check if this is the special demo scenario
      if (isDemoSchedulingTask(task, leadStatus)) {
        setDemoOutcomeModal({
          isOpen: true,
          task: task,
          requiresSecondDemo: null,
          isSubmitting: false,
        });
        return;
      }
      
      // Otherwise, show normal completion modal
      setTaskCompletionModal({
        isOpen: true,
        task: task,
        comment: "",
        nextStageComments: "",
        connectThrough: "",
        dueDate: "",
        outcome: "Success",
        isSubmitting: false,
        showCalendar: false,
      });
      return;
    }
    
    // If unmarking as completed, just update directly
    const nextStatus = "Pending";
    mutate(
      (tasks) =>
        Array.isArray(tasks)
          ? tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
          : tasks,
      false
    );
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      await mutate();
    } catch (err) {
      await mutate(); // revert
    }
  };
  
  // Confirm task completion with stage progression
  const handleConfirmTaskCompletion = async () => {
    const { task, comment, nextStageComments, connectThrough, dueDate, outcome } = taskCompletionModal;
    
    if (!comment.trim()) {
      toast.error("Please add a comment before completing the task");
      return;
    }
    
    // Validate lead status
    const currentLeadStatus = leadData?.status || leadData?.current_stage || "New";
    if (!currentLeadStatus || currentLeadStatus === "null" || currentLeadStatus === "undefined") {
      toast.error("Cannot complete task: Lead status is invalid. Please refresh the page.");
      return;
    }
    
    setTaskCompletionModal((prev) => ({ ...prev, isSubmitting: true }));
    
    try {
      const nextStage = getNextStage(currentLeadStatus);
      
      // Save to stage_notes table
      const stageNotesRes = await fetch("/api/stage-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          current_stage_notes: comment,
          next_stage_notes: nextStageComments || null,
          outcome: outcome || "Success",
        }),
      });
      
      if (!stageNotesRes.ok) {
        const errorData = await stageNotesRes.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || errorData.details || "Failed to save stage notes";
        throw new Error(errorMessage);
      }
      
      // Update lead status and stage notes
      if (nextStage) {
        const leadUpdateRes = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: leadId,
            status: nextStage,
            current_stage: nextStage,
            next_stage_notes: nextStageComments || null,
          }),
        });
        
        if (!leadUpdateRes.ok) {
          throw new Error("Failed to update lead status");
        }
        
        // Create task for next stage (only if not Won)
        if (nextStage && canCreateTaskForStage(nextStage)) {
          const taskDetails = getTaskDetailsForNextStage(nextStage, leadName, tasks);
          if (taskDetails) {
            // Check for existing active tasks before creating - exclude the current task being completed
            const activeTasks = tasks.filter(
              (t) => String(t.status || "").toLowerCase() !== "completed" && t.id !== task.id
            );
            
            // Only create if no active tasks exist (excluding the one being completed)
            if (activeTasks.length === 0) {
              // Validate nextStage before creating task
              if (!nextStage || typeof nextStage !== "string") {
                throw new Error(`Cannot create task: Invalid next stage: ${nextStage}`);
              }
              
              const createRes = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lead_id: leadId,
                  stage: nextStage, // CRITICAL: Always include stage
                  title: taskDetails.title,
                  type: taskDetails.type,
                }),
              });

              if (!createRes.ok) {
                const errorData = await createRes.json().catch(() => ({ error: "Unknown error" }));
                throw new Error(errorData.error || "Failed to create next task");
              }
            }
          }
        }
      }
      
      // Mark task as completed
      const taskRes = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          status: "Completed",
        }),
      });
      
      if (!taskRes.ok) {
        throw new Error("Failed to complete task");
      }
      
      // Save activity
      await fetch("/api/task-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          activity: `Task completed: ${task.title}`,
          type: "task",
          comments: comment,
          connect_through: connectThrough,
          due_date: dueDate || null,
        }),
      });
      
      // Close modal and refresh
      setTaskCompletionModal({
        isOpen: false,
        task: null,
        comment: "",
        nextStageComments: "",
        connectThrough: "",
        dueDate: "",
        outcome: "Success",
        isSubmitting: false,
        showCalendar: false,
      });
      
      await mutate();
      // Refresh lead data if available
      if (window.location) {
        window.location.reload();
      }
    } catch (error) {
      toast.error(error.message);
      setTaskCompletionModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };
  
  // Cancel task completion
  const handleCancelTaskCompletion = () => {
    setTaskCompletionModal({
      isOpen: false,
      task: null,
      comment: "",
      nextStageComments: "",
      connectThrough: "",
      dueDate: "",
      outcome: "Success",
      isSubmitting: false,
      showCalendar: false,
    });
  };

  // Handle demo outcome confirmation
  const handleDemoOutcomeConfirm = async () => {
    const { task, requiresSecondDemo } = demoOutcomeModal;
    
    if (requiresSecondDemo === null) {
      toast.error("Please select an option");
      return;
    }

    setDemoOutcomeModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      if (requiresSecondDemo) {
        // YES: Stay in Contacted stage, redirect to leads page, scroll to demo section
        // Mark task as completed
        const taskRes = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: task.id,
            status: "Completed",
          }),
        });

        if (!taskRes.ok) {
          throw new Error("Failed to complete task");
        }

        await mutate();
        
        // Close modal
        setDemoOutcomeModal({
          isOpen: false,
          task: null,
          requiresSecondDemo: null,
          isSubmitting: false,
        });

        // Redirect to leads page with scroll to demo section
        router.push(`/leads/${leadId}?scrollToDemo=true`);
      } else {
        // NO: Proceed with normal flow - EXACT COPY of handleConfirmTaskCompletion logic
        const currentLeadStatus = leadData?.status || "New";
        const nextStage = getNextStage(currentLeadStatus);
        
        // Save to stage_notes table
        const stageNotesRes = await fetch("/api/stage-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            current_stage_notes: "Demo completed - proceeding to next stage",
            next_stage_notes: null,
            outcome: "Success",
          }),
        });

        if (!stageNotesRes.ok) {
          const errorData = await stageNotesRes.json().catch(() => ({ error: "Unknown error" }));
          const errorMessage = errorData.error || errorData.details || "Failed to save stage notes";
          throw new Error(errorMessage);
        }

        // Update lead status and stage notes
        if (nextStage) {
          const leadUpdateRes = await fetch("/api/leads", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: leadId,
              status: nextStage,
              current_stage: nextStage,
              next_stage_notes: null,
            }),
          });
          
          if (!leadUpdateRes.ok) {
            throw new Error("Failed to update lead status");
          }
          
          // Create task for next stage (only if not Won) - EXACT COPY
          if (nextStage && canCreateTaskForStage(nextStage)) {
            const taskDetails = getTaskDetailsForNextStage(nextStage, leadName, tasks);
            if (taskDetails) {
              // Check for existing active tasks before creating
              // Exclude the current task being completed
              const activeTasks = tasks.filter(
                (t) => String(t.status || "").toLowerCase() !== "completed" && t.id !== task.id
              );
              
              // Only create if no active tasks exist (excluding current task)
              if (activeTasks.length === 0) {
                // Validate nextStage before creating task
                if (!nextStage || typeof nextStage !== "string") {
                  throw new Error(`Cannot create task: Invalid next stage: ${nextStage}`);
                }
                
                const createRes = await fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    lead_id: leadId,
                    stage: nextStage, // CRITICAL: Always include stage
                    title: taskDetails.title,
                    type: taskDetails.type,
                  }),
                });

                if (!createRes.ok) {
                  const errorData = await createRes.json().catch(() => ({ error: "Unknown error" }));
                  throw new Error(errorData.error || "Failed to create next task");
                }
              }
            }
          }
        }
        
        // Mark task as completed
        const taskRes = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: task.id,
            status: "Completed",
          }),
        });
        
        if (!taskRes.ok) {
          throw new Error("Failed to complete task");
        }
        
        // Save activity
        await fetch("/api/task-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            activity: `Task completed: ${task.title}`,
            type: "task",
            comments: "Demo completed - proceeding to next stage",
            connect_through: "",
            due_date: null,
          }),
        });
        
        // Close modal and refresh
        setDemoOutcomeModal({
          isOpen: false,
          task: null,
          requiresSecondDemo: null,
          isSubmitting: false,
        });
        
        await mutate();
        // Refresh lead data if available
        if (window.location) {
          window.location.reload();
        }
      }
    } catch (error) {
      toast.error(error.message);
      setDemoOutcomeModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Cancel demo outcome modal
  const handleCancelDemoOutcome = () => {
    setDemoOutcomeModal({
      isOpen: false,
      task: null,
      requiresSecondDemo: null,
      isSubmitting: false,
    });
  };

  // Handle qualification confirmation
  const handleQualificationConfirm = async () => {
    const { task, isQualified, disqualificationNote } = qualificationModal;
    
    if (isQualified === null) {
      toast.error("Please select an option");
      return;
    }

    setQualificationModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      if (isQualified === "notConnected") {
        // NOT CONNECTED: Keep task as Pending (don't mark as completed), keep lead in same stage, don't show next modal
        // Don't update task status - just save activity note so task remains visible

        // Save activity with not connected note
        await fetch("/api/task-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            activity: `Task attempted: ${task.title} - Client did not attend the call`,
            type: "task",
            comments: disqualificationNote || "Client did not attend the call - Task remains pending for retry",
            connect_through: "",
            due_date: null,
          }),
        });

        // Save to stage_notes table
        await fetch("/api/stage-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            current_stage_notes: disqualificationNote || "Client did not attend the call",
            next_stage_notes: null,
            outcome: "Not Connected",
          }),
        });

        // Close modal and refresh
        setQualificationModal({
          isOpen: false,
          task: null,
          isQualified: null,
          disqualificationNote: "",
          isSubmitting: false,
        });
        
        await mutate();
        toast.success("Task updated. Lead remains in current stage. Task is still pending for retry.");
        
        // Refresh lead data
        if (window.location) {
          window.location.reload();
        }
      } else if (isQualified) {
        // YES: Qualified - proceed with normal flow
        // Update lead qualification field
        await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: leadId,
            lead_qualification: "Lead is Qualified",
          }),
        });
        
        // Close qualification modal and show normal completion modal
        setQualificationModal({
          isOpen: false,
          task: null,
          isQualified: null,
          disqualificationNote: "",
          isSubmitting: false,
        });
        
        // Show normal completion modal
        setTaskCompletionModal({
          isOpen: true,
          task: task,
          comment: "",
          nextStageComments: "",
          connectThrough: "",
          dueDate: "",
          outcome: "Success",
          isSubmitting: false,
          showCalendar: false,
        });
      } else {
        // NO: Not Qualified - mark lead as Disqualified, complete task, but don't move stage
        // Mark task as completed
        const taskRes = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: task.id,
            status: "Completed",
          }),
        });

        if (!taskRes.ok) {
          throw new Error("Failed to complete task");
        }

        // Update lead status to Disqualified and set qualification
        const leadUpdateRes = await fetch("/api/leads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: leadId,
            status: "Disqualified",
            current_stage: "Disqualified",
            lead_qualification: "This lead is not qualified",
          }),
        });
        
        if (!leadUpdateRes.ok) {
          throw new Error("Failed to update lead status");
        }

        // Save activity with disqualification note
        await fetch("/api/task-activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            activity: `Task completed: ${task.title} - Lead marked as Disqualified`,
            type: "task",
            comments: disqualificationNote || "Lead not qualified",
            connect_through: "",
            due_date: null,
          }),
        });

        // Save to stage_notes table
        await fetch("/api/stage-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            current_stage_notes: disqualificationNote || "Lead not qualified",
            next_stage_notes: null,
            outcome: "Disqualified",
          }),
        });

        // Close modal and refresh
        setQualificationModal({
          isOpen: false,
          task: null,
          isQualified: null,
          disqualificationNote: "",
          isSubmitting: false,
        });
        
        await mutate();
        toast.success("Task completed. Lead marked as Disqualified.");
        
        // Refresh lead data
        if (window.location) {
          window.location.reload();
        }
      }
    } catch (error) {
      toast.error(error.message);
      setQualificationModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Cancel qualification modal
  const handleCancelQualification = () => {
    setQualificationModal({
      isOpen: false,
      task: null,
      isQualified: null,
      disqualificationNote: "",
      isSubmitting: false,
    });
  };

  const tasks = Array.isArray(tasksData) ? tasksData : [];

  const { upcoming, completed } = useMemo(() => {
    const pending = tasks.filter((t) => String(t.status || "").toLowerCase() !== "completed");
    const done = tasks.filter((t) => String(t.status || "").toLowerCase() === "completed");
    const sortByDueAsc = (a, b) => {
      const ad = getDueDate(a) || new Date(0);
      const bd = getDueDate(b) || new Date(0);
      return ad - bd;
    };
    const sortByCompletedDesc = (a, b) => {
      const ad = a.completed_at ? new Date(a.completed_at) : new Date(0);
      const bd = b.completed_at ? new Date(b.completed_at) : new Date(0);
      return bd - ad;
    };
    return {
      upcoming: [...pending].sort(sortByDueAsc),
      completed: [...done].sort(sortByCompletedDesc),
    };
  }, [tasks]);

  const handleAddTask = async () => {
    if (!leadId || !leadData) return;
    
    const currentStage = leadData.status || "New";
    
    // Block task creation for Won stage
    if (!canCreateTaskForStage(currentStage)) {
      toast.error("Cannot create tasks for leads in 'Won' stage");
      return;
    }
    
    // Check for existing active tasks
    const activeTasks = tasks.filter(
      (t) => String(t.status || "").toLowerCase() !== "completed"
    );
    
    if (activeTasks.length > 0) {
      const confirmMessage = `This lead already has ${activeTasks.length} active task(s). Do you want to create another task?`;
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{confirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  createTask();
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: "top-center",
        }
      );
      return;
    }
    
    createTask();
  };
  
  const createTask = async () => {
    if (!leadId || !leadData) return;
    
    const currentStage = leadData.status || "New";
    
    // Generate task title based on current stage
    let taskTitle;
    try {
      const options = {};
      if (currentStage === "Demo") {
        options.demoCount = getDemoCount(tasks);
      }
      taskTitle = generateTaskTitle(currentStage, leadName || leadData.lead_name || leadData.name, options);
    } catch (error) {
      toast.error(error.message || "Failed to generate task title");
      return;
    }
    
    // Validate currentStage before creating task
    if (!currentStage || typeof currentStage !== "string") {
      toast.error("Cannot create task: Lead stage is invalid. Please refresh the page.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          stage: currentStage, // CRITICAL: Always include stage
          title: taskTitle,
          type: newType,
          due_date: newDueDate || null,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create task");
      }
      setNewTitle("");
      setNewType("Call");
      setNewDueDate("");
      setShowAddTask(false);
      await mutate();
    } catch (err) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
            Tasks
          </h2>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"} {leadName ? `for ${leadName}` : ""}
          </p>
        </div>

        <button
          onClick={() => {
            const currentStage = leadData?.status || "New";
            if (!canCreateTaskForStage(currentStage)) {
              toast.error("Cannot create tasks for leads in 'Won' stage");
              return;
            }
            setShowAddTask(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddTask(false)} />
          <div
            className={`relative w-full max-w-2xl p-6 rounded-2xl shadow-2xl border-2 ${
              isDark
                ? "bg-gradient-to-br from-gray-800 to-gray-900 border-orange-500/30"
                : "bg-gradient-to-br from-white to-gray-50 border-orange-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Create Task</h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Add a to-do for this lead.</p>
              </div>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTitle("");
                  setNewType("Call");
                  setNewDueDate("");
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                  Title <span className="text-xs text-gray-500">(Auto-generated based on stage)</span>
                </label>
                <input
                  value={(() => {
                    if (!leadData) return "";
                    const currentStage = leadData.status || "New";
                    try {
                      const options = {};
                      if (currentStage === "Demo") {
                        options.demoCount = getDemoCount(tasks);
                      }
                      return generateTaskTitle(currentStage, leadName || leadData.lead_name || leadData.name || "", options);
                    } catch (error) {
                      return "";
                    }
                  })()}
                  disabled
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-gray-100 cursor-not-allowed ${
                    isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600"
                  }`}
                />
                <p className={`mt-1 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Task title is automatically generated based on the lead's current stage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                      isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                    }`}
                  >
                    <option>Call</option>
                    <option>Meeting</option>
                    <option>Follow Up</option>
                    <option>Task</option>
                  </select>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>Due date</label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                      isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTitle("");
                  setNewType("Call");
                  setNewDueDate("");
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                disabled={isSubmitting || !leadData}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-xl"
              >
                {isSubmitting && <CheckCircle2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save Task"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Upcoming</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Your next to-dos for this lead</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No upcoming tasks</div>
          ) : (
            upcoming.map((task) => <TaskItem key={task.id} task={task} theme={theme} onToggle={toggleStatus} />)
          )}
        </div>
      </div>

      <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Completed</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Done items for this lead</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-3">
          {completed.length === 0 ? (
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No completed tasks</div>
          ) : (
            completed.map((task) => <TaskItem key={task.id} task={task} theme={theme} onToggle={toggleStatus} />)
          )}
        </div>
      </div>

      {/* Task Completion Modal */}
      {taskCompletionModal.isOpen && taskCompletionModal.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl transform transition-all ${
              isDark ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <CheckCircle2 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Complete Task</h2>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {leadData?.status && getNextStage(leadData.status) && (
                      <>Moving to: <span className="font-medium text-orange-500">{getNextStage(leadData.status)}</span></>
                    )}
                    {(!leadData?.status || !getNextStage(leadData.status)) && (
                      <span className="font-medium text-orange-500">Completing task</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelTaskCompletion}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Connect Through */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Connect Through
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "call", label: "Call", icon: "📞" },
                    { id: "email", label: "Email", icon: "✉️" },
                    { id: "meeting", label: "Meeting", icon: "🤝" },
                    { id: "whatsapp", label: "WhatsApp", icon: "💬" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setTaskCompletionModal((prev) => ({ ...prev, connectThrough: option.id }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                        taskCompletionModal.connectThrough === option.id
                          ? "border-orange-500 bg-orange-500/10 text-orange-500"
                          : isDark
                            ? "border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300"
                            : "border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Stage Comment */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Current Stage Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Add a comment about completing this task..."
                  className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                    isDark
                      ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                  }`}
                  rows={3}
                  value={taskCompletionModal.comment}
                  onChange={(e) => setTaskCompletionModal((prev) => ({ ...prev, comment: e.target.value }))}
                  autoFocus
                />
                <p className={`mt-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  This will be saved to the activity log.
                </p>
              </div>

              {/* Next Stage Comments */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Next Stage Comments
                </label>
                <textarea
                  placeholder="Add comments about the next stage..."
                  className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                    isDark
                      ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                  }`}
                  rows={3}
                  value={taskCompletionModal.nextStageComments}
                  onChange={(e) => setTaskCompletionModal((prev) => ({ ...prev, nextStageComments: e.target.value }))}
                />
                <p className={`mt-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Optional comments about the next stage.
                </p>
              </div>

              {/* Outcome */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  Outcome
                </label>
                <select
                  value={taskCompletionModal.outcome}
                  onChange={(e) => setTaskCompletionModal((prev) => ({ ...prev, outcome: e.target.value }))}
                  className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                    isDark
                      ? "bg-[#262626] border-gray-700 text-gray-200"
                      : "bg-white border-gray-200 text-gray-900"
                  }`}
                >
                  <option value="Success">Success</option>
                  <option value="Reschedule">Reschedule</option>
                  <option value="No response">No response</option>
                </select>
                <p className={`mt-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Select the outcome of this stage.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={handleCancelTaskCompletion}
                disabled={taskCompletionModal.isSubmitting}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTaskCompletion}
                disabled={taskCompletionModal.isSubmitting || !taskCompletionModal.comment.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {taskCompletionModal.isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Task
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Outcome Confirmation Modal */}
      {demoOutcomeModal.isOpen && demoOutcomeModal.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl transform transition-all ${
              isDark ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Demo Outcome Confirmation</h2>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Does the client require a second demo?
              </p>

              {/* Radio Options */}
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    demoOutcomeModal.requiresSecondDemo === true
                      ? isDark
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-orange-500 bg-orange-50"
                      : isDark
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="demoOutcome"
                    checked={demoOutcomeModal.requiresSecondDemo === true}
                    onChange={() => setDemoOutcomeModal((prev) => ({ ...prev, requiresSecondDemo: true }))}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                    YES, client requires another demo
                  </span>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    demoOutcomeModal.requiresSecondDemo === false
                      ? isDark
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-orange-500 bg-orange-50"
                      : isDark
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="demoOutcome"
                    checked={demoOutcomeModal.requiresSecondDemo === false}
                    onChange={() => setDemoOutcomeModal((prev) => ({ ...prev, requiresSecondDemo: false }))}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                    NO, proceed with next stage
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={handleCancelDemoOutcome}
                disabled={demoOutcomeModal.isSubmitting}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleDemoOutcomeConfirm}
                disabled={demoOutcomeModal.isSubmitting || demoOutcomeModal.requiresSecondDemo === null}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {demoOutcomeModal.isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Qualification Modal */}
      {qualificationModal.isOpen && qualificationModal.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl transform transition-all ${
              isDark ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <CheckCircle2 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Lead Qualification Check</h2>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Is this lead qualified?
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelQualification}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Radio Options */}
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    qualificationModal.isQualified === true
                      ? isDark
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-orange-500 bg-orange-50"
                      : isDark
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="qualification"
                    checked={qualificationModal.isQualified === true}
                    onChange={() => setQualificationModal((prev) => ({ ...prev, isQualified: true }))}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                    Yes (Qualified)
                  </span>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    qualificationModal.isQualified === false
                      ? isDark
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-orange-500 bg-orange-50"
                      : isDark
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="qualification"
                    checked={qualificationModal.isQualified === false}
                    onChange={() => setQualificationModal((prev) => ({ ...prev, isQualified: false }))}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                    No (Not Qualified)
                  </span>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    qualificationModal.isQualified === "notConnected"
                      ? isDark
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-orange-500 bg-orange-50"
                      : isDark
                        ? "border-gray-700 hover:border-gray-600"
                        : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="qualification"
                    checked={qualificationModal.isQualified === "notConnected"}
                    onChange={() => setQualificationModal((prev) => ({ ...prev, isQualified: "notConnected" }))}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className={`font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>
                    Not Connected (Client did not attend)
                  </span>
                </label>
              </div>

              {/* Note field (show if Not Qualified or Not Connected is selected) */}
              {(qualificationModal.isQualified === false || qualificationModal.isQualified === "notConnected") && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {qualificationModal.isQualified === "notConnected" ? "Note" : "Disqualification Note"} <span className="text-gray-500">(Optional)</span>
                  </label>
                  <textarea
                    placeholder={qualificationModal.isQualified === "notConnected" 
                      ? "Add a note about the call attempt..." 
                      : "Add a note about why this lead is not qualified..."}
                    className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                      isDark
                        ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    }`}
                    rows={3}
                    value={qualificationModal.disqualificationNote}
                    onChange={(e) => setQualificationModal((prev) => ({ ...prev, disqualificationNote: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={handleCancelQualification}
                disabled={qualificationModal.isSubmitting}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleQualificationConfirm}
                disabled={qualificationModal.isSubmitting || qualificationModal.isQualified === null}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {qualificationModal.isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Continue
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

