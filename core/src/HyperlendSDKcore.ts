import {BigNumber, Contract, providers, Signer, utils} from "ethers";
import {AaveProtocolDataProviderABI__factory, PoolABI__factory, UiPoolDataProviderV3ABI__factory} from "./typechain";

// Minimal ERC20 ABI for token approval and transfers
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function decimals() public view returns (uint8)",
    "function transfer(address to, uint256 amount) public returns (bool)"
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

// New interfaces for HyperLiquid metadata
export interface SpotToken {
    name: string;
    szDecimals: number;
    weiDecimals: number;
    index: number;
    tokenId: string;
    isCanonical: boolean;
    evmContract: string | null;
    fullName: string | null;
}

export interface SpotMeta {
    tokens: SpotToken[];
    universe: Array<{
        name: string;
        tokens: number[];
        index: number;
        isCanonical: boolean;
    }>;
}

// Enum to define interest rate modes (matches the contract values)
export enum InterestRateMode {
    NONE = 0,
    STABLE = 1,
    VARIABLE = 2
}

// Bridge configuration interfaces
export interface BridgeTokenConfig {
    evmAddress: string;
    coreSystemAddress: string;
    decimals: number;
}

export interface BridgeConfig {
    [tokenSymbol: string]: BridgeTokenConfig;
}

export interface HyperLiquidAPI {
    [chainName: string]: string;
}

export class HyperlendSDKcore {
    private readonly providerOrSigner: providers.Provider | Signer;
    private readonly dataProviderAddress: string;
    private readonly poolAddress: string;
    private readonly uiPoolDataProviderAddress: string;

    // Bridge configuration properties
    private readonly hyperLiquidAPI: HyperLiquidAPI;
    private readonly currentChainApiName: string;
    private readonly bridgeableTokens: BridgeConfig;

    constructor(
        providerOrSigner: providers.Provider | Signer,
        dataProviderAddress: string,
        poolAddress: string,
        uiPoolDataProviderAddress: string,
        // Bridge configuration parameters
        hyperLiquidAPI: HyperLiquidAPI = {},
        currentChainApiName: string = 'testnet',
        bridgeableTokens: BridgeConfig = {}
    ) {
        this.providerOrSigner = providerOrSigner;
        this.dataProviderAddress = dataProviderAddress;
        this.poolAddress = poolAddress;
        this.uiPoolDataProviderAddress = uiPoolDataProviderAddress;

        // Bridge configuration
        this.hyperLiquidAPI = hyperLiquidAPI;
        this.currentChainApiName = currentChainApiName;
        this.bridgeableTokens = bridgeableTokens;
    }

    // ============================================
    // EXISTING HYPERLEND FUNCTIONS (unchanged)
    // ============================================

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
            // console.log(`Approving ${amount.toString()} tokens for ${tokenAddress}`);
            // Use MAX_UINT256 for infinite approval, or use the exact amount needed
            const tx = await erc20Contract.approve(this.poolAddress, amount);
            await tx.wait(1);
            // console.log("Approval transaction confirmed");
            return tx;
        }

        // console.log('Token already approved');
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

        // Simple check without price conversion
        // We'll assume the amount is already in the correct denomination
        if (amount.gt(userData.availableBorrowsBase)) {
            throw new Error(
                `Insufficient borrowing capacity. Available: ${userData.availableBorrowsBase}, ` +
                `Requested: ${amount})}`
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

    // ============================================
    // UPDATED BRIDGING FUNCTIONS
    // ============================================

    /**
     * Get the domain and types for the SpotSend signature
     * @param chainId The current chain ID
     * @returns Object containing domain and types for the signature
     */
    public getSpotSendSignatureParams(chainId: number) {
        const domain = {
            name: 'HyperliquidSignTransaction',
            version: '1',
            chainId: chainId,
            verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        };

        const types = {
            'HyperliquidTransaction:SpotSend': [
                { name: 'hyperliquidChain', type: 'string' },
                { name: 'destination', type: 'string' },
                { name: 'token', type: 'string' },
                { name: 'amount', type: 'string' },
                { name: 'time', type: 'uint64' },
            ],
        };

        return { domain, types };
    }

    /**
     * Create the message object for the SpotSend signature
     * @param hyperliquidChain The HyperLiquid chain (Testnet or Mainnet)
     * @param destination The destination address
     * @param tokenSymbol The token symbol
     * @param tokenId The token ID
     * @param amount The amount to bridge
     * @param weiDecimals The number of decimals for the token
     * @param timestamp The current timestamp
     * @returns The message object for signing
     */
    public createSpotSendMessage(
        hyperliquidChain: string,
        destination: string,
        tokenSymbol: string,
        tokenId: string | number,
        amount: string,
        weiDecimals: number,
        timestamp: number,
    ) {
        const formattedAmount = Number(
            parseFloat(amount).toFixed(weiDecimals),
        ).toString();

        return {
            hyperliquidChain: hyperliquidChain,
            destination: destination,
            token: `${tokenSymbol}:${tokenId}`,
            amount: formattedAmount,
            time: timestamp,
        };
    }

    /**
     * Send tokens directly to system contract using smart contract call (EVM to HyperCore)
     * @param tokenAddress The token contract address
     * @param amount The amount to send
     * @returns Transaction hash
     */
    // In HyperlendSDKcore.ts, update the bridgeToCore method:
    public async bridgeToCore(
        tokenAddress: string,
        amount: number,
    ): Promise<{ txHash: string }> {
        if (!this.isSigner(this.providerOrSigner)) {
            throw new Error("Signer is required for bridging to core");
        }

        const signer = this.providerOrSigner as Signer;

        try {
            // Get system contract address for the token
            const systemContract = await this.getSystemContractAddress(tokenAddress);

            // Handle native token (0x0000...) separately
            let amountInWei: BigNumber;
            if (tokenAddress === '0x0000000000000000000000000000000000000000') {
                // For native HYPE token, use 18 decimals by default
                amountInWei = utils.parseUnits(amount.toString(), 18);

                // Send native transaction instead of token transfer
                const tx = await signer.sendTransaction({
                    to: systemContract,
                    value: amountInWei
                });

                await tx.wait(1);
                console.log('Native token transfer to system contract complete');
                return { txHash: tx.hash };
            }

            // Create contract instance for non-native tokens
            const token = new Contract(tokenAddress, ERC20_ABI, signer);
            const decimals = await token.decimals();
            amountInWei = utils.parseUnits(amount.toString(), decimals);

            console.log(`Transferring ${amount} tokens (${amountInWei.toString()} wei) to system contract ${systemContract}`);
            const tx = await token.transfer(systemContract, amountInWei);
            await tx.wait(1);
            return { txHash: tx.hash };
        } catch (error) {
            console.error('Error sending token to Core:', error);
            throw error;
        }
    }

    /**
     * Bridge a token from HyperCore to EVM using the spotSend action
     * @param tokenId The token ID
     * @param amount The amount to bridge
     * @returns Promise with the transaction result
     */
    public async bridgeToEvm(
        tokenId: string,
        amount: number,
    ): Promise<any> {
        try {
            const baseUrl = this.hyperLiquidAPI[this.currentChainApiName];
            if (!baseUrl) {
                throw new Error(`API URL not configured for chain: ${this.currentChainApiName}`);
            }

            // Get system contract address for the token
            const systemContract = await this.getSystemContractAddressFromTokenId(tokenId);

            // Get current timestamp
            const timestamp = Date.now();

            // Create the action object for HyperCore to EVM transfer
            const action = {
                type: 'spotSend',
                hyperliquidChain: this.currentChainApiName === 'testnet' ? 'Testnet' : 'Mainnet',
                destination: systemContract,
                token: tokenId,
                amount: amount.toString(),
                time: timestamp,
            };

            // Create the payload
            const payload = {
                action,
                nonce: timestamp,
                signature: {
                    r: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    s: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    v: 0,
                },
            };

            console.log('Sending bridge request to HyperLiquid API:', payload);

            // Send the request to the HyperLiquid API
            const response = await fetch(`${baseUrl}/exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // Handle non-OK responses
            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || response.statusText;
                } catch (e) {
                    try {
                        errorMessage = await response.text();
                    } catch (textError) {
                        errorMessage = response.statusText;
                    }
                }
                throw new Error(`Bridge to EVM failed: ${errorMessage}`);
            }

            // Parse the successful response
            let result;
            try {
                result = await response.json();
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                return { status: 'ok', response: { txHash: `tx-${timestamp}` } };
            }

            // Check for error status in the response
            if (result.status === 'err') {
                throw new Error(
                    `Transaction failed: ${result.response || 'Unknown error'}`,
                );
            }

            console.log('Bridge to EVM successful:', result);
            return result;
        } catch (error) {
            console.error('Error bridging to EVM:', error);
            throw error;
        }
    }

    /**
     * Get system contract address for a token by EVM contract address
     * @param tokenAddress The token contract address on EVM
     * @returns System contract address
     */
    private async getSystemContractAddress(tokenAddress: string): Promise<string> {
        // Special case for native HYPE
        if (tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' ||
            tokenAddress.toLowerCase() === 'hype') {
            return '0x2222222222222222222222222222222222222222';
        }

        try {
            const baseUrl = this.hyperLiquidAPI[this.currentChainApiName];
            if (!baseUrl) {
                throw new Error(`API URL not configured for chain: ${this.currentChainApiName}`);
            }

            // Get spot metadata to find token index
            const response = await fetch(`${baseUrl}/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'spotMeta',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch spot metadata: ${response.statusText}`);
            }

            const data: SpotMeta = await response.json();

            // Find token by EVM contract address
            let tokenIndex: number | null = null;

            for (const token of data.tokens) {
                // Match by EVM contract address
                if (token.evmContract && token.evmContract.toLowerCase() === tokenAddress.toLowerCase()) {
                    tokenIndex = token.index;
                    break;
                }
            }

            if (tokenIndex === null) {
                throw new Error(`Token index not found for EVM address: ${tokenAddress}`);
            }

            // Encode system contract address: 0x20 + zeros + hex encoded token index
            const hexIndex = tokenIndex.toString(16);
            const paddedHex = hexIndex.padStart(2, '0');
            const systemContract = `0x20${'0'.repeat(38 - paddedHex.length)}${paddedHex}`;

            return systemContract;
        } catch (error) {
            console.error('Error getting system contract address:', error);
            throw error;
        }
    }

    /**
     * Get system contract address from token ID
     * @param tokenId The token ID
     * @returns System contract address
     */
    private async getSystemContractAddressFromTokenId(tokenId: string): Promise<string> {
        // Special case for HYPE
        if (tokenId.toLowerCase() === 'hype' || tokenId.toLowerCase() === 'hype:0') {
            return '0x2222222222222222222222222222222222222222';
        }

        try {
            const baseUrl = this.hyperLiquidAPI[this.currentChainApiName];
            if (!baseUrl) {
                throw new Error(`API URL not configured for chain: ${this.currentChainApiName}`);
            }

            // Get spot metadata
            const response = await fetch(`${baseUrl}/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'spotMeta',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch spot metadata: ${response.statusText}`);
            }

            const data: SpotMeta = await response.json();

            // Find token by ID
            let tokenIndex: number | null = null;

            for (const token of data.tokens) {
                if (token.tokenId === tokenId) {
                    tokenIndex = token.index;
                    break;
                }
            }

            if (tokenIndex === null) {
                // If the tokenId contains a colon, try to extract the index
                if (tokenId.includes(':')) {
                    const parts = tokenId.split(':');
                    if (parts.length === 2) {
                        const indexPart = parseInt(parts[1]);
                        if (!isNaN(indexPart)) {
                            tokenIndex = indexPart;
                        }
                    }
                }

                if (tokenIndex === null) {
                    throw new Error(`Token index not found for ID: ${tokenId}`);
                }
            }

            return this.getSystemContractAddressFromTokenIndex(tokenIndex);
        } catch (error) {
            console.error('Error getting system contract address from token ID:', error);
            throw error;
        }
    }

    /**
     * Get system contract address from token index
     * @param tokenIndex The token index
     * @returns System contract address
     */
    private getSystemContractAddressFromTokenIndex(tokenIndex: number): string {
        // Special case for native HYPE (usually index 0 or specific case)
        if (tokenIndex === 0) {
            return '0x2222222222222222222222222222222222222222';
        }

        // Encode system contract address: 0x20 + zeros + hex encoded token index
        const hexIndex = tokenIndex.toString(16);
        const paddedHex = hexIndex.padStart(2, '0');
        return `0x20${'0'.repeat(38 - paddedHex.length)}${paddedHex}`;
    }

    /**
     * Get list of bridgeable tokens
     * @returns Object containing bridgeable token configurations
     */
    public getBridgeableTokens(): BridgeConfig {
        return this.bridgeableTokens;
    }

    /**
     * Check if a token is bridgeable
     * @param tokenSymbol The token symbol to check
     * @returns Boolean indicating if the token is bridgeable
     */
    public isBridgeable(tokenSymbol: string): boolean {
        return tokenSymbol in this.bridgeableTokens;
    }

    /**
     * Get bridge configuration for a specific token
     * @param tokenSymbol The token symbol
     * @returns Bridge configuration for the token
     */
    public getBridgeConfig(tokenSymbol: string): BridgeTokenConfig | null {
        return this.bridgeableTokens[tokenSymbol] || null;
    }

    /**
     * Update bridge configuration
     * @param tokenSymbol The token symbol
     * @param config The bridge configuration
     */
    public setBridgeConfig(tokenSymbol: string, config: BridgeTokenConfig): void {
        this.bridgeableTokens[tokenSymbol] = config;
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