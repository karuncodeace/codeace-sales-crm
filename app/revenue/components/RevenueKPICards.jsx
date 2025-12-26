"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { useTheme } from "../../context/themeContext";
import { fetcher } from "@/lib/swr/fetcher";
import { TrendingUp, TrendingDown, Target, DollarSign, Users, Phone, Calendar, FileText, CheckCircle } from "lucide-react";

export default function RevenueKPICards({ periodType, year, month, quarter }) {
  const { theme } = useTheme();

  // Build API URL with query params
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

  const getStatusColor = (percentage) => {
    if (percentage >= 100) return "text-green-500";
    if (percentage >= 70) return "text-orange-500";
    return "text-red-500";
  };

  const getStatusBgColor = (percentage) => {
    if (percentage >= 100) return theme === "dark" ? "bg-green-500/10" : "bg-green-50";
    if (percentage >= 70) return theme === "dark" ? "bg-orange-500/10" : "bg-orange-50";
    return theme === "dark" ? "bg-red-500/10" : "bg-red-50";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className={`h-32 rounded-xl border animate-pulse ${
              theme === "dark" ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
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
          theme === "dark" ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <p className={theme === "dark" ? "text-red-400" : "text-red-600"}>
          Failed to load KPI data
        </p>
      </div>
    );
  }

  const { revenue, funnel } = data;

  const kpiCards = [
    {
      title: "Total Revenue",
      icon: DollarSign,
      actual: revenue.actual,
      target: revenue.target,
      percentage: revenue.percentage,
      remaining: revenue.remaining,
      format: formatCurrency,
      color: "blue",
    },
    {
      title: "Revenue Target",
      icon: Target,
      actual: revenue.target,
      target: revenue.target,
      percentage: 100,
      remaining: 0,
      format: formatCurrency,
      color: "purple",
    },
    {
      title: "Achievement",
      icon: TrendingUp,
      actual: revenue.percentage,
      target: 100,
      percentage: revenue.percentage,
      remaining: 100 - revenue.percentage,
      format: (val) => `${val}%`,
      color: "green",
    },
    {
      title: "Remaining Amount",
      icon: TrendingDown,
      actual: revenue.remaining,
      target: 0,
      percentage: revenue.target > 0 ? ((revenue.target - revenue.remaining) / revenue.target) * 100 : 0,
      remaining: revenue.remaining,
      format: formatCurrency,
      color: "orange",
    },
    {
      title: "Leads",
      icon: Users,
      actual: funnel.leads.actual,
      target: funnel.leads.target,
      percentage: funnel.leads.percentage,
      remaining: funnel.leads.remaining,
      format: (val) => val.toString(),
      color: "blue",
    },
    {
      title: "Calls",
      icon: Phone,
      actual: funnel.calls.actual,
      target: funnel.calls.target,
      percentage: funnel.calls.percentage,
      remaining: funnel.calls.remaining,
      format: (val) => val.toString(),
      color: "green",
    },
    {
      title: "Meetings",
      icon: Calendar,
      actual: funnel.meetings.actual,
      target: funnel.meetings.target,
      percentage: funnel.meetings.percentage,
      remaining: funnel.meetings.remaining,
      format: (val) => val.toString(),
      color: "orange",
    },
    {
      title: "Prospects",
      icon: Users,
      actual: funnel.prospects.actual,
      target: funnel.prospects.target,
      percentage: funnel.prospects.percentage,
      remaining: funnel.prospects.remaining,
      format: (val) => val.toString(),
      color: "purple",
    },
    {
      title: "Proposals",
      icon: FileText,
      actual: funnel.proposals.actual,
      target: funnel.proposals.target,
      percentage: funnel.proposals.percentage,
      remaining: funnel.proposals.remaining,
      format: (val) => val.toString(),
      color: "pink",
    },
    {
      title: "Converted",
      icon: CheckCircle,
      actual: funnel.converted.actual,
      target: funnel.converted.target,
      percentage: funnel.converted.percentage,
      remaining: funnel.converted.remaining,
      format: (val) => val.toString(),
      color: "emerald",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {kpiCards.map((card, index) => {
        const Icon = card.icon;
        const statusColor = getStatusColor(card.percentage);
        const statusBgColor = getStatusBgColor(card.percentage);

        return (
          <div
            key={index}
            className={`rounded-xl border p-5 relative overflow-hidden ${
              theme === "dark" ? "bg-[#262626] border-gray-700" : "bg-white border-gray-200"
            }`}
          >
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-10 ${
              card.color === "blue" ? "bg-blue-500" :
              card.color === "green" ? "bg-green-500" :
              card.color === "orange" ? "bg-orange-500" :
              card.color === "purple" ? "bg-purple-500" :
              card.color === "pink" ? "bg-pink-500" :
              "bg-emerald-500"
            }`} />

            {/* Icon */}
            <div className={`relative mb-4 inline-flex p-2 rounded-lg ${statusBgColor}`}>
              <Icon className={`h-5 w-5 ${statusColor}`} />
            </div>

            {/* Title */}
            <h3 className={`text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {card.title}
            </h3>

            {/* Actual Value */}
            <p className={`text-2xl font-bold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {card.format(card.actual)}
            </p>

            {/* Target and Percentage */}
            <div className="flex items-center justify-between mt-3">
              <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                Target: {card.format(card.target)}
              </span>
              <span className={`text-xs font-semibold ${statusColor}`}>
                {card.percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className={`mt-2 h-2 rounded-full ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
              <div
                className={`h-2 rounded-full transition-all ${
                  card.percentage >= 100 ? "bg-green-500" :
                  card.percentage >= 70 ? "bg-orange-500" :
                  "bg-red-500"
                }`}
                style={{ width: `${Math.min(card.percentage, 100)}%` }}
              />
            </div>

            {/* Remaining (if applicable) */}
            {card.remaining > 0 && (
              <p className={`text-xs mt-2 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                Remaining: {card.format(card.remaining)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

