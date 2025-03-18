// src/types/ReserveData.ts
import { BigNumber } from "ethers";

export interface ReserveData {
    symbol: string;
    tokenAddress: string;
    hTokenAddress: string;
    stableDebtTokenAddress: string;
    variableDebtTokenAddress: string;
    decimals: number;
    ltv: number;
    liquidationThreshold: number;
    liquidationBonus: number;
    reserveFactor: number;
    usageAsCollateralEnabled: boolean;
    borrowingEnabled: boolean;
    stableBorrowRateEnabled: boolean;
    isActive: boolean;
    isFrozen: boolean;

    // Keep numeric values as BigNumber to prevent overflow
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