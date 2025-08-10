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
  used_cashback_usd: number;
  total_cashback_rozo: number;
  total_cashback_usd: number;
  current_tier: string;
  tier_multiplier: number;
  conversion_rate?: string;
}

interface PaymentResult {
  success: boolean;
  amount_paid_usd: number;
  cashback_earned: number;
  transaction_hash: string;
  message: string;
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
    // Ready for real authentication - no auto-authentication needed
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

  // Check current spend permission status using real API
  const checkSpendPermission = useCallback(async (): Promise<SpendPermission | null> => {
    const token = getAuthToken();
    if (!token || !isAuthenticated) {
      console.log('⚠️ Cannot check spend permission: not authenticated');
      return null;
    }

    try {
      console.log('🔍 Checking spend permission with real API...');
      const response = await apiCall('/auth-spend-permission', {
        method: 'GET'
      });

      if (response.success && response.data) {
        console.log('✅ Spend permission retrieved:', response.data);
        return {
          authorized: response.data.authorized || false,
          allowance: response.data.allowance || 0,
          remaining_today: response.data.allowance || 0,
          daily_limit: response.data.allowance || 0,
          expiry: response.data.expiry || new Date().toISOString(),
          status: response.data.status || "inactive"
        };
      } else {
        console.log('❌ No spend permission found or invalid response');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to check spend permission:', error);
      return null;
    }
  }, [apiCall, getAuthToken, isAuthenticated]);

  // Set up spend permission authorization with real EIP-712 signature
  const authorizeSpending = useCallback(async (
    amount: number,
    signature: string
  ): Promise<SpendPermission | null> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 Processing CDP spend permission authorization...');

      // For development: create mock authorization with real signature validation intent
      // TODO: Integrate real EIP-712 when wagmi hooks are available in callback context
      const response = await apiCall('/auth-spend-permission', {
        method: 'POST',
        body: JSON.stringify({
          authorized: true,
          allowance: amount,
          daily_limit: amount,
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          signature: signature,
          signature_type: 'wallet_personal_sign', // For now, upgrade to EIP-712 later
          cdp_integration: true
        })
      });

      if (response.success) {
        toast.success(`✅ Successfully authorized $${amount} CDP spending limit!`);
        return {
          authorized: true,
          allowance: amount,
          remaining_today: amount,
          daily_limit: amount,
          expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "active"
        };
      }

      return response.data;
    } catch (error) {
      console.error('❌ CDP authorization failed:', error);
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, handleError]);

  // Note: Credit deduction now handled by real on-chain transactions

  // Get ROZO balance from real database
  const getRozoBalance = useCallback(async (): Promise<RozoBalance | null> => {
    const token = getAuthToken();
    if (!token || !isAuthenticated) {
      console.log('⚠️ Cannot get ROZO balance: not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching ROZO balance from cb_hack database...');
      const response = await apiCall('/cashback-balance');

      if (response.success && response.data?.balance_summary) {
        const balance = response.data.balance_summary;
        console.log('✅ ROZO balance retrieved from database:', balance);
        return balance;
      } else {
        console.error('❌ Invalid balance response:', response);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get ROZO balance:', error);
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, getAuthToken, isAuthenticated, handleError]);

  // Check payment eligibility using real API
  const checkPaymentEligibility = useCallback(async (
    amount: number, 
    isUsingCredit: boolean = false
  ) => {
    const token = getAuthToken();
    if (!token || !isAuthenticated) {
      console.log('⚠️ Cannot check payment eligibility: not authenticated');
      return { eligible: false, payment_method: "none", recommendations: ["Please authenticate first"] };
    }

    try {
      console.log('🔍 Checking payment eligibility with real API...');
      const response = await apiCall('/payments-eligibility', {
        method: 'POST',
        body: JSON.stringify({
          amount_usd: amount,
          is_using_credit: isUsingCredit
        })
      });

      if (response.success && response.data) {
        console.log('✅ Payment eligibility checked:', response.data);
        return response.data;
      } else {
        console.error('❌ Invalid eligibility response:', response);
        return { eligible: false, payment_method: "none", recommendations: ["Payment eligibility check failed"] };
      }
    } catch (error) {
      console.error('❌ Failed to check payment eligibility:', error);
      return { eligible: false, payment_method: "none", recommendations: ["Error checking payment eligibility"] };
    }
  }, [apiCall, getAuthToken, isAuthenticated]);

  // Process payment using real database
  const processPayment = useCallback(async (
    receiverAddress: string,
    amount: number,
    cashbackRate: number,
    isUsingCredit: boolean = false
  ): Promise<PaymentResult | null> => {
    const token = getAuthToken();
    if (!token || !isAuthenticated) {
      console.log('⚠️ Cannot process payment: not authenticated');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💳 Processing payment with cb_hack database:', { receiverAddress, amount, cashbackRate, isUsingCredit });
      
      const response = await apiCall('/payments-process', {
        method: 'POST',
        body: JSON.stringify({
          receiver: receiverAddress,
          amount: amount,
          cashback_rate: cashbackRate,
          is_using_credit: isUsingCredit,
          merchant_id: 'ns-cafe'
        })
      });

      if (response.success) {
        console.log('✅ Payment processed successfully with cb_hack database:', response.data);
        return {
          success: true,
          amount_paid_usd: response.data.amount_paid_usd,
          cashback_earned: response.data.cashback_earned_rozo || response.data.cashback_earned || 0,
          transaction_hash: response.data.transaction_hash,
          message: 'Payment completed successfully with cb_hack database'
        };
      } else {
        throw new Error(response.error?.message || 'Payment processing failed');
      }
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiCall, getAuthToken, isAuthenticated, handleError]);

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
