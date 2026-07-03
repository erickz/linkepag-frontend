'use client';

import { linkTemplates, linkTemplateColors, type LinkTemplateId } from '@/lib/link-templates';

interface LinkTemplateSelectorProps {
  value: LinkTemplateId;
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
  const paddingClass = size === 'sm' ? 'p-2' : 'p-3';
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconInnerSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className={`grid ${gridClass} gap-3`}>
      {linkTemplates.map((t) => {
        const isSelected = value === t.id;
        const c = linkTemplateColors[t.color];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`flex flex-col items-center gap-2 ${paddingClass} rounded-xl border-2 transition text-center ${
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
            <div>
              <p
                className={`text-xs font-semibold ${isSelected ? c.text : 'text-slate-700'}`}
              >
                {t.label}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                {t.shortDesc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
