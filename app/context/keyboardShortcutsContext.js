"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import toast from "react-hot-toast";

const KeyboardShortcutsContext = createContext();

export function KeyboardShortcutsProvider({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const shortcutsEnabled = useRef(true);
    const actionCallbacks = useRef({});

    // Register action callbacks (for context-aware actions)
    const registerAction = (key, callback) => {
        actionCallbacks.current[key] = callback;
    };

    const unregisterAction = (key) => {
        delete actionCallbacks.current[key];
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            // Don't trigger shortcuts if user is typing in input fields
            const isTyping =
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                (event.target instanceof HTMLElement && event.target.isContentEditable);

            // Don't trigger if shortcuts are disabled or user is typing
            if (!shortcutsEnabled.current || isTyping) return;

            // Don't trigger if modifier keys are pressed (except for specific shortcuts)
            if (event.ctrlKey || event.metaKey || event.altKey) {
                // Allow Ctrl/Cmd + K for search
                if ((event.ctrlKey || event.metaKey) && event.key === "k") {
                    event.preventDefault();
                    // Focus search bar if available
                    const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="search"]');
                    if (searchInput) {
                        searchInput.focus();
                    }
                    return;
                }
                return;
            }

            const key = event.key.toLowerCase();

            // Navigation shortcuts (G + letter = Go to)
            if (key === "g") {
                // Wait for next key press
                const handleNextKey = (e) => {
                    const nextKey = e.key.toLowerCase();
                    e.preventDefault();
                    e.stopPropagation();

                    switch (nextKey) {
                        case "d":
                            router.push("/dashboard");
                            toast.success("Navigated to Dashboard");
                            break;
                        case "l":
                            router.push("/leads");
                            toast.success("Navigated to Leads");
                            break;
                        case "p":
                            router.push("/prospects");
                            toast.success("Navigated to Prospects");
                            break;
                        case "t":
                            router.push("/tasks");
                            toast.success("Navigated to Tasks");
                            break;
                        case "a":
                            router.push("/appointments");
                            toast.success("Navigated to Appointments");
                            break;
                        case "r":
                            router.push("/revenue");
                            toast.success("Navigated to Revenue");
                            break;
                        case "o":
                            router.push("/proposals");
                            toast.success("Navigated to Proposals");
                            break;
                        case "u":
                            router.push("/profile");
                            toast.success("Navigated to Profile");
                            break;
                        default:
                            // If not a valid navigation key, don't prevent default
                            return;
                    }

                    document.removeEventListener("keydown", handleNextKey);
                };

                document.addEventListener("keydown", handleNextKey, { once: true });
                return;
            }

            // Quick actions (context-aware)
            switch (key) {
                case "n":
                    // New/Create action (context-aware)
                    if (actionCallbacks.current["new"]) {
                        actionCallbacks.current["new"]();
                    } else {
                        // Default: Navigate to add lead if on leads page
                        if (pathname === "/leads") {
                            // Trigger add lead modal if available
                            const addLeadBtn = document.querySelector('[data-action="add-lead"]');
                            if (addLeadBtn) {
                                addLeadBtn.click();
                            }
                        } else if (pathname === "/tasks") {
                            // Trigger add task modal if available
                            const addTaskBtn = document.querySelector('[data-action="add-task"]');
                            if (addTaskBtn) {
                                addTaskBtn.click();
                            }
                        }
                    }
                    break;

                case "?":
                    // Show keyboard shortcuts help
                    event.preventDefault();
                    showShortcutsHelp();
                    break;

                case "b":
                    // Book meeting (if on lead detail page)
                    if (pathname.startsWith("/leads/")) {
                        event.preventDefault();
                        
                        // The Book Meeting button is inside a conditionally rendered dropdown
                        // Strategy: Always open the "Reach Out" dropdown first, then find and click the button
                        
                        // Find the "Reach Out" button
                        const reachOutBtn = Array.from(document.querySelectorAll('button')).find(btn => {
                            if (!btn || btn.offsetParent === null) return false;
                            const text = btn.textContent?.trim().toLowerCase() || '';
                            return text === 'reach out' || text.includes('reach out');
                        });
                        
                        if (!reachOutBtn) {
                            toast.error("Reach Out button not found. Make sure you're on a lead detail page.");
                            break;
                        }
                        
                        // Check if dropdown is already open by looking for the Book Meeting button
                        let bookMeetingBtn = document.querySelector('[data-action="book-meeting"]');
                        const isDropdownOpen = bookMeetingBtn && bookMeetingBtn.offsetParent !== null;
                        
                        if (!isDropdownOpen) {
                            // Open the dropdown
                            reachOutBtn.click();
                        }
                        
                        // Function to find and click the book meeting button
                        const findAndClickBookMeeting = (attempt = 1, maxAttempts = 5) => {
                            // Try multiple strategies to find the button
                            bookMeetingBtn = document.querySelector('[data-action="book-meeting"]');
                            
                            // Strategy 1: By data attribute
                            if (!bookMeetingBtn || bookMeetingBtn.offsetParent === null) {
                                // Strategy 2: By text content
                                bookMeetingBtn = Array.from(document.querySelectorAll('button')).find(btn => {
                                    if (!btn || btn.offsetParent === null) return false;
                                    const text = btn.textContent?.trim().toLowerCase() || '';
                                    const style = window.getComputedStyle(btn);
                                    const isVisible = style.display !== 'none' && 
                                                     style.visibility !== 'hidden';
                                    return isVisible && (
                                        text.includes('schedule meeting') || 
                                        text.includes('book meeting')
                                    );
                                });
                            }
                            
                            // Strategy 3: Find button with Calendar icon and "Schedule" text
                            if (!bookMeetingBtn || bookMeetingBtn.offsetParent === null) {
                                bookMeetingBtn = Array.from(document.querySelectorAll('button')).find(btn => {
                                    if (!btn || btn.offsetParent === null) return false;
                                    const hasCalendarIcon = btn.querySelector('svg') !== null;
                                    const text = btn.textContent?.trim().toLowerCase() || '';
                                    const style = window.getComputedStyle(btn);
                                    const isVisible = style.display !== 'none' && 
                                                     style.visibility !== 'hidden';
                                    return isVisible && hasCalendarIcon && (
                                        text.includes('schedule') || text.includes('meeting')
                                    );
                                });
                            }
                            
                            if (bookMeetingBtn && bookMeetingBtn.offsetParent !== null) {
                                // Button found and visible, click it
                                bookMeetingBtn.click();
                            } else if (attempt < maxAttempts) {
                                // Retry after a short delay (React might still be rendering)
                                setTimeout(() => findAndClickBookMeeting(attempt + 1, maxAttempts), 150);
                            } else {
                                toast.error("Book meeting button not found. Please try opening the Reach Out menu manually.");
                            }
                        };
                        
                        // Start searching for the button
                        // If dropdown was already open, search immediately
                        // Otherwise, wait a bit for the dropdown to render
                        if (isDropdownOpen) {
                            findAndClickBookMeeting();
                        } else {
                            setTimeout(() => findAndClickBookMeeting(), 200);
                        }
                    }
                    break;

                case "s":
                    // Save (if in a form context)
                    event.preventDefault();
                    // First try registered callback
                    if (actionCallbacks.current["save"]) {
                        actionCallbacks.current["save"]();
                        return;
                    }
                    
                    // Function to find save button with retry mechanism
                    const findAndClickSaveButton = (attempt = 1, maxAttempts = 3) => {
                        // Strategy 1: Find submit buttons in visible forms/modals (highest priority)
                        const submitButtons = Array.from(document.querySelectorAll('button[type="submit"]')).filter(btn => {
                            if (!btn || btn.disabled) return false;
                            const style = window.getComputedStyle(btn);
                            const rect = btn.getBoundingClientRect();
                            return btn.offsetParent !== null && 
                                   style.display !== 'none' &&
                                   style.visibility !== 'hidden' &&
                                   rect.width > 0 &&
                                   rect.height > 0;
                        });
                        
                        // Strategy 2: Find buttons with orange background classes (most reliable)
                        const orangeButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                            if (!btn || btn.disabled) return false;
                            
                            // Check for orange background classes
                            const hasOrangeClass = btn.classList.contains('bg-orange-500') ||
                                                  btn.classList.contains('bg-orange-600') ||
                                                  btn.className.includes('bg-orange-');
                            
                            if (!hasOrangeClass) return false;
                            
                            // Exclude cancel/close buttons
                            const text = btn.textContent?.trim().toLowerCase() || '';
                            const isNotCancel = !text.includes('cancel') && 
                                              !text.includes('close') && 
                                              !text.includes('delete');
                            
                            // Check visibility (be more lenient for buttons in modals)
                            const style = window.getComputedStyle(btn);
                            const rect = btn.getBoundingClientRect();
                            const isInModal = btn.closest('[role="dialog"]') !== null || 
                                           btn.closest('.fixed') !== null ||
                                           btn.closest('[class*="modal"]') !== null;
                            
                            // For buttons in modals, be less strict about visibility
                            const isVisible = isInModal ? 
                                (style.display !== 'none' && style.visibility !== 'hidden') :
                                (btn.offsetParent !== null && 
                                 style.display !== 'none' &&
                                 style.visibility !== 'hidden' &&
                                 rect.width > 0 &&
                                 rect.height > 0);
                            
                            return isVisible && isNotCancel;
                        });
                        
                        // Strategy 3: Find buttons with "Save" text in visible modals/forms
                        const saveButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                            if (!btn || btn.disabled) return false;
                            const text = btn.textContent?.trim().toLowerCase() || '';
                            
                            // Check if button text contains save-related keywords
                            const isSaveButton = (text === 'save' || 
                                                 text === 'save scores' || 
                                                 text === 'save target' ||
                                                 text === 'save objection' ||
                                                 text === 'save note' ||
                                                 text.startsWith('save ') ||
                                                 text.includes('create transaction') ||
                                                 text.includes('adding') ||
                                                 text.includes('updating') ||
                                                 (text.includes('save') && !text.includes('cancel')));
                            
                            if (!isSaveButton) return false;
                            
                            // Check visibility
                            const style = window.getComputedStyle(btn);
                            const rect = btn.getBoundingClientRect();
                            const isInModal = btn.closest('[role="dialog"]') !== null || 
                                           btn.closest('.fixed') !== null;
                            const isVisible = isInModal ? 
                                (style.display !== 'none' && style.visibility !== 'hidden') :
                                (btn.offsetParent !== null && 
                                 style.display !== 'none' &&
                                 style.visibility !== 'hidden' &&
                                 rect.width > 0 &&
                                 rect.height > 0);
                            
                            return isVisible;
                        });
                        
                        // Strategy 4: Find buttons in modals that are NOT cancel buttons (last resort)
                        const modalButtons = Array.from(document.querySelectorAll('button')).filter(btn => {
                            if (!btn || btn.disabled) return false;
                            
                            // Check if button is in a modal
                            const isInModal = btn.closest('[role="dialog"]') !== null || 
                                           btn.closest('.fixed') !== null ||
                                           btn.closest('[class*="modal"]') !== null;
                            
                            if (!isInModal) return false;
                            
                            // Exclude cancel/close buttons
                            const text = btn.textContent?.trim().toLowerCase() || '';
                            const isNotCancel = !text.includes('cancel') && 
                                              !text.includes('close') && 
                                              !text.includes('delete');
                            
                            // Check if it's likely a save button (has orange styling or is in a form footer)
                            const hasOrangeClass = btn.classList.contains('bg-orange-500') ||
                                                  btn.classList.contains('bg-orange-600');
                            const isInFooter = btn.closest('[class*="footer"]') !== null ||
                                             btn.closest('[class*="Footer"]') !== null;
                            
                            const style = window.getComputedStyle(btn);
                            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
                            
                            return isVisible && isNotCancel && (hasOrangeClass || isInFooter);
                        });
                        
                        // Prioritize: submit buttons > orange buttons > save text buttons > modal buttons
                        const targetButton = submitButtons[0] || orangeButtons[0] || saveButtons[0] || modalButtons[0];
                        
                        if (targetButton) {
                            targetButton.click();
                        } else if (attempt < maxAttempts) {
                            // Retry after a short delay (React might still be rendering the modal)
                            setTimeout(() => findAndClickSaveButton(attempt + 1, maxAttempts), 200);
                        } else {
                            toast.error("No save button found. Make sure a form or modal is open.");
                        }
                    };
                    
                    // Start searching for the save button
                    findAndClickSaveButton();
                    break;

                case "e":
                    // Edit (if available)
                    event.preventDefault();
                    // First try registered callback
                    if (actionCallbacks.current["edit"]) {
                        actionCallbacks.current["edit"]();
                        return;
                    }
                    
                    // Try to find edit buttons by data attribute (prioritize edit and edit-scores)
                    let editBtn = document.querySelector('[data-action="edit"]') || 
                                  document.querySelector('[data-action="edit-scores"]');
                    
                    // If not found, search by text content
                    if (!editBtn) {
                        editBtn = Array.from(document.querySelectorAll('button')).find(btn => {
                            if (btn.offsetParent === null) return false;
                            const text = btn.textContent?.trim().toLowerCase();
                            const style = window.getComputedStyle(btn);
                            return style.display !== 'none' && style.visibility !== 'hidden' &&
                                   (text === 'edit' || 
                                    text.includes('edit lead') || 
                                    text.includes('edit scores') ||
                                    text.startsWith('edit '));
                        });
                    }
                    
                    // If still not found, try finding by aria-label or title
                    if (!editBtn) {
                        editBtn = Array.from(document.querySelectorAll('button')).find(btn => {
                            if (btn.offsetParent === null) return false;
                            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                            const title = btn.title?.toLowerCase() || '';
                            const style = window.getComputedStyle(btn);
                            return style.display !== 'none' && style.visibility !== 'hidden' &&
                                   (ariaLabel.includes('edit') || title.includes('edit'));
                        });
                    }
                    
                    if (editBtn) {
                        editBtn.click();
                    } else {
                        toast.error("No edit button found");
                    }
                    break;

                case "d":
                    // Delete (if available and on detail pages)
                    if (pathname.startsWith("/leads/") && actionCallbacks.current["delete"]) {
                        event.preventDefault();
                        actionCallbacks.current["delete"]();
                    }
                    break;

                case "f":
                    // Focus filter/search
                    if (pathname === "/leads" || pathname === "/tasks" || pathname === "/prospects") {
                        const filterInput = document.querySelector('input[type="search"], input[placeholder*="Filter"], input[placeholder*="filter"]');
                        if (filterInput) {
                            event.preventDefault();
                            filterInput.focus();
                        }
                    }
                    break;

                case "h":
                    // Toggle sidebar (if available)
                    const sidebarToggle = document.querySelector('[data-action="toggle-sidebar"]');
                    if (sidebarToggle) {
                        event.preventDefault();
                        sidebarToggle.click();
                    }
                    break;

                default:
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [router, pathname]);

    const showShortcutsHelp = () => {
        const shortcuts = [
            { key: "G + D", description: "Go to Dashboard" },
            { key: "G + L", description: "Go to Leads" },
            { key: "G + P", description: "Go to Prospects" },
            { key: "G + T", description: "Go to Tasks" },
            { key: "G + A", description: "Go to Appointments" },
            { key: "G + R", description: "Go to Revenue" },
            { key: "G + O", description: "Go to Proposals" },
            { key: "G + U", description: "Go to Profile" },
            { key: "K", description: "Focus search bar (Dashboard)" },
            { key: "Ctrl/Cmd + K", description: "Focus search bar (Global)" },
            { key: "N", description: "New/Create (context-aware)" },
            { key: "B", description: "Book meeting (Lead detail)" },
            { key: "F", description: "Focus filter/search" },
            { key: "H", description: "Toggle sidebar" },
            { key: "S", description: "Save (in forms)" },
            { key: "E", description: "Edit (context-aware)" },
            { key: "D", description: "Delete (Lead detail)" },
            { key: "ESC", description: "Close modals / Unfocus" },
            { key: "?", description: "Show this help" },
        ];

        toast(
            (t) => (
                <div className="max-w-md">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Keyboard Shortcuts
                        </h3>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {shortcuts.map((shortcut, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
                            >
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {shortcut.description}
                                </span>
                                <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                                    {shortcut.key}
                                </kbd>
                            </div>
                        ))}
                    </div>
                </div>
            ),
            {
                duration: 10000,
                position: "top-center",
            }
        );
    };

    return (
        <KeyboardShortcutsContext.Provider
            value={{
                registerAction,
                unregisterAction,
                setShortcutsEnabled: (enabled) => {
                    shortcutsEnabled.current = enabled;
                },
            }}
        >
            {children}
        </KeyboardShortcutsContext.Provider>
    );
}

export function useKeyboardShortcuts() {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) {
        throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider");
    }
    return context;
}

