/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  ContractTransaction,
  Overrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type {
  FunctionFragment,
  Result,
  EventFragment,
} from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
} from "./common";

export interface OracleChainlinkInterface extends utils.Interface {
  functions: {
    "BASE_TOKEN()": FunctionFragment;
    "CHAINLINK_DIVIDE_ADDRESS()": FunctionFragment;
    "CHAINLINK_MULTIPLY_ADDRESS()": FunctionFragment;
    "CHAINLINK_NORMALIZATION()": FunctionFragment;
    "ORACLE_PRECISION()": FunctionFragment;
    "QUOTE_TOKEN()": FunctionFragment;
    "acceptTransferTimelock()": FunctionFragment;
    "decimals()": FunctionFragment;
    "getPrices()": FunctionFragment;
    "maxOracleDelay()": FunctionFragment;
    "name()": FunctionFragment;
    "oracleType()": FunctionFragment;
    "pendingTimelockAddress()": FunctionFragment;
    "renounceTimelock()": FunctionFragment;
    "setMaxOracleDelay(uint256)": FunctionFragment;
    "timelockAddress()": FunctionFragment;
    "transferTimelock(address)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "BASE_TOKEN"
      | "CHAINLINK_DIVIDE_ADDRESS"
      | "CHAINLINK_MULTIPLY_ADDRESS"
      | "CHAINLINK_NORMALIZATION"
      | "ORACLE_PRECISION"
      | "QUOTE_TOKEN"
      | "acceptTransferTimelock"
      | "decimals"
      | "getPrices"
      | "maxOracleDelay"
      | "name"
      | "oracleType"
      | "pendingTimelockAddress"
      | "renounceTimelock"
      | "setMaxOracleDelay"
      | "timelockAddress"
      | "transferTimelock"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "BASE_TOKEN",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "CHAINLINK_DIVIDE_ADDRESS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "CHAINLINK_MULTIPLY_ADDRESS",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "CHAINLINK_NORMALIZATION",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "ORACLE_PRECISION",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "QUOTE_TOKEN",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "acceptTransferTimelock",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
  encodeFunctionData(functionFragment: "getPrices", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "maxOracleDelay",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "name", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "oracleType",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "pendingTimelockAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "renounceTimelock",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setMaxOracleDelay",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "timelockAddress",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "transferTimelock",
    values: [string]
  ): string;

  decodeFunctionResult(functionFragment: "BASE_TOKEN", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "CHAINLINK_DIVIDE_ADDRESS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "CHAINLINK_MULTIPLY_ADDRESS",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "CHAINLINK_NORMALIZATION",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "ORACLE_PRECISION",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "QUOTE_TOKEN",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "acceptTransferTimelock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getPrices", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "maxOracleDelay",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "oracleType", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "pendingTimelockAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "renounceTimelock",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setMaxOracleDelay",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "timelockAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferTimelock",
    data: BytesLike
  ): Result;

  events: {
    "SetMaxOracleDelay(uint256,uint256)": EventFragment;
    "TimelockTransferStarted(address,address)": EventFragment;
    "TimelockTransferred(address,address)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "SetMaxOracleDelay"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TimelockTransferStarted"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "TimelockTransferred"): EventFragment;
}

export interface SetMaxOracleDelayEventObject {
  oldMaxOracleDelay: BigNumber;
  newMaxOracleDelay: BigNumber;
}
export type SetMaxOracleDelayEvent = TypedEvent<
  [BigNumber, BigNumber],
  SetMaxOracleDelayEventObject
>;

export type SetMaxOracleDelayEventFilter =
  TypedEventFilter<SetMaxOracleDelayEvent>;

export interface TimelockTransferStartedEventObject {
  previousTimelock: string;
  newTimelock: string;
}
export type TimelockTransferStartedEvent = TypedEvent<
  [string, string],
  TimelockTransferStartedEventObject
>;

export type TimelockTransferStartedEventFilter =
  TypedEventFilter<TimelockTransferStartedEvent>;

export interface TimelockTransferredEventObject {
  previousTimelock: string;
  newTimelock: string;
}
export type TimelockTransferredEvent = TypedEvent<
  [string, string],
  TimelockTransferredEventObject
>;

export type TimelockTransferredEventFilter =
  TypedEventFilter<TimelockTransferredEvent>;

export interface OracleChainlink extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: OracleChainlinkInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    BASE_TOKEN(overrides?: CallOverrides): Promise<[string]>;

    CHAINLINK_DIVIDE_ADDRESS(overrides?: CallOverrides): Promise<[string]>;

    CHAINLINK_MULTIPLY_ADDRESS(overrides?: CallOverrides): Promise<[string]>;

    CHAINLINK_NORMALIZATION(overrides?: CallOverrides): Promise<[BigNumber]>;

    ORACLE_PRECISION(overrides?: CallOverrides): Promise<[BigNumber]>;

    QUOTE_TOKEN(overrides?: CallOverrides): Promise<[string]>;

    acceptTransferTimelock(
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    decimals(overrides?: CallOverrides): Promise<[number]>;

    getPrices(
      overrides?: CallOverrides
    ): Promise<
      [boolean, BigNumber, BigNumber] & {
        _isBadData: boolean;
        _priceLow: BigNumber;
        _priceHigh: BigNumber;
      }
    >;

    maxOracleDelay(overrides?: CallOverrides): Promise<[BigNumber]>;

    name(overrides?: CallOverrides): Promise<[string]>;

    oracleType(overrides?: CallOverrides): Promise<[BigNumber]>;

    pendingTimelockAddress(overrides?: CallOverrides): Promise<[string]>;

    renounceTimelock(
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    setMaxOracleDelay(
      _newMaxOracleDelay: BigNumberish,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    timelockAddress(overrides?: CallOverrides): Promise<[string]>;

    transferTimelock(
      _newTimelock: string,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;
  };

  BASE_TOKEN(overrides?: CallOverrides): Promise<string>;

  CHAINLINK_DIVIDE_ADDRESS(overrides?: CallOverrides): Promise<string>;

  CHAINLINK_MULTIPLY_ADDRESS(overrides?: CallOverrides): Promise<string>;

  CHAINLINK_NORMALIZATION(overrides?: CallOverrides): Promise<BigNumber>;

  ORACLE_PRECISION(overrides?: CallOverrides): Promise<BigNumber>;

  QUOTE_TOKEN(overrides?: CallOverrides): Promise<string>;

  acceptTransferTimelock(
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  decimals(overrides?: CallOverrides): Promise<number>;

  getPrices(
    overrides?: CallOverrides
  ): Promise<
    [boolean, BigNumber, BigNumber] & {
      _isBadData: boolean;
      _priceLow: BigNumber;
      _priceHigh: BigNumber;
    }
  >;

  maxOracleDelay(overrides?: CallOverrides): Promise<BigNumber>;

  name(overrides?: CallOverrides): Promise<string>;

  oracleType(overrides?: CallOverrides): Promise<BigNumber>;

  pendingTimelockAddress(overrides?: CallOverrides): Promise<string>;

  renounceTimelock(
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  setMaxOracleDelay(
    _newMaxOracleDelay: BigNumberish,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  timelockAddress(overrides?: CallOverrides): Promise<string>;

  transferTimelock(
    _newTimelock: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  callStatic: {
    BASE_TOKEN(overrides?: CallOverrides): Promise<string>;

    CHAINLINK_DIVIDE_ADDRESS(overrides?: CallOverrides): Promise<string>;

    CHAINLINK_MULTIPLY_ADDRESS(overrides?: CallOverrides): Promise<string>;

    CHAINLINK_NORMALIZATION(overrides?: CallOverrides): Promise<BigNumber>;

    ORACLE_PRECISION(overrides?: CallOverrides): Promise<BigNumber>;

    QUOTE_TOKEN(overrides?: CallOverrides): Promise<string>;

    acceptTransferTimelock(overrides?: CallOverrides): Promise<void>;

    decimals(overrides?: CallOverrides): Promise<number>;

    getPrices(
      overrides?: CallOverrides
    ): Promise<
      [boolean, BigNumber, BigNumber] & {
        _isBadData: boolean;
        _priceLow: BigNumber;
        _priceHigh: BigNumber;
      }
    >;

    maxOracleDelay(overrides?: CallOverrides): Promise<BigNumber>;

    name(overrides?: CallOverrides): Promise<string>;

    oracleType(overrides?: CallOverrides): Promise<BigNumber>;

    pendingTimelockAddress(overrides?: CallOverrides): Promise<string>;

    renounceTimelock(overrides?: CallOverrides): Promise<void>;

    setMaxOracleDelay(
      _newMaxOracleDelay: BigNumberish,
      overrides?: CallOverrides
    ): Promise<void>;

    timelockAddress(overrides?: CallOverrides): Promise<string>;

    transferTimelock(
      _newTimelock: string,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "SetMaxOracleDelay(uint256,uint256)"(
      oldMaxOracleDelay?: null,
      newMaxOracleDelay?: null
    ): SetMaxOracleDelayEventFilter;
    SetMaxOracleDelay(
      oldMaxOracleDelay?: null,
      newMaxOracleDelay?: null
    ): SetMaxOracleDelayEventFilter;

    "TimelockTransferStarted(address,address)"(
      previousTimelock?: string | null,
      newTimelock?: string | null
    ): TimelockTransferStartedEventFilter;
    TimelockTransferStarted(
      previousTimelock?: string | null,
      newTimelock?: string | null
    ): TimelockTransferStartedEventFilter;

    "TimelockTransferred(address,address)"(
      previousTimelock?: string | null,
      newTimelock?: string | null
    ): TimelockTransferredEventFilter;
    TimelockTransferred(
      previousTimelock?: string | null,
      newTimelock?: string | null
    ): TimelockTransferredEventFilter;
  };

  estimateGas: {
    BASE_TOKEN(overrides?: CallOverrides): Promise<BigNumber>;

    CHAINLINK_DIVIDE_ADDRESS(overrides?: CallOverrides): Promise<BigNumber>;

    CHAINLINK_MULTIPLY_ADDRESS(overrides?: CallOverrides): Promise<BigNumber>;

    CHAINLINK_NORMALIZATION(overrides?: CallOverrides): Promise<BigNumber>;

    ORACLE_PRECISION(overrides?: CallOverrides): Promise<BigNumber>;

    QUOTE_TOKEN(overrides?: CallOverrides): Promise<BigNumber>;

    acceptTransferTimelock(
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    decimals(overrides?: CallOverrides): Promise<BigNumber>;

    getPrices(overrides?: CallOverrides): Promise<BigNumber>;

    maxOracleDelay(overrides?: CallOverrides): Promise<BigNumber>;

    name(overrides?: CallOverrides): Promise<BigNumber>;

    oracleType(overrides?: CallOverrides): Promise<BigNumber>;

    pendingTimelockAddress(overrides?: CallOverrides): Promise<BigNumber>;

    renounceTimelock(
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    setMaxOracleDelay(
      _newMaxOracleDelay: BigNumberish,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    timelockAddress(overrides?: CallOverrides): Promise<BigNumber>;

    transferTimelock(
      _newTimelock: string,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    BASE_TOKEN(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    CHAINLINK_DIVIDE_ADDRESS(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    CHAINLINK_MULTIPLY_ADDRESS(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    CHAINLINK_NORMALIZATION(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    ORACLE_PRECISION(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    QUOTE_TOKEN(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    acceptTransferTimelock(
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    decimals(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getPrices(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    maxOracleDelay(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    name(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    oracleType(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    pendingTimelockAddress(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    renounceTimelock(
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    setMaxOracleDelay(
      _newMaxOracleDelay: BigNumberish,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    timelockAddress(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    transferTimelock(
      _newTimelock: string,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;
  };
}
