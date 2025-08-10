'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRozoAPI } from '@/hooks/useRozoAPI';

interface CreditContextType {
  availableCredit: number;
  setAvailableCredit: (amount: number) => void;
  deductCredit: (amount: number) => boolean;
  addCredit: (amount: number) => void;
  refreshCredit: () => Promise<void>;
  isLoading: boolean;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

interface CreditProviderProps {
  children: ReactNode;
}

export const CreditProvider: React.FC<CreditProviderProps> = ({ children }) => {
  const [availableCredit, setAvailableCreditState] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { checkSpendPermission, isAuthenticated } = useRozoAPI();

  // Load initial credit from spend permission
  const refreshCredit = useCallback(async () => {
    if (!isAuthenticated) {
      setAvailableCreditState(0);
      return;
    }

    setIsLoading(true);
    try {
      const spendPermission = await checkSpendPermission();
      if (spendPermission && spendPermission.authorized) {
        setAvailableCreditState(spendPermission.allowance || 0);
      } else {
        setAvailableCreditState(0);
      }
    } catch (error) {
      console.error('Failed to refresh credit:', error);
      setAvailableCreditState(0);
    } finally {
      setIsLoading(false);
    }
  }, [checkSpendPermission, isAuthenticated]);

  // Initialize credit when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshCredit();
    } else {
      setAvailableCreditState(0);
    }
  }, [isAuthenticated, refreshCredit]);

  const setAvailableCredit = (amount: number) => {
    setAvailableCreditState(Math.max(0, amount));
  };

  const deductCredit = (amount: number): boolean => {
    if (amount <= availableCredit && amount > 0) {
      setAvailableCreditState(prev => prev - amount);
      return true;
    }
    return false;
  };

  const addCredit = (amount: number) => {
    if (amount > 0) {
      setAvailableCreditState(prev => prev + amount);
    }
  };

  const value: CreditContextType = {
    availableCredit,
    setAvailableCredit,
    deductCredit,
    addCredit,
    refreshCredit,
    isLoading
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
};

export const useCredit = (): CreditContextType => {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
};
