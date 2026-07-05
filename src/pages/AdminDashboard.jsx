import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Hash, Users, Link2, ShieldCheck, LogOut, MessageSquare,
  RefreshCw, Pencil, Trash2, X, Sun, Moon,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import BackButton from '../components/BackButton';
import { authedFetch, PERMISSION_BITS, PERMISSION_PRESETS, initialsOf } from '../lib/api';

const TABS = [
  { key: 'addUser', label: 'Add User', icon: UserPlus },
  { key: 'addChannel', label: 'Add Channel', icon: Hash },
  { key: 'userList', label: 'Users', icon: Users },
  { key: 'channelList', label: 'Channels', icon: Hash },
  { key: 'assign', label: 'Assign to Channel', icon: Link2 },
];

const themeVars = `
:root {
  --discord-blurple: #5865F2;
  --card: #0f1724;
  --muted: #99AAB5;
  --white: #FFFFFF;
  --danger: #ff6b6b;
  --success: #3ad29f;
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
  --border: rgba(255,255,255,0.04);
  --font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  --radius-xl: 14px;
}
`;

function AdminDashboard({ userData, token, onLogout, onBack, onOpenChat, isDarkMode, toggleDarkMode }) {
  const [activeTab, setActiveTab] = useState('addUser');
  const [addUserForm, setAddUserForm] = useState({ email: '', username: '', password: '', role: 'student', first_name: '', last_name: '' });
  const [addChannelForm, setAddChannelForm] = useState({ name: '', status: 'active' });
  const [userList, setUserList] = useState([]);
  const [channelList, setChannelList] = useState([]);
  const [userChannelList, setUserChannelList] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [assignForm, setAssignForm] = useState({ user_id: '', channel_id: '', status: 'active', permission: PERMISSION_PRESETS.member.value });

  const notify = (msg, isError = false) => {
    setMessage(msg);
    if (isError) toast.error(msg); else toast.success(msg);
  };

  const fetchUserList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authedFetch(token, '/admin/get_user_list');
      setUserList(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      notify(`Failed to fetch user list: ${e.message}`, true);
    }
    setLoading(false);
  }, [token]);

  const fetchChannelList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authedFetch(token, '/admin/get_channel_list');
      setChannelList(data.channel || []);
    } catch (e) {
      notify(`Failed to fetch channel list: ${e.message}`, true);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUserChannelList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authedFetch(token, '/admin/get_userinfo_at_channel');
      setUserChannelList(data.UserInfo || []);
    } catch (e) {
      notify(`Failed to fetch user-channel info: ${e.message}`, true);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Preload everything once so switching tabs (and the Assign tab's dropdowns) always has fresh data.
  useEffect(() => {
    fetchUserList();
    fetchChannelList();
    fetchUserChannelList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'userList') fetchUserList();
    if (activeTab === 'channelList') fetchChannelList();
    if (activeTab === 'assign') { fetchUserList(); fetchChannelList(); fetchUserChannelList(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authedFetch(token, '/admin/add_user', { method: 'POST', body: JSON.stringify(addUserForm) });
      notify(`User "${addUserForm.username}" created. Now assign them to a channel so they can chat.`);
      setAddUserForm({ email: '', username: '', password: '', role: 'student', first_name: '', last_name: '' });
      await fetchUserList();
      setActiveTab('userList');
    } catch (e) {
      notify(`Failed to add user: ${e.message}`, true);
    }
    setLoading(false);
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authedFetch(token, '/admin/add_channel', { method: 'POST', body: JSON.stringify(addChannelForm) });
      notify(`Channel "${addChannelForm.name}" created. Now assign members to it.`);
      setAddChannelForm({ name: '', status: 'active' });
      await fetchChannelList();
      setActiveTab('assign');
    } catch (e) {
      notify(`Failed to add channel: ${e.message}`, true);
    }
    setLoading(false);
  };

  const handleDeleteChannel = async (channel) => {
    if (!window.confirm(`Delete channel "${channel.name}"? This marks it deleted (soft delete).`)) return;
    setLoading(true);
    try {
      await authedFetch(token, '/admin/delete_channel', {
        method: 'POST',
        body: JSON.stringify({ channel_id: channel.id, name: channel.name }),
      });
      notify(`Channel "${channel.name}" deleted.`);
      await fetchChannelList();
    } catch (e) {
      notify(`Failed to delete channel: ${e.message}`, true);
    }
    setLoading(false);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authedFetch(token, '/admin/edit_user', {
        method: 'POST',
        body: JSON.stringify({
          user_id: editingUser.id,
          email: editingUser.email,
          username: editingUser.username,
          user_role: editingUser.user_role,
          status: editingUser.status,
          first_name: editingUser.first_name,
          last_name: editingUser.last_name,
        }),
      });
      notify(`User "${editingUser.username}" updated.`);
      setEditingUser(null);
      await fetchUserList();
    } catch (e) {
      notify(`Failed to update user: ${e.message}`, true);
    }
    setLoading(false);
  };

  const togglePermBit = (value) => {
    setAssignForm((f) => ({ ...f, permission: f.permission ^ value }));
  };

  const applyPreset = (presetKey) => {
    setAssignForm((f) => ({ ...f, permission: PERMISSION_PRESETS[presetKey].value }));
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.user_id || !assignForm.channel_id) {
      notify('Pick a user and a channel first.', true);
      return;
    }
    setLoading(true);
    try {
      await authedFetch(token, '/admin/edit_user_channel', {
        method: 'POST',
        body: JSON.stringify({
          channel_id: Number(assignForm.channel_id),
          user_id: Number(assignForm.user_id),
          status: assignForm.status,
          permission: assignForm.permission,
        }),
      });
      notify('Channel membership updated — the user will see it next time they open (or refresh) the chat.');
      await fetchUserChannelList();
    } catch (e) {
      notify(`Failed to update membership: ${e.message}`, true);
    }
    setLoading(false);
  };

  const loadExistingMembership = (userId, channelId) => {
    const existing = userChannelList.find((uc) => String(uc.user_id) === String(userId) && String(uc.channel_id) === String(channelId));
    if (existing) {
      setAssignForm((f) => ({ ...f, status: existing.status, permission: existing.permission }));
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <style>{themeVars}</style>
      <div style={{ fontFamily: 'var(--font-family)', background: 'var(--background)', minHeight: '100vh' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', background: 'var(--card)', boxShadow: 'var(--shadow)', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <BackButton onClick={onBack} label="Home" />
            <div>
              <h2 style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 24, margin: 0, letterSpacing: 0.5 }}>Admin Dashboard</h2>
              <p style={{ color: 'var(--muted-foreground)', fontSize: 13, margin: '2px 0 0' }}>Signed in as {userData?.username}</p>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px', borderRadius: 'var(--radius)',
                  border: activeTab === tab.key ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: activeTab === tab.key ? 'var(--primary)' : 'var(--secondary)',
                  color: activeTab === tab.key ? '#fff' : 'var(--muted-foreground)',
                  fontWeight: 600, cursor: 'pointer', fontSize: 14,
                }}
              >
                <tab.icon size={15} /> {tab.label}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={toggleDarkMode} style={iconBtnStyle} title="Toggle theme">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={onOpenChat} style={{ ...iconBtnStyle, width: 'auto', padding: '0 14px', gap: 6, display: 'flex', background: 'var(--secondary)' }} title="Open chat">
              <MessageSquare size={16} /> Chat
            </button>
            <button onClick={onLogout} style={{ ...iconBtnStyle, background: 'var(--danger)', color: '#fff' }} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {message && (
          <div style={{ margin: '18px 28px 0', color: 'var(--muted-foreground)', fontWeight: 500, fontSize: 14 }}>{message}</div>
        )}

        <main style={{ padding: 28, maxWidth: 1200, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {activeTab === 'addUser' && (
            <form onSubmit={handleAddUser} style={cardStyle}>
              <h3 style={cardTitleStyle}><UserPlus size={18} /> Add User</h3>
              <input type="email" required placeholder="Email" value={addUserForm.email} onChange={(e) => setAddUserForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
              <input type="text" required minLength={4} placeholder="Username (min 4 chars)" value={addUserForm.username} onChange={(e) => setAddUserForm((f) => ({ ...f, username: e.target.value }))} style={inputStyle} />
              <input type="password" required minLength={8} placeholder="Password (min 8 chars)" value={addUserForm.password} onChange={(e) => setAddUserForm((f) => ({ ...f, password: e.target.value }))} style={inputStyle} />
              <select required value={addUserForm.role} onChange={(e) => setAddUserForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="sys_admin">Sys Admin</option>
              </select>
              <input type="text" required placeholder="First Name" value={addUserForm.first_name} onChange={(e) => setAddUserForm((f) => ({ ...f, first_name: e.target.value }))} style={inputStyle} />
              <input type="text" required placeholder="Last Name" value={addUserForm.last_name} onChange={(e) => setAddUserForm((f) => ({ ...f, last_name: e.target.value }))} style={inputStyle} />
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Creating…' : 'Add User'}</button>
            </form>
          )}

          {activeTab === 'addChannel' && (
            <form onSubmit={handleAddChannel} style={cardStyle}>
              <h3 style={cardTitleStyle}><Hash size={18} /> Add Channel</h3>
              <input type="text" required placeholder="Channel Name" value={addChannelForm.name} onChange={(e) => setAddChannelForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
              <select required value={addChannelForm.status} onChange={(e) => setAddChannelForm((f) => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="deleted">Deleted</option>
              </select>
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Creating…' : 'Add Channel'}</button>
            </form>
          )}

          {activeTab === 'userList' && (
            <section>
              <div style={sectionHeaderStyle}>
                <h3 style={{ ...cardTitleStyle, margin: 0 }}><Users size={18} /> User List</h3>
                <button onClick={fetchUserList} style={buttonStyle}><RefreshCw size={14} style={{ marginRight: 6 }} />Refresh</button>
              </div>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead style={theadStyle}>
                    <tr><th style={thStyle}>ID</th><th style={thStyle}>Name</th><th style={thStyle}>Username</th><th style={thStyle}>Email</th><th style={thStyle}>Status</th><th style={thStyle}>Role</th><th style={thStyle}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {userList.map((u) => (
                      <tr key={u.id} style={trStyle}>
                        <td style={tdStyle}>{u.id}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={avatarStyle}>{initialsOf(`${u.first_name} ${u.last_name}`)}</div>
                            {u.first_name} {u.last_name}
                          </div>
                        </td>
                        <td style={tdStyle}>{u.username}</td>
                        <td style={tdStyle}>{u.email}</td>
                        <td style={tdStyle}><StatusPill status={u.status} /></td>
                        <td style={tdStyle}>{u.user_role}</td>
                        <td style={tdStyle}>
                          <button style={smallIconBtn} onClick={() => setEditingUser({ ...u })} title="Edit"><Pencil size={14} /></button>
                        </td>
                      </tr>
                    ))}
                    {userList.length === 0 && !loading && (
                      <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted-foreground)' }}>No users found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'channelList' && (
            <section>
              <div style={sectionHeaderStyle}>
                <h3 style={{ ...cardTitleStyle, margin: 0 }}><Hash size={18} /> Channel List</h3>
                <button onClick={fetchChannelList} style={buttonStyle}><RefreshCw size={14} style={{ marginRight: 6 }} />Refresh</button>
              </div>
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead style={theadStyle}>
                    <tr><th style={thStyle}>ID</th><th style={thStyle}>Name</th><th style={thStyle}>Status</th><th style={thStyle}>Members</th><th style={thStyle}>Actions</th></tr>
                  </thead>
                  <tbody>
                    {channelList.map((c) => (
                      <tr key={c.id} style={trStyle}>
                        <td style={tdStyle}>{c.id}</td>
                        <td style={tdStyle}># {c.name}</td>
                        <td style={tdStyle}><StatusPill status={c.status} /></td>
                        <td style={tdStyle}>{userChannelList.filter((uc) => uc.channel_id === c.id).length}</td>
                        <td style={tdStyle}>
                          <button
                            style={smallIconBtn}
                            title="Assign members"
                            onClick={() => { setAssignForm((f) => ({ ...f, channel_id: String(c.id) })); setActiveTab('assign'); }}
                          ><Link2 size={14} /></button>
                          <button style={{ ...smallIconBtn, marginLeft: 6 }} title="Delete channel" onClick={() => handleDeleteChannel(c)}><Trash2 size={14} color="var(--danger)" /></button>
                        </td>
                      </tr>
                    ))}
                    {channelList.length === 0 && !loading && (
                      <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted-foreground)' }}>No channels found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'assign' && (
            <section>
              <div style={cardStyle}>
                <h3 style={cardTitleStyle}><Link2 size={18} /> Assign User to Channel</h3>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                  This is what makes a user (and the channel) show up on their Chat page — creating a user or a channel alone isn't enough.
                </p>
                <form onSubmit={handleAssign}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <select
                      required value={assignForm.user_id}
                      onChange={(e) => { const v = e.target.value; setAssignForm((f) => ({ ...f, user_id: v })); loadExistingMembership(v, assignForm.channel_id); }}
                      style={inputStyle}
                    >
                      <option value="">Select user…</option>
                      {userList.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
                    </select>
                    <select
                      required value={assignForm.channel_id}
                      onChange={(e) => { const v = e.target.value; setAssignForm((f) => ({ ...f, channel_id: v })); loadExistingMembership(assignForm.user_id, v); }}
                      style={inputStyle}
                    >
                      <option value="">Select channel…</option>
                      {channelList.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                  </div>

                  <select value={assignForm.status} onChange={(e) => setAssignForm((f) => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, maxWidth: 240 }}>
                    <option value="active">Active</option>
                    <option value="banned">Banned</option>
                    <option value="deleted">Deleted</option>
                  </select>

                  <div style={{ margin: '14px 0 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                      <button type="button" key={key} onClick={() => applyPreset(key)} style={{ ...smallPillBtn }}>{preset.label}</button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: 'var(--glass)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                    {PERMISSION_BITS.map((p) => (
                      <label key={p.bit} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--foreground)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={Boolean(assignForm.permission & p.value)} onChange={() => togglePermBit(p.value)} style={{ marginTop: 3 }} />
                        <span>
                          <div style={{ fontWeight: 600 }}>{p.label}</div>
                          <div style={{ color: 'var(--muted-foreground)', fontSize: 11.5 }}>{p.description}</div>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div style={{ color: 'var(--muted-foreground)', fontSize: 12, marginBottom: 12 }}>Permission value: <code>{assignForm.permission}</code></div>

                  <button type="submit" disabled={loading} style={buttonStyle}>{loading ? 'Saving…' : 'Save Membership'}</button>
                </form>
              </div>

              <div style={{ marginTop: 28 }}>
                <div style={sectionHeaderStyle}>
                  <h3 style={{ ...cardTitleStyle, margin: 0 }}><Users size={18} /> Current Channel Memberships</h3>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <select value={selectedChannelId} onChange={(e) => setSelectedChannelId(e.target.value)} style={{ ...inputStyle, marginBottom: 0, width: 200 }}>
                      <option value="">All Channels</option>
                      {channelList.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
                    </select>
                    <button onClick={fetchUserChannelList} style={buttonStyle}><RefreshCw size={14} style={{ marginRight: 6 }} />Refresh</button>
                  </div>
                </div>
                <div style={tableWrapStyle}>
                  <table style={tableStyle}>
                    <thead style={theadStyle}>
                      <tr><th style={thStyle}>Channel</th><th style={thStyle}>User</th><th style={thStyle}>Status</th><th style={thStyle}>Permission</th></tr>
                    </thead>
                    <tbody>
                      {userChannelList
                        .filter((uc) => !selectedChannelId || String(uc.channel_id) === String(selectedChannelId))
                        .map((uc) => (
                          <tr key={`${uc.channel_id}-${uc.user_id}`} style={trStyle}>
                            <td style={tdStyle}># {uc.channel_name}</td>
                            <td style={tdStyle}>{uc.username}</td>
                            <td style={tdStyle}><StatusPill status={uc.status} /></td>
                            <td style={tdStyle}>{uc.permission}</td>
                          </tr>
                        ))}
                      {userChannelList.length === 0 && !loading && (
                        <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted-foreground)' }}>No memberships yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </main>

        {editingUser && (
          <div style={modalOverlayStyle} onClick={() => setEditingUser(null)}>
            <form style={modalStyle} onClick={(e) => e.stopPropagation()} onSubmit={handleEditUserSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ color: 'var(--primary)', fontWeight: 700, margin: 0 }}>Edit User</h3>
                <button type="button" onClick={() => setEditingUser(null)} style={iconBtnStyle}><X size={16} /></button>
              </div>
              <input type="email" required placeholder="Email" value={editingUser.email} onChange={(e) => setEditingUser((u) => ({ ...u, email: e.target.value }))} style={inputStyle} />
              <input type="text" required placeholder="Username" value={editingUser.username} onChange={(e) => setEditingUser((u) => ({ ...u, username: e.target.value }))} style={inputStyle} />
              <input type="text" placeholder="First Name" value={editingUser.first_name || ''} onChange={(e) => setEditingUser((u) => ({ ...u, first_name: e.target.value }))} style={inputStyle} />
              <input type="text" placeholder="Last Name" value={editingUser.last_name || ''} onChange={(e) => setEditingUser((u) => ({ ...u, last_name: e.target.value }))} style={inputStyle} />
              <select value={editingUser.user_role} onChange={(e) => setEditingUser((u) => ({ ...u, user_role: e.target.value }))} style={inputStyle}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="sys_admin">Sys Admin</option>
              </select>
              <select value={editingUser.status} onChange={(e) => setEditingUser((u) => ({ ...u, status: e.target.value }))} style={inputStyle}>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="deleted">Deleted</option>
              </select>
              <button type="submit" disabled={loading} style={{ ...buttonStyle, width: '100%' }}>{loading ? 'Saving…' : 'Save Changes'}</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

function StatusPill({ status }) {
  const color = status === 'active' ? 'var(--success)' : status === 'banned' ? '#f5a623' : 'var(--danger)';
  return (
    <span style={{ color, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{status}
    </span>
  );
}

const inputStyle = {
  display: 'block', width: '100%', padding: '10px 12px', marginBottom: 12,
  borderRadius: 8, border: '1px solid var(--border)', background: 'var(--glass-2)',
  color: 'var(--foreground)', fontSize: 14, boxSizing: 'border-box', outline: 'none',
};

const buttonStyle = {
  padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)',
  color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14,
};

const smallPillBtn = {
  padding: '5px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--secondary)',
  color: 'var(--foreground)', fontWeight: 600, cursor: 'pointer', fontSize: 12,
};

const smallIconBtn = {
  width: 30, height: 30, borderRadius: 6, border: 'none', background: 'var(--secondary)',
  color: 'var(--foreground)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const iconBtnStyle = {
  width: 34, height: 34, borderRadius: 8, background: 'var(--secondary)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--foreground)',
};

const cardStyle = {
  maxWidth: 560, margin: '0 auto', background: 'var(--glass)', padding: 28,
  borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow)', color: 'var(--foreground)',
  border: '1px solid var(--border)',
};

const cardTitleStyle = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, color: 'var(--primary)', fontWeight: 700, fontSize: 18 };

const sectionHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 };

const tableWrapStyle = { overflowX: 'auto', background: 'var(--glass)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' };

const tableStyle = { width: '100%', borderCollapse: 'collapse' };

const theadStyle = { background: 'var(--secondary)', color: 'var(--primary)' };

const thStyle = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5 };

const tdStyle = { padding: '12px 16px', color: 'var(--foreground)', fontSize: 14, borderTop: '1px solid var(--border)' };

const trStyle = {};

const avatarStyle = {
  width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11,
};

const modalOverlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(5,7,12,0.75)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 200,
};

const modalStyle = {
  background: 'var(--card)', borderRadius: 'var(--radius-xl)', padding: 28, minWidth: 360,
  boxShadow: 'var(--shadow)', border: '1px solid var(--border)',
};

export default AdminDashboard;
