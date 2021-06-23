//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Token.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';

contract TokenFactory2 {
    address public uniFactoryAddr;
    address public ethAddr;

    event Deployed(address tokenAddress, uint256 salt);

    constructor(address uniFactoryAddr_, address ethAddr_) {
        uniFactoryAddr = uniFactoryAddr_;
        ethAddr = ethAddr_;
    }

    function deployNewToken(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint256 salt
    ) public {
        bytes memory code = _getBytecode(name, symbol, totalSupply, msg.sender);
        address addr = _deploy(code, salt);
        _addUniPair(addr);
    }

    function _getBytecode(
        string memory _name, 
        string memory _symbol, 
        uint256 _totalSupply, 
        address _issuer
    ) internal pure returns (bytes memory) {
        bytes memory bytecode = type(Token).creationCode;
        return abi.encodePacked(bytecode, abi.encode(_name, _symbol, _totalSupply, _issuer));
    }

    function _deploy(bytes memory bytecode, uint256 salt) internal returns (address) {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }
        emit Deployed(addr, salt);
        return addr;
    }

    function _addUniPair(address _newToken) internal {
        IUniswapV2Factory uniFactory = IUniswapV2Factory(uniFactoryAddr);
        uniFactory.createPair(_newToken, ethAddr);
    }
}

