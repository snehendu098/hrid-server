# Cross-Chain Lending Protocol API Documentation

## Overview

This API provides a cross-chain lending protocol supporting ETH and NEAR tokens with the following features:
- **Borrow APY**: 7% (fixed)
- **Lend APY**: 5% (fixed)
- **Loan Term**: 3 months (or 3 minutes in testing mode)
- **Collateral Ratio**: 80% (borrowers can borrow up to 80% of collateral value)

## Environment Configuration

Set `ENVIRONMENT=testing` to enable 3-minute loan terms for testing purposes.

## Base URL
```
http://localhost:3000
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

View projected earnings from lending.

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x123...",
    "lendedBalance": {
      "eth": 2.0,
      "near": 100.0
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

## Workflow Example

1. **Lender deposits funds**: `POST /lend/deposit`
2. **Borrower deposits collateral**: `POST /collateral/deposit`
3. **Borrower requests loan**: `POST /borrow/request`
4. **System validates and creates loan**
5. **Borrower repays loan**: `POST /borrow/repay`
6. **Collateral unlocked automatically**
7. **Users withdraw funds**: `POST /lend/withdraw` or `POST /collateral/withdraw`