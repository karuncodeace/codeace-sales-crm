"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "@/lib/swr/fetcher";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RevenueCharts({ periodType, year, month, quarter }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Build API URL
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      periodType,
      year: year.toString(),
    });
    if (periodType === "monthly") {
      params.append("month", month.toString());
    } else if (periodType === "quarterly") {
      params.append("quarter", quarter.toString());
    }
    return `/api/revenue/kpis?${params}`;
  }, [periodType, year, month, quarter]);

  const { data, error, isLoading } = useSWR(apiUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 30000,
  });

  // Chart options base
  const baseOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: {
          show: false,
        },
        fontFamily: "inherit",
      },
      theme: {
        mode: isDark ? "dark" : "light",
      },
      colors: isDark
        ? ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"]
        : ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"],
      grid: {
        borderColor: isDark ? "#374151" : "#e5e7eb",
        strokeDashArray: 4,
      },
      xaxis: {
        labels: {
          style: {
            colors: isDark ? "#9ca3af" : "#6b7280",
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: isDark ? "#9ca3af" : "#6b7280",
          },
        },
      },
      legend: {
        labels: {
          colors: isDark ? "#d1d5db" : "#374151",
        },
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
      },
    }),
    [isDark]
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-96 rounded-xl border animate-pulse ${
              isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
            }`}
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className={`rounded-xl border p-6 ${
          isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <p className={isDark ? "text-red-400" : "text-red-600"}>
          Failed to load chart data
        </p>
      </div>
    );
  }

  const { revenue, funnel } = data;

  // Chart 1: Revenue vs Target
  const revenueChartOptions = {
    ...baseOptions,
    chart: {
      ...baseOptions.chart,
      type: "bar",
    },
    title: {
      text: "Revenue vs Target",
      style: {
        fontSize: "18px",
        fontWeight: 600,
        color: isDark ? "#f3f4f6" : "#111827",
      },
    },
    xaxis: {
      ...baseOptions.xaxis,
      categories: ["Revenue"],
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "50%",
      },
    },
  };

  const revenueChartSeries = [
    {
      name: "Actual",
      data: [revenue.actual],
    },
    {
      name: "Target",
      data: [revenue.target],
    },
  ];

  // Chart 2: Funnel Performance
  const funnelChartOptions = {
    ...baseOptions,
    chart: {
      ...baseOptions.chart,
      type: "bar",
    },
    title: {
      text: "Funnel Performance (Actual vs Target)",
      style: {
        fontSize: "18px",
        fontWeight: 600,
        color: isDark ? "#f3f4f6" : "#111827",
      },
    },
    xaxis: {
      ...baseOptions.xaxis,
      categories: ["Leads", "Calls", "Meetings", "Prospects", "Proposals", "Converted"],
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
      },
    },
  };

  const funnelChartSeries = [
    {
      name: "Actual",
      data: [
        funnel.leads.actual,
        funnel.calls.actual,
        funnel.meetings.actual,
        funnel.prospects.actual,
        funnel.proposals.actual,
        funnel.converted.actual,
      ],
    },
    {
      name: "Target",
      data: [
        funnel.leads.target,
        funnel.calls.target,
        funnel.meetings.target,
        funnel.prospects.target,
        funnel.proposals.target,
        funnel.converted.target,
      ],
    },
  ];

  // Chart 3: Achievement Percentage
  const achievementChartOptions = {
    ...baseOptions,
    chart: {
      ...baseOptions.chart,
      type: "bar",
    },
    title: {
      text: "Achievement Percentage",
      style: {
        fontSize: "18px",
        fontWeight: 600,
        color: isDark ? "#f3f4f6" : "#111827",
      },
    },
    xaxis: {
      ...baseOptions.xaxis,
      categories: ["Revenue", "Leads", "Calls", "Meetings", "Prospects", "Proposals", "Converted"],
    },
    yaxis: {
      ...baseOptions.yaxis,
      max: 120,
      labels: {
        ...baseOptions.yaxis.labels,
        formatter: (val) => `${val}%`,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "60%",
        colors: {
          ranges: [
            {
              from: 0,
              to: 69,
              color: "#ef4444", // red
            },
            {
              from: 70,
              to: 99,
              color: "#f97316", // orange
            },
            {
              from: 100,
              to: 120,
              color: "#10b981", // green
            },
          ],
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
      style: {
        colors: [isDark ? "#f3f4f6" : "#111827"],
        fontSize: "12px",
        fontWeight: 600,
      },
    },
  };

  const achievementChartSeries = [
    {
      name: "Achievement %",
      data: [
        revenue.percentage,
        funnel.leads.percentage,
        funnel.calls.percentage,
        funnel.meetings.percentage,
        funnel.prospects.percentage,
        funnel.proposals.percentage,
        funnel.converted.percentage,
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Revenue vs Target */}
      <div
        className={`rounded-xl border p-5 ${
          isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <ApexChart
          key={`revenue-${theme}`}
          options={revenueChartOptions}
          series={revenueChartSeries}
          type="bar"
          height={350}
        />
      </div>

      {/* Chart 2: Funnel Performance */}
      <div
        className={`rounded-xl border p-5 ${
          isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <ApexChart
          key={`funnel-${theme}`}
          options={funnelChartOptions}
          series={funnelChartSeries}
          type="bar"
          height={350}
        />
      </div>

      {/* Chart 3: Achievement Percentage */}
      <div
        className={`lg:col-span-2 rounded-xl border p-5 ${
          isDark ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <ApexChart
          key={`achievement-${theme}`}
          options={achievementChartOptions}
          series={achievementChartSeries}
          type="bar"
          height={350}
        />
      </div>
    </div>
  );
}

