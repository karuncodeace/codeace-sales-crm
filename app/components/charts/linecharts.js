"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

// Import ApexCharts client-side only
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const baseOptions = {
  chart: {
    toolbar: { show: false },
    zoom: { enabled: false },
    foreColor: "#475467",
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
    markers: {
      radius: 12,
    },
  },
  grid: {
    borderColor: "rgba(148,163,184,0.25)",
    strokeDashArray: 4,
    padding: { left: 12, right: 12 },
  },
  tooltip: {
    theme: "light",
  },
};

export default function LineChart() {
  const chartCards = useMemo(
    () => [
      {
        id: "weekly-sales",
        title: "Weekly Sales Momentum",
        subtitle: "Closed deals vs. pipeline adds",
        type: "line",
        height: 400,
        series: [
          {
            name: "Closed Won",
            data: [32, 45, 38, 60, 72, 81, 95],
          },
          {
            name: "New Pipeline",
            data: [58, 62, 70, 78, 84, 90, 102],
          },
        ],
        options: {
          ...baseOptions,
          colors: ["#22c55e", "#f97316"],
          xaxis: {
            categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            axisBorder: { show: false },
            axisTicks: { show: false },
          },
          yaxis: {
            title: { text: "Deals" },
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
      {
        id: "revenue-trend",
        title: "Monthly Revenue vs Target",
        subtitle: "Thousands USD",
        type: "line",
        height: 400,
        series: [
          {
            name: "Actual Revenue",
            data: [120, 138, 150, 165, 172, 190],
          },
          {
            name: "Forecast",
            data: [110, 130, 155, 170, 185, 200],
          },
        ],
        options: {
          ...baseOptions,
          colors: ["#22c55e", "#a1a1aa"],
          xaxis: {
            categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            axisBorder: { show: false },
            axisTicks: { show: false },
          },
          yaxis: {
            labels: {
              formatter: (val) => `$${val}k`,
            },
          },
          stroke: {
            curve: "straight",
            width: [4, 2],
            dashArray: [0, 6],
          },
          markers: {
            size: [5, 0],
          },
        },
      },
      
    ],
    []
  );

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-2">
      {chartCards.map((card) => (
        <div
          key={card.id}
          className="rounded-2xl border border-gray-200 bg-white p-5 "
        >
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {card.title}
            </h3>
            <p className="text-sm text-gray-500/50">{card.subtitle}</p>
          </div>
          <ApexChart
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
