"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function SalesPersonComparisonChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fallback data for immediate display
  const fallbackData = {
    calls: [145, 132, 168],
    meetings: [32, 28, 45],
    conversions: [18, 15, 24],
    salesPersons: ["Sarah", "John", "Emily"]
  };

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackData, error, isValidating } = useSWR(
    "/api/dashboard/salesperson-performance",
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
        type: "bar",
        height: 300,
        toolbar: { show: false },
        zoom: { enabled: false },
        foreColor: isDark ? "#CBD5E1" : "#475467",
        background: "transparent",
      },

      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "40%",
          borderRadius: 4,
          dataLabels: { position: "top" },
        },
      },

      legend: {
        show: true,
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "13px",
        labels: {
          colors: isDark ? "#E2E8F0" : "#64748b",
        },
      },

      dataLabels: { enabled: false },

      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },

      xaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: { show: false },
        labels: {
          style: {
            colors: isDark ? "#CBD5E1" : "#9ca3af",
            fontSize: "13px",
          },
        },
      },

      yaxis: {
        labels: {
          align: "left",
          style: {
            colors: isDark ? "#CBD5E1" : "#9ca3af",
            fontSize: "13px",
          },
          formatter: (value) =>
            value >= 1000 ? `${value / 1000}k` : value,
        },
      },

      tooltip: {
        shared: true,
        intersect: false,
        theme: isDark ? "dark" : "light",
      },

      grid: {
        borderColor: isDark
          ? "rgba(255,255,255,0.12)"
          : "#e5e7eb",
        strokeDashArray: 2,
      },

      states: {
        hover: {
          filter: { type: "darken", value: 0.9 },
        },
      },

      responsive: [
        {
          breakpoint: 568,
          options: {
            chart: { height: 300 },
            plotOptions: { bar: { columnWidth: "60%" } },
            legend: { fontSize: "11px" },
            xaxis: { labels: { style: { fontSize: "11px" } } },
            yaxis: { labels: { style: { fontSize: "11px" } } },
          },
        },
      ],
    }),
    [isDark]
  );

  const chartCards = useMemo(
    () => [
      {
        id: "sales-person-performance",
        title: "Sales Person Performance",
        subtitle: "Activity and results by sales person",
        type: "bar",
        height: 400,

        series: [
          { name: "Calls", data: data.calls || [] },
          { name: "Meetings", data: data.meetings || [] },
          { name: "Conversions", data: data.conversions || [] },
        ],

        options: {
          ...baseOptions,

          // Color theme depends on mode
          colors: isDark
            ? ["#60a5fa", "#34d399", "#fbbf24"] // brighter in dark
            : ["#3B82F6", "#10B981", "#F59E0B"], // original palette

          xaxis: {
            ...baseOptions.xaxis,
            categories: data.salesPersons || ["Sarah", "John", "Emily"],
          },

          tooltip: {
            ...baseOptions.tooltip,
            y: {
              formatter(value) {
                return value >= 1000 ? `${value / 1000}k` : value;
              },
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
    <div
      className={`rounded-2xl p-5 border ${
        isDark
          ? "bg-[#262626] border-gray-700 text-gray-300"
          : "bg-white border-gray-200"
      }`}
    >
      {chartCards.map((card) => (
        <div key={card.id}>
          <div className="mb-4">
            <h3
              className={`text-lg font-semibold ${
                isDark ? "text-gray-200" : "text-gray-900"
              }`}
            >
              {card.title}
            </h3>
            <p
              className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-500/70"
              }`}
            >
              {card.subtitle}
            </p>
          </div>

          {/* 🔄 re-render when mode changes */}
          <ApexChart
            key={theme}
            options={card.options}
            series={card.series}
            type={card.type}
            height={card.height}
          />
        </div>
      ))}
    </div>
  );
}
