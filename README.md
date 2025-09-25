# Hrin Protocol Server

A decentralized lending protocol server powered by NEAR Shade Agents, enabling cross-chain collateralized lending without traditional smart contracts.

## 🌟 Overview

Hrin Protocol is a revolutionary lending platform that leverages NEAR's Shade Agents technology instead of traditional smart contracts. This server provides the backend infrastructure for cross-chain lending operations, collateral management, and agent-based transaction execution.

### Key Features

- **Shade Agent Integration**: Utilizes NEAR's Shade Agents for secure, automated transaction execution
- **Cross-Chain Support**: Supports Ethereum and NEAR networks for borrowing and lending
- **Collateral Management**: Automated collateral tracking and validation
- **Price Oracle Integration**: Real-time price feeds from CoinGecko
- **RESTful API**: Clean API endpoints for frontend integration

## 🏗 Architecture

The server is built with:

- **Framework**: Hono.js (lightweight web framework)
- **Runtime**: Bun (fast JavaScript runtime)
- **Blockchain Integration**:
  - NEAR Shade Agents (`@neardefi/shade-agent-js`)
  - Ethereum via ethers.js and viem
- **Database**: MongoDB with Mongoose
- **Price Feeds**: CoinGecko API integration

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed
- MongoDB instance running
- Environment variables configured

### Installation

1. Clone the repository and navigate to the server directory:
```bash
cd hrid-server
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NEXT_PUBLIC_contractId=your_shade_agent_contract_id
MONGODB_URI=your_mongodb_connection_string
COINGECKO_API_KEY=your_coingecko_api_key
```

4. Start the development server:
```bash
bun run dev
```

The server will start on port 3000 with hot reload enabled.

## 📚 API Documentation

### Health Check
```
GET /api/v1/health
```
Returns server status and health information.

### Agent Information
```
GET /agent/info
```
Returns NEAR agent account information and balance.

```
GET /agent/info-eth
```
Returns Ethereum agent address and balance information.

### Collateral Management
```
POST /collateral/deposit
GET /collateral/status/:address
GET /collateral/history/:address
```

### Lending Operations
```
POST /lend/deposit
GET /lend/earnings/:address
GET /lend/history/:address
```

### Borrowing Operations
```
POST /borrow/request
POST /borrow/repay
GET /borrow/loans/:address
```

## 🔧 Core Components

### Shade Agent Integration
- **Agent Account**: Manages NEAR agent account creation and operations
- **Cross-Chain Execution**: Executes transactions across NEAR and Ethereum
- **Asset Transfers**: Handles secure asset transfers via agent

### Loan Management
- **Loan Creation**: Automated loan creation with collateral validation
- **Interest Calculation**: Dynamic interest rate calculations
- **Repayment Tracking**: Monitors loan status and repayment schedules

### Price Oracle
- **Real-Time Pricing**: Fetches current market prices from CoinGecko
- **Multi-Asset Support**: Supports ETH, NEAR, and USDT pricing
- **Collateral Valuation**: Calculates collateral values in USD

### Security Features
- **Collateral Ratio Enforcement**: Maintains healthy loan-to-value ratios
- **Transaction Validation**: Validates all blockchain transactions
- **Address Resolution**: Secure address derivation and validation

## 🛠 Development

### Project Structure
```
src/
├── helpers/           # Utility functions and helpers
├── interface/         # TypeScript interfaces and models
├── routes/           # API route handlers
│   ├── agent.route.ts
│   ├── borrow.route.ts
│   ├── collateral.route.ts
│   └── lend.route.ts
├── state/            # Application state management
├── utils/            # Core utility modules
│   ├── account.ts    # Account and transfer utilities
│   ├── addressResolver.ts
│   ├── collateral.ts
│   ├── coingecko.ts
│   ├── ethereum.ts
│   ├── loanManager.ts
│   └── priceOracle.ts
└── index.ts          # Application entry point
```

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun shade` - Run Shade Agent CLI commands

### Environment Configuration

Required environment variables:
- `NEXT_PUBLIC_contractId` - Shade Agent contract ID
- `MONGODB_URI` - MongoDB connection string
- `COINGECKO_API_KEY` - CoinGecko API key for price feeds

## 📊 Data Models

The application uses the following data models for managing users, loans, and transactions:

### Core Entities
- **User**: Manages user accounts and associated wallets
- **Wallet**: Multi-chain wallet addresses per user
- **PoolRecord**: Tracks liquidity pool deposits and withdrawals
- **CollateralRecord**: Manages collateral deposits and locks
- **BorrowRecord**: Tracks loan origination and terms
- **RepayRecord**: Records loan repayments

### Database Schema
```
notation crows-foot
user [icon: user, color: blue, typeface: clean] {
id string pk
walletIds id[]
collaterals id[]
poolRecords id[]
borrowRecords id[]
}

wallet [icon: user, color: yellow] {
id string pk
address string
chain string
userId id pk
}

poolRecord {
id string pk
amount number
chain string
depositTxHash string
depositedBy id
amountLocked number
withdrawn number
endDate Date
}

collateralRecord {
id string pk
amount number
chain string
depositTxHash string
amountLocked number
depositedBy id
withdrawn number
}

repayRecord {
id string pk
amount number
chain string
associatedBorrow borrowRecordId
}

borrowRecord {
id string pk
amount number
chain string
borrowTxHash string
associatedCollaterals collateralId[]
associatedPools poolRecordId[]
associatedRepays repayRecordId[]
borrowedBy userId
}
```

## 🔐 Security Considerations

- All transactions are validated before execution
- Collateral ratios are enforced to prevent under-collateralized loans
- Private keys are managed securely through Shade Agents
- Cross-chain operations use verified bridge protocols

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation wiki

## 🔗 Related Projects

- [Hrin Client](../hrin-client/) - Frontend application
- [NEAR Shade Agents](https://github.com/near/shade-agents) - Core agent technology