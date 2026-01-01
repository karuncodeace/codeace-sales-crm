"use client";

import { useEffect } from "react";
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
import DashboardHeader from "../components/ui/dashboardHeader";

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
            return null;
          }
        });
        await Promise.allSettled(promises);
      } catch (error) {
        // Silently handle preload errors
      }
    };

    preloadData();
  }, [mutate]);

  return (
    <>
      <div className="w-full">
         <div className="mt-8">
          <DashboardHeader />
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
