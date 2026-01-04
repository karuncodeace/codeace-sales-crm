"use client";
import { useState } from "react";
import Header from "./header";
import Cards from "./cards";
import DashboardFilter from "./DashboardFilter";

export default function DashboardHeader() {
    const [filterData, setFilterData] = useState(null);
    
    const handleFilterChange = (filterData) => {
        setFilterData(filterData);
        // You can use filterData to update dashboard charts/data
        console.log("Filter changed:", filterData);
    };
    
    return (
       <>
       <div className="flex justify-between items-center">
        <Header />
        <DashboardFilter onFilterChange={handleFilterChange} />

       </div>
       <div className="mb-4">
       </div>
       <div>
        <Cards filterData={filterData} />
       </div>
       </>
    );
}