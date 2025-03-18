import { providers } from "ethers";
import { HyperlendSDKcore } from "./HyperlendSDKcore";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Make sure to use a valid RPC URL in your .env file
const RPC_URL = process.env.RPC_URL;

// Check if RPC_URL is provided
if (!RPC_URL) {
    console.error("Error: RPC_URL is not defined in the .env file");
    process.exit(1);
}

const DATA_PROVIDER_ADDRESS = process.env.DATA_PROVIDER_ADDRESS;

// Check if DATA_PROVIDER_ADDRESS is provided
if (!DATA_PROVIDER_ADDRESS) {
    console.error("Error: DATA_PROVIDER_ADDRESS is not defined in the .env file");
    process.exit(1);
}

// Create provider with explicit network configuration to avoid ENS issues
const provider = new providers.JsonRpcProvider({
    url: RPC_URL,
    skipFetchSetup: false
});

const sdk = new HyperlendSDKcore(provider, DATA_PROVIDER_ADDRESS);

(async () => {
    try {
        // First check if the provider is connected
        await provider.ready;
        console.log("Connected to network:", (await provider.getNetwork()).name);

        console.log("Fetching all reserves tokens...");
        const reserves = await sdk.getAllReservesTokens();
        console.log("All Reserves:", reserves);

        console.log("Fetching all reserves data...");
        const reservesData = await sdk.getAllReservesData();

        // Format BigNumber values as strings for display
        console.log("All Reserves Data:", reservesData.map(data => ({
            symbol: data.symbol,
            tokenAddress: data.tokenAddress,
            hTokenAddress: data.hTokenAddress,
            ltv: data.ltv,
            liquidationThreshold: data.liquidationThreshold,
            borrowingEnabled: data.borrowingEnabled,
            isActive: data.isActive,

            // Convert BigNumber values to strings for display
            availableLiquidity: data.availableLiquidity?.toString() || "0",
            totalStableDebt: data.totalStableDebt?.toString() || "0",
            totalVariableDebt: data.totalVariableDebt?.toString() || "0",
            liquidityRate: data.liquidityRate?.toString() || "0",
            variableBorrowRate: data.variableBorrowRate?.toString() || "0",
            stableBorrowRate: data.stableBorrowRate?.toString() || "0"
        })));
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error:", error.message);

            // Type guard for ethers provider errors
            const ethersError = error as { code?: string; operation?: string };
            if (ethersError.code === "UNSUPPORTED_OPERATION" &&
                ethersError.operation === "getResolver") {
                console.error("Network connection issue: Make sure you're using a valid RPC URL");
            }
        } else {
            console.error("Unknown error occurred:", error);
        }
    }
})();