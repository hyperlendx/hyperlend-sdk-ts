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

    /**
     * Helper function to get Oracle contract instance
     * @param oracleAddress Address of the oracle contract
     * @returns Instance of the Oracle contract
     */
    private async getOracleContract(oracleAddress: string): Promise<ethers.Contract> {
        const oracleABI = [
            "function lastUpdateTime() view returns (uint256)",
            "function update() returns (bool)"
        ];

        // Ensure a valid Signer or Provider is available
        if (!ethers.Signer.isSigner(this.providerOrSigner) && !ethers.providers.Provider.isProvider(this.providerOrSigner)) {
            throw new Error("Invalid provider or signer provided.");
        }

        return new ethers.Contract(oracleAddress, oracleABI, this.providerOrSigner);
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
                userBorrowShares.gt(0) // Use BigNumber comparison
                    ? userBorrowShares.mul(exchangeRateInfo.lowExchangeRate).div(userCollateralBalance)
                    : ethers.BigNumber.from(0);

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

    /**
     * Retrieves the total asset amount for a specific pair.
     * @param pairAddress Address of the pair contract.
     * @returns The total asset amount.
     */
    async getTotalAsset(pairAddress: string): Promise<ethers.BigNumber> {
        try {
            const pair = await this.getPairContract(pairAddress);
            return await pair.totalAssets();
        } catch (error) {
            throw new Error(`Failed to get total asset: ${this.handleError(error)}`);
        }
    }

    /**
     * Retrieves the total borrow amount for a specific pair.
     * @param pairAddress Address of the pair contract.
     * @returns The total borrow amount.
     */
    async getTotalBorrow(pairAddress: string): Promise<ethers.BigNumber> {
        try {
            const pair = await this.getPairContract(pairAddress);
            return await pair.totalBorrow().then((borrow) => borrow.amount);
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
     */
    async supply(pairAddress: string, amount: ethers.BigNumber, userAddress: string) {
        const pair = await this.getPairContract(pairAddress);

        try {
            // Get the asset token address from the pair contract
            const assetTokenAddress = await pair.asset();

            // Create an instance of the ERC-20 token contract
            const assetTokenContract = new ethers.Contract(
                assetTokenAddress,
                [
                    "function approve(address spender, uint256 amount) external returns (bool)",
                    "function allowance(address owner, address spender) external view returns (uint256)"
                ],
                this.providerOrSigner
            );

            // Check if the pair contract already has sufficient allowance
            const currentAllowance = await assetTokenContract.allowance(userAddress, pairAddress);
            if (currentAllowance.lt(amount)) {
                console.log("Insufficient allowance, approving tokens...");

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
            const tx = await pair.deposit(amount, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Supplied successfully: ${amount.toString()} to ${userAddress}`);
        } catch (error) {
            // Handle transaction errors globally
            this.handleTransactionError(error);
        }
    }

    /**
     * Borrows assets from a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of assets to borrow.
     * @param collateralAmount Amount of collateral to add.
     * @param userAddress Address of the user.
     * @returns Transaction result with success status, hash, block number, amount, and collateral.
     */
    /**
     * Borrows assets from a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of assets to borrow.
     * @param collateralAmount Amount of collateral to add.
     * @param userAddress Address of the user.
     * @returns Transaction result with success status, hash, block number, amount, and collateral.
     */
    async borrow(
        pairAddress: string,
        amount: ethers.BigNumber,
        collateralAmount: ethers.BigNumber,
        userAddress: string
    ): Promise<{
        success: boolean;
        transactionHash: string;
        blockNumber: number;
        amount: string;
        collateral: string;
    }> {
        try {
            // Input validation
            if (amount.lte(0)) throw new Error("Borrow amount must be greater than zero");
            if (collateralAmount.lte(0)) throw new Error("Collateral amount must be greater than zero");
            if (!this.isValidAddress(userAddress)) throw new Error("Invalid user address");

            // Retrieve the pair contract instance
            const pair = await this.getPairContract(pairAddress);

            // Get token addresses
            const collateralTokenAddress = await pair.collateralContract();
            const assetTokenAddress = await pair.asset();
            if (!this.isValidAddress(collateralTokenAddress)) throw new Error("Invalid collateral token address");
            if (!this.isValidAddress(assetTokenAddress)) throw new Error("Invalid asset token address");

            // Get token contracts
            const collateralToken = new ethers.Contract(
                collateralTokenAddress,
                [
                    "function balanceOf(address) view returns (uint256)",
                    "function allowance(address owner, address spender) view returns (uint256)",
                    "function approve(address spender, uint256 amount) returns (bool)"
                ],
                this.providerOrSigner
            );
            const assetToken = new ethers.Contract(
                assetTokenAddress,
                ["function balanceOf(address) view returns (uint256)"],
                this.providerOrSigner
            );

            // Check user's collateral balance
            const userBalance = await collateralToken.balanceOf(userAddress);
            console.log(`User collateral balance: ${ethers.utils.formatEther(userBalance)}`);
            console.log(`Requested collateral amount: ${ethers.utils.formatEther(collateralAmount)}`);
            if (userBalance.lt(collateralAmount)) {
                throw new Error(
                    `Insufficient collateral balance: have ${ethers.utils.formatEther(userBalance)}, need ${ethers.utils.formatEther(collateralAmount)}`
                );
            }

            // Check and set approval
            const allowance = await collateralToken.allowance(userAddress, pairAddress);
            console.log(`Current allowance: ${ethers.utils.formatEther(allowance)}`);
            if (allowance.lt(collateralAmount)) {
                console.log("Insufficient allowance, approving collateral token...");
                let approvalGasLimit: number | undefined;
                try {
                    const approvalGasEstimate = await collateralToken.estimateGas.approve(pairAddress, collateralAmount);
                    approvalGasLimit = Math.ceil(approvalGasEstimate.toNumber() * 1.2);
                } catch (error) {
                    console.warn("Approval gas estimation failed, using fallback:", error);
                    approvalGasLimit = 50000;
                }
                const approveTx = await collateralToken.approve(pairAddress, collateralAmount, { gasLimit: approvalGasLimit });
                await approveTx.wait();
                console.log("Collateral token approved successfully");
            }

            // Get contract state
            const totalAsset = await pair.totalAsset();
            const totalBorrow = await pair.totalBorrow();
            const borrowLimit = await pair.borrowLimit();
            const assetsAvailable = totalAsset.amount.sub(totalBorrow.amount);
            console.log(`Total asset amount: ${ethers.utils.formatEther(totalAsset.amount)}`);
            console.log(`Total borrow amount: ${ethers.utils.formatEther(totalBorrow.amount)}`);
            console.log(`Borrow limit: ${ethers.utils.formatEther(borrowLimit)}`);
            console.log(`Assets available: ${ethers.utils.formatEther(assetsAvailable)}`);

            // Check available assets
            if (assetsAvailable.lt(amount)) {
                throw new Error(
                    `Insufficient assets available in contract: have ${ethers.utils.formatEther(assetsAvailable)}, need ${ethers.utils.formatEther(amount)}`
                );
            }

            // Check borrow limit
            const newTotalBorrowAmount = totalBorrow.amount.add(amount);
            if (newTotalBorrowAmount.gt(borrowLimit)) {
                throw new Error(
                    `Borrow amount exceeds contract borrow limit: new total ${ethers.utils.formatEther(newTotalBorrowAmount)} > limit ${ethers.utils.formatEther(borrowLimit)}`
                );
            }

            // Get oracle info
            const exchangeRateInfo = await pair.exchangeRateInfo();
            const oracleAddress = exchangeRateInfo.oracle;
            console.log(`Oracle address: ${oracleAddress}`);
            if (!this.isValidAddress(oracleAddress)) throw new Error("Invalid oracle address configured");
            if (oracleAddress.toLowerCase() === pairAddress.toLowerCase()) {
                console.warn("Oracle address matches pair address, this may cause issues if not intended.");
            }

            const oracle = await this.getOracleContract(oracleAddress);
            const lastUpdateTime = await oracle.lastUpdateTime();
            const currentTime = Math.floor(Date.now() / 1000);
            const UPDATE_THRESHOLD = 3600;
            console.log(`Last oracle update: ${lastUpdateTime}, Current time: ${currentTime}`);
            if (currentTime - lastUpdateTime.toNumber() > UPDATE_THRESHOLD) {
                console.log("Oracle data is stale, attempting to update...");
                let updateGasLimit: number | undefined;
                try {
                    const updateGasEstimate = await oracle.estimateGas.update();
                    updateGasLimit = Math.ceil(updateGasEstimate.toNumber() * 1.2);
                } catch (error) {
                    console.warn("Oracle update gas estimation failed, using fallback:", error);
                    updateGasLimit = 100000;
                }
                const updateTx = await oracle.update({ gasLimit: updateGasLimit });
                await updateTx.wait();
                console.log("Oracle updated successfully");
            }

            // Verify exchange rates
            const [isOracleValid, lowExchangeRate, highExchangeRate] = await pair.callStatic.updateExchangeRate();
            console.log({
                isOracleValid,
                lowExchangeRate: ethers.utils.formatEther(lowExchangeRate),
                highExchangeRate: ethers.utils.formatEther(highExchangeRate),
                maxDeviation: exchangeRateInfo.maxOracleDeviation.toString()
            });
            if (!isOracleValid) throw new Error("Oracle prices are outside acceptable deviation range");
            if (lowExchangeRate.isZero() || highExchangeRate.isZero()) throw new Error("Exchange rates cannot be zero");

            // Check LTV
            const maxLTV = await pair.maxLTV();
            console.log(`Max LTV: ${maxLTV.toString()}`);
            if (maxLTV.isZero()) throw new Error("Max LTV is zero, borrowing not allowed");

            const requiredCollateral = amount
                .mul(highExchangeRate)
                .mul(ethers.BigNumber.from(100000))
                .div(maxLTV)
                .div(ethers.constants.WeiPerEther);
            console.log(`Required collateral: ${ethers.utils.formatEther(requiredCollateral)}`);
            if (collateralAmount.lt(requiredCollateral)) {
                throw new Error(
                    `Insufficient collateral: need at least ${ethers.utils.formatEther(requiredCollateral)}, provided ${ethers.utils.formatEther(collateralAmount)}`
                );
            }

            // Simulate the borrow
            console.log("Simulating borrowAsset call...");
            try {
                await pair.callStatic.borrowAsset(amount, collateralAmount, userAddress);
                console.log("Simulation successful");
            } catch (error) {
                console.error("Simulation failed:", error);
                throw new Error("Borrow simulation failed, check contract state or parameters");
            }

            // Estimate gas
            let gasLimit: number;
            try {
                const gasEstimate = await pair.estimateGas.borrowAsset(amount, collateralAmount, userAddress);
                gasLimit = Math.ceil(gasEstimate.toNumber() * 1.2);
                console.log(`Estimated gas: ${gasLimit}`);
            } catch (error) {
                console.warn("Gas estimation failed:", error);
                gasLimit = 1000000;
            }

            // Execute the borrow
            console.log(`Borrowing ${ethers.utils.formatEther(amount)} tokens with ${ethers.utils.formatEther(collateralAmount)} collateral`);
            const tx = await pair.borrowAsset(amount, collateralAmount, userAddress, { gasLimit });
            console.log(`Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

            return {
                success: true,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                amount: amount.toString(),
                collateral: collateralAmount.toString()
            };
        } catch (error) {
            this.handleTransactionError(error);
            throw error;
        }
    }

    /**
     * Withdraws assets from a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param shares Number of shares to withdraw.
     * @param userAddress Address of the user.
     */
    async withdraw(pairAddress: string, shares: ethers.BigNumber, userAddress: string) {
        try {
            const pair = await this.getPairContract(pairAddress);

            // Check if the user has enough shares
            const userShares = await pair.balanceOf(userAddress);
            if (userShares.lt(shares)) {
                throw new Error("Insufficient shares to withdraw");
            }

            // Check if the contract has enough liquidity
            const totalLiquidity = await pair.totalSupply();
            if (totalLiquidity.lt(shares)) {
                throw new Error("Insufficient liquidity in the contract");
            }

            // Send the transaction with a manual gas limit
            const tx = await pair.withdraw(shares, userAddress, userAddress, { gasLimit: 500000 });
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Withdrawn successfully: ${shares.toString()} by ${userAddress}`);
        } catch (error) {
            this.handleTransactionError(error);
        }
    }

    /**
     * Repays borrowed assets in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param shares Number of borrow shares to repay.
     * @param userAddress Address of the user.
     */
    async repay(pairAddress: string, shares: ethers.BigNumber, userAddress: string) {
        // Input validation
        if (!ethers.utils.isAddress(userAddress)) {
            if (shares.lte(0)) {
                throw new Error("Shares must be greater than zero");
            }
            throw new Error("Invalid user address");
        }

        const pair = await this.getPairContract(pairAddress);

        // Log current borrower debt
        const borrowerDebt = await pair.userBorrowShares(userAddress);
        console.log(`Current borrower debt: ${borrowerDebt.toString()}`);

        // Ensure the user has sufficient borrow shares to repay
        if (borrowerDebt.isZero()) {
            throw new Error("No debt to repay");
        }
        if (shares.gt(borrowerDebt)) {
            throw new Error("Cannot repay more than the borrower's debt");
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
        const tx = await pair.repayAsset(shares, userAddress, { gasLimit });
        console.log(`Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error("Transaction failed");
        }

        try {
            console.log(`Repaid successfully: ${shares.toString()} by ${userAddress}`);
        } catch (error) {
            // Handle errors safely by checking the type of `error`
            if (error instanceof Error) {
                console.error("Error during repay:", error.message);
            } else {
                console.error("Unknown error during repay:", error);
            }
        }
    }

    /**
     * Adds collateral to a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to add.
     * @param userAddress Address of the user.
     */
    async addCollateral(pairAddress: string, amount: ethers.BigNumber, userAddress: string) {
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
            console.log(`Requested collateral amount: ${amount.toString()}`);

            // Retrieve the pair contract instance
            const pair = await this.getPairContract(pairAddress);

            // Log current collateral balance
            const currentCollateral = await pair.userCollateralBalance(userAddress);
            console.log(`Current collateral balance: ${currentCollateral.toString()}`);

            // Get the collateral token address from the pair contract
            const collateralTokenAddress = await pair.collateralContract();
            console.log(`Collateral token address: ${collateralTokenAddress}`);

            // Create an instance of the ERC-20 collateral token contract
            const collateralToken = new ethers.Contract(
                collateralTokenAddress,
                [
                    "function balanceOf(address) external view returns (uint256)",
                    "function allowance(address owner, address spender) external view returns (uint256)",
                    "function approve(address spender, uint256 amount) external returns (bool)"
                ],
                this.providerOrSigner
            );

            // Assert providerOrSigner as a Signer and get the signer's address
            const signer = this.providerOrSigner as ethers.Signer;
            const signerAddress = await signer.getAddress();
            console.log(`Signer address: ${signerAddress}`);

            // Check signer's balance
            const signerBalance = await collateralToken.balanceOf(signerAddress);
            console.log(`Signer's balance: ${signerBalance.toString()}`);
            if (signerBalance.lt(amount)) {
                throw new Error(`Insufficient collateral balance: ${signerBalance.toString()} < ${amount.toString()}`);
            }

            // Check if the pair contract has sufficient allowance from the signer
            const currentAllowance = await collateralToken.allowance(signerAddress, pairAddress);
            if (currentAllowance.lt(amount)) {
                console.log("Insufficient allowance, approving tokens...");

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
            const tx = await pair.addCollateral(amount, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Added collateral successfully: ${amount.toString()} by ${userAddress}`);
        } catch (error) {
            // Handle transaction errors globally
            this.handleTransactionError(error);
        }
    }

    /**
     * Removes collateral from a user's position in a lending pair.
     * @param pairAddress Address of the pair contract.
     * @param amount Amount of collateral to remove.
     * @param userAddress Address of the user.
     */
    async removeCollateral(pairAddress: string, amount: ethers.BigNumber, userAddress: string) {
        try {
            // Input validation
            if (amount.lte(0)) {
                throw new Error("Collateral amount must be greater than zero");
            }
            if (!ethers.utils.isAddress(userAddress)) {
                throw new Error("Invalid user address");
            }

            // Retrieve the pair contract instance
            const pair = await this.getPairContract(pairAddress);

            // Log current collateral balance
            const currentCollateral = await pair.userCollateralBalance(userAddress);
            console.log(`Current collateral balance: ${currentCollateral.toString()}`);

            // Ensure the user has sufficient collateral to remove
            if (amount.gt(currentCollateral)) {
                throw new Error("Insufficient collateral to remove");
            }

            // Check if the user has outstanding debt
            const borrowerDebt = await pair.userBorrowShares(userAddress);
            if (!borrowerDebt.isZero()) {
                console.log(`User has outstanding debt: ${borrowerDebt.toString()}`);

                // Update the exchange rate to ensure solvency
                let isSolvencyCheckPassed = false;
                try {
                    const [isAllowed] = await pair.callStatic.updateExchangeRate();
                    if (!isAllowed) {
                        throw new Error("Cannot remove collateral due to oracle deviation or insufficient liquidity");
                    }
                    isSolvencyCheckPassed = true;
                } catch (error) {
                    console.warn("Solvency check failed:", error instanceof Error ? error.message : error);
                    throw new Error("Cannot remove collateral due to solvency issues");
                }

                if (!isSolvencyCheckPassed) {
                    throw new Error("Solvency check failed. Cannot proceed with collateral removal.");
                }
            }

            // Estimate gas for the removeCollateral transaction
            let gasLimit: number | undefined;
            try {
                const gasEstimate = await pair.estimateGas.removeCollateral(amount, userAddress);
                gasLimit = Math.ceil(gasEstimate.toNumber() * 1.2); // Add 20% buffer
                console.log(`Estimated gas: ${gasLimit}`);
            } catch (error) {
                console.warn("Gas estimation failed:", error instanceof Error ? error.message : error);
                gasLimit = 300000; // Set a manual gas limit
            }

            // Execute the removeCollateral transaction
            const tx = await pair.removeCollateral(amount, userAddress, { gasLimit });
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`Removed collateral successfully: ${amount.toString()} by ${userAddress}`);
        } catch (error) {
            // Handle errors with type narrowing
            if (error instanceof Error) {
                console.error("Error occurred:", error.message);
                this.handleTransactionError(error);
            } else {
                console.error("An unknown error occurred:", error);
                this.handleTransactionError(new Error(String(error)));
            }
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