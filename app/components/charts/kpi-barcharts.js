"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function KPICallBarChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fallback data for immediate display
  const fallbackData = {
    calls: [420, 380, 450, 400],
    meetings: [95, 85, 110, 100],
    conversions: [58, 52, 68, 60],
    leads: [500, 480, 520, 490],
    categories: ["Q1", "Q2", "Q3", "Q4"]
  };

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackData, error } = useSWR(
    "/api/dashboard/kpi-breakdown",
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
        fontSize: "12px",
        labels: {
          colors: isDark ? "#E2E8F0" : "#64748b",
        },
        markers: {
          shape: "circle",      // or "square" / "rect" / "triangle" / "line" / "invertedTriangle"
          width: 12,
          height: 12,
        }
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

      states: {
        hover: {
          filter: { type: "darken", value: 0.9 },
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

      responsive: [
        {
          breakpoint: 568,
          options: {
            chart: { height: 300 },
            plotOptions: { bar: { columnWidth: "60%" } },
            legend: { fontSize: "11px" },
            xaxis: {
              labels: {
                style: { fontSize: "11px" },
              },
            },
            yaxis: {
              labels: {
                style: { fontSize: "11px" },
              },
            },
          },
        },
      ],
    }),
    [isDark]
  );

  // Prepare chart data - ensure arrays are numbers and have correct length
  const callsData = Array.isArray(data.calls) 
    ? data.calls.map(val => Number(val) || 0).slice(0, 4) 
    : [0, 0, 0, 0];
  const meetingsData = Array.isArray(data.meetings) 
    ? data.meetings.map(val => Number(val) || 0).slice(0, 4) 
    : [0, 0, 0, 0];
  const conversionsData = Array.isArray(data.conversions) 
    ? data.conversions.map(val => Number(val) || 0).slice(0, 4) 
    : [0, 0, 0, 0];
  const leadsData = Array.isArray(data.leads) 
    ? data.leads.map(val => Number(val) || 0).slice(0, 4) 
    : [0, 0, 0, 0];
  const categories = Array.isArray(data.categories) && data.categories.length === 4
    ? data.categories
    : ["Q1", "Q2", "Q3", "Q4"];

  // Pad arrays to ensure 4 elements
  while (callsData.length < 4) callsData.push(0);
  while (meetingsData.length < 4) meetingsData.push(0);
  while (conversionsData.length < 4) conversionsData.push(0);
  while (leadsData.length < 4) leadsData.push(0);

  const chartCards = useMemo(
    () => [
      {
        id: "sales-kpi-breakdown",
        title: "Sales KPI Breakdown",
        subtitle: "Calls, Meetings & Conversions Overview",
        type: "bar",
        height: 400,
        series: [
          { name: "Leads", data: leadsData },
          { name: "Calls", data: callsData },
          { name: "Meetings", data: meetingsData },
          { name: "Conversions", data: conversionsData },
        ],
        options: {
          ...baseOptions,

          // Color theme based on mode
          colors: isDark
            ? ["#a78bfa", "#60a5fa", "#34d399", "#fbbf24"] // brighter in dark mode (purple, blue, green, orange)
            : ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B"], // original CRM palette (purple, blue, green, orange)

          xaxis: {
            ...baseOptions.xaxis,
            categories: categories,
          },

          yaxis: {
            ...baseOptions.yaxis,
            min: 0,
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
    [baseOptions, isDark, callsData, meetingsData, conversionsData, leadsData, categories]
  );

  // No loading state needed - fallbackData ensures we always have data
  // Even if there's an error, we'll use fallbackData to display the chart

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
                isDark ? "text-gray-400" : "text-gray-500/80"
              }`}
            >
              {card.subtitle}
            </p>
          </div>

          {/* 🔄 re-render chart on theme toggle */}
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
