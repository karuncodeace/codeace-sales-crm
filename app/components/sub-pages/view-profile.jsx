"use client";

import { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
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
  X,
  Upload,
  Save,
} from "lucide-react";

export default function ViewProfile() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [copied, setCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const fileInputRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch current user data from auth
  const { data: authUser, error: authError, isLoading: authLoading, mutate: mutateAuthUser } = useSWR(
    "profile-auth-user",
    async () => {
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      return user;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0, // Allow immediate revalidation after updates
    }
  );

  // Fetch sales persons data to get complete profile info
  const { data: salesPersonsData, mutate: mutateSalesPersons } = useSWR(
    "/api/sales-persons",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0, // Allow immediate revalidation after updates
    }
  );

  // Combine auth user data with sales_persons table data (first pass - without profile photo)
  const userDataInitial = authUser && salesPersonsData ? (() => {
    const normalizedAuthEmail = authUser.email?.toLowerCase().trim();
    const salesPerson = salesPersonsData.find(
      (sp) => sp.email?.toLowerCase().trim() === normalizedAuthEmail
    );

    return {
      id: authUser.id,
      email: authUser.email,
      name: salesPerson?.full_name || 
            authUser.user_metadata?.full_name || 
            authUser.user_metadata?.name || 
            authUser.email?.split('@')[0] || 
            "User",
      phone: salesPerson?.phone || 
             authUser.user_metadata?.phone || 
             "Not provided",
      role: salesPerson?.roles || 
            authUser.user_metadata?.role || 
            "Sales Person",
      salesPersonId: salesPerson?.id || null,
    };
  })() : null;

  // Fetch profile photo from profile_photos table
  const { data: profileData, mutate: mutateProfile } = useSWR(
    userDataInitial?.salesPersonId ? "/api/profile" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 0, // Allow immediate revalidation after updates
    }
  );

  // Combine auth user data with sales_persons table data (final - with profile photo)
  const userData = userDataInitial ? {
    ...userDataInitial,
    avatar: profileData?.photo_url ||
            authUser.user_metadata?.avatar_url || 
            null,
  } : null;

  const userLoading = authLoading || !salesPersonsData;
  const userError = authError;

  // Fetch user's tasks for stats
  const { data: tasksData, isLoading: tasksLoading } = useSWR(
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
    if (!tasksData || !Array.isArray(tasksData) || !userData) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        calls: 0,
        meetings: 0,
        overdueTasks: 0,
      };
    }

    // Filter tasks for current user - check both sales_person_id and assigned_to
    const userTasks = tasksData.filter((task) => {
      if (!task) return false;
      // Match by sales_person_id (from tasks_table)
      if (task.sales_person_id === userData.salesPersonId || task.sales_person_id === userData.id) {
        return true;
      }
      // Match by assigned_to (if field exists)
      if (task.assigned_to === userData.salesPersonId || task.assigned_to === userData.id) {
        return true;
      }
      return false;
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

    return {
      totalTasks: userTasks.length,
      completedTasks: userTasks.filter((t) => 
        t.status && t.status.toLowerCase() === "completed"
      ).length,
      pendingTasks: userTasks.filter((t) => 
        !t.status || t.status.toLowerCase() !== "completed"
      ).length,
      calls: userTasks.filter((t) => 
        t.type && t.type.toLowerCase() === "call"
      ).length,
      meetings: userTasks.filter((t) => 
        t.type && t.type.toLowerCase() === "meeting"
      ).length,
      overdueTasks: userTasks.filter((t) => {
        if (t.status && t.status.toLowerCase() === "completed") return false;
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < now;
      }).length,
    };
  };

  const stats = calculateStats();
  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100 * 10) / 10
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

  // Handle edit modal open
  const handleEditClick = () => {
    if (userData) {
      setEditFormData({
        name: userData.name || "",
        phone: userData.phone && userData.phone !== "Not provided" ? userData.phone : "",
      });
      setPhotoPreview(userData.avatar);
      setSelectedPhoto(null);
      setIsEditModalOpen(true);
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setSelectedPhoto(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userData?.salesPersonId) {
      alert("Unable to update profile. Please try again later.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", editFormData.name);
      formData.append("phone", editFormData.phone);
      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
      }

      // Force refresh all data sources
      // First, re-fetch auth user to get updated metadata (especially for avatar)
      const { data: { user: updatedUser } } = await supabaseBrowser.auth.getUser();
      
      // Clear all caches and force re-fetch - use mutate with revalidate option
      await Promise.all([
        mutateSalesPersons(undefined, { revalidate: true }),
        mutateAuthUser(updatedUser, { revalidate: false }),
        mutateProfile(undefined, { revalidate: true }),
      ]);
      
      // Wait a moment for the data to be fetched
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force another revalidation to ensure fresh data
      await Promise.all([
        mutateSalesPersons(),
        mutateProfile(),
      ]);
      
      // Force component re-render by updating refresh key
      setRefreshKey(prev => prev + 1);
      
      // Close modal and reset form
      setIsEditModalOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      
      // Show success message
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(error.message || "Failed to update profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsEditModalOpen(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setEditFormData({ name: "", phone: "" });
    }
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
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-2xl overflow-hidden ${
                userData?.avatar 
                  ? `${isDark ? "bg-gray-700 border-gray-600" : "bg-white/20 border-white/30"}`
                  : `bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 ${isDark ? "border-gray-600" : "border-orange-300"} text-white`
              }`}>
                {userData?.avatar ? (
                  <img
                    src={userData.avatar}
                    alt={userData?.name || "User"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      try {
                        e.target.style.display = 'none';
                        const parent = e.target?.parentElement;
                        if (parent) {
                          parent.className = `w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-2xl overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 ${isDark ? "border-gray-600" : "border-orange-300"} text-white`;
                          parent.innerHTML = `<span>${getInitials(userData?.name || "User")}</span>`;
                        }
                      } catch (err) {
                        console.error("Error handling image fallback:", err);
                      }
                    }}
                  />
                ) : (
                  <span className="select-none">{getInitials(userData?.name || "User")}</span>
                )}
              </div>
              <button
                onClick={handleEditClick}
                className={`absolute bottom-0 right-0 p-3 rounded-full ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100"} shadow-lg transition-all transform hover:scale-110`}
                title="Edit Profile"
              >
                <Edit2 className={`h-5 w-5 ${isDark ? "text-gray-300" : "text-orange-600"}`} />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left text-black">
              <h1 className={`text-4xl md:text-5xl font-bold mb-2 ${isDark ? "text-white" : "text-black"}`}>
                {userData?.name || "User"}
              </h1>
              <p className={`text-md mb-4 ${isDark ? "text-gray-300" : "text-black/50"}`}>
                {userData.role.charAt(0).toUpperCase() + userData.role.slice(1) || "Sales Person"}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? "bg-gray-800/50 text-gray-300" : "bg-gray-100/50 text-black"} backdrop-blur-sm`}>
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{userData?.email || ""}</span>
                  <button
                    onClick={() => copyToClipboard(userData?.email || "")}
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
                {userData?.phone && userData.phone !== "Not provided" && (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isDark ? "bg-gray-800/50 text-gray-300" : "bg-gray-100/50 text-black"} backdrop-blur-sm`}>
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
                {tasksLoading ? "..." : stats.totalTasks}
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
                {tasksLoading ? "..." : stats.completedTasks}
              </p>
              <div className="flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                    style={{ width: `${tasksLoading ? 0 : completionRate}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  {tasksLoading ? "..." : `${completionRate}%`}
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
                {tasksLoading ? "..." : stats.calls}
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
                {tasksLoading ? "..." : stats.meetings}
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
              {tasksLoading ? "..." : stats.pendingTasks}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Out of {tasksLoading ? "..." : stats.totalTasks} total tasks</span>
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
              {tasksLoading ? "..." : stats.overdueTasks}
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
                    {tasksLoading ? "..." : `${completionRate}%`}
                  </span>
                </div>
                <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 transition-all duration-500"
                    style={{ width: `${tasksLoading ? 0 : completionRate}%` }}
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
                    {tasksLoading ? "..." : stats.pendingTasks}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
                  <p className={`text-xs font-medium mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    Total Activities
                  </p>
                  <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {tasksLoading ? "..." : stats.calls + stats.meetings}
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
                  {userData?.name || "User"}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Email Address
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData?.email || ""}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Phone Number
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData?.phone || "Not provided"}
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-500"} block mb-2`}>
                  Role
                </label>
                <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-50 text-gray-900"} border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  {userData?.role || "Sales Person"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`relative w-full max-w-2xl rounded-2xl ${isDark ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"} shadow-2xl max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Edit Profile
              </h2>
              <button
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className={`p-2 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Photo Upload Section */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-lg overflow-hidden ${
                    photoPreview 
                      ? `${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-200 border-gray-300"}`
                      : `bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 ${isDark ? "border-gray-600" : "border-orange-300"} text-white`
                  }`}>
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="select-none">{getInitials(editFormData.name || userData?.name)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute bottom-0 right-0 p-2 rounded-full ${isDark ? "bg-gray-800 hover:bg-gray-700" : "bg-white hover:bg-gray-100"} shadow-lg transition-all transform hover:scale-110`}
                    title="Upload Photo"
                  >
                    <Upload className={`h-4 w-4 ${isDark ? "text-gray-300" : "text-orange-600"}`} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Click the upload icon to change your profile photo
                </p>
              </div>

              {/* Name Field */}
              <div>
                <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"} focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Phone Field */}
              <div>
                <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"} focus:outline-none focus:ring-2 focus:ring-orange-500`}
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={userData?.email || ""}
                  disabled
                  className={`w-full px-4 py-3 rounded-lg border ${isDark ? "bg-gray-800/50 border-gray-700 text-gray-500" : "bg-gray-100 border-gray-300 text-gray-500"} cursor-not-allowed`}
                />
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  Email cannot be changed
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-900"}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"} text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
