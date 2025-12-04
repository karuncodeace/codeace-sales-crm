"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function weeklyLineChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fallback data for immediate display
  const fallbackData = {
    actualRevenue: [120, 138, 150, 165, 172, 190],
    forecast: [110, 130, 155, 170, 185, 200],
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
  };

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackData, error, isValidating } = useSWR(
    "/api/dashboard/revenue",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: fallbackData, // Show this immediately while fetching
    }
  );

  const baseOptions = useMemo(
    () => ({
      chart: {
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: isDark ? "#CBD5E1" : "#475467",
        background: "transparent",
      },
      stroke: {
        curve: "smooth",
        width: 3,
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        horizontalAlign: "left",
        fontSize: "14px",
        labels: {
          colors: isDark ? "#E2E8F0" : "#1E293B",
        },
        markers: { radius: 12 },
      },
      grid: {
        borderColor: isDark
          ? "rgba(255,255,255,0.12)"
          : "rgba(148,163,184,0.25)",
        strokeDashArray: 4,
        padding: { left: 12, right: 12 },
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
      },
    }),
    [isDark]
  );

  const chartCards = useMemo(
    () => [
      {
        id: "revenue-trend",
        title: "Monthly Revenue vs Target",
        subtitle: "Thousands USD",
        type: "line",
        height: 400,
        series: [
          { name: "Actual Revenue", data: data.actualRevenue || [] },
          { name: "Forecast", data: data.forecast || [] },
        ],
        options: {
          ...baseOptions,

          //  Red traveling line in dark mode
          colors: isDark
            ? ["#ef4444", "#a3a3a3"] // red + muted gray
            : ["#22c55e", "#a1a1aa"], // normal green theme in light

          xaxis: {
            categories: data.categories || ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
              style: {
                colors: isDark ? "#E2E8F0" : "#475467",
              },
            },
          },
          yaxis: {
            labels: {
              style: {
                colors: isDark ? "#E2E8F0" : "#475467",
              },
              formatter: (val) => `$${val}k`,
            },
          },

          stroke: {
            curve: "straight",
            width: [4, 2],
            dashArray: isDark ? [0, 6] : [0, 6], // same but primary will be red in dark mode
          },

          markers: {
            size: [5, 0],
            colors: isDark ? "#ef4444" : "#22c55e",
          },
        },
        responsive: [
          {
            breakpoint: 1024, // tablets & small laptops
            options: {
              legend: {
                horizontalAlign: "center",
                fontSize: "13px",
                markers: { radius: 10 },
              },
            },
          },
          {
            breakpoint: 640, // mobile screens
            options: {
              legend: {
                horizontalAlign: "center",
                fontSize: "12px",
                markers: { radius: 10 },
              },
              chart: {
                height: 260,
              },
            },
          },
        ],
      },
    ],
    [baseOptions, isDark, data]
  );

  if (error) {
    return (
      <div className={`rounded-2xl p-5 border ${
        isDark
          ? "bg-[#262626] border-gray-700 text-gray-300"
          : "bg-white border-gray-200"
      }`}>
        <div className="text-center py-8">
          <p className={`${isDark ? "text-red-400" : "text-red-600"}`}>
            Failed to load chart data
          </p>
        </div>
      </div>
    );
  }

  // No loading state needed - fallbackData ensures we always have data

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-1 xl:grid-cols-1">
      {chartCards.map((card) => (
        <div
          key={card.id}
          className={`rounded-2xl p-5 border ${
            isDark
              ? "bg-[#262626] border-gray-700 text-gray-300"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="mb-4">
            <h3
              className={`text-lg md:text-base 2xl:text-lg font-semibold ${
                isDark ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {card.title}
            </h3>
            <p
              className={`text-sm md:text-xs 2xl:text-sm ${
                isDark ? "text-gray-400" : "text-gray-500/50"
              }`}
            >
              {card.subtitle}
            </p>
          </div>

          {/* 🔄 forces rerender when theme changes */}
            <div className="h-[430px] md:h-[300px] 2xl:h-[410px]">
            <ApexChart
            key={theme}
            options={card.options}
            series={card.series}
            type={card.type}
            height="100%"
          />
            </div>
        </div>
      ))}
    </div>
  );
}
