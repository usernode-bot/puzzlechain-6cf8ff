// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DemoUTGO
 * @notice Minimal ERC-20 test token for PuzzleChain PvP wager testing.
 *         Only the designated minter (the validator wallet) can mint tokens.
 *         There is no burn or transfer restriction — this is a test token only.
 */
contract DemoUTGO {
    string  public constant name     = "Demo UTGO";
    string  public constant symbol   = "UTGO";
    uint8   public constant decimals = 18;

    uint256 private _totalSupply;
    address public  minter;

    mapping(address => uint256)                     private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterChanged(address indexed oldMinter, address indexed newMinter);

    constructor(address _minter) {
        require(_minter != address(0), "DemoUTGO: zero minter");
        minter = _minter;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "DemoUTGO: not minter");
        _;
    }

    function totalSupply() external view returns (uint256) { return _totalSupply; }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "DemoUTGO: insufficient allowance");
        _allowances[from][msg.sender] = allowed - amount;
        _transfer(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "DemoUTGO: mint to zero");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function setMinter(address newMinter) external onlyMinter {
        require(newMinter != address(0), "DemoUTGO: zero minter");
        emit MinterChanged(minter, newMinter);
        minter = newMinter;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "DemoUTGO: transfer to zero");
        require(_balances[from] >= amount, "DemoUTGO: insufficient balance");
        _balances[from] -= amount;
        _balances[to]   += amount;
        emit Transfer(from, to, amount);
    }
}
