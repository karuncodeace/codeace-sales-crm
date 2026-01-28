"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/**
 * AnalyticsChart Component
 * 
 * Renders dynamic charts based on backend analytics response.
 * Supports line, bar, and pie chart types.
 * 
 * @param {Object} chartData - Backend response containing chart configuration
 * @param {string} chartData.intent - Must be "analytics_visual"
 * @param {string} chartData.chart_type - "line" | "bar" | "pie"
 * @param {string} chartData.title - Chart title
 * @param {string} chartData.x_axis - Key for x-axis/label data
 * @param {string} chartData.y_axis - Key for y-axis/value data
 * @param {Array} chartData.data - Array of data objects
 */
export default function AnalyticsChart({ chartData, isDark = false }) {
  // Debug logging
  console.log("AnalyticsChart received chartData:", {
    hasChartData: !!chartData,
    intent: chartData?.intent,
    chart_type: chartData?.chart_type,
    title: chartData?.title,
    x_axis: chartData?.x_axis,
    y_axis: chartData?.y_axis,
    dataLength: chartData?.data?.length,
    sampleData: chartData?.data?.slice(0, 2)
  });

  if (!chartData || chartData.intent !== "analytics_visual") {
    console.warn("AnalyticsChart: Invalid chartData or wrong intent", chartData?.intent);
    return null;
  }

  const { chart_type, title, x_axis, y_axis, data } = chartData;

  // Validate required fields
  if (!chart_type || !data || !Array.isArray(data) || data.length === 0) {
    console.warn("AnalyticsChart: Missing required fields", {
      chart_type,
      hasData: !!data,
      isArray: Array.isArray(data),
      dataLength: data?.length
    });
    return null;
  }

  console.log("AnalyticsChart rendering with:", {
    chart_type,
    title,
    x_axis,
    y_axis,
    data: data.slice(0, 3) // Log first 3 items
  });

  // Single primary color for all charts
  const primaryColor = "#F97316"; // orange-500 (brand color)
  
  // Vibrant multi-color palette for pie charts
  const pieColors = [
    "#F97316", // orange-500
    "#6366F1", // indigo-500
    "#10B981", // emerald-500
    "#E11D48", // rose-600
    "#8B5CF6", // violet-500
    "#0EA5E9", // sky-500
    "#F59E0B", // amber-500
    "#EC4899", // pink-500
    "#14B8A6", // teal-500
    "#F43F5E", // rose-500
  ];

  // Common chart props
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const tooltipBg = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb";

  // Render chart based on type
  const renderChart = () => {
    switch (chart_type) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 16, right: 32, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey={x_axis}
                stroke={textColor}
                tick={{ fill: textColor }}
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke={textColor}
                tick={{ fill: textColor }}
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  color: textColor,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: textColor }}
              />
              <Legend
                wrapperStyle={{ color: textColor }}
                iconType="line"
              />
              <Line
                type="monotone"
                dataKey={y_axis}
                stroke={primaryColor}
                strokeWidth={2.5}
                dot={{ fill: primaryColor, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: primaryColor }}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey={x_axis}
                stroke={textColor}
                tick={{ fill: textColor }}
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke={textColor}
                tick={{ fill: textColor }}
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  color: textColor,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: textColor }}
              />
              <Legend
                wrapperStyle={{ color: textColor }}
              />
              <Bar
                dataKey={y_axis}
                fill={primaryColor}
                radius={[8, 8, 0, 0]}
                stroke={isDark ? "rgba(249, 115, 22, 0.3)" : "rgba(249, 115, 22, 0.2)"}
                strokeWidth={1}
                maxBarSize={50}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ [x_axis]: name, [y_axis]: value, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={130}
                innerRadius={50}
                paddingAngle={2}
                dataKey={y_axis}
                stroke={isDark ? "#1f2937" : "#ffffff"}
                strokeWidth={2}
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={pieColors[index % pieColors.length]}
                    style={{ 
                      filter: isDark ? 'brightness(0.9)' : 'brightness(1)',
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  color: textColor,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: textColor }}
                formatter={(value, name) => [value, y_axis]}
              />
              <Legend
                wrapperStyle={{ color: textColor }}
                formatter={(value) => value}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Unsupported chart type: {chart_type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
      {title && (
        <h3
          className={`text-lg font-semibold mb-3 animate-in fade-in slide-in-from-left-2 duration-300 ${
            isDark ? "text-gray-100" : "text-gray-900"
          }`}
        >
          {title}
        </h3>
      )}
      <div
        className={`rounded-xl p-6 border shadow-md transition-all animate-in fade-in zoom-in-95 duration-500 ${
          isDark
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200"
        }`}
      >
        {renderChart()}
      </div>
    </div>
  );
}
