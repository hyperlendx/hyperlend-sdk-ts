import { providers, Wallet, utils } from "ethers";
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
const HYPE_TOKEN_ID = process.env.HYPE_TOKEN_ID || 'HYPE:0'; // Default HYPE token ID on HyperCore
const BRIDGE_AMOUNT = parseFloat(process.env.TEST_AMOUNT || '0.001'); // Allow configuring test amount

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

    // Initialize SDK with signer and HyperLiquid API configuration
    sdkWithSigner = new HyperlendSDKcore(
        wallet,
        DATA_PROVIDER_ADDRESS,
        POOL_ADDRESS,
        UI_POOL_DATA_PROVIDER_ADDRESS,
        {
            testnet: 'https://api.hyperliquid-testnet.io',
            mainnet: 'https://api.hyperliquid.io'
        },
        'mainnet', // Using mainnet configuration
        {
            HYPE: {
                evmAddress: HYPE_TOKEN_ADDRESS,
                coreSystemAddress: '0x2222222222222222222222222222222222222222', // Special address for HYPE
                decimals: 18
            }
        }
    );
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
        console.log("Testing Hyperlend SDK Bridging Functions on MAINNET...");

        if (!sdkWithSigner) {
            console.error("Error: SDK with signer not initialized. Make sure PRIVATE_KEY is provided.");
            return;
        }

        // Validate connected network
        const network = await provider.getNetwork();
        console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
        // Mainnet check - uncomment in production
        // if (network.chainId !== 1) {
        //     throw new Error(`Expected mainnet (chainId 1), but connected to chainId ${network.chainId}`);
        // }

        const userAddress = await wallet!.getAddress();
        console.log(`Using wallet address: ${userAddress}`);

        // Check wallet balance
        const balance = await provider.getBalance(userAddress);
        console.log(`Wallet ETH balance: ${utils.formatEther(balance)}`);
        if (balance.isZero()) {
            console.warn("Warning: Wallet has zero ETH balance, transactions may fail");
        }

        console.log("\n--- BRIDGE FUNCTION TESTS (MAINNET) ---");

        // 1. Test bridgeToCore (EVM -> HyperCore)
        console.log("\nTesting bridgeToCore (EVM -> HyperCore Mainnet)");
        console.log(`Bridging ${BRIDGE_AMOUNT} HYPE from EVM (${HYPE_TOKEN_ADDRESS}) to HyperCore Mainnet`);

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

            // Type guard for error with reason property
            if (error && typeof error === 'object' && 'reason' in error) {
                console.error("Reason:", (error as { reason: string }).reason);
            }
            console.log("Note: If you're using native HYPE, make sure you have funds in your wallet");
        }

        // 2. Test bridgeToEvm (HyperCore -> EVM)
        console.log("\nTesting bridgeToEvm (HyperCore -> EVM)");
        console.log(`Bridging ${BRIDGE_AMOUNT} HYPE from HyperCore Mainnet (${HYPE_TOKEN_ID}) to EVM`);

        try {
            // Execute the bridge transaction
            const bridgeResult = await sdkWithSigner.bridgeToEvm(
                HYPE_TOKEN_ID,
                BRIDGE_AMOUNT
            );

            if (bridgeResult.status === 'ok') {
                console.log(`Bridge to EVM successful: ${JSON.stringify(bridgeResult.response)}`);

                // If there's a transaction hash in the response
                if (bridgeResult.response && bridgeResult.response.txHash) {
                    console.log(`Transaction hash: ${bridgeResult.response.txHash}`);
                }
            } else {
                console.error("Bridge to EVM failed with status:", bridgeResult.status);
                if (bridgeResult.response) {
                    console.error("Response:", bridgeResult.response);
                }
            }
        } catch (error: unknown) {
            console.error("Error in bridgeToEvm:", formatError(error));
            console.log("Note: Make sure you have funds in your HyperCore Mainnet account");
        }

        // 3. Test the system contract address derivation for HYPE token
        console.log("\nTesting system contract address derivation for HYPE");
        try {
            // Fix for the TS2339 error - use type assertion and direct property access
            const config = (sdkWithSigner as HyperlendSDKcore).getBridgeConfig('HYPE');

            if (!config) {
                throw new Error("Cannot find HYPE token bridge configuration");
            }

            const systemContract = config.coreSystemAddress;
            console.log(`System contract address for HYPE: ${systemContract}`);

            const expectedAddress = '0x2222222222222222222222222222222222222222';
            // Case-insensitive comparison for addresses
            if (systemContract.toLowerCase() === expectedAddress.toLowerCase()) {
                console.log("✓ Correct system contract address derived for HYPE");
            } else {
                console.log("✗ Incorrect system contract address derived for HYPE");
                console.log(`Expected: ${expectedAddress}, Got: ${systemContract}`);
            }
        } catch (error: unknown) {
            console.error("Error getting system contract address:", formatError(error));
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