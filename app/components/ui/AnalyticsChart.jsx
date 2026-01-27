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
  if (!chartData || chartData.intent !== "analytics_visual") {
    return null;
  }

  const { chart_type, title, x_axis, y_axis, data } = chartData;

  // Validate required fields
  if (!chart_type || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  // Single primary color for all charts
  const primaryColor = "#F97316"; // orange-500 (brand color)
  
  // For pie charts, use variations of the primary color
  const pieColors = [
    "#F97316", // orange-500
    "#FB923C", // orange-400
    "#FDBA74", // orange-300
    "#FED7AA", // orange-200
    "#FFEDD5", // orange-100
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
                outerRadius={120}
                innerRadius={0}
                dataKey={y_axis}
                stroke={isDark ? "#1f2937" : "#ffffff"}
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
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
    <div className={`w-full ${isDark ? "text-gray-100" : "text-gray-900"}`}>
      {title && (
        <h3
          className={`text-lg font-semibold mb-3 ${
            isDark ? "text-gray-100" : "text-gray-900"
          }`}
        >
          {title}
        </h3>
      )}
      <div
        className={`rounded-xl p-6 border shadow-md transition-all ${
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
