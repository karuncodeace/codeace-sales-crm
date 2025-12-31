"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import { useTheme } from "../../context/themeContext";
import toast from "react-hot-toast";
import PriorityDropdown from "../buttons/priorityTooglebtn";
import FilterBtn from "../buttons/filterbtn";
import AddTaskModal from "../buttons/addTaskbtn";
import { generateTaskTitle, canCreateTaskForStage, getDemoCount } from "../../../lib/utils/taskTitleGenerator";
import { CheckCircle2, Calendar } from "lucide-react";

// Custom Icon Components
const PhoneIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9.1585 5.71217L8.75584 4.80619C8.49256 4.21382 8.36092 3.91762 8.16405 3.69095C7.91732 3.40688 7.59571 3.19788 7.23592 3.08779C6.94883 2.99994 6.6247 2.99994 5.97645 2.99994C5.02815 2.99994 4.554 2.99994 4.15597 3.18223C3.68711 3.39696 3.26368 3.86322 3.09497 4.35054C2.95175 4.76423 2.99278 5.18937 3.07482 6.03964C3.94815 15.0901 8.91006 20.052 17.9605 20.9254C18.8108 21.0074 19.236 21.0484 19.6496 20.9052C20.137 20.7365 20.6032 20.3131 20.818 19.8442C21.0002 19.4462 21.0002 18.972 21.0002 18.0237C21.0002 17.3755 21.0002 17.0514 20.9124 16.7643C20.8023 16.4045 20.5933 16.0829 20.3092 15.8361C20.0826 15.6393 19.7864 15.5076 19.194 15.2443L18.288 14.8417C17.6465 14.5566 17.3257 14.414 16.9998 14.383C16.6878 14.3533 16.3733 14.3971 16.0813 14.5108C15.7762 14.6296 15.5066 14.8543 14.9672 15.3038C14.4304 15.7511 14.162 15.9748 13.834 16.0946C13.5432 16.2009 13.1588 16.2402 12.8526 16.1951C12.5071 16.1442 12.2426 16.0028 11.7135 15.7201C10.0675 14.8404 9.15977 13.9327 8.28011 12.2867C7.99738 11.7576 7.85602 11.4931 7.80511 11.1476C7.75998 10.8414 7.79932 10.457 7.90554 10.1662C8.02536 9.83822 8.24905 9.5698 8.69643 9.03294C9.14586 8.49362 9.37058 8.22396 9.48939 7.91885C9.60309 7.62688 9.64686 7.31234 9.61719 7.00042C9.58618 6.67446 9.44362 6.3537 9.1585 5.71217Z" />
    </svg>
);

const ClockIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5.04798 8.60657L2.53784 8.45376C4.33712 3.70477 9.503 0.999914 14.5396 2.34474C19.904 3.77711 23.0904 9.26107 21.6565 14.5935C20.2227 19.926 14.7116 23.0876 9.3472 21.6553C5.36419 20.5917 2.58192 17.2946 2 13.4844" />
        <path d="M12 8V12L14 14" />
    </svg>
);

const MessageIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.7109 9.3871C21.8404 9.895 21.9249 10.4215 21.9598 10.9621C22.0134 11.7929 22.0134 12.6533 21.9598 13.4842C21.6856 17.7299 18.3536 21.1118 14.1706 21.3901C12.7435 21.485 11.2536 21.4848 9.8294 21.3901C9.33896 21.3574 8.8044 21.2403 8.34401 21.0505C7.83177 20.8394 7.5756 20.7338 7.44544 20.7498C7.31527 20.7659 7.1264 20.9052 6.74868 21.184C6.08268 21.6755 5.24367 22.0285 3.99943 21.9982C3.37026 21.9829 3.05568 21.9752 2.91484 21.7349C2.77401 21.4946 2.94941 21.1619 3.30021 20.4966C3.78674 19.5739 4.09501 18.5176 3.62791 17.6712C2.82343 16.4623 2.1401 15.0305 2.04024 13.4842C1.98659 12.6533 1.98659 11.7929 2.04024 10.9621C2.31441 6.71638 5.64639 3.33448 9.8294 3.05621C10.2156 3.03051 10.6067 3.01177 11 3" />
        <path d="M8.5 15H15.5M8.5 10H12" />
        <path d="M22 4.5L14 4.5M22 4.5C22 3.79977 20.0057 2.49153 19.5 2M22 4.5C22 5.20023 20.0057 6.50847 19.5 7" />
    </svg>
);

const CalendarIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 2V6M8 2V6" />
        <path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" />
        <path d="M3 10H21" />
    </svg>
);

const LoaderIcon = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const fetcher = (url) => fetch(url).then((res) => res.json());

const dueStyles = {
    today: {
        light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100",
        dark: "text-blue-400 bg-blue-900/40 ring-1 ring-inset ring-blue-700",
    },
    upcoming: {
        light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
        dark: "text-emerald-400 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
    },
    overdue: {
        light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-100",
        dark: "text-red-400 bg-red-900/40 ring-1 ring-inset ring-red-700",
    },
    
    completed: {
        light: "text-gray-700 bg-gray-50 ring-1 ring-inset ring-gray-200",
        dark: "text-gray-300 bg-gray-900/40 ring-1 ring-inset ring-gray-700",
    },
};

const statusStyles = {
    Pending: {
        light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
        dark: "text-amber-400 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
    },
    pending: {
        light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
        dark: "text-amber-400 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
    },
    Completed: {
        light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
        dark: "text-emerald-400 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
    },
    completed: {
        light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
        dark: "text-emerald-400 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
    },
};

// Helper function to determine due status from due_datetime
function getDueStatus(dueDatetime, status) {
    if (status?.toLowerCase() === "completed") return "completed";
    if (!dueDatetime) return "upcoming";

    const now = new Date();
    const dueDate = new Date(dueDatetime);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDateOnly < today) return "overdue";
    if (dueDateOnly.getTime() === today.getTime()) return "today";
    return "upcoming";
}

// Helper function to format due datetime for display
function formatDueDateTime(dueDatetime) {
    if (!dueDatetime) return "—";
    const date = new Date(dueDatetime);
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
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

// Helper function to check if task is a demo scheduling task
function isDemoSchedulingTask(task, leadStatus) {
  if (!task || !task.title) return false;
  if (leadStatus !== "Contacted") return false;
  
  const title = task.title.toLowerCase();
  // Match "Schedule Demo" or "Schedule Product Demo" patterns
  return title.includes("schedule") && title.includes("demo");
}

// Helper function to get next stage
function getNextStage(currentStage) {
  if (!currentStage || currentStage === "null" || currentStage === "undefined") {
    return null;
  }
  
  const next = NEXT_STAGE_MAP[currentStage];
  return next !== undefined ? next : null;
}

// Helper function to get task details for next stage
function getTaskDetailsForNextStage(nextStage, leadName, existingTasks = []) {
  // Validate inputs
  if (!nextStage || typeof nextStage !== "string" || nextStage === "null" || nextStage === "undefined") {
    return null;
  }
  
  if (!canCreateTaskForStage(nextStage)) {
    return null;
  }
  
  try {
    // Ensure leadName is valid
    const validLeadName = leadName || "Client";
    
    // For Demo stage, determine if it's first or second demo
    const options = {};
    if (nextStage === "Demo") {
      options.demoCount = getDemoCount(existingTasks);
    }
    
    const title = generateTaskTitle(nextStage, validLeadName, options);
    
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

export default function TasksPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [openFilter, setOpenFilter] = useState(false);
    const [openAddTask, setOpenAddTask] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        source: "",
        status: "",
        assignedTo: "",
        priority: "",
        type: "",
    });
    const { theme } = useTheme();
    
    // Task completion modal state
    const [taskCompletionModal, setTaskCompletionModal] = useState({
        isOpen: false,
        task: null,
        leadId: null,
        leadName: "",
        currentStatus: null,
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
        leadId: null,
        leadName: "",
        requiresSecondDemo: null, // null = not selected, true = yes, false = no
        isSubmitting: false,
    });

    // Fetch tasks from API
    const { data: tasksData, error: tasksError, isLoading: tasksLoading } = useSWR("/api/tasks", fetcher);

    // Fetch leads for dropdown
    const { data: leadsData } = useSWR("/api/leads", fetcher);

    // Fetch sales persons for dropdown
    const { data: salesPersonsData } = useSWR("/api/sales-persons", fetcher);

    // Fetch task activities for due dates
    const { data: activitiesData } = useSWR("/api/task-activities", fetcher);


    const handleApplyFilters = (filters) => {
        setAdvancedFilters(filters);
    };

    const handleAddTask = async (taskData) => {
        setIsSubmitting(true);
        try {
            const response = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(taskData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to add task");
            }

            // Refresh tasks data
            mutate("/api/tasks");
            setOpenAddTask(false);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Create lookup maps for lead and sales person names
    const leadsMap = useMemo(() => {
        if (!leadsData || !Array.isArray(leadsData)) return {};
        return leadsData.reduce((acc, lead) => {
            acc[lead.id] = lead;
            return acc;
        }, {});
    }, [leadsData]);

    const salesPersonsMap = useMemo(() => {
        if (!salesPersonsData || !Array.isArray(salesPersonsData)) return {};
        return salesPersonsData.reduce((acc, person) => {
            acc[person.id] = person;
            return acc;
        }, {});
    }, [salesPersonsData]);

    // Create lookup map for latest due_date from task_activities by lead_id
    const activitiesDueDateMap = useMemo(() => {
        if (!activitiesData || !Array.isArray(activitiesData)) return {};
        // Group by lead_id and get the most recent due_date
        return activitiesData.reduce((acc, activity) => {
            if (activity.due_date && activity.lead_id) {
                // Only update if we don't have a date yet or this one is more recent
                if (!acc[activity.lead_id] || new Date(activity.created_at) > new Date(acc[activity.lead_id].created_at)) {
                    acc[activity.lead_id] = {
                        due_date: activity.due_date,
                        created_at: activity.created_at
                    };
                }
            }
            return acc;
        }, {});
    }, [activitiesData]);

    // Transform API tasks to display format
    const transformedTasks = useMemo(() => {
        // Handle error responses or non-array data
        if (!tasksData || !Array.isArray(tasksData) || tasksData.error) {
            return [];
        }

        // Helper to get due date - from activities or default to 1 day from task creation
        const getTaskDueDate = (task) => {
            const activityDue = activitiesDueDateMap[task.lead_id];
            if (activityDue?.due_date) {
                return new Date(activityDue.due_date);
            }
            // Default: 1 day from task creation or now
            const baseDate = task.created_at ? new Date(task.created_at) : new Date();
            const defaultDue = new Date(baseDate);
            defaultDue.setDate(defaultDue.getDate() + 1);
            return defaultDue;
        };

        // Format due date for display
        const formatDue = (date) => {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            if (dateOnly.getTime() === today.getTime()) return "Today";
            if (dateOnly.getTime() === tomorrow.getTime()) return "Tomorrow";

            const diffDays = Math.ceil((dateOnly - today) / (1000 * 60 * 60 * 24));
            if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
            if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        };

        const mappedTasks = tasksData.map((task) => {
            const lead = leadsMap[task.lead_id];
            // Use task's salesperson_id, or fallback to lead's assigned_to
            const salesPersonId = task.salesperson_id || task.sales_person_id || lead?.assignedTo;

            // Get due date from activities or default to 1 day
            const calculatedDueDate = getTaskDueDate(task);
            const hasActivityDueDate = !!activitiesDueDateMap[task.lead_id]?.due_date;
            const dueStatus = getDueStatus(calculatedDueDate.toISOString(), task.status);

            // Display salesperson_id directly (or lead's assigned_to as fallback)
            const assignedToId = salesPersonId || "—";

            return {
                id: task.id,
                title: task.title || "—",
                type: task.type || "Call",
                lead_id: task.lead_id,
                salesperson_id: task.salesperson_id || task.sales_person_id,
                leadName: lead?.name || task.lead_id || "—",
                phone: lead?.phone || "—",
                due_datetime: calculatedDueDate.toISOString(),
                dueDisplay: formatDue(calculatedDueDate),
                dueFullDate: calculatedDueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                due: dueStatus,
                hasUpdatedDue: hasActivityDueDate,
                priority: task.priority || "Warm",
                status: task.status || "Pending",
                assignedTo: assignedToId,
                comments: task.comments || "",
                recentLog: null,
                recentLogDisplay: "",
            };
        });

        // Sort by due date (earliest first), with overdue tasks at top
        return mappedTasks.sort((a, b) => {
            // Completed tasks go to bottom
            if (a.status?.toLowerCase() === "completed" && b.status?.toLowerCase() !== "completed") return 1;
            if (b.status?.toLowerCase() === "completed" && a.status?.toLowerCase() !== "completed") return -1;
            // Sort by due date (ascending - earliest first)
            return new Date(a.due_datetime) - new Date(b.due_datetime);
        });
    }, [tasksData, leadsMap, salesPersonsMap, activitiesDueDateMap]);

    const filteredTasks = useMemo(() => {
        let result = transformedTasks;

        if (filter === "all") {
            result = result.filter((task) => task.status?.toLowerCase() !== "completed");
        } else {
            result = result.filter((task) => {
                const filterLower = filter.toLowerCase();
                if (filterLower === "completed") {
                    return task.status?.toLowerCase() === "completed";
                }
                if (filterLower === "rescheduled") {
                    return task.due === "rescheduled";
                }
                return task.due === filterLower;
            });
        }

        if (advancedFilters.status) {
            result = result.filter((task) => task.status?.toLowerCase() === advancedFilters.status.toLowerCase());
        }
        if (advancedFilters.assignedTo) {
            result = result.filter((task) => task.assignedTo === advancedFilters.assignedTo);
        }
        if (advancedFilters.priority) {
            result = result.filter((task) => task.priority === advancedFilters.priority);
        }
        if (advancedFilters.type) {
            result = result.filter((task) => task.type === advancedFilters.type);
        }

        if (searchTerm.trim()) {
            const query = searchTerm.trim().toLowerCase();
            result = result.filter((task) => {
                const haystack = [
                    task.title,
                    task.type,
                    task.leadName,
                    task.phone,
                    task.id,
                    task.assignedTo,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(query);
            });
        }

        return result;
    }, [transformedTasks, searchTerm, filter, advancedFilters]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTasks = filteredTasks.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filter, advancedFilters]);

    const handlePriorityUpdate = async (taskId, newPriority) => {
        try {
            const response = await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: taskId, priority: newPriority }),
            });

            if (!response.ok) {
                throw new Error("Failed to update priority");
            }

            mutate("/api/tasks");
        } catch (error) {
            // Error updating priority
        }
    };

    const handleMarkComplete = async (task) => {
        if (task.status?.toLowerCase() === "completed") return;

        // Get lead data to determine current status
        const lead = leadsMap[task.lead_id];
        let currentStatus = lead?.status || lead?.current_stage || "New";
        
        // Ensure currentStatus is never null/undefined
        if (!currentStatus || currentStatus === "null" || currentStatus === "undefined" || currentStatus === null) {
            currentStatus = "New";
        }
        
        const leadName = lead?.name || task.leadName || "Lead";

        // Check if this is the special demo scenario
        if (isDemoSchedulingTask(task, currentStatus)) {
            setDemoOutcomeModal({
                isOpen: true,
                task: task,
                leadId: task.lead_id,
                leadName: leadName,
                requiresSecondDemo: null,
                isSubmitting: false,
            });
            return;
        }

        // Otherwise, show normal completion modal
        setTaskCompletionModal({
            isOpen: true,
            task: task,
            leadId: task.lead_id,
            leadName: leadName,
            currentStatus: currentStatus,
            comment: "",
            nextStageComments: "",
            connectThrough: "",
            dueDate: "",
            outcome: "Success",
            isSubmitting: false,
            showCalendar: false,
        });
    };
    
    // Confirm task completion with stage progression
    const handleConfirmTaskCompletion = async () => {
        const { task, leadId, leadName, currentStatus, comment, nextStageComments, connectThrough, dueDate, outcome } = taskCompletionModal;
        
        if (!comment.trim()) {
            toast.error("Please add a comment before completing the task");
            return;
        }
        
        // Validate currentStatus
        const validStatus = currentStatus || "New";
        if (!validStatus || validStatus === "null" || validStatus === "undefined") {
            toast.error("Cannot complete task: Lead status is invalid. Please refresh the page.");
            return;
        }
        
        setTaskCompletionModal((prev) => ({ ...prev, isSubmitting: true }));
        
        try {
            const nextStage = getNextStage(validStatus);
            
            // Validate nextStage before proceeding
            if (!nextStage) {
                // Still mark task as completed even if no next stage
            }
            
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
            
            // Update lead status and stage notes - only if nextStage is valid
            if (nextStage && nextStage !== "null" && nextStage !== "undefined" && canCreateTaskForStage(nextStage)) {
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
                
                // Get existing tasks for this lead to check for duplicates and demo count
                const existingTasksRes = await fetch(`/api/tasks?lead_id=${leadId}`);
                const existingTasks = await existingTasksRes.json().catch(() => []);
                // Exclude the current task being completed from active tasks check
                const activeTasks = Array.isArray(existingTasks) 
                    ? existingTasks.filter(t => 
                        String(t.status || "").toLowerCase() !== "completed" && t.id !== task.id
                      )
                    : [];
                
                // Create task for next stage (only if no active tasks exist, excluding current task)
                if (activeTasks.length === 0 && nextStage && nextStage !== "null" && nextStage !== "undefined") {
                    try {
                        // Ensure leadName is valid
                        const validLeadName = leadName || "Client";
                        
                        const taskDetails = getTaskDetailsForNextStage(nextStage, validLeadName, existingTasks);
                        if (taskDetails) {
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
                    } catch (error) {
                        // Don't throw - still complete the current task even if next task creation fails
                        toast.error(`Task completed, but failed to create next task: ${error.message}`);
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
                let errorMessage = "Failed to complete task";
                try {
                    const errorData = await taskRes.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    // If JSON parsing fails, use status text
                    errorMessage = taskRes.statusText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            // Create activity record with task details and user comments
            await fetch("/api/task-activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lead_id: leadId,
                    activity: `Task completed: ${task.title}`,
                    type: "task",
                    comments: comment || `Task "${task.title}" has been completed`,
                    connect_through: connectThrough || null,
                    due_date: dueDate || null,
                }),
            });
            
            // Close modal
            setTaskCompletionModal({
                isOpen: false,
                task: null,
                leadId: null,
                leadName: "",
                currentStatus: null,
                comment: "",
                nextStageComments: "",
                connectThrough: "",
                dueDate: "",
                outcome: "Success",
                isSubmitting: false,
                showCalendar: false,
            });
            
            // Show success message
            toast.success("Task completed successfully");
            
            // Force refresh of tasks data - this will filter out completed tasks
            mutate("/api/tasks");
            mutate("/api/leads");
        } catch (error) {
            console.error("Task completion error:", error);
            toast.error(error.message || "Failed to complete task. Please try again.");
            setTaskCompletionModal((prev) => ({ ...prev, isSubmitting: false }));
        }
    };
    
    // Cancel task completion
    const handleCancelTaskCompletion = () => {
        setTaskCompletionModal({
            isOpen: false,
            task: null,
            leadId: null,
            leadName: "",
            currentStatus: null,
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
        const { task, leadId, leadName, requiresSecondDemo } = demoOutcomeModal;
        
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
                    const errorData = await taskRes.json().catch(() => ({ error: "Unknown error" }));
                    throw new Error(errorData.error || "Failed to complete task");
                }

                // Create activity record
                await fetch("/api/task-activities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lead_id: leadId,
                        activity: `Task completed: ${task.title}`,
                        type: "task",
                        comments: "Demo completed - scheduling second demo",
                    }),
                });
                
                // Close modal
                setDemoOutcomeModal({
                    isOpen: false,
                    task: null,
                    leadId: null,
                    leadName: "",
                    requiresSecondDemo: null,
                    isSubmitting: false,
                });

                toast.success("Task completed successfully");

                // Refresh data
                mutate("/api/tasks");
                mutate("/api/leads");

                // Redirect to leads page with scroll to demo section
                router.push(`/leads/${leadId}?scrollToDemo=true`);
            } else {
                // NO: Proceed with normal flow - update to Demo stage and create next task
                // Get lead data to determine current status
                const lead = leadsMap[task.lead_id];
                const currentLeadStatus = lead?.status || "New";
                const nextStage = getNextStage(currentLeadStatus); // This should be "Demo" when current is "Contacted"
                
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
                    throw new Error(errorData.error || errorData.details || "Failed to save stage notes");
                }

                // Update lead status and stage notes
                if (nextStage && canCreateTaskForStage(nextStage)) {
                    const leadUpdateRes = await fetch("/api/leads", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            id: leadId,
                            status: nextStage,
                            current_stage: nextStage,
                        }),
                    });

                    if (!leadUpdateRes.ok) {
                        throw new Error("Failed to update lead status");
                    }

                    // Get existing tasks for this lead to check for duplicates and demo count
                    // Use the tasks from state (same as normal flow) - exclude the current task being completed
                    const activeTasks = Array.isArray(tasksData) 
                        ? tasksData.filter(t => 
                            t.lead_id === leadId && 
                            String(t.status || "").toLowerCase() !== "completed" &&
                            t.id !== task.id // Exclude the current task
                          )
                        : [];
                    
                    // Create task for next stage (only if no active tasks exist)
                    if (activeTasks.length === 0) {
                        // Validate nextStage before creating task
                        if (!nextStage || typeof nextStage !== "string") {
                            throw new Error(`Cannot create task: Invalid next stage: ${nextStage}`);
                        }
                        
                        const taskDetails = getTaskDetailsForNextStage(nextStage, leadName, tasksData || []);
                        if (taskDetails) {
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
                    const errorData = await taskRes.json().catch(() => ({ error: "Unknown error" }));
                    throw new Error(errorData.error || "Failed to complete task");
                }

                // Create activity record
                await fetch("/api/task-activities", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        lead_id: leadId,
                        activity: `Task completed: ${task.title}`,
                        type: "task",
                        comments: "Demo completed - proceeding to next stage",
                    }),
                });

                // Close modal
                setDemoOutcomeModal({
                    isOpen: false,
                    task: null,
                    leadId: null,
                    leadName: "",
                    requiresSecondDemo: null,
                    isSubmitting: false,
                });

                toast.success("Task completed successfully");

                // Refresh data - this will filter out completed tasks
                mutate("/api/tasks");
                mutate("/api/leads");
            }
        } catch (error) {
            console.error("Demo outcome error:", error);
            toast.error(error.message || "Failed to complete task. Please try again.");
            setDemoOutcomeModal((prev) => ({ ...prev, isSubmitting: false }));
        }
    };

    // Cancel demo outcome modal
    const handleCancelDemoOutcome = () => {
        setDemoOutcomeModal({
            isOpen: false,
            task: null,
            leadId: null,
            leadName: "",
            requiresSecondDemo: null,
            isSubmitting: false,
        });
    };

    const handleReschedule = async (taskId, rescheduleData) => {
        try {
            const response = await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: taskId,
                    due_datetime: new Date(rescheduleData.time).toISOString()
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to reschedule");
            }

            mutate("/api/tasks");
        } catch (error) {
            // Error rescheduling
        }
    };

    const getTypeIcon = (type) => {
        const iconClass = "w-4 h-4";
        switch (type) {
            case "Call":
                return <PhoneIcon className={`${iconClass} text-blue-500`} />;
            case "Follow-Up":
                return <ClockIcon className={`${iconClass} text-amber-500`} />;
            case "Proposal":
                return <MessageIcon className={`${iconClass} text-emerald-500`} />;
            default:
                return <CalendarIcon className={`${iconClass} text-purple-500`} />;
        }
    };

    if (tasksLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <LoaderIcon className={`w-8 h-8 ${theme === "dark" ? "text-orange-400" : "text-orange-500"}`} />
            </div>
        );
    }

    if (tasksError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className={`text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    <p className="text-lg">Failed to load tasks</p>
                    <p className="text-sm mt-2">Please try refreshing the page</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-[calc(100vh-180px)] mt-4 mb-5 rounded-xl shadow-2xs overflow-hidden flex flex-col ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
            {/* Header */}
            <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                {/* LEFT SIDE — Search + Filters */}
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className={`relative w-full md:w-80 flex items-center rounded-[10px] px-4 py-2 ${theme === "dark"
                            ? "border border-gray-700 bg-gray-800/50"
                            : "border border-gray-200 bg-white"
                        }`}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className={`w-5 h-5 shrink-0 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0011.15 11.15z"
                            />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search tasks, leads..."
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className={`w-full pl-2 pr-4 text-sm bg-transparent focus:outline-none ${theme === "dark"
                                    ? "text-gray-200 placeholder:text-gray-500"
                                    : "text-gray-900 placeholder:text-gray-400"
                                }`}
                        />
                    </div>
                    {/* Filter Button */}
                    <div>
                        <button
                            onClick={() => setOpenFilter(true)}
                            className={`py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg transition
                            ${theme === "dark" ? " bg-orange-500 hover:bg-orange-600 text-gray-300" : "border border-gray-200 text-gray-700 bg-white hover:bg-gray-100"}
                        `}>
                            <svg
                                className="size-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path d="M3 4h18l-6 8v6l-6 2v-8L3 4z" />
                            </svg>
                            Filter
                        </button>
                        <FilterBtn open={openFilter} onClose={() => setOpenFilter(false)} onApply={handleApplyFilters} />
                    </div>
                </div>

                {/* RIGHT SIDE — Tab Filters + Refresh */}
                <div className="flex items-center gap-3">
                    <div className="grid grid-cols-3 items-center overflow-x-auto">
                        {["all", "overdue","completed"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-sm font-medium transition 
                                            ${filter === f
                                        ? theme === "dark"
                                            ? "text-white border-b border-orange-500"
                                            : "text-black border-b border-orange-500"
                                        : theme === "dark"
                                            ? "text-gray-300"
                                            : "text-gray-700"
                                    }`}

                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                    {/* Refresh Button */}
                    <div>
                        <button
                            type="button"
                            onClick={async () => {
                                setIsRefreshing(true);
                                try {
                                    await mutate("/api/tasks");
                                } finally {
                                    setIsRefreshing(false);
                                }
                            }}
                            disabled={isRefreshing}
                            className={`inline-flex items-center justify-center rounded-lg border p-2 text-sm font-medium transition-colors focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none ${
                                theme === "dark"
                                    ? "border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                                    : "border-gray-200 text-gray-700 hover:bg-gray-100"
                            }`}
                            aria-label="Refresh tasks table"
                            title="Refresh table"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                color="currentColor"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`${isRefreshing ? "animate-spin" : ""}`}
                            >
                                <path d="M20.4879 15C19.2524 18.4956 15.9187 21 12 21C7.02943 21 3 16.9706 3 12C3 7.02943 7.02943 3 12 3C15.7292 3 18.9286 5.26806 20.2941 8.5" />
                                <path d="M15 9H18C19.4142 9 20.1213 9 20.5607 8.56066C21 8.12132 21 7.41421 21 6V3" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto overflow-x-auto">
                <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                    <thead className={`${theme === "dark" ? "bg-[#262626] text-gray-300" : "bg-gray-50"}`}>
                        <tr>
                            <th scope="col" className="ps-6 py-3 text-start">
                                <label htmlFor="task-select-all" className="flex">
                                    <input
                                        type="checkbox"
                                        className="shrink-0 size-4 accent-orange-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                        id="task-select-all"
                                    />
                                </label>
                            </th>

                            {[
                                "Task",
                                "Type",
                                "Phone",
                                "Due",
                                "Status",
                                "Assigned To",
                                "Priority",

                                
                                
                            ].map((column) => (
                                <th
                                    key={column}
                                    scope="col"
                                    className="px-6 py-3 text-start"
                                >
                                    <div className="flex items-center gap-x-2">
                                        <span className="text-xs font-semibold uppercase">
                                            {column}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className={`divide-y overflow-y-auto ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                        {filteredTasks.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={12}
                                    className={`px-6 py-10 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <p className="text-sm">
                                            {tasksData?.length === 0 
                                              ? "No tasks assigned to you yet. Tasks are created automatically when leads are added or when lead status changes. Contact an admin if you need tasks assigned to you."
                                              : "No tasks found matching your filters. Try adjusting your search or filters."}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedTasks.map((task) => (
                                <tr key={task.id} className={task.status?.toLowerCase() === "completed" ? "opacity-60" : ""}>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="ps-6 py-2">
                                            <label
                                                htmlFor={`task-${task.id}`}
                                                className="flex"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="shrink-0 size-4 accent-orange-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                                    id={`task-${task.id}`}
                                                    checked={task.status?.toLowerCase() === "completed"}
                                                    onChange={() => handleMarkComplete(task)}
                                                />
                                                <span className="sr-only">
                                                    Select {task.id}
                                                </span>
                                            </label>
                                        </div>
                                    </td>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-medium ${task.status?.toLowerCase() === "completed" ? "line-through" : ""} ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                                    {task.title}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-xs ${theme === "dark" ? "text-gray-400/80" : "text-gray-500"}`}>
                                                        {task.id}
                                                    </span> 
                                                <span className="text-xs text-gray-500">|</span>
                                                <span className={`text-xs ${theme === "dark" ? "text-gray-400/80" : "text-gray-500"}`}>
                                                        {task.lead_id}
                                                    </span> 
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(task.type)}
                                                <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                    {task.type}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                  
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <a
                                                href={`tel:${task.phone?.replace(/[^0-9+]/g, "")}`}
                                                className={`text-sm font-medium ${theme === "dark" ? "text-gray-300 hover:text-orange-400" : "text-gray-900 hover:text-orange-800"}`}
                                            >
                                                {task.phone}
                                            </a>
                                        </div>
                                    </td>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold w-fit ${dueStyles[task.due]?.[theme === "dark" ? "dark" : "light"] || dueStyles.upcoming.light
                                                    }`}>
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {task.dueDisplay}
                                                    {task.hasUpdatedDue && (
                                                        <span className="ml-1 w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                                    )}
                                                </span>

                                            </div>
                                        </div>
                                    </td>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[task.status]?.[theme === "dark" ? "dark" : "light"] || statusStyles.Pending.light
                                                }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                {task.assignedTo}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="size-px whitespace-nowrap">
                                        <div className="px-6 py-2">
                                            <PriorityDropdown
                                                value={task.priority}
                                                theme={theme}
                                                onChange={(newPriority) => handlePriorityUpdate(task.id, newPriority)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {/* End Table */}

            {/* Footer */}
            <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                <div className="inline-flex items-center gap-x-2">
                    <p className={`text-sm ${theme === "dark" ? "text-gray-400/80" : "text-gray-600"}`}>
                        Showing: {filteredTasks.length > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length}
                    </p>
                </div>

                <div>
                    <div className="inline-flex gap-x-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg shadow-2xs focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none ${theme === "dark"
                                ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                                : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100"
                                }`}
                        >
                            <svg
                                className="shrink-0 size-4"
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m15 18-6-6 6-6" />
                            </svg>
                            Prev
                        </button>

                        <button
                            type="button"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg shadow-2xs focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none ${theme === "dark"
                                ? "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                                : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100"
                                }`}
                        >
                            Next
                            <svg
                                className="shrink-0 size-4"
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            {/* End Footer */}

            {/* Task Completion Modal */}
            {taskCompletionModal.isOpen && taskCompletionModal.task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div
                        className={`w-full max-w-md mx-4 rounded-2xl shadow-2xl transform transition-all ${
                            theme === "dark" ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
                        }`}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        width="22"
                                        height="22"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-orange-500"
                                    >
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold">Complete Task</h2>
                                    <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                        {taskCompletionModal.currentStatus && getNextStage(taskCompletionModal.currentStatus) && (
                                            <>Moving to: <span className="font-medium text-orange-500">{getNextStage(taskCompletionModal.currentStatus)}</span></>
                                        )}
                                        {(!taskCompletionModal.currentStatus || !getNextStage(taskCompletionModal.currentStatus)) && (
                                            <span className="font-medium text-orange-500">Completing task</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCancelTaskCompletion}
                                className={`p-2 rounded-lg transition-colors ${
                                    theme === "dark" ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"
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
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Connect Through
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: "call", label: "Call", icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                        )},
                                        { id: "email", label: "Email", icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        )},
                                        { id: "meeting", label: "Meeting", icon: (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        )},
                                        { id: "whatsapp", label: "WhatsApp", icon: (
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                            </svg>
                                        )},
                                    ].map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setTaskCompletionModal((prev) => ({ ...prev, connectThrough: option.id }))}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                                                taskCompletionModal.connectThrough === option.id
                                                    ? "border-orange-500 bg-orange-500/10 text-orange-500"
                                                    : theme === "dark"
                                                        ? "border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300"
                                                        : "border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700"
                                            }`}
                                        >
                                            {option.icon}
                                            <span className="text-xs font-medium">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Stage Comment */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Current Stage Comment <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    placeholder="Add a comment about completing this task..."
                                    className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                                        theme === "dark"
                                            ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                    }`}
                                    rows={3}
                                    value={taskCompletionModal.comment}
                                    onChange={(e) => setTaskCompletionModal((prev) => ({ ...prev, comment: e.target.value }))}
                                    autoFocus
                                />
                                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                    This will be saved to the activity log.
                                </p>
                            </div>

                            {/* Next Stage Comments */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Next Stage Comments
                                </label>
                                <textarea
                                    placeholder="Add comments about the next stage..."
                                    className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                                        theme === "dark"
                                            ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                    }`}
                                    rows={3}
                                    value={taskCompletionModal.nextStageComments}
                                    onChange={(e) => setTaskCompletionModal((prev) => ({ ...prev, nextStageComments: e.target.value }))}
                                />
                                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                    Optional comments about the next stage.
                                </p>
                            </div>

                            {/* Outcome */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                    Outcome
                                </label>
                                <select
                                    value={taskCompletionModal.outcome}
                                    onChange={(e) => setTaskCompletionModal((prev) => ({ ...prev, outcome: e.target.value }))}
                                    className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 ${
                                        theme === "dark"
                                            ? "bg-[#262626] border-gray-700 text-gray-200"
                                            : "bg-white border-gray-200 text-gray-900"
                                    }`}
                                >
                                    <option value="Success">Success</option>
                                    <option value="Reschedule">Reschedule</option>
                                    <option value="No response">No response</option>
                                </select>
                                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                    Select the outcome of this stage.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                            <button
                                onClick={handleCancelTaskCompletion}
                                disabled={taskCompletionModal.isSubmitting}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    theme === "dark"
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
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
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
                            theme === "dark" ? "bg-[#1f1f1f] text-gray-200" : "bg-white text-gray-900"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
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
                            <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                Does the client require a second demo?
                            </p>

                            {/* Radio Options */}
                            <div className="space-y-3">
                                <label
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        demoOutcomeModal.requiresSecondDemo === true
                                            ? theme === "dark"
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-orange-500 bg-orange-50"
                                            : theme === "dark"
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
                                    <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                        YES, client requires another demo
                                    </span>
                                </label>

                                <label
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        demoOutcomeModal.requiresSecondDemo === false
                                            ? theme === "dark"
                                                ? "border-orange-500 bg-orange-500/10"
                                                : "border-orange-500 bg-orange-50"
                                            : theme === "dark"
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
                                    <span className={`font-medium ${theme === "dark" ? "text-gray-200" : "text-gray-900"}`}>
                                        NO, proceed with next stage
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                            <button
                                onClick={handleCancelDemoOutcome}
                                disabled={demoOutcomeModal.isSubmitting}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                    theme === "dark"
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
        </div>
    );
}
