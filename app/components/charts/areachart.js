"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RevenueAreaChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null; // prevent hydration mismatch

  // Fallback data for immediate display
  const fallbackData = {
    revenue: [
      115000, 128000, 150000, 142000, 168000, 195000,
      185000, 210000, 198000, 225000, 238000, 260000,
    ],
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  };

  // Fetch data using SWR with fallback for instant display
  const { data = fallbackData, error } = useSWR(
    "/api/dashboard/revenue-area",
    async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        error.info = await res.json().catch(() => ({ error: 'Failed to fetch' }));
        error.status = res.status;
        throw error;
      }
      return res.json();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 30000, // Refresh every 30 seconds
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: fallbackData, // Show this immediately while fetching
    }
  );

  const revenueData = data.revenue || fallbackData.revenue;
  const months = data.months || fallbackData.months;

  const calculateGrowth = (data) =>
    data.map((v, i) => (i === 0 ? null : ((v - data[i - 1]) / data[i - 1]) * 100));

  const identifyAnomalies = (data) => {
    const anomalies = [];
    const growth = calculateGrowth(data);
    for (let i = 1; i < growth.length; i++) {
      if (growth[i] > 15) anomalies.push({ index: i, type: "spike", value: growth[i] });
      else if (growth[i] < -10) anomalies.push({ index: i, type: "dip", value: growth[i] });
    }
    return anomalies;
  };

  const identifySeasonalPatterns = () => [
    { index: 9, type: "seasonal", label: "Q4 Peak" },
    { index: 10, type: "seasonal", label: "Q4 Peak" },
    { index: 11, type: "seasonal", label: "Q4 Peak" },
    { index: 0, type: "seasonal", label: "Q1 Start" },
  ];

  const growth = calculateGrowth(revenueData);
  const anomalies = identifyAnomalies(revenueData);

  const chartOptions = useMemo(() => {
    const annotations = { points: [] };
    anomalies.forEach((a) =>
      annotations.points.push({
        x: months[a.index],
        y: revenueData[a.index],
        marker: {
          size: 6,
          fillColor: a.type === "spike" ? "#10B981" : "#EF4444",
          strokeColor: "#fff",
          strokeWidth: 2,
        },
        label: {
          borderColor: a.type === "spike" ? "#10B981" : "#EF4444",
          style: {
            color: "#fff",
            background: a.type === "spike" ? "#10B981" : "#EF4444",
            fontSize: "11px",
          },
          text:
            a.type === "spike"
              ? `Spike: +${a.value.toFixed(1)}%`
              : `Dip: ${a.value.toFixed(1)}%`,
          offsetY: -10,
        },
      })
    );

    return {
      chart: {
        type: "area",
        toolbar: { show: false },
        foreColor: isDark ? "#CBD5E1" : "#475467",
        background: "transparent",
      },

      stroke: { curve: "smooth", width: 3 },

      colors: isDark ? ["#ef4444"] : ["#3b82f6"], // 🔥 red in dark mode

      fill: {
        type: "gradient",
        gradient: {
          shade: "dark",
          shadeIntensity: 0.6,
          opacityFrom: isDark ? 0.5 : 0.45,
          opacityTo: 0.05,
          stops: [0, 60, 100],
          colorStops: [
            {
              offset: 0,
              color: isDark ? "#ef4444" : "#3b82f6",
              opacity: 0.45,
            },
            {
              offset: 60,
              color: isDark ? "#ef4444" : "#3b82f6",
              opacity: 0.2,
            },
            {
              offset: 100,
              color: isDark ? "#ef4444" : "#3b82f6",
              opacity: 0.05,
            },
          ],
        },
      },

      grid: {
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "#eee",
        strokeDashArray: 4,
      },

      xaxis: {
        categories: months,
        labels: {
          style: { fontSize: "12px", colors: isDark ? "#E2E8F0" : "#475467" },
        },
      },

      yaxis: {
        labels: {
          formatter: (val) => `₹${val / 1000}k`,
          style: { fontSize: "12px", colors: isDark ? "#E2E8F0" : "#475467" },
        },
      },

      tooltip: {
        theme: isDark ? "dark" : "light",
      },

      annotations,
    };
  }, [isDark, anomalies]);

  const chartSeries = [{ name: "Revenue", data: revenueData }];

  const avgGrowth = growth.filter((g) => g !== null).reduce((a, b) => a + b, 0) / (growth.length - 1);
  const totalGrowth = ((revenueData.at(-1) - revenueData[0]) / revenueData[0]) * 100;
  const spikeCount = anomalies.filter((a) => a.type === "spike").length;
  const dipCount = anomalies.filter((a) => a.type === "dip").length;

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
      <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-200" : "text-gray-900"}`}>
        Monthly Revenue
      </h2>

      {/* Insights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
        <div className={`${isDark ? "bg-blue-950 text-blue-300" : "bg-blue-50 text-blue-600"} rounded-lg p-2`}>
          <div className="text-xs opacity-70">Avg Growth</div>
          <div className="font-semibold">{avgGrowth.toFixed(1)}%</div>
        </div>
        <div className={`${isDark ? "bg-green-950 text-green-300" : "bg-green-50 text-green-600"} rounded-lg p-2`}>
          <div className="text-xs opacity-70">Total Growth</div>
          <div className="font-semibold">+{totalGrowth.toFixed(1)}%</div>
        </div>
        <div className={`${isDark ? "bg-purple-950 text-purple-300" : "bg-purple-50 text-purple-600"} rounded-lg p-2`}>
          <div className="text-xs opacity-70">Spikes</div>
          <div className="font-semibold">{spikeCount}</div>
        </div>
        <div className={`${isDark ? "bg-red-950 text-red-300" : "bg-red-50 text-red-600"} rounded-lg p-2`}>
          <div className="text-xs opacity-70">Dips</div>
          <div className="font-semibold">{dipCount}</div>
        </div>
      </div>

      <ApexChart key={theme} options={chartOptions} series={chartSeries} type="area" height={320} />
    </div>
  );
}
