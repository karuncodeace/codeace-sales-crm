"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTheme } from "../../context/themeContext"; // update path if needed

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DonutChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { options, series } = useMemo(
    () => ({
      id: "lead-source-breakdown",
      title: "Lead Source Breakdown",
      subtitle: "Share of total Leads by acquisition channel",
      height: 320,
      series: [48, 26, 16, 10],
      options: {
        chart: {
          type: "donut",
          foreColor: isDark ? "#CBD5E1" : "#475467",
          background: "transparent",
        },

        labels: [
          "Inbound Marketing",
          "Outbound Prospects",
          "Partner Referrals",
          "Field Events",
        ],

        // 🎨 Colors mode-wise (vibrant in light, deeper tone in dark)
        colors: isDark
          ? ["#f87171", "#fb923c", "#facc15", "#4ade80", "#2dd4bf"] // dark mode shades
          : ["#FF7A7A", "#FFB061", "#FFE066", "#7DDFA3", "#48DCC9"], // original light mode

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
          fontSize: "14px",
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
                    return "2,480";
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
    [isDark]
  );

  return (
    <div
      className={`rounded-2xl p-5 border ${
        isDark
          ? "bg-[#262626] border-gray-700 text-gray-300"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="mb-4">
        <h3 className={`text-lg font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>
          Lead Source Breakdown
        </h3>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500/50"}`}>
          Share of total Leads by acquisition channel
        </p>
      </div>

      {/* 🔄 Re-render when theme changes */}
      <ApexChart key={theme} options={options} series={series} type="donut" height={400} />
    </div>
  );
}
