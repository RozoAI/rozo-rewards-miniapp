'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
// Badge component not available - using span replacement
import { useRozoAPI } from '@/hooks/useRozoAPI';

interface BalanceDisplayProps {
  onBalanceUpdate?: (balance: number) => void;
  className?: string;
  showRefreshButton?: boolean;
  compact?: boolean;
}

interface SpendPermissionData {
  authorized: boolean;
  allowance: number;
  daily_limit: number;
  remaining_today: number;
  expiry: string;
  status: string;
}

interface RozoBalanceData {
  available_cashback_rozo: number;
  available_cashback_usd: number;
  used_cashback_rozo: number;
  total_cashback_rozo: number;
  current_tier: string;
  tier_multiplier: number;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  onBalanceUpdate,
  className = "",
  showRefreshButton = true,
  compact = false
}) => {
  const { 
    loading, 
    error, 
    isAuthenticated,
    checkSpendPermission, 
    getRozoBalance,
    clearError 
  } = useRozoAPI();

  const [spendPermission, setSpendPermission] = useState<SpendPermissionData | null>(null);
  const [rozoBalance, setRozoBalance] = useState<RozoBalanceData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated) {
      setSpendPermission(null);
      setRozoBalance(null);
      return;
    }

    try {
      const [permission, balance] = await Promise.all([
        checkSpendPermission(),
        getRozoBalance()
      ]);

      if (permission) {
        setSpendPermission(permission);
      }

      if (balance) {
        setRozoBalance(balance);
        onBalanceUpdate?.(balance.available_cashback_rozo);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  }, [checkSpendPermission, getRozoBalance, onBalanceUpdate, isAuthenticated]);

  // Load data when authenticated
  useEffect(() => {
    refreshData();
  }, [isAuthenticated, refreshData]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return 'bg-orange-100 text-orange-800';
      case 'silver': return 'bg-gray-100 text-gray-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'platinum': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierEmoji = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'platinum': return '💎';
      default: return '🏆';
    }
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatRozo = (value: number) => `${value} ROZO`;

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        {/* Compact Authorization */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Authorization:</span>
          <span className="font-medium">
            {spendPermission?.authorized 
              ? formatCurrency(spendPermission.remaining_today)
              : 'Not set'
            }
          </span>
        </div>

        {/* Compact ROZO Balance */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">ROZO:</span>
          <span className="font-medium text-purple-600">
            {rozoBalance ? formatRozo(rozoBalance.available_cashback_rozo) : '0 ROZO'}
          </span>
        </div>

        {/* Refresh Button */}
        {showRefreshButton && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshData}
            disabled={loading}
          >
            {loading ? '⟳' : '↻'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Authorization Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Payment Authorization</CardTitle>
            {showRefreshButton && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {spendPermission?.authorized ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">✅ Active</p>
                  <p className="text-sm text-green-600">One-tap payments enabled</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-800">
                    {formatCurrency(spendPermission.remaining_today)}
                  </p>
                  <p className="text-sm text-green-600">remaining today</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Total Authorized</p>
                  <p className="font-medium">{formatCurrency(spendPermission.allowance)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Daily Limit</p>
                  <p className="font-medium">{formatCurrency(spendPermission.daily_limit)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-medium text-yellow-800">⚠️ No Authorization</p>
              <p className="text-sm text-yellow-600">
                Set up payment authorization to enable one-tap payments
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ROZO Balance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">ROZO Balance</CardTitle>
          <CardDescription>Your cashback rewards</CardDescription>
        </CardHeader>
        <CardContent>
          {rozoBalance ? (
            <div className="space-y-4">
              {/* Main Balance Display */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600">Available Balance</p>
                    <p className="text-3xl font-bold text-purple-800">
                      {formatRozo(rozoBalance.available_cashback_rozo)}
                    </p>
                    <p className="text-sm text-purple-600">
                      ≈ {formatCurrency(rozoBalance.available_cashback_usd)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-md text-sm font-medium ${getTierColor(rozoBalance.current_tier)}`}>
                      {getTierEmoji(rozoBalance.current_tier)} {rozoBalance.current_tier.toUpperCase()}
                    </span>
                    <p className="text-sm text-purple-600 mt-1">
                      {rozoBalance.tier_multiplier}x multiplier
                    </p>
                  </div>
                </div>
              </div>

              {/* Balance Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Earned</p>
                  <p className="font-semibold text-gray-800">
                    {formatRozo(rozoBalance.total_cashback_rozo)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Used</p>
                  <p className="font-semibold text-gray-800">
                    {formatRozo(rozoBalance.used_cashback_rozo)}
                  </p>
                </div>
              </div>

              {/* Progress to Next Tier */}
              {rozoBalance.current_tier !== 'platinum' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    🎯 Progress to next tier
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Keep earning ROZO to unlock higher cashback multipliers!
                  </p>
                </div>
              )}

              {/* Zero Balance Message */}
              {rozoBalance.available_cashback_rozo === 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800">
                    💡 Start earning ROZO
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Make purchases at participating merchants to earn cashback rewards!
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {loading ? 'Loading balance...' : 'Unable to load balance'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <div className="text-red-600">⚠️</div>
              <div>
                <p className="font-medium text-red-800">Update Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
