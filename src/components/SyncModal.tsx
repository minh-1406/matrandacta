import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Cloud,
  ShieldCheck,
  ArrowRight,
  X,
  User as UserIcon,
  Download,
  Upload,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  loginWithGoogle,
  logoutUser,
  getOrCreateDeviceSessionCode,
  fetchSessionByCode,
  syncSessionToFirestore,
  fetchUserSessionWithMeta,
  CloudSessionPayload,
  isCloudSessionFromDifferentDevice,
} from '../services/firebaseService';
import { FullAppState } from '../types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentState: FullAppState;
  onLoadSyncedState: (state: FullAppState, message: string) => void;
  lastSyncedTime: string | null;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentState,
  onLoadSyncedState,
  lastSyncedTime,
}) => {
  const [sessionCode, setSessionCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [cloudData, setCloudData] = useState<CloudSessionPayload | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setSessionCode(getOrCreateDeviceSessionCode());
  }, []);

  const loadUserCloudSession = async (uid: string) => {
    setIsLoadingCloud(true);
    try {
      const data = await fetchUserSessionWithMeta(uid);
      setCloudData(data);
      return data;
    } catch (e) {
      console.warn('Failed to load user cloud session in modal:', e);
      return null;
    } finally {
      setIsLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      loadUserCloudSession(currentUser.uid);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const user = await loginWithGoogle();

      // Check if user has an existing cloud session from a DIFFERENT / OLD device
      const existingCloud = await fetchUserSessionWithMeta(user.uid);
      const isFromDifferentDevice = isCloudSessionFromDifferentDevice(existingCloud);

      if (
        isFromDifferentDevice &&
        existingCloud &&
        existingCloud.state &&
        Array.isArray(existingCloud.state.rows) &&
        existingCloud.state.rows.length > 0
      ) {
        setCloudData(existingCloud);
        onLoadSyncedState(
          existingCloud.state,
          `✓ Đã khôi phục thành công phiên làm việc [${existingCloud.state.mon} lớp ${existingCloud.state.grade}] từ máy cũ!`
        );
        setStatusMsg({
          type: 'success',
          text: `Đăng nhập thành công (${user.email})! Đã tự động khôi phục phiên làm việc từ máy cũ (Lưu lúc ${new Date(existingCloud.updatedAt).toLocaleString('vi-VN')}).`,
        });
      } else {
        // Same machine or cloud is empty: keep current machine's work and sync
        await syncSessionToFirestore(currentState, sessionCode, user);
        await loadUserCloudSession(user.uid);
        setStatusMsg({
          type: 'success',
          text: `Đăng nhập thành công (${user.email})! Đang tiếp tục phiên làm việc trên máy này.`,
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Lỗi đăng nhập Google: ${err.message || 'Không thể đăng nhập'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setCloudData(null);
      setStatusMsg({
        type: 'success',
        text: 'Đã đăng xuất tài khoản Google.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Không thể đăng xuất.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreFromCloud = () => {
    if (cloudData && cloudData.state) {
      onLoadSyncedState(
        cloudData.state,
        `✓ Đã tải thành công phiên làm việc [${cloudData.state.mon} lớp ${cloudData.state.grade}] từ tài khoản Google!`
      );
      setStatusMsg({
        type: 'success',
        text: `✓ Đã khôi phục thành công dữ liệu máy cũ từ tài khoản Google về máy này!`,
      });
    }
  };

  const handlePushCurrentToCloud = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await syncSessionToFirestore(currentState, sessionCode, currentUser);
      await loadUserCloudSession(currentUser.uid);
      setStatusMsg({
        type: 'success',
        text: '✓ Đã đẩy dữ liệu của máy này lên mây thành công!',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Lỗi khi lưu lên đám mây.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncByCode = async () => {
    const codeToSearch = inputCode.trim().toUpperCase();
    if (!codeToSearch) {
      setStatusMsg({ type: 'error', text: 'Vui lòng nhập Mã phiên làm việc (Ví dụ: SYNC-A1B2C3)' });
      return;
    }

    setIsLoading(true);
    setStatusMsg(null);
    try {
      const fetchedState = await fetchSessionByCode(codeToSearch);
      if (fetchedState && fetchedState.rows && fetchedState.rows.length > 0) {
        // Save code locally to continue syncing with this code
        localStorage.setItem('app_session_code', codeToSearch);
        setSessionCode(codeToSearch);
        onLoadSyncedState(
          fetchedState,
          `✓ Đã tiếp tục phiên làm việc thành công từ mã [${codeToSearch}]!`
        );
        setStatusMsg({
          type: 'success',
          text: `Đã khôi phục thành công dữ liệu từ máy cũ mã ${codeToSearch}!`,
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: `Không tìm thấy phiên làm việc nào với mã [${codeToSearch}]. Vui lòng kiểm tra lại mã ở máy cũ.`,
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Lỗi khi tải dữ liệu từ mã phiên: ${err.message || 'Không kết nối được đám mây'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSyncNow = async () => {
    setIsLoading(true);
    try {
      await syncSessionToFirestore(currentState, sessionCode, currentUser);
      if (currentUser) {
        await loadUserCloudSession(currentUser.uid);
      }
      setStatusMsg({
        type: 'success',
        text: '✓ Đã đẩy dữ liệu mới nhất lên mây thành công!',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Lỗi lưu đám mây.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Đồng bộ đa thiết bị (Đổi máy)</h3>
              <p className="text-xs text-indigo-200">
                Tiếp tục phiên làm việc trên máy tính/trình duyệt khác mà không bị gián đoạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-slate-800 text-sm">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          {/* Option 1: Google Sign-in */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Cách 1: Đăng nhập Google (Khuyên dùng)
              </span>
              {currentUser && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đã kết nối
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-slate-900 truncate text-xs">
                        {currentUser.displayName || 'Người dùng'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>

                {/* Cloud Session Information Card */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-indigo-600" /> Bản lưu trên đám mây (Google Account)
                    </span>
                    <button
                      onClick={() => loadUserCloudSession(currentUser.uid)}
                      disabled={isLoadingCloud}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingCloud ? 'animate-spin' : ''}`} />
                      Làm mới
                    </button>
                  </div>

                  {isLoadingCloud ? (
                    <div className="py-3 text-center text-xs text-indigo-600 font-medium animate-pulse">
                      Đang kiểm tra dữ liệu từ đám mây...
                    </div>
                  ) : cloudData && cloudData.state && cloudData.state.rows && cloudData.state.rows.length > 0 ? (
                    <div className="space-y-2.5">
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100 text-xs space-y-1">
                        <div className="font-semibold text-slate-800">
                          {cloudData.matrixTitle || `Ma trận ${cloudData.state.mon} lớp ${cloudData.state.grade}`}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Số mục câu hỏi: <strong className="text-indigo-700">{cloudData.rowsCount ?? cloudData.state.rows.length} mục</strong></span>
                          <span>Lưu lúc: {new Date(cloudData.updatedAt).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={handleRestoreFromCloud}
                          disabled={isLoading}
                          className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Tải phiên mây về máy này</span>
                        </button>
                        <button
                          onClick={handlePushCurrentToCloud}
                          disabled={isLoading}
                          className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Lưu đè máy này lên mây</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <p className="text-slate-600 text-[12px]">
                        Chưa tìm thấy phiên lưu trước đó trên đám mây của tài khoản này.
                      </p>
                      <button
                        onClick={handlePushCurrentToCloud}
                        disabled={isLoading}
                        className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Lưu phiên làm việc hiện tại của máy này lên mây</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-600 mb-2.5">
                  Đăng nhập cùng tài khoản Google trên mọi máy tính để tự động đồng bộ tức thì mà không cần nhớ mã.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Đăng nhập Google để đồng bộ tự động</span>
                </button>
              </div>
            )}
          </div>

          {/* Option 2: Session Passcode Sync */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Laptop className="w-4 h-4 text-indigo-600" /> Cách 2: Tiếp tục bằng Mã phiên làm việc
            </span>

            {/* Current Code Info */}
            <div className="bg-white p-3 rounded-lg border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Mã phiên ở máy này:</span>
                <span className="text-xs text-slate-400">
                  {lastSyncedTime ? `Đã lưu mây: ${new Date(lastSyncedTime).toLocaleTimeString('vi-VN')}` : 'Đã bật lưu tự động'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-indigo-950 font-mono font-bold text-sm tracking-wider flex-1 text-center border border-slate-200">
                  {sessionCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép mã'}</span>
                </button>
              </div>
            </div>

            {/* Input code to resume from old device */}
            <div className="pt-2 border-t border-indigo-100/80 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Nhập mã từ máy cũ để chuyển làm tiếp trên máy này:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: SYNC-A1B2C3"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  onClick={handleSyncByCode}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 shadow-2xs"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Tải phiên</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Manual Push */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1 text-slate-600">
              <Smartphone className="w-3.5 h-3.5 text-slate-400" /> Tự động đồng bộ mỗi khi thay đổi
            </span>
            <button
              onClick={handleManualSyncNow}
              disabled={isLoading}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Lưu ngay lên mây
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  );
};
