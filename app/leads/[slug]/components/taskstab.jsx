"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../../context/themeContext";
import { Phone, Clock, CheckCircle2, Calendar } from "lucide-react";

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

function TaskItem({ task, theme }) {
  const isDark = theme === "dark";
  const typeIcon = (() => {
    const t = (task.type || "").toLowerCase();
    if (t.includes("call")) return Phone;
    if (t.includes("follow")) return Clock;
    if (t.includes("meeting")) return Calendar;
    return Calendar;
  })();
  const Icon = typeIcon;
  return (
    <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${isDark ? "bg-gray-800/50 border border-gray-700" : "bg-white border border-gray-200"}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
          <Icon className={`w-4 h-4 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>{task.title || "—"}</span>
          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{task.type || "Task"}</span>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatDate(task.completed_at || task.due_date || task.created_at)}</span>
      </div>
    </div>
  );
}

export default function TasksTab({ leadId }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { data: tasksData } = useSWR(leadId ? `/api/tasks?lead_id=${leadId}` : null, fetcher);

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

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Upcoming Tasks</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Pending activities for this lead</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-3">
          {upcoming.length === 0 ? (
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No upcoming tasks</div>
          ) : (
            upcoming.map((task) => <TaskItem key={task.id} task={task} theme={theme} />)
          )}
        </div>
      </div>

      <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Completed Tasks</h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Closed activities for this lead</p>
          </div>
          <div className={`p-3 rounded-xl ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"}`}>
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
        <div className="space-y-3">
          {completed.length === 0 ? (
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>No completed tasks</div>
          ) : (
            completed.map((task) => <TaskItem key={task.id} task={task} theme={theme} />)
          )}
        </div>
      </div>
    </div>
  );
}

