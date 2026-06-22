// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MinesweeperRegistry
 * @notice Append-only on-chain record of PuzzleChain Minesweeper game sessions.
 *         The server's validator wallet calls recordGameCreated on session start
 *         and recordScoreSubmitted on verified finish. Events are the canonical
 *         immutable log; no state is stored beyond the validator address.
 */
contract MinesweeperRegistry {
    address public immutable validator;

    event GameCreated(
        bytes32 indexed sessionId,
        bytes32 initialHash,
        address player,
        uint256 timestamp
    );

    event ScoreSubmitted(
        bytes32 indexed sessionId,
        bytes32 finalHash,
        uint256 score,
        uint256 timestamp
    );

    modifier onlyValidator() {
        require(msg.sender == validator, "MinesweeperRegistry: caller is not validator");
        _;
    }

    constructor(address _validator) {
        require(_validator != address(0), "MinesweeperRegistry: zero address");
        validator = _validator;
    }

    function recordGameCreated(bytes32 sessionId, bytes32 initialHash) external onlyValidator {
        emit GameCreated(sessionId, initialHash, tx.origin, block.timestamp);
    }

    function recordScoreSubmitted(bytes32 sessionId, bytes32 finalHash, uint256 score) external onlyValidator {
        emit ScoreSubmitted(sessionId, finalHash, score, block.timestamp);
    }
}
