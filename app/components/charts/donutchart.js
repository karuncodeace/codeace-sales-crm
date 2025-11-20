"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

// Import ApexCharts client-side only
const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function DonutChart() {
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
        },
        labels: ["Inbound Marketing", "Outbound Prospects", "Partner Referrals", "Field Events"],
        colors:["#FF7A7A", "#FFB061", "#FFE066", "#7DDFA3", "#48DCC9"] ,
        states: {
            hover: {
              filter: {
                type: "lighten",
                value: 0.18,
              },
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
            colors: "#64748b",
          },
          markers: {
            radius: 12,
          },
        },
        stroke: {
          width: 0,
        },
        plotOptions: {
          pie: {
            expandOnClick: false ,
            donut: {
              size: "70%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total Leads",
                  color: "#0f172a",
                  formatter() {
                    return "2,480";
                  },
                },
                value: {
                  fontSize: "16px",
                  fontWeight: 600,
                  formatter(val) {
                    return `${val}%`;
                  },
                },
              },
            },
          },
        },
        tooltip: {
          y: {
            formatter: (val) => `${val}% of leads`,
          },
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
    []
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 s h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Lead Source Breakdown</h3>
        <p className="text-sm text-gray-500/50">Share of total Leads by acquisition channel</p>
      </div>
      <ApexChart options={options} series={series} type="donut" height={400} />
    </div>
  );
}