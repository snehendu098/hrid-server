# Cross-Chain Lending Protocol API Documentation

## Overview

This API provides a cross-chain lending protocol supporting ETH and NEAR tokens with the following features:
- **Borrow APY**: 7% (fixed)
- **Lend APY**: 5% (fixed)
- **Loan Term**: 3 months (or 3 minutes in testing mode)
- **Collateral Ratio**: 80% (borrowers can borrow up to 80% of collateral value)
- **Cross-Chain Support**: Deposit ETH collateral and borrow NEAR (and vice versa)
- **Address Linking**: Link ETH and NEAR addresses for seamless cross-chain operations

## Environment Configuration

Set `ENVIRONMENT=testing` to enable 3-minute loan terms for testing purposes.

## Base URL
```
http://localhost:3000
```

---

## User Management Endpoints

### 1. Get Link Message
**POST** `/user/get-link-message`

Generate the message that users need to sign to link their ETH and NEAR addresses.

**Request Body:**
```json
{
  "ethAddress": "0x742d35Cc6634C0532925a3b8D0C002C7C4Ee8100",
  "nearAddress": "alice.near"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Link addresses: ETH 0x742d35... <-> NEAR alice.near at 1640995200000",
    "timestamp": 1640995200000,
    "instructions": {
      "eth": "Sign this message with your Ethereum wallet (0x742d35...)",
      "near": "Sign this message with your NEAR wallet (alice.near)"
    }
  }
}
```

### 2. Link Addresses
**POST** `/user/link-addresses`

Link ETH and NEAR addresses with cryptographic proof of ownership.

**Request Body:**
```json
{
  "ethAddress": "0x742d35Cc6634C0532925a3b8D0C002C7C4Ee8100",
  "nearAddress": "alice.near",
  "ethSignature": "0x123...",
  "nearSignature": "ed25519:456...",
  "timestamp": 1640995200000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Addresses successfully linked",
  "data": {
    "userId": "user_1640995200000_abc123",
    "primaryAddress": "0x742d35Cc6634C0532925a3b8D0C002C7C4Ee8100",
    "linkedAddresses": {
      "eth": "0x742d35Cc6634C0532925a3b8D0C002C7C4Ee8100",
      "near": "alice.near"
    },
    "verified": true
  }
}
```

### 3. Get User Profile
**GET** `/user/profile/:address`

Get user profile information for any linked address.

**Response:**
```json
{
  "success": true,
  "data": {
    "linked": true,
    "userId": "user_1640995200000_abc123",
    "primaryAddress": "0x742d35Cc6634C0532925a3b8D0C002C7C4Ee8100",
    "linkedAddresses": {
      "eth": "0x742d35Cc6634C0532925a3b8D0C002C7C4Ee8100",
      "near": "alice.near"
    },
    "allAddresses": ["0x742d35...", "alice.near"],
    "verified": true,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "lastUpdated": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4. Get Linked Address
**GET** `/user/linked-address/:address/:targetChain`

Get the linked address for a specific chain.

**Response:**
```json
{
  "success": true,
  "data": {
    "fromAddress": "0x742d35...",
    "targetChain": "near",
    "linkedAddress": "alice.near",
    "hasLinkedAddress": true,
    "userLinked": true
  }
}
```

### 5. List All Profiles
**GET** `/user/profiles`

Get all user profiles (for admin/debugging).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProfiles": 1,
    "profiles": [
      {
        "userId": "user_1640995200000_abc123",
        "primaryAddress": "0x742d35...",
        "linkedAddresses": {
          "eth": "0x742d35...",
          "near": "alice.near"
        },
        "verified": true,
        "createdAt": "2024-01-01T12:00:00.000Z",
        "lastUpdated": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

## Lend Endpoints

### 1. Deposit Funds for Lending
**POST** `/lend/deposit`

Deposit ETH or NEAR tokens to earn 5% APY.

**Request Body:**
```json
{
  "txHash": "0x123...",
  "chain": "eth" | "near"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deposit processed successfully",
  "data": {
    "account": "0x123...",
    "chain": "eth",
    "amount": 1.5,
    "txHash": "0x123..."
  }
}
```

### 2. Withdraw Lent Funds
**POST** `/lend/withdraw`

Withdraw previously lent funds.

**Request Body:**
```json
{
  "address": "0x123...",
  "withdrawChain": "eth" | "near",
  "withdrawAmount": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lend withdrawal processed successfully",
  "data": {
    "address": "0x123...",
    "withdrawnAmount": 1.0,
    "withdrawChain": "eth",
    "remainingBalance": 0.5
  }
}
```

### 3. Check Earnings
**GET** `/lend/earnings/:address`

View projected earnings from lending with locked vs available breakdown.

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x123...",
    "totalBalance": {
      "eth": 2.0,
      "near": 100.0
    },
    "availableBalance": {
      "eth": 0.5,
      "near": 50.0
    },
    "lockedBalance": {
      "eth": 1.5,
      "near": 50.0
    },
    "projectedEarnings": {
      "eth": 0.025,
      "near": 1.25
    },
    "annualPercentageYield": 5,
    "loanTermMonths": 3,
    "totalValueUSD": 0
  }
}
```

---

## Collateral Endpoints

### 1. Deposit Collateral
**POST** `/collateral/deposit`

Deposit ETH or NEAR as collateral for borrowing.

**Request Body:**
```json
{
  "txHash": "0x123...",
  "chain": "eth" | "near"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Collateral deposit processed successfully",
  "data": {
    "account": "0x123...",
    "chain": "eth",
    "amount": 2.0,
    "txHash": "0x123..."
  }
}
```

### 2. Withdraw Collateral
**POST** `/collateral/withdraw`

Withdraw unlocked collateral (only available after loan repayment).

**Request Body:**
```json
{
  "address": "0x123...",
  "collateralTxHash": "0x123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Collateral withdrawn successfully",
  "data": {
    "address": "0x123...",
    "withdrawnCollateral": {
      "txHash": "0x123...",
      "chain": "eth",
      "amount": 2.0
    }
  }
}
```

### 3. Check Collateral Status
**GET** `/collateral/status/:address`

View user's collateral status.

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x123...",
    "totalCollaterals": 2,
    "availableCollaterals": 1,
    "lockedCollaterals": 1,
    "collaterals": [
      {
        "txHash": "0x123...",
        "chain": "eth",
        "amount": 2.0,
        "isLocked": false,
        "status": "available"
      }
    ],
    "collateralBalances": {
      "eth": 2.0,
      "near": 0
    }
  }
}
```

---

## Borrow Endpoints

### 1. Request Loan
**POST** `/borrow/request`

Borrow funds against deposited collateral at 7% APY.

**Request Body:**
```json
{
  "borrower": "0x123...",
  "collateralTxHash": "0x123...",
  "borrowChain": "eth" | "near",
  "borrowAmount": 1.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loan created successfully",
  "data": {
    "loanId": "loan_1640995200000_abc123",
    "borrower": "0x123...",
    "borrowAmount": 1.0,
    "borrowChain": "eth",
    "interestAmount": 0.0175,
    "totalRepaymentAmount": 1.0175,
    "dueDate": "2024-04-01T12:00:00.000Z",
    "collateralInfo": {
      "txHash": "0x123...",
      "chain": "eth",
      "amount": 2.0,
      "valueUSD": 4000
    },
    "loanTermMonths": 3,
    "interestRate": 7
  }
}
```

**Error Response (Insufficient Collateral):**
```json
{
  "success": false,
  "message": "Borrow amount exceeds collateral limit. Maximum borrowable: 1.600000 ETH",
  "maxBorrowable": {
    "amountUSD": 3200,
    "amountTokens": 1.6,
    "chain": "eth"
  }
}
```

### 2. Repay Loan
**POST** `/borrow/repay`

Repay loan with interest to unlock collateral.

**Request Body:**
```json
{
  "loanId": "loan_1640995200000_abc123",
  "repaymentTxHash": "0x456...",
  "repaymentChain": "eth"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Loan repaid successfully",
  "data": {
    "loanId": "loan_1640995200000_abc123",
    "borrower": "0x123...",
    "repaidAmount": 1.0175,
    "repaymentTxHash": "0x456...",
    "repaymentChain": "eth",
    "collateralUnlocked": {
      "txHash": "0x123...",
      "chain": "eth",
      "amount": 2.0
    }
  }
}
```

### 3. Check Loan Status
**GET** `/borrow/status/:loanId`

View loan details and status.

**Response:**
```json
{
  "success": true,
  "data": {
    "loanId": "loan_1640995200000_abc123",
    "borrower": "0x123...",
    "borrowAmount": 1.0,
    "borrowChain": "eth",
    "interestAmount": 0.0175,
    "totalRepaymentAmount": 1.0175,
    "status": "active",
    "dueDate": "2024-04-01T12:00:00.000Z",
    "isOverdue": false,
    "daysUntilDue": 89,
    "collateralInfo": {
      "txHash": "0x123...",
      "chain": "eth",
      "amount": 2.0,
      "valueUSD": 4000
    }
  }
}
```

### 4. Get User Loans
**GET** `/borrow/user/:address`

View all loans for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x123...",
    "totalLoans": 2,
    "activeLoans": 1,
    "loans": [
      {
        "loanId": "loan_1640995200000_abc123",
        "borrower": "0x123...",
        "borrowAmount": 1.0,
        "borrowChain": "eth",
        "interestAmount": 0.0175,
        "totalRepaymentAmount": 1.0175,
        "status": "active",
        "dueDate": "2024-04-01T12:00:00.000Z",
        "isOverdue": false,
        "daysUntilDue": 89
      }
    ]
  }
}
```

---

## Pool Endpoints

### 1. Get Pool Status
**GET** `/pool/status`

View total pool statistics across both chains.

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "prices": {
      "eth": 2000,
      "near": 5,
      "lastUpdated": "2024-01-01T11:55:00.000Z"
    },
    "pools": {
      "eth": {
        "total": 10.5,
        "locked": 8.2,
        "available": 2.3,
        "utilizationRate": 78.1,
        "totalUSD": 21000,
        "lockedUSD": 16400,
        "availableUSD": 4600
      },
      "near": {
        "total": 1000,
        "locked": 600,
        "available": 400,
        "utilizationRate": 60.0,
        "totalUSD": 5000,
        "lockedUSD": 3000,
        "availableUSD": 2000
      }
    },
    "summary": {
      "totalUSD": 26000,
      "lockedUSD": 19400,
      "availableUSD": 6600,
      "overallUtilizationRate": 74.6
    }
  }
}
```

### 2. Get Chain-Specific Pool Status
**GET** `/pool/status/:chain`

View pool statistics for a specific chain.

**Response:**
```json
{
  "success": true,
  "data": {
    "chain": "eth",
    "total": 10.5,
    "locked": 8.2,
    "available": 2.3,
    "utilizationRate": 78.1,
    "price": 2000,
    "totalUSD": 21000,
    "lockedUSD": 16400,
    "availableUSD": 4600,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### 3. Check Available Liquidity
**GET** `/pool/liquidity/:chain`

Check borrowable liquidity for a specific chain.

**Response:**
```json
{
  "success": true,
  "data": {
    "chain": "eth",
    "availableLiquidity": 2.3,
    "totalLiquidity": 10.5,
    "lockedLiquidity": 8.2,
    "utilizationRate": 78.1,
    "canBorrow": true,
    "maxBorrowable": 2.3,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

### Common Error Codes:
- **400**: Bad Request (missing parameters, invalid data)
- **403**: Forbidden (trying to access others' assets)
- **404**: Not Found (loan/collateral/account not found)
- **500**: Internal Server Error

---

## Key Calculations

### Borrowable Amount
```
max_borrow_usd = collateral_value_usd * 0.8
max_borrow_tokens = max_borrow_usd / target_token_price_usd
```

### Interest Calculation (3-month term)
```
interest_amount = loan_amount * 0.07 * (3/12) = loan_amount * 0.0175
total_repayment = loan_amount + interest_amount
```

### Lend Earnings (3-month term)
```
earnings = lend_amount * 0.05 * (3/12) = lend_amount * 0.0125
```

---

## Testing Mode

Set environment variable `ENVIRONMENT=testing` to enable:
- **3-minute loan terms** instead of 3 months
- Faster testing cycles
- Same interest calculations (scaled appropriately)

---

## Workflow Examples

### Same-Chain Lending (Traditional)
1. **Lender deposits ETH**: `POST /lend/deposit`
2. **Borrower deposits ETH collateral**: `POST /collateral/deposit`
3. **Borrower requests ETH loan**: `POST /borrow/request`
4. **System validates and creates loan**
5. **Borrower repays ETH loan**: `POST /borrow/repay`
6. **Collateral unlocked automatically**
7. **Users withdraw funds**: `POST /lend/withdraw` or `POST /collateral/withdraw`

### Cross-Chain Lending (Advanced)
1. **Link addresses**:
   - Generate message: `POST /user/get-link-message`
   - Sign with both wallets and link: `POST /user/link-addresses`
2. **Lender deposits NEAR**: `POST /lend/deposit` (with NEAR wallet)
3. **Borrower deposits ETH collateral**: `POST /collateral/deposit` (with ETH wallet)
4. **Borrower requests NEAR loan**: `POST /borrow/request` (borrower can be either address)
   ```json
   {
     "borrower": "alice.near",
     "collateralTxHash": "0x123...", // ETH collateral
     "borrowChain": "near",          // Borrow NEAR tokens
     "borrowAmount": 100
   }
   ```
5. **System validates cross-chain access and creates loan**
6. **Borrower repays NEAR loan**: `POST /borrow/repay` (with NEAR wallet)
7. **ETH collateral unlocked automatically**
8. **Users can withdraw from either linked address**

### Key Cross-Chain Features:
- **Address Linking**: One-time setup enables cross-chain operations
- **Unified View**: Check loans/collaterals from any linked address
- **Flexible Access**: Deposit with one wallet, borrow with another
- **Automatic Resolution**: System handles cross-chain ownership verification