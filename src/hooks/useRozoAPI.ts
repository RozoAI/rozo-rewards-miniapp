import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useAccount, useSignMessage } from 'wagmi';

// Error types for better error handling
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  INSUFFICIENT_AUTHORIZATION = 'INSUFFICIENT_AUTHORIZATION',
  INSUFFICIENT_ROZO = 'INSUFFICIENT_ROZO',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR'
}

// User-friendly error messages
const ERROR_MESSAGES = {
  [ErrorType.NETWORK_ERROR]: "Network connection failed. Please check your internet connection.",
  [ErrorType.AUTHENTICATION_ERROR]: "Authentication failed. Please reconnect your wallet.",
  [ErrorType.INSUFFICIENT_AUTHORIZATION]: "Insufficient spending authorization. Please increase your limit.",
  [ErrorType.INSUFFICIENT_ROZO]: "Insufficient ROZO balance for this payment.",
  [ErrorType.PAYMENT_FAILED]: "Payment failed. Please try again.",
  [ErrorType.SIGNATURE_REJECTED]: "Signature was rejected. Please try signing again.",
  [ErrorType.RATE_LIMITED]: "Too many requests. Please wait a moment and try again.",
  [ErrorType.SERVER_ERROR]: "Server error. Please try again later."
};

// API response types
interface SpendPermission {
  authorized: boolean;
  allowance: number;
  daily_limit: number;
  remaining_today: number;
  expiry: string;
  status: string;
}

interface RozoBalance {
  available_cashback_rozo: number;
  available_cashback_usd: number;
  used_cashback_rozo: number;
  total_cashback_rozo: number;
  current_tier: string;
  tier_multiplier: number;
}

interface PaymentResult {
  transaction_id: string;
  payment_method: string;
  amount_paid_usd: number;
  rozo_balance_change: number;
  new_rozo_balance: number;
  cashback_earned: number;
}

// API configuration
const BASE_URL = 'https://usgsoilitadwutfvxfzq.supabase.co/functions/v1';

export const useRozoAPI = () => {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('rozo_jwt_token');
    const storedExpiry = localStorage.getItem('rozo_jwt_expires');
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry);
      if (Date.now() < expiryTime) {
        setAuthToken(storedToken);
        setIsAuthenticated(true);
      } else {
        // Token expired
        localStorage.removeItem('rozo_jwt_token');
        localStorage.removeItem('rozo_jwt_expires');
      }
    }
  }, []);

  // Don't auto-authenticate - let user manually authenticate
  // This prevents double popups

  // Authenticate with wallet signature and get JWT token
  const authenticateWallet = useCallback(async () => {
    if (!address || !signMessageAsync) return null;

    try {
      setLoading(true);
      
      // Create authentication message
      const message = `Sign this message to authenticate with Rozo Rewards\n\nWallet: ${address}\nTimestamp: ${Date.now()}`;
      const nonce = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Sign message
      const signature = await signMessageAsync({ message });
      
      // Send to backend for JWT token
      const response = await fetch(`${BASE_URL}/auth-wallet-login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': typeof window !== 'undefined' ? window.location.origin : 'https://rozo-rewards-miniapp.vercel.app'
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          wallet_address: address,
          signature,
          message,
          nonce
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data.access_token) {
        const token = data.data.access_token;
        setAuthToken(token);
        setIsAuthenticated(true);
        localStorage.setItem('rozo_jwt_token', token);
        localStorage.setItem('rozo_jwt_expires', String(Date.now() + (7 * 24 * 60 * 60 * 1000))); // 7 days
        
        toast.success('Successfully authenticated with Rozo Rewards!');
        return token;
      } else {
        throw new Error('Authentication response invalid');
      }
    } catch (error: any) {
      console.error('Wallet authentication error:', error);
      
      // Handle different types of errors
      if (error.name === 'UserRejectedRequestError' || error.message?.includes('User rejected')) {
        toast.error('Signature cancelled. Authentication is required for ROZO features.');
        return null;
      } else if (error.message?.includes('Failed to fetch')) {
        console.error('Network error details:', error);
        toast.error('Network error: Unable to connect to authentication service. Please check your internet connection.');
        return null;
      } else {
        console.error('Authentication error details:', error);
        toast.error(`Authentication failed: ${error.message}`);
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [address, signMessageAsync]);

  // Get current JWT token (from state or localStorage)
  const getAuthToken = useCallback(() => {
    if (authToken && isAuthenticated) return authToken;
    
    const storedToken = localStorage.getItem('rozo_jwt_token');
    const storedExpiry = localStorage.getItem('rozo_jwt_expires');
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry);
      if (Date.now() < expiryTime) {
        setAuthToken(storedToken);
        setIsAuthenticated(true);
        return storedToken;
      } else {
        // Token expired
        localStorage.removeItem('rozo_jwt_token');
        localStorage.removeItem('rozo_jwt_expires');
        setIsAuthenticated(false);
      }
    }
    
    return null;
  }, [authToken, isAuthenticated]);

  // Helper function to make authenticated API calls
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    let token = getAuthToken();
    
    // If no token, try to authenticate first
    if (!token && isConnected && address) {
      token = await authenticateWallet();
    }
    
    if (!token) {
      throw new Error(ERROR_MESSAGES[ErrorType.AUTHENTICATION_ERROR]);
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': typeof window !== 'undefined' ? window.location.origin : 'https://rozo-rewards-miniapp.vercel.app',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  }, [getAuthToken, isConnected, address, authenticateWallet]);

  // Handle errors with appropriate user feedback
  const handleError = useCallback((error: any) => {
    console.error('API Error:', error);
    
    let errorType = ErrorType.SERVER_ERROR;
    const message = error.message || 'Unknown error occurred';

    // Categorize errors based on message content
    if (message.includes('Network') || message.includes('fetch')) {
      errorType = ErrorType.NETWORK_ERROR;
    } else if (message.includes('401') || message.includes('authentication')) {
      errorType = ErrorType.AUTHENTICATION_ERROR;
    } else if (message.includes('INSUFFICIENT_BALANCE')) {
      errorType = ErrorType.INSUFFICIENT_ROZO;
    } else if (message.includes('SPEND_PERMISSION')) {
      errorType = ErrorType.INSUFFICIENT_AUTHORIZATION;
    } else if (message.includes('429')) {
      errorType = ErrorType.RATE_LIMITED;
    }

    const userMessage = ERROR_MESSAGES[errorType];
    setError(userMessage);
    toast.error(userMessage);
    
    return errorType;
  }, []);

  // Check current spend permission status
  const checkSpendPermission = useCallback(async (): Promise<SpendPermission | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiCall('/auth-spend-permission');
      return response.data;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError]);

  // Set up spend permission authorization
  const authorizeSpending = useCallback(async (
    amount: number,
    signature: string
  ): Promise<SpendPermission | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiCall('/auth-spend-permission', {
        method: 'POST',
        body: JSON.stringify({
          authorized: true,
          allowance: amount,
          daily_limit: amount,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          signature: signature
        })
      });

      toast.success(`Successfully authorized $${amount} spending limit!`);
      return response.data;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError]);

  // Note: Credit deduction now handled by real on-chain transactions

  // Get ROZO balance
  const getRozoBalance = useCallback(async (): Promise<RozoBalance | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // Require authentication
      if (!authToken) {
        throw new Error('Authentication required');
      }
      
      const response = await apiCall('/cashback-balance');
      
      // Safe access to response data
      if (response?.data?.balance_summary) {
        return response.data.balance_summary;
      } else {
        throw new Error('Invalid response format from balance API');
      }
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError, authToken]);

  // Check payment eligibility
  const checkPaymentEligibility = useCallback(async (
    amount: number, 
    isUsingCredit: boolean = false
  ) => {
    try {
      const response = await apiCall('/payments-eligibility', {
        method: 'POST',
        body: JSON.stringify({
          amount_usd: amount,
          is_using_credit: isUsingCredit
        })
      });
      return response.data;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [apiCall, handleError]);

  // Process payment
  const processPayment = useCallback(async (
    receiverAddress: string,
    amount: number,
    cashbackRate: number,
    isUsingCredit: boolean = false
  ): Promise<PaymentResult | null> => {
    try {
      setLoading(true);
      setError(null);

      // First check eligibility
      const eligibility = await checkPaymentEligibility(amount, isUsingCredit);
      if (!eligibility?.eligible) {
        throw new Error('Payment not eligible. Please check your authorization status.');
      }

      // Process the payment
      const response = await apiCall('/payments-process', {
        method: 'POST',
        body: JSON.stringify({
          receiver: receiverAddress,
          cashback_rate: cashbackRate,
          amount: amount,
          is_using_credit: isUsingCredit,
          auto_execute: true,
          nonce: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      });

      const paymentData = response.data;
      
      // Show success notification
      if (isUsingCredit) {
        toast.success(
          `Payment successful! Used ${Math.abs(paymentData.rozo_balance_change)} ROZO credits.`,
          {
            description: `Remaining ROZO: ${paymentData.new_rozo_balance}`,
            duration: 5000,
          }
        );
      } else {
        toast.success(
          `Payment successful! Earned ${paymentData.cashback_earned} ROZO!`,
          {
            description: `Total ROZO: ${paymentData.new_rozo_balance}`,
            duration: 5000,
          }
        );
      }

      return paymentData;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError, checkPaymentEligibility]);

  // Retry with exponential backoff
  const retryWithBackoff = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3
  ) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  return {
    loading,
    error,
    authToken,
    isAuthenticated,
    authenticateWallet,
    checkSpendPermission,
    authorizeSpending,
    getRozoBalance,
    checkPaymentEligibility,
    processPayment,
    retryWithBackoff,
    clearError: () => setError(null)
  };
};

// Test configuration
export const TEST_CONFIG = {
  authorizationAmount: 20.00,
  nsCafePayment: 0.10,
  cashbackRate: 10.0,
  expectedRozo: 1, // 0.1 * 10% * 100 = 1 ROZO
  nsCafeWallet: "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897", // NS Cafe address
};
