'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface QualityScoreBadgeProps {
  score: number;
  showTrend?: boolean;
  previousScore?: number;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function QualityScoreBadge({
  score,
  showTrend = false,
  previousScore,
  size = 'md',
  showTooltip = true,
}: QualityScoreBadgeProps) {
  // Determine quality level and styling
  const getQualityLevel = (score: number) => {
    if (score >= 0.95) return { label: 'Highly Reliable', color: 'bg-green-500', textColor: 'text-green-50' };
    if (score >= 0.85) return { label: 'Reliable', color: 'bg-yellow-500', textColor: 'text-yellow-50' };
    if (score >= 0.75) return { label: 'Some Gaps', color: 'bg-orange-500', textColor: 'text-orange-50' };
    return { label: 'Unreliable', color: 'bg-red-500', textColor: 'text-red-50' };
  };

  const { label, color, textColor } = getQualityLevel(score);
  
  // Calculate trend
  const getTrend = () => {
    if (!showTrend || previousScore === undefined) return null;
    const diff = score - previousScore;
    if (Math.abs(diff) < 0.01) return { icon: Minus, color: 'text-gray-400', label: 'Stable' };
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-400', label: `+${(diff * 100).toFixed(1)}%` };
    return { icon: TrendingDown, color: 'text-red-400', label: `${(diff * 100).toFixed(1)}%` };
  };

  const trend = getTrend();
  const TrendIcon = trend?.icon;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const badge = (
    <Badge 
      className={`${color} ${textColor} ${sizeClasses[size]} font-semibold inline-flex items-center gap-1 hover:opacity-90 transition-opacity`}
      variant="default"
    >
      <span>{(score * 100).toFixed(1)}%</span>
      <span className="opacity-80">({label})</span>
      {showTrend && TrendIcon && (
        <TrendIcon className={`${iconSizes[size]} ${trend.color} ml-1`} />
      )}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4 bg-gray-900 border-gray-800">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-white">Data Reliability Score</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Score:</span>
                <span className={`font-semibold ${textColor.replace('text-', 'text-')}`}>
                  {(score * 100).toFixed(1)}% - {label}
                </span>
              </div>
              
              {showTrend && previousScore !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Previous Score:</span>
                  <span className="text-gray-300">{(previousScore * 100).toFixed(1)}%</span>
                </div>
              )}
              
              {trend && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Trend:</span>
                  <span className={trend.color}>{trend.label}</span>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-700 pt-3 space-y-2">
              <p className="text-xs text-gray-400 font-semibold">What This Measures:</p>
              <p className="text-xs text-gray-300 mb-2 italic">
                This score indicates how reliable our supply chain data is - not the quality of petroleum products.
              </p>
              <ul className="text-xs space-y-1 text-gray-300">
                <li className="flex items-start gap-1">
                  <span className="text-green-400">•</span>
                  <span><strong>Data Completeness:</strong> Are volume, company, and date fields filled in?</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong>Data Consistency:</strong> Do the numbers make sense and align?</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-yellow-400">•</span>
                  <span><strong>Data Freshness:</strong> Is the information current and timely?</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-purple-400">•</span>
                  <span><strong>Data Accuracy:</strong> Are there statistical outliers or errors?</span>
                </li>
              </ul>
              <p className="text-xs text-blue-300 mt-2 font-medium">
                💡 Higher scores mean more trustworthy analytics and insights.
              </p>
            </div>
            
            <div className="border-t border-gray-700 pt-3">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center">
                  <div className="bg-green-500 h-2 rounded mb-1"></div>
                  <span className="text-gray-400">≥95%</span>
                  <p className="text-gray-500">Highly Reliable</p>
                </div>
                <div className="text-center">
                  <div className="bg-yellow-500 h-2 rounded mb-1"></div>
                  <span className="text-gray-400">85-95%</span>
                  <p className="text-gray-500">Reliable</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-500 h-2 rounded mb-1"></div>
                  <span className="text-gray-400">75-85%</span>
                  <p className="text-gray-500">Some Gaps</p>
                </div>
                <div className="text-center">
                  <div className="bg-red-500 h-2 rounded mb-1"></div>
                  <span className="text-gray-400">{'<75%'}</span>
                  <p className="text-gray-500">Unreliable</p>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Quality Score Filter Component
interface QualityFilterProps {
  minQuality: number;
  onQualityChange: (value: number) => void;
}

export function QualityFilter({ minQuality, onQualityChange }: QualityFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-300">
        Min Quality:
      </label>
      <input
        type="range"
        min="0"
        max="100"
        value={minQuality * 100}
        onChange={(e) => onQualityChange(Number(e.target.value) / 100)}
        className="w-32"
      />
      <QualityScoreBadge score={minQuality} size="sm" showTooltip={false} />
    </div>
  );
}

// Quality Trend Indicator
interface QualityTrendProps {
  current: number;
  previous: number;
  label?: string;
}

export function QualityTrend({ current, previous, label }: QualityTrendProps) {
  const diff = current - previous;
  const percentChange = (diff / previous) * 100;
  const isPositive = diff >= 0;

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-400">{label}:</span>}
      <QualityScoreBadge score={current} showTrend={true} previousScore={previous} size="sm" />
      <span className={`text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
      </span>
    </div>
  );
}