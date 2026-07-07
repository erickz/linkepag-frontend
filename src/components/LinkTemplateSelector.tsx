'use client';

import { linkTemplates, linkTemplateColors, type LinkTemplateId } from '@/lib/link-templates';

interface LinkTemplateSelectorProps {
  value?: LinkTemplateId | null;
  onChange: (template: LinkTemplateId) => void;
  columns?: 2 | 4;
  size?: 'sm' | 'md';
}

export function LinkTemplateSelector({
  value,
  onChange,
  columns = 2,
  size = 'md',
}: LinkTemplateSelectorProps) {
  const gridClass = columns === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2';
  const paddingClass = size === 'sm' ? 'p-2' : 'p-2 sm:p-3';
  const iconSize = size === 'sm' ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-8 h-8 sm:w-10 sm:h-10';
  const iconInnerSize = size === 'sm' ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5';

  return (
    <div className={`grid ${gridClass} gap-2 sm:gap-3 items-stretch`}>
      {linkTemplates.map((t) => {
        const isSelected = value ? value === t.id : false;
        const c = linkTemplateColors[t.color];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-1.5 sm:gap-2 ${paddingClass} rounded-xl border-2 transition text-center h-full min-w-0 ${
              isSelected
                ? `${c.border} ${c.bg} shadow-sm`
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div
              className={`${iconSize} rounded-lg flex items-center justify-center ${
                isSelected ? c.iconBg : 'bg-slate-100'
              }`}
            >
              <t.icon
                className={`${iconInnerSize} ${isSelected ? c.iconText : 'text-slate-400'}`}
              />
            </div>
            <div className="min-w-0 w-full">
              <p
                className={`text-[10px] sm:text-xs font-semibold break-words ${isSelected ? c.text : 'text-slate-700'}`}
              >
                {t.label}
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-400 leading-tight mt-0.5 break-words">
                {t.shortDesc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
