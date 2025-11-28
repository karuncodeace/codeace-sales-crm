"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useTheme } from "../context/themeContext"
import Header from "../components/header";
import StatusDropdown from "../components/statusTooglebtn";
import PriorityDropdown from "../components/priorityTooglebtn";
import FilterBtn from "../components/filterbtn";
import AddLeadModal from "../components/addLeadModal";

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





export default function LeadsPage() {
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
    isSubmitting: false,
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
      isSubmitting: false,
    });
  };

  // Confirm status change with comment
  const handleConfirmStatusChange = async () => {
    const { leadId, newStatus, comment } = statusChangeModal;
    
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
          comments: comment,
          activity_type: `Status changed to ${newStatus}`,
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
        isSubmitting: false,
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
      isSubmitting: false,
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
    <div className="pl-5 md:pl-0 2xl:pl-0  w-[98%]">
      <div className="mt-10  flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-1">Leads Management</h1>
        </div>
        <div>
          <button 
            onClick={() => setOpenAddLead(true)}
            className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-orange-500 text-white hover:bg-orange-600 focus:outline-hidden focus:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none">
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
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Lead
          </button>
        </div>
      </div>

      <div className={`h-[calc(100vh-120px)] mt-8 mb-5 rounded-xl shadow-2xs overflow-hidden flex flex-col ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
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
            <div className="flex-1 overflow-y-auto overflow-x-auto">
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
                      "Lead Name",
                      "Phone",
                      "Email",
                      "Contact Name",
                      "Lead Source",
                      "Status",
                      "Assigned To",
                      "Last Activity",
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
                            <a
                              href={`mailto:${lead.email}`}
                              className={`text-sm font-medium  
                            ${theme === "dark" ? " text-gray-300   hover:text-blue-400" : " text-gray-900 hover:text-blue-600"}
                            `}
                            >
                              {lead.email}
                            </a>
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
                            <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              {lead.source}
                            </span>
                          </div>
                        </td>
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
                              {lead.lastActivity}
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
                                <div className={`absolute right-0 z-10 mt-2 w-36 rounded-lg border  text-sm font-medium  shadow-xl
                                ${theme === "dark" ? "bg-gray-800 text-gray-200 border-gray-700" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"}
                                `}>
                                  <button
                                    type="button"
                                    onClick={() => handleLeadClick(lead.id)}
                                    className={`flex w-full items-center px-4 py-2 
                                    ${theme === "dark" ? " hover:bg-gray-700  " : " hover:bg-gray-100  "}
                                  `}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className={`flex w-full items-center px-4 py-2 
                                    ${theme === "dark" ? " hover:bg-gray-700  " : " hover:bg-gray-100  "}
                                  `}
                                  >
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
          <div className={`px-6 py-6 overflow-x-auto divide-y-3 
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
            <div className="px-6 py-5">
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Add a comment explaining this status change..."
                className={`w-full p-3 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none ${
                  theme === "dark"
                    ? "bg-[#262626] border-gray-700 text-gray-200 placeholder:text-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                }`}
                rows={4}
                value={statusChangeModal.comment}
                onChange={(e) => setStatusChangeModal((prev) => ({ ...prev, comment: e.target.value }))}
                autoFocus
              />
              <p className={`mt-2 text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                This comment will be saved to the activity log.
              </p>
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
    </div>
  );
}
