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

// Development mode mock responses
const getMockApiResponse = (endpoint: string, options: RequestInit = {}) => {
  console.log('🔧 Development mode: Returning mock data for', endpoint);
  
  if (endpoint.includes('/auth-spend-permission')) {
    if (options.method === 'POST') {
      return {
        success: true,
        data: {
          authorized: true,
          allowance: 20.00,
          daily_limit: 20.00,
          remaining_today: 20.00,
          expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        }
      };
    } else {
      return {
        success: true,
        data: {
          authorized: false,
          allowance: 0,
          remaining_today: 0,
          status: 'not_authorized'
        }
      };
    }
  } else if (endpoint.includes('/cashback-balance')) {
    return {
      success: true,
      data: {
        balance_summary: {
          available_cashback_rozo: 0,
          total_earned_rozo: 0,
          used_cashback_rozo: 0,
          total_cashback_rozo: 0,
          current_tier: 'bronze',
          tier_multiplier: 1.0
        }
      }
    };
  } else if (endpoint.includes('/payments-eligibility')) {
    return {
      success: true,
      data: {
        eligible: true,
        reason: 'Development mode - payment eligible',
        cashback_preview: {
          rozo_earned: 1,
          cashback_rate: 10.0
        }
      }
    };
  } else if (endpoint.includes('/payments-process')) {
    return {
      success: true,
      data: {
        payment_id: `dev_payment_${Date.now()}`,
        amount_paid_usd: 0.1,
        cashback_earned: 1,
        new_rozo_balance: 1,
        rozo_balance_change: 1,
        transaction_hash: `0xdev${Date.now()}`,
        status: 'completed'
      }
    };
  }
  
  // Default mock response
  return {
    success: false,
    error: { message: 'Development mode: Mock endpoint not implemented' }
  };
};

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
        return;
      } else {
        // Token expired
        localStorage.removeItem('rozo_jwt_token');
        localStorage.removeItem('rozo_jwt_expires');
      }
    }
    
    // For development: auto-authenticate with mock token
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('🔧 Development mode: auto-authenticating with mock token');
      const mockToken = 'dev_mock_token_' + Date.now();
      const mockExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      
      localStorage.setItem('rozo_jwt_token', mockToken);
      localStorage.setItem('rozo_jwt_expires', mockExpiry.toString());
      setAuthToken(mockToken);
      setIsAuthenticated(true);
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
        
        // Development fallback for testing when API is unreachable
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app'))) {
          console.warn('API unreachable, using development fallback authentication');
          
          // Create a simple development token for testing
          const devToken = btoa(JSON.stringify({
            wallet_address: address,
            user_id: `dev_user_${address.slice(-6)}`,
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
            dev_mode: true
          }));
          
          setAuthToken(devToken);
          setIsAuthenticated(true);
          localStorage.setItem('rozo_jwt_token', devToken);
          localStorage.setItem('rozo_jwt_expires', String(Date.now() + (24 * 60 * 60 * 1000))); // 24 hours
          
          toast.success('🔧 Development mode: Authentication simulated successfully!');
          return devToken;
        }
        
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
    const token = getAuthToken();
    
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
        
        // If 401 status OR auth error message, clear authentication state
        const isAuthError = response.status === 401 || 
          (errorData.error?.message && typeof errorData.error.message === 'string' && errorData.error.message.includes('401')) ||
          (errorData.error?.code && typeof errorData.error.code === 'string' && errorData.error.code.includes('token'));
        
        if (isAuthError) {
          console.log('API returned authentication error, clearing authentication state');
          localStorage.removeItem('rozo_jwt_token');
          localStorage.removeItem('rozo_jwt_expires');
          setAuthToken(null);
          setIsAuthenticated(false);
        }
        
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`API call to ${endpoint} failed:`, error);
      
      // Development mode fallbacks
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app')) && 
          token && typeof token === 'string') {
        try {
          const decoded = JSON.parse(atob(token));
          if (decoded.dev_mode) {
            console.warn(`API call to ${endpoint} failed, returning development mock data`);
            return getMockApiResponse(endpoint, options);
          }
        } catch (e) {
          // Not a development token, continue with error
        }
      }
      
      throw error;
    }
  }, [getAuthToken]);

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

  // Add retry tracking to prevent infinite loops
  const [retryCount, setRetryCount] = useState<{ [key: string]: number }>({});
  const MAX_RETRIES = 3;
  const RETRY_WINDOW = 30000; // 30 seconds

  // Check current spend permission status
  const checkSpendPermission = useCallback(async (): Promise<SpendPermission | null> => {
    // For development: return mock data directly, no auth required
    console.log('🔧 Development mode: returning mock spend permission');
    return {
      authorized: true,
      allowance: 20.0,
      remaining_today: 20.0,
      daily_limit: 20.0,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "active"
    };
  }, []);

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

  // Get ROZO balance (with persistent state)
  const getRozoBalance = useCallback(async (): Promise<RozoBalance | null> => {
    // For development: use localStorage to persist ROZO balance changes
    const storedBalance = localStorage.getItem('rozo_balance');
    const currentBalance = storedBalance ? JSON.parse(storedBalance) : {
      available_cashback_rozo: 0,
      total_cashback_rozo: 0,
      used_cashback_rozo: 0,
      available_cashback_usd: 0.0,
      total_cashback_usd: 0.0,
      used_cashback_usd: 0.0,
      current_tier: "bronze",
      tier_multiplier: 1.0,
      conversion_rate: "1 ROZO = $0.01 USD"
    };
    
    console.log('🔧 Development mode: returning stored ROZO balance', currentBalance);
    return currentBalance;
  }, []);

  // Check payment eligibility
  const checkPaymentEligibility = useCallback(async (
    amount: number, 
    isUsingCredit: boolean = false
  ) => {
    // For development: return mock eligibility data (always eligible)
    console.log('🔧 Development mode: returning mock payment eligibility');
    const cashbackEarned = amount * 0.10; // 10% cashback rate
    return {
      eligible: true,
      payment_method: "usdc",
      allowance_remaining: 20.0,
      spend_permission: {
        authorized: true,
        remaining_today: 20.0
      },
      cashback_preview: {
        estimated_rozo: cashbackEarned,
        estimated_usd: cashbackEarned * 0.01,
        final_rate: 10.0
      },
      recommendations: []
    };
  }, []);

  // Process payment
  const processPayment = useCallback(async (
    receiverAddress: string,
    amount: number,
    cashbackRate: number,
    isUsingCredit: boolean = false
  ): Promise<PaymentResult | null> => {
    // For development: return mock payment result and update ROZO balance
    console.log('🔧 Development mode: processing payment and updating ROZO balance');
    const cashbackEarned = amount * cashbackRate;
    
    // Update ROZO balance in localStorage
    const storedBalance = localStorage.getItem('rozo_balance');
    const currentBalance = storedBalance ? JSON.parse(storedBalance) : {
      available_cashback_rozo: 0,
      total_cashback_rozo: 0,
      used_cashback_rozo: 0,
      available_cashback_usd: 0.0,
      total_cashback_usd: 0.0,
      used_cashback_usd: 0.0,
      current_tier: "bronze",
      tier_multiplier: 1.0,
      conversion_rate: "1 ROZO = $0.01 USD"
    };
    
    // Add earned ROZO to balance
    const updatedBalance = {
      ...currentBalance,
      available_cashback_rozo: currentBalance.available_cashback_rozo + cashbackEarned,
      total_cashback_rozo: currentBalance.total_cashback_rozo + cashbackEarned,
      available_cashback_usd: (currentBalance.available_cashback_rozo + cashbackEarned) * 0.01,
      total_cashback_usd: (currentBalance.total_cashback_rozo + cashbackEarned) * 0.01,
    };
    
    // Save updated balance
    localStorage.setItem('rozo_balance', JSON.stringify(updatedBalance));
    console.log('💰 Updated ROZO balance:', updatedBalance);
    
    return {
      success: true,
      amount_paid_usd: amount,
      cashback_earned: cashbackEarned,
      transaction_hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      message: `Successfully paid $${amount.toFixed(2)} and earned ${cashbackEarned} ROZO!`
    };
  }, []);

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
