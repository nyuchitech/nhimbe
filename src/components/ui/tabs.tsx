"use client";

import { createContext, useContext, useState, ReactNode, HTMLAttributes, forwardRef, ButtonHTMLAttributes } from "react";

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  className = "",
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || "");
  const value = controlledValue ?? uncontrolledValue;

  const handleValueChange = (newValue: string) => {
    setUncontrolledValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={className} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function handleTabListKeyDown(e: React.KeyboardEvent) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  const tabs = (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]');
  const current = Array.from(tabs).findIndex((t) => t === document.activeElement);
  if (current === -1) return;

  e.preventDefault();
  const next = e.key === "ArrowRight"
    ? (current + 1) % tabs.length
    : (current - 1 + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
}

export const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex gap-1 p-1 bg-surface rounded-xl overflow-x-auto ${className}`}
      role="tablist"
      onKeyDown={handleTabListKeyDown}
      {...props}
    >
      {children}
    </div>
  )
);

TabsList.displayName = "TabsList";

interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  badge?: ReactNode;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, badge, className = "", children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error("TabsTrigger must be used within Tabs");

    const isActive = context.value === value;

    return (
      <button
        ref={ref}
        role="tab"
        id={`tab-${value}`}
        aria-selected={isActive}
        aria-controls={`tabpanel-${value}`}
        onClick={() => context.onValueChange(value)}
        className={`
          flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
          transition-colors whitespace-nowrap
          ${isActive
            ? "bg-primary text-primary-foreground"
            : "text-text-secondary hover:text-foreground hover:bg-elevated"
          }
          ${className}
        `}
        {...props}
      >
        {children}
        {badge}
      </button>
    );
  }
);

TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className = "", children, ...props }, ref) => {
    const context = useContext(TabsContext);
    if (!context) throw new Error("TabsContent must be used within Tabs");

    if (context.value !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        className={className}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = "TabsContent";
