import { ethers } from 'ethers';
import { HyperlendPairRegistry } from './types';
import { HyperlendPairRegistry__factory } from './types';
import { HyperlendPair } from './types';
import { HyperlendPair__factory } from './types';

export interface TransactionResult {
    success: boolean;
    transactionHash: string;
    blockNumber: number;
    amount: string;
    symbol: string;
    collateral?: string;
    collateralSymbol?: string;
}

export interface UserPosition {
    userCollateralBalance: ethers.BigNumber;
    userBorrowShares: ethers.BigNumber;
    liquidationPrice: ethers.BigNumber;
    formattedCollateralBalance: string;
    formattedBorrowShares: string;
    formattedLiquidationPrice: string;
    collateralSymbol: string;
    assetSymbol: string;
}

// Updated to match the actual contract return type
export interface PairData {
    asset: string;
    collateral: string;
    maxLTV: ethers.BigNumber;
    cleanLiquidationFee: ethers.BigNumber;
    dirtyLiquidationFee: ethers.BigNumber;
    protocolLiquidationFee: ethers.BigNumber;
    totalAssetAmount: ethers.BigNumber;
    totalBorrowAmount: ethers.BigNumber;
    totalCollateral: ethers.BigNumber;
    currentRateInfo: {
        lastBlock: number;
        feeToProtocolRate: number;
        lastTimestamp: ethers.BigNumber;
        ratePerSec: ethers.BigNumber;
        fullUtilizationRate: ethers.BigNumber;
    };
    formattedTotalAssetAmount: string;
    formattedTotalBorrowAmount: string;
    formattedTotalCollateral: string;
    assetSymbol: string;
    collateralSymbol: string;
}

export interface ApprovalResult {
    approved: boolean;
    transactionHash?: string;
    amount: string;
    symbol: string;
}

export class HyperlendSDK {
    private registry: HyperlendPairRegistry;
    private providerOrSigner: ethers.providers.Provider | ethers.Signer;

    constructor(
        providerOrSigner: ethers.providers.Provider | ethers.Signer,
        registryAddress: string
    ) {
        this.providerOrSigner = providerOrSigner;
        const factory = new HyperlendPairRegistry__factory();
        this.registry = factory.attach(registryAddress);
        if (ethers.Signer.isSigner(providerOrSigner)) {
            this.registry = this.registry.connect(providerOrSigner);
        }
    }

    // ===============================
    // Helper Methods
    // ===============================

    /**
     * Helper method to get token information (decimals and symbol)
     * @param tokenAddress Address of the token contract
     * @returns Object containing decimals and symbol
     */
    private async getTokenInfo(tokenAddress: string): Promise<{ decimals: number, symbol: string }> {
        try {
            const tokenContract = this.getTokenContract(tokenAddress);
            const [decimals, symbol] = await Promise.all([
                tokenContract.decimals(),
                tokenContract.symbol()
            ]);
            return { decimals, symbol };
        } catch (error) {
            return { decimals: 18, symbol: "Unknown" };
        }
    }

    /**
     * Helper to format token amounts with proper decimals
     * @param amount The amount to format
     * @param decimals Number of decimals (defaults to 18)
     * @param symbol Optional token symbol to append
     * @returns Formatted string
     */
    private formatTokenAmount(amount: ethers.BigNumber, decimals: number = 18, symbol?: string): string {
        const formatted = ethers.utils.formatUnits(amount, decimals);
        return symbol ? `${formatted} ${symbol}` : formatted;
    }

    /**
     * Helper to create a token contract instance with common methods
     * @param tokenAddress The token address
     * @param includeApprovalMethods Whether to include approval methods
     * @returns Contract instance
     */
    private getTokenContract(tokenAddress: string, includeApprovalMethods: boolean = false): ethers.Contract {
        const methods = [
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)",
            "function balanceOf(address) external view returns (uint256)"
        ];

        if (includeApprovalMethods) {
            methods.push(
                "function allowance(address owner, address spender) external view returns (uint256)",
                "function approve(address spender, uint256 amount) external returns (bool)"
            );
        }

        return new ethers.Contract(tokenAddress, methods, this.providerOrSigner);
    }

    /**
     * Gets the address of the current signer
     * @returns The signer's address
     */
    private async getSignerAddress(): Promise<string> {
        if (!ethers.Signer.isSigner(this.providerOrSigner)) {
            throw new Error("A signer is required for this operation");
        }
        return await this.providerOrSigner.getAddress();
    }

    /**
     * Helper to approve tokens if needed
     */
    private async approveTokenIfNeeded(
        tokenAddress: string,
        spender: string,
        amount: ethers.BigNumber,
        autoApprove: boolean
    ): Promise<ApprovalResult> {
        const tokenContract = this.getTokenContract(tokenAddress, true);
        const tokenInfo = await this.getTokenInfo(tokenAddress);
        const allowance = await tokenContract.allowance(await this.getSignerAddress(), spender);

        if (allowance.lt(amount)) {
            if (!autoApprove) {
                throw new Error(`Insufficient allowance. Approve tokens manually or set autoApprove=true.`);
            }

            // Estimate gas for approval
            let approvalGasLimit: number;
            try {
                const approvalGasEstimate = await tokenContract.estimateGas.approve(spender, amount);
                approvalGasLimit = Math.ceil(approvalGasEstimate.toNumber() * 1.2); // Add 20% buffer
            } catch (error) {
                approvalGasLimit = 50000;
            }

            const tx = await tokenContract.approve(spender, amount, { gasLimit: approvalGasLimit });
            await tx.wait();

            return {
                approved: true,
                transactionHash: tx.hash,
                amount: this.formatTokenAmount(amount, tokenInfo.decimals),
                symbol: tokenInfo.symbol
            };
        }

        return {
            approved: false,
            amount: this.formatTokenAmount(amount, tokenInfo.decimals),
            symbol: tokenInfo.symbol
        };
    }

    /**
     * Helper to estimate gas with a buffer
     * Fixed to handle BigNumber directly
     */
    private async estimateGasWithBuffer(
        transaction: () => Promise<ethers.BigNumber>,
        bufferMultiplier: number = 1.2
    ): Promise<number> {
        try {
            const gasEstimate = await transaction();
            return Math.ceil(gasEstimate.toNumber() * bufferMultiplier);
        } catch (error) {
            return 300000; // Default fallback gas limit
        }
    }

    /**
     * Handles errors gracefully by decoding them.
     * @param error The error object.
     * @returns A string representation of the error.
     */
    private handleError(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }

    /**
     * Utility function to validate Ethereum addresses.
     * @param address The address to validate.
     * @returns True if the address is valid, false otherwise.
     */
    private isValidAddress(address: string): boolean {
        return ethers.utils.isAddress(address);
    }

    /**
     * Handle transaction errors by decoding them.
     * @param error The error object.
     */
    private handleTransactionError(error: any): never {
        if (error.code === ethers.errors.CALL_EXCEPTION) {
            throw new Error(`Transaction failed: ${error.reason || error.message}`);
        } else {
            throw error;
        }
    }

    /**
     * Retrieves a specific pair contract instance.
     * @param pairAddress Address of the pair contract.
     * @returns Instance of the HyperlendPair contract.
     */
    private async getPairContract(pairAddress: string): Promise<HyperlendPair> {
        try {
            const factory = new HyperlendPair__factory();
            const pair = factory.attach(pairAddress);
            if (ethers.Signer.isSigner(this.providerOrSigner)) {
                return pair.connect(this.providerOrSigner);
            }
            return pair;
        } catch (error) {
            throw new Error(`Failed to get pair contract: ${this.handleError(error)}`);
        }
    }

    // ===============================
    // Pair Registry Functions
    // ===============================

    async getDeployedPairsLength(): Promise<ethers.BigNumber> {
        return await this.registry.deployedPairsLength();
    }

    async getAllPairAddresses(): Promise<string[]> {
        return await this.registry.getAllPairAddresses();
    }

    async addPair(pairAddress: string, signer: ethers.Signer, overrides?: ethers.Overrides): Promise<{transactionHash: string}> {
        if (!ethers.Signer.isSigner(signer)) {
            throw new Error('A valid Signer is required to add a pair.');
        }
        if (!this.isValidAddress(pairAddress)) {
            throw new Error('Invalid Ethereum address provided for pairAddress.');
        }
        const contractWithSigner = this.registry.connect(signer);
        try {
            const tx = await contractWithSigner.addPair(pairAddress, overrides || {});
            await tx.wait();
            return { transactionHash: tx.hash };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    async setDeployers(deployers: string[], allow: boolean, signer: ethers.Signer, overrides?: ethers.Overrides): Promise<{transactionHash: string}> {
        if (!ethers.Signer.isSigner(signer)) {
            throw new Error('A valid Signer is required to set deployers.');
        }
        if (!deployers.every(this.isValidAddress)) {
            throw new Error('One or more invalid Ethereum addresses provided in deployers.');
        }
        const contractWithSigner = this.registry.connect(signer);
        try {
            const tx = await contractWithSigner.setDeployers(deployers, allow, overrides || {});
            await tx.wait();
            return { transactionHash: tx.hash };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    async isDeployer(deployer: string): Promise<boolean> {
        if (!this.isValidAddress(deployer)) {
            throw new Error('Invalid Ethereum address provided for deployer.');
        }
        return await this.registry.deployers(deployer);
    }

    async getPairAddressByName(name: string): Promise<string> {
        if (!name) {
            throw new Error('Name must be provided.');
        }
        return await this.registry.deployedPairsByName(name);
    }

    // ===============================
    // Read Pair Data
    // ===============================

    /**
     * Reads detailed data about a lending pair.
     * @param pairAddress Address of the pair contract.
     * @returns Pair data including asset, collateral, LTV, fees, total assets, total borrows, etc.
     */
    async readPairData(pairAddress: string): Promise<PairData> {
        try {
            const pair = await this.getPairContract(pairAddress);

            const [
                asset,
                collateral,
                maxLTV,
                cleanLiquidationFee,
                dirtyLiquidationFee,
                protocolLiquidationFee,
                totalAssetAmount,
                totalBorrowAmount,
                totalCollateral,
                currentRateInfo,
            ] = await Promise.all([
                pair.asset(),
                pair.collateralContract(),
                pair.maxLTV(),
                pair.cleanLiquidationFee(),
                pair.dirtyLiquidationFee(),
                pair.protocolLiquidationFee(),
                pair.totalAssets(),
                pair.totalBorrow().then((borrow) => borrow.amount),
                pair.totalCollateral(),
                pair.currentRateInfo(),
            ]);

            // Get token information
            const assetInfo = await this.getTokenInfo(asset);
            const collateralInfo = await this.getTokenInfo(collateral);

            return {
                asset,
                collateral,
                maxLTV,
                cleanLiquidationFee,
                dirtyLiquidationFee,
                protocolLiquidationFee,
                totalAssetAmount,
                totalBorrowAmount,
                totalCollateral,
                currentRateInfo, // Now matches the actual contract return type
                formattedTotalAssetAmount: this.formatTokenAmount(totalAssetAmount, assetInfo.decimals),
                formattedTotalBorrowAmount: this.formatTokenAmount(totalBorrowAmount, assetInfo.decimals),
                formattedTotalCollateral: this.formatTokenAmount(totalCollateral, collateralInfo.decimals),
                assetSymbol: assetInfo.symbol,
                collateralSymbol: collateralInfo.symbol
            };
        } catch (error) {
            throw new Error(`Failed to read pair data: ${this.handleError(error)}`);
        }
    }

    // ===============================
    // Read User Position
    // ===============================

    /**
     * Reads a user's position in a specific pair.
     * @param pairAddress Address of the pair contract.
     * @param userAddress Address of the user.
     * @returns User's collateral balance, borrowed shares, liquidation price, etc.
     */
    async readUserPosition(pairAddress: string, userAddress: string): Promise<UserPosition> {
        try {
            const pair = await this.getPairContract(pairAddress);

            // Get asset and collateral token information
            const [assetTokenAddress, collateralTokenAddress] = await Promise.all([
                pair.asset(),
                pair.collateralContract()
            ]);

            // Get token decimals and symbols
            const assetInfo = await this.getTokenInfo(assetTokenAddress);
            const collateralInfo = await this.getTokenInfo(collateralTokenAddress);

            const [
                userCollateralBalance,
                userBorrowShares,
                exchangeRateInfo,
            ] = await Promise.all([
                pair.userCollateralBalance(userAddress),
                pair.userBorrowShares(userAddress),
                pair.exchangeRateInfo(),
            ]);

            const liquidationPrice =
                userBorrowShares.gt(0) && !userCollateralBalance.isZero()
                    ? userBorrowShares.mul(exchangeRateInfo.lowExchangeRate).div(userCollateralBalance)
                    : ethers.BigNumber.from(0);

            return {
                userCollateralBalance,
                userBorrowShares,
                liquidationPrice,
                formattedCollateralBalance: this.formatTokenAmount(userCollateralBalance, collateralInfo.decimals),
                formattedBorrowShares: this.formatTokenAmount(userBorrowShares, assetInfo.decimals),
                formattedLiquidationPrice: this.formatTokenAmount(liquidationPrice, 18),
                collateralSymbol: collateralInfo.symbol,
                assetSymbol: assetInfo.symbol
            };
        } catch (error) {
            throw new Error(`Failed to read user position: ${this.handleError(error)}`);
        }
    }

    // ===============================
    // Total Asset and Total Borrow Getters
    // ===============================

    async getTotalAsset(pairAddress: string): Promise<{totalAssets: ethers.BigNumber, formatted: string, symbol: string}> {
        try {
            const pair = await this.getPairContract(pairAddress);
            const totalAssets = await pair.totalAssets();

            // Get asset token information for proper formatting
            const assetTokenAddress = await pair.asset();
            const assetInfo = await this.getTokenInfo(assetTokenAddress);

            return {
                totalAssets,
                formatted: this.formatTokenAmount(totalAssets, assetInfo.decimals),
                symbol: assetInfo.symbol
            };
        } catch (error) {
            throw new Error(`Failed to get total asset: ${this.handleError(error)}`);
        }
    }

    async getTotalBorrow(pairAddress: string): Promise<{totalBorrow: ethers.BigNumber, formatted: string, symbol: string}> {
        try {
            const pair = await this.getPairContract(pairAddress);
            const totalBorrowAmount = await pair.totalBorrow().then((borrow) => borrow.amount);

            // Get asset token information for proper formatting
            const assetTokenAddress = await pair.asset();
            const assetInfo = await this.getTokenInfo(assetTokenAddress);

            return {
                totalBorrow: totalBorrowAmount,
                formatted: this.formatTokenAmount(totalBorrowAmount, assetInfo.decimals),
                symbol: assetInfo.symbol
            };
        } catch (error) {
            throw new Error(`Failed to get total borrow: ${this.handleError(error)}`);
        }
    }

    // ===============================
    // Manage User Positions
    // ===============================

    /**
     * Supplies assets to a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of assets to supply.
     * @param userAddress Address of the user.
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient.
     */
    async supply(
        pairAddress: string,
        amount: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ): Promise<TransactionResult> {
        try {
            const pair = await this.getPairContract(pairAddress);
            const assetTokenAddress = await pair.asset();
            const assetInfo = await this.getTokenInfo(assetTokenAddress);

            const approvalResult = await this.approveTokenIfNeeded(assetTokenAddress, pairAddress, amount, autoApprove);

            const gasLimit = await this.estimateGasWithBuffer(
                () => pair.estimateGas.deposit(amount, userAddress)
            );

            const tx = await pair.deposit(amount, userAddress, { gasLimit });
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: this.formatTokenAmount(amount, assetInfo.decimals),
                symbol: assetInfo.symbol
            };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    /**
     * Borrows assets from a lending pair using collateral.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of assets to borrow.
     * @param collateralAmount Amount of collateral to add.
     * @param userAddress Address of the user.
     * @param options Additional options for the transaction.
     */
    async borrow(
        pairAddress: string,
        amount: ethers.BigNumber,
        collateralAmount: ethers.BigNumber,
        userAddress: string,
        options?: {
            gasLimit?: number;
            autoApprove?: boolean;
        }
    ): Promise<TransactionResult> {
        try {
            if (amount.lte(0)) throw new Error("Borrow amount must be greater than zero");

            const pair = await this.getPairContract(pairAddress);
            const [assetTokenAddress, collateralTokenAddress] = await Promise.all([
                pair.asset(),
                pair.collateralContract()
            ]);

            const assetInfo = await this.getTokenInfo(assetTokenAddress);
            const collateralInfo = await this.getTokenInfo(collateralTokenAddress);

            // If adding collateral as part of the borrow operation
            let approvalResult;
            if (collateralAmount.gt(0)) {
                approvalResult = await this.approveTokenIfNeeded(
                    collateralTokenAddress,
                    pairAddress,
                    collateralAmount,
                    options?.autoApprove ?? true
                );
            }

            // Get oracle address directly from the pair contract
            const oracleAddress = (await pair.exchangeRateInfo()).oracle;
            if (!oracleAddress) {
                throw new Error("Oracle address not found in pair contract.");
            }

            // Create Oracle contract interface
            const oracle = new ethers.Contract(
                oracleAddress,
                ["function getPrices() external view returns (bool _isBadData, uint256 _priceLow, uint256 _priceHigh)"],
                this.providerOrSigner
            );

            // Get oracle prices for validation
            const [isBadData, priceLow, priceHigh] = await oracle.getPrices();
            if (isBadData) {
                throw new Error("Oracle returned bad data. Cannot proceed with borrowing.");
            }

            // Use provided gas limit or estimate it
            const gasLimit = options?.gasLimit || await this.estimateGasWithBuffer(
                () => pair.estimateGas.borrowAsset(amount, collateralAmount, userAddress),
                1.5 // 50% buffer for borrow operations
            );

            const tx = await pair.borrowAsset(amount, collateralAmount, userAddress, { gasLimit });
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: this.formatTokenAmount(amount, assetInfo.decimals),
                collateral: this.formatTokenAmount(collateralAmount, collateralInfo.decimals),
                symbol: assetInfo.symbol,
                collateralSymbol: collateralInfo.symbol
            };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    /**
     * Withdraws supplied assets from a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param shares Number of shares to withdraw.
     * @param userAddress Address of the user.
     */
    async withdraw(
        pairAddress: string,
        shares: ethers.BigNumber,
        userAddress: string
    ): Promise<TransactionResult> {
        try {
            if (shares.lte(0)) throw new Error("Shares amount must be greater than zero");

            const pair = await this.getPairContract(pairAddress);
            const assetTokenAddress = await pair.asset();
            const assetInfo = await this.getTokenInfo(assetTokenAddress);

            const gasLimit = await this.estimateGasWithBuffer(
                () => pair.estimateGas.withdraw(shares, userAddress, userAddress)
            );

            const tx = await pair.withdraw(shares, userAddress, userAddress, { gasLimit });
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: this.formatTokenAmount(shares, assetInfo.decimals),
                symbol: assetInfo.symbol
            };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    /**
     * Repays borrowed assets in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param shares Number of borrow shares to repay.
     * @param userAddress Address of the user.
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient.
     */
    async repay(
        pairAddress: string,
        shares: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ): Promise<TransactionResult> {
        try {
            if (shares.lte(0)) throw new Error("Shares must be greater than zero");
            if (!this.isValidAddress(userAddress)) throw new Error("Invalid user address");

            const pair = await this.getPairContract(pairAddress);
            const assetTokenAddress = await pair.asset();
            const assetInfo = await this.getTokenInfo(assetTokenAddress);

            // Check if the user has debt to repay
            const borrowerDebt = await pair.userBorrowShares(userAddress);
            if (borrowerDebt.isZero()) {
                throw new Error("No debt to repay");
            }
            if (shares.gt(borrowerDebt)) {
                throw new Error(`Cannot repay more than the borrower's debt`);
            }

            // Convert borrow shares to amount for approval
            const totalBorrow = await pair.totalBorrow();
            const amountToRepay = shares.mul(totalBorrow.amount).div(totalBorrow.shares);

            const approvalResult = await this.approveTokenIfNeeded(assetTokenAddress, pairAddress, amountToRepay, autoApprove);

            const gasLimit = await this.estimateGasWithBuffer(
                () => pair.estimateGas.repayAsset(shares, userAddress),
                1.5 // 50% buffer for repay operations
            );

            const tx = await pair.repayAsset(shares, userAddress, { gasLimit });
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: this.formatTokenAmount(shares, assetInfo.decimals),
                symbol: assetInfo.symbol
            };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    /**
     * Adds collateral to a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to add.
     * @param userAddress Address of the user.
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient.
     */
    async addCollateral(
        pairAddress: string,
        amount: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ): Promise<TransactionResult> {
        try {
            if (amount.lte(0)) throw new Error("Collateral amount must be greater than zero");
            if (!this.isValidAddress(userAddress)) throw new Error("Invalid user address");

            const pair = await this.getPairContract(pairAddress);
            const collateralTokenAddress = await pair.collateralContract();
            const collateralInfo = await this.getTokenInfo(collateralTokenAddress);

            // Check signer's balance
            const signerAddress = await this.getSignerAddress();
            const collateralToken = this.getTokenContract(collateralTokenAddress, true);
            const signerBalance = await collateralToken.balanceOf(signerAddress);

            if (signerBalance.lt(amount)) {
                throw new Error(`Insufficient collateral balance`);
            }

            const approvalResult = await this.approveTokenIfNeeded(collateralTokenAddress, pairAddress, amount, autoApprove);

            const gasLimit = await this.estimateGasWithBuffer(
                () => pair.estimateGas.addCollateral(amount, userAddress)
            );

            const tx = await pair.addCollateral(amount, userAddress, { gasLimit });
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: this.formatTokenAmount(amount, collateralInfo.decimals),
                symbol: collateralInfo.symbol
            };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    /**
     * Removes collateral from a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to remove.
     * @param userAddress Address of the user.
     */
    async removeCollateral(
        pairAddress: string,
        amount: ethers.BigNumber,
        userAddress: string
    ): Promise<TransactionResult> {
        try {
            if (amount.lte(0)) throw new Error("Collateral amount must be greater than zero");

            const pair = await this.getPairContract(pairAddress);
            const collateralTokenAddress = await pair.collateralContract();
            const collateralInfo = await this.getTokenInfo(collateralTokenAddress);

            const gasLimit = await this.estimateGasWithBuffer(
                () => pair.estimateGas.removeCollateral(amount, userAddress)
            );

            const tx = await pair.removeCollateral(amount, userAddress, { gasLimit });
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: this.formatTokenAmount(amount, collateralInfo.decimals),
                symbol: collateralInfo.symbol
            };
        } catch (error) {
            this.handleTransactionError(error);
        }
    }
}
