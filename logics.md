# API Route Algorithms

## User Management Routes

### POST /user/get-link-message
**Algorithm:**
1. Extract `ethAddress` and `nearAddress` from request body
2. Validate required parameters exist
3. Validate ETH address format (0x + 40 hex characters)
4. Validate NEAR address format (.near/.testnet suffix or 64 hex characters)
5. Generate current timestamp
6. Create standardized link message: "Link addresses: ETH {ethAddress} <-> NEAR {nearAddress} at {timestamp}"
7. Return message and timestamp with signing instructions

### POST /user/link-addresses
**Algorithm:**
1. Extract `ethAddress`, `nearAddress`, `ethSignature`, `nearSignature`, `timestamp` from request body
2. Validate all required parameters exist
3. Validate address formats and signature formats
4. Check timestamp is within 10-minute window (prevent replay attacks)
5. Create verification message using provided timestamp
6. Verify ETH signature (ETH wallet signed the link message)
7. Verify NEAR signature (NEAR wallet signed the link message)
8. If verification fails, return cryptographic proof error
9. Check if either address already has a user profile
10. If both addresses exist in different profiles, return error
11. Create or update user profile with linked addresses
12. Store bidirectional mapping in `ADDRESS_TO_USER`
13. Return user profile with linked addresses

### GET /user/profile/:address
**Algorithm:**
1. Extract address from URL parameters
2. Validate address parameter exists
3. Look up user profile using `getUserByAddress()`
4. If no profile found, return unlinked status with detected chain
5. If profile found, return complete user information:
   - User ID and primary address
   - All linked addresses (eth, near)
   - Verification status and timestamps
   - All addresses belonging to this user

### GET /user/linked-address/:address/:targetChain
**Algorithm:**
1. Extract address and targetChain from URL parameters
2. Validate parameters and targetChain is 'eth' or 'near'
3. Use `getLinkedAddress()` to find linked address for target chain
4. Return linking status and target address if found

### GET /user/profiles
**Algorithm:**
1. Retrieve all user profiles from `USER_PROFILES` state
2. Map profiles to public information (exclude sensitive data)
3. Return total count and profile list

---

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
7. **Cross-Chain Access Control**:
   - Find actual collateral owner in `ACCOUNT_STATE`
   - Use `canUserAccessCollateral()` to verify borrower can access collateral
   - Allows access if: direct ownership OR linked addresses belong to same user profile
8. Get current token prices using `getCurrentPrices()`
9. Calculate borrow value in USD: `borrowAmount * tokenPrice`
10. Check if borrow value <= max borrowable amount (80% of collateral value)
11. If exceeds limit, calculate and return max borrowable tokens
12. **Liquidity Check**: Verify sufficient liquidity in target chain pool
13. **Lend Fund Locking**: Use `lockLendFundsForLoan()` to lock corresponding lend funds
14. Create loan record using `createLoan()` with cross-chain information
15. Store loan in `LOAN_RECORDS` and `USER_LOANS`
16. Initialize borrower account if needed
17. Update borrower's state and lock collateral in actual owner's account:
    - Add to borrower's `borrowedAmounts[chain]`
    - Add loan ID to borrower's `borrow` array
    - Add collateral txHash to actual owner's `locked.collateral.ids`
18. Return loan details with repayment information

### POST /borrow/repay
**Algorithm:**
1. Extract `loanId`, `repaymentTxHash`, `repaymentChain` from request body
2. Validate all required parameters exist
3. Validate repaymentChain is 'eth' or 'near'
4. Find loan in `LOAN_RECORDS` using loanId
5. Check if loan exists and status is 'active'
6. Verify repayment chain matches loan's borrow chain
7. Update loan status to 'repaid'
8. **Lend Fund Unlocking**: Use `unlockLendFundsForLoan()` to unlock corresponding lend funds
9. Initialize borrower account if needed
10. Update borrower's state and unlock collateral from actual owner:
    - Subtract loan amount from borrower's `borrowedAmounts[chain]`
    - Find actual collateral owner in `ACCOUNT_STATE`
    - Remove collateral txHash from actual owner's `locked.collateral.ids`
11. Return success response with repayment details and unlocked collateral info

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
3. **Cross-Chain Loan Aggregation**:
   - Use `getAllUserAddresses()` to get all linked addresses for user
   - Collect loan IDs from `USER_LOANS` for each linked address
   - Remove duplicate loan IDs
4. Map unique loan IDs to loan summaries:
   - Retrieve each loan from `LOAN_RECORDS`
   - Calculate summary for each loan
   - Filter out null results
5. Count total loans and active loans across all linked addresses
6. Return comprehensive user loan portfolio with linked addresses and statistics

---

## Utility Functions Used

### Cross-Chain Address Resolution Functions
- `getUserByAddress()`: Look up user profile by any linked address
- `getAllUserAddresses()`: Get all addresses (ETH + NEAR) belonging to a user
- `canUserAccessCollateral()`: Check if user can access collateral across linked addresses
- `getLinkedAddress()`: Get linked address for specific target chain
- `linkAddresses()`: Create or update user profile with linked addresses
- `isValidAddressFormat()`: Validate address format for specific chain
- `getAddressChain()`: Detect chain type from address format

### Signature Verification Functions
- `verifyCrossChainProof()`: Verify cryptographic proof of address ownership
- `validateSignatureRequest()`: Validate request format and signatures
- `generateSignatureMessage()`: Create standardized message for signing
- `verifyEthSignature()`: Verify Ethereum wallet signature
- `verifyNearSignature()`: Verify NEAR wallet signature
- `isTimestampValid()`: Check signature timestamp is within acceptable window

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
- `USER_PROFILES`: Cross-chain user profile storage
- `ADDRESS_TO_USER`: Bidirectional address-to-user mapping
- `LEND_LOCKS`: Lend fund locking state for active loans

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
- **Address Linking**: Cryptographic proof-based linking of ETH and NEAR addresses
- **Cross-Chain Access**: Users can borrow against collateral from linked addresses
- **Unified Operations**: Single user can operate across both chains seamlessly

### Cross-Chain Address Linking
- **One-Time Setup**: Users link addresses once, enabling all cross-chain operations
- **Signature Verification**: Both wallets must sign identical message to prove ownership
- **Timestamp Validation**: 10-minute window prevents replay attacks
- **Bidirectional Mapping**: System maintains both address-to-user and user-to-address mappings
- **Access Control**: Users can access collaterals and loans from any linked address

### Cross-Chain Lending Flow
1. **Address Discovery**: System resolves any address to associated user profile
2. **Cross-Chain Validation**: Verifies user can access resources across linked addresses
3. **USD-Based Calculations**: All collateral/borrow ratios calculated in USD for consistency
4. **Chain-Specific Operations**: Actual deposits/withdrawals happen on respective chains
5. **Unified Accounting**: User sees combined view of assets across all chains

### Testing Mode
- **Environment Check**: `process.env.ENVIRONMENT === "testing"`
- **Loan Duration**: 3 minutes in testing, 3 months in production
- **Same Calculations**: Interest rates remain the same regardless of duration