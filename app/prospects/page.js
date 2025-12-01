"use client";

import { useState, useMemo, useEffect } from "react";


import { useTheme } from "../context/themeContext";

import FilterBtn from "../components/buttons/filterbtn";
import ProspectsTable from "../components/tables/prospectsTable";

const fetcher = (url) => fetch(url).then((res) => res.json());

const LoaderIcon = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function ProspectsPage() {
  
    const { theme } = useTheme();
  
    const [openFilter, setOpenFilter] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({});
  
    // Fetch prospects from API (leads with conversion_chance >= 60)

    const handleApplyFilters = (filters) => {
        setAdvancedFilters(filters);
    };

   
   
    return (
        <div className="pl-5 md:pl-0 2xl:pl-0 w-[98%]">
            <div className="mt-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold mb-1">Prospects</h1>
                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                        Leads with 60%+ conversion chance
                    </p>
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

            <div className= "">
                <ProspectsTable />
            </div>
        </div>
    );
}
