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

  // Modern, punchy palette
  const colors = [
    "#6366F1", // indigo-500
    "#22D3EE", // cyan-400
    "#F97316", // orange-500
    "#10B981", // emerald-500
    "#E11D48", // rose-600
    "#84CC16", // lime-500
    "#A855F7", // purple-500
    "#0EA5E9", // sky-500
  ];

  // Common chart props
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const tooltipBg = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb";

  // Render chart based on type
  const renderChart = () => {
    switch (chart_type) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ fill: colors[0], r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                }}
                labelStyle={{ color: textColor }}
              />
              <Legend
                wrapperStyle={{ color: textColor }}
              />
              <Bar
                dataKey={y_axis}
                fill={colors[0]}
                radius={[8, 8, 0, 0]}
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
                fill="#8884d8"
                dataKey={y_axis}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: "8px",
                  color: textColor,
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
        className={`rounded-2xl p-4 border shadow-lg transition-all ${
          isDark
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700"
            : "bg-gradient-to-br from-white via-slate-50 to-white border-gray-200"
        }`}
      >
        {renderChart()}
      </div>
    </div>
  );
}
