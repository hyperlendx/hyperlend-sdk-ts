# HyperlendSDK

A comprehensive TypeScript SDK for interacting with the Hyperlend protocol - a decentralized lending and borrowing platform on the HyperLiquid blockchain.

## Overview

HyperlendSDK provides a simple interface to integrate Hyperlend's lending functionality into applications. The SDK is organized into modular components that handle different aspects of the protocol:

- **Core Module**: Main lending/borrowing operations with the standard Hyperlend protocol
- **Isolated Module**: Specialized functionality for isolated lending markets with pair-based lending

## Installation

```bash
npm install hyperlend-sdk
```

Or with yarn:

```bash
yarn add hyperlend-sdk
```

## Quick Start

```typescript
import { HyperlendSDK } from 'hyperlend-sdk';
import { ethers } from 'ethers';

// Initialize with provider (read-only mode)
const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL');
const sdk = new HyperlendSDK(provider, 'REGISTRY_ADDRESS');

// Initialize with signer (transaction mode)
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);
const sdkWithSigner = new HyperlendSDK(signer, 'REGISTRY_ADDRESS');
```

## Modules

The SDK is organized into specialized modules, each with its own focused functionality:

### Core Module

The Core module provides access to the main Hyperlend protocol features:

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
hyperlend-sdk/
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

- **Complete Protocol Coverage**: Access all Hyperlend protocol features
- **Type Safety**: Fully typed TypeScript API
- **Modular Design**: Use only what you need
- **Comprehensive Documentation**: Detailed examples and API references
- **Gas Optimization**: Efficient transaction preparation with gas estimation
- **Error Handling**: Robust error handling and reporting

## Development

```bash
# Clone the repository
git clone https://github.com/hyperlend/hyperlend-sdk.git

# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test
```

## License

MIT License