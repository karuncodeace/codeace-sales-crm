"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTheme } from "../../context/themeContext"; // update path if needed

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function KPICallBarChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  const chartCards = useMemo(
    () => [
      {
        id: "sales-kpi-breakdown",
        title: "Sales KPI Breakdown",
        subtitle: "Calls, Meetings & Conversions Overview",
        type: "bar",
        height: 400,
        series: [
          { name: "Calls", data: [420, 380, 450, 400] },
          { name: "Meetings", data: [95, 85, 110, 100] },
          { name: "Conversions", data: [58, 52, 68, 60] },
        ],
        options: {
          ...baseOptions,

          // Color theme based on mode
          colors: isDark
            ? ["#60a5fa", "#34d399", "#fbbf24"] // brighter in dark mode
            : ["#3B82F6", "#10B981", "#F59E0B"], // original CRM palette

          xaxis: {
            ...baseOptions.xaxis,
            categories: ["Q1", "Q2", "Q3", "Q4"],
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
    [baseOptions, isDark]
  );

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
