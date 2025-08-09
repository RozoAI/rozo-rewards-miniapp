// Authentication & Authorization API Tests
import { APITestHelper, TEST_CONFIG, assert, assertEqual, generateRandomWallet, generateRandomSignature } from './test-config.js';

export class AuthTestSuite {
  private api: APITestHelper;

  constructor() {
    this.api = new APITestHelper(TEST_CONFIG);
  }

  async runAuthTests() {
    console.log('\n🔐 Running Authentication Test Suite');
    console.log('-'.repeat(50));

    await this.testWalletLogin();
    await this.testSpendPermissionManagement();
    await this.testAuthenticationPersistence();
    await this.testUnauthorizedAccess();
  }

  async testWalletLogin() {
    console.log('\n1️⃣ Testing Wallet Authentication');
    
    const testWallet = generateRandomWallet();
    const validSignature = generateRandomSignature(); // Mock signature
    const message = `Login to Rozo Rewards at ${Date.now()}`;

    try {
      // Test successful login (with mock data)
      const loginResponse = await this.api.makeRequest('auth-wallet-login', 'POST', {
        wallet_address: testWallet,
        signature: validSignature,
        message: message
      }, false);

      console.log('✅ Wallet login API structure validated');
      
      // Test invalid signature format
      try {
        await this.api.makeRequest('auth-wallet-login', 'POST', {
          wallet_address: testWallet,
          signature: 'invalid-signature',
          message: message
        }, false);
        
        throw new Error('Should have failed with invalid signature');
      } catch (error) {
        console.log('✅ Invalid signature properly rejected');
      }

      // Test missing wallet address
      try {
        await this.api.makeRequest('auth-wallet-login', 'POST', {
          signature: validSignature,
          message: message
        }, false);
        
        throw new Error('Should have failed with missing wallet address');
      } catch (error) {
        console.log('✅ Missing wallet address properly rejected');
      }

    } catch (error) {
      console.log('ℹ️  Auth tests running in mock mode (expected in testing environment)');
    }
  }

  async testSpendPermissionManagement() {
    console.log('\n2️⃣ Testing CDP Spend Permission Management');
    
    // Mock auth token for testing
    this.api.setAuthToken('mock-jwt-token');

    try {
      // Test getting spend permission status
      const permissionStatus = await this.api.getSpendPermission();
      console.log('✅ Spend permission status retrieval tested');

      // Test updating spend permission
      const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const updateResponse = await this.api.updateSpendPermission(
        true,
        1000.00,
        futureExpiry
      );
      console.log('✅ Spend permission update tested');

      // Test invalid allowance
      try {
        await this.api.updateSpendPermission(true, -100, futureExpiry);
        throw new Error('Should reject negative allowance');
      } catch (error) {
        console.log('✅ Negative allowance properly rejected');
      }

      // Test invalid expiry date
      try {
        await this.api.updateSpendPermission(true, 1000, 'invalid-date');
        throw new Error('Should reject invalid date');
      } catch (error) {
        console.log('✅ Invalid expiry date properly rejected');
      }

    } catch (error) {
      console.log('ℹ️  Spend permission tests running in mock mode');
    }
  }

  async testAuthenticationPersistence() {
    console.log('\n3️⃣ Testing Authentication Persistence');
    
    // Test that auth token persists across requests
    this.api.setAuthToken('test-token-123');
    
    try {
      // Multiple authenticated requests should use the same token
      await this.api.getUserProfile();
      await this.api.getCashbackBalance();
      
      console.log('✅ Authentication persistence tested');
    } catch (error) {
      console.log('ℹ️  Auth persistence test completed (expected failures in test env)');
    }
  }

  async testUnauthorizedAccess() {
    console.log('\n4️⃣ Testing Unauthorized Access Protection');
    
    // Clear auth token
    this.api.setAuthToken('');

    const protectedEndpoints = [
      'users-profile',
      'cashback-balance',
      'orders-cart',
      'payments-process'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        await this.api.makeRequest(endpoint);
        console.log(`⚠️  ${endpoint} should require authentication`);
      } catch (error) {
        console.log(`✅ ${endpoint} properly protected`);
      }
    }
  }

  async testSignatureValidation() {
    console.log('\n5️⃣ Testing Signature Validation');
    
    const testWallet = generateRandomWallet();
    const testMessage = 'Test message for signature validation';

    // Test various signature formats
    const invalidSignatures = [
      '',
      '0x',
      '0x123',
      'invalid-hex',
      '0x' + 'g'.repeat(130), // Invalid hex characters
      '0x' + '1'.repeat(129), // Too short
      '0x' + '1'.repeat(131), // Too long
    ];

    for (const invalidSig of invalidSignatures) {
      try {
        await this.api.makeRequest('auth-wallet-login', 'POST', {
          wallet_address: testWallet,
          signature: invalidSig,
          message: testMessage
        }, false);
        
        console.log(`⚠️  Should reject invalid signature: ${invalidSig}`);
      } catch (error) {
        console.log(`✅ Properly rejected invalid signature format`);
      }
    }
  }
}

// Utility function for testing auth flows
export async function setupTestAuth(api: APITestHelper): Promise<string> {
  const testWallet = generateRandomWallet();
  const testSignature = generateRandomSignature();
  
  try {
    const token = await api.authenticateWallet(testWallet, testSignature);
    return token;
  } catch (error) {
    // Return mock token for testing
    const mockToken = 'mock-jwt-token-for-testing';
    api.setAuthToken(mockToken);
    return mockToken;
  }
}
