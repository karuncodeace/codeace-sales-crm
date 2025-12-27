"use client";
import AddLeadModal from "../components/buttons/addLeadModal";
import LeadsTable from "../components/tables/leadsTable";
import { useState } from "react";



export default function LeadsPage() {
  const [openAddLead, setOpenAddLead] = useState(false);

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
      <LeadsTable />
     </div>
    </div>
    </>
  );
}
