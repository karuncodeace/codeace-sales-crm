"use client";

import { useState, useMemo, useEffect } from "react";
import { useTheme } from "../context/themeContext";
import StatusDropdown from "../components/statusTooglebtn";
import PriorityDropdown from "../components/priorityTooglebtn";
import FilterBtn from "../components/filterbtn";




const initialProspects = [
    {
        id: "PR-1001",
        name: "John Doe",
        phone: "+1 (555) 987-6543",
        email: "john@example.com",
        source: "Meta Ads",
        status: "Qualified",
        assignedTo: "Sarah Lin",
        lastActivity: "Call done · 2 days ago",
        createdAt: "Nov 20, 2025",
        priority: "Hot",
        successRate: 78,
    },
    {
        id: "PR-1002",
        name: "Priya Sharma",
        phone: "+1 (555) 987-1122",
        email: "priya@example.com",
        source: "Google Ads",
        status: "Proposal",
        assignedTo: "Jorge Patel",
        lastActivity: "Proposal sent · 1 day ago",
        createdAt: "Nov 18, 2025",
        priority: "Warm",
        successRate: 72,
    },
    {
        id: "PR-1003",
        name: "Michael Lee",
        phone: "+1 (555) 998-8776",
        email: "michael@example.com",
        source: "Website Form",
        status: "Qualified",
        assignedTo: "Priya Nair",
        lastActivity: "Meeting scheduled · Tomorrow",
        createdAt: "Nov 15, 2025",
        priority: "Cold",
        successRate: 65,
    },
    {
        id: "PR-1004",
        name: "Emma Wilson",
        phone: "+1 (555) 234-5678",
        email: "emma@techcorp.io",
        source: "Referral",
        status: "Proposal",
        assignedTo: "Sarah Lin",
        lastActivity: "Email sent · 3h ago",
        createdAt: "Nov 12, 2025",
        priority: "Hot",
        successRate: 89,
    },
    {
        id: "PR-1005",
        name: "David Chen",
        phone: "+1 (555) 345-6789",
        email: "david@startup.co",
        source: "LinkedIn",
        status: "Qualified",
        assignedTo: "Jorge Patel",
        lastActivity: "Demo completed · Yesterday",
        createdAt: "Nov 10, 2025",
        priority: "Warm",
        successRate: 74,
    },

    // ⭐ New Added Prospects ⭐

    {
        id: "PR-1006",
        name: "Sophia Brown",
        phone: "+1 (555) 223-8844",
        email: "sophia.b@example.com",
        source: "YouTube Ads",
        status: "Proposal",
        assignedTo: "Sarah Lin",
        lastActivity: "Follow-up scheduled · 4h ago",
        createdAt: "Nov 09, 2025",
        priority: "Hot",
        successRate: 81,
    },
    {
        id: "PR-1007",
        name: "Carlos Martinez",
        phone: "+1 (555) 998-1123",
        email: "carlos@bizgroup.com",
        source: "Google Ads",
        status: "Qualified",
        assignedTo: "Jorge Patel",
        lastActivity: "Call missed · 6h ago",
        createdAt: "Nov 07, 2025",
        priority: "Warm",
        successRate: 68,
    },
    {
        id: "PR-1008",
        name: "Ayesha Khan",
        phone: "+1 (555) 667-4433",
        email: "ayesha.k@example.com",
        source: "Website Form",
        status: "Proposal",
        assignedTo: "Priya Nair",
        lastActivity: "Docs requested · 3 days ago",
        createdAt: "Nov 05, 2025",
        priority: "Cold",
        successRate: 70,
    },
    {
        id: "PR-1009",
        name: "Robert Young",
        phone: "+1 (555) 556-7788",
        email: "robert@cloudtech.ai",
        source: "Referral",
        status: "Qualified",
        assignedTo: "Sarah Lin",
        lastActivity: "Intro call done · 5 days ago",
        createdAt: "Nov 04, 2025",
        priority: "Hot",
        successRate: 92,
    },
    {
        id: "PR-1010",
        name: "Lily Anderson",
        phone: "+1 (555) 452-8811",
        email: "lily.a@example.com",
        source: "LinkedIn",
        status: "Proposal",
        assignedTo: "Jorge Patel",
        lastActivity: "Viewed proposal · 1h ago",
        createdAt: "Nov 02, 2025",
        priority: "Warm",
        successRate: 88,
    },
    {
        id: "PR-1011",
        name: "Ryan Matthews",
        phone: "+1 (555) 221-5522",
        email: "ryan@innovix.co",
        source: "Website Form",
        status: "Qualified",
        assignedTo: "Priya Nair",
        lastActivity: "Awaiting callback · 1 day ago",
        createdAt: "Nov 01, 2025",
        priority: "Cold",
        successRate: 67,
    },
    {
        id: "PR-1012",
        name: "Isabella Flores",
        phone: "+1 (555) 878-3344",
        email: "isabella.f@example.com",
        source: "Google Ads",
        status: "Proposal",
        assignedTo: "Sarah Lin",
        lastActivity: "Pricing shared · 2h ago",
        createdAt: "Oct 31, 2025",
        priority: "Hot",
        successRate: 95,
    },
    {
        id: "PR-1013",
        name: "Benjamin Carter",
        phone: "+1 (555) 441-9911",
        email: "ben.carter@example.com",
        source: "YouTube Ads",
        status: "Qualified",
        assignedTo: "Jorge Patel",
        lastActivity: "Lead warmed · 20m ago",
        createdAt: "Oct 29, 2025",
        priority: "Warm",
        successRate: 72,
    },
    {
        id: "PR-1014",
        name: "Clara Lewis",
        phone: "+1 (555) 781-4466",
        email: "clara.l@example.com",
        source: "Referral",
        status: "Proposal",
        assignedTo: "Priya Nair",
        lastActivity: "Contract shared · Yesterday",
        createdAt: "Oct 27, 2025",
        priority: "Hot",
        successRate: 86,
    },
    {
        id: "PR-1015",
        name: "Ethan Walker",
        phone: "+1 (555) 318-7222",
        email: "ethan.w@example.com",
        source: "Meta Ads",
        status: "Qualified",
        assignedTo: "Sarah Lin",
        lastActivity: "Discussed budget · Today",
        createdAt: "Oct 25, 2025",
        priority: "Warm",
        successRate: 76,
    },
];


export default function ProspectsPage() {
    const [prospectsData, setProspectsData] = useState(initialProspects);
    const [openActions, setOpenActions] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const { theme } = useTheme();
    const [filter, setFilter] = useState("all");
const [openFilter, setOpenFilter] = useState(false);
const [advancedFilters, setAdvancedFilters] = useState({
    source: "",
    status: "",
    assignedTo: "",
    priority: "",
    type: "",
});
const handleApplyFilters = (filters) => {
    setAdvancedFilters(filters);
};

    const filteredProspects = useMemo(() => {
        let result = prospectsData;

        // Apply advanced filters
        if (advancedFilters.source) {
            result = result.filter((prospect) => prospect.source === advancedFilters.source);
        }
        if (advancedFilters.status) {
            result = result.filter((prospect) => prospect.status === advancedFilters.status);
        }
        if (advancedFilters.assignedTo) {
            result = result.filter((prospect) => prospect.assignedTo === advancedFilters.assignedTo);
        }
        if (advancedFilters.priority) {
            result = result.filter((prospect) => prospect.priority === advancedFilters.priority);
        }

        // Apply search
        if (searchTerm.trim()) {
            const query = searchTerm.trim().toLowerCase();
            result = result.filter((prospect) => {
                const haystack = [
                    prospect.name,
                    prospect.email,
                    prospect.phone,
                    prospect.id,
                    prospect.status,
                    prospect.assignedTo,
                    prospect.source,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return haystack.includes(query);
            });
        }

        return result;
    }, [prospectsData, searchTerm, advancedFilters]);

    const handleStatusUpdate = (prospectId, newStatus) => {
        setProspectsData((prev) =>
            prev.map((prospect) =>
                prospect.id === prospectId ? { ...prospect, status: newStatus } : prospect
            )
        );
    };

    const handlePriorityUpdate = (prospectId, newPriority) => {
        setProspectsData((prev) =>
            prev.map((prospect) =>
                prospect.id === prospectId ? { ...prospect, priority: newPriority } : prospect
            )
        );
    };

    const handleToggleActions = (prospectId) => {
        setOpenActions((prev) => (prev === prospectId ? null : prospectId));
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

    return (
        <div className="pl-5 md:pl-0 2xl:pl-0 w-[98%]">
            <div className="mt-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold mb-1">Prospects</h1>
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
                </div>
            </div>

            <div className={`h-[calc(100vh-180px)] mt-8 mb-5 rounded-xl shadow-2xs overflow-hidden flex flex-col ${theme === "dark" ? "bg-[#262626] border border-gray-700" : "bg-white border border-gray-200"}`}>
                <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    {/* Search Bar */}
                    <div className={`relative w-full md:w-80 p-2  flex items-center rounded-[10px] pl-4 px-4 py-2 ${theme === "dark" ? " border border-gray-700 bg-gray-800/50" : " border border-gray-200"}`}>
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
                            className={`w-full pl-2 pr-4 text-sm focus:outline-none ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}
                        />
                    </div>

                </div>
                {/* Table */}
                <div className="flex-1 overflow-y-auto overflow-x-auto">
                    <table className={`min-w-full divide-y ${theme === "dark" ? "divide-[#3f3f3f]" : "divide-gray-200"}`}>
                        <thead className={`${theme === "dark" ? "bg-[#262626] text-gray-300" : "bg-gray-50"}`}>
                            <tr>
                                <th scope="col" className="ps-6 py-3 text-start">
                                    <label htmlFor="prospect-select-all" className="flex">
                                        <input
                                            type="checkbox"
                                            className="shrink-0 size-4 accent-orange-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                            id="prospect-select-all"
                                        />
                                    </label>
                                </th>

                                {[
                                    "Prospect Name",
                                    "Phone",
                                    "Email",
                                    "Source",
                                    "Status",
                                    "Assigned To",
                                    "Last Activity",
                                    "Created At",
                                    "Priority",
                                    "Success Rate",
                                    "Actions",

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

                        <tbody className={`divide-y overflow-y-auto ${theme === "dark" ? "divide-[#3f3f3f]" : "divide-gray-200"}`}>
                            {filteredProspects.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={12}
                                        className={`px-6 py-10 text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                                    >
                                        No prospects match "{searchTerm.trim()}". Try a different search.
                                    </td>
                                </tr>
                            ) : (
                                filteredProspects.map((prospect) => (
                                    <tr key={prospect.id}>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="ps-6 py-2">
                                                <label
                                                    htmlFor={`prospect-${prospect.id}`}
                                                    className="flex"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="shrink-0 size-4 accent-orange-500 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                                                        id={`prospect-${prospect.id}`}
                                                    />
                                                    <span className="sr-only">
                                                        Select {prospect.name}
                                                    </span>
                                                </label>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <div className="flex items-center gap-x-3">
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-900"}`}>
                                                            {prospect.name}
                                                        </span>
                                                        <span className={`text-xs ${theme === "dark" ? "text-gray-400/80" : "text-gray-500"}`}>
                                                            {prospect.id}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <a
                                                    href={`tel:${prospect.phone.replace(/[^0-9+]/g, "")}`}
                                                    className={`text-sm font-medium ${theme === "dark" ? "text-gray-300 hover:text-orange-400" : "text-gray-900 hover:text-orange-800"}`}
                                                >
                                                    {prospect.phone}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <a
                                                    href={`mailto:${prospect.email}`}
                                                    className={`text-sm font-medium ${theme === "dark" ? "text-gray-300 hover:text-blue-400" : "text-gray-900 hover:text-blue-600"}`}
                                                >
                                                    {prospect.email}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                    {prospect.source}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <StatusDropdown
                                                    value={prospect.status}
                                                    theme={theme}
                                                    onChange={(newStatus) => handleStatusUpdate(prospect.id, newStatus)}
                                                />
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                    {prospect.assignedTo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                    {prospect.lastActivity}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                                                    {prospect.createdAt}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <PriorityDropdown
                                                    value={prospect.priority}
                                                    theme={theme}
                                                    onChange={(newPriority) => handlePriorityUpdate(prospect.id, newPriority)}
                                                />
                                            </div>
                                        </td>
                                        <td className="size-px whitespace-nowrap">
                                            <div className="px-6 py-2">
                                                <div className="flex items-center gap-2 min-w-[120px]">
                                                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"
                                                        }`}>
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-300 ${prospect.successRate >= 80
                                                                    ? "bg-emerald-500"
                                                                    : prospect.successRate >= 60
                                                                        ? "bg-orange-500"
                                                                        : "bg-red-500"
                                                                }`}
                                                            style={{ width: `${prospect.successRate}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-medium min-w-[36px] ${theme === "dark" ? "text-gray-300" : "text-gray-700"
                                                        }`}>
                                                        {prospect.successRate}%
                                                    </span>
                                                </div>
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
                                                        onClick={() => handleToggleActions(prospect.id)}
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

                                                    {openActions === prospect.id && (
                                                        <div className={`absolute right-0 z-10 mt-2 w-36 rounded-lg border text-sm font-medium shadow-xl ${theme === "dark"
                                                            ? "bg-gray-800 text-gray-200 border-gray-700"
                                                            : "bg-white text-gray-700 border-gray-200"
                                                            }`}>
                                                            {["View", "Edit"].map((action) => (
                                                                <button
                                                                    key={action}
                                                                    type="button"
                                                                    className={`flex w-full items-center px-4 py-2 ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                                                        }`}
                                                                >
                                                                    {action}
                                                                </button>
                                                            ))}
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
                <div className={`px-6 py-4 grid gap-3 md:flex md:justify-between md:items-center border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                    <div className="inline-flex items-center gap-x-2">
                        <p className={`text-sm ${theme === "dark" ? "text-gray-400/80" : "text-gray-600"}`}>
                            Showing: {filteredProspects.length} of {prospectsData.length}
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
