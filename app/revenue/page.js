"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/ui/header";
import TargetSetupPanel from "./components/TargetSetupPanel";
import RevenueKPICards from "./components/RevenueKPICards";
import RevenueCharts from "./components/RevenueCharts";
import { useTheme } from "../context/themeContext";

export default function RevenuePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Check user role on mount
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.role) {
            const role = data.data.role.toLowerCase();
            setUserRole(role);
            
            // Redirect if not admin
            if (role !== "admin") {
              router.push("/dashboard");
              return;
            }
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkUserRole();
  }, [router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center ${theme === "dark" ? "bg-[#1a1a1a]" : "bg-gray-50"}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className={`mt-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not admin (will redirect)
  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="w-full">
      
      {/* Page Header */}
      <div className="mb-6 mt-10">
        <h1 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Revenue & Sales Performance Dashboard
        </h1>
        <p className={`mt-2 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          Period-based sales insights & targets
        </p>
      </div>

      {/* Target Setup Panel (Admin Only) */}
      <div className="mb-6">
        <TargetSetupPanel
          periodType={periodType}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          selectedQuarter={selectedQuarter}
          onPeriodChange={(type, year, month, quarter, weekStartDate) => {
            setPeriodType(type);
            setSelectedYear(year);
            setSelectedMonth(month);
            setSelectedQuarter(quarter);
          }}
        />
      </div>

      {/* KPI Summary Cards */}
      <div className="mb-6">
        <RevenueKPICards
          periodType={periodType}
          year={selectedYear}
          month={selectedMonth}
          quarter={selectedQuarter}
          onPeriodChange={(type, year, month, quarter, weekStartDate) => {
            setPeriodType(type);
            setSelectedYear(year);
            setSelectedMonth(month);
            setSelectedQuarter(quarter);
          }}
        />
      </div>

      {/* Charts Section */}
      <div className="mb-6">
        <RevenueCharts
          periodType={periodType}
          year={selectedYear}
          month={selectedMonth}
          quarter={selectedQuarter}
        />
      </div>
    </div>
  );
}

