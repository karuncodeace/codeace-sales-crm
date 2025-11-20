"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function RevenueAreaChart() {
    const revenueData = [
        115000, 
        128000, 
        150000, 
        142000, 
        168000, 
        195000, 
        185000, 
        210000, 
        198000, 
        225000, 
        238000,
        260000, 
      ];
      

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  // Calculate month-over-month growth
  const calculateGrowth = (data) => {
    const growth = [];
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        growth.push(null);
      } else {
        const prevValue = data[i - 1];
        const currentValue = data[i];
        const growthPercent = ((currentValue - prevValue) / prevValue) * 100;
        growth.push(growthPercent);
      }
    }
    return growth;
  };

  // Identify dips and spikes (significant changes > 15% or < -10%)
  const identifyAnomalies = (data) => {
    const anomalies = [];
    const growth = calculateGrowth(data);
    
    for (let i = 1; i < growth.length; i++) {
      if (growth[i] > 15) {
        anomalies.push({ index: i, type: "spike", value: growth[i] });
      } else if (growth[i] < -10) {
        anomalies.push({ index: i, type: "dip", value: growth[i] });
      }
    }
    return anomalies;
  };

  // Identify seasonal patterns (Q4 typically higher, Q1 lower)
  const identifySeasonalPatterns = () => {
    const patterns = [];
    // Q4 months (Oct, Nov, Dec) - typically higher
    patterns.push({ index: 9, type: "seasonal", label: "Q4 Peak" });
    patterns.push({ index: 10, type: "seasonal", label: "Q4 Peak" });
    patterns.push({ index: 11, type: "seasonal", label: "Q4 Peak" });
    // Q1 months (Jan, Feb, Mar) - typically lower
    patterns.push({ index: 0, type: "seasonal", label: "Q1 Start" });
    return patterns;
  };

  const growth = calculateGrowth(revenueData);
  const anomalies = identifyAnomalies(revenueData);
  const seasonalPatterns = identifySeasonalPatterns();

  const chartOptions = useMemo(() => {
    // Build annotations for dips, spikes, and seasonal patterns
    const annotations = {
      points: [],
      texts: [],
    };

    // Add annotations for dips and spikes
    anomalies.forEach((anomaly) => {
      annotations.points.push({
        x: months[anomaly.index],
        y: revenueData[anomaly.index],
        marker: {
          size: 6,
          fillColor: anomaly.type === "spike" ? "#10B981" : "#EF4444",
          strokeColor: "#fff",
          strokeWidth: 2,
          radius: 4,
        },
        label: {
          borderColor: anomaly.type === "spike" ? "#10B981" : "#EF4444",
          style: {
            color: "#fff",
            background: anomaly.type === "spike" ? "#10B981" : "#EF4444",
            fontSize: "11px",
            padding: {
              left: 5,
              right: 5,
              top: 2,
              bottom: 2,
            },
          },
          text: anomaly.type === "spike" 
            ? `Spike: +${anomaly.value.toFixed(1)}%`
            : `Dip: ${anomaly.value.toFixed(1)}%`,
          offsetY: -10,
        },
      });
    });

    return {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: "#888",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 800,
      },
    },

    stroke: {
      curve: "smooth",
      width: 3,
    },

    colors: ["#3b82f6"], // Indigo
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
        colorStops: []
      },
    },

    dataLabels: { enabled: false },

    xaxis: {
      categories: months,
      labels: { style: { fontSize: "12px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },

    yaxis: {
      labels: {
        formatter: (value) => `₹${value / 1000}k`,
        style: { fontSize: "12px" },
      },
    },

    grid: {
      borderColor: "#eee",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },

    tooltip: {
      theme: "light",
      custom: function({ seriesIndex, dataPointIndex, w }) {
        const value = revenueData[dataPointIndex];
        const growthValue = growth[dataPointIndex];
        const month = months[dataPointIndex];
        
        let growthText = "";
        if (growthValue !== null) {
          const growthSymbol = growthValue >= 0 ? "+" : "";
          const growthColor = growthValue >= 0 ? "#10B981" : "#EF4444";
          growthText = `<div style="margin-top: 5px; color: ${growthColor}; font-weight: 600;">
            Growth: ${growthSymbol}${growthValue.toFixed(1)}%
          </div>`;
        }

        // Check for seasonal pattern
        const isSeasonal = seasonalPatterns.find(p => p.index === dataPointIndex);
        let seasonalText = "";
        if (isSeasonal) {
          seasonalText = `<div style="margin-top: 5px; color: #3b82f6; font-size: 11px;">
            ${isSeasonal.label}
          </div>`;
        }

        return `
          <div style="padding: 8px; background: white; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="font-weight: 600; margin-bottom: 4px;">${month}</div>
            <div style="color: #4F46E5; font-weight: 600;">Revenue: ₹${value.toLocaleString()}</div>
            ${growthText}
            ${seasonalText}
          </div>
        `;
      },
    },

    annotations: {
      points: annotations.points,
    },

    };
  }, [anomalies, months, revenueData, growth, seasonalPatterns]);

  const chartSeries = [
    {
      name: "Revenue",
      data: revenueData,
    },
  ];

  // Calculate insights summary
  const avgGrowth = growth.filter(g => g !== null).reduce((a, b) => a + b, 0) / (growth.length - 1);
  const totalGrowth = ((revenueData[revenueData.length - 1] - revenueData[0]) / revenueData[0]) * 100;
  const spikeCount = anomalies.filter(a => a.type === "spike").length;
  const dipCount = anomalies.filter(a => a.type === "dip").length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 w-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">Monthly Revenue</h2>
      </div>
      
      {/* Insights Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
        <div className="bg-blue-50 rounded-lg p-2">
          <div className="text-gray-600 text-xs">Avg Growth</div>
          <div className="font-semibold text-blue-600">{avgGrowth >= 0 ? "+" : ""}{avgGrowth.toFixed(1)}%</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2">
          <div className="text-gray-600 text-xs">Total Growth</div>
          <div className="font-semibold text-green-600">+{totalGrowth.toFixed(1)}%</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2">
          <div className="text-gray-600 text-xs">Spikes</div>
          <div className="font-semibold text-purple-600">{spikeCount}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-2">
          <div className="text-gray-600 text-xs">Dips</div>
          <div className="font-semibold text-red-600">{dipCount}</div>
        </div>
      </div>

      <ApexChart
        options={chartOptions}
        series={chartSeries}
        type="area"
        height={320}
      />
    </div>
  );
}
