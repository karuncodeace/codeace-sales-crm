"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

// ApexCharts must load on client
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const baseOptions = {
  chart: {
    type: "bar",
    height: 300,
    toolbar: { show: false },
    zoom: { enabled: false },
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
    fontFamily: "Inter, ui-sans-serif",
    fontWeight: 400,
    markers: { width: 12, height: 12, radius: 6 },
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
        colors: "#9ca3af",
        fontSize: "13px",
        fontFamily: "Inter, ui-sans-serif",
        fontWeight: 400,
      },
    },
  },

  yaxis: {
    labels: {
      align: "left",
      minWidth: 0,
      maxWidth: 100,
      style: {
        colors: "#9ca3af",
        fontSize: "13px",
        fontFamily: "Inter, ui-sans-serif",
        fontWeight: 400,
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
    y: {
      formatter: (value) => {
        if (typeof value === "number") {
          return value >= 1000 ? `${value / 1000}k` : value;
        }
        return value;
      },
    },
  },

  grid: {
    borderColor: "#e5e7eb",
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
            formatter: (value) =>
              value >= 1000 ? `${value / 1000}k` : value,
          },
        },
      },
    },
  ],
};

export default function SalesPersonComparisonChart() {
  const chartCards = useMemo(
    () => [
      {
        id: "sales-person-performance",
        title: "Sales Person Performance",
        subtitle: "Activity and results by sales person",
        type: "bar",
        height: 400,

        // --- 4 Series Dummy Data ---
        series: [
          {
            name: "Calls",
            data: [145, 132, 168],
          },
          {
            name: "Meetings",
            data: [32, 28, 45],
          },
          {
            name: "Conversions",
            data: [18, 15, 24],
          },
         
        ],

        options: {
          ...baseOptions,

          // Beautiful CRM colors
          colors: ["#3B82F6", "#10B981", "#F59E0B"],

          // Sales person names
          xaxis: {
            ...baseOptions.xaxis,
            categories: ["Sarah", "John", "Emily"],
          },

          yaxis: {
            ...baseOptions.yaxis,
            labels: {
              ...baseOptions.yaxis.labels,
              formatter: (value) =>
                value >= 1000 ? `${value / 1000}k` : value,
            },
          },

          tooltip: {
            ...baseOptions.tooltip,
            y: {
              formatter: function (value, { seriesIndex, w }) {
                const seriesName = w.globals.seriesNames[seriesIndex];

                // Special formatting for revenue
                if (seriesName === "Revenue") {
                  return `$${value >= 1000 ? value / 1000 + "k" : value}`;
                }

                return value >= 1000 ? `${value / 1000}k` : value;
              },
            },
          },
        },
      },
    ],
    []
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      {chartCards.map((card) => (
        <div key={card.id}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {card.title}
            </h3>
            <p className="text-sm text-gray-500/70">{card.subtitle}</p>
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
