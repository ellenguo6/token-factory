const { expect, assert } = require("chai");
const uniV2FactoryAbi =
  require("@uniswap/v2-core/build/UniswapV2Factory.json").abi;

const ethAddr = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const uniV2FactoryAddr = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const uniV2FactoryContract = new ethers.Contract(
  uniV2FactoryAddr,
  uniV2FactoryAbi,
  ethers.provider
);

describe("Token Factory", function () {
  let tokenFactory;

  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy(uniV2FactoryAddr, ethAddr);
  });

  describe(`Deploy Token`, function () {
    const tokenName = "PopCoin"; // my dog's name is Popcorn <3
    const tokenSymbol = "POP";
    const totalSupply = 1000;
    let salt;

    let tokenTxn;
    let events;
    let tokenAddr;
    let token;

    it(`${tokenName} deployed at correct CREATE2 address`, async function () {
      const Token = await ethers.getContractFactory("Token");

      // Use CREATE2 to calculate new token address
      // constructor arguments are appended to contract bytecode
      const bytecode = `${Token.bytecode}${encodeParams(
        ["string", "string", "uint256", "address"],
        [tokenName, tokenSymbol, totalSupply, owner.address]
      ).slice(2)}`;

      salt = getSaltFromName(tokenName);

      const computedAddr = buildCreate2Address(
        tokenFactory.address,
        salt,
        bytecode
      );
      expect(await isContract(computedAddr)).to.equal(false); // not yet deployed on-chain

      // Now actually deploy the token contract
      tokenTxn = await tokenFactory.deployNewToken(
        tokenName,
        tokenSymbol,
        totalSupply
      );
      const txnLogs = await tokenTxn.wait();
      events = txnLogs.events;

      // Confirm that we are getting the tokenAddress from the right event
      assert(events[1].event == "Deployed");
      tokenAddr = events[1].args.tokenAddress;

      // attach the deployed contract to the ethers contractFactory abstraction
      token = await Token.attach(tokenAddr);

      expect(await isContract(computedAddr)).to.equal(true); // now is deployed on-chain
      // check that the precomputed address matches the actual deployed address
      expect(ethers.utils.getAddress(computedAddr)).to.equal(
        ethers.utils.getAddress(tokenAddr)
      );
    });

    it(`${tokenName} deployment emits Deployed event with correct arguments`, async function () {
      await expect(tokenTxn)
        .to.emit(tokenFactory, "Deployed")
        .withArgs(tokenAddr, salt);
    });

    it(`${tokenName} totalSupply should be ${totalSupply}`, async function () {
      expect(await token.totalSupply()).to.equal(totalSupply);
    });

    it(`${tokenName} deployer should own totalSupply`, async function () {
      expect(await token.totalSupply()).to.equal(
        await token.balanceOf(owner.address)
      );
    });

    describe(`Create ${tokenName} pair on Uniswap V2`, function () {
      it(`PairCreated event emitted with correct token contract addresses`, async function () {
        await expect(tokenTxn).to.emit(uniV2FactoryContract, "PairCreated");

        const iface = new ethers.utils.Interface(uniV2FactoryAbi);
        const pairCreatedLog = iface.decodeEventLog(
          "PairCreated",
          events[2].data,
          events[2].topics
        );

        let tokens = [ethAddr.toLowerCase(), tokenAddr.toLowerCase()];
        tokens.sort(); // pair addresses in PairCreated event are ordered

        expect(ethers.utils.getAddress(pairCreatedLog.token0)).to.equal(
          ethers.utils.getAddress(tokens[0])
        );
        expect(ethers.utils.getAddress(pairCreatedLog.token1)).to.equal(
          ethers.utils.getAddress(tokens[1])
        );
      });
    });
  });
});

// HELPER FUNCTIONS FOR CREATE2

// deterministically computes the smart contract address given
// the account the will deploy the contract (factory contract)
// the salt as uint256 and the contract bytecode
function buildCreate2Address(creatorAddress, saltHex, byteCode) {
  return `0x${ethers.utils
    .keccak256(
      `0x${["ff", creatorAddress, saltHex, ethers.utils.keccak256(byteCode)]
        .map((x) => x.replace(/0x/, ""))
        .join("")}`
    )
    .slice(-40)}`.toLowerCase();
}

// converts an int to uint256
function numberToUint256(value) {
  const hex = value.toString(16);
  return `0x${"0".repeat(64 - hex.length)}${hex}`;
}

// encodes parameters to pass as contract argument
function encodeParams(dataTypes, data) {
  const abiCoder = ethers.utils.defaultAbiCoder;
  return abiCoder.encode(dataTypes, data);
}

// returns true if contract is deployed on-chain
async function isContract(address) {
  const code = await ethers.provider.getCode(address);
  return code.slice(2).length > 0;
}

// returns hex string
function getSaltFromName(name) {
  const abiCoder = ethers.utils.defaultAbiCoder;
  return ethers.utils.keccak256(abiCoder.encode(["string"], [name]));
}
