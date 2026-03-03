'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
  };
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  const baseBreadcrumb: BreadcrumbItem = { label: 'Dashboard', href: '/admin/dashboard' };
  const allBreadcrumbs = breadcrumbs ? [baseBreadcrumb, ...breadcrumbs] : [baseBreadcrumb];

  const actionStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200',
    outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
  };

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      {allBreadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          {allBreadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-indigo-600 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-900 font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{title}</h1>
          {description && (
            <p className="text-slate-500 mt-1 text-sm sm:text-base">{description}</p>
          )}
        </div>

        {action && (
          <div className="flex-shrink-0">
            {action.href ? (
              <Link
                href={action.href}
                className={`
                  inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                  ${actionStyles[action.variant || 'primary']}
                `}
              >
                {action.icon}
                {action.label}
              </Link>
            ) : (
              <button
                onClick={action.onClick}
                className={`
                  inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                  ${actionStyles[action.variant || 'primary']}
                `}
              >
                {action.icon}
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
