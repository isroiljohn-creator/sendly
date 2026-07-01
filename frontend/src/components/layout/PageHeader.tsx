import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  breadcrumbs: string;
  actions?: ReactNode;
  filters?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions, filters }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-1">
      <div className="md:hidden">
        <div className="text-[11px] text-[#707070] font-bold uppercase tracking-wider">
          {breadcrumbs}
        </div>
        <h1 className="text-[28px] font-black text-black leading-tight mt-0.5">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {filters}
        {actions}
      </div>
    </header>
  );
}
