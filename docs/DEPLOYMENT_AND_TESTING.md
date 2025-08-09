# Deployment and Testing Guide

## 🚀 Backend Deployment Status

### ✅ Successfully Deployed

#### **Database Migrations**
- 🔗 **Project**: `usgsoilitadwutfvxfzq.supabase.co`
- 📊 **Status**: Linked to existing Rozo Supabase project
- ⚠️ **Note**: Some tables already exist, migration conflicts expected

#### **Edge Functions Deployed** (18 functions)
All functions successfully deployed using `--use-api` flag:

**Authentication & Authorization:**
- ✅ `auth-wallet-login` - Wallet signature authentication
- ✅ `auth-spend-permission` - CDP Spend Permission management

**User Management:**
- ✅ `users-profile` - User profile management
- ✅ `users-stats` - User statistics and analytics

**Merchant & Product Catalog:**
- ✅ `merchants` - Merchant listing
- ✅ `merchants-categories` - Merchant categories
- ✅ `products` - Product catalog with cashback rates
- ✅ `products-details` - Individual product details

**ROZO Cashback System:**
- ✅ `cashback-balance` - ROZO balance retrieval
- ✅ `cashback-apply-offset` - Payment offset calculations
- ✅ `cashback-claim` - Cashback claiming from purchases

**Payment Processing:**
- ✅ `payments-process` - Main payment processing (dual mode)
- ✅ `payments-eligibility` - Payment eligibility checking
- ✅ `payments-create-intent` - Payment intent creation
- ✅ `payments-confirm` - Payment confirmation

**Order Management:**
- ✅ `orders` - Order listing and details
- ✅ `orders-cart` - Shopping cart operations
- ✅ `orders-checkout` - Checkout with ROZO offset

## 🧪 E2E Test Suite

### **Test Coverage** (Comprehensive)

#### **1. Authentication Tests** (`tests/e2e/auth-tests.ts`)
- 🔐 Wallet signature authentication
- 💳 CDP Spend Permission management
- 🔒 Authorization persistence
- 🚫 Unauthorized access protection
- ✍️ Signature validation

#### **2. Payment System Tests** (`tests/e2e/payment-tests.ts`)
- ✅ Payment eligibility checks
- 💸 Direct USDC payment flow
- 🪙 ROZO credit payment flow
- 💳 Payment intent creation
- 🛡️ Payment validation & security
- ❌ Error handling scenarios

#### **3. Order Management Tests** (`tests/e2e/order-tests.ts`)
- 🛒 Shopping cart operations (add, update, remove, clear)
- 📋 Order creation and management
- 🛍️ Checkout process with ROZO offset
- 🔄 Complete order lifecycle
- 🔍 Order queries and filtering
- 🪙 ROZO offset integration

#### **4. Complete Integration Tests** (`tests/e2e/main-test-suite.ts`)
- 📡 Public API testing
- 🔐 End-to-end authentication flow
- 👤 User profile management
- 💰 Complete cashback system
- 💳 Full payment lifecycles
- 🛒 Complete shopping experience

### **Test Execution**

#### **Scripts Available:**
```bash
# Run all tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:auth        # Authentication only
npm run test:e2e:payments    # Payment system only  
npm run test:e2e:orders      # Order management only
npm run test:e2e:quick       # Quick API validation
```

#### **Test Runner Features:**
- 📊 Comprehensive test reporting
- 🔍 API coverage analysis
- ⚠️ Expected failure handling
- 📈 Success rate calculation
- 🕐 Execution timing

## 🔗 API Endpoints

### **Base URL**
```
https://usgsoilitadwutfvxfzq.supabase.co/functions/v1
```

### **Authentication Required Endpoints**
Most endpoints require JWT authentication via:
```
Authorization: Bearer <jwt-token>
```

### **Public Endpoints** (No Auth Required)
- None currently (all require authentication for security)

## 🛠️ Testing Environment Setup

### **Prerequisites**
1. **Node.js 18+** installed
2. **Environment Variables** configured
3. **Supabase Access** for real testing

### **Environment Configuration**
Create `.env.local` based on `tests/e2e/env.example`:

```bash
# Required for real testing
SUPABASE_URL=https://usgsoilitadwutfvxfzq.supabase.co
SUPABASE_ANON_KEY=your-actual-anon-key

# Test configuration
TEST_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
TEST_MERCHANT_WALLET=0x0987654321098765432109876543210987654321
```

### **Mock Testing Mode**
The test suite is designed to work in "mock mode" when:
- ❌ No real authentication available
- ❌ No database with test data
- ❌ No blockchain connectivity

**Benefits of Mock Mode:**
- ✅ Validates API structure and response formats
- ✅ Tests error handling and validation
- ✅ Verifies request/response schemas
- ✅ Confirms endpoint accessibility

## 🎯 Major Payment & Cashback Flows

### **1. Direct USDC Payment Flow**
```
User → CDP Pre-auth → Payment Eligibility → Process Payment → Earn ROZO Cashback
```

**Key APIs:**
1. `GET /auth-spend-permission` - Check authorization
2. `POST /payments-eligibility` - Validate payment
3. `POST /payments-process` - Execute payment
4. `GET /cashback-balance` - Verify cashback earned

### **2. ROZO Credit Payment Flow**
```
User → ROZO Balance Check → Payment Eligibility → Process ROZO Payment → Internal Treasury Payment
```

**Key APIs:**
1. `GET /cashback-balance` - Check ROZO availability
2. `POST /cashback-apply-offset` - Calculate offset
3. `POST /payments-process` (is_using_credit: true) - Use ROZO credits
4. Internal treasury payment to merchant

### **3. Complete Shopping Experience**
```
Browse Products → Add to Cart → Apply ROZO Offset → Checkout → Payment → Earn Cashback
```

**Key APIs:**
1. `GET /products` - Browse catalog
2. `POST /orders-cart` - Add items
3. `POST /orders-checkout` - Apply ROZO offset
4. `POST /payments-process` - Complete payment
5. `GET /orders` - Track order status

## 📊 Expected Test Results

### **In Mock/Testing Environment:**
- 🔴 **Authentication Tests**: Expected to fail (no real signatures)
- 🔴 **Database Operations**: Expected to fail (no test data)
- 🔴 **Blockchain Payments**: Expected to fail (no real contracts)
- ✅ **API Structure**: Should validate successfully
- ✅ **Error Handling**: Should work correctly
- ✅ **Request Validation**: Should reject invalid inputs

### **Success Criteria:**
✅ All APIs respond with proper structure  
✅ Authentication requirements enforced  
✅ Input validation working  
✅ Error messages are informative  
✅ Response schemas are consistent  

## 🚀 Next Steps for Full Testing

### **1. Real Authentication Setup**
- Set up wallet with valid signatures
- Configure CDP Spend Permissions
- Add test user to database

### **2. Database Population**
- Add test merchants and products
- Set up test user with ROZO balance
- Create sample transaction history

### **3. Blockchain Integration**
- Deploy RozoPayMaster contract
- Configure treasury wallet
- Set up actual CDP integration

### **4. Complete E2E Flow**
- Real wallet authentication
- Actual payment processing
- Live cashback earning and usage
- Full order lifecycle

## 📈 Current Status Summary

🎉 **Successfully Deployed:**
- ✅ 18 Edge Functions
- ✅ Complete API structure
- ✅ Comprehensive test suite
- ✅ Error handling & validation

⚠️ **Pending for Full Operation:**
- 🔄 Database schema conflicts resolution
- 🔄 Real authentication integration
- 🔄 Blockchain contract deployment
- 🔄 CDP Spend Permissions setup

**The backend infrastructure is ready for integration and real-world testing!** 🚀
