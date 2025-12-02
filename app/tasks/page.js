"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useTheme } from "../context/themeContext";
import PriorityDropdown from "../components/buttons/priorityTooglebtn";
import RescheduleButton from "../components/buttons/RescheduleButton";
import FilterBtn from "../components/buttons/filterbtn";
import AddTaskModal from "../components/buttons/addTaskbtn";

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
    rescheduled: {
        light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
        dark: "text-purple-400 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
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

export default function TasksPage() {
    const [openActions, setOpenActions] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [openFilter, setOpenFilter] = useState(false);
    const [openAddTask, setOpenAddTask] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        source: "",
        status: "",
        assignedTo: "",
        priority: "",
        type: "",
    });
    const { theme } = useTheme();

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
            console.error("Error adding task:", error);
            alert(error.message);
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
        if (!tasksData || !Array.isArray(tasksData) || tasksData.error) return [];
        
        // Helper to get due date - from activities or default to 2 days from task creation
        const getTaskDueDate = (task) => {
            const activityDue = activitiesDueDateMap[task.lead_id];
            if (activityDue?.due_date) {
                return new Date(activityDue.due_date);
            }
            // Default: 2 days from task creation or now
            const baseDate = task.created_at ? new Date(task.created_at) : new Date();
            const defaultDue = new Date(baseDate);
            defaultDue.setDate(defaultDue.getDate() + 2);
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
            const salesPerson = salesPersonsMap[task.sales_person_id];
            
            // Get due date from activities or default to 2 days
            const calculatedDueDate = getTaskDueDate(task);
            const hasActivityDueDate = !!activitiesDueDateMap[task.lead_id]?.due_date;
            const dueStatus = getDueStatus(calculatedDueDate.toISOString(), task.status);
            
            return {
                id: task.id,
                title: task.title || "—",
                type: task.type || "Call",
                lead_id: task.lead_id,
                sales_person_id: task.sales_person_id,
                leadName: lead?.name || task.lead_id || "—",
                phone: lead?.phone || "—",
                due_datetime: calculatedDueDate.toISOString(),
                dueDisplay: formatDue(calculatedDueDate),
                dueFullDate: calculatedDueDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
                due: dueStatus,
                hasUpdatedDue: hasActivityDueDate,
                priority: task.priority || "Warm",
                status: task.status || "Pending",
                assignedTo: salesPerson?.name || salesPerson?.sales_person_name || salesPerson?.full_name || task.sales_person_id || "—",
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
        
        // Apply due filter (tab filter)
        if (filter !== "all") {
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

        // Apply advanced filters
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
        
        // Apply search
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
            console.error("Error updating priority:", error);
        }
    };

    const handleToggleActions = (taskId) => {
        setOpenActions((prev) => (prev === taskId ? null : taskId));
    };

    const handleMarkComplete = async (taskId, currentStatus) => {
        const newStatus = currentStatus?.toLowerCase() === "completed" ? "Pending" : "Completed";
        try {
            const response = await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: taskId, status: newStatus }),
            });
            
            if (!response.ok) {
                throw new Error("Failed to update status");
            }
            
            mutate("/api/tasks");
        } catch (error) {
            console.error("Error updating status:", error);
        }
        setOpenActions(null);
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
            console.error("Error rescheduling:", error);
        }
    };

    useEffect(() => {
        if (!openActions) return;

        const handleClickOutside = (event) => {
            if (!event.target.closest('[data-actions-menu="true"]')) {
                setOpenActions(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openActions]);

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
        <div className="pl-5 md:pl-0 2xl:pl-0 w-full">
            <div className="mt-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold mb-1">Tasks</h1>
                </div>
                <div className="flex items-center gap-3 ">
                    <AddTaskModal 
                        open={openAddTask} 
                        onClose={() => setOpenAddTask(false)} 
                        onAdd={handleAddTask}
                        leads={Array.isArray(leadsData) ? leadsData : []}
                        salesPersons={Array.isArray(salesPersonsData) ? salesPersonsData : []}
                        isSubmitting={isSubmitting}
                    />
                    <button 
                        onClick={() => setOpenAddTask(true)}
                        className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-orange-500 text-white hover:bg-orange-600 focus:outline-hidden focus:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none">
                        Add Task
                    </button>
                </div>
            </div>

            <div className={`h-[calc(100vh-180px)] mt-8 mb-5 rounded-xl shadow-2xs overflow-hidden flex flex-col ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
                {/* Header */}
                <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    {/* LEFT SIDE — Search + Filters */}
                    <div className="flex gap-2 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className={`relative w-full md:w-80 flex items-center rounded-[10px] px-4 py-2 ${
                            theme === "dark" 
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
                                className={`w-full pl-2 pr-4 text-sm bg-transparent focus:outline-none ${
                                    theme === "dark" 
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

                    {/* RIGHT SIDE — Tab Filters */}
                    <div className="grid grid-cols-4 items-center overflow-x-auto  ">
                            {["all","overdue", "rescheduled", "completed"].map((f) => (
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
                                    "Lead",
                                    "Phone",
                                    "Due",
                                    "Status",
                                    "Assigned To",
                                    "Priority",
                                    
                                    "Actions",
                                    "Comments",
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
                                        className={`px-6 py-10 text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                                    >
                                        No tasks found. Try a different search or filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => (
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
                                                        onChange={() => handleMarkComplete(task.id, task.status)}
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
                                                    <span className={`text-xs ${theme === "dark" ? "text-gray-400/80" : "text-gray-500"}`}>
                                                        {task.id}
                                                    </span>
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
                                                <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                                    {task.lead_id}
                                                </span>
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
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold w-fit ${
                                                        dueStyles[task.due]?.[theme === "dark" ? "dark" : "light"] || dueStyles.upcoming.light
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
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    statusStyles[task.status]?.[theme === "dark" ? "dark" : "light"] || statusStyles.Pending.light
                                                }`}>
                                                    {task.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                    {task.sales_person_id}
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
                                        
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <div
                                                    className="relative"
                                                    data-actions-menu="true"
                                                >
                                                    <button
                                                        type="button"
                                                        aria-label="Open actions menu"
                                                        onClick={() => handleToggleActions(task.id)}
                                                        className={`inline-flex items-center justify-center rounded-full border p-2 focus:outline-hidden ${theme === "dark"
                                                            ? "border-gray-700 text-gray-400 hover:text-gray-200"
                                                            : "border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300"
                                                        }`}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            width="20"
                                                            height="20"
                                                            fill="none"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                d="M11.9967 11.5C12.549 11.5 12.9967 11.9477 12.9967 12.5C12.9967 13.0523 12.549 13.5 11.9967 13.5C11.4444 13.5 10.9967 13.0523 10.9967 12.5C10.9967 11.9477 11.4444 11.5 11.9967 11.5Z"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M11.9967 5.5C12.549 5.5 12.9967 5.94772 12.9967 6.5C12.9967 7.05228 12.549 7.5 11.9967 7.5C11.4444 7.5 10.9967 7.05228 10.9967 6.5C10.9967 5.94772 11.4444 5.5 11.9967 5.5Z"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                            <path
                                                                d="M11.9967 17.5C12.549 17.5 12.9967 17.9477 12.9967 18.5C12.9967 19.0523 12.549 19.5 11.9967 19.5C11.4444 19.5 10.9967 19.0523 10.9967 18.5C10.9967 17.9477 11.4444 17.5 11.9967 17.5Z"
                                                                strokeWidth="1.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>

                                                    {openActions === task.id && (
                                                        <div className={`absolute right-0 z-10 mt-2 w-40 rounded-lg border text-sm font-medium shadow-xl ${theme === "dark"
                                                            ? "bg-gray-800 text-gray-200 border-gray-700"
                                                            : "bg-white text-gray-700 border-gray-200"
                                                        }`}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMarkComplete(task.id, task.status)}
                                                                className={`flex w-full items-center px-4 py-2 ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                                                            >
                                                                {task.status?.toLowerCase() === "completed" ? "Mark Pending" : "Mark Complete"}
                                                            </button>
                                                            {["View", "Edit"].map((action) => (
                                                                <button
                                                                    key={action}
                                                                    type="button"
                                                                    className={`flex w-full items-center px-4 py-2 ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                                                                >
                                                                    {action}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2 max-w-[200px]">
                                                {task.comments ? (
                                                    <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                                                        <div className="flex items-start gap-1.5">
                                                            <svg 
                                                                xmlns="http://www.w3.org/2000/svg" 
                                                                viewBox="0 0 20 20" 
                                                                fill="currentColor" 
                                                                className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-orange-500"
                                                            >
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                                                            </svg>
                                                            <span className="line-clamp-2 break-words" title={task.comments}>
                                                                {task.comments}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className={`text-xs italic ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                                                        No comments
                                                    </span>
                                                )}
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
                            Showing: {filteredTasks.length} of {transformedTasks.length}
                        </p>
                    </div>

                    <div>
                        <div className="inline-flex gap-x-2">
                            <button
                                type="button"
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
            </div>
        </div>
    );
}
