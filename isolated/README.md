# HyperLend SDK - Isolated Module

## Overview

The HyperLend Isolated SDK is a comprehensive TypeScript library for interacting with HyperLend's isolated lending markets on the HyperLiquid blockchain. This module provides developers with a streamlined interface to connect with pair-based lending/borrowing protocols where each lending pair operates independently with dedicated parameters and risk profiles.

The SDK handles all blockchain interactions, token approvals, gas estimations, and data formatting, allowing developers to focus on building applications instead of managing low-level contract interactions.

## Installation

### Using npm

```bash
npm install @hyperlend/isolated-sdk
```

### Using yarn

```bash
yarn add @hyperlend/isolated-sdk
```

### Requirements

- Node.js 14.x or higher
- ethers.js v5.x

## Initialization

The SDK can be initialized in either read-only mode (using a provider) or transaction mode (using a signer).

```typescript
import { HyperlendSDK } from '@hyperlend/isolated-sdk';
import { ethers } from 'ethers';

// Initialize with provider (read-only mode)
const provider = new ethers.providers.JsonRpcProvider('RPC_ENDPOINT');
const sdkReadOnly = new HyperlendSDK(provider, 'REGISTRY_ADDRESS');

// Initialize with signer (transaction mode)
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);
const sdk = new HyperlendSDK(signer, 'REGISTRY_ADDRESS');
```

## Key Features

- **Pair Registry Management**: Query and manage lending pairs in the system
- **Position Management**: Supply, borrow, withdraw, and repay assets with configurable parameters
- **Collateral Management**: Add and remove collateral from positions with automatic approval handling
- **Data Access**: Query pair and user position data with detailed metrics
- **Oracle Integration**: Handle price feed data for liquidation calculations and risk assessment
- **Gas Optimization**: Automatic gas limit estimation with configurable buffer
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Transaction Results**: Structured transaction results with formatted values and transaction hashes

## Usage Examples

### Querying Pair Registry Data

```typescript
// Get all available lending pairs
const pairAddresses = await sdk.getAllPairAddresses();
console.log(`Found ${pairAddresses.length} lending pairs`);

// Get detailed data for a specific pair
const pairData = await sdk.readPairData(pairAddresses[0]);
console.log('Pair data:', {
  asset: pairData.asset,
  collateral: pairData.collateral,
  maxLTV: pairData.maxLTV.toString(),
  totalAssetAmount: ethers.utils.formatEther(pairData.totalAssetAmount)
});

// Get pair address by name
const pairByName = await sdk.getPairAddressByName('PairName');

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
  userAddress,
  {
    oracleAddress: ORACLE_ADDRESS,
    autoApprove: true,
    gasLimit: 2000000 // Optional custom gas limit
  }
);
console.log(`Borrow transaction hash: ${borrowResult.transactionHash}`);
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

### Repayment and Withdrawal

```typescript
// Repay borrowed assets
const sharesToRepay = ethers.utils.parseEther('2.5');
const repayResult = await sdk.repay(pairAddress, sharesToRepay, userAddress, true);
console.log(`Repay transaction hash: ${repayResult.transactionHash}`);
console.log(`Repaid amount: ${repayResult.amount} ${repayResult.symbol}`);

// Withdraw supplied assets
const sharesToWithdraw = ethers.utils.parseEther('1.75');
const withdrawResult = await sdk.withdraw(pairAddress, sharesToWithdraw, userAddress);
console.log(`Withdraw transaction hash: ${withdrawResult.transactionHash}`);
console.log(`Withdrawn amount: ${withdrawResult.amount} ${withdrawResult.symbol}`);
```

### Reading User Positions

```typescript
// Get user's position details
const position = await sdk.readUserPosition(pairAddress, userAddress);

// Format and display position data
console.log('User position:', {
  collateralBalance: ethers.utils.formatEther(position.userCollateralBalance),
  borrowShares: ethers.utils.formatEther(position.userBorrowShares),
  liquidationPrice: ethers.utils.formatEther(position.liquidationPrice)
});

// Calculate position health metrics
if (!position.userCollateralBalance.isZero() && !position.userBorrowShares.isZero()) {
  const utilizationRatio = position.userBorrowShares
    .mul(position.liquidationPrice)
    .mul(100)
    .div(position.userCollateralBalance);
    
  console.log(`Collateral utilization: ${ethers.utils.formatUnits(utilizationRatio, 0)}%`);
  console.log(`Buffer remaining: ${100 - Number(ethers.utils.formatUnits(utilizationRatio, 0))}%`);
}
```

## Complete Transaction Flow Example

```typescript
// Setup SDK
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const sdk = new HyperlendSDK(wallet, REGISTRY_ADDRESS);

// Step 1: Supply assets
const supplyAmount = ethers.utils.parseEther('10');
const supplyResult = await sdk.supply(pairAddress, supplyAmount, wallet.address, true);
console.log(`Supplied ${supplyResult.amount} ${supplyResult.symbol}`);

// Step 2: Add collateral
const collateralAmount = ethers.utils.parseEther('5');
const addCollateralResult = await sdk.addCollateral(pairAddress, collateralAmount, wallet.address, true);
console.log(`Added ${addCollateralResult.amount} ${addCollateralResult.symbol} as collateral`);

// Step 3: Borrow against collateral
const borrowAmount = ethers.utils.parseEther('2');
const borrowResult = await sdk.borrow(
  pairAddress,
  borrowAmount,
  ethers.constants.Zero, // No additional collateral in this step
  wallet.address,
  { 
    oracleAddress: ORACLE_ADDRESS,
    autoApprove: true
  }
);
console.log(`Borrowed ${borrowResult.amount} ${borrowResult.symbol}`);

// Step 4: Check position after borrowing
const position = await sdk.readUserPosition(pairAddress, wallet.address);
console.log(`Position collateral: ${ethers.utils.formatEther(position.userCollateralBalance)}`);
console.log(`Position borrow shares: ${ethers.utils.formatEther(position.userBorrowShares)}`);

// Step 5: Repay half of the borrowed amount
const repayShares = position.userBorrowShares.div(2);
const repayResult = await sdk.repay(pairAddress, repayShares, wallet.address, true);
console.log(`Repaid ${repayResult.amount} ${repayResult.symbol}`);

// Step 6: Remove some collateral
const removeAmount = position.userCollateralBalance.div(4);
const removeResult = await sdk.removeCollateral(pairAddress, removeAmount, wallet.address);
console.log(`Removed ${removeResult.amount} ${removeResult.symbol} collateral`);

// Step 7: Withdraw supplied assets
const withdrawShares = supplyAmount.div(2);
const withdrawResult = await sdk.withdraw(pairAddress, withdrawShares, wallet.address);
console.log(`Withdrawn ${withdrawResult.amount} ${withdrawResult.symbol}`);
```

## API Reference

### Pair Registry Functions

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `getDeployedPairsLength()` | Get number of deployed pairs | None | `Promise<ethers.BigNumber>` |
| `getAllPairAddresses()` | Get all deployed pair addresses | None | `Promise<string[]>` |
| `addPair(pairAddress, signer, overrides?)` | Add a new pair to registry | `pairAddress: string, signer: ethers.Signer, overrides?: ethers.Overrides` | `Promise<void>` |
| `setDeployers(deployers, allow, signer, overrides?)` | Set deployer permissions | `deployers: string[], allow: boolean, signer: ethers.Signer, overrides?: ethers.Overrides` | `Promise<void>` |
| `isDeployer(deployer)` | Check if address is a deployer | `deployer: string` | `Promise<boolean>` |
| `getPairAddressByName(name)` | Get pair address by name | `name: string` | `Promise<string>` |

### Pair Data Functions

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `readPairData(pairAddress)` | Get comprehensive pair data | `pairAddress: string` | `Promise<PairData>` |
| `getTotalAsset(pairAddress)` | Get total asset amount | `pairAddress: string` | `Promise<ethers.BigNumber>` |
| `getTotalBorrow(pairAddress)` | Get total borrow amount | `pairAddress: string` | `Promise<ethers.BigNumber>` |

### User Position Functions

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `readUserPosition(pairAddress, userAddress)` | Get user position details | `pairAddress: string, userAddress: string` | `Promise<UserPosition>` |
| `supply(pairAddress, amount, userAddress, autoApprove?)` | Supply assets to a pair | `pairAddress: string, amount: ethers.BigNumber, userAddress: string, autoApprove?: boolean` | `Promise<TransactionResult>` |
| `borrow(pairAddress, amount, collateralAmount, userAddress, options?)` | Borrow assets with collateral | `pairAddress: string, amount: ethers.BigNumber, collateralAmount: ethers.BigNumber, userAddress: string, options?: {gasLimit?: number, oracleAddress?: string, autoApprove?: boolean}` | `Promise<TransactionResult>` |
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
  maxLTV: ethers.BigNumber;               // Maximum loan-to-value ratio (in basis points)
  cleanLiquidationFee: ethers.BigNumber;  // Fee for clean liquidations
  dirtyLiquidationFee: ethers.BigNumber;  // Fee for dirty liquidations
  protocolLiquidationFee: ethers.BigNumber; // Protocol fee on liquidations
  totalAssetAmount: ethers.BigNumber;     // Total assets in the pair
  totalBorrowAmount: ethers.BigNumber;    // Total borrowed from the pair
  totalCollateral: ethers.BigNumber;      // Total collateral in the pair
  currentRateInfo: {                      // Interest rate information
    lastBlock: ethers.BigNumber;
    borrowRate: ethers.BigNumber;
  };
}
```

### UserPosition

```typescript
interface UserPosition {
  userCollateralBalance: ethers.BigNumber; // User's collateral balance
  userBorrowShares: ethers.BigNumber;      // User's borrow shares
  liquidationPrice: ethers.BigNumber;      // Liquidation price threshold
}
```

### TransactionResult

```typescript
interface TransactionResult {
  success: boolean;              // Whether the transaction was successful
  transactionHash: string;       // Transaction hash
  blockNumber: number;           // Block number where the transaction was confirmed
  amount: string;                // Formatted amount with proper decimals
  symbol: string;                // Token symbol
  collateral?: string;           // Formatted collateral amount (for borrow operations)
  collateralSymbol?: string;     // Collateral token symbol (for borrow operations)
}
```

## Error Handling

The SDK provides detailed error messages for various failure scenarios:

- **Token Approval Errors**: If tokens cannot be approved and `autoApprove` is false
- **Insufficient Balance Errors**: If the user has insufficient tokens for the operation
- **Transaction Errors**: Detailed error messages from failed transactions
- **Contract Errors**: Smart contract reverts with reason strings
- **Oracle Errors**: When price data is unavailable or considered invalid

Example of handling errors:

```typescript
try {
  const result = await sdk.borrow(pairAddress, amount, collateral, userAddress);
  console.log("Success:", result);
} catch (error) {
  if (error.message.includes("price")) {
    console.error("Oracle price error:", error.message);
  } else if (error.message.includes("allowance")) {
    console.error("Token approval error:", error.message);
  } else if (error.message.includes("balance")) {
    console.error("Insufficient balance:", error.message);
  } else {
    console.error("Unknown error:", error.message);
  }
}
```

## Development

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- TypeScript 4.x or higher
- An Ethereum-compatible wallet with HyperLiquid testnet tokens

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

### Building the SDK

```bash
# Install dependencies
npm install

# Build the SDK
npm run build
```

### Testing

The SDK can be tested using the provided test script:

```bash
# Run the test script
npm run test

# Or directly using ts-node
ts-node src/test-sdk.ts
```

This will run through basic registry functions, read functions, user position queries, and transaction flow tests.

### Production Usage Notes

1. **Gas Optimization**: The SDK automatically estimates gas with a buffer, but for production, consider monitoring gas costs and adjusting buffer parameters.

2. **Oracle Integration**: Always validate that oracles are functioning correctly before executing borrow transactions.

3. **Error Handling**: Implement comprehensive error handling in production applications to handle different failure modes.

4. **Security**: Never hardcode private keys; use secure environment variables or key management solutions.

## Troubleshooting

### Common Issues

1. **Transaction Reverted**: If transactions are consistently reverting, check:
    - Oracle price availability
    - Token approvals
    - User balance
    - Gas limit settings

2. **Oracle Issues**: If borrowing fails with oracle errors:
    - Verify the oracle address is correct
    - Check if the oracle has valid price data
    - Consider implementing fallback oracles

3. **Gas Estimation Failures**: If gas estimation fails:
    - Use the manual gas limit option in the borrow function
    - Set a reasonable fixed gas limit based on observed successful transactions

### Support

For questions and support, please:
- Open an issue on the GitHub repository
- Check the HyperLend documentation at [docs.hyperlend.finance](https://docs.hyperlend.finance)
- Join the HyperLiquid Discord community

## License

This project is licensed under the MIT License - see the LICENSE file for details.