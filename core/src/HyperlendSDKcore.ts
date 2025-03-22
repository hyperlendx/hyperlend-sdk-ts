import { providers, BigNumber } from "ethers";
import {
    AaveProtocolDataProviderABI__factory,
    PoolABI__factory,
    UiPoolDataProviderV3ABI__factory
} from "./typechain";

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
    lastUpdateTimestamp: number;
}

export class HyperlendSDKcore {
    private provider: providers.Provider;
    private dataProvider: ReturnType<typeof AaveProtocolDataProviderABI__factory.connect>;
    private pool: ReturnType<typeof PoolABI__factory.connect>;
    private uiDataProvider: ReturnType<typeof UiPoolDataProviderV3ABI__factory.connect>;

    constructor(
        provider: providers.Provider,
        dataProviderAddress: string,
        poolAddress: string,
        uiDataProviderAddress: string
    ) {
        this.provider = provider;
        this.dataProvider = AaveProtocolDataProviderABI__factory.connect(
            dataProviderAddress,
            provider
        );
        this.pool = PoolABI__factory.connect(
            poolAddress,
            provider
        );
        this.uiDataProvider = UiPoolDataProviderV3ABI__factory.connect(
            uiDataProviderAddress,
            provider
        );
    }

    public async getAllReservesTokens() {
        try {
            const reserves = await this.dataProvider.getAllReservesTokens();
            return reserves.map((reserve) => ({
                symbol: reserve.symbol,
                tokenAddress: reserve.tokenAddress,
            }));
        } catch (error) {
            console.error('Error getting all reserves tokens:', error);
            throw error;
        }
    }

    public async getAllATokens() {
        try {
            const aTokens = await this.dataProvider.getAllATokens();
            return aTokens.map((aToken) => ({
                symbol: aToken.symbol,
                tokenAddress: aToken.tokenAddress,
            }));
        } catch (error) {
            console.error('Error getting all aTokens:', error);
            throw error;
        }
    }

    public async getReservesList() {
        try {
            return await this.pool.getReservesList();
        } catch (error) {
            console.error('Error getting reserves list:', error);
            throw error;
        }
    }

    public async getUserAccountData(userAddress: string) {
        try {
            const data = await this.pool.getUserAccountData(userAddress);
            return {
                totalCollateralBase: data.totalCollateralBase,
                totalDebtBase: data.totalDebtBase,
                availableBorrowsBase: data.availableBorrowsBase,
                currentLiquidationThreshold: data.currentLiquidationThreshold,
                ltv: data.ltv,
                healthFactor: data.healthFactor
            };
        } catch (error) {
            console.error('Error getting user account data:', error);
            throw error;
        }
    }

    public async getDetailedReservesData(poolAddressProvider: string) {
        try {
            const [reservesData, baseData] = await this.uiDataProvider.getReservesData(poolAddressProvider);

            return {
                reserves: reservesData,
                baseCurrencyInfo: baseData
            };
        } catch (error) {
            console.error('Error getting detailed reserves data:', error);
            throw error;
        }
    }

    public async getUserReservesData(poolAddressProvider: string, userAddress: string) {
        try {
            const [userReserves, userEmode] = await this.uiDataProvider.getUserReservesData(
                poolAddressProvider,
                userAddress
            );

            return {
                userReserves,
                userEmode
            };
        } catch (error) {
            console.error('Error getting user reserves data:', error);
            throw error;
        }
    }

    public async getReserveData(asset: string): Promise<ReserveData> {
        try {
            const rawData = await this.dataProvider.getReserveData(asset);
            const configData = await this.dataProvider.getReserveConfigurationData(asset);
            const tokenAddresses = await this.dataProvider.getReserveTokensAddresses(asset);

            // Find the symbol for this asset
            const allTokens = await this.getAllReservesTokens();
            const tokenInfo = allTokens.find((t) =>
                t.tokenAddress.toLowerCase() === asset.toLowerCase()
            );

            return {
                symbol: tokenInfo?.symbol || 'Unknown',
                tokenAddress: asset,
                hTokenAddress: tokenAddresses.aTokenAddress,
                stableDebtTokenAddress: tokenAddresses.stableDebtTokenAddress,
                variableDebtTokenAddress: tokenAddresses.variableDebtTokenAddress,
                decimals: configData.decimals,
                ltv: configData.ltv,
                liquidationThreshold: configData.liquidationThreshold,
                liquidationBonus: configData.liquidationBonus,
                reserveFactor: configData.reserveFactor,
                usageAsCollateralEnabled: configData.usageAsCollateralEnabled,
                borrowingEnabled: configData.borrowingEnabled,
                stableBorrowRateEnabled: configData.stableBorrowRateEnabled,
                isActive: configData.isActive,
                isFrozen: configData.isFrozen,
                availableLiquidity: rawData.unbacked,
                totalStableDebt: rawData.totalStableDebt,
                totalVariableDebt: rawData.totalVariableDebt,
                liquidityRate: rawData.liquidityRate,
                variableBorrowRate: rawData.variableBorrowRate,
                stableBorrowRate: rawData.stableBorrowRate,
                averageStableBorrowRate: rawData.averageStableBorrowRate,
                liquidityIndex: rawData.liquidityIndex,
                variableBorrowIndex: rawData.variableBorrowIndex,
                lastUpdateTimestamp: rawData.lastUpdateTimestamp
            };
        } catch (error) {
            console.error('Error getting reserve data:', error);
            throw error;
        }
    }
}