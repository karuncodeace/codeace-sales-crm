"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "../../../lib/swr/fetcher";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DonutChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Fallback data for immediate display
  const fallbackData = {
    series: [48, 26, 16, 10],
    labels: [
      "Inbound Marketing",
      "Outbound Prospects",
      "Partner Referrals",
      "Field Events",
    ],
    total: 2480
  };

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackData, error, isValidating } = useSWR(
    "/api/dashboard/lead-sources",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: fallbackData, // Show this immediately while fetching
    }
  );

  const { options, series } = useMemo(
    () => ({
      id: "lead-source-breakdown",
      title: "Lead Source Breakdown",
      subtitle: "Share of total Leads by acquisition channel",
      height: 350,
      series: data.series || [48, 26, 16, 10],
      options: {
        chart: {
          type: "donut",
          foreColor: isDark ? "#CBD5E1" : "#475467",
          background: "transparent",
        },

        labels: data.labels || [
          "Inbound Marketing",
          "Outbound Prospects",
          "Partner Referrals",
          "Field Events",
        ],

        // 🎨 Colors mode-wise (vibrant in light, deeper tone in dark)
        colors: isDark
          ? ["#4C6EF5", // Soft Indigo (Primary)
            "#74C0FC", // Sky Blue
            "#4DABF7", // Bright Blue
            "#FCC419", // Warm Gold
            "#FF922B", // Soft Orange
            "#FF6B6B",] // dark mode shades
          : [
            "#4C6EF5", // Soft Indigo (Primary)
            "#74C0FC", // Sky Blue
            "#4DABF7", // Bright Blue
            "#FCC419", // Warm Gold
            "#FF922B", // Soft Orange
            "#FF6B6B", // Coral Red
          ]
          
          , // original light mode

        states: {
          hover: {
            filter: { type: "lighten", value: 0.18 },
          },
          active: {
            filter: { type: "none" },
          },
        },

        dataLabels: {
          enabled: false,
        },

        legend: {
          position: "bottom",
          fontSize: "12px",
          labels: {
            colors: isDark ? "#E2E8F0" : "#64748b",
          },
          markers: {
            radius: 12,
          },
        },

        stroke: { width: 0 },

        plotOptions: {
          pie: {
            expandOnClick: false,
            donut: {
              size: "70%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total Leads",
                  color: isDark ? "#E2E8F0" : "#0f172a",
                  formatter() {
                    return data.total?.toLocaleString() || "2,480";
                  },
                },
                value: {
                  fontSize: "16px",
                  fontWeight: 600,
                  color: isDark ? "#E2E8F0" : "#1e293b",
                  formatter(val) {
                    return `${val}%`;
                  },
                },
              },
            },
          },
        },

        tooltip: {
          theme: isDark ? "dark" : "light",
          y: { formatter: (val) => `${val}% of leads` },
        },

        responsive: [
          {
            breakpoint: 640,
            options: {
              legend: { position: "bottom" },
            },
          },
        ],
      },
    }),
    [isDark, data]
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
      <div className="mb-4">
        <h3 className={`text-lg md:text-base 2xl:text-lg font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>
          Lead Source Breakdown
        </h3>
        <p className={`text-sm md:text-xs 2xl:text-sm ${isDark ? "text-gray-400" : "text-gray-500/80"}`}>
          Share of total Leads by acquisition channel
        </p>
      </div>

      {/* 🔄 Re-render when theme changes */}
      <div className="h-[430px] md:h-[300px] 2xl:h-[400px]">
      <ApexChart key={theme} options={options} series={series} type="donut" height="100%" 
      
      />
      </div>
    </div>
  );
}
