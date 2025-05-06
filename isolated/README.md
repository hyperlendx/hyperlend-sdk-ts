# HyperLend SDK - Isolated Module

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Key Features](#key-features)
- [Usage Examples](#usage-examples)
   - [Querying Pair Registry Data](#querying-pair-registry-data)
   - [Supply and Borrow Operations](#supply-and-borrow-operations)
   - [Managing Collateral](#managing-collateral)
   - [Reading User Positions](#reading-user-positions)
- [API Reference](#api-reference)
   - [Pair Registry Functions](#pair-registry-functions)
   - [Pair Data Functions](#pair-data-functions)
   - [User Position Functions](#user-position-functions)
- [Return Types](#return-types)
- [Error Handling](#error-handling)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Installation

```bash
npm install hyperlend-isolated-sdk
```

## Initialization

The SDK can be initialized in two modes:

### Read-Only Mode

```typescript
import { HyperlendSDK } from 'hyperlend-isolated-sdk';
import { ethers } from 'ethers';

// Initialize with provider (read-only mode)
const provider = new ethers.providers.JsonRpcProvider('RPC_ENDPOINT');
const sdkReadOnly = new HyperlendSDK(provider, 'REGISTRY_ADDRESS');
```

### Transaction Mode (with Signer)

```typescript
import { HyperlendSDK } from 'hyperlend-isolated-sdk';
import { ethers } from 'ethers';

// Initialize with signer (transaction mode)
const privateKey = process.env.PRIVATE_KEY;
const provider = new ethers.providers.JsonRpcProvider('RPC_ENDPOINT');
const signer = new ethers.Wallet(privateKey, provider);
const sdk = new HyperlendSDK(signer, 'REGISTRY_ADDRESS');
```

## Key Features

- **Pair Registry Management**: Query and manage lending pairs with separate risk profiles
- **Position Management**: Supply, borrow, withdraw, and repay operations for isolated markets
- **Collateral Management**: Add and remove collateral with automatic approval handling
- **Data Access**: Query pair and user position data with formatted metrics
- **Oracle Integration**: Automatic price feed data handling for liquidation calculations
- **Gas Optimization**: Automatic gas limit estimation with configurable buffer
- **Error Handling**: Comprehensive validation and detailed error messages

## Usage Examples

### Querying Pair Registry Data

```typescript
// Get all available lending pairs
const pairAddresses = await sdk.getAllPairAddresses();
console.log(`Found ${pairAddresses.length} lending pairs`);

// Get detailed data for a specific pair
const pairData = await sdk.readPairData(pairAddresses[0]);
console.log('Pair data:', {
  asset: pairData.assetSymbol,
  collateral: pairData.collateralSymbol,
  maxLTV: ethers.utils.formatUnits(pairData.maxLTV, 0),
  totalAssets: pairData.formattedTotalAssetAmount,
  totalBorrows: pairData.formattedTotalBorrowAmount
});

// Check if an address is an authorized deployer
const isDeployer = await sdk.isDeployer('0x123...');
```

### Supply and Borrow Operations

```typescript
// Supply assets to a lending pair
const supplyAmount = ethers.utils.parseEther('10');
const supplyResult = await sdk.supply(pairAddress, supplyAmount, userAddress, true);
console.log(`Supply transaction hash: ${supplyResult.transactionHash}`);
console.log(`Supplied amount: ${supplyResult.amount} ${supplyResult.symbol}`);

// Borrow assets with collateral in a single transaction
const borrowAmount = ethers.utils.parseEther('5');
const collateralAmount = ethers.utils.parseEther('2');
const borrowResult = await sdk.borrow(
  pairAddress,
  borrowAmount,
  collateralAmount,
  userAddress
);
console.log(`Borrow transaction hash: ${borrowResult.transactionHash}`);

// Withdraw supplied assets
const withdrawShares = ethers.utils.parseEther('2.5');
const withdrawResult = await sdk.withdraw(pairAddress, withdrawShares, userAddress);
console.log(`Withdraw transaction hash: ${withdrawResult.transactionHash}`);

// Repay borrowed assets
const repayShares = ethers.utils.parseEther('1');
const repayResult = await sdk.repay(pairAddress, repayShares, userAddress, true);
console.log(`Repay transaction hash: ${repayResult.transactionHash}`);
```

### Managing Collateral

```typescript
// Add collateral to a position
const addAmount = ethers.utils.parseEther('1');
const addResult = await sdk.addCollateral(pairAddress, addAmount, userAddress, true);
console.log(`Add collateral transaction hash: ${addResult.transactionHash}`);
console.log(`Added amount: ${addResult.amount} ${addResult.symbol}`);

// Remove collateral from a position
const removeAmount = ethers.utils.parseEther('0.5');
const removeResult = await sdk.removeCollateral(pairAddress, removeAmount, userAddress);
console.log(`Remove collateral transaction hash: ${removeResult.transactionHash}`);
console.log(`Removed amount: ${removeResult.amount} ${removeResult.symbol}`);
```

### Reading User Positions

```typescript
// Get user's position details
const position = await sdk.readUserPosition(pairAddress, userAddress);

console.log('User position:', {
  collateralBalance: position.formattedCollateralBalance,
  borrowShares: position.formattedBorrowShares,
  liquidationPrice: position.formattedLiquidationPrice,
  collateralToken: position.collateralSymbol,
  assetToken: position.assetSymbol
});

// Calculate position health metrics
if (!position.userCollateralBalance.isZero() && !position.userBorrowShares.isZero()) {
  const pairData = await sdk.readPairData(pairAddress);
  const utilizationRatio = position.userBorrowShares
    .mul(pairData.maxLTV)
    .div(position.userCollateralBalance);

  console.log(`Collateral utilization: ${ethers.utils.formatUnits(utilizationRatio, 0)}%`);
  console.log(`Buffer remaining: ${100 - Number(ethers.utils.formatUnits(utilizationRatio, 0))}%`);
}
```

## API Reference

### Pair Registry Functions

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getDeployedPairsLength()` | Get number of deployed pairs | None | `Promise<ethers.BigNumber>` |
| `getAllPairAddresses()` | Get all deployed pair addresses | None | `Promise<string[]>` |
| `addPair(pairAddress, signer, overrides?)` | Add a new pair to registry | `pairAddress: string, signer: ethers.Signer, overrides?: ethers.Overrides` | `Promise<{transactionHash: string}>` |
| `setDeployers(deployers, allow, signer, overrides?)` | Set deployer permissions | `deployers: string[], allow: boolean, signer: ethers.Signer, overrides?: ethers.Overrides` | `Promise<{transactionHash: string}>` |
| `isDeployer(deployer)` | Check if address is a deployer | `deployer: string` | `Promise<boolean>` |
| `getPairAddressByName(name)` | Get pair address by name | `name: string` | `Promise<string>` |

### Pair Data Functions

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `readPairData(pairAddress)` | Get comprehensive pair data | `pairAddress: string` | `Promise<PairData>` |
| `getTotalAsset(pairAddress)` | Get total asset amount | `pairAddress: string` | `Promise<{totalAssets: ethers.BigNumber, formatted: string, symbol: string}>` |
| `getTotalBorrow(pairAddress)` | Get total borrow amount | `pairAddress: string` | `Promise<{totalBorrow: ethers.BigNumber, formatted: string, symbol: string}>` |

### User Position Functions

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `readUserPosition(pairAddress, userAddress)` | Get user position details | `pairAddress: string, userAddress: string` | `Promise<UserPosition>` |
| `supply(pairAddress, amount, userAddress, autoApprove?)` | Supply assets to a pair | `pairAddress: string, amount: ethers.BigNumber, userAddress: string, autoApprove?: boolean` | `Promise<TransactionResult>` |
| `borrow(pairAddress, amount, collateralAmount, userAddress, options?)` | Borrow assets with collateral | `pairAddress: string, amount: ethers.BigNumber, collateralAmount: ethers.BigNumber, userAddress: string, options?: {gasLimit?: number, autoApprove?: boolean}` | `Promise<TransactionResult>` |
| `withdraw(pairAddress, shares, userAddress)` | Withdraw supplied assets | `pairAddress: string, shares: ethers.BigNumber, userAddress: string` | `Promise<TransactionResult>` |
| `repay(pairAddress, shares, userAddress, autoApprove?)` | Repay borrowed assets | `pairAddress: string, shares: ethers.BigNumber, userAddress: string, autoApprove?: boolean` | `Promise<TransactionResult>` |
| `addCollateral(pairAddress, amount, userAddress, autoApprove?)` | Add collateral to position | `pairAddress: string, amount: ethers.BigNumber, userAddress: string, autoApprove?: boolean` | `Promise<TransactionResult>` |
| `removeCollateral(pairAddress, amount, userAddress)` | Remove collateral from position | `pairAddress: string, amount: ethers.BigNumber, userAddress: string` | `Promise<TransactionResult>` |

## Return Types

### PairData

```typescript
interface PairData {
  asset: string;                          // Asset token address
  collateral: string;                     // Collateral token address
  maxLTV: ethers.BigNumber;               // Maximum loan-to-value ratio
  cleanLiquidationFee: ethers.BigNumber;  // Fee for clean liquidations
  dirtyLiquidationFee: ethers.BigNumber;  // Fee for dirty liquidations
  protocolLiquidationFee: ethers.BigNumber; // Protocol fee on liquidations
  totalAssetAmount: ethers.BigNumber;     // Total assets in the pair
  totalBorrowAmount: ethers.BigNumber;    // Total borrowed from the pair
  totalCollateral: ethers.BigNumber;      // Total collateral in the pair
  currentRateInfo: {                      // Interest rate information
    lastBlock: number;
    feeToProtocolRate: number;
    lastTimestamp: ethers.BigNumber;
    ratePerSec: ethers.BigNumber;
    fullUtilizationRate: ethers.BigNumber;
  };
  formattedTotalAssetAmount: string;      // Formatted total assets
  formattedTotalBorrowAmount: string;     // Formatted total borrowed amount
  formattedTotalCollateral: string;       // Formatted total collateral
  assetSymbol: string;                    // Asset token symbol
  collateralSymbol: string;               // Collateral token symbol
}
```

### UserPosition

```typescript
interface UserPosition {
  userCollateralBalance: ethers.BigNumber; // User's collateral balance
  userBorrowShares: ethers.BigNumber;      // User's borrow shares
  liquidationPrice: ethers.BigNumber;      // Liquidation price threshold
  formattedCollateralBalance: string;      // Formatted collateral balance
  formattedBorrowShares: string;           // Formatted borrow shares
  formattedLiquidationPrice: string;       // Formatted liquidation price
  collateralSymbol: string;                // Collateral token symbol
  assetSymbol: string;                     // Asset token symbol
}
```

### TransactionResult

```typescript
interface TransactionResult {
  success: boolean;              // Whether transaction was successful
  transactionHash: string;       // Transaction hash
  blockNumber: number;           // Block number of confirmation
  amount: string;                // Formatted amount with proper decimals
  symbol: string;                // Token symbol
  collateral?: string;           // Formatted collateral amount (for borrow)
  collateralSymbol?: string;     // Collateral token symbol (for borrow)
}
```

## Error Handling

The SDK provides detailed error messages for various failure scenarios:

```typescript
try {
  const result = await sdk.borrow(pairAddress, amount, collateral, userAddress);
  console.log("Success:", result);
} catch (error) {
  if (error.message.includes("allowance")) {
    console.error("Token approval required");
  } else if (error.message.includes("balance")) {
    console.error("Insufficient balance");
  } else if (error.message.includes("oracle")) {
    console.error("Oracle issue - price data unavailable");
  } else {
    console.error("Error:", error.message);
  }
}
```

## Development

### Environment Setup

Create a `.env` file with the following variables:

```
RPC_URL=https://rpc.hyperliquid-testnet.xyz/evm
PRIVATE_KEY=your_private_key
REGISTRY_ADDRESS=0x274396Ec36D17dAbC018d9437D5a4C0D0fD503D0
PAIR_ADDRESS=0xbb727Bce50C12c9472Bf5d6F0e76388455ec62d5
TEST_USER_ADDRESS=0x18778f39Bb22A12d329faEab0969ef3A9a99E3ee
ORACLE_ADDRESS=0xFc7A87D9413F689d1722Bac165BC0D3Af88a3cd9
```

### Building and Testing

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run the test script
npm run test
```

## Troubleshooting

### Common Issues

1. **Transaction Reverted**: Check oracle price availability, token approvals, and user balance
2. **Gas Estimation Failures**: Use the manual gas limit option in the borrow function
3. **Oracle Issues**: Verify the oracle address is correct and has valid price data
4. **Insufficient Collateral**: Ensure user has enough collateral to borrow the requested amount
5. **Allowance Errors**: Set `autoApprove` to true or manually approve tokens before transactions

## License

This project is licensed under the MIT License - see the LICENSE file for details.