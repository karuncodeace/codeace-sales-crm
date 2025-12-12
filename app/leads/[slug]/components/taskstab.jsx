"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useTheme } from "../../../context/themeContext";
import { Phone, Clock, CheckCircle2, Calendar, Circle, Plus } from "lucide-react";

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

export default function TasksTab({ leadId, leadName }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data: tasksData, mutate } = useSWR(leadId ? `/api/tasks?lead_id=${leadId}` : null, fetcher);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Call");
  const [newDueDate, setNewDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleStatus = async (task) => {
    const currentStatus = String(task.status || "").toLowerCase();
    const nextStatus = currentStatus === "completed" ? "Pending" : "Completed";
    // optimistic update
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
      console.error("Error updating task status:", err);
      await mutate(); // revert
    }
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
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          title: newTitle.trim(),
          type: newType,
          due_date: newDueDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setNewTitle("");
      setNewType("Call");
      setNewDueDate("");
      setShowAddTask(false);
      await mutate();
    } catch (err) {
      console.error("Error creating task:", err);
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
          onClick={() => setShowAddTask(true)}
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
                <label className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Call the prospect"
                  className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
                  }`}
                />
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
                disabled={isSubmitting || !newTitle.trim()}
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
    </div>
  );
}

