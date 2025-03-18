import { ethers } from 'ethers';
import { HyperlendSDK } from './HyperlendSDK';
import * as dotenv from 'dotenv';
import { HyperlendPairRegistry__factory } from './types';

// Load environment variables
dotenv.config();

// Replace these with your actual values
const RPC_URL = process.env.RPC_URL!; // e.g., Hyperliquid Testnet RPC URL
const PRIVATE_KEY = process.env.PRIVATE_KEY!; // Your wallet's private key
const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS!; // Deployed registry contract address
const PAIR_ADDRESS = process.env.PAIR_ADDRESS!; // Deployed pair contract address
const USER_ADDRESS = process.env.USER_ADDRESS!; // User's Ethereum address

async function main() {
    // Validate environment variables
    if (!RPC_URL || !PRIVATE_KEY || !REGISTRY_ADDRESS || !PAIR_ADDRESS || !USER_ADDRESS) {
        throw new Error('Missing required environment variables. Check your .env file.');
    }

    // Initialize the provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // Initialize the SDK
    const sdk = new HyperlendSDK(wallet, REGISTRY_ADDRESS);

    // ===============================
    // Pair Registry Functions
    // ===============================

    console.log('Testing getDeployedPairsLength...');
    const length = await sdk.getDeployedPairsLength();
    console.log(`Deployed pairs length: ${length.toString()}`);

    console.log('Testing getAllPairAddresses...');
    const pairAddresses = await sdk.getAllPairAddresses();
    console.log('All pair addresses:', pairAddresses);

    console.log('Testing isDeployer...');
    const deployerAddress = wallet.address;
    const isDeployer = await sdk.isDeployer(deployerAddress);
    console.log(`Is ${deployerAddress} a deployer?`, isDeployer);

    console.log('Testing getPairAddressByName...');
    const pairName = 'TestPair'; // Replace with a valid pair name
    const pairAddressByName = await sdk.getPairAddressByName(pairName);
    console.log(`Pair address for name "${pairName}":`, pairAddressByName);

    // ===============================
    // Read Pair Data
    // ===============================

    console.log('Testing readPairData...');
    const pairData = await sdk.readPairData(PAIR_ADDRESS);
    console.log('Pair Data:', pairData);

    // ===============================
    // Read User Position
    // ===============================

    console.log('Testing readUserPosition...');
    const userPosition = await sdk.readUserPosition(PAIR_ADDRESS, USER_ADDRESS);
    console.log('User Position:', userPosition);

    // ===============================
    // Manage User Positions
    // ===============================

    const amount = ethers.utils.parseEther('1'); // 1 ETH or token
    const collateralAmount = ethers.utils.parseEther('0.5'); // 0.5 ETH or token
    const shares = ethers.utils.parseEther('1'); // 1 share

    console.log('Testing withdraw...');
    await sdk.withdraw(PAIR_ADDRESS, shares, USER_ADDRESS);

    console.log('Testing supply...');
    await sdk.supply(PAIR_ADDRESS, amount, USER_ADDRESS);

    console.log('Testing removeCollateral...');
    await sdk.removeCollateral(PAIR_ADDRESS, collateralAmount, USER_ADDRESS);

    console.log('Testing borrow...');
    await sdk.borrow(PAIR_ADDRESS, amount, collateralAmount, USER_ADDRESS);

    console.log('Testing addCollateral...');
    await sdk.addCollateral(PAIR_ADDRESS, collateralAmount, USER_ADDRESS);

    console.log('Testing repay...');
    await sdk.repay(PAIR_ADDRESS, shares, USER_ADDRESS);

    // ===============================
    // Additional Tests
    // ===============================

    console.log('Testing getTotalAsset...');
    const totalAsset = await sdk.getTotalAsset(PAIR_ADDRESS);
    console.log('Total Asset:', totalAsset.toString());

    console.log('Testing getTotalBorrow...');
    const totalBorrow = await sdk.getTotalBorrow(PAIR_ADDRESS);
    console.log('Total Borrow:', totalBorrow.toString());

    // Listen to AddPair event using the registry contract
    console.log('Testing onAddPair event listener...');
    const registryContract = HyperlendPairRegistry__factory.connect(REGISTRY_ADDRESS, wallet);
    registryContract.on('AddPair', (pairAddress: string) => {
        console.log(`New pair added via event: ${pairAddress}`);
    });

    // Transfer ownership of the registry contract
    console.log('Testing transferOwnership...');
    const newOwner = '0x0B37927864EFcEf9829B62cca4C9dC94553C51EA'; // Replace with a valid address
    if (!ethers.utils.isAddress(newOwner)) {
        throw new Error(`Invalid owner address: ${newOwner}`);
    }
    const txTransferOwnership = await registryContract.transferOwnership(newOwner);
    console.log(`Transaction sent: ${txTransferOwnership.hash}`);
    await txTransferOwnership.wait();
    console.log('Ownership transferred successfully.');

    // Accept ownership of the registry contract
    console.log('Testing acceptOwnership...');
    const pendingOwnerWallet = new ethers.Wallet(PRIVATE_KEY, provider); // Replace with the pending owner's wallet
    const txAcceptOwnership = await registryContract.connect(pendingOwnerWallet).acceptOwnership();
    console.log(`Transaction sent: ${txAcceptOwnership.hash}`);
    await txAcceptOwnership.wait();
    console.log('Ownership accepted successfully.');

    // Renounce ownership of the registry contract
    console.log('Testing renounceOwnership...');
    const txRenounceOwnership = await registryContract.connect(wallet).renounceOwnership();
    console.log(`Transaction sent: ${txRenounceOwnership.hash}`);
    await txRenounceOwnership.wait();
    console.log('Ownership renounced successfully.');

    // Paginate pair addresses
    console.log('Testing getPairAddressesPaginated...');
    const startIndex = 0;
    const endIndex = 5;
    const paginatedPairs = pairAddresses.slice(startIndex, endIndex);
    console.log('Paginated pair addresses:', paginatedPairs);
}

// Ensure the Promise returned by main is handled
(async () => {
    try {
        await main();
    } catch (error) {
        // Handle errors globally with meaningful logging
        if (error instanceof Error) {
            console.error('Error during testing:', error.message);
        } else {
            console.error('An unknown error occurred:', error);
        }
        process.exit(1); // Exit with a non-zero status code
    }
})();