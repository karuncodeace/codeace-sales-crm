import WeeklyLineChart from "../components/charts/weeklylinecharts";
import RevenueLineChart from "../components/charts/revenuelinechart";
import Cards from "../components/cards"

import DonutChart from "../components/charts/donutchart";
import BarChart from "../components/charts/kpi-barcharts";
import SalesPersonComparisonChart from "../components/charts/salesperson-barchart";
import RevenueAreaChart from "../components/charts/areachart";
import Header from "../components/header";
export default function DashboardPage() {
  return (
    <div className="pl-5 md:pl-0 2xl:pl-0  w-[98%]">
      <Header name="John Doe" currentPage="Dashboard" />
      <div>
        <Cards/>
      </div>
      <div className="grid  grid-cols-3  gap-4 mt-10">
        <div className="">
            <WeeklyLineChart />
        </div>
        <div>
          <RevenueLineChart/>
        </div>
        <div className="">
            <DonutChart />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2 gap-4 mt-10">
        <div>
          <BarChart />
        </div>
        <div>
          <SalesPersonComparisonChart />
        </div>
      </div>
      <div className="mt-10 pb-10">
        
      </div>
    </div>
  );
}
