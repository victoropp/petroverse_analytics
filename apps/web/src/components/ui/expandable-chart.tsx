'use client';

import { useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExpandableChartProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableChart({ 
  title, 
  description, 
  icon, 
  children, 
  className = "" 
}: ExpandableChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
        <div className="absolute inset-4 bg-gray-800 rounded-xl shadow-2xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              {icon}
              <h2 className="text-xl font-bold text-white">{title}</h2>
              {description && <p className="text-sm text-gray-400 ml-2">{description}</p>}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close fullscreen"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-gray-800 border-gray-700 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            {description && <CardDescription className="text-gray-400">{description}</CardDescription>}
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Expand to fullscreen"
        >
          <Maximize2 className="w-4 h-4 text-gray-400" />
        </button>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}