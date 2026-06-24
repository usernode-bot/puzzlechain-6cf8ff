/* ============================================================
   Idle clicker game constants & helpers
   ============================================================ */
const IDLE_UNITS = [
  { id: 'worker', name: 'Worker Hamster', icon: '🐹', baseCost: 10, incomePerSec: 0.1 },
  { id: 'coinpress', name: 'Coin Press', icon: '🏭', baseCost: 100, incomePerSec: 1 },
  { id: 'goldenwheel', name: 'Golden Wheel', icon: '✨', baseCost: 1000, incomePerSec: 10 },
  { id: 'vault', name: 'Treasure Vault', icon: '💰', baseCost: 10000, incomePerSec: 100 },
];

const IDLE_UPGRADES = [
  { id: 'iron_paws', name: 'Iron Paws', baseCost: 50, maxLevel: 10, effect: 'tap', multiplier: 1.1, desc: 'Boost tap power' },
  { id: 'worker_motivation', name: 'Worker Motivation', baseCost: 150, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'worker', desc: 'Worker +25%' },
  { id: 'coinpress_boost', name: 'Press Power', baseCost: 500, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'coinpress', desc: 'Press +25%' },
  { id: 'goldenwheel_boost', name: 'Wheel Speed', baseCost: 5000, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'goldenwheel', desc: 'Wheel +25%' },
  { id: 'vault_boost', name: 'Vault Depth', baseCost: 50000, maxLevel: 5, effect: 'unit', multiplier: 1.25, unitId: 'vault', desc: 'Vault +25%' },
];

function idleUnitCost(unit, count) {
  return Math.ceil(unit.baseCost * Math.pow(1.15, count));
}

function idleUpgradeCost(upgrade, level) {
  return Math.ceil(upgrade.baseCost * Math.pow(1.1, level));
}

function computePassiveIncome(unitsOwned, upgrades) {
  let income = 0;
  for (const unit of IDLE_UNITS) {
    const count = unitsOwned[unit.id] || 0;
    let unitIncome = unit.incomePerSec * count;
    // Apply unit-specific upgrades (5 levels of 1.25x each = 3.05x at max)
    for (const upgrade of IDLE_UPGRADES) {
      if (upgrade.unitId === unit.id && upgrades[upgrade.id]) {
        unitIncome *= Math.pow(upgrade.multiplier, upgrades[upgrade.id]);
      }
    }
    income += unitIncome;
  }
  return income;
}

function computePrestigeMultiplier(prestigePoints) {
  return 1 + 0.05 * prestigePoints;
}

function IdleGame() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('units');
  const [pendingPrestige, setPendingPrestige] = useState(null);
  const [popups, setPopups] = useState([]);
  const [offlineAccum, setOfflineAccum] = useState(0);
  const tapPowerRef = useRef(1);

  const loadState = async () => {
    const { ok, body } = await api('/api/idle/state');
    if (ok && body) {
      setState(body);
      tapPowerRef.current = parseFloat(body.tapPower) || 1;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  // Passive income accumulation loop
  useEffect(() => {
    if (!state) return;
    const passiveIncome = computePassiveIncome(state.unitsOwned, state.upgrades);
    const multiplier = computePrestigeMultiplier(state.prestigePoints);
    const id = setInterval(() => {
      setState(prev => {
        const newCur = prev.currency + passiveIncome * multiplier;
        const newPeak = Math.max(prev.peakCurrency, newCur);
        return { ...prev, currency: newCur, peakCurrency: newPeak };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  // Sync offline accumulation periodically
  useEffect(() => {
    if (offlineAccum <= 0 || !state) return;
    const timer = setTimeout(async () => {
      const { ok } = await api('/api/idle/tap', { method: 'POST', body: JSON.stringify({ tapCount: offlineAccum }) });
      if (ok) setOfflineAccum(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [offlineAccum, state]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!state) return <div style={{ padding: '2rem', textAlign: 'center' }}>Failed to load game</div>;

  const passiveIncome = computePassiveIncome(state.unitsOwned, state.upgrades);
  const multiplier = computePrestigeMultiplier(state.prestigePoints);
  const displayCurrency = Math.floor(state.currency);

  const handleTap = async () => {
    const tapPower = tapPowerRef.current;
    const tapValue = tapPower * multiplier;
    const newCur = state.currency + tapValue;
    const newPeak = Math.max(state.peakCurrency, newCur);
    setState(prev => ({ ...prev, currency: newCur, peakCurrency: newPeak }));
    setOfflineAccum(offlineAccum + 1);

    // Coin popup
    const popupId = Math.random();
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 50;
    setPopups(prev => [...prev, { id: popupId, value: '+' + Math.ceil(tapValue), x, y }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== popupId)), 1000);
  };

  const handleBuyUnit = async (unit) => {
    const count = state.unitsOwned[unit.id] || 0;
    const cost = idleUnitCost(unit, count);
    if (state.currency < cost) return alert('Insufficient currency');

    const { ok, status } = await api('/api/idle/buy-unit', {
      method: 'POST',
      body: JSON.stringify({ unitId: unit.id })
    });
    if (ok) loadState();
    else if (status === 409) alert('Insufficient currency');
  };

  const handleUpgrade = async (upgrade) => {
    const level = state.upgrades[upgrade.id] || 0;
    if (level >= upgrade.maxLevel) return alert('Already maxed');
    const cost = idleUpgradeCost(upgrade, level);
    if (state.currency < cost) return alert('Insufficient currency');

    const { ok, status } = await api('/api/idle/upgrade', {
      method: 'POST',
      body: JSON.stringify({ upgradeId: upgrade.id })
    });
    if (ok) loadState();
    else if (status === 409) alert('Insufficient currency');
  };

  const handlePrestige = async () => {
    const bonus = Math.floor(Math.sqrt(state.peakCurrency / 1000));
    const newPrestigePoints = state.prestigePoints + bonus;
    const multiplierGain = (0.05 * bonus).toFixed(1);
    setPendingPrestige({ bonus, newPoints: newPrestigePoints, multiplierGain });
  };

  const confirmPrestige = async () => {
    const { ok } = await api('/api/idle/prestige', { method: 'POST' });
    if (ok) {
      setPendingPrestige(null);
      loadState();
    }
  };

  return (
    <div className="idle-container">
      <div className="idle-main">
        <div className="idle-stats">
          <div className="idle-stat-box">
            <div className="idle-stat-label">Coins</div>
            <div className="idle-stat-value currency">{displayCurrency.toLocaleString()}</div>
          </div>
          <div className="idle-stat-box">
            <div className="idle-stat-label">Per Second</div>
            <div className="idle-stat-value income">{(passiveIncome * multiplier).toFixed(2)}</div>
          </div>
          <div className="idle-stat-box">
            <div className="idle-stat-label">Prestige Bonus</div>
            <div className="idle-stat-value prestige">+{Math.round(state.prestigePoints * 5)}%</div>
          </div>
        </div>

        <div className="idle-tap-section">
          <button className="idle-tap-btn" onClick={handleTap}>TAP</button>
          <div className="idle-tap-label">Tap Power: {tapPowerRef.current.toFixed(2)}×</div>
        </div>

        <div className="idle-shop">
          <div className="idle-tabs">
            <button
              className={`idle-tab ${activeTab === 'units' ? 'active' : ''}`}
              onClick={() => setActiveTab('units')}
            >
              Units ({Object.values(state.unitsOwned).reduce((a, b) => a + b, 0)})
            </button>
            <button
              className={`idle-tab ${activeTab === 'upgrades' ? 'active' : ''}`}
              onClick={() => setActiveTab('upgrades')}
            >
              Upgrades
            </button>
          </div>

          <div className="idle-grid">
            {activeTab === 'units' && IDLE_UNITS.map(unit => {
              const count = state.unitsOwned[unit.id] || 0;
              const cost = idleUnitCost(unit, count);
              const canAfford = state.currency >= cost;
              return (
                <div key={unit.id} className="idle-card">
                  <div className="idle-card-icon">{unit.icon}</div>
                  <div className="idle-card-name">{unit.name}</div>
                  <div className="idle-card-stats">Income: {unit.incomePerSec.toFixed(2)}/s</div>
                  <div className="idle-card-stats">Own: {count}</div>
                  <button
                    className="idle-card-btn"
                    disabled={!canAfford}
                    onClick={() => handleBuyUnit(unit)}
                  >
                    {cost.toLocaleString()}
                  </button>
                </div>
              );
            })}

            {activeTab === 'upgrades' && IDLE_UPGRADES.map(upgrade => {
              const level = state.upgrades[upgrade.id] || 0;
              const cost = idleUpgradeCost(upgrade, level);
              const canAfford = state.currency >= cost && level < upgrade.maxLevel;
              return (
                <div key={upgrade.id} className="idle-card">
                  <div className="idle-card-icon">⚡</div>
                  <div className="idle-card-name">{upgrade.name}</div>
                  <div className="idle-card-desc">{upgrade.desc}</div>
                  <div className="idle-card-stats">Level: {level}/{upgrade.maxLevel}</div>
                  <button
                    className="idle-card-btn"
                    disabled={!canAfford}
                    onClick={() => handleUpgrade(upgrade)}
                  >
                    {level >= upgrade.maxLevel ? 'MAXED' : cost.toLocaleString()}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {popups.map(p => (
        <div
          key={p.id}
          className="idle-coin-popup"
          style={{
            left: 'calc(50% + ' + p.x + 'px)',
            top: 'calc(50% + ' + p.y + 'px)',
          }}
        >
          {p.value}
        </div>
      ))}

      {pendingPrestige && (
        <div className="prestige-modal">
          <div className="prestige-card">
            <h2>✨ Prestige</h2>
            <div className="sub">Reset your progress and earn prestige points!</div>
            <div className="prestige-rows">
              <div className="prestige-row">
                <span className="k">Peak Currency:</span>
                <span className="v">{Math.floor(state.peakCurrency).toLocaleString()}</span>
              </div>
              <div className="prestige-row">
                <span className="k">Bonus Points:</span>
                <span className="v">+{pendingPrestige.bonus}</span>
              </div>
              <div className="prestige-row">
                <span className="k">New Total:</span>
                <span className="v">{pendingPrestige.newPoints}</span>
              </div>
              <div className="prestige-row">
                <span className="k">Multiplier Gain:</span>
                <span className="v">+{pendingPrestige.multiplierGain}%</span>
              </div>
            </div>
            <div className="prestige-buttons">
              <button className="prestige-confirm" onClick={confirmPrestige}>
                Prestige
              </button>
              <button className="prestige-cancel" onClick={() => setPendingPrestige(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
