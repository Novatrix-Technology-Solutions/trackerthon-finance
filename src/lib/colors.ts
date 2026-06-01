export const CATEGORY_COLORS: Record<string, { bgClass: string, textClass: string, hex: string }> = {
  // Operating Expenses
  "Software & Subscriptions": { bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-800 dark:text-blue-300", hex: "#3b82f6" }, // blue-500
  "Hardware & Equipment": { bgClass: "bg-purple-100 dark:bg-purple-900/30", textClass: "text-purple-800 dark:text-purple-300", hex: "#a855f7" }, // purple-500
  "Marketing & Advertising": { bgClass: "bg-pink-100 dark:bg-pink-900/30", textClass: "text-pink-800 dark:text-pink-300", hex: "#ec4899" }, // pink-500
  "Payroll & Contractors": { bgClass: "bg-indigo-100 dark:bg-indigo-900/30", textClass: "text-indigo-800 dark:text-indigo-300", hex: "#6366f1" }, // indigo-500
  "Office Supplies & Rent": { bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-800 dark:text-amber-300", hex: "#f59e0b" }, // amber-500
  "Travel & Meals": { bgClass: "bg-orange-100 dark:bg-orange-900/30", textClass: "text-orange-800 dark:text-orange-300", hex: "#f97316" }, // orange-500
  "Legal & Professional": { bgClass: "bg-stone-100 dark:bg-stone-800", textClass: "text-stone-800 dark:text-stone-300", hex: "#78716c" }, // stone-500
  "Taxes & Licenses": { bgClass: "bg-rose-100 dark:bg-rose-900/30", textClass: "text-rose-800 dark:text-rose-300", hex: "#f43f5e" }, // rose-500
  "Utilities & Internet": { bgClass: "bg-cyan-100 dark:bg-cyan-900/30", textClass: "text-cyan-800 dark:text-cyan-300", hex: "#06b6d4" }, // cyan-500
  "Debt Repayment": { bgClass: "bg-red-100 dark:bg-red-900/30", textClass: "text-red-800 dark:text-red-300", hex: "#ef4444" }, // red-500
  
  // Revenue Streams
  "Sales & Core Revenue": { bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-800 dark:text-emerald-300", hex: "#10b981" }, // emerald-500
  "Consulting & Services": { bgClass: "bg-teal-100 dark:bg-teal-900/30", textClass: "text-teal-800 dark:text-teal-300", hex: "#14b8a6" }, // teal-500
  "Investments & Dividends": { bgClass: "bg-sky-100 dark:bg-sky-900/30", textClass: "text-sky-800 dark:text-sky-300", hex: "#0ea5e9" }, // sky-500
  "Grants & Funding": { bgClass: "bg-lime-100 dark:bg-lime-900/30", textClass: "text-lime-800 dark:text-lime-300", hex: "#84cc16" }, // lime-500
  
  // Other
  "Miscellaneous / Other": { bgClass: "bg-gray-100 dark:bg-gray-800", textClass: "text-gray-800 dark:text-gray-300", hex: "#6b7280" }, // gray-500
};

export const getCategoryColor = (category: string | undefined | null) => {
  if (!category) return CATEGORY_COLORS["Miscellaneous / Other"];
  
  // Direct match
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  
  // If no direct match (e.g. legacy custom categories), generate a pseudo-random stable color
  const fallbackHexes = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f43f5e"];
  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % fallbackHexes.length;
  
  return {
    bgClass: `bg-[${fallbackHexes[colorIndex]}20]`, // using 20% opacity for fallback bg
    textClass: `text-[${fallbackHexes[colorIndex]}]`,
    hex: fallbackHexes[colorIndex]
  };
};

// Also export a consistent frequency color map for Recurring Payments
export const getFrequencyColor = (freq: string | undefined | null) => {
  switch (freq?.toLowerCase()) {
    case 'weekly':
      return { bgClass: "bg-amber-100 dark:bg-amber-900/30", textClass: "text-amber-800 dark:text-amber-300" };
    case 'monthly':
      return { bgClass: "bg-emerald-100 dark:bg-emerald-900/30", textClass: "text-emerald-800 dark:text-emerald-300" };
    case 'yearly':
      return { bgClass: "bg-blue-100 dark:bg-blue-900/30", textClass: "text-blue-800 dark:text-blue-300" };
    default:
      return { bgClass: "bg-gray-100 dark:bg-gray-800", textClass: "text-gray-800 dark:text-gray-300" };
  }
};
