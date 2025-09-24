# API Route Algorithms

## Lend Routes

### POST /lend/deposit
**Algorithm:**
1. Extract `txHash` and `chain` from request body
2. Validate required parameters (txHash, chain)
3. Validate chain is either 'eth' or 'near'
4. Call `verifyDeposit()` to verify transaction on blockchain
5. Parse transaction data based on chain:
   - **NEAR**: Extract predecessor_account_id and deposit amount from receipt tree
   - **ETH**: Extract from.hash and value from transaction data
6. Convert amounts to decimal format (NEAR.toDecimal() for NEAR, formatEther() for ETH)
7. Initialize account if doesn't exist
8. Add deposit amount to user's `lendedBalance[chain]`
9. Return success response with account, chain, amount, and txHash

### POST /lend/withdraw
**Algorithm:**
1. Extract `address`, `withdrawChain`, and `withdrawAmount` from request body
2. Validate required parameters
3. Validate withdrawChain is 'eth' or 'near'
4. Validate withdrawAmount > 0
5. Check if account exists
6. Get available balance for specified chain
7. Check if available balance >= withdrawAmount
8. Subtract withdrawAmount from user's `lendedBalance[chain]`
9. Return success response with withdrawn details

### GET /lend/earnings/:address
**Algorithm:**
1. Extract address from URL parameters
2. Validate address parameter exists
3. Return default response if account doesn't exist
4. Get user's lended balance for both chains
5. Calculate projected earnings: `balance * 0.05 * (3/12)` (5% APY for 3 months)
6. Return earnings data with APY and loan term information

---

## Collateral Routes

### POST /collateral/deposit
**Algorithm:**
1. Extract `txHash` and `chain` from request body
2. Validate required parameters (txHash, chain)
3. Validate chain is either 'eth' or 'near'
4. Call `verifyDeposit()` to verify transaction on blockchain
5. Parse transaction data based on chain:
   - **NEAR**: Extract predecessor_account_id and deposit amount from receipt tree
   - **ETH**: Extract from.hash and value from transaction data
6. Convert amounts to decimal format
7. Initialize account if doesn't exist
8. Add deposit amount to user's `collateralRemaining[chain]`
9. Add txHash to user's collaterals array
10. Store collateral record in `COLLATERAL_RECORDS[txHash]`
11. Return success response with collateral details

### POST /collateral/withdraw
**Algorithm:**
1. Extract `address` and `collateralTxHash` from request body
2. Validate required parameters
3. Check if account exists
4. Check if collateral exists in `COLLATERAL_RECORDS`
5. Verify user owns the collateral (txHash in user's collaterals array)
6. Check if collateral is NOT locked in active loan
7. Remove txHash from user's collaterals array
8. Subtract amount from user's `collateralRemaining[chain]`
9. Delete collateral record from `COLLATERAL_RECORDS`
10. Return success response with withdrawn collateral details

### GET /collateral/status/:address
**Algorithm:**
1. Extract address from URL parameters
2. Validate address parameter exists
3. Return empty status if account doesn't exist
4. Map user's collateral txHashes to detailed collateral info:
   - Get collateral data from `COLLATERAL_RECORDS`
   - Check if collateral is locked in active loan
   - Determine status (locked/available)
5. Filter collaterals into available and locked categories
6. Return comprehensive status with counts and details

---

## Borrow Routes

### POST /borrow/request
**Algorithm:**
1. Extract `borrower`, `collateralTxHash`, `borrowChain`, `borrowAmount` from request body
2. Validate all required parameters exist
3. Validate borrowChain is 'eth' or 'near'
4. Validate borrowAmount > 0
5. Verify collateral exists using `collateralExists()`
6. Get collateral value and max borrowable amount using `getCollateralValue()`
7. Find and verify collateral owner matches borrower
8. Get current token prices using `getCurrentPrices()`
9. Calculate borrow value in USD: `borrowAmount * tokenPrice`
10. Check if borrow value <= max borrowable amount (80% of collateral value)
11. If exceeds limit, calculate and return max borrowable tokens
12. Create loan record using `createLoan()`:
    - Generate unique loan ID
    - Calculate interest (7% APY for 3 months): `amount * 0.07 * (3/12)`
    - Calculate total repayment: `amount + interest`
    - Set due date (3 months or 3 minutes in testing)
13. Store loan in `LOAN_RECORDS` and `USER_LOANS`
14. Initialize borrower account if needed
15. Update borrower's state:
    - Add to `borrowedAmounts[chain]`
    - Add loan ID to `borrow` array
    - Add collateral txHash to `locked.collateral.ids`
16. Return loan details with repayment information

### POST /borrow/repay
**Algorithm:**
1. Extract `loanId`, `repaymentTxHash`, `repaymentChain` from request body
2. Validate all required parameters exist
3. Validate repaymentChain is 'eth' or 'near'
4. Find loan in `LOAN_RECORDS` using loanId
5. Check if loan exists and status is 'active'
6. Verify repayment chain matches loan's borrow chain
7. Update loan status to 'repaid'
8. Initialize borrower account if needed
9. Update borrower's state:
   - Subtract loan amount from `borrowedAmounts[chain]`
   - Remove collateral txHash from `locked.collateral.ids`
10. Return success response with repayment details and unlocked collateral info

### GET /borrow/status/:loanId
**Algorithm:**
1. Extract loanId from URL parameters
2. Validate loanId parameter exists
3. Find loan in `LOAN_RECORDS`
4. Return 404 if loan not found
5. Calculate loan summary using `calculateLoanSummary()`:
   - Check if loan is overdue (current date > due date)
   - Calculate days until due date
   - Format comprehensive loan information
6. Return loan status with all relevant details

### GET /borrow/user/:address
**Algorithm:**
1. Extract address from URL parameters
2. Validate address parameter exists
3. Get user's loan IDs from `USER_LOANS[address]`
4. Map loan IDs to loan summaries:
   - Retrieve each loan from `LOAN_RECORDS`
   - Calculate summary for each loan
   - Filter out null results
5. Count total loans and active loans
6. Return user loan portfolio with statistics

---

## Utility Functions Used

### Price Oracle Functions
- `getCurrentPrices()`: Fetches ETH/NEAR prices with 5-minute caching
- `calculateCollateralValueUSD()`: Converts token amount to USD value
- `calculateMaxBorrowableAmount()`: Calculates 80% of collateral value
- `calculateBorrowableTokens()`: Converts USD amount to token amount
- `calculateLoanInterest()`: Calculates 7% APY for 3-month term
- `calculateTotalRepayment()`: Adds principal + interest
- `calculateDueDate()`: Adds 3 months (or 3 minutes in testing) to start date

### Collateral Management Functions
- `verifyCollateralDeposit()`: Checks if collateral exists in records
- `getCollateralValue()`: Gets collateral USD value and max borrowable
- `collateralExists()`: Verifies collateral txHash exists
- `isCollateralAvailable()`: Checks if collateral is available and sufficient

### Loan Management Functions
- `generateLoanId()`: Creates unique loan identifier
- `createLoan()`: Creates complete loan record with all calculations
- `calculateLoanSummary()`: Formats loan data with status and timing info

### State Management
- `initializeAccount()`: Creates new account with default zero balances
- `ACCOUNT_STATE`: Main user account storage
- `LOAN_RECORDS`: All loan data storage
- `USER_LOANS`: User to loan ID mapping
- `COLLATERAL_RECORDS`: Collateral transaction storage

---

## Key Business Logic

### Interest Calculations
- **Borrow Interest**: `loan_amount * 0.07 * (3/12) = loan_amount * 0.0175`
- **Lend Earnings**: `lend_amount * 0.05 * (3/12) = lend_amount * 0.0125`

### Collateral Requirements
- **Collateral Ratio**: 80% (borrowers can borrow up to 80% of collateral USD value)
- **Max Borrowable**: `collateral_usd * 0.8`
- **Collateral Lock**: Automatic during active loan, unlocked after repayment

### Cross-Chain Support
- **Supported Chains**: Ethereum (ETH) and NEAR Protocol (NEAR)
- **Price Conversion**: Real-time price fetching via CoinGecko API
- **Chain Validation**: All operations validate chain parameter as 'eth' or 'near'

### Testing Mode
- **Environment Check**: `process.env.ENVIRONMENT === "testing"`
- **Loan Duration**: 3 minutes in testing, 3 months in production
- **Same Calculations**: Interest rates remain the same regardless of duration