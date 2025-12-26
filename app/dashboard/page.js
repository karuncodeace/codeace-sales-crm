"use client";

import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import WeeklyLineChart from "../components/charts/weeklylinecharts";
import RevenueLineChart from "../components/charts/revenuelinechart";
import Cards from "../components/ui/cards";
import DonutChart from "../components/charts/donutchart";
import BarChart from "../components/charts/kpi-barcharts";
import SalesPersonComparisonChart from "../components/charts/salesperson-barchart";
import RevenueAreaChart from "../components/charts/areachart";
import Header from "../components/ui/header";
import { fetcher } from "../../lib/swr/fetcher";
import PeriodFilter from "../revenue/components/PeriodFilter";

// Dashboard API endpoints to pre-fetch
const dashboardEndpoints = [
  "/api/dashboard/cards",
  "/api/dashboard/weekly-sales",
  "/api/dashboard/revenue",
  "/api/dashboard/lead-sources",
  "/api/dashboard/kpi-breakdown",
  "/api/dashboard/salesperson-performance",
  "/api/dashboard/revenue-area",
];

export default function DashboardPage() {
  const { mutate } = useSWRConfig();
  
  // Period filter state
  const [periodType, setPeriodType] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Calculate current quarter based on custom definition
  // Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
  const getCurrentQuarter = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11
    if (currentMonth >= 3 && currentMonth <= 5) return 1; // Apr-Jun
    if (currentMonth >= 6 && currentMonth <= 8) return 2; // Jul-Sep
    if (currentMonth >= 9 && currentMonth <= 11) return 3; // Oct-Dec
    return 4; // Jan-Mar
  };
  const [selectedQuarter, setSelectedQuarter] = useState(getCurrentQuarter());

  // Handle period change
  const handlePeriodChange = (type, year, month, quarter, weekStartDate) => {
    setPeriodType(type);
    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedQuarter(quarter);
    // You can add logic here to refetch dashboard data based on period if needed
  };

  // Pre-fetch all dashboard data on mount to populate cache
  useEffect(() => {
    // Pre-fetch all chart data in parallel to populate SWR cache
    // This ensures data is available immediately when components render
    const preloadData = async () => {
      try {
        const promises = dashboardEndpoints.map(async (endpoint) => {
          try {
            const data = await fetcher(endpoint);
            // Populate cache without triggering revalidation
            mutate(endpoint, data, { revalidate: false });
            return data;
          } catch (error) {
            console.error(`Failed to preload ${endpoint}:`, error);
            return null;
          }
        });
        await Promise.allSettled(promises);
      } catch (error) {
        console.error("Error preloading dashboard data:", error);
      }
    };

    preloadData();
  }, [mutate]);

  return (
    <>
      <div className="w-full">
        <div className="  flex flex-col sm:flex-row justify-between items-start sm:items-center  p-4 px-0 mt-2">
          <Header />
          <div className="w-full sm:w-auto">
            <PeriodFilter
              periodType={periodType}
              year={selectedYear}
              month={selectedMonth}
              quarter={selectedQuarter}
              onPeriodChange={handlePeriodChange}
            />
          </div>
        </div>

        <div>
          <Cards/>
        </div>
        <div className="grid  grid-cols-1 lg:grid-cols-2 xl:grid-cols-3  gap-4 mt-2 xl:mt-2">
          <div className="">
            <WeeklyLineChart />
          </div>
          <div className="">
            <RevenueLineChart/>
          </div>
          <div className="lg:col-span-2 xl:col-span-1">
            <DonutChart />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-4 mt-10 pb-5">
          <div>
            <BarChart />
          </div>
          <div>
            <SalesPersonComparisonChart />
          </div>
        </div>
      </div>
    </>
  );
}
