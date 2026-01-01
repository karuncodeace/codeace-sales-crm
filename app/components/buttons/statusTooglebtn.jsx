import { useState, useRef, useEffect } from "react";
import { useTheme } from "../../context/themeContext";

const StatusDropdown = ({ value = "New", onChange = () => { }, theme: themeProp }) => {
  const { theme: ctxTheme } = useTheme();
  const theme = themeProp ?? ctxTheme;

  const statusStyles = {
    New: {
      light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100",
      dark: "text-blue-500 bg-blue-900/40 ring-1 ring-inset ring-blue-700",
    },
    Contacted: {
      light: "text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-100",
      dark: "text-amber-500 bg-amber-900/40 ring-1 ring-inset ring-amber-700",
    },
    Demo: {
      light: "text-purple-700 bg-purple-50 ring-1 ring-inset ring-purple-100",
      dark: "text-purple-500 bg-purple-900/40 ring-1 ring-inset ring-purple-700",
    },

    Proposal: {
      light: "text-yellow-700 bg-yellow-50 ring-1 ring-inset ring-yellow-100",
      dark: "text-yellow-500 bg-yellow-900/40 ring-1 ring-inset ring-yellow-700",
    },
    "Follow-Up": {
      light: "text-sky-700 bg-sky-50 ring-1 ring-inset ring-sky-100",
      dark: "text-sky-400 bg-sky-900/40 ring-1 ring-inset ring-sky-700",
    },

    Won: {
      light: "text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-100",
      dark: "text-emerald-500 bg-emerald-900/40 ring-1 ring-inset ring-emerald-700",
    },
    Disqualified: {
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
          className={`absolute z-10 mt-2 w-36 rounded-md shadow-lg ring-1 ring-black/10 ${theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"
            }`}
        >
          <ul className="py-1">
            {Object.keys(statusStyles).map((status) => (
              <li
                key={status}
                onClick={() => onSelect(status)}
                className={`cursor-pointer px-3 py-1
                  ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                  `}
              >
                {status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StatusDropdown;
