/* ============================================================
   Win / Loss overlays and Share-to-Feed modal
   ShareButton is hoisted here from App() so it can be reused
   by both WinOverlay and LoseOverlay.
   ============================================================ */

// Copy-to-clipboard Share button for the win/loss overlays. Flips its label
// to "Copied!" briefly; degrades to a no-op where clipboard is unavailable.
function ShareButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <button
      className="primary-btn"
      style={{ background: C.violet, marginBottom: '0.6rem' }}
      onClick={copy}
    >
      {copied ? 'Copied!' : 'Share result'}
    </button>
  );
}

const fmtTime = s =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function WinOverlay({ winData, currentGame, authOk, onOpenReceipt, onPlayAgain, onBackToLobby, onShareToFeed }) {
  if (!winData) return null;
  return (
    <div className="win-overlay">
      <div className="win-card">
        <div className="trophy">{winData.cashOut ? '💰' : '🏆'}</div>
        <h2>{winData.winnerLabel || (winData.cashOut ? 'Cashed Out! 💰' : 'Solved!')}</h2>
        <div className="sub">{currentGame && currentGame.name}</div>
        <div className="score-rows">
          <div className="score-row">
            <span className="k">Base score</span>
            <span className="v mono">{winData.score}</span>
          </div>
          {winData.isClassic && winData.multiplier > 1 && (
            <div className="score-row bonus">
              <span className="k">Cash Out ×{winData.multiplier}</span>
              <span className="v mono">×{winData.multiplier}</span>
            </div>
          )}
          {!winData.isClassic && winData.multiplier > 1 && (
            <div className="score-row bonus">
              <span className="k">Streak ×{winData.multiplier} · {winData.effectiveStreak}-day</span>
              <span className="v mono">+{winData.bonus}</span>
            </div>
          )}
          <div className="score-row">
            <span className="k">Steps · Time</span>
            <span className="v mono">{winData.steps} · {fmtTime(winData.timeSecs)}</span>
          </div>
          <div className="score-row total">
            <span className="k">Earned</span>
            <span className="v mono">+{winData.finalScore}</span>
          </div>
          {winData.rewardWei && winData.rewardWei !== '0' && !winData.isClassic && (
            <div className="win-reward-row">
              <span className="k">🪙 Token reward</span>
              <span className="v">+{fmtUtgo(winData.rewardWei)}</span>
            </div>
          )}
          {winData.isClassic && winData.bestScore !== undefined && (
            <div className="score-row">
              <span className="k">Best score</span>
              <span className="v mono">{winData.bestScore}</span>
            </div>
          )}
          {winData.isClassic && winData.longestSnake !== undefined && (
            <div className="score-row">
              <span className="k">Longest</span>
              <span className="v mono">{winData.longestSnake} cells</span>
            </div>
          )}
        </div>
        {!winData.isClassic && winData.justBadge && (
          <div className="badge-unlock">
            <div className="bu-icon">{winData.justBadge.icon}</div>
            <div className="bu-title">Milestone reached!</div>
            <div className="bu-name">{winData.justBadge.name} · {winData.justBadge.min}-day streak</div>
          </div>
        )}
        {!winData.isClassic && !winData.justBadge && winData.activeBadge && (
          <div className="win-badge-row">
            <span className="wbr-icon">{winData.activeBadge.icon}</span>
            <span>{winData.activeBadge.name} badge active</span>
          </div>
        )}
        {winData.dapp && <VerifiedBadge session={winData.dapp} onOpenReceipt={onOpenReceipt} />}
        {currentGame && <Leaderboard gameId={currentGame.id} solved={true} />}
        <ShareButton text={winData.share} />
        {!winData.isClassic && authOk && (
          <button
            className="primary-btn"
            style={{ marginBottom: '0.6rem', background: C.emerald }}
            onClick={() => onShareToFeed({ gameId: winData.gameId, score: winData.finalScore, steps: winData.steps, timeSecs: winData.timeSecs })}
          >
            📤 Share to Feed
          </button>
        )}
        {winData.isClassic && (
          <button className="primary-btn" style={{ marginBottom: '0.6rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }} onClick={onPlayAgain}>
            Play Again
          </button>
        )}
        <button className="primary-btn" onClick={() => onBackToLobby(winData.isClassic ? 'classic' : null)}>Back to Lobby</button>
      </div>
    </div>
  );
}

function LoseOverlay({ loseData, currentGame, onPlayAgain, onBackToLobby }) {
  if (!loseData) return null;
  return (
    <div className="win-overlay">
      <div className="win-card">
        <div className="trophy">{loseData.isClassic ? '💥' : '💀'}</div>
        <h2>{loseData.isClassic ? 'Game Over' : 'Out of guesses'}</h2>
        <div className="sub">{currentGame && currentGame.name}</div>
        <div className="score-rows">
          {loseData.answer && (
            <div className="score-row">
              <span className="k">Answer</span>
              <span className="v mono">{loseData.answer}</span>
            </div>
          )}
          <div className="score-row">
            <span className="k">{loseData.isClassic ? 'Steps' : 'Guesses'} · Time</span>
            <span className="v mono">{loseData.steps} · {fmtTime(loseData.timeSecs)}</span>
          </div>
          <div className="score-row total">
            <span className="k">Earned</span>
            <span className="v mono">+0</span>
          </div>
        </div>
        {currentGame && <Leaderboard gameId={currentGame.id} solved={false} />}
        <ShareButton text={loseData.share} />
        {loseData.isClassic && (
          <button className="primary-btn" style={{ marginBottom: '0.6rem', background: C.surface, border: `1px solid ${C.border}`, color: C.text }} onClick={onPlayAgain}>
            Play Again
          </button>
        )}
        <button className="primary-btn" onClick={() => onBackToLobby(loseData.isClassic ? 'classic' : null)}>Back to Lobby</button>
      </div>
    </div>
  );
}

function ShareToFeedModal({ shareModal, setShareModal, onDone }) {
  if (!shareModal.show) return null;
  return (
    <div className="win-overlay">
      <div className="win-card">
        <h2>Share to Feed</h2>
        <div style={{ marginBottom: '1rem' }}>
          <textarea
            placeholder="Add a caption (optional, max 280 chars)"
            value={shareModal.caption}
            onChange={(e) => setShareModal(prev => ({ ...prev, caption: e.target.value.slice(0, 280) }))}
            style={{
              width: '100%',
              padding: '0.8rem',
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '10px',
              color: C.text,
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              minHeight: '80px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.4rem', textAlign: 'right' }}>
            {shareModal.caption.length}/280
          </div>
        </div>
        <button
          className="primary-btn"
          onClick={async () => {
            const { ok } = await api('/api/posts', {
              method: 'POST',
              body: JSON.stringify({
                gameId: shareModal.gameId,
                score: shareModal.score,
                steps: shareModal.steps,
                timeSecs: shareModal.timeSecs,
                caption: shareModal.caption || null,
              }),
            });
            if (ok) {
              setShareModal({ show: false, caption: '' });
              setTimeout(() => onDone(), 1500);
            }
          }}
          style={{ marginBottom: '0.6rem' }}
        >
          ✓ Post to Feed
        </button>
        <button
          className="primary-btn"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }}
          onClick={() => setShareModal({ show: false, caption: '' })}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
