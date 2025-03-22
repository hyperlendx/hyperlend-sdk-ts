import { providers } from "ethers";
import { HyperlendSDKcore } from "./HyperlendSDKcore";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL;
const DATA_PROVIDER_ADDRESS = process.env.DATA_PROVIDER_ADDRESS;
const POOL_ADDRESS = process.env.POOL_ADDRESS;
const UI_POOL_DATA_PROVIDER_ADDRESS = process.env.UI_POOL_DATA_PROVIDER_ADDRESS;
const POOL_ADDRESS_PROVIDER = process.env.POOL_ADDRESS_PROVIDER;

// Check if required environment variables are provided
if (!RPC_URL || !DATA_PROVIDER_ADDRESS || !POOL_ADDRESS || !UI_POOL_DATA_PROVIDER_ADDRESS) {
    console.error("Error: Missing required environment variables");
    process.exit(1);
}

// Create provider
const provider = new providers.JsonRpcProvider({
    url: RPC_URL,
    skipFetchSetup: false
});

const sdk = new HyperlendSDKcore(
    provider,
    DATA_PROVIDER_ADDRESS,
    POOL_ADDRESS,
    UI_POOL_DATA_PROVIDER_ADDRESS
);

(async () => {
    try {
        // First check if the provider is connected
        await provider.ready;
        console.log("Connected to network:", (await provider.getNetwork()).name);

        // Display reserves list
        console.log("\n--- Reserves List ---");
        const reservesList = await sdk.getReservesList();
        console.log(reservesList);

        // Display all reserves tokens
        console.log("\n--- All Reserves Tokens ---");
        const reservesTokens = await sdk.getAllReservesTokens();
        console.log(reservesTokens);

        // Display all aTokens
        console.log("\n--- All aTokens ---");
        const aTokens = await sdk.getAllATokens();
        console.log(aTokens);

        if (POOL_ADDRESS_PROVIDER) {
            // Get and display detailed reserves data
            console.log("\n--- Detailed Reserves Data ---");
            const detailedData = await sdk.getDetailedReservesData(POOL_ADDRESS_PROVIDER);
            console.log("Base Currency Info:", detailedData.baseCurrencyInfo);
            console.log("Reserves Data:");
            detailedData.reserves.forEach(reserve => {
                console.log({
                    symbol: reserve.symbol,
                    ltv: reserve.baseLTVasCollateral.toString(),
                    liquidationThreshold: reserve.reserveLiquidationThreshold.toString(),
                    liquidityRate: reserve.liquidityRate.toString(),
                    variableBorrowRate: reserve.variableBorrowRate.toString(),
                    availableLiquidity: reserve.availableLiquidity.toString()
                });
            });
        }

        // If you have a test user address
        if (process.env.TEST_USER_ADDRESS && POOL_ADDRESS_PROVIDER) {
            console.log("\n--- User Account Data ---");
            const userData = await sdk.getUserAccountData(process.env.TEST_USER_ADDRESS);
            console.log({
                totalCollateral: userData.totalCollateralBase.toString(),
                totalDebt: userData.totalDebtBase.toString(),
                availableBorrows: userData.availableBorrowsBase.toString(),
                healthFactor: userData.healthFactor.toString()
            });

            console.log("\n--- User Reserves Data ---");
            const userReservesData = await sdk.getUserReservesData(
                POOL_ADDRESS_PROVIDER,
                process.env.TEST_USER_ADDRESS
            );
            console.log(userReservesData);
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error("Error:", error.message);
        } else {
            console.error("Unknown error occurred:", error);
        }
    }
})();