'use client';

import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, TrendingUp, TrendingDown, AlertTriangle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RiskAnalysisTooltipProps {
  riskLevel: string;
  data: any;
  children: React.ReactNode;
}

export function RiskAnalysisTooltip({ riskLevel, data, children }: RiskAnalysisTooltipProps) {
  // Calculate individual risk components for display
  const volatilityCoeff = data.volatility_coefficient || 0;
  const normalizedVolatility = Math.min(volatilityCoeff / 50, 1);
  const qualityScore = data.overall_quality_score || data.quality_score || 1;
  const qualityRisk = Math.max(0, (0.90 - qualityScore) / 0.10);
  
  // Volume risk calculation (simplified for display)
  const volume = data.total_quantity || 0;
  let volumeRisk = 0;
  if (volume < 100000) volumeRisk = 1.0;
  else if (volume < 500000) volumeRisk = 0.7;
  else if (volume < 1000000) volumeRisk = 0.4;
  else volumeRisk = 0.1;
  
  // Trend risk
  const growthRate = Math.abs(data.avg_yoy_growth || data.growth_rate || 0);
  const trendRisk = growthRate > 30 ? 0.8 : growthRate > 15 ? 0.4 : 0.1;
  
  // Calculate overall risk score
  const riskScore = (normalizedVolatility * 0.4) + 
                   (qualityRisk * 0.3) + 
                   (volumeRisk * 0.2) + 
                   (trendRisk * 0.1);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return Shield;
      case 'medium': return Info;
      case 'high': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Info;
    }
  };

  const RiskIcon = getRiskIcon(riskLevel);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4 bg-gray-900 border-gray-800">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <RiskIcon className={`w-4 h-4 ${getRiskColor(riskLevel)}`} />
              <span className="font-semibold text-white">Risk Assessment</span>
            </div>
            
            {/* Overall Risk Score */}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Overall Risk Score:</span>
              <Badge variant="outline" className={`${getRiskColor(riskLevel)} border-current`}>
                {(riskScore * 100).toFixed(1)}% - {riskLevel.toUpperCase()}
              </Badge>
            </div>
            
            {/* Risk Components */}
            <div className="border-t border-gray-700 pt-3 space-y-2">
              <p className="text-xs text-gray-400 font-semibold">Risk Components:</p>
              
              {/* Volatility Risk */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-gray-300">Supply Volatility (40%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-12 bg-gray-700 rounded-full h-1">
                    <div 
                      className="h-1 bg-blue-400 rounded-full" 
                      style={{ width: `${normalizedVolatility * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{volatilityCoeff.toFixed(1)}%</span>
                </div>
              </div>
              
              {/* Quality Risk */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-gray-300">Quality Risk (30%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-12 bg-gray-700 rounded-full h-1">
                    <div 
                      className="h-1 bg-green-400 rounded-full" 
                      style={{ width: `${qualityRisk * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{(qualityScore * 100).toFixed(1)}%</span>
                </div>
              </div>
              
              {/* Volume Risk */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-gray-300">Volume Risk (20%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-12 bg-gray-700 rounded-full h-1">
                    <div 
                      className="h-1 bg-purple-400 rounded-full" 
                      style={{ width: `${volumeRisk * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {volume >= 1e9 ? `${(volume / 1e9).toFixed(1)}B` :
                     volume >= 1e6 ? `${(volume / 1e6).toFixed(1)}M` :
                     volume >= 1e3 ? `${(volume / 1e3).toFixed(1)}K` : volume.toFixed(0)}
                  </span>
                </div>
              </div>
              
              {/* Trend Risk */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-gray-300">Trend Stability (10%)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-12 bg-gray-700 rounded-full h-1">
                    <div 
                      className="h-1 bg-yellow-400 rounded-full" 
                      style={{ width: `${trendRisk * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{growthRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            {/* Risk Level Explanation */}
            <div className="border-t border-gray-700 pt-3">
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div className="text-center">
                  <div className="bg-green-500 h-1 rounded mb-1"></div>
                  <span className="text-gray-400">Low</span>
                  <p className="text-gray-500 text-[10px]">0-20%</p>
                </div>
                <div className="text-center">
                  <div className="bg-yellow-500 h-1 rounded mb-1"></div>
                  <span className="text-gray-400">Med</span>
                  <p className="text-gray-500 text-[10px]">20-45%</p>
                </div>
                <div className="text-center">
                  <div className="bg-orange-500 h-1 rounded mb-1"></div>
                  <span className="text-gray-400">High</span>
                  <p className="text-gray-500 text-[10px]">45-70%</p>
                </div>
                <div className="text-center">
                  <div className="bg-red-500 h-1 rounded mb-1"></div>
                  <span className="text-gray-400">Crit</span>
                  <p className="text-gray-500 text-[10px]">70%+</p>
                </div>
              </div>
            </div>
            
            {/* Risk Interpretation */}
            <div className="border-t border-gray-700 pt-2">
              <p className="text-xs text-gray-400">
                <strong>Interpretation:</strong> {
                  riskLevel === 'low' ? 'Reliable supply with minimal disruption risk.' :
                  riskLevel === 'medium' ? 'Moderate risk - monitor for changes.' :
                  riskLevel === 'high' ? 'Elevated risk - consider mitigation strategies.' :
                  'Critical risk - immediate attention required.'
                }
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}