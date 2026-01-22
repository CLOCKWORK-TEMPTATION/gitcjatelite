
import React, { useState } from 'react';
import { QuickTemplate } from '../types';
import { QUICK_TEMPLATES } from '../constants';

interface QuickTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
  isDisabled?: boolean;
}

type CategoryFilter = 'all' | 'analysis' | 'security' | 'performance' | 'documentation';

// Configuration constants
const PROMPT_PREVIEW_LENGTH = 60;
const QUICK_ACCESS_COUNT = 3;

const categoryLabels: Record<CategoryFilter, { en: string; ar: string; icon: string }> = {
  all: { en: 'All', ar: 'الكل', icon: '📋' },
  analysis: { en: 'Analysis', ar: 'تحليل', icon: '🔬' },
  security: { en: 'Security', ar: 'أمان', icon: '🛡️' },
  performance: { en: 'Performance', ar: 'أداء', icon: '⚡' },
  documentation: { en: 'Docs', ar: 'توثيق', icon: '📖' }
};

const QuickTemplates: React.FC<QuickTemplatesProps> = ({ onSelectTemplate, isDisabled = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const filteredTemplates = activeCategory === 'all' 
    ? QUICK_TEMPLATES 
    : QUICK_TEMPLATES.filter(t => t.category === activeCategory);

  return (
    <div className="w-full">
      {/* Collapsed View - Quick Action Buttons */}
      {!isExpanded && (
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setIsExpanded(true)}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-border"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>قوالب سريعة</span>
          </button>
          
          {/* Top 3 Quick Actions */}
          {QUICK_TEMPLATES.slice(0, QUICK_ACCESS_COUNT).map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.prompt)}
              disabled={isDisabled}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={template.prompt}
            >
              <span>{template.icon}</span>
              <span className="hidden sm:inline">{template.labelAr}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded View - Full Templates Panel */}
      {isExpanded && (
        <div className="mb-3 p-3 bg-card rounded-lg border border-border animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span>⚡</span>
              قوالب الأسئلة السريعة
            </h4>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(Object.keys(categoryLabels) as CategoryFilter[]).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-colors ${
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>{categoryLabels[category].icon}</span>
                <span>{categoryLabels[category].ar}</span>
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  onSelectTemplate(template.prompt);
                  setIsExpanded(false);
                }}
                disabled={isDisabled}
                className="flex items-start gap-2 p-2.5 text-right bg-secondary/30 hover:bg-secondary/60 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-border"
              >
                <span className="text-lg shrink-0 mt-0.5">{template.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                    {template.labelAr}
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {template.prompt.slice(0, PROMPT_PREVIEW_LENGTH)}...
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickTemplates;
