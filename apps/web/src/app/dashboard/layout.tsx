'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Factory, Fuel, Package2, TrendingUp, Menu, X, Activity, DollarSign, Shield, Building2, Truck, Users, Brain, MapPin, Map } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Executive', href: '/dashboard/executive', icon: BarChart3 },
    { name: 'BDC Performance', href: '/dashboard/bdc', icon: Factory },
    { name: 'BDC Comprehensive', href: '/dashboard/bdc/comprehensive', icon: TrendingUp },
    { name: 'OMC Performance', href: '/dashboard/omc', icon: Fuel },
    { name: 'OMC Comprehensive', href: '/dashboard/omc/comprehensive', icon: Activity },
    { name: 'Products Analytics', href: '/dashboard/products', icon: Package2 },
    { name: 'Regional Supply', href: '/dashboard/supply', icon: MapPin },
    { name: 'Ghana Map', href: '/dashboard/ghana-map', icon: Map },
    { name: 'Investor/Financial', href: '/dashboard/investor', icon: DollarSign },
    { name: 'Policy Makers', href: '/dashboard/policy', icon: Shield },
    { name: 'Company Analysis', href: '/dashboard/company', icon: Building2 },
    { name: 'Supply Chain', href: '/dashboard/supply-chain', icon: Truck },
    { name: 'Public/Research', href: '/dashboard/research', icon: Users },
    { name: 'Advanced Analytics', href: '/dashboard/analytics', icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="bg-gray-800 text-white p-2 rounded-md border border-gray-600"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center px-6 py-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">PetroVerse Analytics</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href === '/dashboard/bdc/comprehensive' && pathname.startsWith('/dashboard/bdc/comprehensive')) ||
                (item.href === '/dashboard/omc/comprehensive' && pathname.startsWith('/dashboard/omc/comprehensive'));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <div>Real-time data from standardized database</div>
              <div className="mt-1">API: localhost:8003 | Frontend: localhost:3001</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation bar for desktop */}
        <div className="hidden lg:flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-green-500 animate-pulse" />
              <span className="text-sm text-gray-300">Live Data</span>
            </div>
            <div className="text-sm text-gray-400" suppressHydrationWarning>
              {typeof window !== 'undefined' ? new Date().toLocaleString() : 'Loading...'}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              319 Companies • 32.8K Transactions • 57M MT
            </div>
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">A</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}