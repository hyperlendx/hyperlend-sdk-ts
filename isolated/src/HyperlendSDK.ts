import { ethers } from 'ethers';
import { HyperlendPairRegistry } from './types';
import { HyperlendPairRegistry__factory } from './types';
import { HyperlendPair } from './types';
import { HyperlendPair__factory } from './types';

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
    // Pair Registry Functions
    // ===============================

    async getDeployedPairsLength(): Promise<ethers.BigNumber> {
        return await this.registry.deployedPairsLength();
    }

    async getAllPairAddresses(): Promise<string[]> {
        return await this.registry.getAllPairAddresses();
    }

    async addPair(pairAddress: string, signer: ethers.Signer, overrides?: ethers.Overrides): Promise<void> {
        if (!ethers.Signer.isSigner(signer)) {
            throw new Error('A valid Signer is required to add a pair.');
        }
        if (!this.isValidAddress(pairAddress)) {
            throw new Error('Invalid Ethereum address provided for pairAddress.');
        }
        const contractWithSigner = this.registry.connect(signer);
        try {
            const tx = await contractWithSigner.addPair(pairAddress, overrides || {});
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Pair added successfully: ${pairAddress}`);
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    async setDeployers(deployers: string[], allow: boolean, signer: ethers.Signer, overrides?: ethers.Overrides): Promise<void> {
        if (!ethers.Signer.isSigner(signer)) {
            throw new Error('A valid Signer is required to set deployers.');
        }
        if (!deployers.every(this.isValidAddress)) {
            throw new Error('One or more invalid Ethereum addresses provided in deployers.');
        }
        const contractWithSigner = this.registry.connect(signer);
        try {
            const tx = await contractWithSigner.setDeployers(deployers, allow, overrides || {});
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Deployers updated successfully.`);
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
    // Pair Management
    // ===============================

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
    // Read Pair Data
    // ===============================

    /**
     * Reads detailed data about a lending pair.
     * @param pairAddress Address of the pair contract.
     * @returns Pair data including asset, collateral, LTV, fees, total assets, total borrows, etc.
     */
    async readPairData(pairAddress: string) {
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
                currentRateInfo,
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
    async readUserPosition(pairAddress: string, userAddress: string) {
        try {
            const pair = await this.getPairContract(pairAddress);

            // Get asset and collateral token information
            const [assetTokenAddress, collateralTokenAddress] = await Promise.all([
                pair.asset(),
                pair.collateralContract()
            ]);

            // Create token contracts
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
                this.providerOrSigner
            );

            const collateralToken = new ethers.Contract(
                collateralTokenAddress,
                ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
                this.providerOrSigner
            );

            // Get token decimals and symbols
            let assetDecimals, assetSymbol, collateralDecimals, collateralSymbol;
            try {
                [assetDecimals, assetSymbol, collateralDecimals, collateralSymbol] = await Promise.all([
                    assetToken.decimals(),
                    assetToken.symbol(),
                    collateralToken.decimals(),
                    collateralToken.symbol()
                ]);
            } catch (error) {
                console.warn("Could not get token info, defaulting to 18 decimals:", error);
                assetDecimals = 18;
                assetSymbol = "Unknown";
                collateralDecimals = 18;
                collateralSymbol = "Unknown";
            }

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

            console.log(`User collateral balance: ${ethers.utils.formatUnits(userCollateralBalance, collateralDecimals)} ${collateralSymbol}`);
            console.log(`User borrow shares: ${ethers.utils.formatUnits(userBorrowShares, assetDecimals)} ${assetSymbol}`);
            console.log(`Liquidation price: ${ethers.utils.formatUnits(liquidationPrice, 18)} ${assetSymbol}/${collateralSymbol}`);

            return {
                userCollateralBalance,
                userBorrowShares,
                liquidationPrice,
            };
        } catch (error) {
            throw new Error(`Failed to read user position: ${this.handleError(error)}`);
        }
    }

    // ===============================
    // Total Asset and Total Borrow Getters
    // ===============================

    async getTotalAsset(pairAddress: string): Promise<ethers.BigNumber> {
        try {
            const pair = await this.getPairContract(pairAddress);
            const totalAssets = await pair.totalAssets();

            // Get asset token information for proper formatting
            const assetTokenAddress = await pair.asset();
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
                this.providerOrSigner
            );

            // Get token decimals and symbol
            let assetDecimals, assetSymbol;
            try {
                [assetDecimals, assetSymbol] = await Promise.all([
                    assetToken.decimals(),
                    assetToken.symbol()
                ]);
            } catch (error) {
                console.warn("Could not get token info, defaulting to 18 decimals:", error);
                assetDecimals = 18;
                assetSymbol = "Unknown";
            }

            console.log(`Total assets: ${ethers.utils.formatUnits(totalAssets, assetDecimals)} ${assetSymbol}`);
            return totalAssets;
        } catch (error) {
            throw new Error(`Failed to get total asset: ${this.handleError(error)}`);
        }
    }

    async getTotalBorrow(pairAddress: string): Promise<ethers.BigNumber> {
        try {
            const pair = await this.getPairContract(pairAddress);
            const totalBorrowAmount = await pair.totalBorrow().then((borrow) => borrow.amount);

            // Get asset token information for proper formatting
            const assetTokenAddress = await pair.asset();
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
                this.providerOrSigner
            );

            // Get token decimals and symbol
            let assetDecimals, assetSymbol;
            try {
                [assetDecimals, assetSymbol] = await Promise.all([
                    assetToken.decimals(),
                    assetToken.symbol()
                ]);
            } catch (error) {
                console.warn("Could not get token info, defaulting to 18 decimals:", error);
                assetDecimals = 18;
                assetSymbol = "Unknown";
            }

            console.log(`Total borrow: ${ethers.utils.formatUnits(totalBorrowAmount, assetDecimals)} ${assetSymbol}`);
            return totalBorrowAmount;
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
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient (default: true).
     * @returns Transaction details including hash and status.
     */

    async supply(
        pairAddress: string,
        amount: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ) {
        const pair = await this.getPairContract(pairAddress);

        try {
            // Get the asset token address from the pair contract
            const assetTokenAddress = await pair.asset();

            // Create an instance of the ERC-20 token contract with decimals
            const assetTokenContract = new ethers.Contract(
                assetTokenAddress,
                [
                    "function approve(address spender, uint256 amount) external returns (bool)",
                    "function allowance(address owner, address spender) external view returns (uint256)",
                    "function decimals() view returns (uint8)",
                    "function symbol() view returns (string)"
                ],
                this.providerOrSigner
            );

            // Get token decimals and symbol
            let assetDecimals, assetSymbol;
            try {
                [assetDecimals, assetSymbol] = await Promise.all([
                    assetTokenContract.decimals(),
                    assetTokenContract.symbol()
                ]);
            } catch (error) {
                console.warn("Could not get token info, defaulting to 18 decimals:", error);
                assetDecimals = 18;
                assetSymbol = "Unknown";
            }

            // Check if the pair contract already has sufficient allowance
            const currentAllowance = await assetTokenContract.allowance(userAddress, pairAddress);
            if (currentAllowance.lt(amount)) {
                console.log(`Insufficient allowance: ${ethers.utils.formatUnits(currentAllowance, assetDecimals)} ${assetSymbol}`);

                if (!autoApprove) {
                    throw new Error(`Insufficient token allowance: ${ethers.utils.formatUnits(currentAllowance, assetDecimals)} ${assetSymbol} < ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol}. Set autoApprove=true or approve manually.`);
                }

                console.log(`Approving ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol}...`);

                // Estimate gas for the approval transaction
                let approvalGasLimit: number | undefined;
                try {
                    const approvalGasEstimate = await assetTokenContract.estimateGas.approve(pairAddress, amount);
                    approvalGasLimit = Math.ceil(approvalGasEstimate.toNumber() * 1.2); // Add 20% buffer
                    console.log(`Estimated approval gas: ${approvalGasLimit}`);
                } catch (error) {
                    console.warn("Approval gas estimation failed, using manual gas limit");
                    approvalGasLimit = 50000; // Set a manual gas limit for approval
                }

                // Execute the approval transaction
                const approvalTx = await assetTokenContract.approve(pairAddress, amount, { gasLimit: approvalGasLimit });
                console.log(`Approval transaction sent: ${approvalTx.hash}`);
                await approvalTx.wait();
                console.log("Tokens approved successfully");
            } else {
                console.log("Sufficient allowance already exists");
            }

            // Estimate gas for the deposit transaction
            let gasLimit: number | undefined;
            try {
                const gasEstimate = await pair.estimateGas.deposit(amount, userAddress);
                gasLimit = Math.ceil(gasEstimate.toNumber() * 1.2); // Add 20% buffer
                console.log(`Estimated gas: ${gasLimit}`);
            } catch (error) {
                console.warn("Gas estimation failed, using manual gas limit");
                gasLimit = 300000; // Set a manual gas limit
            }

            // Execute the deposit transaction
            console.log(`Supplying ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol}...`);
            const tx = await pair.deposit(amount, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`Supplied successfully: ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol} to ${userAddress}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: ethers.utils.formatUnits(amount, assetDecimals),
                symbol: assetSymbol
            };
        } catch (error) {
            // Handle transaction errors globally
            this.handleTransactionError(error);
            throw error;
        }
    }

    /**
     * Borrows assets from a lending pair using collateral.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of assets to borrow.
     * @param collateralAmount Amount of collateral to add.
     * @param userAddress Address of the user.
     * @param options Additional options for the transaction.
     * @param options.gasLimit Gas limit for the transaction.
     * @param options.oracleAddress Address of the oracle contract.
     * @param options.autoApprove Whether to automatically approve tokens if allowance is insufficient (default: true).
     */

    async borrow(
        pairAddress: string,
        amount: ethers.BigNumber,
        collateralAmount: ethers.BigNumber,
        userAddress: string,
        options?: {
            gasLimit?: number;
            oracleAddress?: string;
            autoApprove?: boolean;
        }
    ): Promise<{
        success: boolean;
        transactionHash: string;
        blockNumber: number;
        amount: string;
        collateral: string;
        symbol: string;
        collateralSymbol: string;
    }> {
        // Verify we have a signer
        if (!ethers.Signer.isSigner(this.providerOrSigner)) {
            throw new Error("A signer is required to borrow assets");
        }

        try {
            // Validate input amounts
            if (amount.lte(0))
                throw new Error("Borrow amount must be greater than zero");

            // Get oracle address from options or environment variable
            const oracleAddress = options?.oracleAddress || process.env.ORACLE_ADDRESS;
            const autoApprove = options?.autoApprove !== undefined ? options.autoApprove : true;

            if (!oracleAddress) {
                throw new Error("Oracle address is required for borrowing. Provide in options.oracleAddress or set ORACLE_ADDRESS in environment variables.");
            }

            // Get the pair contract instance
            const pair = await this.getPairContract(pairAddress);

            // Retrieve token addresses from the pair contract
            const [collateralTokenAddress, assetTokenAddress] = await Promise.all([
                pair.collateralContract(),
                pair.asset()
            ]);

            // Create ERC-20 token contract instances
            const collateralToken = new ethers.Contract(
                collateralTokenAddress,
                [
                    "function decimals() view returns (uint8)",
                    "function symbol() view returns (string)",
                    "function approve(address spender, uint256 amount) external returns (bool)",
                    "function allowance(address owner, address spender) external view returns (uint256)"
                ],
                this.providerOrSigner
            );
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                [
                    "function decimals() view returns (uint8)",
                    "function symbol() view returns (string)"
                ],
                this.providerOrSigner
            );

            // Retrieve decimals and symbols for formatting
            const [assetDecimals, assetSymbol, collateralDecimals, collateralSymbol] = await Promise.all([
                assetToken.decimals(),
                assetToken.symbol(),
                collateralToken.decimals(),
                collateralToken.symbol()
            ]);

            // Check available assets
            const assetsAvailable = await pair.totalAssets();
            if (assetsAvailable.lt(amount)) {
                throw new Error(
                    `Insufficient assets available in contract: have ${ethers.utils.formatUnits(assetsAvailable, assetDecimals)} ${assetSymbol}, need ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol}`
                );
            }

            // Get signer's address for approvals
            const signerAddress = await (this.providerOrSigner as ethers.Signer).getAddress();

            // Check if there's sufficient collateral token allowance
            if (collateralAmount.gt(0)) {
                const collateralAllowance = await collateralToken.allowance(signerAddress, pairAddress);
                if (collateralAllowance.lt(collateralAmount)) {
                    if (!autoApprove) {
                        throw new Error(`Insufficient token allowance: ${ethers.utils.formatUnits(collateralAllowance, collateralDecimals)} ${collateralSymbol} < ${ethers.utils.formatUnits(collateralAmount, collateralDecimals)} ${collateralSymbol}. Set autoApprove=true or approve manually.`);
                    }

                    console.log(`Approving ${ethers.utils.formatUnits(collateralAmount, collateralDecimals)} ${collateralSymbol}...`);
                    const approveTx = await collateralToken.approve(pairAddress, collateralAmount);
                    console.log(`Approval transaction sent: ${approveTx.hash}`);
                    await approveTx.wait();
                    console.log("Collateral approved successfully");
                }
            }

            // Create Oracle contract interface
            const oracleInterface = new ethers.utils.Interface([
                "function getPrices() external view returns (bool _isBadData, uint256 _priceLow, uint256 _priceHigh)"
            ]);
            const oracle = new ethers.Contract(oracleAddress, oracleInterface, this.providerOrSigner);

            // Get oracle prices
            const [isBadData, priceLow, priceHigh] = await oracle.getPrices();

            if (isBadData) {
                throw new Error("Oracle returned bad data. Cannot proceed with borrowing.");
            }

            console.log(`Oracle prices - Low: ${ethers.utils.formatUnits(priceLow, 18)}, High: ${ethers.utils.formatUnits(priceHigh, 18)}`);

            // Calculate maximum borrowable amount based on collateral and LTV
            const maxLTV = await pair.maxLTV();
            const borrowableValue = collateralAmount
                .mul(priceLow)
                .div(ethers.constants.WeiPerEther)
                .mul(maxLTV)
                .div(ethers.constants.WeiPerEther);

            if (amount.gt(borrowableValue)) {
                throw new Error(
                    `Borrow amount exceeds maximum allowed based on collateral. ` +
                    `Max borrowable: ${ethers.utils.formatUnits(borrowableValue, assetDecimals)} ${assetSymbol}, ` +
                    `Requested: ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol}`
                );
            }

            // Set gas limit using provided option or fallback value
            const gasLimit = options?.gasLimit || 1500000;

            console.log(`Borrowing ${ethers.utils.formatUnits(amount, assetDecimals)} ${assetSymbol}...`);

            // Execute the borrow transaction
            const tx = await pair.borrowAsset(amount, collateralAmount, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: ethers.utils.formatUnits(amount, assetDecimals),
                collateral: ethers.utils.formatUnits(collateralAmount, collateralDecimals),
                symbol: assetSymbol,
                collateralSymbol: collateralSymbol
            };
        } catch (error) {
            this.handleTransactionError(error);
            throw error;
        }
    }

    /**
     * Withdraws supplied assets from a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param shares Number of shares to withdraw.
     * @param userAddress Address of the user.
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient (default: true).
     * @returns Transaction details including hash and status.
     */
    async withdraw(
        pairAddress: string,
        shares: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ): Promise<{
        success: boolean;
        transactionHash: string;
        blockNumber: number;
        amount: string;
        symbol: string;
    }> {
        try {
            // Input validation
            if (shares.lte(0)) {
                throw new Error("Shares amount must be greater than zero");
            }

            // Get pair contract
            const pair = await this.getPairContract(pairAddress);

            // Note: withdraw doesn't typically need token approval
            // as it's withdrawing assets from the contract, but we include
            // the parameter for API consistency

            // Execute transaction
            const tx = await pair.withdraw(shares, userAddress, userAddress);
            console.log(`Withdraw transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`Withdraw transaction confirmed in block ${receipt.blockNumber}`);

            // Get token symbol for the return value
            const assetTokenAddress = await pair.asset();
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                ["function symbol() view returns (string)"],
                this.providerOrSigner
            );

            let tokenSymbol = "Unknown";
            try {
                tokenSymbol = await assetToken.symbol();
            } catch (error) {
                console.warn("Could not get token symbol");
            }

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: ethers.utils.formatEther(shares),
                symbol: tokenSymbol
            };
        } catch (error) {
            console.error(`Withdraw failed: ${this.handleError(error)}`);
            throw error;
        }
    }

    /**
     * Repays borrowed assets in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param shares Number of borrow shares to repay.
     * @param userAddress Address of the user.
     */

    async repay(
        pairAddress: string,
        shares: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ) {
        // Input validation
        if (!ethers.utils.isAddress(userAddress)) {
            throw new Error("Invalid user address");
        }
        if (shares.lte(0)) {
            throw new Error("Shares must be greater than zero");
        }

        try {
            const pair = await this.getPairContract(pairAddress);

            // Get asset token information
            const assetTokenAddress = await pair.asset();
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                [
                    "function decimals() view returns (uint8)",
                    "function symbol() view returns (string)",
                    "function allowance(address owner, address spender) external view returns (uint256)",
                    "function approve(address spender, uint256 amount) external returns (bool)"
                ],
                this.providerOrSigner
            );

            // Get token decimals and symbol
            let assetDecimals, assetSymbol;
            try {
                [assetDecimals, assetSymbol] = await Promise.all([
                    assetToken.decimals(),
                    assetToken.symbol()
                ]);
            } catch (error) {
                console.warn("Could not get token info, defaulting to 18 decimals:", error);
                assetDecimals = 18;
                assetSymbol = "Unknown";
            }

            // Log current borrower debt
            const borrowerDebt = await pair.userBorrowShares(userAddress);
            console.log(`Current borrower debt: ${ethers.utils.formatUnits(borrowerDebt, assetDecimals)} ${assetSymbol}`);

            // Ensure the user has sufficient borrow shares to repay
            if (borrowerDebt.isZero()) {
                throw new Error("No debt to repay");
            }
            if (shares.gt(borrowerDebt)) {
                throw new Error(`Cannot repay more than the borrower's debt: trying to repay ${ethers.utils.formatUnits(shares, assetDecimals)} ${assetSymbol}, debt is ${ethers.utils.formatUnits(borrowerDebt, assetDecimals)} ${assetSymbol}`);
            }

            // Convert borrow shares to amount for approval
            const totalBorrow = await pair.totalBorrow();
            const amountToRepay = shares.mul(totalBorrow.amount).div(totalBorrow.shares);

            // Assert providerOrSigner as a Signer and get the signer's address
            if (!ethers.Signer.isSigner(this.providerOrSigner)) {
                throw new Error("A signer is required to repay assets");
            }
            const signerAddress = await (this.providerOrSigner as ethers.Signer).getAddress();

            // Check if the pair contract has sufficient allowance from the signer
            const currentAllowance = await assetToken.allowance(signerAddress, pairAddress);
            if (currentAllowance.lt(amountToRepay)) {
                console.log(`Insufficient allowance: ${ethers.utils.formatUnits(currentAllowance, assetDecimals)} ${assetSymbol} < ${ethers.utils.formatUnits(amountToRepay, assetDecimals)} ${assetSymbol}`);

                if (!autoApprove) {
                    throw new Error(`Insufficient token allowance: ${ethers.utils.formatUnits(currentAllowance, assetDecimals)} ${assetSymbol} < ${ethers.utils.formatUnits(amountToRepay, assetDecimals)} ${assetSymbol}. Set autoApprove=true or approve manually.`);
                }

                // Estimate gas for the approval transaction
                let approvalGasLimit: number | undefined;
                try {
                    const approvalGasEstimate = await assetToken.estimateGas.approve(pairAddress, amountToRepay);
                    approvalGasLimit = Math.ceil(approvalGasEstimate.toNumber() * 1.2); // Add 20% buffer
                    console.log(`Estimated approval gas: ${approvalGasLimit}`);
                } catch (error) {
                    console.warn("Approval gas estimation failed, using manual gas limit");
                    approvalGasLimit = 50000; // Set a manual gas limit for approval
                }

                // Execute the approval transaction
                console.log("Approving tokens...");
                const approvalTx = await assetToken.approve(pairAddress, amountToRepay, { gasLimit: approvalGasLimit });
                console.log(`Approval transaction sent: ${approvalTx.hash}`);
                await approvalTx.wait();
                console.log("Tokens approved successfully");
            } else {
                console.log("Sufficient allowance already exists");
            }

            // Estimate gas for the repay transaction
            let gasLimit: number | undefined;
            try {
                const gasEstimate = await pair.estimateGas.repayAsset(shares, userAddress);
                gasLimit = Math.ceil(gasEstimate.toNumber() * 1.5); // Add 50% buffer
                console.log(`Estimated gas: ${gasLimit}`);
            } catch (error) {
                console.warn("Gas estimation failed, using manual gas limit");
                gasLimit = 500000; // Set a higher manual gas limit
            }

            // Execute the repay transaction
            console.log(`Repaying ${ethers.utils.formatUnits(shares, assetDecimals)} ${assetSymbol}...`);
            const tx = await pair.repayAsset(shares, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            const receipt = await tx.wait();

            if (receipt.status === 0) {
                throw new Error("Transaction failed");
            }

            console.log(`Repaid successfully: ${ethers.utils.formatUnits(shares, assetDecimals)} ${assetSymbol} by ${userAddress}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: ethers.utils.formatUnits(shares, assetDecimals),
                symbol: assetSymbol
            };
        } catch (error) {
            this.handleTransactionError(error);
            throw error;
        }
    }

    /**
     * Adds collateral to a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to add.
     * @param userAddress Address of the user.
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient (default: true).
     */

    async addCollateral(
        pairAddress: string,
        amount: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ) {
        try {
            // Log network details
            let network;
            if ('getNetwork' in this.providerOrSigner) {
                network = await this.providerOrSigner.getNetwork();
            } else if (ethers.Signer.isSigner(this.providerOrSigner)) {
                const signerProvider = this.providerOrSigner.provider;
                if (!signerProvider) {
                    throw new Error("Signer has no provider attached; cannot determine network.");
                }
                network = await signerProvider.getNetwork();
            } else {
                throw new Error("providerOrSigner is neither a valid Signer nor Provider.");
            }
            console.log(`Network: ${network.name}, Chain ID: ${network.chainId}`);

            // Input validation
            if (amount.lte(0)) {
                throw new Error("Collateral amount must be greater than zero");
            }
            if (!ethers.utils.isAddress(userAddress)) {
                throw new Error("Invalid user address");
            }

            // Retrieve the pair contract instance
            const pair = await this.getPairContract(pairAddress);

            // Get the collateral token address from the pair contract
            const collateralTokenAddress = await pair.collateralContract();
            console.log(`Collateral token address: ${collateralTokenAddress}`);

            // Create an instance of the ERC-20 collateral token contract
            const collateralToken = new ethers.Contract(
                collateralTokenAddress,
                [
                    "function balanceOf(address) external view returns (uint256)",
                    "function allowance(address owner, address spender) external view returns (uint256)",
                    "function approve(address spender, uint256 amount) external returns (bool)",
                    "function decimals() view returns (uint8)",
                    "function symbol() view returns (string)"
                ],
                this.providerOrSigner
            );

            // Get token decimals and symbol
            let collateralDecimals, collateralSymbol;
            try {
                [collateralDecimals, collateralSymbol] = await Promise.all([
                    collateralToken.decimals(),
                    collateralToken.symbol()
                ]);
            } catch (error) {
                console.warn("Could not get token info, defaulting to 18 decimals:", error);
                collateralDecimals = 18;
                collateralSymbol = "Unknown";
            }

            console.log(`Requested collateral amount: ${ethers.utils.formatUnits(amount, collateralDecimals)} ${collateralSymbol}`);

            // Log current collateral balance
            const currentCollateral = await pair.userCollateralBalance(userAddress);
            console.log(`Current collateral balance: ${ethers.utils.formatUnits(currentCollateral, collateralDecimals)} ${collateralSymbol}`);

            // Assert providerOrSigner as a Signer and get the signer's address
            const signer = this.providerOrSigner as ethers.Signer;
            const signerAddress = await signer.getAddress();
            console.log(`Signer address: ${signerAddress}`);

            // Check signer's balance
            const signerBalance = await collateralToken.balanceOf(signerAddress);
            console.log(`Signer's balance: ${ethers.utils.formatUnits(signerBalance, collateralDecimals)} ${collateralSymbol}`);
            if (signerBalance.lt(amount)) {
                throw new Error(`Insufficient collateral balance: ${ethers.utils.formatUnits(signerBalance, collateralDecimals)} ${collateralSymbol} < ${ethers.utils.formatUnits(amount, collateralDecimals)} ${collateralSymbol}`);
            }

            // Check if the pair contract has sufficient allowance from the signer
            const currentAllowance = await collateralToken.allowance(signerAddress, pairAddress);
            if (currentAllowance.lt(amount)) {
                console.log(`Insufficient allowance: ${ethers.utils.formatUnits(currentAllowance, collateralDecimals)} ${collateralSymbol}`);

                if (!autoApprove) {
                    throw new Error(`Insufficient token allowance: ${ethers.utils.formatUnits(currentAllowance, collateralDecimals)} ${collateralSymbol} < ${ethers.utils.formatUnits(amount, collateralDecimals)} ${collateralSymbol}. Set autoApprove=true or approve manually.`);
                }

                console.log("Approving tokens...");
                // Estimate gas for the approval transaction
                let approvalGasLimit: number | undefined;
                try {
                    const approvalGasEstimate = await collateralToken.estimateGas.approve(pairAddress, amount);
                    approvalGasLimit = Math.ceil(approvalGasEstimate.toNumber() * 1.2); // Add 20% buffer
                    console.log(`Estimated approval gas: ${approvalGasLimit}`);
                } catch (error) {
                    console.warn("Approval gas estimation failed, using manual gas limit");
                    approvalGasLimit = 50000; // Set a manual gas limit for approval
                }

                // Execute the approval transaction
                const approvalTx = await collateralToken.approve(pairAddress, amount, { gasLimit: approvalGasLimit });
                console.log(`Approval transaction sent: ${approvalTx.hash}`);
                await approvalTx.wait();
                console.log("Tokens approved successfully");
            } else {
                console.log("Sufficient allowance already exists");
            }

            // Estimate gas for the addCollateral transaction
            let gasLimit: number | undefined;
            try {
                const gasEstimate = await pair.estimateGas.addCollateral(amount, userAddress);
                gasLimit = Math.ceil(gasEstimate.toNumber() * 1.2); // Add 20% buffer
                console.log(`Estimated gas: ${gasLimit}`);
            } catch (error) {
                console.warn("Gas estimation failed, using manual gas limit");
                gasLimit = 300000; // Set a manual gas limit
            }

            // Execute the addCollateral transaction
            console.log(`Adding ${ethers.utils.formatUnits(amount, collateralDecimals)} ${collateralSymbol} collateral...`);
            const tx = await pair.addCollateral(amount, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Added collateral successfully: ${ethers.utils.formatUnits(amount, collateralDecimals)} ${collateralSymbol} by ${userAddress}`);

            return {
                success: true,
                transactionHash: tx.hash,
                amount: ethers.utils.formatUnits(amount, collateralDecimals),
                symbol: collateralSymbol
            };
        } catch (error) {
            // Handle transaction errors globally
            this.handleTransactionError(error);
            throw error;
        }
    }

    /**
     * Removes collateral from a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to remove.
     * @param userAddress Address of the user.
     */

    /**
     * Removes collateral from a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to remove.
     * @param userAddress Address of the user.
     * @param autoApprove Whether to automatically approve tokens if allowance is insufficient (default: true).
     * @returns Transaction details including hash and status.
     */
    async removeCollateral(
        pairAddress: string,
        amount: ethers.BigNumber,
        userAddress: string,
        autoApprove: boolean = true
    ): Promise<{
        success: boolean;
        transactionHash: string;
        blockNumber: number;
        amount: string;
        symbol: string;
    }> {
        try {
            // Input validation
            if (amount.lte(0)) {
                throw new Error("Collateral amount must be greater than zero");
            }

            // Get pair contract
            const pair = await this.getPairContract(pairAddress);

            // Note: removeCollateral doesn't typically need token approval
            // as it's withdrawing assets from the contract, but we include
            // the parameter for API consistency

            // Execute transaction
            const tx = await pair.removeCollateral(amount, userAddress);
            console.log(`Remove collateral transaction sent: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();
            console.log(`Remove collateral transaction confirmed in block ${receipt.blockNumber}`);

            // Get token symbol for the return value
            const collateralTokenAddress = await pair.collateralContract();
            const collateralToken = new ethers.Contract(
                collateralTokenAddress,
                ["function symbol() view returns (string)"],
                this.providerOrSigner
            );

            let tokenSymbol = "Unknown";
            try {
                tokenSymbol = await collateralToken.symbol();
            } catch (error) {
                console.warn("Could not get token symbol");
            }

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: ethers.utils.formatEther(amount),
                symbol: tokenSymbol
            };
        } catch (error) {
            console.error(`Remove collateral failed: ${this.handleError(error)}`);
            throw error;
        }
    }

    // ===============================
    // Helper Methods
    // ===============================

    /**
     * Handles errors gracefully by decoding and logging them.
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
     * Handle transaction errors by decoding and logging them.
     * @param error The error object.
     */
    private handleTransactionError(error: any): void {
        if (error.code === ethers.errors.CALL_EXCEPTION) {
            console.error('Transaction failed:', error.reason);
        } else {
            console.error('Unexpected error:', error);
        }
        throw error; // Re-throw the error after logging
    }
}