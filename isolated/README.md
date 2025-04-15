# HyperLend SDK - Isolated Module

A specialized TypeScript SDK for interacting with HyperLend's isolated lending markets on the HyperLiquid blockchain. This module provides direct access to pair-based lending/borrowing functionalities through a type-safe API.

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Key Features](#key-features)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Development](#development)

## Installation

```bash
npm install @hyperlend/isolated-sdk
```

Or with yarn:

```bash
yarn add @hyperlend/isolated-sdk
```

## Initialization

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

- **Pair Registry Management**: Discover, query and manage lending pairs
- **Position Management**: Interact with lending/borrowing positions
- **Asset Operations**: Supply, borrow, withdraw, and repay assets
- **Collateral Management**: Add and remove collateral from positions
- **Data Access**: Query comprehensive pair and user position data
- **Oracle Integration**: Handle price feed data for liquidation protection

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

// Get pair by name
const usdcPair = await sdk.getPairAddressByName('USDC-WETH');
```

### Supply and Borrow

```typescript
import { ethers } from 'ethers';

// Supply assets to a lending pair
const supplyAmount = ethers.utils.parseEther('10');
const supplyTx = await sdk.supply(pairAddress, supplyAmount, userAddress);
console.log(`Supply transaction hash: ${supplyTx.transactionHash}`);

// Borrow assets with collateral
const borrowAmount = ethers.utils.parseEther('5');
const collateralAmount = ethers.utils.parseEther('2');
const borrowTx = await sdk.borrow(
  pairAddress,
  borrowAmount,
  collateralAmount,
  userAddress
);
console.log(`Borrow transaction hash: ${borrowTx.transactionHash}`);
```

### Managing Collateral

```typescript
// Add collateral to a position
const addAmount = ethers.utils.parseEther('1');
const addTx = await sdk.addCollateral(pairAddress, addAmount, userAddress);
console.log(`Add collateral transaction hash: ${addTx.transactionHash}`);

// Remove collateral from a position
const removeAmount = ethers.utils.parseEther('0.5');
const removeTx = await sdk.removeCollateral(pairAddress, removeAmount, userAddress);
console.log(`Remove collateral transaction hash: ${removeTx.transactionHash}`);
```

### Repayment and Withdrawal

```typescript
// Repay borrowed assets
const sharesToRepay = ethers.utils.parseEther('2.5');
const repayTx = await sdk.repay(pairAddress, sharesToRepay, userAddress);
console.log(`Repay transaction hash: ${repayTx.transactionHash}`);

// Withdraw supplied assets
const sharesToWithdraw = ethers.utils.parseEther('1.75');
const withdrawTx = await sdk.withdraw(pairAddress, sharesToWithdraw, userAddress);
console.log(`Withdraw transaction hash: ${withdrawTx.transactionHash}`);
```

### Reading User Positions

```typescript
// Get user's position details
const position = await sdk.readUserPosition(pairAddress, userAddress);
console.log('User position:', {
  collateralBalance: ethers.utils.formatEther(position.userCollateralBalance),
  borrowShares: ethers.utils.formatEther(position.userBorrowShares),
  liquidationPrice: ethers.utils.formatEther(position.liquidationPrice)
});
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
| `supply(pairAddress, amount, userAddress)` | Supply assets to a pair | `pairAddress: string, amount: ethers.BigNumber, userAddress: string` | `Promise<{transactionHash: string}>` |
| `borrow(pairAddress, amount, collateralAmount, userAddress)` | Borrow assets with collateral | `pairAddress: string, amount: ethers.BigNumber, collateralAmount: ethers.BigNumber, userAddress: string` | `Promise<{transactionHash: string}>` |
| `withdraw(pairAddress, shares, userAddress)` | Withdraw supplied assets | `pairAddress: string, shares: ethers.BigNumber, userAddress: string` | `Promise<{transactionHash: string}>` |
| `repay(pairAddress, shares, userAddress)` | Repay borrowed assets | `pairAddress: string, shares: ethers.BigNumber, userAddress: string` | `Promise<{transactionHash: string}>` |
| `addCollateral(pairAddress, amount, userAddress)` | Add collateral to position | `pairAddress: string, amount: ethers.BigNumber, userAddress: string` | `Promise<{transactionHash: string}>` |
| `removeCollateral(pairAddress, amount, userAddress)` | Remove collateral from position | `pairAddress: string, amount: ethers.BigNumber, userAddress: string` | `Promise<{transactionHash: string}>` |

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- TypeScript 4.5+

### Building the SDK

```bash
git clone https://github.com/hyperlend/hyperlend-sdk.git
cd hyperlend-sdk/isolated
npm install
npm run build
```

### Running Tests

```bash
npm run test
```

### Environment Setup

Create a `.env` file with the following variables:

```
RPC_URL=https://rpc.hyperliquid.xyz
PRIVATE_KEY=your_private_key
REGISTRY_ADDRESS=deployed_registry_address
TEST_PAIR_ADDRESS=deployed_test_pair_address
```

## License

MIT License