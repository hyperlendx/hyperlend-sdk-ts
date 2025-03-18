// src/HyperlendSDKcore.ts
import { providers, Contract } from "ethers";
import { ProtocolDataProviderABI__factory } from "./typechain";
import { ReserveData } from "./types/ReserveData";

export class HyperlendSDKcore {
    private provider: providers.Provider;
    private dataProvider: Contract;

    constructor(provider: providers.Provider, dataProviderAddress: string) {
        this.provider = provider;
        this.dataProvider = ProtocolDataProviderABI__factory.connect(
            dataProviderAddress,
            provider
        );
    }

    public async getAllReservesTokens() {
        try {
            const reserves = await this.dataProvider.getAllReservesTokens();
            return reserves.map((reserve: any) => ({
                symbol: reserve.symbol,
                tokenAddress: reserve.tokenAddress,
            }));
        } catch (error) {
            console.error('Error getting all reserves tokens:', error);
            throw error;
        }
    }

    public async getAllReservesData(): Promise<ReserveData[]> {
        try {
            const reserves = await this.getAllReservesTokens();
            const reservesData: ReserveData[] = [];

            for (const reserve of reserves) {
                const data = await this.getReserveData(reserve.tokenAddress);
                reservesData.push(data);
            }

            return reservesData;
        } catch (error) {
            console.error('Error getting all reserves data:', error);
            throw error;
        }
    }

    public async getReserveData(asset: string): Promise<ReserveData> {
        try {
            const rawData = await this.dataProvider.getReserveData(asset);
            const tokenData = await this.dataProvider.getReserveConfigurationData(asset);
            const tokenDetails = await this.dataProvider.getReserveTokensAddresses(asset);

            // Find the symbol for this asset
            const allTokens = await this.getAllReservesTokens();
            // Fix: Add explicit type for the parameter 't'
            const tokenInfo = allTokens.find((t: { symbol: string; tokenAddress: string }) =>
                t.tokenAddress.toLowerCase() === asset.toLowerCase()
            );

            return {
                symbol: tokenInfo?.symbol || 'Unknown',
                tokenAddress: asset,
                hTokenAddress: tokenDetails.aTokenAddress,
                stableDebtTokenAddress: tokenDetails.stableDebtTokenAddress,
                variableDebtTokenAddress: tokenDetails.variableDebtTokenAddress,
                decimals: tokenData.decimals,
                ltv: tokenData.ltv,
                liquidationThreshold: tokenData.liquidationThreshold,
                liquidationBonus: tokenData.liquidationBonus,
                reserveFactor: tokenData.reserveFactor,
                usageAsCollateralEnabled: tokenData.usageAsCollateralEnabled,
                borrowingEnabled: tokenData.borrowingEnabled,
                stableBorrowRateEnabled: tokenData.stableBorrowRateEnabled,
                isActive: tokenData.isActive,
                isFrozen: tokenData.isFrozen,

                // Keep these as BigNumber to prevent overflow
                availableLiquidity: rawData.availableLiquidity,
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