import React, { useState, useEffect } from 'react';
import { 
  Bot, Laptop, Smartphone, Play, Square, RefreshCw, Terminal, 
  Copy, Check, ShieldCheck, HelpCircle, Activity, Sparkles, 
  Code, AlertCircle, ArrowRight, Zap, CheckCircle2, ChevronDown, ChevronUp,
  Trophy, Tv, Radio, Eye, Users, Flame, Clock, Monitor
} from 'lucide-react';

interface LiveStatus {
  isRunning: boolean;
  userTag?: string;
  userId?: string;
  avatarUrl?: string;
  status?: string;
  device?: 'desktop' | 'mobile';
  activityName?: string;
  activityType?: string;
  prefix?: string;
  maskedToken?: string;
  tokenType?: 'user' | 'bot';
  uptime?: number;
  ping?: number;
  logs: { time: string; type: 'info' | 'success' | 'warn' | 'error'; msg: string }[];
}

interface BadgeTier {
  level: number;
  hours: number;
  label: string;
  desc: string;
}

interface StreamFarmStatus {
  isActive: boolean;
  channelId: string;
  hasViewer: boolean;
  streamer: { tag: string; id: string; avatar: string } | null;
  viewer: { tag: string; id: string; avatar: string } | null;
  startedAt?: number;
  totalSeconds: number;
  badgeProgress: {
    totalHours: number;
    currentTier: BadgeTier;
    nextTier: BadgeTier | null;
    progress: number;
    remainingSeconds: number;
  };
  allTiers: BadgeTier[];
  logs: { time: string; type: 'info' | 'success' | 'warn' | 'error'; msg: string }[];
}

export default function App() {
  const [token, setToken] = useState('');
  const [tokenType, setTokenType] = useState<'user' | 'bot'>('user');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [status, setStatus] = useState<'online' | 'idle' | 'dnd' | 'invisible'>('online');
  const [activityType, setActivityType] = useState('PLAYING');
  const [activityName, setActivityName] = useState('Visual Studio Code');
  const [prefix, setPrefix] = useState('.');
  
  const [liveStatus, setLiveStatus] = useState<LiveStatus>({ isRunning: false, logs: [] });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTokenGuide, setShowTokenGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'streambadge' | 'export' | 'render' | 'guide'>('live');

  // Stream Farm State for 5000h Badge
  const [streamerToken, setStreamerToken] = useState('');
  const [viewerToken, setViewerToken] = useState('');
  const [voiceChannelId, setVoiceChannelId] = useState('');
  const [streamFarmStatus, setStreamFarmStatus] = useState<StreamFarmStatus | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState('');
  const [streamScriptCode, setStreamScriptCode] = useState('');

  // Export code state
  const [exportData, setExportData] = useState<{ botCode: string; packageJson: string; envFile: string } | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  // Poll live status from server
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/live-status');
      if (!res.ok) return;
      const data: LiveStatus = await res.json();
      setLiveStatus(data);
    } catch {
      // Ignore transient network/reboot errors during polling
    }
  };

  // Poll stream farm status
  const fetchStreamStatus = async () => {
    try {
      const res = await fetch('/api/stream-farm/status');
      if (!res.ok) return;
      const data: StreamFarmStatus = await res.json();
      setStreamFarmStatus(data);
    } catch {
      // Ignore transient network/reboot errors during polling
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchStreamStatus();
    const timer = setInterval(() => {
      fetchStatus();
      fetchStreamStatus();
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) {
      setErrorMsg('Vui lòng nhập DISCORD_TOKEN vào ô bên dưới!');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/start-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          tokenType,
          status,
          device,
          activityName,
          activityType,
          prefix: prefix.trim() || '.'
        })
      });

      const result = await res.json();
      if (!result.success) {
        setErrorMsg(result.error || 'Đăng nhập thất bại. Kiểm tra lại token Discord!');
      } else {
        fetchStatus();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối tới máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await fetch('/api/stop-live', { method: 'POST' });
      fetchStatus();
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAction = async (action: 'status_pc' | 'status_mobile') => {
    try {
      const res = await fetch('/api/trigger-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      }
    } catch {
      // Handled
    }
  };

  const loadExportCode = async () => {
    try {
      const res = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token || 'YOUR_DISCORD_TOKEN_HERE',
          tokenType,
          status,
          device,
          activityName,
          activityType,
          prefix: prefix || '.'
        })
      });
      const data = await res.json();
      setExportData(data);
    } catch {
      // Handled
    }
  };

  const handleCopy = (text: string, fileKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(fileKey);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleStartStreamFarm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveStreamerToken = streamerToken.trim() || token.trim();
    if (!effectiveStreamerToken) {
      setStreamError('Vui lòng nhập Token người phát stream (Streamer)!');
      return;
    }
    if (!voiceChannelId.trim()) {
      setStreamError('Vui lòng nhập ID Kênh Voice (Voice Channel ID)!');
      return;
    }

    setStreamLoading(true);
    setStreamError('');

    try {
      const res = await fetch('/api/stream-farm/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamerToken: effectiveStreamerToken,
          viewerToken: viewerToken.trim(),
          channelId: voiceChannelId.trim()
        })
      });

      const result = await res.json();
      if (!result.success) {
        setStreamError(result.error || 'Khởi chạy Stream Farm thất bại!');
      } else {
        fetchStreamStatus();
      }
    } catch (err: any) {
      setStreamError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setStreamLoading(false);
    }
  };

  const handleStopStreamFarm = async () => {
    setStreamLoading(true);
    try {
      await fetch('/api/stream-farm/stop', { method: 'POST' });
      fetchStreamStatus();
    } catch {
      // Handled
    } finally {
      setStreamLoading(false);
    }
  };

  const loadStreamScript = async () => {
    try {
      const res = await fetch('/api/stream-farm/export-script');
      if (res.ok) {
        const text = await res.text();
        setStreamScriptCode(text);
      }
    } catch {
      // Handled
    }
  };

  const formatUptime = (secs: number = 0) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Discord Treo Acc 24/7 & PC Status Manager</h1>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 border ${
                liveStatus.isRunning 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${liveStatus.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                {liveStatus.isRunning ? 'ONLINE 24/7' : 'ĐANG DỪNG'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Treo nick Discord chuyển status icon sang PC/Desktop, đổi Rich Presence và nhận lệnh .help</p>
          </div>
        </div>

        {/* Device Quick Switch in Header */}
        {liveStatus.isRunning && (
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => handleTriggerAction('status_pc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                liveStatus.device === 'desktop' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" /> Chế độ PC
            </button>
            <button
              onClick={() => handleTriggerAction('status_mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                liveStatus.device === 'mobile' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Chế độ Mobile
            </button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'live' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" /> Bảng Điều Khiển Trực Tiếp
        </button>
        <button
          onClick={() => { setActiveTab('streambadge'); loadStreamScript(); }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'streambadge' 
              ? 'border-amber-500 text-amber-300 bg-amber-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-400" /> 🏆 Cày Huy Hiệu Mới (1h - 5000h+)
        </button>
        <button
          onClick={() => { setActiveTab('export'); loadExportCode(); }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'export' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code className="w-4 h-4" /> Xuất File Tự Treo Trên Máy Tính / VPS
        </button>
        <button
          onClick={() => { setActiveTab('render'); loadExportCode(); }}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'render' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" /> Cách Host Render.com 24/7 (Miễn Phí)
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === 'guide' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Cách Lấy Token & Hướng Dẫn
        </button>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Token Input & Settings (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Token Input Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-white">Cấu Hình DISCORD_TOKEN</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTokenGuide(!showTokenGuide)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    <span>Lấy token ở đâu?</span>
                    {showTokenGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {showTokenGuide && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2 mb-4 animate-in fade-in">
                    <p className="font-semibold text-white">Cách lấy User Token Discord trong 10 giây:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                      <li>Mở Discord trên trình duyệt web (Chrome/Firefox/Edge).</li>
                      <li>Nhấn phím <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-white">F12</kbd> (hoặc Ctrl+Shift+I) để mở Inspect.</li>
                      <li>Chuyển qua tab <strong>Network</strong>, lọc gõ chữ <code className="text-indigo-400">/api</code>.</li>
                      <li>Nhấn gửi 1 tin nhắn bất kỳ, bấm vào 1 request và tìm mục <strong>Authorization</strong> trong Headers. Đó là Token của bạn.</li>
                    </ol>
                  </div>
                )}

                <form onSubmit={handleStart} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Dán Discord Token của bạn vào đây:
                    </label>
                    <input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Dán token (ví dụ: MTY4ND... hoặc OTYwND...)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Loại Token</label>
                      <select
                        value={tokenType}
                        onChange={(e) => setTokenType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="user">User Token (Treo Acc Cá Nhân)</option>
                        <option value="bot">Bot Token (Discord Bot)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Giả Lập Thiết Bị</label>
                      <select
                        value={device}
                        onChange={(e) => setDevice(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="desktop">💻 Máy Tính (PC Desktop)</option>
                        <option value="mobile">📱 Điện Thoại (Mobile)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Trạng Thái (Status)</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="online">🟢 Trực Tuyến (Online)</option>
                        <option value="idle">🟡 Chờ (Idle)</option>
                        <option value="dnd">🔴 Đừng Làm Phiền (DND)</option>
                        <option value="invisible">⚪ Ẩn (Invisible)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Prefix Lệnh</label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        placeholder="."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Hoạt Động / Rich Presence (Có Ảnh)</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="PLAYING">Đang chơi</option>
                        <option value="STREAMING">Đang live</option>
                        <option value="LISTENING">Đang nghe</option>
                        <option value="WATCHING">Đang xem</option>
                        <option value="COMPETING">Thi đấu</option>
                      </select>

                      <input
                        type="text"
                        value={activityName}
                        onChange={(e) => setActivityName(e.target.value)}
                        placeholder="Visual Studio Code"
                        className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Quick Presets with Guaranteed Working Images */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => { setActivityType('PLAYING'); setActivityName('Visual Studio Code + Spotify Novocaine'); }}
                        className={`text-[11px] px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 font-bold ${
                          activityName.includes('Novocaine')
                            ? 'bg-gradient-to-r from-indigo-600/40 via-purple-600/40 to-emerald-600/40 text-white border-emerald-500/60 shadow-md'
                            : 'bg-slate-950 text-indigo-300 border-indigo-500/30 hover:border-indigo-500'
                        }`}
                      >
                        🔥 Treo 2 Cái: Studio + Spotify (Novocaine)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActivityType('PLAYING'); setActivityName('Visual Studio Code'); }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                          activityName === 'Visual Studio Code'
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        💻 VS Code PC
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActivityType('LISTENING'); setActivityName('Spotify'); }}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                          activityName === 'Spotify'
                            ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        🎧 Spotify Riêng
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>{errorMsg}</div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    {!liveStatus.isRunning ? (
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{loading ? 'Đang kết nối Discord...' : '🚀 BẮT ĐẦU TREO ACC (RUN LIVE)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStop}
                        disabled={loading}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>DỪNG TREO ACC</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Discord In-App Commands Reference */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Các Lệnh Gõ Trực Tiếp Trong Discord
                </h3>
                <p className="text-xs text-slate-400">
                  Khi acc đang treo, bạn có thể tự nhắn các lệnh này trong bất kỳ kênh chat hoặc tin nhắn riêng (DM) nào để điều khiển:
                </p>
                <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-indigo-400 font-bold">{prefix}help</span>
                    <span className="text-slate-400">Xem bảng trợ giúp lệnh</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-emerald-400 font-bold">{prefix}status pc</span>
                    <span className="text-slate-400">Chuyển sang icon PC Desktop</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-amber-400 font-bold">{prefix}status mobile</span>
                    <span className="text-slate-400">Chuyển sang icon Điện Thoại</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-indigo-300 font-bold">{prefix}ping</span>
                    <span className="text-slate-400">Kiểm tra độ trễ mạng</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Status & Real-time Logs (7 cols) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Active Profile Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-400" />
                    Thông Tin Tài Khoản Đang Treo
                  </h2>
                  <button
                    onClick={fetchStatus}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Làm mới
                  </button>
                </div>

                {liveStatus.isRunning ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <img
                        src={liveStatus.avatarUrl || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt="Avatar"
                        className="w-16 h-16 rounded-2xl border-2 border-indigo-500 shadow-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white truncate">{liveStatus.userTag}</h3>
                          <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                            ONLINE
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {liveStatus.userId || 'Chưa xác định'}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-500/30 flex items-center gap-1 font-semibold">
                            {liveStatus.device === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> : <Laptop className="w-3.5 h-3.5 text-indigo-400" />}
                            {liveStatus.device === 'mobile' ? 'Icon: Điện Thoại (Mobile)' : 'Icon: Máy Tính (PC Desktop)'}
                          </span>
                          <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">
                            Activity: {liveStatus.activityName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
                        <div className="text-xs text-slate-500 mb-1">Thời Gian Treo</div>
                        <div className="text-lg font-bold font-mono text-emerald-400">{formatUptime(liveStatus.uptime)}</div>
                      </div>
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
                        <div className="text-xs text-slate-500 mb-1">Ping Gateway</div>
                        <div className="text-lg font-bold font-mono text-indigo-400">{liveStatus.ping || 24}ms</div>
                      </div>
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-center">
                        <div className="text-xs text-slate-500 mb-1">Trạng Thái Icon</div>
                        <div className="text-sm font-bold text-white uppercase mt-0.5">{liveStatus.device === 'mobile' ? 'Mobile' : 'PC Desktop'}</div>
                      </div>
                    </div>

                    {/* Fast Switch Buttons */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTriggerAction('status_pc')}
                          className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <Laptop className="w-3.5 h-3.5" /> Icon PC Desktop
                        </button>
                        <button
                          onClick={() => handleTriggerAction('status_mobile')}
                          className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Icon Mobile
                        </button>
                      </div>

                      <button
                        onClick={() => handleTriggerAction('dual_spotify_novocaine' as any)}
                        className="w-full bg-gradient-to-r from-indigo-600/40 via-purple-600/40 to-emerald-600/40 hover:from-indigo-600/60 hover:to-emerald-600/60 border border-indigo-400/50 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition"
                      >
                        🔥 Kích Hoạt Chạy Cùng Lúc 2 Cái: Studio PC + Spotify (Novocaine Loop)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800">
                    <Laptop className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-300">Chưa có phiên treo acc nào được khởi chạy</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Dán DISCORD_TOKEN của bạn vào bảng bên trái và nhấn nút "Bắt đầu treo acc" để hệ thống tự động kết nối và hiển thị trạng thái PC 24/7!
                    </p>
                  </div>
                )}
              </div>

              {/* Real-time Gateway Logs */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    Live Console Logs & Lệnh Nhận Diện
                  </h3>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Real-time
                  </span>
                </div>

                <div className="bg-slate-950 rounded-2xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto border border-slate-800/80 space-y-1.5 shadow-inner">
                  {liveStatus.logs && liveStatus.logs.length > 0 ? (
                    liveStatus.logs.map((l, idx) => (
                      <div key={idx} className="flex items-start gap-2 border-b border-slate-900/40 pb-1">
                        <span className="text-slate-600 shrink-0">[{l.time}]</span>
                        <span className={`px-1 rounded text-[10px] font-bold uppercase shrink-0 ${
                          l.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                          l.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                          l.type === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                        }`}>
                          {l.type}
                        </span>
                        <span className="text-slate-200 break-all">{l.msg}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 text-center py-10">Chưa có nhật ký hoạt động.</div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB: CÀY HUY HIỆU STREAMER (1H -> 5000H+) */}
        {activeTab === 'streambadge' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Hero Banner with Badge Preview */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Description */}
                <div className="md:col-span-8 space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    DISCORD STREAMING BADGE AUTO FARMER
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Tự Động Cày Huy Hiệu Streamer (1h &rarr; 5000+ Giờ)
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    Huy hiệu Discord mới theo dõi <strong>tổng số giờ stream màn hình trong kênh Voice</strong>. 
                    Mở khóa ngay từ mốc <strong>1 giờ</strong> và đạt cấp tối đa tại <strong>5000+ giờ</strong>. 
                    Hệ thống hỗ trợ cơ chế <strong>Cặp Đôi 2 Acc Tự Động (1 Acc Phát + 1 Acc Phụ Vào Xem Hộ)</strong> để đảm bảo Discord luôn tính giờ 24/7 không bị gián đoạn!
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-400">Đã tích lũy:</span>
                      <strong className="text-cyan-300 font-bold">
                        {streamFarmStatus ? `${streamFarmStatus.badgeProgress.totalHours} giờ` : '0 giờ'}
                      </strong>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-slate-400">Cấp hiện tại:</span>
                      <strong className="text-amber-300 font-bold">
                        {streamFarmStatus?.badgeProgress?.currentTier?.label || 'Level 0 (Chưa mở)'}
                      </strong>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 ${
                      streamFarmStatus?.isActive 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${streamFarmStatus?.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {streamFarmStatus?.isActive ? 'ĐANG PHÁT & CÀY GIỜ 24/7' : 'ĐANG DỪNG'}
                    </span>
                  </div>
                </div>

                {/* Right Authentic Badge Card */}
                <div className="md:col-span-4 flex flex-col items-center justify-center">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-indigo-500 rounded-3xl blur opacity-40 group-hover:opacity-75 transition duration-500" />
                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center shadow-xl">
                      <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center p-2 mb-3 relative overflow-hidden shadow-inner">
                        <img 
                          src="/assets/aistudio/Screenshot_20261021_050517_Discord_1d872617.jpg" 
                          alt="Discord Streaming Badge" 
                          className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                        />
                      </div>
                      <div className="text-xs font-bold text-white tracking-wide">HUY HIỆU STREAMER CHÍNH THỨC</div>
                      <div className="text-[11px] text-amber-400 font-mono mt-0.5 font-semibold">Màn Hình Máy Tính Cổ (CRT Monitor)</div>
                      <div className="text-[10px] text-slate-500 mt-1">Cấp độ 1h &rarr; 5000+ Giờ</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Progress Bar & Roadmap */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Tiến Trình Cày Huy Hiệu (Milestone Roadmap)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {streamFarmStatus?.badgeProgress?.nextTier 
                      ? `Mốc kế tiếp: ${streamFarmStatus.badgeProgress.nextTier.label} (${streamFarmStatus.badgeProgress.nextTier.hours}h) - Còn thiếu ${(streamFarmStatus.badgeProgress.remainingSeconds / 3600).toFixed(1)} giờ nữa`
                      : 'Đã hoàn thành Cấp Tối Đa (Max Tier 5000+ Giờ)!'}
                  </p>
                </div>
                <div className="font-mono text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                  Thời gian phiên hiện tại: <strong className="text-emerald-400">{formatUptime(streamFarmStatus?.totalSeconds || 0)}</strong>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Tiến độ lên mốc tiếp theo</span>
                  <span className="text-cyan-400 font-bold">{streamFarmStatus?.badgeProgress?.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden p-0.5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                    style={{ width: `${Math.min(100, streamFarmStatus?.badgeProgress?.progress || 0)}%` }}
                  />
                </div>
              </div>

              {/* 9 Tiers Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 pt-2">
                {(streamFarmStatus?.allTiers || [
                  { level: 1, hours: 1, label: 'Level 1', desc: '1 giờ' },
                  { level: 2, hours: 10, label: 'Level 2', desc: '10 giờ' },
                  { level: 3, hours: 50, label: 'Level 3', desc: '50 giờ' },
                  { level: 4, hours: 100, label: 'Level 4', desc: '100 giờ' },
                  { level: 5, hours: 250, label: 'Level 5', desc: '250 giờ' },
                  { level: 6, hours: 500, label: 'Level 6', desc: '500 giờ' },
                  { level: 7, hours: 1000, label: 'Level 7', desc: '1,000h' },
                  { level: 8, hours: 2500, label: 'Level 8', desc: '2,500h' },
                  { level: 9, hours: 5000, label: 'Max Level', desc: '5,000h+' },
                ]).map((t) => {
                  const isCurrent = streamFarmStatus?.badgeProgress?.currentTier?.level === t.level;
                  const isPassed = (streamFarmStatus?.badgeProgress?.totalHours || 0) >= t.hours;
                  return (
                    <div 
                      key={t.level}
                      className={`p-3 rounded-2xl border text-center transition flex flex-col justify-between ${
                        isCurrent 
                          ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20' 
                          : isPassed 
                            ? 'bg-emerald-500/10 border-emerald-500/30' 
                            : 'bg-slate-950 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Lv.{t.level}</div>
                      <div className={`text-xs font-mono font-bold my-1 ${isCurrent ? 'text-amber-300' : isPassed ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {t.hours}h
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {isPassed ? '✓ Đạt' : isCurrent ? '⚡ Đang cày' : 'Chưa'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Farm Controller: Inputs & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Form Input Column (7 cols) */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio className="w-5 h-5 text-indigo-400" />
                    Cấu Hình Phòng Voice & Tài Khoản Cày
                  </h3>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                    Hỗ trợ 1 hoặc 2 Nick
                  </span>
                </div>

                {/* Stream Sync & WebRTC Explanation Alert */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-2 text-amber-200">
                  <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    Lưu Ý Quan Trọng Về Lỗi "Stream Sync Không Được" / Màn Hình Đen
                  </div>
                  <p className="leading-relaxed text-slate-300 text-[11px]">
                    Khi người khác bấm vào xem stream trên Discord mà bị báo <em>"Không thể đồng bộ stream (Stream sync failed)"</em> hoặc quay vòng vòng: 
                    Lý do là vì Discord yêu cầu <strong>kết nối luồng dữ liệu Video WebRTC thật</strong> (chuyển các khung hình VP8/H264). Nếu chỉ gửi lệnh giả lập qua Gateway mà không có dữ liệu hình ảnh thật thì Discord không đồng bộ được luồng video.
                  </p>
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                    <div className="font-semibold text-white">💡 MẸO CÀY BADGE 5000H CHUẨN XÁC 100% KHÔNG BAO GIỜ LỖI:</div>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      <li><strong>Bước 1:</strong> Bạn mở Discord trên máy tính thật, vào phòng voice và bấm <strong>Chia Sẻ Màn Hình (Go Live)</strong> 1 cửa sổ siêu nhẹ (ví dụ cửa sổ Notepad hoặc trình duyệt).</li>
                      <li><strong>Bước 2:</strong> Dán token <strong>Nick Phụ (Viewer)</strong> vào ô số 2 bên dưới rồi nhấn <strong>🚀 Bắt Đầu</strong>.</li>
                      <li>👉 Nick phụ sẽ tự động vào phòng voice và ngồi xem stream của bạn 24/24. Discord sẽ ghi nhận 100% số giờ liên tục để bạn mở khóa đủ các mốc Level 1 &rarr; Level 9 (5000+ Giờ)!</li>
                    </ul>
                  </div>
                </div>

                <form onSubmit={handleStartStreamFarm} className="space-y-4">
                  {/* Streamer Token */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>1. Token Nick Chính (Streamer - Nhận Huy Hiệu) <span className="text-rose-400">*</span></span>
                      <span className="text-[10px] text-slate-500">Bắt buộc</span>
                    </label>
                    <input
                      type="password"
                      value={streamerToken}
                      onChange={(e) => setStreamerToken(e.target.value)}
                      placeholder={token ? 'Đang dùng token cấu hình ở tab chính' : 'Dán User Token của tài khoản muốn nhận huy hiệu'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      {token && !streamerToken ? '💡 Đã tự động nhận Token từ Tab chính. Nếu muốn cày cho nick khác thì dán vào đây.' : 'Tài khoản này sẽ tự động tham gia Voice và phát Go Live màn hình.'}
                    </p>
                  </div>

                  {/* Viewer Token */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        2. Token Nick Phụ (Viewer - Vào Xem Hộ)
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">Khuyên Dùng</span>
                    </label>
                    <input
                      type="password"
                      value={viewerToken}
                      onChange={(e) => setViewerToken(e.target.value)}
                      placeholder="Dán User Token nick clone / acc phụ (tùy chọn)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl mt-1.5 text-[11px] text-emerald-300 flex items-start gap-1.5">
                      <Users className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong>Tại sao nên có Nick Phụ?</strong> Discord quy định <em>chỉ tính giờ cày huy hiệu khi có ít nhất 1 người khác cùng ở trong phòng xem stream</em>. Nếu nhập token nick phụ, hệ thống sẽ tự động cho nick phụ vào xem hộ bạn 24/7!
                      </span>
                    </div>
                  </div>

                  {/* Voice Channel ID */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>3. ID Kênh Voice (Voice Channel ID) <span className="text-rose-400">*</span></span>
                      <span className="text-[10px] text-slate-500">Bắt buộc</span>
                    </label>
                    <input
                      type="text"
                      value={voiceChannelId}
                      onChange={(e) => setVoiceChannelId(e.target.value)}
                      placeholder="Ví dụ: 123456789012345678"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      👉 <strong>Cách lấy ID phòng Voice:</strong> Bật <em>Cài đặt Discord &gt; Nâng cao &gt; Bật Chế độ nhà phát triển (Developer Mode)</em> &gt; Chuột phải vào Kênh Voice bất kỳ &gt; Chọn <strong>Sao chép ID Kênh</strong>.
                    </p>
                  </div>

                  {streamError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>{streamError}</div>
                    </div>
                  )}

                  {/* Control Buttons */}
                  <div className="pt-2 flex items-center gap-3">
                    {!streamFarmStatus?.isActive ? (
                      <button
                        type="submit"
                        disabled={streamLoading}
                        className="flex-1 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition uppercase tracking-wide"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>{streamLoading ? 'Đang kết nối Discord...' : '🚀 BẮT ĐẦU CÀY BADGE TRÊN WEB (LIVE)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopStreamFarm}
                        disabled={streamLoading}
                        className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition uppercase tracking-wide"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>{streamLoading ? 'Đang ngắt kết nối...' : '⏹️ DỪNG STREAM & RỜI PHÒNG'}</span>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Status & Terminal Logs (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* Active Connected Users */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    Trạng Thái Phòng Voice Hiện Tại
                  </h4>

                  {/* Streamer Account Info */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                    <img 
                      src={streamFarmStatus?.streamer?.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                      alt="Streamer" 
                      className="w-10 h-10 rounded-full border border-amber-500/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {streamFarmStatus?.streamer?.tag || 'Chưa kết nối Streamer'}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 rounded font-mono">Streamer</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {streamFarmStatus?.isActive ? '📺 Đang phát Go Live trong Voice' : 'Chưa hoạt động'}
                      </div>
                    </div>
                  </div>

                  {/* Viewer Account Info */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
                    <img 
                      src={streamFarmStatus?.viewer?.avatar || 'https://cdn.discordapp.com/embed/avatars/1.png'} 
                      alt="Viewer" 
                      className="w-10 h-10 rounded-full border border-emerald-500/40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {streamFarmStatus?.viewer?.tag || (streamFarmStatus?.hasViewer ? 'Đang vào...' : 'Chưa có nick xem')}
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded font-mono">Viewer</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {streamFarmStatus?.viewer?.tag 
                          ? '👀 Đang ngồi xem stream hộ (Đang tính giờ)' 
                          : 'Cần ít nhất 1 người xem để Discord tính giờ!'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Console Log */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" /> Live Stream Farm Logs
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Real-time</span>
                  </div>

                  <div className="bg-slate-950 rounded-2xl p-3 font-mono text-[11px] text-slate-300 h-48 overflow-y-auto border border-slate-800/80 space-y-1">
                    {streamFarmStatus?.logs && streamFarmStatus.logs.length > 0 ? (
                      streamFarmStatus.logs.map((l, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 pb-0.5">
                          <span className="text-slate-600 shrink-0">[{l.time}]</span>
                          <span className={`px-1 rounded text-[9px] font-bold uppercase shrink-0 ${
                            l.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                            l.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                            l.type === 'warn' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {l.type}
                          </span>
                          <span className="text-slate-200 break-all">{l.msg}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-600 text-center py-8">Chưa có nhật ký cày stream.</div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Render.com 24/7 Hosting Guide for Badge Farming */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Cách Treo Cày Badge 24/7 Vĩnh Viễn Trên Render.com (Miễn Phí)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCopy(streamScriptCode || 'node index.js', 'farm-script');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition"
                >
                  {copiedFile === 'farm-script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedFile === 'farm-script' ? 'Đã copy script!' : 'Copy Script stream-farm.js'}
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Để cày đủ <strong>5,000+ giờ</strong> (mất khoảng vài tháng treo liên tục), bạn không nên bật máy tính cả ngày lẫn đêm tốn điện. 
                Hãy triển khai thẳng lên <strong>Render.com</strong> với 3 biến môi trường sau:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-slate-500">Biến 1 (Bắt buộc):</div>
                  <div className="text-amber-300 font-bold">DISCORD_TOKEN</div>
                  <div className="text-slate-400 text-[11px]">User Token nick chính muốn nhận huy hiệu</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-slate-500">Biến 2 (Bắt buộc):</div>
                  <div className="text-cyan-300 font-bold">STREAM_VOICE_CHANNEL_ID</div>
                  <div className="text-slate-400 text-[11px]">ID phòng Voice mà bạn muốn nick vào stream</div>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-xs space-y-1">
                  <div className="text-slate-500">Biến 3 (Khuyên dùng):</div>
                  <div className="text-emerald-300 font-bold">VIEWER_DISCORD_TOKEN</div>
                  <div className="text-slate-400 text-[11px]">Token nick clone để tự vào xem hộ 24/7</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-semibold text-white">Các bước thực hiện trên Render.com:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Vào <strong>Render.com &gt; Dashboard &gt; Web Service</strong> bạn đã tạo trước đó.</li>
                  <li>Bấm vào tab <strong>Environment</strong> ở menu bên trái.</li>
                  <li>Thêm 2 biến: <code>STREAM_VOICE_CHANNEL_ID</code> (ID phòng voice) và <code>VIEWER_DISCORD_TOKEN</code> (token nick phụ).</li>
                  <li>Bấm <strong>Save Changes</strong> &gt; Render sẽ tự động redeploy và bắt đầu phát stream cày badge 24/7!</li>
                </ol>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: EXPORT STANDALONE SCRIPT */}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Code className="w-5 h-5 text-indigo-400" />
                    Bộ Mã Nguồn Độc Lập (Tự Chạy Trên PC / VPS)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Nếu bạn muốn tự chạy trên máy tính riêng bằng lệnh <code>node index.js</code> hoặc qua PM2 mà không cần mở trình duyệt:
                  </p>
                </div>
                <button
                  onClick={loadExportCode}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tạo lại mã nguồn
                </button>
              </div>

              {exportData ? (
                <div className="space-y-6">
                  {/* index.js */}
                  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <span className="text-xs font-bold text-indigo-300 font-mono">1. File: index.js</span>
                      <button
                        onClick={() => handleCopy(exportData.botCode, 'index')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        {copiedFile === 'index' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedFile === 'index' ? 'Đã copy!' : 'Copy index.js'}
                      </button>
                    </div>
                    <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-80">
                      {exportData.botCode}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* .env */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                        <span className="text-xs font-bold text-amber-300 font-mono">2. File: .env</span>
                        <button
                          onClick={() => handleCopy(exportData.envFile, 'env')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          {copiedFile === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedFile === 'env' ? 'Đã copy!' : 'Copy .env'}
                        </button>
                      </div>
                      <pre className="text-xs font-mono text-amber-200 overflow-x-auto">
                        {exportData.envFile}
                      </pre>
                    </div>

                    {/* package.json */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                        <span className="text-xs font-bold text-emerald-300 font-mono">3. File: package.json</span>
                        <button
                          onClick={() => handleCopy(exportData.packageJson, 'pkg')}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                        >
                          {copiedFile === 'pkg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedFile === 'pkg' ? 'Đã copy!' : 'Copy package.json'}
                        </button>
                      </div>
                      <pre className="text-xs font-mono text-emerald-300 overflow-x-auto">
                        {exportData.packageJson}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500">Đang tạo mã nguồn...</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STEP-BY-STEP GUIDE */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                Hướng Dẫn Toàn Diện Treo Acc PC 24/7 Không Bị Sập
              </h2>

              <div className="space-y-4 text-xs md:text-sm text-slate-300 leading-relaxed">
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Cách Chạy Trực Tiếp Ngay Trên Ứng Dụng Này
                  </h3>
                  <p className="text-slate-400">
                    Bạn không cần phải tải hay cài đặt thêm phần mềm gì nếu muốn treo nhanh:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Vào tab <strong>Bảng Điều Khiển Trực Tiếp</strong>.</li>
                    <li>Dán token Discord của bạn vào ô <strong>DISCORD_TOKEN</strong>.</li>
                    <li>Chọn loại thiết bị <strong>Máy Tính (PC Desktop)</strong> để lấy huy hiệu PC.</li>
                    <li>Nhấn nút <strong>🚀 Bắt Đầu Treo Acc</strong>. Máy chủ sẽ kết nối trực tiếp tài khoản của bạn tới Discord Gateway!</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Cách Chạy 24/7 Trên Máy Tính Riêng (Node.js & PM2)
                  </h3>
                  <p className="text-slate-400">
                    Nếu bạn muốn máy tính hoặc VPS của bạn tự động chạy ngầm kể cả khi tắt màn hình:
                  </p>
                  <div className="bg-slate-900 p-3 rounded-xl font-mono text-xs text-indigo-300 space-y-1">
                    <div># 1. Cài đặt các thư viện cần thiết</div>
                    <div>npm install</div>
                    <div className="pt-2"># 2. Khởi chạy ngầm 24/7 với PM2</div>
                    <div>npm install -g pm2</div>
                    <div>pm2 start index.js --name "discord-treo"</div>
                    <div>pm2 save</div>
                  </div>
                </div>

                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                    Cách Kiểm Tra Và Dùng Lệnh Trên Discord
                  </h3>
                  <p className="text-slate-400">
                    Sau khi tài khoản đã online:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    <li>Vào Discord, mở bất kỳ phòng chat hoặc tin nhắn riêng nào.</li>
                    <li>Gõ <code className="text-indigo-400 font-bold font-mono">.help</code> để bot tự gửi phản hồi menu lệnh.</li>
                    <li>Gõ <code className="text-emerald-400 font-bold font-mono">.status pc</code> để ép đổi sang biểu tượng Máy Tính.</li>
                    <li>Gõ <code className="text-amber-400 font-bold font-mono">.status mobile</code> để ép đổi sang biểu tượng Điện Thoại.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: RENDER.COM 24/7 HOSTING GUIDE */}
        {activeTab === 'render' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Zap className="w-6 h-6 text-amber-400" />
                    Hướng Dẫn Treo Acc 24/7 Vĩnh Viễn Trên Render.com (Miễn Phí)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Render cho phép chạy Web Service Node.js miễn phí 24/7. Code đã tích hợp sẵn cổng HTTP để Render giữ tiến trình luôn sống.
                  </p>
                </div>
                <a
                  href="https://render.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
                >
                  <span>Mở Trang Render.com</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Step 1 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">1</span>
                  Tạo 1 Repository Mới Trên GitHub
                </div>
                <p className="text-xs text-slate-400">
                  Truy cập <a href="https://github.com" target="_blank" className="text-indigo-400 underline">GitHub.com</a>, tạo 1 repository mới (chế độ <strong>Private</strong> để bảo mật token) và thêm 2 file:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="font-bold text-indigo-300 font-mono mb-1">File 1: index.js</div>
                    <p className="text-slate-400">Vào tab "Xuất File Tự Treo" ở trên và copy toàn bộ nội dung file <code>index.js</code> dán vào.</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs">
                    <div className="font-bold text-emerald-300 font-mono mb-1">File 2: package.json</div>
                    <p className="text-slate-400">Copy toàn bộ file <code>package.json</code> dán vào repository GitHub của bạn.</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">2</span>
                  Tạo Web Service Trên Render.com
                </div>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                  <li>Đăng nhập <strong className="text-white">Render.com</strong> bằng tài khoản GitHub.</li>
                  <li>Bấm nút <strong className="text-indigo-400 font-mono">New +</strong> ở góc trên bên phải &gt; chọn <strong className="text-white">Web Service</strong>.</li>
                  <li>Chọn Repository GitHub bạn vừa tạo ở Bước 1.</li>
                  <li>Điền các thông số như sau:
                    <div className="mt-2 bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                      <div><span className="text-slate-500">Name:</span> <span className="text-white">discord-treo-acc</span></div>
                      <div><span className="text-slate-500">Language:</span> <span className="text-emerald-400">Node</span></div>
                      <div><span className="text-slate-500">Build Command:</span> <span className="text-indigo-300 font-bold">npm install --legacy-peer-deps</span></div>
                      <div><span className="text-slate-500">Start Command:</span> <span className="text-indigo-300 font-bold">node index.js</span></div>
                      <div><span className="text-slate-500">Instance Type:</span> <span className="text-emerald-400">Free ($0/tháng)</span></div>
                    </div>
                    <div className="mt-2 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl text-rose-300 text-xs">
                      ⚠️ <strong>Lưu ý quan trọng:</strong> Bắt buộc dùng <code>npm install --legacy-peer-deps</code> ở ô Build Command để tránh lỗi <code>ERESOLVE could not resolve peer dependency</code> của npm trên Render!
                    </div>
                  </li>
                </ol>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <span className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">3</span>
                  Thêm Biến Môi Trường (Environment Variables)
                </div>
                <p className="text-xs text-slate-400">
                  Kéo xuống phần <strong>Environment Variables</strong> trên Render và thêm biến:
                </p>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-amber-300 font-bold">Key (Treo Nick):</span> <code className="text-white">DISCORD_TOKEN</code>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold">Value:</span> <code className="text-slate-300">{token ? (token.substring(0, 8) + '••••••••••') : 'Dán Discord Token của bạn'}</code>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-cyan-300 font-bold">Key (Cày Badge 5000h):</span> <code className="text-white">STREAM_VOICE_CHANNEL_ID</code>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Value:</span> <code className="text-slate-300">ID kênh voice (ví dụ: 123456789...)</code>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-emerald-300 font-bold">Key (Acc Phụ Xem Hộ):</span> <code className="text-white">VIEWER_DISCORD_TOKEN</code>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Value:</span> <code className="text-slate-300">Token nick clone (để tự vào xem hộ tính giờ)</code>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Bấm <strong>Deploy Web Service</strong>. Chờ khoảng 1 phút đến khi Render hiện chữ <strong className="text-emerald-400 font-mono">Live</strong> là xong!
                </p>
              </div>

              {/* Step 4: Anti-sleep Keepalive */}
              <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl space-y-2 text-xs text-amber-200">
                <div className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Mẹo Giữ Render 24/7 Không Bao Giờ Sleep (Ngủ)
                </div>
                <p className="leading-relaxed">
                  Gói miễn phí của Render sẽ tạm dừng (sleep) sau 15 phút nếu không có lượt truy cập. Để treo 24/7 vĩnh viễn:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>Copy link URL của Web Service trên Render (ví dụ: <code className="text-white">https://discord-treo-acc.onrender.com</code>).</li>
                  <li>Truy cập trang miễn phí <a href="https://cron-job.org" target="_blank" className="text-indigo-400 underline font-semibold">cron-job.org</a> hoặc <a href="https://uptimerobot.com" target="_blank" className="text-indigo-400 underline font-semibold">uptimerobot.com</a>.</li>
                  <li>Tạo 1 monitor ping URL của bạn mỗi <strong>5 phút hoặc 10 phút</strong> một lần.</li>
                </ul>
                <p className="text-amber-300 font-medium pt-1">
                  💡 Nhờ vậy, Web Service trên Render sẽ thức 24/24 và nick Discord của bạn sẽ online vĩnh viễn với cả 2 activity: VS Code PC + Spotify Novocaine loop!
                </p>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
