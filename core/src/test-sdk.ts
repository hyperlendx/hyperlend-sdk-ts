import { providers, Wallet, utils } from "ethers";
import { HyperlendSDKcore, InterestRateMode } from "./HyperlendSDKcore";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const RPC_URL = process.env.RPC_URL;
const DATA_PROVIDER_ADDRESS = process.env.DATA_PROVIDER_ADDRESS;
const POOL_ADDRESS = process.env.POOL_ADDRESS;
const UI_POOL_DATA_PROVIDER_ADDRESS = process.env.UI_POOL_DATA_PROVIDER_ADDRESS;
const POOL_ADDRESS_PROVIDER = process.env.POOL_ADDRESS_PROVIDER;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS;

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

// Helper function to wait for transaction confirmation
const waitForTx = async (txHash: string, confirmations = 1) => {
    console.log(`Waiting for transaction ${txHash} to be confirmed...`);
    await provider.waitForTransaction(txHash, confirmations);
    console.log("Transaction confirmed.");
};

// Create SDK instances - one with provider for read-only operations
const sdkReadOnly = new HyperlendSDKcore(
    provider,
    DATA_PROVIDER_ADDRESS,
    POOL_ADDRESS,
    UI_POOL_DATA_PROVIDER_ADDRESS
);

// Create a signer if private key is available (for transaction operations)
let sdkWithSigner: HyperlendSDKcore | undefined;
let wallet: Wallet | undefined;
if (PRIVATE_KEY) {
    wallet = new Wallet(PRIVATE_KEY, provider);
    sdkWithSigner = new HyperlendSDKcore(
        wallet,
        DATA_PROVIDER_ADDRESS,
        POOL_ADDRESS,
        UI_POOL_DATA_PROVIDER_ADDRESS
    );
}

(async () => {
    try {
        console.log("Testing Hyperlend SDK Core...");

        // *** READ-ONLY OPERATIONS ***
        console.log("\n--- READ-ONLY OPERATIONS ---");

        // Get all reserve tokens
        console.log("\nGetting all reserve tokens...");
        const allReserves = await sdkReadOnly.getAllReservesTokens();
        console.log(`Found ${allReserves.length} reserves:`);
        allReserves.forEach(reserve => {
            console.log(`- ${reserve.symbol}: ${reserve.tokenAddress}`);
        });

        // Get all aTokens
        console.log("\nGetting all aTokens...");
        const allATokens = await sdkReadOnly.getAllATokens();
        console.log(`Found ${allATokens.length} aTokens`);

        // Get reserves list
        console.log("\nGetting reserves list...");
        const reservesList = await sdkReadOnly.getReservesList();
        console.log(`Found ${reservesList.length} reserves`);

        // Get user account data (if TEST_USER_ADDRESS is provided)
        if (TEST_USER_ADDRESS) {
            console.log(`\nGetting account data for user: ${TEST_USER_ADDRESS}`);
            const accountData = await sdkReadOnly.getUserAccountData(TEST_USER_ADDRESS);
            console.log("User account data:", {
                totalCollateralETH: utils.formatEther(accountData.totalCollateralBase),
                totalDebtETH: utils.formatEther(accountData.totalDebtBase),
                availableBorrowsETH: utils.formatEther(accountData.availableBorrowsBase),
                currentLiquidationThreshold: accountData.currentLiquidationThreshold.toString(),
                ltv: accountData.ltv.toString(),
                healthFactor: utils.formatEther(accountData.healthFactor)
            });
        }

        // Get detailed reserves data
        if (POOL_ADDRESS_PROVIDER) {
            console.log("\nGetting detailed reserves data...");
            const detailedReservesData = await sdkReadOnly.getDetailedReservesData(POOL_ADDRESS_PROVIDER);
            console.log(`Found ${detailedReservesData.reserves.length} detailed reserves`);

            // Get all E-Mode categories
            console.log("\nGetting all E-Mode categories...");
            const eModes = await sdkReadOnly.getAllEModeCategories(POOL_ADDRESS_PROVIDER);
            console.log(`Found ${eModes.length} E-Mode categories`);
            eModes.forEach(mode => {
                console.log(`- Category ${mode.id}: ${mode.eMode.label}`);
            });

            if (TEST_USER_ADDRESS) {
                console.log(`\nGetting user reserves data for: ${TEST_USER_ADDRESS}`);
                const userReservesData = await sdkReadOnly.getUserReservesData(
                    POOL_ADDRESS_PROVIDER,
                    TEST_USER_ADDRESS
                );
                console.log(`User has ${userReservesData.userReserves.length} active reserves`);
                console.log(`User E-Mode: ${userReservesData.userEmode}`);
            }
        }

        // Get reserve data for the first reserve
        if (allReserves.length > 0) {
            const firstReserve = allReserves[0];
            console.log(`\nGetting detailed data for reserve: ${firstReserve.symbol}`);
            const reserveData = await sdkReadOnly.getReserveData(firstReserve.tokenAddress);
            console.log("Reserve data:", {
                symbol: reserveData.symbol,
                decimals: reserveData.decimals.toString(),
                ltv: reserveData.ltv.toString(),
                liquidationThreshold: reserveData.liquidationThreshold.toString(),
                liquidationBonus: reserveData.liquidationBonus.toString(),
                availableLiquidity: utils.formatUnits(
                    reserveData.availableLiquidity,
                    reserveData.decimals.toNumber()
                ),
                totalStableDebt: utils.formatUnits(
                    reserveData.totalStableDebt,
                    reserveData.decimals.toNumber()
                ),
                totalVariableDebt: utils.formatUnits(
                    reserveData.totalVariableDebt,
                    reserveData.decimals.toNumber()
                ),
                borrowingEnabled: reserveData.borrowingEnabled,
                usageAsCollateralEnabled: reserveData.usageAsCollateralEnabled
            });
        }

        // *** TRANSACTION OPERATIONS (ONLY RUN IF SIGNER IS AVAILABLE) ***
        if (sdkWithSigner && allReserves.length > 0) {
            console.log("\n--- TRANSACTION OPERATIONS ---");

            // Get the first reserve for testing
            const testReserve = allReserves[0];
            console.log(`Using ${testReserve.symbol} (${testReserve.tokenAddress}) for testing`);

            // Test supply with proper decimal handling
            console.log("\nSupplying assets...");
            const reserveData = await sdkReadOnly.getReserveData(testReserve.tokenAddress);
            const decimals = reserveData.decimals?.toNumber() || 18; // Default to 18 if not available
            const supplyAmount = utils.parseUnits("0.05", decimals);
            const supplyTx = await sdkWithSigner.supply(
                testReserve.tokenAddress,
                supplyAmount
            );
            console.log(`Supply transaction completed: ${supplyTx.transactionHash}`);
            await waitForTx(supplyTx.transactionHash);

            // Verify the user's updated position after supply
            if (POOL_ADDRESS_PROVIDER && wallet) {
                const userAddress = await wallet.getAddress();
                const userReservesAfterSupply = await sdkReadOnly.getUserReservesData(
                    POOL_ADDRESS_PROVIDER,
                    userAddress
                );
                console.log("User position after supply:",
                    userReservesAfterSupply.userReserves
                        .filter(r => r.underlyingAsset.toLowerCase() === testReserve.tokenAddress.toLowerCase())
                        .map(r => ({
                            asset: r.underlyingAsset,
                            aTokenBalance: r.scaledATokenBalance.toString(),
                            isCollateral: r.usageAsCollateralEnabledOnUser
                        }))
                );
            }

            // Test borrow with proper decimal handling
            console.log("\nBorrowing assets...");
            const borrowAmount = utils.parseUnits("0.0000000000005", decimals);
            const borrowTx = await sdkWithSigner.borrow(
                testReserve.tokenAddress,
                borrowAmount,
                InterestRateMode.VARIABLE
            );
            console.log(`Borrow transaction completed: ${borrowTx.transactionHash}`);
            await waitForTx(borrowTx.transactionHash);

            // Test repay with proper decimal handling
            console.log("\nRepaying debt...");
            const repayAmount = utils.parseUnits("0.0000000000005", decimals);
            const repayTx = await sdkWithSigner.repay(
                testReserve.tokenAddress,
                repayAmount,
                InterestRateMode.VARIABLE
            );
            console.log(`Repay transaction completed: ${repayTx.transactionHash}`);
            await waitForTx(repayTx.transactionHash);

            // Test withdraw with proper decimal handling
            console.log("\nWithdrawing assets...");
            const withdrawAmount = utils.parseUnits("0.001", decimals);
            const withdrawTx = await sdkWithSigner.withdraw(
                testReserve.tokenAddress,
                withdrawAmount
            );
            console.log(`Withdraw transaction completed: ${withdrawTx.transactionHash}`);
            await waitForTx(withdrawTx.transactionHash);

            // Test setting collateral
            console.log("\nSetting collateral usage...");
            const collateralTx = await sdkWithSigner.setUserUseReserveAsCollateral(
                testReserve.tokenAddress,
                true // Enable as collateral
            );
            console.log(`Set collateral transaction completed: ${collateralTx.transactionHash}`);
            await waitForTx(collateralTx.transactionHash);

            // Enhanced E-Mode testing
            console.log("\nTesting E-Mode categories...");
            const eModes = await sdkReadOnly.getAllEModeCategories(POOL_ADDRESS_PROVIDER!);

            if (eModes.length > 1) { // At least one category beyond the default
                // Test setting to first non-zero category
                const categoryId = eModes[1].id;
                console.log(`Setting E-Mode to category ${categoryId} (${eModes[1].eMode.label})...`);
                const setEModeTx = await sdkWithSigner.setUserEMode(categoryId);
                console.log(`Set E-Mode transaction completed: ${setEModeTx.transactionHash}`);
                await waitForTx(setEModeTx.transactionHash);

                // Verify the E-Mode setting
                if (wallet) {
                    try {
                        const userAddress = await wallet.getAddress();
                        const currentEMode = await sdkReadOnly.getUserEMode(userAddress);
                        console.log(`Current E-Mode: ${currentEMode} (should be ${categoryId})`);
                    } catch (error) {
                        console.error("Error checking E-Mode:", error);
                    }
                }
            }

            // Reset to normal mode
            console.log("\nResetting E-Mode to normal mode (0)...");
            const resetEModeTx = await sdkWithSigner.setUserEMode(0);
            console.log(`Reset E-Mode transaction completed: ${resetEModeTx.transactionHash}`);
            await waitForTx(resetEModeTx.transactionHash);
        } else {
            console.log("\nSkipping transaction tests - no signer available");
        }

        console.log("\nSDK test completed successfully!");

    } catch (error) {
        console.error("Error testing SDK:", error);
    }
})();