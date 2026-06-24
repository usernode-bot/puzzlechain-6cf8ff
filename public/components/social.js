
/* ============================================================
   Game registry
   (more games slot in here — lobby/lock/win/scoring auto-wire)
   ============================================================ */
/* ============================================================
   Social Components — Profile & Friends
   ============================================================ */

function ProfileScreen({ userId, user: loggedInUser, onBack }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTip, setShowTip] = useState(false);

  const loadProfile = async () => {
    const { ok, body } = await api(`/api/social/profile/${userId}`);
    if (ok && body) setProfile(body);
    setLoading(false);
  };

  useEffect(() => { loadProfile(); }, [userId]);

  const handleFollow = async () => {
    if (!profile) return;
    const { ok } = await api(`/api/social/follow/${profile.user.id}`, { method: 'POST' });
    if (ok) {
      setProfile(prev => ({ ...prev, following: true }));
    }
  };

  const handleUnfollow = async () => {
    if (!profile) return;
    const { ok } = await api(`/api/social/unfollow/${profile.user.id}`, { method: 'DELETE' });
    if (ok) {
      setProfile(prev => ({ ...prev, following: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.muted, marginTop: '1rem' }}>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.rose, marginTop: '1rem' }}>Profile not found</p>
      </div>
    );
  }

  const isOwnProfile = loggedInUser && loggedInUser.id === profile.user.id;

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <button className="back-btn" onClick={onBack}>← Back</button>

      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        padding: '1.5rem',
        marginTop: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{profile.user.username}</h2>
            <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0.25rem 0 0', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(profile.user.createdAt).toLocaleDateString()}
            </p>
            {isOwnProfile && <p style={{ color: C.emerald, fontSize: '0.8rem', margin: '0.5rem 0 0' }}>Your Profile</p>}
          </div>
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
              <button
                className="primary-btn"
                style={{
                  background: profile.following ? C.surface : C.accent,
                  border: `1px solid ${profile.following ? C.border : C.accent}`,
                  color: profile.following ? C.text : 'white',
                  padding: '0.5rem 1rem',
                }}
                onClick={profile.following ? handleUnfollow : handleFollow}
              >
                {profile.following ? 'Unfollow' : 'Follow'}
              </button>
              <button
                className="primary-btn"
                disabled={!profile.walletLinked}
                title={!profile.walletLinked ? "This user hasn't set up a wallet yet" : `Tip ${profile.user.username}`}
                style={{
                  padding: '0.4rem 0.9rem',
                  background: profile.walletLinked ? C.gold + 'cc' : C.surface,
                  border: `1px solid ${profile.walletLinked ? C.gold : C.border}`,
                  color: profile.walletLinked ? C.bg : C.muted,
                  cursor: profile.walletLinked ? 'pointer' : 'not-allowed',
                  fontSize: '0.85rem',
                  opacity: profile.walletLinked ? 1 : 0.5,
                }}
                onClick={() => profile.walletLinked && setShowTip(true)}
              >
                🪙 Tip
              </button>
            </div>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Score</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{profile.stats.totalScore}</div>
          </div>
          <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Streak</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.emerald, fontFamily: "'JetBrains Mono', monospace" }}>{profile.stats.currentStreak}</div>
          </div>
          <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Played</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: C.accent, fontFamily: "'JetBrains Mono', monospace" }}>{profile.stats.gamesPlayed}</div>
          </div>
        </div>

        {Array.isArray(profile.badges) && profile.badges.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Streak badges</div>
            <div className="badge-strip" style={{ marginTop: 0 }}>
              {profile.badges
                .map(badgeForDays)
                .filter(Boolean)
                .map(b => (
                  <span key={b.id} className="badge-chip" title={`${b.name} · ${b.min}-day streak`}>
                    <span className="badge-chip-icon">{b.icon}</span>
                    {b.name}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1rem', fontSize: '0.9rem' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <span style={{ color: C.muted }}>Followers:</span>{' '}
            <span style={{ fontWeight: 600, color: C.accent }}>{profile.followerCount}</span>
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <span style={{ color: C.muted }}>Following:</span>{' '}
            <span style={{ fontWeight: 600, color: C.accent }}>{profile.followingCount}</span>
          </p>
          {profile.tipsReceivedWei && profile.tipsReceivedWei !== '0' && (
            <p style={{ margin: '0.5rem 0' }}>
              <span style={{ color: C.muted }}>Tips received:</span>{' '}
              <span style={{ fontWeight: 600, color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>
                {fmtUtgo(profile.tipsReceivedWei)}
              </span>
            </p>
          )}
          {profile.recentTippers && profile.recentTippers.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ color: C.muted, fontSize: '0.78rem', marginBottom: '0.25rem' }}>Recent tips:</div>
              {profile.recentTippers.slice(0, 3).map((t, i) => (
                <div key={i} style={{ fontSize: '0.82rem', color: C.text }}>
                  {t.fromUserId} → <span style={{ color: C.gold, fontFamily: "'JetBrains Mono', monospace" }}>{fmtUtgo(t.amountWei)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showTip && (
        <TipModal
          toUser={profile.user}
          onClose={() => setShowTip(false)}
          onSuccess={loadProfile}
        />
      )}
    </div>
  );
}

function FriendsListScreen({ onSelectUser, onBack }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      const { ok, body } = await api('/api/social/friends');
      if (ok && body && body.friends) {
        setFriends(body.friends);
      }
      setLoading(false);
    };
    loadFriends();
  }, []);

  if (loading) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <button className="back-btn" onClick={onBack}>← Back</button>
        <p style={{ color: C.muted, marginTop: '1rem' }}>Loading friends...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
      <button className="back-btn" onClick={onBack}>← Back</button>

      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1.5rem 0 1rem' }}>Friends</h2>

      {friends.length === 0 ? (
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '14px',
          padding: '2rem',
          textAlign: 'center',
          color: C.muted
        }}>
          <p>You're not following anyone yet. Go to a profile and click Follow!</p>
        </div>
      ) : (
        <div>
          {friends.map(friend => (
            <div
              key={friend.id}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{friend.username}</div>
                <div style={{ fontSize: '0.85rem', color: C.muted, marginTop: '0.25rem' }}>
                  Score: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.gold }}>{friend.totalScore}</span>
                  {' · '}
                  Streak: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: C.emerald }}>{friend.currentStreak}</span>
                </div>
              </div>
              <button
                className="primary-btn"
                style={{
                  background: C.accent,
                  border: `1px solid ${C.accent}`,
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem'
                }}
                onClick={() => onSelectUser(friend.id)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   Social: Feed & Posts
   ============================================================ */

function FeedScreen({ user, setScreen }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPostId, setSelectedPostId] = useState(null);

  useEffect(() => {
    const loadFeed = async () => {
      const { ok, body } = await api('/api/posts/feed?limit=20&offset=0');
      if (ok && body) setPosts(body.posts || []);
      setLoading(false);
    };
    loadFeed();
    const id = setInterval(loadFeed, 10000);
    return () => clearInterval(id);
  }, []);

  if (selectedPostId) {
    const post = posts.find(p => p.id === selectedPostId);
    if (post) {
      return (
        <PostDetail
          post={post}
          onBack={() => setSelectedPostId(null)}
        />
      );
    }
  }

  if (loading) return <div className="lobby" style={{ padding: '2rem', textAlign: 'center' }}>Loading feed...</div>;

  const gameNameMap = {};
  GAMES.forEach(g => gameNameMap[g.id] = g);

  return (
    <div className="lobby" style={{ maxWidth: '600px' }}>
      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.muted, padding: '2rem' }}>
          <p>No posts yet. Play a game and share your wins!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map(p => {
            const game = gameNameMap[p.gameId];
            return (
              <div
                key={p.id}
                className="card"
                style={{ cursor: 'pointer', '--accent': game?.tagColor || C.accent }}
                onClick={() => setSelectedPostId(p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{
                    width: '1.8rem', height: '1.8rem', borderRadius: '50%',
                    background: C.accent, color: '#fff', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '600'
                  }}>
                    {(p.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{p.username}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'now'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{game?.icon || '🎮'}</span>
                  <span style={{ fontWeight: '600' }}>{game?.name || p.gameId}</span>
                </div>
                <div style={{ color: C.gold, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {p.score} pts
                </div>
                {p.caption && <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{p.caption}</div>}
                <div style={{ fontSize: '0.8rem', color: C.muted }}>
                  💬 {p.commentCount} comment{p.commentCount !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PostDetail({ post, onBack }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      const { ok: userOk, body: userData } = await api('/api/daily');
      if (userOk) setUser(userData.user);

      const { ok, body } = await api(`/api/posts/${post.id}/comments?limit=50&offset=0`);
      if (ok && body) setComments(body.comments || []);
      setLoading(false);
    };
    loadPost();
  }, [post.id]);

  const addComment = async () => {
    if (!commentText.trim()) return;
    const { ok, body } = await api(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: commentText }),
    });
    if (ok && body) {
      setComments(prev => [body, ...prev]);
      setCommentText('');
    }
  };

  const deleteComment = async (commentId) => {
    const { ok } = await api(`/api/posts/${post.id}/comments/${commentId}`, {
      method: 'DELETE',
    });
    if (ok) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  const gameNameMap = {};
  GAMES.forEach(g => gameNameMap[g.id] = g);
  const game = gameNameMap[post.gameId];

  if (loading) return <div className="lobby" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="game-wrap">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              background: C.accent, color: '#fff', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontWeight: '600'
            }}>
              {(post.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '600' }}>{post.username}</div>
              <div style={{ fontSize: '0.8rem', color: C.muted }}>
                {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'now'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{game?.icon || '🎮'}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>{game?.name || post.gameId}</span>
          </div>
          <div style={{ color: C.gold, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
            {post.score} pts{post.timeSecs ? ` · ${Math.floor(post.timeSecs / 60)}:${String(post.timeSecs % 60).padStart(2, '0')}` : ''}
          </div>
          {post.caption && <div style={{ fontSize: '0.95rem', marginTop: '0.75rem' }}>{post.caption}</div>}
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Comments ({comments.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {comments.map(c => (
              <div key={c.id} className="card" style={{ padding: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{c.username}</div>
                    <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.4rem' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : 'now'}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{c.text}</div>
                  </div>
                  {user && user.id === c.userId && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.rose,
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        marginLeft: '0.5rem',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value.slice(0, 280))}
              onKeyDown={(e) => e.key === 'Enter' && addComment()}
              style={{
                flex: 1,
                padding: '0.6rem 0.8rem',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                color: C.text,
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              onClick={addComment}
              style={{
                padding: '0.6rem 1rem',
                background: C.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
