// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title WagerEscrow
 * @notice Asynchronous PvP wager escrow for PuzzleChain $UTGO tile-match matches.
 *         Players deposit equal wagers; backend signs the winner via ECDSA;
 *         winner calls claimWin to collect 90% of pot; 8% to treasury; 2% burned.
 *         emergencyWithdraw allows trustless refunds after 24 h with no activity.
 *         cancelQueue allows trustless refunds after 120 s if no opponent joined.
 */
contract WagerEscrow {
    // ── Reentrancy guard ───────────────────────────────────────────────────

    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ── Types ──────────────────────────────────────────────────────────────

    enum MatchStatus { Pending, Active, Settled, Cancelled }

    struct Match {
        address player1;
        address player2;
        uint256 wagerAmount;   // per player, in $UTGO (18 decimals)
        uint64  createdAt;     // unix timestamp
        uint64  settledAt;
        MatchStatus status;
        bool    p1Deposited;
        bool    p2Deposited;
        bool    p1EmergencyWithdrawn;
        bool    p2EmergencyWithdrawn;
    }

    // ── State ──────────────────────────────────────────────────────────────

    IERC20  public immutable utgoToken;
    address public immutable validator;   // backend signing key (read-only)
    address public immutable treasury;
    address public constant  BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant  WINNER_BPS     = 9000;   // 90%
    uint256 public constant  TREASURY_BPS   = 800;    // 8%
    uint256 public constant  BURN_BPS       = 200;    // 2%
    uint256 public constant  EMERGENCY_DELAY = 24 hours;
    uint256 public constant  QUEUE_TIMEOUT   = 120;   // seconds

    // matchId => Match
    mapping(bytes32 => Match) public matches;
    // prevent signature replay (legacy — kept for compatibility)
    mapping(bytes32 => bool)  public usedSigs;
    // anti-replay registry: matchId consumed after claimWin distributes funds
    mapping(bytes32 => bool)  public executedMatches;

    // ── Events ─────────────────────────────────────────────────────────────

    event MatchCreated(bytes32 indexed matchId, address player1, address player2, uint256 wagerAmount);
    event Deposited(bytes32 indexed matchId, address player, uint8 slot);
    event MatchActive(bytes32 indexed matchId);
    event WinClaimed(bytes32 indexed matchId, address winner, uint256 payout);
    event Refunded(bytes32 indexed matchId, address player, uint256 amount);
    event EmergencyWithdrawn(bytes32 indexed matchId, address player, uint256 amount);
    event QueueCancelled(bytes32 indexed matchId, address player, uint256 amount);

    // ── Constructor ────────────────────────────────────────────────────────

    constructor(address _utgoToken, address _validator, address _treasury) {
        require(_utgoToken  != address(0), "bad token");
        require(_validator  != address(0), "bad validator");
        require(_treasury   != address(0), "bad treasury");
        utgoToken = IERC20(_utgoToken);
        validator = _validator;
        treasury  = _treasury;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ── External: setup ────────────────────────────────────────────────────

    /**
     * @notice Backend registers the match on-chain by calling this once.
     *         Only the validator can create a match; players then deposit.
     */
    function createMatch(
        bytes32 matchId,
        address player1,
        address player2,
        uint256 wagerAmount
    ) external {
        require(msg.sender == validator, "not validator");
        require(matches[matchId].player1 == address(0), "exists");
        require(player1 != address(0) && player2 != address(0), "bad players");
        require(player1 != player2, "same player");
        require(wagerAmount > 0, "zero wager");

        matches[matchId] = Match({
            player1:              player1,
            player2:              player2,
            wagerAmount:          wagerAmount,
            createdAt:            uint64(block.timestamp),
            settledAt:            0,
            status:               MatchStatus.Pending,
            p1Deposited:          false,
            p2Deposited:          false,
            p1EmergencyWithdrawn: false,
            p2EmergencyWithdrawn: false
        });

        emit MatchCreated(matchId, player1, player2, wagerAmount);
    }

    /**
     * @notice Player deposits their wager. Approve this contract for wagerAmount
     *         before calling. Both deposits trigger MatchActive.
     */
    function deposit(bytes32 matchId) external {
        Match storage m = matches[matchId];
        require(m.player1 != address(0), "no match");
        require(m.status == MatchStatus.Pending, "not pending");

        bool isP1 = msg.sender == m.player1;
        bool isP2 = msg.sender == m.player2;
        require(isP1 || isP2, "not a player");

        if (isP1) {
            require(!m.p1Deposited, "already deposited");
            m.p1Deposited = true;
            emit Deposited(matchId, msg.sender, 1);
        } else {
            require(!m.p2Deposited, "already deposited");
            m.p2Deposited = true;
            emit Deposited(matchId, msg.sender, 2);
        }

        require(utgoToken.transferFrom(msg.sender, address(this), m.wagerAmount), "transfer failed");

        if (m.p1Deposited && m.p2Deposited) {
            m.status = MatchStatus.Active;
            emit MatchActive(matchId);
        }
    }

    /**
     * @notice Trustless 120-second queue withdrawal. Player1 can call this after
     *         QUEUE_TIMEOUT seconds have elapsed since first deposit, provided no
     *         opponent has deposited yet. No server signature required.
     */
    function cancelQueue(bytes32 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.player1 != address(0), "no match");
        require(msg.sender == m.player1, "not player1");
        require(m.p1Deposited, "nothing to cancel");
        require(!m.p2Deposited, "match already filled");
        require(m.status == MatchStatus.Pending, "not pending");
        require(block.timestamp > m.createdAt + QUEUE_TIMEOUT, "timeout not reached");

        m.status    = MatchStatus.Cancelled;
        m.settledAt = uint64(block.timestamp);
        m.p1Deposited = false;

        require(utgoToken.transfer(m.player1, m.wagerAmount), "refund failed");
        emit QueueCancelled(matchId, m.player1, m.wagerAmount);
    }

    /**
     * @notice Winner claims their payout. Backend provides an ECDSA signature
     *         over (matchId, winner). Payout: 90% to winner, 8% treasury, 2% burn.
     *         Protected by nonReentrant and executedMatches anti-replay registry.
     */
    function claimWin(
        bytes32 matchId,
        address winner,
        bytes calldata signature
    ) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == MatchStatus.Active, "not active");
        require(winner == m.player1 || winner == m.player2, "not a player");
        require(!executedMatches[matchId], "already executed");

        // Verify backend ECDSA signature
        bytes32 msgHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32",
            keccak256(abi.encodePacked(matchId, winner))
        ));
        require(!usedSigs[msgHash], "sig used");
        address signer = _recoverSigner(msgHash, signature);
        require(signer == validator, "bad sig");

        usedSigs[msgHash]       = true;
        executedMatches[matchId] = true;   // burn matchId — cannot be replayed
        m.status    = MatchStatus.Settled;
        m.settledAt = uint64(block.timestamp);

        uint256 pot      = m.wagerAmount * 2;
        uint256 winPay   = pot * WINNER_BPS   / 10000;
        uint256 tresPay  = pot * TREASURY_BPS / 10000;
        uint256 burnPay  = pot - winPay - tresPay;  // remainder = 2%

        require(utgoToken.transfer(winner,       winPay),  "winner transfer");
        require(utgoToken.transfer(treasury,     tresPay), "treasury transfer");
        require(utgoToken.transfer(BURN_ADDRESS, burnPay), "burn transfer");

        emit WinClaimed(matchId, winner, winPay);
    }

    /**
     * @notice Refund both players if match was cancelled before both deposited.
     *         Only callable by validator (backend cancels on timeout / disconnect).
     *         Protected by nonReentrant.
     */
    function refund(bytes32 matchId) external nonReentrant {
        require(msg.sender == validator, "not validator");
        Match storage m = matches[matchId];
        require(m.player1 != address(0), "no match");
        require(
            m.status == MatchStatus.Pending || m.status == MatchStatus.Active,
            "not refundable"
        );

        m.status    = MatchStatus.Cancelled;
        m.settledAt = uint64(block.timestamp);

        if (m.p1Deposited) {
            m.p1Deposited = false;
            require(utgoToken.transfer(m.player1, m.wagerAmount), "p1 refund");
            emit Refunded(matchId, m.player1, m.wagerAmount);
        }
        if (m.p2Deposited) {
            m.p2Deposited = false;
            require(utgoToken.transfer(m.player2, m.wagerAmount), "p2 refund");
            emit Refunded(matchId, m.player2, m.wagerAmount);
        }
    }

    /**
     * @notice Trustless safety net: either player may withdraw their own deposit
     *         if 24 h have elapsed since match creation with no settlement.
     *         No signature required — purely time-gated.
     */
    function emergencyWithdraw(bytes32 matchId) external {
        Match storage m = matches[matchId];
        require(m.player1 != address(0), "no match");
        require(
            m.status == MatchStatus.Pending || m.status == MatchStatus.Active,
            "already settled"
        );
        require(
            block.timestamp >= m.createdAt + EMERGENCY_DELAY,
            "too early"
        );

        bool isP1 = msg.sender == m.player1;
        bool isP2 = msg.sender == m.player2;
        require(isP1 || isP2, "not a player");

        if (isP1) {
            require(m.p1Deposited,            "nothing to withdraw");
            require(!m.p1EmergencyWithdrawn,  "already withdrawn");
            m.p1EmergencyWithdrawn = true;
            require(utgoToken.transfer(m.player1, m.wagerAmount), "transfer");
            emit EmergencyWithdrawn(matchId, m.player1, m.wagerAmount);
        } else {
            require(m.p2Deposited,            "nothing to withdraw");
            require(!m.p2EmergencyWithdrawn,  "already withdrawn");
            m.p2EmergencyWithdrawn = true;
            require(utgoToken.transfer(m.player2, m.wagerAmount), "transfer");
            emit EmergencyWithdrawn(matchId, m.player2, m.wagerAmount);
        }

        // Mark settled only when both players have withdrawn (or only one deposited)
        bool bothWithdrawn = m.p1EmergencyWithdrawn && m.p2EmergencyWithdrawn;
        bool onlyP1 = m.p1Deposited && !m.p2Deposited && m.p1EmergencyWithdrawn;
        bool onlyP2 = !m.p1Deposited && m.p2Deposited && m.p2EmergencyWithdrawn;
        if (bothWithdrawn || onlyP1 || onlyP2) {
            m.status    = MatchStatus.Cancelled;
            m.settledAt = uint64(block.timestamp);
        }
    }

    // ── Internal ───────────────────────────────────────────────────────────

    function _recoverSigner(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "bad sig len");
        bytes32 r;
        bytes32 s;
        uint8   v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        require(v == 27 || v == 28, "bad v");
        return ecrecover(hash, v, r, s);
    }

    // ── View helpers ───────────────────────────────────────────────────────

    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }
}
