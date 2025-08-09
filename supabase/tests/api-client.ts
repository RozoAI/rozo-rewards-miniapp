// Live API Client for E2E Testing
// Tests against: https://usgsoilitadwutfvxfzq.supabase.co/functions/v1

export class LiveAPIClient {
  private baseUrl = 'https://usgsoilitadwutfvxfzq.supabase.co/functions/v1';
  private authToken?: string;

  constructor(authToken?: string) {
    this.authToken = authToken;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(includeAuth = true): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (includeAuth && this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async request(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any,
    includeAuth = true
  ): Promise<{ success: boolean; data?: any; error?: any; status: number }> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: this.getHeaders(includeAuth),
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      console.log(`🔄 ${method} ${endpoint}`);
      if (body) {
        console.log(`📤 Request:`, JSON.stringify(body, null, 2));
      }

      const response = await fetch(url, options);
      let data;
      
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }

      console.log(`📥 Response (${response.status}):`, JSON.stringify(data, null, 2));

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data : undefined,
        status: response.status
      };

    } catch (error) {
      console.error(`❌ Network error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 0
      };
    }
  }

  // Authentication APIs
  async walletLogin(walletAddress: string, signature: string, message: string) {
    return this.request('auth-wallet-login', 'POST', {
      wallet_address: walletAddress,
      signature,
      message
    }, false);
  }

  async getSpendPermission() {
    return this.request('auth-spend-permission', 'GET');
  }

  async updateSpendPermission(authorized: boolean, allowance: number, expiry: string) {
    return this.request('auth-spend-permission', 'POST', {
      authorized,
      allowance,
      expiry
    });
  }

  // User APIs
  async getUserProfile() {
    return this.request('users-profile', 'GET');
  }

  async getUserStats() {
    return this.request('users-stats', 'GET');
  }

  // Merchant APIs
  async getMerchants() {
    return this.request('merchants', 'GET');
  }

  async getMerchantCategories() {
    return this.request('merchants-categories', 'GET');
  }

  // Product APIs
  async getProducts(params?: Record<string, any>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`products${query}`, 'GET');
  }

  async getProductDetails(productId: string) {
    return this.request(`products-details?id=${productId}`, 'GET');
  }

  // Cashback APIs
  async getCashbackBalance() {
    return this.request('cashback-balance', 'GET');
  }

  async applyCashbackOffset(amountUsd: number, rozoAmount: number) {
    return this.request('cashback-apply-offset', 'POST', {
      amount_usd: amountUsd,
      rozo_amount: rozoAmount
    });
  }

  async claimCashback(transactionId: string, productId: string, amountUsd: number) {
    return this.request('cashback-claim', 'POST', {
      transaction_id: transactionId,
      product_id: productId,
      amount_usd: amountUsd
    });
  }

  // Payment APIs
  async checkPaymentEligibility(amountUsd: number, isUsingCredit: boolean) {
    return this.request('payments-eligibility', 'POST', {
      amount_usd: amountUsd,
      is_using_credit: isUsingCredit
    });
  }

  async processPayment(receiver: string, cashbackRate: number, amount: number, isUsingCredit: boolean, nonce?: string) {
    return this.request('payments-process', 'POST', {
      receiver,
      cashback_rate: cashbackRate,
      amount,
      is_using_credit: isUsingCredit,
      nonce: nonce || `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  async createPaymentIntent(merchantId: string, amount: number, chainId: number, productId?: string) {
    return this.request('payments-create-intent', 'POST', {
      merchant_id: merchantId,
      amount,
      chain_id: chainId,
      product_id: productId
    });
  }

  async confirmPayment(paymentIntentId: string, txHash: string) {
    return this.request('payments-confirm', 'POST', {
      payment_intent_id: paymentIntentId,
      transaction_hash: txHash,
      block_number: Math.floor(Math.random() * 1000000),
      gas_used: 21000,
      gas_price: 20000000000
    });
  }

  // Order APIs
  async getCart() {
    return this.request('orders-cart', 'GET');
  }

  async addToCart(productId: string, quantity: number) {
    return this.request('orders-cart', 'POST', {
      product_id: productId,
      quantity
    });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request(`orders-cart/${itemId}`, 'PUT', {
      quantity
    });
  }

  async removeFromCart(itemId: string) {
    return this.request(`orders-cart/${itemId}`, 'DELETE');
  }

  async clearCart() {
    return this.request('orders-cart', 'DELETE');
  }

  async checkout(orderId: string, rozoOffsetAmount?: number, shippingAddress?: any) {
    return this.request('orders-checkout', 'POST', {
      order_id: orderId,
      rozo_offset_amount: rozoOffsetAmount,
      shipping_address: shippingAddress || {
        line1: '123 Test Street',
        city: 'Test City',
        country: 'US'
      }
    });
  }

  async getOrders(status?: string, limit?: number, offset?: number) {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (limit) params.limit = limit.toString();
    if (offset) params.offset = offset.toString();
    
    const query = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`orders${query}`, 'GET');
  }

  async getOrderDetails(orderId: string) {
    return this.request(`orders?id=${orderId}`, 'GET');
  }
}

// Test utilities
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

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
  console.log(`✅ ${message}`);
}

export function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`❌ ${message}: expected ${expected}, got ${actual}`);
  }
  console.log(`✅ ${message}: ${actual}`);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
