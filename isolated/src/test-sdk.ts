import { ethers } from 'ethers';
import { HyperlendSDK } from './HyperlendSDK';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment variables
const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS!;
const PAIR_ADDRESS = process.env.PAIR_ADDRESS!;
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS!;

async function main() {
    console.log('Starting Hyperlend SDK tests...');
    console.log('----------------------------------');

    // Validate environment variables
    validateEnvironmentVariables();

    // Setup provider, wallet and SDK
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`Using wallet address: ${wallet.address}`);

    const sdk = new HyperlendSDK(wallet, REGISTRY_ADDRESS);
    console.log(`SDK initialized with registry: ${REGISTRY_ADDRESS}`);
    console.log('----------------------------------');

    try {
        // Test registry functions
        await testRegistryFunctions(sdk, wallet);

        // Test read functions - now we need to handle the returned data
        console.log('Testing Read Functions:');
        const pairData = await sdk.readPairData(PAIR_ADDRESS);
        console.log('Pair Data:', {
            asset: pairData.asset,
            collateral: pairData.collateral,
            maxLTV: pairData.maxLTV.toString(),
            totalAssetAmount: pairData.formattedTotalAssetAmount,
            totalBorrowAmount: pairData.formattedTotalBorrowAmount,
            totalCollateral: pairData.formattedTotalCollateral,
            assetSymbol: pairData.assetSymbol,
            collateralSymbol: pairData.collateralSymbol
        });

        const userPosition = await sdk.readUserPosition(PAIR_ADDRESS, TEST_USER_ADDRESS);
        console.log('User Position:', {
            collateralBalance: userPosition.formattedCollateralBalance,
            borrowShares: userPosition.formattedBorrowShares,
            liquidationPrice: userPosition.formattedLiquidationPrice
        });

        const totalAsset = await sdk.getTotalAsset(PAIR_ADDRESS);
        console.log('Total Asset:', totalAsset.formatted, totalAsset.symbol);

        const totalBorrow = await sdk.getTotalBorrow(PAIR_ADDRESS);
        console.log('Total Borrow:', totalBorrow.formatted, totalBorrow.symbol);
        console.log('----------------------------------');

        // Test user positions in detail with custom formatting
        await testUserPositions(sdk);

        // Set smaller test amounts
        const smallerSupplyAmount = ethers.utils.parseEther("0.1");  // 0.1 WETH
        const smallerCollateralAmount = ethers.utils.parseEther("0.5"); // 0.5 stTESTH
        const smallerBorrowAmount = ethers.utils.parseEther("0.05"); // 0.05 WETH

        // Test transaction flow with smaller amounts
        await testTransactionFlow(sdk, wallet, smallerSupplyAmount, smallerCollateralAmount, smallerBorrowAmount);

    } catch (error) {
        console.error('Test failed with error:', error instanceof Error ? error.message : String(error));
    }
}

function validateEnvironmentVariables() {
    const requiredVars = {
        RPC_URL,
        PRIVATE_KEY,
        REGISTRY_ADDRESS,
        PAIR_ADDRESS,
        TEST_USER_ADDRESS
    };

    const missing = Object.entries(requiredVars)
        .filter(([_, value]) => !value)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (!ethers.utils.isAddress(REGISTRY_ADDRESS)) {
        throw new Error(`Invalid registry address: ${REGISTRY_ADDRESS}`);
    }

    if (!ethers.utils.isAddress(PAIR_ADDRESS)) {
        throw new Error(`Invalid pair address: ${PAIR_ADDRESS}`);
    }

    if (!ethers.utils.isAddress(TEST_USER_ADDRESS)) {
        throw new Error(`Invalid test user address: ${TEST_USER_ADDRESS}`);
    }
}

async function testRegistryFunctions(sdk: HyperlendSDK, wallet: ethers.Wallet) {
    console.log('Testing Registry Functions:');

    // Get deployed pairs length
    const length = await sdk.getDeployedPairsLength();
    console.log(`- Deployed pairs length: ${length.toString()}`);

    // Get all pair addresses
    const pairAddresses = await sdk.getAllPairAddresses();
    console.log(`- Found ${pairAddresses.length} deployed pairs`);
    if (pairAddresses.length > 0) {
        console.log(`  First pair: ${pairAddresses[0]}`);
    }

    if (pairAddresses.length > 1) {
        console.log(`  Second pair: ${pairAddresses[1]}`);
    }

    // Check if the wallet is a deployer
    const isDeployer = await sdk.isDeployer(wallet.address);
    console.log(`- Is wallet a deployer? ${isDeployer}`);

    // Try to get a pair by name - this might fail if no such pair exists
    try {
        const testPairName = "TestPair";
        const pairAddress = await sdk.getPairAddressByName(testPairName);
        console.log(`- Pair address for name "${testPairName}": ${pairAddress}`);
    } catch (error) {
        console.log(`- No pair found with name "TestPair" or function failed`);
    }

    console.log('----------------------------------');
}

async function testUserPositions(sdk: HyperlendSDK) {
    console.log('Testing User Position Metrics (custom format):');

    try {
        // Get basic user position data
        const userPosition = await sdk.readUserPosition(PAIR_ADDRESS, TEST_USER_ADDRESS);
        const pairData = await sdk.readPairData(PAIR_ADDRESS);

        // Use the formatted data from the SDK response
        console.log('\nUser Position Metrics:');
        console.log(`- Address: ${TEST_USER_ADDRESS}`);
        console.log(`- Collateral: ${userPosition.formattedCollateralBalance} ${userPosition.collateralSymbol}`);
        console.log(`- Borrow Shares: ${userPosition.formattedBorrowShares} ${userPosition.assetSymbol}`);
        console.log(`- Max LTV: ${(pairData.maxLTV.toNumber() / 100000 * 100).toFixed(2)}%`);

        // Calculate borrow capacity based on max LTV
        const maxLTV = pairData.maxLTV.toNumber() / 100000; // Convert from basis points format
        const borrowCapacity = userPosition.userCollateralBalance
            .mul(Math.floor(maxLTV * 1e5))
            .div(1e5);

        console.log(`- Borrow Capacity: ~${ethers.utils.formatUnits(borrowCapacity, 18)} ${userPosition.assetSymbol}`);

        // Position health metrics
        if (!userPosition.userCollateralBalance.isZero() || !userPosition.userBorrowShares.isZero()) {
            console.log('\nPosition Health:');

            if (!userPosition.liquidationPrice.isZero() && !userPosition.userCollateralBalance.isZero()) {
                console.log(`- Liquidation Price: ${userPosition.formattedLiquidationPrice} ${userPosition.assetSymbol}/${userPosition.collateralSymbol}`);

                // Calculate remaining buffer before liquidation
                const totalCollateralValue = userPosition.userCollateralBalance.mul(ethers.utils.parseUnits("1", 18));
                const totalDebtValue = userPosition.userBorrowShares.mul(userPosition.liquidationPrice);

                if (!totalCollateralValue.isZero()) {
                    const utilizationRatio = totalDebtValue.mul(100).div(totalCollateralValue);
                    console.log(`- Collateral Utilization: ~${ethers.utils.formatUnits(utilizationRatio, 0)}%`);
                    console.log(`- Buffer Remaining: ~${(100 - Number(ethers.utils.formatUnits(utilizationRatio, 0))).toFixed(0)}%`);
                }
            } else {
                console.log("- No liquidation price available (user may not have debt)");
            }
        } else {
            console.log("- No active position");
        }

    } catch (error) {
        console.error(`Failed to read position details: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('----------------------------------');
}

async function testTransactionFlow(
    sdk: HyperlendSDK,
    wallet: ethers.Wallet,
    supplyAmount: ethers.BigNumber,
    collateralAmount: ethers.BigNumber,
    borrowAmount: ethers.BigNumber
) {
    console.log('Testing Transaction Flow:');

    // Get token information from the SDK
    const pairData = await sdk.readPairData(PAIR_ADDRESS);
    const assetSymbol = pairData.assetSymbol;
    const collateralSymbol = pairData.collateralSymbol;

    let supplySuccess = false;
    let addCollateralSuccess = false;
    let borrowSuccess = false;

    // Step 1: Supply assets
    try {
        console.log(`\nStep 1: Supplying ${ethers.utils.formatEther(supplyAmount)} ${assetSymbol} to the pair...`);
        const supplyResult = await sdk.supply(PAIR_ADDRESS, supplyAmount, wallet.address, true);
        console.log(`- Supply successful: ${supplyResult.amount} ${supplyResult.symbol}`);
        console.log(`- Transaction hash: ${supplyResult.transactionHash}`);
        supplySuccess = true;
    } catch (error) {
        console.log(`- Supply failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 2: Add collateral
    try {
        console.log(`\nStep 2: Adding ${ethers.utils.formatEther(collateralAmount)} ${collateralSymbol} collateral...`);
        const addCollateralResult = await sdk.addCollateral(PAIR_ADDRESS, collateralAmount, wallet.address, true);
        console.log(`- Add collateral successful: ${addCollateralResult.amount} ${addCollateralResult.symbol}`);
        console.log(`- Transaction hash: ${addCollateralResult.transactionHash}`);
        addCollateralSuccess = true;
    } catch (error) {
        console.log(`- Add collateral failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 3: Borrow assets after collateral has already been added
    if (addCollateralSuccess) {
        try {
            console.log(`\nStep 3: Borrowing ${ethers.utils.formatEther(borrowAmount)} ${assetSymbol}...`);

            // Collateral already exists, so pass zero as collateralAmount
            const borrowResult = await sdk.borrow(
                PAIR_ADDRESS,
                borrowAmount,
                ethers.constants.Zero,
                wallet.address,
                {
                    gasLimit: 2000000,
                    autoApprove: true
                }
            );

            console.log(`- Borrow successful: ${borrowResult.amount} ${borrowResult.symbol}`);
            console.log(`- Transaction hash: ${borrowResult.transactionHash}`);
            borrowSuccess = true;
        } catch (error) {
            console.log(`- Borrow failed: ${error instanceof Error ? error.message : String(error)}`);

            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('oracle') || errorMsg.includes('price')) {
                console.log("\nNOTE: Oracle validation errors are expected in test mode.");
                console.log("The contract requires a valid oracle price and has no bypass mechanism.");
                console.log("Consider deploying a test oracle with fixed prices for testing.");
            }
        }
    }

    // Check user position after borrowing
    console.log("\nChecking user position after transactions:");
    try {
        const userPosition = await sdk.readUserPosition(PAIR_ADDRESS, wallet.address);
        console.log(`- Collateral Balance: ${userPosition.formattedCollateralBalance} ${userPosition.collateralSymbol}`);
        console.log(`- Borrow Shares: ${userPosition.formattedBorrowShares} ${userPosition.assetSymbol}`);

        // Step 4: Repay (only if there are borrow shares)
        if (!userPosition.userBorrowShares.isZero()) {
            try {
                // Repay half of the borrow
                const repayAmount = userPosition.userBorrowShares.div(2);
                console.log(`\nStep 4: Repaying ${ethers.utils.formatEther(repayAmount)} ${assetSymbol} borrow shares...`);
                const repayResult = await sdk.repay(PAIR_ADDRESS, repayAmount, wallet.address, true);
                console.log(`- Repay successful: ${repayResult.amount} ${repayResult.symbol}`);
                console.log(`- Transaction hash: ${repayResult.transactionHash}`);
            } catch (error) {
                console.log(`- Repay failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            console.log("\nSkipping repay step as user has no borrow shares.");
        }

        // Step 5: Remove collateral (only if there is collateral)
        if (!userPosition.userCollateralBalance.isZero()) {
            try {
                // Remove half of the collateral
                const removeAmount = userPosition.userCollateralBalance.div(2);
                console.log(`\nStep 5: Removing ${ethers.utils.formatEther(removeAmount)} ${userPosition.collateralSymbol} collateral...`);
                const removeResult = await sdk.removeCollateral(PAIR_ADDRESS, removeAmount, wallet.address);
                console.log(`- Remove collateral successful: ${removeResult.amount} ${removeResult.symbol}`);
                console.log(`- Transaction hash: ${removeResult.transactionHash}`);
            } catch (error) {
                console.log(`- Remove collateral failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            console.log("\nSkipping remove collateral step as user has no collateral.");
        }
    } catch (error) {
        console.error(`- Failed to read user position: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 6: Withdraw assets (only if supply succeeded)
    if (supplySuccess) {
        try {
            // Withdraw 10% of what was supplied to avoid issues
            const withdrawAmount = supplyAmount.div(10);
            console.log(`\nStep 6: Withdrawing ${ethers.utils.formatEther(withdrawAmount)} ${assetSymbol} shares...`);
            const withdrawResult = await sdk.withdraw(PAIR_ADDRESS, withdrawAmount, wallet.address);
            console.log(`- Withdraw successful: ${withdrawResult.amount} ${withdrawResult.symbol}`);
            console.log(`- Transaction hash: ${withdrawResult.transactionHash}`);
        } catch (error) {
            console.log(`- Withdraw failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    } else {
        console.log("\nSkipping withdraw step due to failed supply.");
    }

    console.log('\nAll transaction tests completed.');
}

// Execute the main function
(async () => {
    try {
        await main();
    } catch (error) {
        console.error('Fatal error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
})();
