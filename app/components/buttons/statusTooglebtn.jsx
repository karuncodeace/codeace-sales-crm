import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/themeContext";

const StatusDropdown = ({ value = "New", onChange = () => { }, theme: themeProp }) => {
  const { theme: ctxTheme } = useTheme();
  const theme = themeProp ?? ctxTheme;

  const statusStyles = {



    // New labels requested by the user (map visual styles to existing internal statuses)
    "New": {
      light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100",
      dark: "text-blue-500 bg-blue-900/40 ring-1 ring-inset ring-blue-700",
    },
    "Responded": {
      light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
      dark: "text-amber-500 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
    },
    "Not Responded": {
      light: "text-gray-700 bg-gray-50 ring-1 ring-inset ring-gray-100",
      dark: "text-gray-300 bg-gray-900/20 ring-1 ring-inset ring-gray-700",
    },
    "Demo Scheduled": {
      light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
      dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
    },
    "Demo Completed": {
      light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
      dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
    },
    "SRS": {
      light: "text-yellow-700 bg-yellow-50 ring-1 ring-inset ring-yellow-100",
      dark: "text-yellow-500 bg-yellow-900/40 ring-1 ring-inset ring-yellow-700",
    },
    "Converted": {
      light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
      dark: "text-emerald-500 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
    },
    "Lost Lead": {
      light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-200",
      dark: "text-red-400 bg-red-900/40 ring-1 ring-inset ring-red-700",
    },
    "Junk Lead": {
      light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-200",
      dark: "text-red-400 bg-red-900/40 ring-1 ring-inset ring-red-700",
    },
  };

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const mode = theme === "dark" ? "dark" : "light";

  const currentStyle =
    statusStyles?.[value]?.[mode] ??
    "text-gray-200/50 ring-1 ring-inset ring-gray-200/50";

  useEffect(() => {
    function closeOnClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnClickOutside);
    return () => document.removeEventListener("mousedown", closeOnClickOutside);
  }, []);

  const onSelect = (status) => {
    if (typeof onChange === "function") onChange(status);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Trigger */}
      <span
        role="button"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs font-semibold ${currentStyle}`}
      >
        {value}
      </span>

      {/* Dropdown Body */}
      {open && (
        <div
          className={`absolute z-10 mt-2 w-46 rounded-md shadow-lg ring-1 ring-black/10 max-h-56 overflow-y-auto ${theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"
            }`}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <ul className="py-1">
            {[
              "New",
              "Responded",
              "Not Responded",
              "Demo Scheduled",
              "Demo Completed",
              "SRS",
              "Converted",
              "Lost Lead",
              "Junk Lead",
            ].map((label) => (
              <li
                key={label}
            onClick={() => {
                  // Use the display label directly as the status value across the app/backend
                  onSelect(label);
                }}
                className={`cursor-pointer px-3 py-1
                  ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                  `}
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StatusDropdown;
