'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export function Skeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height,
  count = 1
}: SkeletonProps) {
  const baseClasses = 'bg-gray-700 animate-pulse';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
    card: 'rounded-lg'
  };
  
  const style = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1rem' : '100%')
  };
  
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  ));
  
  return count > 1 ? (
    <div className="space-y-2">{skeletons}</div>
  ) : (
    skeletons[0]
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton width={60} height={20} />
      </div>
      <div>
        <Skeleton variant="text" width="60%" className="mb-2" />
        <Skeleton variant="text" width="80%" height={32} />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <Skeleton variant="text" width="30%" className="mb-4" />
      <div className="h-64 relative">
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-full">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex-1 mx-1">
              <Skeleton 
                variant="rectangular" 
                height={`${Math.random() * 80 + 20}%`}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <Skeleton variant="text" width="30%" className="mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1">
              <Skeleton variant="text" width="60%" className="mb-1" />
              <Skeleton variant="text" width="40%" />
            </div>
            <Skeleton variant="text" width="20%" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton variant="text" width="200px" height={36} className="mb-2" />
        <Skeleton variant="text" width="300px" />
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartSkeleton />
        <div className="lg:col-span-2">
          <TableSkeleton />
        </div>
      </div>
    </div>
  );
}

export function GaugeSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <Skeleton variant="text" width="60%" className="mb-3" />
      <div className="flex items-center justify-center">
        <Skeleton variant="circular" width={128} height={128} />
      </div>
      <div className="mt-3 text-center space-y-1">
        <Skeleton variant="text" width="40%" className="mx-auto" />
        <Skeleton variant="text" width="60%" className="mx-auto" />
        <Skeleton variant="text" width="50%" className="mx-auto" />
      </div>
    </div>
  );
}

export function SparklineSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <Skeleton variant="text" width="70%" className="mb-2" />
      <div className="flex items-end space-x-1 h-12">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton
            key={i}
            variant="rectangular"
            width={4}
            height={`${Math.random() * 100}%`}
          />
        ))}
      </div>
      <Skeleton variant="text" width="50%" className="mt-2" />
    </div>
  );
}