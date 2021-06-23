//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Token.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';

contract TokenFactory {
    address public uniFactoryAddr;
    address public ethAddr;

    event TokenCreated(address tokenAddress);
    event TokenCreated2(address tokenAddress, uint256 salt);

    constructor(address uniFactoryAddr_, address ethAddr_) {
        uniFactoryAddr = uniFactoryAddr_;
        ethAddr = ethAddr_;
    }

    function deployNewToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply
    ) public {
        Token t = new Token(name, symbol, totalSupply, msg.sender);
        emit TokenCreated(address(t));
        _addUniPair(address(t));
    }

    function _addUniPair(address _newToken) internal {
        IUniswapV2Factory uniFactory = IUniswapV2Factory(uniFactoryAddr);
        uniFactory.createPair(_newToken, ethAddr);
    }
}
