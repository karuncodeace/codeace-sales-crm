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
    closedWon: [32, 45, 38, 60, 72, 81, 95],
    newPipeline: [58, 62, 70, 78, 84, 90, 102],
    categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  };

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackData, error } = useSWR(
    "/api/dashboard/weekly-sales",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: fallbackData, // Show this immediately while fetching
    }
  );

  // base chart options with theme support
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
        color : isDark ? "#ef4444" : "#3b82f6",
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        horizontalAlign: "left",
        fontSize: "12px",
        offsetY: 10 ,
        labels: {
          colors: isDark ? "#E2E8F0" : "#1E293B",
        },
        markers: {
          radius: 12,
        },
      },
      grid: {
        borderColor: isDark
          ? "rgba(255,255,255,0.12)"
          : "rgba(148,163,184,0.25)",
        strokeDashArray: 8,
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
        id: "weekly-sales",
        title: "Weekly Sales Momentum",
        subtitle: "Closed deals vs. pipeline adds",
        type: "line",
        height: 400,
        series: [
          { name: "Closed Won", data: data.closedWon || [] },
          { name: "New Pipeline", data: data.newPipeline || [] },
        ],
        options: {
          ...baseOptions,
          colors: isDark ? ["#4ade80", "#fb923c"] : ["#22c55e", "#f97316"],
          xaxis: {
            categories: data.categories || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
              style: {
                colors: isDark ? "#E2E8F0" : "#475467",
              },
            },
          },
          yaxis: {
            title: {
              text: "Deals",
              style: {
                color: isDark ? "#E2E8F0" : "#475467",
              },
            },
            labels: {
              style: {
                colors: isDark ? "#E2E8F0" : "#475467",
              },
            },
          },
          markers: {
            size: 4,
          },
          fill: {
            type: "gradient",
            gradient: {
              shadeIntensity: 1,
              opacityFrom: 0.4,
              opacityTo: 0.05,
              stops: [0, 90, 100],
            },
          },
        },
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
            <h3 className={`text-lg md:text-base 2xl:text-lg font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>
              {card.title}
            </h3>
            <p className={`text-sm md:text-xs 2xl:text-sm ${isDark ? "text-gray-400" : "text-gray-500/80"}`}>
              {card.subtitle}
            </p>
          </div>

          {/* Key forces re-render when theme changes */}
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
