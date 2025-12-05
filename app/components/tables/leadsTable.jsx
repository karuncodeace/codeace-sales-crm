"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { Copy, Check, Mail } from "lucide-react";
import { supabaseBrowser } from "../../../lib/supabase/browserClient";

import StatusDropdown from "../buttons/statusTooglebtn";
import PriorityDropdown from "../buttons/priorityTooglebtn";
import FilterBtn from "../buttons/filterbtn";
import AddLeadModal from "../buttons/addLeadModal";
import EmailModal from "../ui/email-modal";

// Fetcher function for SWR - calls the API route
const fetchLeads = async () => {
  const res = await fetch("/api/leads");
  if (!res.ok) throw new Error("Failed to fetch leads");
  return res.json();
};


const statusStyles = {
  New: {
    light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100",
    dark: "text-blue-500 bg-blue-900/40 ring-1 ring-inset ring-blue-700",
  },
  Contacted: {
    light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
    dark: "text-amber-500 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
  },
  "Follow-Up": {
    light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
    dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
  },
  Qualified: {
    light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
    dark: "text-emerald-500 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
  },
  Proposal: {
    light: "text-yellow-700 bg-yellow-50 ring-1 ring-inset ring-yellow-100",
    dark: "text-yellow-500 bg-yellow-900/40 ring-1 ring-inset ring-yellow-700",
  },
  Noresponse: {
    light: "text-gray-700 bg-gray-50 ring-1 ring-inset ring-gray-200",
    dark: "text-gray-300 bg-gray-900/40 ring-1 ring-inset ring-gray-700",
  },
};

const priorityStyles = {
  Hot: {
    light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-200",
    dark: "text-red-300 bg-red-900/40 ring-1 ring-inset ring-red-800",
  },
  Warm: {
    light: "text-orange-700 bg-orange-50 ring-1 ring-inset ring-orange-200",
    dark: "text-orange-300 bg-orange-900/40 ring-1 ring-inset ring-orange-800",
  },
  Cold: {
    light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200",
    dark: "text-blue-300 bg-blue-900/40 ring-1 ring-inset ring-blue-800",
  },
};





export default function LeadsTable() {
  const router = useRouter();
  
  // SWR for cached data fetching - data persists across navigations
  const { data: leadData = [], mutate } = useSWR("leads", fetchLeads, {
    revalidateOnFocus: false,      // Don't refetch when window regains focus
    revalidateOnReconnect: false,  // Don't refetch on reconnect
    dedupingInterval: 60000,       // Dedupe requests within 60 seconds
  });
  const [openActions, setOpenActions] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [recentlyMovedLead, setRecentlyMovedLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState(false);
  const [openAddLead, setOpenAddLead] = useState(false);
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    recipientEmail: "",
    recipientName: "",
  });
  const [copiedEmailId, setCopiedEmailId] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    source: "",
    status: "",
    assignedTo: "",
    priority: "",
    type: "",
  });
  
  // Status change modal state
  const [statusChangeModal, setStatusChangeModal] = useState({
    isOpen: false,
    leadId: null,
    newStatus: null,
    comment: "",
    connectThrough: "",
    dueDate: "",
    isSubmitting: false,
    showCalendar: false,
  });
  

  const handleApplyFilters = (filters) => {
    setAdvancedFilters(filters);
  };

  const handleAddLead = (newLead) => {
    // Add new lead and revalidate from server
    mutate([newLead, ...leadData], true);
  };

  const handleLeadClick = (leadId) => {
    router.push(`/leads/${leadId}`);
  };

  const { theme } = useTheme();

  const statusDefinitions = useMemo(
    () => [
      { id: "New", name: "New", style: "border-l-4 border-[#3B82F6]" },
      { id: "Contacted", name: "Contacted", style: "border-l-4 border-[#10B981]" },
      { id: "Follow-Up", name: "Follow-Up", style: "border-l-4 border-[#EAB308]" },
      { id: "Qualified", name: "Qualified", style: "border-l-4 border-[#F97316]" },
      { id: "Proposal", name: "Proposal", style: "border-l-4 border-[#8B5CF6]" },
      { id: "Won", name: "Won", style: "border-l-4 border-[#22C55E]" },
      { id: "No Response", name: "No Response", style: "border-l-4 border-[#9CA3AF]" },
    ],
    []
  );

  const preferredStatuses = useMemo(
    () => statusDefinitions.map((status) => status.id),
    [statusDefinitions]
  );

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(leadData.map((lead) => lead.status))),
    [leadData]
  );

  const kanbanStatuses = useMemo(
    () =>
      [
        ...preferredStatuses,
        ...uniqueStatuses.filter((status) => !preferredStatuses.includes(status)),
      ].filter((status, index, self) => self.indexOf(status) === index),
    [preferredStatuses, uniqueStatuses]
  );

  const filteredLeads = useMemo(() => {
    let result = leadData;

    // Apply advanced filters
    if (advancedFilters.source) {
      result = result.filter((lead) => lead.source === advancedFilters.source);
    }
    if (advancedFilters.status) {
      result = result.filter((lead) => lead.status === advancedFilters.status);
    }
    if (advancedFilters.assignedTo) {
      result = result.filter((lead) => lead.assignedTo === advancedFilters.assignedTo);
    }
    if (advancedFilters.priority) {
      result = result.filter((lead) => lead.priority === advancedFilters.priority);
    }

    // Apply search
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      result = result.filter((lead) => {
        const haystack = [
          lead.name,
          lead.email,
          lead.phone,
          lead.id,
          lead.status,
          lead.assignedTo,
          lead.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return result;
  }, [leadData, searchTerm, advancedFilters]);

  const groupedLeads = useMemo(() => {
    return kanbanStatuses.reduce((acc, status) => {
      acc[status] = filteredLeads.filter((lead) => lead.status === status);
      return acc;
    }, {});
  }, [kanbanStatuses, filteredLeads]);

  const handleDragStart = (leadId) => {
    setDraggedLeadId(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStatus(null);
  };

  const handleDrop = async (status) => {
    if (!draggedLeadId) return;

    const leadId = draggedLeadId;
    const currentLead = leadData.find((lead) => lead.id === leadId);
    
    // Skip if status hasn't changed
    if (currentLead?.status === status) {
      setDraggedLeadId(null);
      setDragOverStatus(null);
      return;
    }

    // Optimistically update via SWR cache
    mutate(
      leadData.map((lead) =>
        lead.id === leadId ? { ...lead, status } : lead
      ),
      false
    );
    setRecentlyMovedLead(leadId);
    setDraggedLeadId(null);
    setDragOverStatus(null);

    // Persist to backend
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status }),
      });
      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      // Revalidate to restore correct state on error
      mutate();
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDragEnter = (status) => {
    setDragOverStatus(status);
  };

  const handleDragLeave = (status) => {
    setDragOverStatus((prev) => (prev === status ? null : prev));
  };

  // Open status change modal - requires comment
  const handleStatusUpdate = (leadId, newStatus) => {
    setStatusChangeModal({
      isOpen: true,
      leadId,
      newStatus,
      comment: "",
      connectThrough: "",
      dueDate: "",
      isSubmitting: false,
      showCalendar: false,
    });
  };

  // Get task title and type based on status
  const getTaskDetailsForStatus = (status, leadName) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === "contacted" || statusLower === "follow-up") {
      return { title: `Follow Up with ${leadName}`, type: "Follow Up" };
    }
    if (statusLower === "proposal") {
      return { title: "Follow Up", type: "Follow Up" };
    }
    if (statusLower === "qualified") {
      return { title: "Schedule Meeting", type: "Meeting" };
    }
    return null; // No task update for other statuses
  };

  // Confirm status change with comment
  const handleConfirmStatusChange = async () => {
    const { leadId, newStatus, comment, connectThrough, dueDate } = statusChangeModal;
    
    if (!comment.trim()) {
      alert("Please add a comment before changing status");
      return;
    }

    setStatusChangeModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // First, post the comment to task_activities
      const activityRes = await fetch("/api/task-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          activity: `Status changed to ${newStatus}`,
          type: "status",
          comments: comment,
          connect_through: connectThrough,
          due_date: dueDate || null,
        }),
      });

      if (!activityRes.ok) {
        throw new Error("Failed to save activity comment");
      }

      // Then update the lead status
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      // Update the task based on new status
      const lead = leadData.find((l) => l.id === leadId);
      const taskDetails = getTaskDetailsForStatus(newStatus, lead?.name || "Lead");
      
      if (taskDetails) {
        await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_id: leadId,
            title: taskDetails.title,
            type: taskDetails.type,
          }),
        });
      }

      // Optimistically update the UI
      mutate(
        leadData.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        ),
        false
      );

      // Close modal
      setStatusChangeModal({
        isOpen: false,
        leadId: null,
        newStatus: null,
        comment: "",
        connectThrough: "",
        dueDate: "",
        isSubmitting: false,
        showCalendar: false,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert(error.message);
      setStatusChangeModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Cancel status change
  const handleCancelStatusChange = () => {
    setStatusChangeModal({
      isOpen: false,
      leadId: null,
      newStatus: null,
      comment: "",
      connectThrough: "",
      dueDate: "",
      isSubmitting: false,
      showCalendar: false,
    });
  };

  const handlePriorityUpdate = async (leadId, newPriority) => {
    // Optimistically update the UI
    mutate(
      leadData.map((lead) =>
        lead.id === leadId ? { ...lead, priority: newPriority } : lead
      ),
      false // Don't revalidate
    );

    // Persist to backend
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, priority: newPriority }),
      });
      if (!res.ok) {
        throw new Error("Failed to update priority");
      }
    } catch (error) {
      console.error("Error updating priority:", error);
      // Revalidate to restore correct state on error
      mutate();
    }
  };
  useEffect(() => {
    if (!recentlyMovedLead) return;
    const timeout = setTimeout(() => setRecentlyMovedLead(null), 350);
    return () => clearTimeout(timeout);
  }, [recentlyMovedLead]);

  const handleToggleActions = (leadId) => {
    setOpenActions((prev) => (prev === leadId ? null : leadId));
  };
  useEffect(() => {
    if (!openActions) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-actions-menu="true"]')) {
        setOpenActions(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openActions]);

  return (
    <div className="">
      

      <div className={`h-[calc(100vh-180px)] mt-5 mb-5 rounded-xl shadow-2xs overflow-hidden flex flex-col ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
        {/* Header */}
        <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b  ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          {/* LEFT SIDE — Title + Search */}
          <div className="flex  gap-2 w-full md:w-auto">
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
                placeholder="Search leads, id's..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className={`w-full pl-2 pr-4 text-sm bg-transparent focus:outline-none ${theme === "dark"
                    ? "text-gray-200 placeholder:text-gray-500"
                    : "text-gray-900 placeholder:text-gray-400"
                  }`}
              />
            </div>
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
              <AddLeadModal open={openAddLead} onClose={() => setOpenAddLead(false)} onAdd={handleAddLead} />
            </div>
          </div>

          {/* RIGHT SIDE — Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1 md:pt-0">
            {/* View Toggle */}
            <div className={`inline-flex items-center border rounded-[10px] p-1 ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
              }`}>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-sm rounded-lg focus:outline-hidden transition ${viewMode === "table"
                    ? theme === "dark"
                      ? "bg-gray-700 text-white shadow-sm"
                      : "bg-white text-gray-900 shadow-sm"
                    : theme === "dark"
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                aria-pressed={viewMode === "table"}
                aria-label="Switch to table view"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  color="currentColor"
                  fill="none"
                >
                  <path
                    d="M20.1069 20.1088C18.7156 21.5001 16.4765 21.5001 11.9981 21.5001C7.51976 21.5001 5.28059 21.5001 3.88935 20.1088C2.49811 18.7176 2.49811 16.4784 2.49811 12.0001C2.49811 7.52172 2.49811 5.28255 3.88935 3.89131C5.28059 2.50006 7.51976 2.50006 11.9981 2.50006C16.4764 2.50006 18.7156 2.50006 20.1069 3.8913C21.4981 5.28255 21.4981 7.52172 21.4981 12.0001C21.4981 16.4784 21.4981 18.7176 20.1069 20.1088Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></path>
                  <path
                    d="M8.99811 21.5001L8.99811 2.50006"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="M21.4981 8.00006L2.49811 8.00006"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  ></path>
                  <path
                    d="M21.4981 16.0001H2.49811"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  ></path>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 text-sm rounded-lg focus:outline-hidden transition ${viewMode === "kanban"
                    ? theme === "dark"
                      ? "bg-gray-700 text-white shadow-sm"
                      : "bg-white text-gray-900 shadow-sm"
                    : theme === "dark"
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                aria-pressed={viewMode === "kanban"}
                aria-label="Switch to Kanban view"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 27 27"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15.75 19.75V7.75C15.75 7.28501 15.75 7.05252 15.6989 6.86177C15.5602 6.34413 15.1559 5.93981 14.6382 5.80111C14.4475 5.75 14.215 5.75 13.75 5.75C13.285 5.75 13.0525 5.75 12.8618 5.80111C12.3441 5.93981 11.9398 6.34413 11.8011 6.86177C11.75 7.05252 11.75 7.28501 11.75 7.75V19.75C11.75 20.215 11.75 20.4475 11.8011 20.6382C11.9398 21.1559 12.3441 21.5602 12.8618 21.6989C13.0525 21.75 13.285 21.75 13.75 21.75C14.215 21.75 14.4475 21.75 14.6382 21.6989C15.1559 21.5602 15.5602 21.1559 15.6989 20.6382C15.75 20.4475 15.75 20.215 15.75 19.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22.75 9.75V7.75C22.75 7.28501 22.75 7.05252 22.6989 6.86177C22.5602 6.34413 22.1559 5.93981 21.6382 5.80111C21.4475 5.75 21.215 5.75 20.75 5.75C20.285 5.75 20.0525 5.75 19.8618 5.80111C19.3441 5.93981 18.9398 6.34413 18.8011 6.86177C18.75 7.05252 18.75 7.28501 18.75 7.75V9.75C18.75 10.215 18.75 10.4475 18.8011 10.6382C18.9398 11.1559 19.3441 11.5602 19.8618 11.6989C20.0525 11.75 20.285 11.75 20.75 11.75C21.215 11.75 21.4475 11.75 21.6382 11.6989C22.1559 11.5602 22.5602 11.1559 22.6989 10.6382C22.75 10.4475 22.75 10.215 22.75 9.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.75 13.75V7.75C8.75 7.28501 8.75 7.05252 8.69889 6.86177C8.56019 6.34413 8.15587 5.93981 7.63823 5.80111C7.44748 5.75 7.21499 5.75 6.75 5.75C6.28501 5.75 6.05252 5.75 5.86177 5.80111C5.34413 5.93981 4.93981 6.34413 4.80111 6.86177C4.75 7.05252 4.75 7.28501 4.75 7.75V13.75C4.75 14.215 4.75 14.4475 4.80111 14.6382C4.93981 15.1559 5.34413 15.5602 5.86177 15.6989C6.05252 15.75 6.28501 15.75 6.75 15.75C7.21499 15.75 7.44748 15.75 7.63823 15.6989C8.15587 15.5602 8.56019 15.1559 8.69889 14.6382C8.75 14.4475 8.75 14.215 8.75 13.75Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23.9195 2.58058C25.75 4.41117 25.75 7.35745 25.75 13.25C25.75 19.1425 25.75 22.0888 23.9195 23.9195C22.0888 25.75 19.1425 25.75 13.25 25.75C7.35745 25.75 4.41117 25.75 2.58058 23.9195C0.75 22.0888 0.75 19.1425 0.75 13.25C0.75 7.35745 0.75 4.41117 2.58058 2.58058C4.41117 0.75 7.35745 0.75 13.25 0.75C19.1425 0.75 22.0888 0.75 23.9195 2.58058Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/*Table view*/}
        {viewMode === "table" ? (
          <>
            {/* Table */}
            <div className="flex-1 overflow-y-auto overflow-x-auto h-[calc(100vh-200px)]">
              <table className={`min-w-full divide-y ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                <thead className={`  ${theme === "dark" ? "bg-[#262626] text-gray-300" : "bg-gray-50"}`}>
                  <tr>
                    <th scope="col" className="ps-6 py-3 text-start">
                      <label htmlFor="lead-select-all" className="flex">
                        <input
                          type="checkbox"
                          className="shrink-0 size-4 accent-red-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                          id="lead-select-all"
                        />
                      </label>
                    </th>

                    {[
                      "Contact Name",
                      "Lead Name"
,                     "Phone",
                      "Email",
                      
                      "Status",
                      "Assigned To",
                      "Created At",
                      "Priority",
                      "Actions",
                    ].map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-6 py-3 text-start"
                      >
                        <div className="flex items-center  gap-x-2">
                          <span className="text-xs font-semibold uppercase  ">
                            {column}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className={`divide-y  overflow-y-auto ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}`}>
                  {filteredLeads.length === 0 ? (
                   <tr>
                   <td colSpan={11} className="px-6 py-10 text-center">
                     <div className="flex items-center justify-center gap-2">
                       <div className="h-3 w-3 bg-orange-500/50 rounded-full animate-bounce"></div>
                       <div className="h-3 w-3 bg-orange-500/50 rounded-full animate-bounce [animation-delay:0.15s]"></div>
                       <div className="h-3 w-3 bg-orange-500/50 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                     </div>
                     <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">Loading leads…</p>
                   </td>
                 </tr>
                 
                  
                  
                  
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr key={lead.id}>
                        <td className="size-px whitespace-nowrap">
                          <div className="ps-6 py-2">
                            <label
                              htmlFor={`lead-${lead.id}`}
                              className="flex"
                            >
                              <input
                                type="checkbox"
                                className="shrink-0 size-4 accent-red-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                id={`lead-${lead.id}`}
                              />
                              <span className="sr-only">
                                Select {lead.name}
                              </span>
                            </label>
                          </div>
                        </td>
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                              {lead.contactName || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <div className="flex items-center gap-x-3">

                              <div 
                                className="flex flex-col cursor-pointer"
                                onClick={() => handleLeadClick(lead.id)}
                              >
                                <span className={`text-sm font-medium hover:text-orange-500 transition-colors ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                  {lead.name}
                                </span>
                                <span className={`text-xs  ${theme === "dark" ? "text-gray-400/80" : "text-gray-500"}`}>
                                  {lead.id}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <a
                              href={`tel:${lead.phone.replace(
                                /[^0-9+]/g,
                                ""
                              )}`}
                              className={`text-sm font-medium  
                            ${theme === "dark" ? " text-gray-300 hover:text-orange-400" : " text-gray-900 hover:text-orange-800"}
                            `}
                            >
                              {lead.phone}
                            </a>
                          </div>
                        </td>
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            {lead.email ? (
                              <div className="flex items-center gap-2 group">
                                <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                  {lead.email}
                                </span>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await navigator.clipboard.writeText(lead.email);
                                      setCopiedEmailId(lead.id);
                                      setTimeout(() => setCopiedEmailId(null), 2000);
                                    } catch (err) {
                                      console.error('Failed to copy:', err);
                                    }
                                  }}
                                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded  ${
                                    theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                                  }`}
                                  title="Copy email"
                                >
                                  {copiedEmailId === lead.id ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>—</span>
                            )}
                          </div>
                        </td>
                       {/*
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              {lead.source}
                            </span>
                          </div>
                        </td>
*/}
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <StatusDropdown
                              value={lead.status}
                              theme={theme}
                              onChange={(newStatus) => handleStatusUpdate(lead.id, newStatus)}
                            />
                          </div>
                        </td>
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              {lead.assignedTo}
                            </span>
                          </div>
                        </td>
                        
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              {lead.createdAt}
                            </span>
                          </div>
                        </td>
                        <td className="size-px whitespace-nowrap">
                          <div className="px-6 py-2">
                            <PriorityDropdown
                              value={lead.priority}
                              theme={theme}
                              onChange={(newPriority) => handlePriorityUpdate(lead.id, newPriority)}
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
                                onClick={() => handleToggleActions(lead.id)}
                                className={`inline-flex items-center justify-center rounded-full border p-2 text-gray-500 hover:text-gray-900  focus:outline-hidden 
                                ${theme === "dark" ? "border-gray-700 text-gray-400" : "border-gray-200 hover:border-gray-300 text-gray-700 "}
                                `}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  width="20"
                                  height="20"
                                  fill="none"
                                  className="currentColor"

                                >
                                  <path
                                    d="M11.9967 11.5C12.549 11.5 12.9967 11.9477 12.9967 12.5C12.9967 13.0523 12.549 13.5 11.9967 13.5C11.4444 13.5 10.9967 13.0523 10.9967 12.5C10.9967 11.9477 11.4444 11.5 11.9967 11.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M11.9967 5.5C12.549 5.5 12.9967 5.94772 12.9967 6.5C12.9967 7.05228 12.549 7.5 11.9967 7.5C11.4444 7.5 10.9967 7.05228 10.9967 6.5C10.9967 5.94772 11.4444 5.5 11.9967 5.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M11.9967 17.5C12.549 17.5 12.9967 17.9477 12.9967 18.5C12.9967 19.0523 12.549 19.5 11.9967 19.5C11.4444 19.5 10.9967 19.0523 10.9967 18.5C10.9967 17.9477 11.4444 17.5 11.9967 17.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>

                              {openActions === lead.id && (
                                <div className={`absolute right-0 z-10 mt-2 w-40 rounded-lg border text-sm font-medium shadow-xl
                                ${theme === "dark" ? "bg-gray-800 text-gray-200 border-gray-700" : "bg-white text-gray-700 border-gray-200"}
                                `}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleLeadClick(lead.id);
                                      setOpenActions(null);
                                    }}
                                    className={`flex w-full items-center gap-2 px-4 py-2 transition-colors
                                    ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                                  `}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEmailModal({
                                        isOpen: true,
                                        recipientEmail: lead.email,
                                        recipientName: lead.name,
                                      });
                                      setOpenActions(null);
                                    }}
                                    disabled={!lead.email}
                                    className={`flex w-full items-center gap-2 px-4 py-2 transition-colors
                                    ${lead.email
                                      ? theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                      : theme === "dark" ? "text-gray-600 cursor-not-allowed opacity-50" : "text-gray-400 cursor-not-allowed opacity-50"
                                    }
                                  `}
                                  >
                                    <Mail className="w-4 h-4" />
                                    Send Email
                                  </button>
                                  <button
                                    type="button"
                                    className={`flex w-full items-center gap-2 px-4 py-2 transition-colors
                                    ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                                  `}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                </div>
                              )}
                            </div>
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
            <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t  ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <div className="inline-flex items-center gap-x-2">
                <p className={`text-sm ${theme === "dark" ? "text-gray-400/80" : "text-gray-600"}`}>Showing:10 of 20</p>
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
          </>
        ) : (
          <div className={`px-6 py-6 overflow-x-auto divide-y-3 h-[calc(100vh-190px)] 
          ${theme === "dark" ? "divide-gray-700" : "divide-gray-200"}
          `}>
            <div className="flex items-start gap-4 ">
              {kanbanStatuses.map((status) => {
                const statusMeta =
                  statusDefinitions.find((definition) => definition.id === status) ||
                  null;

                return (
                  <div
                    key={status}
                    className={`flex min-w-[350px] flex-col r ${theme === "dark" ? "bg-transparent" : "bg-white"}  transition-all duration-200 ease-out  ${dragOverStatus === status
                      ? "ring-1  shadow-sm scale-[1.01]"
                      : "ring-1 ring-transparent"
                      }`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(status)}
                    onDragLeave={() => handleDragLeave(status)}
                    onDrop={() => handleDrop(status)}
                  >
                    <div
                      className={`flex items-center justify-between p-2 ${theme === "dark" ? "bg-gray-800/10" : "bg-gray-100/50"} rounded-lg ${statusMeta?.style || "border-l-4 border-[#d4d4d8]"
                        }`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
                          {statusMeta?.name || status}
                        </p>
                        <p className={`text-xs ${theme === "dark" ? "text-gray-400/80" : "text-gray-500"}`}>
                          {groupedLeads[status]?.length || 0} Leads
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border focus:outline-hidden focus:ring-2 focus:ring-orange-200 ${theme === "dark"
                            ? "border-gray-600 bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                          }`}
                        aria-label={`Add lead to ${status}`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                    </div>
                    <div
                      className="mt-4 space-y-3 min-h-[100px]"
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(status)}
                    >
                      {groupedLeads[status] && groupedLeads[status].length > 0 ? (
                        groupedLeads[status].map((lead) => (
                          <div
                            key={lead.id}
                            className={`rounded-lg border border-dashed p-3 shadow-2xs cursor-move transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:shadow-xs ${theme === "dark"
                                ? "border-gray-600 bg-gray-800/10"
                                : "border-gray-200 bg-white"
                              } ${draggedLeadId === lead.id
                                ? "opacity-70 scale-[0.97]"
                                : ""
                              } ${recentlyMovedLead === lead.id
                                ? "animate-card-drop ring-1 ring-orange-200"
                                : ""
                              }`}
                            draggable
                            aria-grabbed={draggedLeadId === lead.id}
                            onDragStart={() => handleDragStart(lead.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onClick={() => handleLeadClick(lead.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`text-md font-bold hover:text-orange-500 transition-colors ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
                                  {lead.name}
                                </p>
                                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{lead.id}</p>
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityStyles[lead.priority]?.[theme === "dark" ? "dark" : "light"] ||
                                  "text-gray-700 bg-gray-100 ring-1 ring-inset ring-gray-200"
                                  }`}
                              >
                                {lead.priority}
                              </span>
                            </div>
                            <div className={`mt-5 space-y-2 text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                  Assigned to
                                </span>
                                <span>{lead.assignedTo}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                  Activity
                                </span>
                                <span>{lead.lastActivity}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                                  Created
                                </span>
                                <span>{lead.createdAt}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={`rounded-lg border border-dashed p-3 text-center text-sm ${theme === "dark"
                            ? "border-gray-600 bg-gray-800/10 text-gray-400"
                            : "border-gray-300 bg-white text-gray-500"
                          }`}>
                          No leads yet
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status Change Comment Modal */}
      {statusChangeModal.isOpen && (
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
                  <h2 className="text-lg font-semibold">Change Status</h2>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                    Changing to: <span className="font-medium text-orange-500">{statusChangeModal.newStatus}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelStatusChange}
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
                      onClick={() => setStatusChangeModal((prev) => ({ ...prev, connectThrough: option.id }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                        statusChangeModal.connectThrough === option.id
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

              {/* Due Date */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Due Date
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStatusChangeModal((prev) => ({ ...prev, showCalendar: !prev.showCalendar }))}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 ${
                      statusChangeModal.dueDate
                        ? "border-orange-500 bg-orange-500/5"
                        : theme === "dark"
                          ? "border-gray-700 hover:border-gray-600"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${statusChangeModal.dueDate ? "bg-orange-500/20 text-orange-500" : theme === "dark" ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className={`text-sm ${statusChangeModal.dueDate ? (theme === "dark" ? "text-gray-200" : "text-gray-900") : (theme === "dark" ? "text-gray-500" : "text-gray-400")}`}>
                        {statusChangeModal.dueDate 
                          ? new Date(statusChangeModal.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          : "Select a due date"
                        }
                      </span>
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${statusChangeModal.showCalendar ? "rotate-180" : ""} ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Calendar Dropdown */}
                  {statusChangeModal.showCalendar && (
                    <div className={`absolute z-50 mt-2 w-full p-4 rounded-2xl shadow-2xl border ${theme === "dark" ? "bg-[#1f1f1f] border-gray-700" : "bg-white border-gray-200"}`}>
                      {/* Quick Select Options */}
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                        Quick Select
                      </p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {[
                          { label: "Today", days: 0 },
                          { label: "Tomorrow", days: 1 },
                          { label: "In 3 days", days: 3 },
                          { label: "In a week", days: 7 },
                        ].map((option) => {
                          const date = new Date();
                          date.setDate(date.getDate() + option.days);
                          const dateStr = date.toISOString().split('T')[0];
                          const isSelected = statusChangeModal.dueDate === dateStr;
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => setStatusChangeModal((prev) => ({ ...prev, dueDate: dateStr, showCalendar: false }))}
                              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                isSelected
                                  ? "bg-orange-500 text-white"
                                  : theme === "dark"
                                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Divider */}
                      <div className={`flex items-center gap-3 my-4 ${theme === "dark" ? "text-gray-600" : "text-gray-300"}`}>
                        <div className="flex-1 h-px bg-current"></div>
                        <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>or pick a date</span>
                        <div className="flex-1 h-px bg-current"></div>
                      </div>
                      
                      {/* Custom Date Input */}
                      <div className={`p-3 rounded-xl border-2 border-dashed ${theme === "dark" ? "border-gray-700 bg-gray-800/30" : "border-gray-200 bg-gray-50"}`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-1.5 rounded-lg ${theme === "dark" ? "bg-orange-500/20" : "bg-orange-100"}`}>
                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className={`text-xs font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                            Custom Date
                          </span>
                        </div>
                        <input
                          type="date"
                          value={statusChangeModal.dueDate}
                          onChange={(e) => setStatusChangeModal((prev) => ({ ...prev, dueDate: e.target.value, showCalendar: false }))}
                          className={`w-full p-3 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 cursor-pointer ${
                            theme === "dark"
                              ? "bg-[#262626] border-gray-600 text-gray-200 hover:border-gray-500"
                              : "bg-white border-gray-200 text-gray-900 hover:border-gray-300"
                          }`}
                        />
                      </div>
                      
                      {/* Clear button */}
                      {statusChangeModal.dueDate && (
                        <button
                          type="button"
                          onClick={() => setStatusChangeModal((prev) => ({ ...prev, dueDate: "" }))}
                          className={`mt-3 w-full py-2.5 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            theme === "dark"
                              ? "text-red-400 hover:bg-red-500/10 border border-red-500/20"
                              : "text-red-500 hover:bg-red-50 border border-red-200"
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Clear date
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="Add a comment explaining this status change..."
                  className={`w-full p-3 rounded-xl border-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none ${
                    theme === "dark"
                      ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                      : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                  }`}
                  rows={3}
                  value={statusChangeModal.comment}
                  onChange={(e) => setStatusChangeModal((prev) => ({ ...prev, comment: e.target.value }))}
                  autoFocus
                />
                <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                  This will be saved to the activity log.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex justify-end gap-3 px-6 py-4 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
              <button
                onClick={handleCancelStatusChange}
                disabled={statusChangeModal.isSubmitting}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                disabled={statusChangeModal.isSubmitting || !statusChangeModal.comment.trim()}
                className="px-5 py-2.5 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {statusChangeModal.isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
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
                    Confirm Change
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      <EmailModal
        open={emailModal.isOpen}
        onClose={() => setEmailModal({ isOpen: false, recipientEmail: "", recipientName: "" })}
        recipientEmail={emailModal.recipientEmail}
        recipientName={emailModal.recipientName}
      />

    </div>
  );
}
