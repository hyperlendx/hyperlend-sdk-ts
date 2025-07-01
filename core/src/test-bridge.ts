import { providers, Wallet, utils } from "ethers";
import { TypedDataSigner } from "@ethersproject/abstract-signer";
import { HyperlendSDKcore } from "./HyperlendSDKcore";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Required environment variables
const RPC_URL = process.env.RPC_URL;
const DATA_PROVIDER_ADDRESS = process.env.DATA_PROVIDER_ADDRESS;
const POOL_ADDRESS = process.env.POOL_ADDRESS;
const UI_POOL_DATA_PROVIDER_ADDRESS = process.env.UI_POOL_DATA_PROVIDER_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Bridge-specific environment variables
const HYPE_TOKEN_ADDRESS = process.env.HYPE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000'; // Default for native HYPE
const BRIDGE_AMOUNT = parseFloat(process.env.TEST_AMOUNT || '0.01'); // Allow configuring test amount
const HYPERLIQUID_CHAIN = process.env.HYPERLIQUID_CHAIN || 'Mainnet';
const TARGET_ADDRESS = process.env.TARGET_ADDRESS; // Optional target address for bridging

// HYPE token identifiers to test - trying different formats
const HYPE_TOKEN_IDS = [
    '', // Try without token ID
    '0',
    '150',
    '0x0d01dc56dcaaca66ad901c959b4011ec'
];

// Check if required environment variables are provided
if (!RPC_URL || !DATA_PROVIDER_ADDRESS || !POOL_ADDRESS || !UI_POOL_DATA_PROVIDER_ADDRESS) {
    console.error("Error: Missing required environment variables");
    process.exit(1);
}

// Create provider with proper connection handling
const provider = new providers.JsonRpcProvider({
    url: RPC_URL,
    skipFetchSetup: false
});

// Helper function to wait for transaction confirmation with timeout
const waitForTx = async (txHash: string, confirmations = 1, timeoutSeconds = 120) => {
    console.log(`Waiting for transaction ${txHash} to be confirmed...`);

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Transaction confirmation timeout after ${timeoutSeconds} seconds`)),
            timeoutSeconds * 1000);
    });

    try {
        await Promise.race([
            provider.waitForTransaction(txHash, confirmations),
            timeoutPromise
        ]);
        console.log("Transaction confirmed.");
        return true;
    } catch (error: any) {
        console.error(`Error waiting for transaction: ${error.message || 'Unknown error'}`);
        throw error;
    }
};

// Create SDK instance with proper HyperLiquid API configuration
let sdkWithSigner: HyperlendSDKcore | undefined;
let wallet: Wallet | undefined;

if (PRIVATE_KEY) {
    wallet = new Wallet(PRIVATE_KEY, provider);

    // Add TypedDataSigner capabilities to wallet
    const typedDataWallet = wallet as Wallet & TypedDataSigner;

    // Initialize SDK with signer and HyperLiquid API configuration
    sdkWithSigner = new HyperlendSDKcore(
        typedDataWallet,
        DATA_PROVIDER_ADDRESS,
        POOL_ADDRESS,
        UI_POOL_DATA_PROVIDER_ADDRESS,
        {
            testnet: 'https://api.hyperliquid-testnet.xyz',
            mainnet: 'https://api.hyperliquid.xyz'
        },
        HYPERLIQUID_CHAIN.toLowerCase() === 'testnet' ? 'testnet' : 'mainnet',
        {
            HYPE: {
                evmAddress: HYPE_TOKEN_ADDRESS,
                coreSystemAddress: '0x2222222222222222222222222222222222222222',
                decimals: 18
            }
        }
    );

    // Fix case-sensitivity issue by adding lowercase version
    sdkWithSigner.setBridgeConfig('hype', {
        evmAddress: HYPE_TOKEN_ADDRESS,
        coreSystemAddress: '0x2222222222222222222222222222222222222222',
        decimals: 18
    });
}

// Helper function to format errors properly
const formatError = (error: unknown): string => {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
    }
    if (typeof error === 'object' && error !== null) {
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
    return String(error);
};

const testBridgeFunctions = async () => {
    try {
        const chainType = HYPERLIQUID_CHAIN.toLowerCase() === 'testnet' ? 'TESTNET' : 'MAINNET';
        console.log(`Testing Hyperlend SDK Bridging Functions on ${chainType}...`);

        if (!sdkWithSigner) {
            console.error("Error: SDK with signer not initialized. Make sure PRIVATE_KEY is provided.");
            return;
        }

        // Validate connected network
        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

        const userAddress = await wallet!.getAddress();
        console.log(`Using wallet address: ${userAddress}`);

        // Check wallet balance
        const balance = await provider.getBalance(userAddress);
        console.log(`Wallet ETH balance: ${utils.formatEther(balance)}`);
        if (balance.isZero()) {
            console.warn("Warning: Wallet has zero ETH balance, transactions may fail");
        }

        console.log(`\n--- BRIDGE FUNCTION TESTS (${chainType}) ---`);

        // 1. Test bridgeToCore (EVM -> HyperCore)
        console.log(`\nTesting bridgeToCore (EVM -> HyperCore ${chainType})`);
        console.log(`Bridging ${BRIDGE_AMOUNT} HYPE from EVM (${HYPE_TOKEN_ADDRESS}) to HyperCore ${chainType}`);

        try {
            // Execute the bridge transaction
            const bridgeResult = await sdkWithSigner.bridgeToCore(
                HYPE_TOKEN_ADDRESS,
                BRIDGE_AMOUNT
            );

            console.log(`Bridge to Core successful: ${bridgeResult.txHash}`);
            await waitForTx(bridgeResult.txHash);

            console.log("Bridge to Core transaction confirmed");
        } catch (error: unknown) {
            console.error("Error in bridgeToCore:", formatError(error));
            console.log("Note: If you're using native HYPE, make sure you have funds in your wallet");
        }

        // 2. Test bridgeToEvm with proper HYPE token handling
        console.log(`\n--- Testing bridgeToEvm (HyperCore ${chainType} -> EVM) ---`);

        // Get destination address - use wallet address if not specified
        const destinationAddress = TARGET_ADDRESS || userAddress;
        console.log(`Using destination address: ${destinationAddress}`);

        // For HYPE token, we'll test with the most common identifier
        const tokenSymbol = 'HYPE';
        const tokenId = '0x0d01dc56dcaaca66ad901c959b4011ec';
        const weiDecimals = 18; // HYPE uses 18 decimals

        console.log(`\nAttempting to bridge ${BRIDGE_AMOUNT} HYPE from HyperCore ${chainType} to EVM`);
        console.log(`Token: ${tokenSymbol}:${tokenId}`);

        try {
            // Create a timestamp for the signature (this acts as a nonce)
            const timestamp = Date.now();

            // Use the SDK's helper method to create the message
            const message = sdkWithSigner.createSpotSendMessage(
                HYPERLIQUID_CHAIN,
                destinationAddress,
                tokenSymbol,
                tokenId,
                BRIDGE_AMOUNT.toString(),
                weiDecimals,
                timestamp
            );

            console.log(`Message to sign:`, JSON.stringify(message, null, 2));

            // Get signature params from SDK
            const { domain, types } = sdkWithSigner.getSpotSendSignatureParams(network.chainId);

            console.log(`Domain:`, JSON.stringify(domain, null, 2));
            console.log(`Types:`, JSON.stringify(types, null, 2));

            // Sign the message using EIP-712
            const signature = await (wallet as Wallet & TypedDataSigner)._signTypedData(
                domain,
                types,
                message
            );

            console.log(`Signature generated: ${signature}`);

            // Execute the bridge operation
            const bridgeResult = await sdkWithSigner.bridgeToEVM(
                tokenSymbol,
                tokenId,
                BRIDGE_AMOUNT.toString(),
                destinationAddress,
                network.chainId,
                weiDecimals,
                signature,
                timestamp,
                HYPERLIQUID_CHAIN
            );

            console.log(`✅ Bridge to EVM result:`, JSON.stringify(bridgeResult, null, 2));

            if (bridgeResult && bridgeResult.status === 'ok') {
                console.log(`✅ Bridge to EVM successful!`);
                if (bridgeResult.response && bridgeResult.response.txHash) {
                    console.log(`Transaction hash: ${bridgeResult.response.txHash}`);
                }
            } else {
                console.error(`❌ Bridge to EVM failed:`, bridgeResult);
            }

        } catch (error: unknown) {
            console.error(`❌ Error in bridgeToEvm:`, formatError(error));

            // Provide helpful debugging information
            if (error instanceof Error) {
                if (error.message.includes('422')) {
                    console.error("API Error 422: The request was malformed or contains invalid parameters");
                    console.error("Common causes:");
                    console.error("- Invalid token format");
                    console.error("- Insufficient balance on HyperLiquid");
                    console.error("- Invalid signature");
                    console.error("- Timestamp too old or in the future");
                } else if (error.message.includes('401')) {
                    console.error("API Error 401: Authentication failed");
                    console.error("Check if your signature is correctly formatted");
                } else if (error.message.includes('400')) {
                    console.error("API Error 400: Bad request");
                    console.error("Check if all required parameters are provided");
                }
            }
        }

        // 3. Test the case-insensitive bridge configuration
        console.log("\n--- Testing bridge configuration with case sensitivity fix ---");
        try {
            console.log('HYPE bridge config:', sdkWithSigner.getBridgeConfig('HYPE'));
            console.log('hype bridge config (lowercase):', sdkWithSigner.getBridgeConfig('hype'));

            // Verify case-insensitive lookup works now
            console.log(`HYPE is bridgeable: ${sdkWithSigner.isBridgeable('HYPE') ? 'Yes ✓' : 'No ✗'}`);
            console.log(`hype is bridgeable (lowercase): ${sdkWithSigner.isBridgeable('hype') ? 'Yes ✓' : 'No ✗'}`);

            // Add a helper method to HyperlendSDKcore to make tokens case-insensitive
            console.log('\nAdding helper to fix all token case sensitivity issues...');

            // Get all bridgeable tokens and create lowercase versions
            const tokens = Object.keys(sdkWithSigner.getBridgeableTokens());
            for (const token of tokens) {
                if (token !== token.toLowerCase()) {
                    const config = sdkWithSigner.getBridgeConfig(token);
                    if (config) {
                        sdkWithSigner.setBridgeConfig(token.toLowerCase(), config);
                        console.log(`Added lowercase mapping for ${token} -> ${token.toLowerCase()}`);
                    }
                }
            }
        } catch (error) {
            console.error("Error testing bridge configuration:", formatError(error));
        }

        console.log("\nBridge function tests completed!");

    } catch (error: unknown) {
        console.error("Error in bridge function tests:", formatError(error));
    }
};

// Run the tests with proper error handling
testBridgeFunctions().then(() => {
    console.log("All tests completed");
    process.exit(0);
}).catch(error => {
    console.error("Fatal error during tests:", formatError(error));
    process.exit(1);
});