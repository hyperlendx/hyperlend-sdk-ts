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

export interface HyperlendPairRegistryInterface extends utils.Interface {
  functions: {
    "acceptOwnership()": FunctionFragment;
    "addPair(address)": FunctionFragment;
    "deployedPairsArray(uint256)": FunctionFragment;
    "deployedPairsByName(string)": FunctionFragment;
    "deployedPairsLength()": FunctionFragment;
    "deployers(address)": FunctionFragment;
    "getAllPairAddresses()": FunctionFragment;
    "owner()": FunctionFragment;
    "pendingOwner()": FunctionFragment;
    "renounceOwnership()": FunctionFragment;
    "setDeployers(address[],bool)": FunctionFragment;
    "transferOwnership(address)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic:
      | "acceptOwnership"
      | "addPair"
      | "deployedPairsArray"
      | "deployedPairsByName"
      | "deployedPairsLength"
      | "deployers"
      | "getAllPairAddresses"
      | "owner"
      | "pendingOwner"
      | "renounceOwnership"
      | "setDeployers"
      | "transferOwnership"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "acceptOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "addPair", values: [string]): string;
  encodeFunctionData(
    functionFragment: "deployedPairsArray",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "deployedPairsByName",
    values: [string]
  ): string;
  encodeFunctionData(
    functionFragment: "deployedPairsLength",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "deployers", values: [string]): string;
  encodeFunctionData(
    functionFragment: "getAllPairAddresses",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "pendingOwner",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setDeployers",
    values: [string[], boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [string]
  ): string;

  decodeFunctionResult(
    functionFragment: "acceptOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "addPair", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "deployedPairsArray",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployedPairsByName",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployedPairsLength",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "deployers", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getAllPairAddresses",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "pendingOwner",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setDeployers",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;

  events: {
    "AddPair(address)": EventFragment;
    "OwnershipTransferStarted(address,address)": EventFragment;
    "OwnershipTransferred(address,address)": EventFragment;
    "SetDeployer(address,bool)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "AddPair"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "OwnershipTransferStarted"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "OwnershipTransferred"): EventFragment;
  getEvent(nameOrSignatureOrTopic: "SetDeployer"): EventFragment;
}

export interface AddPairEventObject {
  pairAddress: string;
}
export type AddPairEvent = TypedEvent<[string], AddPairEventObject>;

export type AddPairEventFilter = TypedEventFilter<AddPairEvent>;

export interface OwnershipTransferStartedEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferStartedEvent = TypedEvent<
  [string, string],
  OwnershipTransferStartedEventObject
>;

export type OwnershipTransferStartedEventFilter =
  TypedEventFilter<OwnershipTransferStartedEvent>;

export interface OwnershipTransferredEventObject {
  previousOwner: string;
  newOwner: string;
}
export type OwnershipTransferredEvent = TypedEvent<
  [string, string],
  OwnershipTransferredEventObject
>;

export type OwnershipTransferredEventFilter =
  TypedEventFilter<OwnershipTransferredEvent>;

export interface SetDeployerEventObject {
  deployer: string;
  _bool: boolean;
}
export type SetDeployerEvent = TypedEvent<
  [string, boolean],
  SetDeployerEventObject
>;

export type SetDeployerEventFilter = TypedEventFilter<SetDeployerEvent>;

export interface HyperlendPairRegistry extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: HyperlendPairRegistryInterface;

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
    acceptOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    addPair(
      _pairAddress: string,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    deployedPairsArray(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[string]>;

    deployedPairsByName(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<[string]>;

    deployedPairsLength(overrides?: CallOverrides): Promise<[BigNumber]>;

    deployers(arg0: string, overrides?: CallOverrides): Promise<[boolean]>;

    getAllPairAddresses(
      overrides?: CallOverrides
    ): Promise<[string[]] & { _deployedPairsArray: string[] }>;

    owner(overrides?: CallOverrides): Promise<[string]>;

    pendingOwner(overrides?: CallOverrides): Promise<[string]>;

    renounceOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    setDeployers(
      _deployers: string[],
      _bool: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string }
    ): Promise<ContractTransaction>;
  };

  acceptOwnership(
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  addPair(
    _pairAddress: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  deployedPairsArray(
    arg0: BigNumberish,
    overrides?: CallOverrides
  ): Promise<string>;

  deployedPairsByName(arg0: string, overrides?: CallOverrides): Promise<string>;

  deployedPairsLength(overrides?: CallOverrides): Promise<BigNumber>;

  deployers(arg0: string, overrides?: CallOverrides): Promise<boolean>;

  getAllPairAddresses(overrides?: CallOverrides): Promise<string[]>;

  owner(overrides?: CallOverrides): Promise<string>;

  pendingOwner(overrides?: CallOverrides): Promise<string>;

  renounceOwnership(
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  setDeployers(
    _deployers: string[],
    _bool: boolean,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  transferOwnership(
    newOwner: string,
    overrides?: Overrides & { from?: string }
  ): Promise<ContractTransaction>;

  callStatic: {
    acceptOwnership(overrides?: CallOverrides): Promise<void>;

    addPair(_pairAddress: string, overrides?: CallOverrides): Promise<void>;

    deployedPairsArray(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<string>;

    deployedPairsByName(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<string>;

    deployedPairsLength(overrides?: CallOverrides): Promise<BigNumber>;

    deployers(arg0: string, overrides?: CallOverrides): Promise<boolean>;

    getAllPairAddresses(overrides?: CallOverrides): Promise<string[]>;

    owner(overrides?: CallOverrides): Promise<string>;

    pendingOwner(overrides?: CallOverrides): Promise<string>;

    renounceOwnership(overrides?: CallOverrides): Promise<void>;

    setDeployers(
      _deployers: string[],
      _bool: boolean,
      overrides?: CallOverrides
    ): Promise<void>;

    transferOwnership(
      newOwner: string,
      overrides?: CallOverrides
    ): Promise<void>;
  };

  filters: {
    "AddPair(address)"(pairAddress?: null): AddPairEventFilter;
    AddPair(pairAddress?: null): AddPairEventFilter;

    "OwnershipTransferStarted(address,address)"(
      previousOwner?: string | null,
      newOwner?: string | null
    ): OwnershipTransferStartedEventFilter;
    OwnershipTransferStarted(
      previousOwner?: string | null,
      newOwner?: string | null
    ): OwnershipTransferStartedEventFilter;

    "OwnershipTransferred(address,address)"(
      previousOwner?: string | null,
      newOwner?: string | null
    ): OwnershipTransferredEventFilter;
    OwnershipTransferred(
      previousOwner?: string | null,
      newOwner?: string | null
    ): OwnershipTransferredEventFilter;

    "SetDeployer(address,bool)"(
      deployer?: null,
      _bool?: null
    ): SetDeployerEventFilter;
    SetDeployer(deployer?: null, _bool?: null): SetDeployerEventFilter;
  };

  estimateGas: {
    acceptOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    addPair(
      _pairAddress: string,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    deployedPairsArray(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    deployedPairsByName(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    deployedPairsLength(overrides?: CallOverrides): Promise<BigNumber>;

    deployers(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    getAllPairAddresses(overrides?: CallOverrides): Promise<BigNumber>;

    owner(overrides?: CallOverrides): Promise<BigNumber>;

    pendingOwner(overrides?: CallOverrides): Promise<BigNumber>;

    renounceOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    setDeployers(
      _deployers: string[],
      _bool: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string }
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    acceptOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    addPair(
      _pairAddress: string,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    deployedPairsArray(
      arg0: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    deployedPairsByName(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    deployedPairsLength(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    deployers(
      arg0: string,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getAllPairAddresses(
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    owner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    pendingOwner(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    renounceOwnership(
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    setDeployers(
      _deployers: string[],
      _bool: boolean,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;

    transferOwnership(
      newOwner: string,
      overrides?: Overrides & { from?: string }
    ): Promise<PopulatedTransaction>;
  };
}
