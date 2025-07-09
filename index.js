console.log("Starting...");
import "dotenv/config";
import { Web3 } from "web3";
import swapRouterABI from "./uniswap_router_abi.json" with { type: "json" };
import quoterAbi from "./quoter_abi.json" with {type : "json"}

// Setup Web3 provider
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.ALCHEMY_URL));

// Load Wallet
const account = web3.eth.accounts.privateKeyToAccount(process.env.PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

console.log("Wallet Address:", account.address);

// Uniswap V3 SwapRouter address (Sepolia Testnet)
const swapRouterAddress = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"; // ✅ Uniswap V3 SwapRouter
const quoterAddress = "0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3";

// Token addresses (WETH & example token, replace as needed)
const WETH_SEPOLIA = web3.utils.toChecksumAddress("0xfff9976782d46cc05630d1f6ebab18b2324d6b14"); // WETH Sepolia
const TOKEN_ADDRESS = web3.utils.toChecksumAddress("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"); // Example token (UNI)
const quoter = new web3.eth.Contract(quoterAbi, quoterAddress);

// Initialize the Uniswap V3 SwapRouter contract
const swapRouter = new web3.eth.Contract(swapRouterABI, swapRouterAddress);

// Fee tier for Uniswap V3 pool (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
const FEE_TIER = 3000; // Default: 0.3% pool

export const buyToken = async(amountETH) => {
    try {
        const amountInWei = web3.utils.toWei(amountETH.toString(), "ether");
        const estimatedOutMin = await getEstimatedOutput(amountInWei);

        // ✅ 1% Slippage Tolerance Fix
        const minAmountOut = (BigInt(estimatedOutMin.amountOut) * 99n) / 100n;
        console.log("Swapping ETH for tokens with min output:", minAmountOut.toString());

        const txData = swapRouter.methods.exactInputSingle({
            tokenIn: WETH_SEPOLIA,
            tokenOut: TOKEN_ADDRESS,
            fee: FEE_TIER,
            recipient: account.address,
            amountIn: amountInWei,
            amountOutMinimum: minAmountOut.toString(),
            sqrtPriceLimitX96: 0
        });

        const gasEstimate = await txData.estimateGas({ from: account.address, value: amountInWei });
        const gasLimit = BigInt(gasEstimate) + 50000n; // ✅ Extra buffer
        const gasPrice = await web3.eth.getGasPrice();

        const signedTx = await account.signTransaction({
            from: account.address, // ✅ Add this to avoid nonce issues
            to: swapRouterAddress,
            data: txData.encodeABI(),
            value: amountInWei,
            gas: gasLimit,
            gasPrice: gasPrice,
            chainId: 11155111
        });

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.log("Transaction Hash:", receipt.transactionHash);
    } catch (error) {
        console.error("Error in swapETHForToken:", error);
    }
}


// Helper function to calculate min tokens out
async function getEstimatedOutput(amountInWei) {
    try {
        console.log(`Fetching estimated output for ${amountInWei} ETH`);

        const amountOut = await quoter.methods.quoteExactInputSingle(
            {tokenIn: WETH_SEPOLIA,
            tokenOut: TOKEN_ADDRESS,
            fee: FEE_TIER,
            recipient: account.address,
            deadline: Math.floor(new Date().getTime() / 1000 + 60 * 10),
            amountIn: amountInWei,
            sqrtPriceLimitX96: 0,}
        ).call();

        console.log("Estimated token output:", amountOut);
        return amountOut;
    } catch (error) {
        console.error("Error calculating estimated output:", error);
        return "0";
    }
}

