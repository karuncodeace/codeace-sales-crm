import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/themeContext";

const PriorityDropdown = ({ value = "Hot", onChange = () => {}, theme: themeProp }) => {
  const { theme: ctxTheme } = useTheme();
  const theme = themeProp ?? ctxTheme;

  const priorityStyles = {
    Hot: {
      light: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-200",
      dark: "text-red-300 bg-red-900/40 ring-1 ring-inset ring-red-800",
    },
    Warm: {
      light: "text-orange-700 bg-orange-50 ring-1 ring-inset ring-orange-200",
      dark: "text-orange-300 bg-orange-900/40 ring-1 ring-inset ring-orange-800",
    },
    Cold: {
      light: "text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200",
      dark: "text-blue-300 bg-blue-900/40 ring-1 ring-inset ring-blue-800",
    },
  };
  

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const mode = theme === "dark" ? "dark" : "light";

  const currentStyle =
    priorityStyles?.[value]?.[mode] ??
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

  const onSelect = (priority) => {
    if (typeof onChange === "function") onChange(priority);
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
          className={`absolute z-10 mt-2 w-36 rounded-md shadow-lg ring-1 ring-black/10 ${
            theme === "dark" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"
          }`}
        >
          <ul className="py-1">
            {Object.keys(priorityStyles).map((priority) => (
              <li
                key={priority}
                onClick={() => onSelect(priority)}
                className={`cursor-pointer px-3 py-1
                    ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}
                    `}
              >
                {priority}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PriorityDropdown;
