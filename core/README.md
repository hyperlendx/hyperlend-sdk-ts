# HyperLend SDK Core

A comprehensive TypeScript/JavaScript SDK for interacting with the HyperLend protocol on the Hyperliquid EVM blockchain. This core module provides direct access to lending and borrowing functionalities through a simple, type-safe API.

## HyperLend Mainnet Contracts

All addresses can be found at https://docs.hyperlend.finance/developer-documentation/contract-addresses

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Key Features](#key-features)
- [Usage Examples](#usage-examples)
  - [Querying Protocol Data](#querying-protocol-data)
  - [Supply Operations](#supply-operations)
  - [Borrow Operations](#borrow-operations)
  - [Repayment & Withdrawal](#repayment--withdrawal)
  - [E-Mode Operations](#e-mode-operations)
  - [Collateral Management](#collateral-management)
  - [Error Handling](#error-handling)
- [API Reference](#api-reference)
- [Development](#development)

## Installation

```bash
npm install hyperlend-sdk
```

Or with yarn:

```bash
yarn add hyperlend-sdk
```

## Initialization

The SDK can be initialized in two modes:

### Read-Only Mode

```typescript
import { HyperlendSDKcore } from "hyperlend-sdk";
import { providers, utils } from "ethers";

const provider = new providers.JsonRpcProvider("https://rpc.hyperlend.finance");
const sdk = new HyperlendSDKcore(
  provider,
  "DATA_PROVIDER_ADDRESS",
  "POOL_ADDRESS",
  "UI_POOL_DATA_PROVIDER_ADDRESS"
);
```

### Transaction Mode (with Signer)

```typescript
import { HyperlendSDKcore } from "hyperlend-sdk";
import { providers, utils, Wallet, BigNumber } from "ethers";

const provider = new providers.JsonRpcProvider("https://rpc.hyperlend.finance");
const wallet = new Wallet("YOUR_PRIVATE_KEY", provider);

const sdk = new HyperlendSDKcore(
  wallet,
  "DATA_PROVIDER_ADDRESS",
  "POOL_ADDRESS",
  "UI_POOL_DATA_PROVIDER_ADDRESS"
);
```

## Key Features

- **Market Data Access:** Query reserves, rates, and liquidity information
- **Account Information:** Fetch user positions, balances, and health factors
- **Supply & Borrow:** Execute lending and borrowing operations
- **Debt Management:** Repay loans and adjust positions
- **Withdrawal:** Retrieve supplied assets
- **E-Mode Support:** Access enhanced borrowing capability for correlated assets
- **Collateral Management:** Configure which assets serve as collateral

## Usage Examples

### Querying Protocol Data

```typescript
import { utils, BigNumber } from "ethers";

// Get all reserves in the protocol
const reserves = await sdk.getAllReservesTokens();
console.log(`Found ${reserves.length} reserves`);

// Get all aTokens (interest-bearing tokens)
const aTokens = await sdk.getAllATokens();

// Get detailed reserve data
const reserveAddress = reserves[0].tokenAddress;
const reserveData = await sdk.getReserveData(reserveAddress);
console.log({
  symbol: reserveData.symbol,
  ltv: reserveData.ltv.toString(),
  liquidationThreshold: reserveData.liquidationThreshold.toString(),
  availableLiquidity: utils.formatUnits(
    reserveData.availableLiquidity,
    reserveData.decimals.toNumber()
  )
});

// Get user account data
const userAddress = "YOUR_ADDRESS";
const accountData = await sdk.getUserAccountData(userAddress);
console.log({
  totalCollateral: utils.formatEther(accountData.totalCollateralBase),
  totalDebt: utils.formatEther(accountData.totalDebtBase),
  availableBorrows: utils.formatEther(accountData.availableBorrowsBase),
  healthFactor: utils.formatEther(accountData.healthFactor)
});
```

### Supply Operations

```typescript
import { utils, BigNumber } from "ethers";

// Get token information
const reserveData = await sdk.getReserveData(tokenAddress);
const decimals = reserveData.decimals.toNumber();

// Supply assets to the protocol
const supplyAmount = utils.parseUnits("0.05", decimals);
const supplyTx = await sdk.supply(tokenAddress, supplyAmount);
console.log(`Supply transaction hash: ${supplyTx.transactionHash}`);

// Wait for transaction confirmation
await supplyTx.wait();
```

### Borrow Operations

```typescript
import { InterestRateMode } from "hyperlend-sdk";
import { utils, BigNumber } from "ethers";

// Interest rate modes explained:
// VARIABLE (1): Rate fluctuates based on market conditions
// STABLE (2): Rate stays relatively constant but can still be rebalanced
const interestRateMode = InterestRateMode.VARIABLE;

// Borrow assets from the protocol
const borrowAmount = utils.parseUnits("0.01", decimals);
const borrowTx = await sdk.borrow(
  tokenAddress,
  borrowAmount,
  interestRateMode
);
console.log(`Borrow transaction hash: ${borrowTx.transactionHash}`);

// Wait for transaction confirmation
await borrowTx.wait();
```

### Repayment & Withdrawal

```typescript
import { InterestRateMode } from "hyperlend-sdk";
import { utils, BigNumber } from "ethers";

// Repay borrowed assets
const repayAmount = utils.parseUnits("0.005", decimals);
const repayTx = await sdk.repay(
  tokenAddress,
  repayAmount,
  InterestRateMode.VARIABLE
);
console.log(`Repay transaction hash: ${repayTx.transactionHash}`);

// Withdraw supplied assets
const withdrawAmount = utils.parseUnits("0.025", decimals);
const withdrawTx = await sdk.withdraw(tokenAddress, withdrawAmount);
console.log(`Withdraw transaction hash: ${withdrawTx.transactionHash}`);
```

### E-Mode Operations

```typescript
import { utils } from "ethers";

// Get all E-Mode categories
const poolAddressProvider = "POOL_ADDRESS_PROVIDER";
const eModes = await sdk.getAllEModeCategories(poolAddressProvider);
console.log("Available E-Mode categories:");
eModes.forEach(mode => {
  console.log(`- Category ${mode.id}: ${mode.eMode.label}`);
});

// Enter a specific E-Mode category
const categoryId = 1; // Use appropriate category ID
const setEModeTx = await sdk.setUserEMode(categoryId);
console.log(`Set E-Mode transaction hash: ${setEModeTx.transactionHash}`);

// Return to standard mode
const resetEModeTx = await sdk.setUserEMode(0);
console.log(`Reset to standard mode hash: ${resetEModeTx.transactionHash}`);

// Check user's current E-Mode
const userAddress = await wallet.getAddress();
const currentEMode = await sdk.getUserEMode(userAddress);
console.log(`Current E-Mode: ${currentEMode}`);
```

### Collateral Management

```typescript
// Enable asset as collateral
const enableAsCollateral = true;
const collateralTx = await sdk.setUserUseReserveAsCollateral(
  tokenAddress,
  enableAsCollateral
);
console.log(`Set collateral transaction hash: ${collateralTx.transactionHash}`);

// Disable asset as collateral
const disableAsCollateral = false;
const disableCollateralTx = await sdk.setUserUseReserveAsCollateral(
  tokenAddress,
  disableAsCollateral
);
```

### Error Handling

```typescript
import { utils } from "ethers";

try {
  const withdrawAmount = utils.parseUnits("0.025", decimals);
  const withdrawTx = await sdk.withdraw(tokenAddress, withdrawAmount);
  await withdrawTx.wait();
} catch (error) {
  if (error.message.includes("health factor")) {
    console.error("Withdrawal would risk liquidation");
  } else if (error.message.includes("exceeds balance")) {
    console.error("Insufficient balance for withdrawal");
  } else if (error.message.includes("user rejected")) {
    console.error("Transaction was rejected by user");
  } else {
    console.error("Error:", error);
  }
}
```

## API Reference

### Reserve Data Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getAllReservesTokens()` | Get all reserve tokens | None | `Promise<{ symbol: string; tokenAddress: string }[]>` |
| `getAllATokens()` | Get all aTokens | None | `Promise<{ symbol: string; tokenAddress: string }[]>` |
| `getReservesList()` | Get addresses of all reserves | None | `Promise<string[]>` |
| `getReserveData(assetAddress)` | Get data for a specific reserve | `assetAddress: string` | `Promise<ReserveData>` |
| `getDetailedReservesData(poolAddressProvider)` | Get detailed data for all reserves | `poolAddressProvider: string` | `Promise<{ reserves: any[]; baseCurrencyInfo: any }>` |

### User Account Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getUserAccountData(userAddress)` | Get user's overall account data | `userAddress: string` | `Promise<{ totalCollateralBase: BigNumber; totalDebtBase: BigNumber; availableBorrowsBase: BigNumber; currentLiquidationThreshold: BigNumber; ltv: BigNumber; healthFactor: BigNumber }>` |
| `getUserReservesData(poolAddressProvider, userAddress)` | Get user's position in each reserve | `poolAddressProvider: string, userAddress: string` | `Promise<{ userReserves: any[]; userEmode: number }>` |
| `getUserEMode(userAddress)` | Get user's E-Mode category | `userAddress: string` | `Promise<number>` |

### Transaction Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `supply(asset, amount, onBehalfOf?)` | Supply assets to the protocol | `asset: string, amount: BigNumber, onBehalfOf?: string` | `Promise<{transactionHash: string}>` |
| `borrow(asset, amount, interestRateMode)` | Borrow assets from the protocol | `asset: string, amount: BigNumber, interestRateMode: InterestRateMode` | `Promise<{transactionHash: string}>` |
| `repay(asset, amount, interestRateMode)` | Repay borrowed assets | `asset: string, amount: BigNumber, interestRateMode: InterestRateMode` | `Promise<{transactionHash: string}>` |
| `withdraw(asset, amount, to?)` | Withdraw supplied assets | `asset: string, amount: BigNumber, to?: string` | `Promise<{transactionHash: string}>` |
| `setUserUseReserveAsCollateral(asset, useAsCollateral)` | Enable/disable using an asset as collateral | `asset: string, useAsCollateral: boolean` | `Promise<{transactionHash: string}>` |
| `setUserEMode(categoryId)` | Set user's E-Mode category | `categoryId: number` | `Promise<{transactionHash: string}>` |

**Note:** Transaction methods return an object with the `transactionHash` property containing the transaction hash.

### E-Mode Operations

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getAllEModeCategories(poolAddressProvider)` | Get all E-Mode categories | `poolAddressProvider: string` | `Promise<{ id: number; eMode: { label: string, ltv: number, liquidationThreshold: number, liquidationBonus: number, priceSource: string } }[]>` |

## Development

### Prerequisites

- Node.js 14+
- npm or yarn
- TypeScript 4.9+

### Building the SDK

```bash
git clone https://github.com/hyperlend/hyperlend-sdk.git
cd hyperlend-sdk
npm install
npm run build
```

### Running Tests

```bash
npm run test
```

### Environment Variables

Create a `.env` file with the following variables for testing:

```
RPC_URL=https://rpc.hyperlend.finance
PRIVATE_KEY=your_private_key
DATA_PROVIDER_ADDRESS=data_provider_contract_address
POOL_ADDRESS=pool_contract_address
UI_POOL_DATA_PROVIDER_ADDRESS=ui_provider_address
POOL_ADDRESS_PROVIDER=pool_address_provider
TEST_USER_ADDRESS=test_user_address
```

## License

MIT License