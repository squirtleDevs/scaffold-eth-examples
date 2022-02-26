const fs = require("fs");
const chalk = require("chalk");
const { config, ethers, tenderly, run } = require("hardhat");
const { utils } = require("ethers");
const R = require("ramda");


const main = async () => {

    console.log("\n\n 📡 Deploying...\n");

    const address = 0x150C3853001B6152E8624CbDAa4C585AF8046EcC;

console.log(chalk.blue('verifying on etherscan'))
await sleep( 60000 ) // wait 5 seconds for deployment to propagate
await run("verify:verify", {
  address: MetaMultiSig.address,
  contract: "contracts/MetaMultiSig.sol:MetaMultiSig",
  constructorArguments: []
  
  // If your contract has constructor arguments, you can pass them as an array
}
);


console.log(
  " 💾  Artifacts (address, abi, and args) saved to: ",
  chalk.blue("packages/hardhat/artifacts/"),
  "\n\n"
);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });