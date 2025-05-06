# HyperLendSDK

A comprehensive TypeScript SDK for interacting with the HyperLend protocol - a decentralized lending and borrowing platform on the Hyperliquid EVM blockchain.

## Overview

HyperLendSDK provides a simple interface to integrate HyperLend's lending functionality into applications. The SDK is organized into modular components that handle different aspects of the protocol:

- **Core Module**: Main lending/borrowing operations with the standard HyperLend protocol. Codebase is a [Friendly fork of Aave v3.2](https://snapshot.box/#/s:aave.eth/proposal/0x9d9972d206108c73dc35fd6b7f598a76705aefadd66caea748c41194434fa77d)
- **Isolated Module**: Specialized functionality for isolated lending markets with pair-based lending

## Installation

```bash
npm install HyperLend-sdk
```

Or with yarn:

```bash
yarn add HyperLend-sdk
```

## Quick Start

```typescript
import { HyperLendSDK } from 'HyperLend-sdk';
import { ethers } from 'ethers';

// Initialize with provider (read-only mode)
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const sdk = new HyperLendSDK(provider, 'REGISTRY_ADDRESS');

// Initialize with signer (transaction mode)
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);
const sdkWithSigner = new HyperLendSDK(signer, 'REGISTRY_ADDRESS');
```

## Modules

The SDK is organized into specialized modules, each with its own focused functionality:

### Core Module

The Core module provides access to the main HyperLend protocol features:

- Market data access and reserve information
- Supply, borrow, repay, and withdraw operations
- Collateral management
- E-Mode operations for correlated assets
- User position tracking

[**Core Module Documentation →**](./core/README.md)

### Isolated Module

The Isolated module handles specialized pair-based lending markets:

- Pair registry management and queries
- Position management with detailed user metrics
- Supply, borrow, repay, and withdraw operations with proper decimal handling
- Collateral management with automatic approval handling
- Oracle integration for price feeds and liquidation price calculations
- Gas optimization with configurable buffer settings

[**Isolated Module Documentation →**](./isolated/README.md)

## Project Structure

```
HyperLend-sdk/
├── core/                   # Core lending protocol functionality
│   ├── abi/                # ABI files for core contracts
│   ├── src/                # Source code
│   ├── package.json        # Package configuration
│   ├── README.md           # Core documentation
│   └── tsconfig.json       # TypeScript configuration
├── isolated/               # Isolated lending markets functionality
│   ├── abi/                # ABI files for isolated contracts
│   ├── src/                # Source code
│   ├── .env.example        # Example environment variables
│   ├── package.json        # Package configuration
│   ├── README.md           # Isolated documentation
│   └── tsconfig.json       # TypeScript configuration
├── .gitignore              # Git ignore file
└── README.md               # This file
```

## Key Features

- **Complete Protocol Coverage**: Access all HyperLend protocol features
- **Type Safety**: Fully typed TypeScript API
- **Modular Design**: Use only what you need
- **Comprehensive Documentation**: Detailed examples and API references
- **Gas Optimization**: Efficient transaction preparation with gas estimation
- **Error Handling**: Robust error handling and reporting

## Development

```bash
# Clone the repository
git clone https://github.com/HyperLend/HyperLend-sdk.git

# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test
```

## License

MIT License