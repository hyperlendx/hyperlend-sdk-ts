import {BigNumber, providers, Signer, utils, Contract} from "ethers";
import {AaveProtocolDataProviderABI__factory, PoolABI__factory, UiPoolDataProviderV3ABI__factory} from "./typechain";

// Minimal ERC20 ABI for token approval
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)"
];

// Define the ReserveData interface to match the method return type
export interface ReserveData {
    symbol: string;
    tokenAddress: string;
    hTokenAddress: string;
    stableDebtTokenAddress: string;
    variableDebtTokenAddress: string;
    decimals: BigNumber;
    ltv: BigNumber;
    liquidationThreshold: BigNumber;
    liquidationBonus: BigNumber;
    reserveFactor: BigNumber;
    usageAsCollateralEnabled: boolean;
    borrowingEnabled: boolean;
    stableBorrowRateEnabled: boolean;
    isActive: boolean;
    isFrozen: boolean;
    availableLiquidity: BigNumber;
    totalStableDebt: BigNumber;
    totalVariableDebt: BigNumber;
    liquidityRate: BigNumber;
    variableBorrowRate: BigNumber;
    stableBorrowRate: BigNumber;
    averageStableBorrowRate: BigNumber;
    liquidityIndex: BigNumber;
    variableBorrowIndex: BigNumber;
    lastUpdateTimestamp: BigNumber;
}

// Enum to define interest rate modes (matches the contract values)
export enum InterestRateMode {
    NONE = 0,
    STABLE = 1,
    VARIABLE = 2
}

export class HyperlendSDKcore {
    private readonly providerOrSigner: providers.Provider | Signer;
    private readonly dataProviderAddress: string;
    private readonly poolAddress: string;
    private readonly uiPoolDataProviderAddress: string;

    constructor(
        providerOrSigner: providers.Provider | Signer,
        dataProviderAddress: string,
        poolAddress: string,
        uiPoolDataProviderAddress: string
    ) {
        this.providerOrSigner = providerOrSigner;
        this.dataProviderAddress = dataProviderAddress;
        this.poolAddress = poolAddress;
        this.uiPoolDataProviderAddress = uiPoolDataProviderAddress;
    }

    /**
     * Check if allowance is sufficient and approve tokens if needed
     * @param tokenAddress The address of the token to approve
     * @param amount The amount to approve
     * @returns Transaction response or null if approval not needed
     */
    public async approveToken(tokenAddress: string, amount: BigNumber): Promise<providers.TransactionResponse> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for token approval");
        }

        const signer = this.providerOrSigner as Signer;
        const signerAddress = await signer.getAddress();

        // Create ERC20 contract instance
        const erc20Contract = new Contract(tokenAddress, ERC20_ABI, signer);

        // Check current allowance
        const currentAllowance = await erc20Contract.allowance(signerAddress, this.poolAddress);

        // If current allowance is less than the amount, approve
        if (currentAllowance.lt(amount)) {
            console.log(`Approving ${amount.toString()} tokens for ${tokenAddress}`);
            // Use MAX_UINT256 for infinite approval, or use the exact amount needed
            const tx = await erc20Contract.approve(this.poolAddress, utils.parseEther("1000000000"));
            await tx.wait(1);
            console.log("Approval transaction confirmed");
            return tx;
        }

        console.log('Token already approved');
        return { hash: '0x0', wait: async () => { return { status: 1 }; } } as providers.TransactionResponse;
    }

    /**
     * Get all reserve tokens
     * @returns Array of token data with symbol and address
     */
    public async getAllReservesTokens(): Promise<{ symbol: string; tokenAddress: string }[]> {
        const dataProviderContract = AaveProtocolDataProviderABI__factory.connect(
            this.dataProviderAddress,
            this.providerOrSigner
        );
        return await dataProviderContract.getAllReservesTokens();
    }

    /**
     * Get all aTokens
     * @returns Array of aToken data with symbol and address
     */
    public async getAllATokens(): Promise<{ symbol: string; tokenAddress: string }[]> {
        const dataProviderContract = AaveProtocolDataProviderABI__factory.connect(
            this.dataProviderAddress,
            this.providerOrSigner
        );
        return await dataProviderContract.getAllATokens();
    }

    /**
     * Get the list of reserve addresses
     * @returns Array of reserve addresses
     */
    public async getReservesList(): Promise<string[]> {
        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            this.providerOrSigner
        );
        return await poolContract.getReservesList();
    }

    /**
     * Get user account data including collateral, debt, and health factor
     * @param userAddress The address of the user
     * @returns User account data
     */
    public async getUserAccountData(userAddress: string): Promise<{
        totalCollateralBase: BigNumber;
        totalDebtBase: BigNumber;
        availableBorrowsBase: BigNumber;
        currentLiquidationThreshold: BigNumber;
        ltv: BigNumber;
        healthFactor: BigNumber;
    }> {
        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            this.providerOrSigner
        );
        return await poolContract.getUserAccountData(userAddress);
    }

    /**
     * Get detailed information about all reserves
     * @param poolAddressProvider The address of the pool address provider
     * @returns Detailed reserves data
     */
    public async getDetailedReservesData(poolAddressProvider: string): Promise<{
        reserves: any[];
        baseCurrencyInfo: any;
    }> {
        const uiPoolDataProviderContract = UiPoolDataProviderV3ABI__factory.connect(
            this.uiPoolDataProviderAddress,
            this.providerOrSigner
        );
        const [reserves, baseCurrencyInfo] = await uiPoolDataProviderContract.getReservesData(poolAddressProvider);
        return {
            reserves,
            baseCurrencyInfo
        };
    }

    /**
     * Get all E-Mode categories
     * @param poolAddressProvider The address of the pool address provider
     * @returns Array of E-Mode categories
     */
    public async getAllEModeCategories(poolAddressProvider: string): Promise<any[]> {
        const uiPoolDataProviderContract = UiPoolDataProviderV3ABI__factory.connect(
            this.uiPoolDataProviderAddress,
            this.providerOrSigner
        );
        return await uiPoolDataProviderContract.getEModes(poolAddressProvider);
    }

    /**
     * Get user reserves data and E-Mode
     * @param poolAddressProvider The address of the pool address provider
     * @param userAddress The address of the user
     * @returns User reserves data and E-Mode
     */
    public async getUserReservesData(poolAddressProvider: string, userAddress: string): Promise<{
        userReserves: any[];
        userEmode: number;
    }> {
        const uiPoolDataProviderContract = UiPoolDataProviderV3ABI__factory.connect(
            this.uiPoolDataProviderAddress,
            this.providerOrSigner
        );
        const [userReserves, userEmode] = await uiPoolDataProviderContract.getUserReservesData(
            poolAddressProvider,
            userAddress
        );
        return {
            userReserves,
            userEmode
        };
    }

    /**
     * Get detailed data for a specific reserve
     * @param assetAddress The address of the reserve asset
     * @returns Detailed reserve data
     */
    public async getReserveData(assetAddress: string): Promise<ReserveData> {
        const dataProviderContract = AaveProtocolDataProviderABI__factory.connect(
            this.dataProviderAddress,
            this.providerOrSigner
        );
        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            this.providerOrSigner
        );

        // Get configuration and token addresses
        const [
            { decimals, ltv, liquidationThreshold, liquidationBonus, reserveFactor, usageAsCollateralEnabled,
                borrowingEnabled, stableBorrowRateEnabled, isActive, isFrozen },
            { aTokenAddress, stableDebtTokenAddress, variableDebtTokenAddress },
            { unbacked, accruedToTreasuryScaled, totalAToken, totalStableDebt, totalVariableDebt, liquidityRate,
                variableBorrowRate, stableBorrowRate, averageStableBorrowRate, liquidityIndex, variableBorrowIndex, lastUpdateTimestamp }
        ] = await Promise.all([
            dataProviderContract.getReserveConfigurationData(assetAddress),
            dataProviderContract.getReserveTokensAddresses(assetAddress),
            dataProviderContract.getReserveData(assetAddress)
        ]);

        // Get symbol for the asset
        const allReserves = await this.getAllReservesTokens();
        const assetInfo = allReserves.find(r => r.tokenAddress.toLowerCase() === assetAddress.toLowerCase());
        const symbol = assetInfo?.symbol || "UNKNOWN";

        return {
            symbol,
            tokenAddress: assetAddress,
            hTokenAddress: aTokenAddress,
            stableDebtTokenAddress,
            variableDebtTokenAddress,
            decimals,
            ltv,
            liquidationThreshold,
            liquidationBonus,
            reserveFactor,
            usageAsCollateralEnabled,
            borrowingEnabled,
            stableBorrowRateEnabled,
            isActive,
            isFrozen,
            availableLiquidity: totalAToken.sub(totalStableDebt).sub(totalVariableDebt),
            totalStableDebt,
            totalVariableDebt,
            liquidityRate,
            variableBorrowRate,
            stableBorrowRate,
            averageStableBorrowRate,
            liquidityIndex,
            variableBorrowIndex,
            lastUpdateTimestamp: BigNumber.from(lastUpdateTimestamp) // Convert to BigNumber if it's a number
        };
    }

    /**
     * Supply assets to the protocol
     * @param asset The address of the asset to supply
     * @param amount The amount to supply
     * @param onBehalfOf Optional: The address that will receive the aTokens (defaults to signer)
     * @param referralCode Optional: Referral code (defaults to 0)
     * @returns Transaction hash
     */
    public async supply(
        asset: string,
        amount: BigNumber,
        onBehalfOf?: string,
        referralCode: number = 0
    ): Promise<{transactionHash: string}> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for supply operation");
        }

        // First, approve the token if needed
        await this.approveToken(asset, amount);

        const signer = this.providerOrSigner as Signer;
        const userAddress = onBehalfOf || await signer.getAddress();

        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            signer
        );

        try {
            const tx = await poolContract.supply(
                asset,
                amount,
                userAddress,
                referralCode
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        } catch (error) {
            // If the transaction still fails, try with a manual gas limit
            console.log("Supply failed, retrying with manual gas limit...");
            const tx = await poolContract.supply(
                asset,
                amount,
                userAddress,
                referralCode,
                { gasLimit: 500000 }
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        }
    }

    /**
     * Borrow assets from the protocol
     */
    public async borrow(
        asset: string,
        amount: BigNumber,
        interestRateMode: InterestRateMode,
        referralCode: number = 0,
        onBehalfOf?: string
    ): Promise<{transactionHash: string}> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for borrow operation");
        }

        const signer = this.providerOrSigner as Signer;
        const userAddress = onBehalfOf || await signer.getAddress();

        // Check borrowing capacity first
        const userData = await this.getUserAccountData(userAddress);

        console.log(`Available borrows: ${utils.formatUnits(userData.availableBorrowsBase, 18)} HYPE`);
        console.log(`Attempting to borrow: ${utils.formatUnits(amount, 18)}`);

        // Simple check without price conversion
        // We'll assume the amount is already in the correct denomination
        if (amount.gt(userData.availableBorrowsBase)) {
            throw new Error(
                `Insufficient borrowing capacity. Available: ${utils.formatUnits(userData.availableBorrowsBase, 18)} HYPE, ` +
                `Requested: ${utils.formatUnits(amount, 18)}`
            );
        }

        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            signer
        );

        try {
            const tx = await poolContract.borrow(
                asset,
                amount,
                interestRateMode,
                referralCode,
                userAddress
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        } catch (error) {
            console.log("Borrow failed, retrying with manual gas limit...");
            const tx = await poolContract.borrow(
                asset,
                amount,
                interestRateMode,
                referralCode,
                userAddress,
                { gasLimit: 500000 }
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        }
    }

    /**
     * Repay a debt on the protocol
     */
    public async repay(
        asset: string,
        amount: BigNumber,
        interestRateMode: InterestRateMode,
        onBehalfOf?: string
    ): Promise<{transactionHash: string}> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for repay operation");
        }

        // First, approve the token if needed
        await this.approveToken(asset, amount);

        const signer = this.providerOrSigner as Signer;
        const userAddress = onBehalfOf || await signer.getAddress();

        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            signer
        );

        try {
            const tx = await poolContract.repay(
                asset,
                amount,
                interestRateMode,
                userAddress
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        } catch (error) {
            console.log("Repay failed, retrying with manual gas limit...");
            const tx = await poolContract.repay(
                asset,
                amount,
                interestRateMode,
                userAddress,
                { gasLimit: 500000 }
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        }
    }

    /**
     * Withdraw assets from the protocol
     */
    public async withdraw(
        asset: string,
        amount: BigNumber,
        to?: string
    ): Promise<{transactionHash: string}> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for withdraw operation");
        }

        const signer = this.providerOrSigner as Signer;
        const recipient = to || await signer.getAddress();

        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            signer
        );

        try {
            const tx = await poolContract.withdraw(
                asset,
                amount,
                recipient
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        } catch (error) {
            console.log("Withdraw failed, retrying with manual gas limit...");
            const tx = await poolContract.withdraw(
                asset,
                amount,
                recipient,
                { gasLimit: 500000 }
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        }
    }

    /**
     * Enable or disable usage of a reserve as collateral
     */
    public async setUserUseReserveAsCollateral(
        asset: string,
        useAsCollateral: boolean
    ): Promise<{transactionHash: string}> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for setUserUseReserveAsCollateral operation");
        }

        const signer = this.providerOrSigner as Signer;

        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            signer
        );

        try {
            const tx = await poolContract.setUserUseReserveAsCollateral(
                asset,
                useAsCollateral
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        } catch (error) {
            console.log("SetUserUseReserveAsCollateral failed, retrying with manual gas limit...");
            const tx = await poolContract.setUserUseReserveAsCollateral(
                asset,
                useAsCollateral,
                { gasLimit: 500000 }
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        }
    }

    /**
     * Set the user's E-Mode category
     */
    public async setUserEMode(categoryId: number): Promise<{transactionHash: string}> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for setUserEMode operation");
        }

        const signer = this.providerOrSigner as Signer;

        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            signer
        );

        try {
            const tx = await poolContract.setUserEMode(categoryId);
            await tx.wait(1);
            return { transactionHash: tx.hash };
        } catch (error) {
            console.log("SetUserEMode failed, retrying with manual gas limit...");
            const tx = await poolContract.setUserEMode(
                categoryId,
                { gasLimit: 500000 }
            );
            await tx.wait(1);
            return { transactionHash: tx.hash };
        }
    }

    /**
     * Get user's current E-Mode category
     * @param userAddress The address of the user
     * @returns E-Mode category ID
     */
    public async getUserEMode(userAddress: string): Promise<number> {
        const poolContract = PoolABI__factory.connect(
            this.poolAddress,
            this.providerOrSigner
        );

        const eMode = await poolContract.getUserEMode(userAddress);
        return eMode.toNumber();
    }

    /**
     * Helper method to check if provider is a signer
     * @param providerOrSigner Provider or signer to check
     * @returns Boolean indicating if it's a signer
     */
    private isSigner(providerOrSigner: providers.Provider | Signer): providerOrSigner is Signer {
        return (providerOrSigner as Signer).signMessage !== undefined;
    }
}