import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  breadcrumbs: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions, filters }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 py-1">
      <div>
        <div className="text-[12px] text-[#707070] font-normal tracking-wide">
          {breadcrumbs}
        </div>
        <h1 className="bf-tight mt-1 text-[42px] font-medium leading-[1.05] text-black">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {filters}
        {actions}
      </div>
    </header>
  );
}
