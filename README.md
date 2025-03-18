# HyperLend SDK

The official SDK for interacting with the HyperLend protocol.

## Features
- Retrieve deployed pairs and addresses.
- Check deployer permissions.
- Add new pairs.

## Installation
```bash
npm install hyperlend-sdk

##usage

const sdk = require('hyperlend-sdk');

// Example usage

sdk.getDeployedPairsLength().then(console.log);