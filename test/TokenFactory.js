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

  const tokenName = "PopCoin";
  const tokenSymbol = "POP";
  const totalSupply = 1000;

  let tokenTxn;
  let events;
  let tokenAddr;
  let token;

  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy(uniV2FactoryAddr, ethAddr);

    tokenTxn = await tokenFactory.deployNewToken(
      tokenName,
      tokenSymbol,
      totalSupply
    );
    const txnLogs = await tokenTxn.wait();
    events = txnLogs.events;

    // Confirm that we are getting the tokenAddress from the right event
    assert(events[1].event == "TokenCreated");
    tokenAddr = events[1].args.tokenAddress;

    const Token = await ethers.getContractFactory("Token");
    token = await Token.attach(tokenAddr);
  });

  describe(`Deploy ${tokenName}`, function () {
    it(`${tokenName} deployment emits TokenCreated event`, async function () {
      await expect(tokenTxn)
        .to.emit(tokenFactory, "TokenCreated")
        .withArgs(tokenAddr);
    });

    it(`${tokenName} totalSupply should be ${totalSupply}`, async function () {
      expect(await token.totalSupply()).to.equal(totalSupply);
    });

    it(`${tokenName} deployer should own totalSupply`, async function () {
      expect(await token.totalSupply()).to.equal(
        await token.balanceOf(owner.address)
      );
    });

    // it(`Deployer should transfer 20 tokens to addr1`, async function () {
    //   token.transfer(addr1.address, 20);
    //   expect(await token.balanceOf(owner.address)).to.equal(totalSupply - 20);
    //   expect(await token.balanceOf(addr1.address)).to.equal(20);
    // });

    // it(`Addr1 has 20 tokens and cannot transfer 30`, async function () {
    //   expect(await token.balanceOf(addr1.address)).to.equal(20);
    //   await expect(
    //     token.connect(addr1).transfer(owner.address, 30)
    //   ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    //   // balance of deployer should not change
    //   expect(await token.balanceOf(owner.address)).to.equal(totalSupply - 20);
    // });
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

      let tokens = [ethAddr, tokenAddr];
      tokens.sort();

      expect(ethers.utils.getAddress(pairCreatedLog.token0)).to.equal(
        ethers.utils.getAddress(tokens[0])
      );
      expect(ethers.utils.getAddress(pairCreatedLog.token1)).to.equal(
        ethers.utils.getAddress(tokens[1])
      );

      // let something = ethers.utils.solidityKeccak256(
      //   ["address", "address"],
      //   [tokens[0], tokens[1]]
      // );
      // let hash = ethers.utils.solidityKeccak256(
      //   ["address", "address", "string", "address"],
      //   [
      //     "0xff",
      //     uniV2FactoryAddr,
      //     something,
      //     "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f",
      //   ]
      // );
      // console.log(hash);
      // console.log(typeof hash);
    });

    // it(`Pair contract address matches CREATE2 address`, async function () {
    //   // const calculatedAddr = ethers.utils.keccak256(["0xff", uniV2FactoryAddr, ])
    // });
  });
});
