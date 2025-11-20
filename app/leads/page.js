"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../components/header";
const statusStyles = {
  New: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100",
  Contacted: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
  "Follow-up": "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
  Qualified:
    "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
};

const priorityStyles = {
  Hot: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-100",
  Warm: "text-orange-700 bg-orange-50 ring-1 ring-inset ring-orange-100",
  Cold: "text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200",
};

const initialLeads = [
  {
    id: "LD-1203",
    name: "Guideline Labs",
    initials: "GL",
    phone: "+1 (555) 204-8890",
    email: "amanda@site.com",
    source: "Meta Ads",
    status: "New",
    assignedTo: "Sarah Lin",
    lastActivity: "Call done · 45m ago",
    createdAt: "Nov 12, 2025",
    priority: "Hot",
  },
  {
    id: "LD-1188",
    name: "Northwind Foods",
    initials: "NF",
    phone: "+1 (555) 449-1100",
    email: "matthew@northwind.io",
    source: "Google Ads",
    status: "Contacted",
    assignedTo: "Jorge Patel",
    lastActivity: "Meeting done · Yesterday",
    createdAt: "Nov 3, 2025",
    priority: "Warm",
  },
  {
    id: "LD-1172",
    name: "Lumina Studio",
    initials: "LS",
    phone: "+1 (555) 300-7770",
    email: "hello@lumina.studio",
    source: "Referral",
    status: "Follow-up",
    assignedTo: "Priya Nair",
    lastActivity: "Call scheduled · Tomorrow",
    createdAt: "Oct 27, 2025",
    priority: "Cold",
  },

  // --- Additional 12 Leads ---
  {
    id: "LD-1210",
    name: "Evergreen Solutions",
    initials: "ES",
    phone: "+1 (555) 980-3321",
    email: "contact@evergreensol.com",
    source: "LinkedIn",
    status: "New",
    assignedTo: "Sarah Lin",
    lastActivity: "Form submitted · 10m ago",
    createdAt: "Nov 18, 2025",
    priority: "Hot",
  },
  {
    id: "LD-1208",
    name: "Brightwave Media",
    initials: "BM",
    phone: "+1 (555) 722-5541",
    email: "team@brightwave.media",
    source: "Google Ads",
    status: "Contacted",
    assignedTo: "Jorge Patel",
    lastActivity: "Email sent · 1h ago",
    createdAt: "Nov 15, 2025",
    priority: "Warm",
  },
  {
    id: "LD-1201",
    name: "Pioneer Logistics",
    initials: "PL",
    phone: "+1 (555) 410-9981",
    email: "support@pioneerlogi.com",
    source: "Cold Outreach",
    status: "No Response",
    assignedTo: "Rachel Kim",
    lastActivity: "Voicemail left · 2 days ago",
    createdAt: "Nov 10, 2025",
    priority: "Cold",
  },
  {
    id: "LD-1196",
    name: "Zenith Apparel",
    initials: "ZA",
    phone: "+1 (555) 201-4420",
    email: "info@zenithapparel.co",
    source: "Meta Ads",
    status: "New",
    assignedTo: "Sarah Lin",
    lastActivity: "Form submitted · 30m ago",
    createdAt: "Nov 7, 2025",
    priority: "Hot",
  },
  {
    id: "LD-1190",
    name: "Harbor Tech",
    initials: "HT",
    phone: "+1 (555) 662-9910",
    email: "contact@harbortech.dev",
    source: "Referral",
    status: "Qualified",
    assignedTo: "Priya Nair",
    lastActivity: "Proposal sent · Today",
    createdAt: "Nov 1, 2025",
    priority: "Warm",
  },
  {
    id: "LD-1182",
    name: "Orbit Consultancy",
    initials: "OC",
    phone: "+1 (555) 389-6541",
    email: "hello@orbit.consult",
    source: "Google Ads",
    status: "Follow-up",
    assignedTo: "Jorge Patel",
    lastActivity: "Follow-up email · 3h ago",
    createdAt: "Oct 29, 2025",
    priority: "Cold",
  },
  {
    id: "LD-1179",
    name: "Silverline Fintech",
    initials: "SF",
    phone: "+1 (555) 520-7333",
    email: "team@silverlinefin.com",
    source: "LinkedIn",
    status: "New",
    assignedTo: "Rachel Kim",
    lastActivity: "Lead added · Today",
    createdAt: "Oct 28, 2025",
    priority: "Hot",
  },
  {
    id: "LD-1175",
    name: "Crestwood Realty",
    initials: "CR",
    phone: "+1 (555) 300-1129",
    email: "contact@crestwoodrealty.us",
    source: "Cold Outreach",
    status: "Contacted",
    assignedTo: "Priya Nair",
    lastActivity: "Call done · 4h ago",
    createdAt: "Oct 27, 2025",
    priority: "Warm",
  },
  {
    id: "LD-1168",
    name: "Maple Ridge Farms",
    initials: "MR",
    phone: "+1 (555) 473-0001",
    email: "hello@mapleridge.farm",
    source: "Organic Search",
    status: "New",
    assignedTo: "Sarah Lin",
    lastActivity: "Site visit · 2h ago",
    createdAt: "Oct 20, 2025",
    priority: "Cold",
  },
  {
    id: "LD-1165",
    name: "UrbanKite Designs",
    initials: "UD",
    phone: "+1 (555) 299-7728",
    email: "design@urbankite.co",
    source: "Referral",
    status: "Qualified",
    assignedTo: "Jorge Patel",
    lastActivity: "Meeting scheduled · Tomorrow",
    createdAt: "Oct 18, 2025",
    priority: "Warm",
  },
  {
    id: "LD-1162",
    name: "Summit Accounting",
    initials: "SA",
    phone: "+1 (555) 930-4417",
    email: "info@summitacct.com",
    source: "LinkedIn",
    status: "No Response",
    assignedTo: "Rachel Kim",
    lastActivity: "Email opened · 2 days ago",
    createdAt: "Oct 15, 2025",
    priority: "Cold",
  },
];

export default function LeadsPage() {
  const [leadData, setLeadData] = useState(initialLeads);
  const [openActions, setOpenActions] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [recentlyMovedLead, setRecentlyMovedLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const statusDefinitions = useMemo(
    () => [
      { id: "New", name: "New", style: "border-l-4 border-[#3B82F6]" },
      { id: "Contacted", name: "Contacted", style: "border-l-4 border-[#10B981]" },
      { id: "Follow-up", name: "Follow-up", style: "border-l-4 border-[#EAB308]" },
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
    if (!searchTerm.trim()) return leadData;
    const query = searchTerm.trim().toLowerCase();
    return leadData.filter((lead) => {
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
  }, [leadData, searchTerm]);

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

  const handleDrop = (status) => {
    if (!draggedLeadId) return;

    setLeadData((prev) =>
      prev.map((lead) =>
        lead.id === draggedLeadId && lead.status !== status
          ? { ...lead, status }
          : lead
      )
    );
    setRecentlyMovedLead(draggedLeadId);
    setDraggedLeadId(null);
    setDragOverStatus(null);
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
    <div className="pl-5 pr-8 w-full pb-10">
      <div className="mt-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-1">Leads Management</h1>
        </div>
        <div>
          <button className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-orange-500 text-white hover:bg-orange-600 focus:outline-hidden focus:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none">
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
            Create
          </button>
        </div>
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-2xs  overflow-x-hidden ">
        {/* Header */}
        <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b border-gray-200">
          {/* LEFT SIDE — Title + Search */}
          <div className="flex  gap-2 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative w-full md:w-80  flex items-center border border-gray-200 rounded-[10px] pl-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 text-gray-500"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0011.15 11.15z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search leads,id's..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-2 pr-4 text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center">
              {/* Filter Button */}
              <button className=" py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-100">
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
            </div>
          </div>

          {/* RIGHT SIDE — Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1 md:pt-0">
            {/* View Toggle */}
            <div className="inline-flex items-center bg-white border border-gray-200 rounded-[10px] p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-sm rounded-full focus:outline-hidden transition ${
                  viewMode === "table"
                    ? "bg-gray-100 text-black shadow-sm"
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
                className={`px-3 py-1.5 text-sm rounded-full focus:outline-hidden transition ${
                  viewMode === "kanban"
                    ? "bg-gray-100 text-black shadow-sm"
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
                    stroke="#141B34"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22.75 9.75V7.75C22.75 7.28501 22.75 7.05252 22.6989 6.86177C22.5602 6.34413 22.1559 5.93981 21.6382 5.80111C21.4475 5.75 21.215 5.75 20.75 5.75C20.285 5.75 20.0525 5.75 19.8618 5.80111C19.3441 5.93981 18.9398 6.34413 18.8011 6.86177C18.75 7.05252 18.75 7.28501 18.75 7.75V9.75C18.75 10.215 18.75 10.4475 18.8011 10.6382C18.9398 11.1559 19.3441 11.5602 19.8618 11.6989C20.0525 11.75 20.285 11.75 20.75 11.75C21.215 11.75 21.4475 11.75 21.6382 11.6989C22.1559 11.5602 22.5602 11.1559 22.6989 10.6382C22.75 10.4475 22.75 10.215 22.75 9.75Z"
                    stroke="#141B34"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.75 13.75V7.75C8.75 7.28501 8.75 7.05252 8.69889 6.86177C8.56019 6.34413 8.15587 5.93981 7.63823 5.80111C7.44748 5.75 7.21499 5.75 6.75 5.75C6.28501 5.75 6.05252 5.75 5.86177 5.80111C5.34413 5.93981 4.93981 6.34413 4.80111 6.86177C4.75 7.05252 4.75 7.28501 4.75 7.75V13.75C4.75 14.215 4.75 14.4475 4.80111 14.6382C4.93981 15.1559 5.34413 15.5602 5.86177 15.6989C6.05252 15.75 6.28501 15.75 6.75 15.75C7.21499 15.75 7.44748 15.75 7.63823 15.6989C8.15587 15.5602 8.56019 15.1559 8.69889 14.6382C8.75 14.4475 8.75 14.215 8.75 13.75Z"
                    stroke="#141B34"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M23.9195 2.58058C25.75 4.41117 25.75 7.35745 25.75 13.25C25.75 19.1425 25.75 22.0888 23.9195 23.9195C22.0888 25.75 19.1425 25.75 13.25 25.75C7.35745 25.75 4.41117 25.75 2.58058 23.9195C0.75 22.0888 0.75 19.1425 0.75 13.25C0.75 7.35745 0.75 4.41117 2.58058 2.58058C4.41117 0.75 7.35745 0.75 13.25 0.75C19.1425 0.75 22.0888 0.75 23.9195 2.58058Z"
                    stroke="#141B34"
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="ps-6 py-3 text-start">
                    <label htmlFor="lead-select-all" className="flex">
                      <input
                        type="checkbox"
                        className="shrink-0 border-gray-300 rounded-sm text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
                        id="lead-select-all"
                      />
                      <span className="sr-only">Select all leads</span>
                    </label>
                  </th>

                  {[
                    "Lead Name",
                    "Phone",
                    "Email",
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
                        <span className="text-xs font-semibold uppercase text-gray-800 ">
                          {column}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 overflow-y-auto ">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-6 py-10 text-center text-sm text-gray-500"
                    >
                      No leads match “{searchTerm.trim()}”. Try a different search.
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
                            className="shrink-0 border-gray-300 rounded-sm text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
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
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                            {lead.initials}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {lead.name}
                            </span>
                            <span className="text-xs text-gray-500">
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
                          className="text-sm font-medium text-gray-600 hover:text-orange-800"
                        >
                          {lead.phone}
                        </a>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600"
                        >
                          {lead.email}
                        </a>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <span className="text-sm text-gray-600">
                          {lead.source}
                        </span>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            statusStyles[lead.status] ||
                            "text-gray-700 bg-gray-100 ring-1 ring-inset ring-gray-200"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <span className="text-sm text-gray-600">
                          {lead.assignedTo}
                        </span>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <span className="text-sm text-gray-600">
                          {lead.lastActivity}
                        </span>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <span className="text-sm text-gray-600">
                          {lead.createdAt}
                        </span>
                      </div>
                    </td>
                    <td className="size-px whitespace-nowrap">
                      <div className="px-6 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            priorityStyles[lead.priority] ||
                            "text-gray-700 bg-gray-100 ring-1 ring-inset ring-gray-200"
                          }`}
                        >
                          {lead.priority}
                        </span>
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
                            className="inline-flex items-center justify-center rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-900 hover:border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              width="20"
                              height="20"
                              fill="none"
                              className="text-gray-700"
                            >
                              <path
                                d="M11.9967 11.5C12.549 11.5 12.9967 11.9477 12.9967 12.5C12.9967 13.0523 12.549 13.5 11.9967 13.5C11.4444 13.5 10.9967 13.0523 10.9967 12.5C10.9967 11.9477 11.4444 11.5 11.9967 11.5Z"
                                stroke="#141B34"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11.9967 5.5C12.549 5.5 12.9967 5.94772 12.9967 6.5C12.9967 7.05228 12.549 7.5 11.9967 7.5C11.4444 7.5 10.9967 7.05228 10.9967 6.5C10.9967 5.94772 11.4444 5.5 11.9967 5.5Z"
                                stroke="#141B34"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M11.9967 17.5C12.549 17.5 12.9967 17.9477 12.9967 18.5C12.9967 19.0523 12.549 19.5 11.9967 19.5C11.4444 19.5 10.9967 19.0523 10.9967 18.5C10.9967 17.9477 11.4444 17.5 11.9967 17.5Z"
                                stroke="#141B34"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>

                          {openActions === lead.id && (
                            <div className="absolute right-0 z-10 mt-2 w-36 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-xl">
                              {["View", "Edit", "Convert"].map(
                                (action) => (
                                  <button
                                    key={action}
                                    type="button"
                                    className="flex w-full items-center px-4 py-2 hover:bg-gray-50"
                                  >
                                    {action}
                                  </button>
                                )
                              )}
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
            {/* End Table */}

            {/* Footer */}
            <div className="px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t border-gray-200">
              <div className="inline-flex items-center gap-x-2">
                <p className="text-sm text-gray-600">Showing:10 of 20</p>
              </div>

              <div>
                <div className="inline-flex gap-x-2">
                  <button
                    type="button"
                    className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
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
                    className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-2xs hover:bg-gray-50 focus:outline-hidden focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
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
          <div className="px-6 py-6 overflow-x-auto divide-y-3 divide-gray-200 ">
            <div className="flex items-start gap-4 ">
              {kanbanStatuses.map((status) => {
                const statusMeta =
                  statusDefinitions.find((definition) => definition.id === status) ||
                  null;

                return (
                  <div
                    key={status}
                    className={`flex min-w-[350px] flex-col r bg-white  transition-all duration-200 ease-out ring-offset-2 ${
                      dragOverStatus === status
                        ? "ring-1  shadow-sm scale-[1.01]"
                        : "ring-1 ring-transparent"
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(status)}
                    onDragLeave={() => handleDragLeave(status)}
                    onDrop={() => handleDrop(status)}
                  >
                    <div
                      className={`flex items-center justify-between p-2 bg-gray-100/50 rounded-lg ${
                        statusMeta?.style || "border-l-4 border-[#d4d4d8]"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {statusMeta?.name || status}
                        </p>
                        <p className="text-xs text-gray-500">
                          {groupedLeads[status]?.length || 0} Leads
                        </p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-orange-200"
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
                    <div className="mt-4 space-y-3">
                      {groupedLeads[status] && groupedLeads[status].length > 0 ? (
                        groupedLeads[status].map((lead) => (
                          <div
                            key={lead.id}
                            className={`rounded-lg border border-dashed border-gray-200 bg-white p-3 shadow-2xs cursor-move transition-all duration-200 ease-out transform-gpu hover:-translate-y-0.5 hover:shadow-xs ${
                              draggedLeadId === lead.id
                                ? "opacity-70 scale-[0.97]"
                                : ""
                            } ${
                              recentlyMovedLead === lead.id
                                ? "animate-card-drop ring-1 ring-orange-200"
                                : ""
                            }`}
                            draggable
                            aria-grabbed={draggedLeadId === lead.id}
                            onDragStart={() => handleDragStart(lead.id)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-md font-bold text-gray-900">
                                  {lead.name}
                                </p>
                                <p className="text-xs text-gray-500">{lead.id}</p>
                              </div>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  priorityStyles[lead.priority] ||
                                  "text-gray-700 bg-gray-100 ring-1 ring-inset ring-gray-200"
                                }`}
                              >
                                {lead.priority}
                              </span>
                            </div>
                            <div className="mt-5 space-y-2 text-xs text-gray-600">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Assigned to
                                </span>
                                <span>{lead.assignedTo}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Activity
                                </span>
                                <span>{lead.lastActivity}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-700">
                                  Created
                                </span>
                                <span>{lead.createdAt}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-center text-sm text-gray-500">
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
    </div>
  );
}
