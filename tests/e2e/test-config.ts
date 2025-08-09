// E2E Test Configuration for Rozo Rewards MiniApp APIs
import { createClient } from '@supabase/supabase-js';

export interface TestConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  functionsUrl: string;
  testUserWallet: string;
  testMerchantWallet: string;
}

export interface TestContext {
  supabase: any;
  config: TestConfig;
  testUserId?: string;
  authToken?: string;
  testOrderId?: string;
  testTransactionId?: string;
}

// Test configuration - update with your Supabase project details
export const TEST_CONFIG: TestConfig = {
  supabaseUrl: 'https://usgsoilitadwutfvxfzq.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
  functionsUrl: 'https://usgsoilitadwutfvxfzq.supabase.co/functions/v1',
  testUserWallet: '0x1234567890123456789012345678901234567890',
  testMerchantWallet: '0x0987654321098765432109876543210987654321',
};

// Test data fixtures
export const TEST_FIXTURES = {
  testUser: {
    wallet_address: TEST_CONFIG.testUserWallet,
    username: 'e2e_test_user',
    email: 'test@rozo.ai',
    tier: 'gold' as const,
  },
  testMerchant: {
    name: 'E2E Test Merchant',
    category: 'AI' as const,
    website_url: 'https://test-merchant.com',
    domain: 'test-merchant.com',
    cashback_percentage: 5.0,
  },
  testProduct: {
    name: 'Test Premium Service',
    sku: 'TEST-PREMIUM-001',
    price_usd: 29.99,
    cashback_rate: 8.5,
    description: 'E2E Test Premium Service',
  },
  testPayment: {
    amount: 20.0,
    cashback_rate: 5.0,
    is_using_credit: false,
  },
  testRozoPayment: {
    amount: 0.10,
    cashback_rate: 1.0,
    is_using_credit: true,
  }
};

// API helper functions
export class APITestHelper {
  private config: TestConfig;
  private authToken?: string;

  constructor(config: TestConfig) {
    this.config = config;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(includeAuth: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async makeRequest(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    includeAuth: boolean = true
  ): Promise<any> {
    const url = `${this.config.functionsUrl}/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: this.getHeaders(includeAuth),
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    console.log(`🔄 ${method} ${url}`);
    if (body) {
      console.log(`📤 Request:`, JSON.stringify(body, null, 2));
    }

    const response = await fetch(url, options);
    const data = await response.json();

    console.log(`📥 Response (${response.status}):`, JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  }

  // Authentication helpers
  async authenticateWallet(walletAddress: string, signature: string): Promise<string> {
    const response = await this.makeRequest('auth-wallet-login', 'POST', {
      wallet_address: walletAddress,
      signature,
      message: `Login to Rozo Rewards at ${Date.now()}`
    }, false);

    if (response.success && response.data.access_token) {
      this.setAuthToken(response.data.access_token);
      return response.data.access_token;
    }

    throw new Error('Authentication failed');
  }

  // Merchant API helpers
  async getMerchants() {
    return this.makeRequest('merchants');
  }

  async getMerchantCategories() {
    return this.makeRequest('merchants-categories');
  }

  // Product API helpers
  async getProducts(params?: any) {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest(`products${query}`);
  }

  async getProductDetails(productId: string) {
    return this.makeRequest(`products-details?id=${productId}`);
  }

  // User API helpers
  async getUserProfile() {
    return this.makeRequest('users-profile');
  }

  async getUserStats() {
    return this.makeRequest('users-stats');
  }

  // Cashback API helpers
  async getCashbackBalance() {
    return this.makeRequest('cashback-balance');
  }

  async applyCashbackOffset(amountUsd: number, rozoAmount: number) {
    return this.makeRequest('cashback-apply-offset', 'POST', {
      amount_usd: amountUsd,
      rozo_amount: rozoAmount
    });
  }

  async claimCashback(transactionId: string, productId: string, amountUsd: number) {
    return this.makeRequest('cashback-claim', 'POST', {
      transaction_id: transactionId,
      product_id: productId,
      amount_usd: amountUsd
    });
  }

  // Payment API helpers
  async checkPaymentEligibility(amountUsd: number, isUsingCredit: boolean) {
    return this.makeRequest('payments-eligibility', 'POST', {
      amount_usd: amountUsd,
      is_using_credit: isUsingCredit
    });
  }

  async processPayment(receiver: string, cashbackRate: number, amount: number, isUsingCredit: boolean) {
    return this.makeRequest('payments-process', 'POST', {
      receiver,
      cashback_rate: cashbackRate,
      amount,
      is_using_credit: isUsingCredit,
      nonce: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  async createPaymentIntent(merchantId: string, amount: number, chainId: number, productId?: string) {
    return this.makeRequest('payments-create-intent', 'POST', {
      merchant_id: merchantId,
      product_id: productId,
      amount,
      chain_id: chainId
    });
  }

  // Spend Permission API helpers
  async getSpendPermission() {
    return this.makeRequest('auth-spend-permission');
  }

  async updateSpendPermission(authorized: boolean, allowance: number, expiry: string) {
    return this.makeRequest('auth-spend-permission', 'POST', {
      authorized,
      allowance,
      expiry
    });
  }

  // Order API helpers
  async getCart() {
    return this.makeRequest('orders-cart');
  }

  async addToCart(productId: string, quantity: number) {
    return this.makeRequest('orders-cart', 'POST', {
      product_id: productId,
      quantity
    });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.makeRequest(`orders-cart/${itemId}`, 'PUT', {
      quantity
    });
  }

  async removeFromCart(itemId: string) {
    return this.makeRequest(`orders-cart/${itemId}`, 'DELETE');
  }

  async clearCart() {
    return this.makeRequest('orders-cart', 'DELETE');
  }

  async checkout(orderId: string, rozoOffsetAmount?: number) {
    return this.makeRequest('orders-checkout', 'POST', {
      order_id: orderId,
      rozo_offset_amount: rozoOffsetAmount,
      shipping_address: {
        line1: '123 Test Street',
        city: 'Test City',
        country: 'US'
      }
    });
  }

  async getOrders(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.makeRequest(`orders${query}`);
  }

  async getOrderDetails(orderId: string) {
    return this.makeRequest(`orders?id=${orderId}`);
  }
}

// Test utilities
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateRandomWallet(): string {
  return '0x' + Array.from({ length: 40 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

export function generateRandomSignature(): string {
  return '0x' + Array.from({ length: 130 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

// Test assertion helpers
export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

export function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`❌ ${message}: expected ${expected}, got ${actual}`);
  }
  console.log(`✅ ${message}: ${actual}`);
}

export function assertGreaterThan(actual: number, threshold: number, message: string) {
  if (actual <= threshold) {
    throw new Error(`❌ ${message}: expected > ${threshold}, got ${actual}`);
  }
  console.log(`✅ ${message}: ${actual} > ${threshold}`);
}

export function assertContains(array: any[], item: any, message: string) {
  if (!array.includes(item)) {
    throw new Error(`❌ ${message}: array does not contain ${item}`);
  }
  console.log(`✅ ${message}`);
}
