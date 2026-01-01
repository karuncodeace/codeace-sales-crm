"use client";
import Header from "./header";
import Cards from "./cards";
export default function DashboardHeader() {
    return (
       <>

       <div>
        <Header />
       </div>
       <div>
        <Cards />
       </div>
       </>
    );
}