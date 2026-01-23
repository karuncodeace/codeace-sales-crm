"use client";
import AddLeadModal from "../components/buttons/addLeadModal";
import LeadsTable from "../components/tables/leadsTable";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LeadsPageContent() {
  const [openAddLead, setOpenAddLead] = useState(false);
  const searchParams = useSearchParams();
  const [initialFilter, setInitialFilter] = useState(null);

  useEffect(() => {
    // Parse query parameters from URL
    const filter = searchParams.get("filter");
    
    if (filter) {
      setInitialFilter({ type: "filter", value: filter });
    } else {
      setInitialFilter(null);
    }
  }, [searchParams]);

  return (
    <>
      <AddLeadModal
        open={openAddLead}
        onClose={() => setOpenAddLead(false)}
        onAdd={(newLead) => {
          setOpenAddLead(false);
        }}
      />
      <div className="pl-5 md:pl-0 2xl:pl-0   w-full">
      <div className="mt-8  flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold ">Leads Management</h1>
        </div>
        <div>
          <button 
            data-action="add-lead"
            onClick={() => setOpenAddLead(true)}
            className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-hidden focus:bg-orange-600 disabled:opacity-50 disabled:pointer-events-none"
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
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Add Lead
          </button>
        </div>
        
      </div>

     <div>
      <LeadsTable initialFilter={initialFilter} />
     </div>
    </div>
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={
      <div className="pl-5 md:pl-0 2xl:pl-0 w-full">
        <div className="mt-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Leads Management</h1>
        </div>
        <div className="mt-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <LeadsPageContent />
    </Suspense>
  );
}
