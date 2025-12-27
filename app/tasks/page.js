"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useTheme } from "../context/themeContext";
import toast from "react-hot-toast";
import PriorityDropdown from "../components/buttons/priorityTooglebtn";
import FilterBtn from "../components/buttons/filterbtn";
import AddTaskModal from "../components/buttons/addTaskbtn";
import TasksTable from "../components/tables/tasksTable";



const fetcher = (url) => fetch(url).then((res) => res.json());

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
   
    const [openAddTask, setOpenAddTask] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
   
 
    const { theme } = useTheme();
    
    // Fetch leads for dropdown
    const { data: leadsData } = useSWR("/api/leads", fetcher);
    
    // Fetch sales persons for dropdown
    const { data: salesPersonsData } = useSWR("/api/sales-persons", fetcher);

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



    return (
        <div className="pl-5 md:pl-0 2xl:pl-0 w-full">
            <div className="mt-8 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Tasks</h1>
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
                        data-action="add-task"
                        onClick={() => setOpenAddTask(true)}
                        className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-orange-500 text-white hover:bg-orange-600 focus:outline-hidden focus:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none">
                        Add Task
                    </button>
                </div>
            </div>

                       <div>
                <TasksTable />
            </div>
        </div>
    );
}
