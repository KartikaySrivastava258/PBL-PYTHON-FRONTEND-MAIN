import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ShieldCheck, LogOut, UserCheck, MessageSquare, Send, Zap, ZapOff,
  Search, Pin, Users, Pencil, Trash2, X, Check, Copy, RefreshCw, Smile, ChevronUp, Hash,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import BackButton from '../components/BackButton';
import {
  WS_BASE_URL, canRead, canSend, canDeleteOwn, canModerate,
  initialsOf, formatTime, formatDay,
} from '../lib/api';

const runtimeStyle = `
:root{
  --discord-blurple:#5865F2;
  --discord-blurple-2:#404EED;
  --card:#0f1724;
  --muted:#99AAB5;
  --white:#FFFFFF;
  --danger:#ff6b6b;
  --success:#3ad29f;
  --glass: rgba(255,255,255,0.03);
  --glass-2: rgba(255,255,255,0.02);
  --shadow: 0 8px 30px rgba(2,6,23,0.6);
  --radius: 14px;
  --transition: 0.28s;
  --primary: var(--discord-blurple);
  --secondary: rgba(255,255,255,0.04);
  --foreground: #E6EDF3;
  --muted-foreground: #9AA7B2;
  --background: linear-gradient(180deg, rgba(10,12,20,1) 0%, rgba(5,7,12,1) 100%);
  --chat-bubble: rgba(255,255,255,0.03);
  --chat-bubble-own: linear-gradient(90deg, rgba(88,101,242,0.95), rgba(64,78,237,0.95));
  --primary-glow: rgba(88,101,242,0.95);
  --border: rgba(255,255,255,0.04);
  --chat-input: rgba(255,255,255,0.02);
  --font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  --radius-xl: 14px;
}
body { margin: 0; font-family: var(--font-family); background: var(--background); }
.msg-row:hover .msg-actions { opacity: 1 !important; }
.channel-row:hover { background: var(--secondary) !important; }
@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
`;

function reconcileMessage(list, incoming) {
  const idx = list.findIndex((m) => m.message_id === incoming.message_id);
  if (idx === -1) return [...list, incoming];
  const next = list.slice();
  next[idx] = incoming;
  return next;
}

export default function ChatPage({ userData, token, onLogout, onBack, onOpenAdmin, isDarkMode, toggleDarkMode }) {
  const effectiveUserId = userData?.sub;
  const username = userData?.username || 'You';
  const role = userData?.role;

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-generated', 'chat-runtime-style');
    styleEl.innerHTML = runtimeStyle;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ---- connection state ----
  const socketRef = useRef(null);
  const queueRef = useRef([]); // FIFO of {request, meta} matching backend response order
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chatStatus, setChatStatus] = useState('Not connected.');

  // ---- data state ----
  const [channels, setChannels] = useState([]); // [{channel_id, channel_name, last_message, permission}]
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messagesByChannel, setMessagesByChannel] = useState({}); // {id: [MessageItem]}
  const [oldestLoadedByChannel, setOldestLoadedByChannel] = useState({});
  const [hasMoreByChannel, setHasMoreByChannel] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [usersByChannel, setUsersByChannel] = useState({});
  const [unreadChannels, setUnreadChannels] = useState(() => new Set());

  // ---- UI state ----
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [memberPanelOpen, setMemberPanelOpen] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState(() => {
    try {
      const raw = localStorage.getItem('pinnedMessages_v2');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('pinnedMessages_v2', JSON.stringify(pinnedMessages)); } catch { /* ignore */ }
  }, [pinnedMessages]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.channel_id === activeChannelId) || null,
    [channels, activeChannelId]
  );
  const activePermission = activeChannel?.permission ?? 0;
  const activeMessages = useMemo(
    () => messagesByChannel[activeChannelId] || [],
    [messagesByChannel, activeChannelId]
  );

  // ---------------------------------------------------------------------
  // WebSocket lifecycle
  // ---------------------------------------------------------------------
  const sendWs = useCallback((payload, meta = {}) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast.error('Not connected to chat server');
      return false;
    }
    queueRef.current.push({ request: payload.request, meta });
    ws.send(JSON.stringify(payload));
    return true;
  }, []);

  const requestChannels = useCallback(() => {
    setLoadingChannels(true);
    sendWs({ request: 'get_channels', limit: 100 }, { kind: 'get_channels' });
  }, [sendWs]);

  const requestMessages = useCallback((channelId, { prevId = null, older = false } = {}) => {
    if (!channelId) return;
    if (older) setLoadingOlder(true); else setLoadingMessages(true);
    sendWs(
      { request: 'load_messages', channel_id: channelId, limit: 30, prev_id: prevId },
      { kind: 'load_messages', channelId, older }
    );
  }, [sendWs]);

  const requestUsers = useCallback((channelId) => {
    if (!channelId) return;
    sendWs({ request: 'load_users', channel_id: channelId }, { kind: 'load_users', channelId });
  }, [sendWs]);

  const connect = useCallback(() => {
    if (!token || !effectiveUserId) {
      setChatStatus('Missing authentication details.');
      toast.error('Missing authentication details');
      return;
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) return;

    setConnecting(true);
    setChatStatus('Connecting...');
    const url = `${WS_BASE_URL}/chats/${encodeURIComponent(effectiveUserId)}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setConnecting(false);
      setChatStatus('Connected');
      queueRef.current = [];
      requestChannels();
      toast.success('Connected to chat');
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const isPush = !data.request && !data.type;
      if (isPush && data.message_id !== undefined) {
        handleIncomingPush(data);
        return;
      }

      const entry = queueRef.current.shift();
      const meta = entry?.meta || {};

      if (data.error) {
        toast.error(String(data.error).replace(/_/g, ' '), { description: data.detail });
        if (meta.kind === 'load_messages') { setLoadingMessages(false); setLoadingOlder(false); }
        if (meta.kind === 'get_channels') setLoadingChannels(false);
        return;
      }

      const kind = data.request || data.type;
      switch (kind) {
        case 'get_channels':
          handleChannelsResponse(data);
          break;
        case 'load_messages':
          handleMessagesResponse(data, meta);
          break;
        case 'load_users':
          handleUsersResponse(data, meta);
          break;
        case 'send_message':
        case 'delete_message':
        case 'edited_message':
          handleSendAck(data, meta);
          break;
        default:
          break;
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setConnecting(false);
      setChatStatus('Disconnected');
      socketRef.current = null;
      if (reconnectAttemptsRef.current < 6) {
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 15000);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => connect(), delay);
      }
    };

    ws.onerror = () => {
      setChatStatus('Connection error.');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, effectiveUserId, requestChannels]);

  const disconnect = () => {
    reconnectAttemptsRef.current = 999; // stop auto-reconnect
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (socketRef.current) socketRef.current.close();
  };

  useEffect(() => {
    connect();
    return () => {
      reconnectAttemptsRef.current = 999;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Response / push handlers
  // ---------------------------------------------------------------------
  function handleChannelsResponse(data) {
    setLoadingChannels(false);
    const list = data.channels || [];
    setChannels(list);
    setActiveChannelId((prev) => {
      if (prev && list.some((c) => c.channel_id === prev)) return prev;
      return list.length ? list[0].channel_id : null;
    });
    if (list.length === 0) {
      setChatStatus('Connected — you are not a member of any channel yet.');
    }
  }

  function handleMessagesResponse(data, meta) {
    const { channelId, older } = meta;
    if (older) setLoadingOlder(false); else setLoadingMessages(false);
    if (!channelId) return;
    const incoming = (data.messages || []).slice().reverse(); // backend returns DESC, we want ascending

    setMessagesByChannel((prev) => {
      const existing = prev[channelId] || [];
      let merged;
      if (older) {
        const existingIds = new Set(existing.map((m) => m.message_id));
        merged = [...incoming.filter((m) => !existingIds.has(m.message_id)), ...existing];
      } else {
        merged = incoming;
      }
      return { ...prev, [channelId]: merged };
    });

    setHasMoreByChannel((prev) => ({ ...prev, [channelId]: (data.messages || []).length >= 30 }));
    if (incoming.length > 0) {
      setOldestLoadedByChannel((prev) => ({
        ...prev,
        [channelId]: older ? Math.min(prev[channelId] ?? Infinity, incoming[0].message_id) : incoming[0].message_id,
      }));
    }
    setUnreadChannels((prev) => {
      if (!prev.has(channelId)) return prev;
      const next = new Set(prev);
      next.delete(channelId);
      return next;
    });
  }

  function handleUsersResponse(data, meta) {
    const { channelId } = meta;
    if (!channelId) return;
    setUsersByChannel((prev) => ({ ...prev, [channelId]: data.users || [] }));
  }

  function handleSendAck(data, meta) {
    if (data.status !== 'success') return;
    const channelId = meta.channelId;
    if (channelId) requestMessages(channelId);
    requestChannels(); // refresh last-message previews / new channels
  }

  function handleIncomingPush(msg) {
    const cid = msg.channel_id;
    setMessagesByChannel((prev) => {
      const existing = prev[cid] || [];
      return { ...prev, [cid]: reconcileMessage(existing, msg) };
    });

    setActiveChannelId((currentActive) => {
      if (cid !== currentActive) {
        setUnreadChannels((prev) => new Set(prev).add(cid));
        const chName = channels.find((c) => c.channel_id === cid)?.channel_name || 'a channel';
        if (msg.status !== 'Deleted') {
          toast.message(`New message in #${chName}`, { description: msg.message, duration: 3000 });
        }
      }
      return currentActive;
    });
  }

  // ---------------------------------------------------------------------
  // Channel switching
  // ---------------------------------------------------------------------
  const selectChannel = (channelId) => {
    setActiveChannelId(channelId);
    setEditingId(null);
    setUnreadChannels((prev) => {
      if (!prev.has(channelId)) return prev;
      const next = new Set(prev);
      next.delete(channelId);
      return next;
    });
    if (!messagesByChannel[channelId]) {
      requestMessages(channelId);
    }
    if (!usersByChannel[channelId]) {
      requestUsers(channelId);
    }
  };

  useEffect(() => {
    if (activeChannelId && !messagesByChannel[activeChannelId]) {
      requestMessages(activeChannelId);
    }
    if (activeChannelId && !usersByChannel[activeChannelId]) {
      requestUsers(activeChannelId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeChannelId]);

  // ---------------------------------------------------------------------
  // Message actions
  // ---------------------------------------------------------------------
  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeChannelId) return;
    if (!canSend(activePermission)) {
      toast.error("You don't have permission to send messages here");
      return;
    }
    const ok = sendWs(
      { request: 'send_message', channel_id: activeChannelId, status: 'Normal', message: text },
      { kind: 'send_message', channelId: activeChannelId }
    );
    if (ok) setDraft('');
  };

  const startEdit = (msg) => {
    setEditingId(msg.message_id);
    setEditDraft(msg.message || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const submitEdit = (msg) => {
    const text = editDraft.trim();
    if (!text) return;
    sendWs(
      { request: 'send_message', channel_id: activeChannelId, status: 'Edited', message: text, prev_id: msg.message_id },
      { kind: 'send_message', channelId: activeChannelId }
    );
    cancelEdit();
  };

  const deleteMessage = (msg) => {
    if (!window.confirm('Delete this message?')) return;
    sendWs(
      { request: 'send_message', channel_id: activeChannelId, status: 'Deleted', prev_id: msg.message_id },
      { kind: 'send_message', channelId: activeChannelId }
    );
  };

  const copyMessage = (msg) => {
    navigator.clipboard?.writeText(msg.message || '');
    toast.success('Copied to clipboard', { duration: 1500 });
  };

  const handlePinMessage = (msg) => {
    setPinnedMessages((prev) => {
      const exists = prev.some((m) => m.message_id === msg.message_id);
      if (exists) {
        toast.info('Message unpinned', { duration: 1500 });
        return prev.filter((m) => m.message_id !== msg.message_id);
      }
      toast.success('Message pinned', { duration: 1500 });
      return [...prev, msg];
    });
  };

  const handleEmojiClick = (emojiObject) => {
    setDraft((d) => d + (emojiObject?.emoji || ''));
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // ---------------------------------------------------------------------
  // Derived: search + day grouping
  // ---------------------------------------------------------------------
  const visibleMessages = useMemo(() => {
    if (!searchQuery.trim()) return activeMessages;
    const q = searchQuery.toLowerCase();
    return activeMessages.filter((m) => (m.message || '').toLowerCase().includes(q));
  }, [activeMessages, searchQuery]);

  const activePinned = pinnedMessages.filter((m) => m.channel_id === activeChannelId);
  const activeUsers = usersByChannel[activeChannelId] || [];
  const totalUnread = unreadChannels.size;

  const canReadActive = canRead(activePermission);
  const canSendActive = canSend(activePermission);

  return (
    <>
      <Toaster position="top-right" richColors />
      <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', fontFamily: 'var(--font-family)', position: 'relative' }}>

        {/* Sidebar */}
        <aside
          style={{
            width: sidebarOpen ? 280 : 0,
            minWidth: sidebarOpen ? 280 : 0,
            background: 'var(--card)',
            borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
            display: sidebarOpen ? 'flex' : 'none',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'width 0.3s',
            zIndex: 99,
          }}
          className="sidebar"
        >
          <div style={{ overflowY: 'auto' }}>
            <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderBottom: '1px solid var(--border)' }}>
              <BackButton onClick={onBack} label="Home" style={{ padding: '6px 10px', fontSize: 13 }} />
              <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 18, marginLeft: 2 }}>Nexus Chat</span>
            </div>

            <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                CHANNELS {totalUnread > 0 && <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 999, padding: '1px 7px', marginLeft: 6, fontSize: 11 }}>{totalUnread}</span>}
              </span>
              <button title="Refresh channels" onClick={requestChannels} style={iconBtnStyle}>
                <RefreshCw size={14} className={loadingChannels ? 'spin' : ''} />
              </button>
            </div>

            <div style={{ padding: '0 8px' }}>
              {channels.length === 0 && !loadingChannels && (
                <div style={{ color: 'var(--muted-foreground)', fontSize: 13, padding: '8px 12px' }}>
                  No channels yet. Ask an admin to add you to one.
                </div>
              )}
              {channels.map((ch) => (
                <button
                  key={ch.channel_id}
                  className="channel-row"
                  onClick={() => selectChannel(ch.channel_id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: activeChannelId === ch.channel_id ? 'var(--secondary)' : 'transparent',
                    color: activeChannelId === ch.channel_id ? 'var(--foreground)' : 'var(--muted-foreground)',
                    textAlign: 'left',
                    padding: '9px 12px',
                    border: 'none',
                    borderRadius: 8,
                    marginBottom: 3,
                    fontWeight: 500,
                    fontSize: 15,
                    cursor: 'pointer',
                  }}
                >
                  <Hash size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.channel_name}</span>
                  {!canRead(ch.permission) && <span title="No read access" style={{ fontSize: 10, color: 'var(--danger)' }}>⛔</span>}
                  {unreadChannels.has(ch.channel_id) && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse-dot 1.4s infinite' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* User panel */}
          <div style={{ borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {initialsOf(username)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: 'var(--foreground)', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</div>
                <div style={{ color: 'var(--muted-foreground)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? 'var(--success)' : 'var(--muted)' }} />
                  {role || 'Member'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {role === 'sys_admin' && (
                <button style={iconBtnStyle} title="Admin dashboard" onClick={onOpenAdmin}>
                  <ShieldCheck size={16} />
                </button>
              )}
              <button style={{ ...iconBtnStyle, background: 'var(--danger)', color: '#fff' }} onClick={onLogout} title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0 20px', justifyContent: 'space-between', background: 'var(--card)', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen((s) => !s)} style={{ ...iconBtnStyle, display: 'none' }}>☰</button>
              <MessageSquare size={18} color="var(--muted-foreground)" />
              <span style={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeChannel ? `#${activeChannel.channel_name}` : 'Select a channel'}
              </span>
              <span title={chatStatus} style={{
                background: isConnected ? 'hsl(146, 71%, 40%)' : connecting ? 'var(--primary)' : 'var(--muted)',
                color: '#fff', borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 600, flexShrink: 0,
              }}>
                {isConnected ? 'Connected' : connecting ? 'Connecting…' : 'Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <button style={iconBtnStyle} title="Toggle theme" onClick={toggleDarkMode}>{isDarkMode ? '☀️' : '🌙'}</button>
              <button style={iconBtnStyle} title="Search messages" onClick={() => setShowSearch((s) => !s)}><Search size={17} /></button>
              <button style={iconBtnStyle} title="Members" onClick={() => setMemberPanelOpen((s) => !s)}><Users size={17} /></button>
              {!isConnected ? (
                <button onClick={connect} disabled={connecting} style={{ ...pillBtnStyle, background: 'var(--success)' }}>
                  <Zap size={14} /> {connecting ? 'Connecting' : 'Connect'}
                </button>
              ) : (
                <button onClick={disconnect} style={{ ...pillBtnStyle, background: 'var(--danger)' }}>
                  <ZapOff size={14} /> Disconnect
                </button>
              )}
            </div>
          </div>

          {showSearch && (
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this channel's loaded messages..."
                style={{ width: '100%', background: 'var(--chat-input)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--foreground)', outline: 'none' }}
              />
            </div>
          )}

          {/* Messages */}
          <div ref={messagesScrollRef} style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {!activeChannelId && (
              <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: 60 }}>
                Pick a channel on the left to start chatting.
              </div>
            )}

            {activeChannelId && !canReadActive && (
              <div style={{ textAlign: 'center', color: 'var(--danger)', marginTop: 40 }}>
                You don't have permission to read this channel.
              </div>
            )}

            {activeChannelId && canReadActive && hasMoreByChannel[activeChannelId] && (
              <button
                onClick={() => requestMessages(activeChannelId, { prevId: oldestLoadedByChannel[activeChannelId], older: true })}
                disabled={loadingOlder}
                style={{ alignSelf: 'center', ...pillBtnStyle, background: 'var(--secondary)', color: 'var(--foreground)', marginBottom: 12 }}
              >
                <ChevronUp size={14} /> {loadingOlder ? 'Loading…' : 'Load older messages'}
              </button>
            )}

            {activeChannelId && canReadActive && activePinned.length > 0 && (
              <div style={{ marginBottom: 12, background: 'var(--glass)', borderRadius: 10, padding: 10 }}>
                <div style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pin size={14} /> Pinned ({activePinned.length})
                </div>
                {activePinned.map((m) => (
                  <div key={m.message_id} style={{ fontSize: 13, color: 'var(--foreground)', padding: '4px 0', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span><b style={{ color: 'var(--primary-glow)' }}>{m.sender_name}:</b> {m.message}</span>
                    <button onClick={() => handlePinMessage(m)} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {activeChannelId && canReadActive && loadingMessages && (
              <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: 20 }}>Loading messages…</div>
            )}

            {activeChannelId && canReadActive && !loadingMessages && visibleMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', marginTop: 40 }}>
                {searchQuery ? 'No messages match your search.' : 'No messages yet. Say hello!'}
              </div>
            )}

            {visibleMessages.map((msg, idx) => {
              const isOwn = String(msg.sender_id) === String(effectiveUserId);
              const isDeleted = msg.status === 'Deleted';
              const isEdited = msg.status === 'Edited';
              const prevMsg = visibleMessages[idx - 1];
              const showDayDivider = !prevMsg || formatDay(prevMsg.timestamp) !== formatDay(msg.timestamp);
              const canEditThis = isOwn && !isDeleted;
              const canDeleteThis = !isDeleted && ((isOwn && canDeleteOwn(activePermission)) || (!isOwn && canModerate(activePermission)));
              const isEditing = editingId === msg.message_id;

              return (
                <React.Fragment key={`${msg.message_id}-${idx}`}>
                  {showDayDivider && (
                    <div style={{ textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 12, margin: '14px 0 6px', fontWeight: 600 }}>
                      — {formatDay(msg.timestamp)} —
                    </div>
                  )}
                  <div
                    className="msg-row"
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-end',
                      flexDirection: isOwn ? 'row-reverse' : 'row',
                      alignSelf: isOwn ? 'flex-end' : 'flex-start',
                      maxWidth: '72%', padding: '3px 0',
                    }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: isOwn ? 'var(--primary)' : 'var(--secondary)', color: isOwn ? '#fff' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {initialsOf(msg.sender_name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexDirection: isOwn ? 'row-reverse' : 'row', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: isOwn ? 'var(--primary-glow)' : 'var(--foreground)' }}>{isOwn ? 'You' : msg.sender_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{formatTime(msg.timestamp)}</span>
                        {isEdited && <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>(edited)</span>}
                      </div>

                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            autoFocus
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(msg); if (e.key === 'Escape') cancelEdit(); }}
                            style={{ background: 'var(--chat-input)', border: '1px solid var(--primary)', borderRadius: 8, padding: '6px 10px', color: 'var(--foreground)', outline: 'none', minWidth: 200 }}
                          />
                          <button onClick={() => submitEdit(msg)} style={iconBtnStyle}><Check size={15} color="var(--success)" /></button>
                          <button onClick={cancelEdit} style={iconBtnStyle}><X size={15} color="var(--danger)" /></button>
                        </div>
                      ) : (
                        <div style={{
                          background: isDeleted ? 'transparent' : isOwn ? 'var(--chat-bubble-own)' : 'var(--chat-bubble)',
                          color: isDeleted ? 'var(--muted-foreground)' : isOwn ? '#fff' : 'var(--foreground)',
                          fontStyle: isDeleted ? 'italic' : 'normal',
                          border: isDeleted ? '1px dashed var(--border)' : 'none',
                          borderRadius: 'var(--radius-xl)', padding: '10px 16px', fontSize: 14.5, wordBreak: 'break-word',
                        }}>
                          {msg.message}
                        </div>
                      )}
                    </div>

                    {!isEditing && !isDeleted && (
                      <div className="msg-actions" style={{ display: 'flex', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                        <button title="Copy" style={iconBtnStyle} onClick={() => copyMessage(msg)}><Copy size={13} /></button>
                        <button title={pinnedMessages.some((m) => m.message_id === msg.message_id) ? 'Unpin' : 'Pin'} style={iconBtnStyle} onClick={() => handlePinMessage(msg)}>
                          <Pin size={13} color={pinnedMessages.some((m) => m.message_id === msg.message_id) ? 'var(--primary)' : undefined} />
                        </button>
                        {canEditThis && <button title="Edit" style={iconBtnStyle} onClick={() => startEdit(msg)}><Pencil size={13} /></button>}
                        {canDeleteThis && <button title="Delete" style={iconBtnStyle} onClick={() => deleteMessage(msg)}><Trash2 size={13} color="var(--danger)" /></button>}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form onSubmit={handleSendMessage} style={{ borderTop: '1px solid var(--border)', background: 'var(--card)', padding: 14, display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
            <button type="button" style={iconBtnStyle} onClick={() => setShowEmojiPicker((s) => !s)} title="Emoji">
              <Smile size={18} />
            </button>
            {showEmojiPicker && (
              <div style={{ position: 'absolute', bottom: 60, left: 12, zIndex: 30 }}>
                <EmojiPicker onEmojiClick={handleEmojiClick} theme={isDarkMode ? 'dark' : 'light'} height={350} width={320} />
              </div>
            )}
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              placeholder={
                !isConnected ? 'Connecting to chat…'
                  : !activeChannelId ? 'Select a channel first'
                  : !canSendActive ? "You can't send messages in this channel"
                  : 'Message #' + (activeChannel?.channel_name || '')
              }
              disabled={!isConnected || !activeChannelId || !canSendActive}
              style={{
                flex: 1, background: 'var(--chat-input)', color: 'var(--foreground)', border: 'none',
                borderRadius: 'var(--radius)', padding: '0 16px', height: 42, fontSize: 15, outline: 'none',
                boxShadow: isConnected && canSendActive ? '0 0 0 1.5px var(--border)' : 'none',
              }}
            />
            <button
              type="submit"
              disabled={!isConnected || !activeChannelId || !canSendActive || !draft.trim()}
              style={{
                width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (!isConnected || !canSendActive) ? 'not-allowed' : 'pointer',
                opacity: (!isConnected || !canSendActive || !draft.trim()) ? 0.5 : 1,
              }}
            >
              <Send color="#fff" size={18} />
            </button>
          </form>
        </main>

        {/* Members panel */}
        {memberPanelOpen && (
          <aside style={{ width: 240, background: 'var(--card)', borderLeft: '1px solid var(--border)', padding: '16px 14px', overflowY: 'auto' }}>
            <div style={{ color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              MEMBERS — {activeUsers.length}
            </div>
            {activeUsers.length === 0 && <div style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>No data yet.</div>}
            {activeUsers.map((u) => (
              <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                  {initialsOf(u.user_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: 'var(--foreground)', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.user_name}{String(u.user_id) === String(effectiveUserId) ? ' (you)' : ''}
                  </div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>
                    {canModerate(u.permission) ? 'Moderator' : canSend(u.permission) ? 'Member' : 'Read-only'}
                  </div>
                </div>
              </div>
            ))}
          </aside>
        )}

        <style>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
          @media (max-width: 900px) {
            .sidebar-toggle { display: flex !important; }
          }
        `}</style>
      </div>
    </>
  );
}

const iconBtnStyle = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'var(--secondary)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--foreground)',
  flexShrink: 0,
};

const pillBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  borderRadius: 999,
  padding: '7px 14px',
  color: '#fff',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};
