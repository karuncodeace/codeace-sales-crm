"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";
import { fetcher } from "../../../lib/swr/fetcher";
import {
  Mail,
  Phone,
  Copy,
  Check,
  Edit2,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Target,
  MessageSquare,
  TrendingUp,
  Award,
  Activity,
} from "lucide-react";

export default function ViewProfile() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [copied, setCopied] = useState(false);

  // Fetch current user data
  const { data: userData, error: userError, isLoading: userLoading } = useSWR(
    "profile-user-data",
    async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (user) {
        return {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "User",
          avatar: user.user_metadata?.avatar_url || null,
          phone: user.user_metadata?.phone || "Not provided",
          role: user.user_metadata?.role || "Sales Person",
        };
      }
      return null;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 259200000, // 3 days cache
    }
  );

  // Fetch user's tasks for stats
  const { data: tasksData } = useSWR(
    userData ? `/api/tasks` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  // Calculate stats from tasks
  const calculateStats = () => {
    if (!tasksData || !Array.isArray(tasksData)) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        calls: 0,
        meetings: 0,
        overdueTasks: 0,
      };
    }

    const userTasks = tasksData.filter(
      (task) => task.sales_person_id === userData?.id || task.assigned_to === userData?.id
    );

    return {
      totalTasks: userTasks.length,
      completedTasks: userTasks.filter((t) => t.status?.toLowerCase() === "completed").length,
      pendingTasks: userTasks.filter((t) => t.status?.toLowerCase() !== "completed").length,
      calls: userTasks.filter((t) => t.type?.toLowerCase() === "call").length,
      meetings: userTasks.filter((t) => t.type?.toLowerCase() === "meeting").length,
      overdueTasks: userTasks.filter((t) => {
        if (t.status?.toLowerCase() === "completed") return false;
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).length,
    };
  };

  const stats = calculateStats();
  const completionRate = stats.totalTasks > 0 
    ? ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1) 
    : 0;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  if (userLoading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (userError || !userData) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center ${isDark ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
        <div className={`rounded-xl p-8 text-center ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className={isDark ? "text-red-400" : "text-red-600"}>Failed to load profile data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen `}>
      {/* Hero Banner Section */}
      <div className={`relative overflow-hidden rounded-3xl border  shadow-lg mt-5 ${isDark ? "bg-gradient-to-br from-[#262626] via-[#1f1f1f] to-[#262626] border-gray-700 " : "bg-white text-black border-gray-200 "}`}>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
        <div className="relative  mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar Section */}
            <div className="relative">
              <div className={`w-32 h-32 rounded-full ${isDark ? "bg-gray-700" : "bg-white/20"} flex items-center justify-center text-4xl font-bold ${isDark ? "text-gray-300" : "text-white"} border-4 ${isDark ? "border-gray-600" : "border-white/30"} shadow-2xl`}>
                {userData.avatar ? (
                  <img
                    src="/profile avator.png"
                    alt={userData.name}
                    className="w-32 h-32 rounded-full object-cover"
                  />
                ) : (
                  <span>{getInitials(userData.name)}</span>
                )}
              </div>
              <button
                className={`absolute bottom-0 right-0 p-3 rounded-full ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100"} shadow-lg transition-all transform hover:scale-110`}
                title="Edit Profile"
              >
                <Edit2 className={`h-5 w-5 ${isDark ? "text-gray-300" : "text-orange-600"}`} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left text-black">
              <h1 className={`text-4xl md:text-5xl font-bold mb-2 ${isDark ? "text-white" : "text-black"}`}>
                {userData.name}
              </h1>
              <p className={`text-xl mb-4 ${isDark ? "text-gray-300" : "text-black/50"}`}>
                {userData.role}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? "bg-gray-800/50 text-gray-300" : "bg-white/20 text-black"} backdrop-blur-sm`}>
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{userData.email}</span>
                  <button
                    onClick={() => copyToClipboard(userData.email)}
                    className={`p-1 rounded transition-colors ${isDark ? "hover:bg-gray-700" : "hover:bg-white/30"}`}
                    title="Copy email"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {userData.phone && userData.phone !== "Not provided" && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? "bg-gray-800/50 text-gray-300" : "bg-white/20 text-white"} backdrop-blur-sm`}>
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{userData.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=" mx-auto  py-8 ">
        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Tasks Card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Total Tasks
                </h3>
                <div className={`p-3 rounded-xl ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                  <Target className="h-6 w-6" />
                </div>
              </div>
              <p className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {stats.totalTasks}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Activity className="h-3 w-3" />
                <span>All time</span>
              </div>
            </div>
          </div>

          {/* Completed Tasks Card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Completed
                </h3>
                <div className={`p-3 rounded-xl ${isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600"}`}>
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </div>
              <p className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {stats.completedTasks}
              </p>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {completionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Calls Made Card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Calls Made
                </h3>
                <div className={`p-3 rounded-xl ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                  <Phone className="h-6 w-6" />
                </div>
              </div>
              <p className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {stats.calls}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3" />
                <span>Active engagement</span>
              </div>
            </div>
          </div>

          {/* Meetings Card */}
          <div className={`relative overflow-hidden rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg hover:shadow-xl transition-shadow`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Meetings
                </h3>
                <div className={`p-3 rounded-xl ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <p className={`text-4xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {stats.meetings}
              </p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MessageSquare className="h-3 w-3" />
                <span>Scheduled sessions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Pending Tasks */}
          <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Pending Tasks
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Tasks in progress
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
                <Clock className="h-8 w-8" />
              </div>
            </div>
            <p className={`text-5xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              {stats.pendingTasks}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Out of {stats.totalTasks} total tasks</span>
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg ${stats.overdueTasks > 0 ? (isDark ? "border-red-500/50" : "border-red-200") : ""}`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-lg font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Overdue Tasks
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Requires attention
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                <XCircle className="h-8 w-8" />
              </div>
            </div>
            <p className={`text-5xl font-bold mb-2 ${stats.overdueTasks > 0 ? "text-red-600" : isDark ? "text-white" : "text-gray-900"}`}>
              {stats.overdueTasks}
            </p>
            {stats.overdueTasks > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="animate-pulse">⚠️ Action needed</span>
              </div>
            )}
            {stats.overdueTasks === 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>All tasks on track</span>
              </div>
            )}
          </div>
        </div>

        {/* Performance & Profile Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Summary */}
          <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${isDark ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-600"}`}>
                <Award className="h-6 w-6" />
              </div>
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Performance Summary
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Task Completion Rate
                  </span>
                  <span className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {completionRate}%
                  </span>
                </div>
                <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <p className={`text-xs font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Active Tasks
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {stats.pendingTasks}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <p className={`text-xs font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Total Activities
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {stats.calls + stats.meetings}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className={`rounded-2xl p-6 ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-lg`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-xl ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                <User className="h-6 w-6" />
              </div>
              <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Profile Information
              </h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Full Name
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData.name}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Email Address
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData.email}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Phone Number
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData.phone}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Role
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData.role}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
