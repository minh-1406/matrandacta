import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  FileText,
  FileSpreadsheet,
  File,
  Save,
  FolderOpen,
  ShieldCheck,
  Cloud,
  Download,
  Upload,
  LogOut,
  Laptop,
  ChevronDown,
  User as UserIcon,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  History,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  CloudSessionPayload,
  CloudVersionItem,
  fetchUserVersionHistory,
  getOrCreateDeviceId,
  deleteCloudVersion,
  deleteActiveUserSession,
  deleteAllCloudVersions,
} from '../services/firebaseService';

interface HeaderProps {
  onExportWord: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onCopyWord: () => void;
  onSaveMatrix: () => void;
  onOpenSavedModal: () => void;
  onOpenRegulatoryModal?: () => void;
  onOpenSyncModal?: () => void;
  savedCount: number;
  copyFeedback: string | null;
  statusMessage: string | null;
  currentUser?: User | null;
  cloudSessionForRestore?: CloudSessionPayload | null;
  onRestoreCloudSession?: (session: CloudSessionPayload) => void;
  onManualSyncNow?: () => Promise<void>;
  onLogoutUser?: () => Promise<void>;
  onDeleteCloudSession?: () => Promise<void>;
  onDeleteAllVersions?: () => Promise<void>;
  onOpenVersionPicker?: () => void;
  cloudVersionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onExportWord,
  onExportPdf,
  onExportExcel,
  onCopyWord,
  onSaveMatrix,
  onOpenSavedModal,
  onOpenRegulatoryModal,
  onOpenSyncModal,
  savedCount,
  copyFeedback,
  statusMessage,
  currentUser,
  cloudSessionForRestore,
  onRestoreCloudSession,
  onManualSyncNow,
  onLogoutUser,
  onDeleteCloudSession,
  onDeleteAllVersions,
  onOpenVersionPicker,
  cloudVersionCount,
}) => {
  const [isAccountOpen, setIsAccountOpen] = useState<boolean>(false);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<CloudVersionItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentDeviceId = getOrCreateDeviceId();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
        setShowHistory(false);
      }
    };
    if (isAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountOpen]);

  const loadHistoryData = async () => {
    if (!currentUser) return;
    setIsLoadingHistory(true);
    try {
      const list = await fetchUserVersionHistory(currentUser.uid);
      setHistoryList(list);
    } catch (e) {
      console.warn('Failed to fetch history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleToggleHistory = async () => {
    if (!showHistory) {
      setShowHistory(true);
      await loadHistoryData();
    } else {
      setShowHistory(false);
    }
  };

  const handleSelectRestore = (session: CloudSessionPayload) => {
    if (onRestoreCloudSession) {
      onRestoreCloudSession(session);
    }
    // "chọn xong biến mất" -> immediately close dropdown
    setIsAccountOpen(false);
    setShowHistory(false);
  };

  const handleDeleteActiveSession = async () => {
    if (onDeleteCloudSession) {
      await onDeleteCloudSession();
    } else if (currentUser) {
      await deleteActiveUserSession(currentUser.uid);
    }
    setIsAccountOpen(false);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, versionId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    await deleteCloudVersion(currentUser.uid, versionId);
    setHistoryList((prev) => prev.filter((x) => x.id !== versionId));
  };

  const handleDeleteAllHistory = async () => {
    setHistoryList([]);
    if (onDeleteAllVersions) {
      await onDeleteAllVersions();
    } else if (currentUser) {
      await deleteAllCloudVersions(currentUser.uid);
      await deleteActiveUserSession(currentUser.uid);
    }
  };

  const handleManualSyncClick = async () => {
    if (!onManualSyncNow) return;
    setIsSyncingNow(true);
    try {
      await onManualSyncNow();
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleLogoutClick = async () => {
    setIsAccountOpen(false);
    setShowHistory(false);
    if (onLogoutUser) {
      await onLogoutUser();
    }
  };

  return (
    <header className="rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-3 shadow-sm mb-3 border border-slate-800 relative z-30">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 p-1 flex items-center justify-center border border-indigo-400/30 shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              className="w-8 h-8"
              role="img"
              aria-label="Logo Ma trận và bản đặc tả"
            >
              <defs>
                <linearGradient id="lgh" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0a1338" />
                  <stop offset="100%" stopColor="#1b45c9" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" rx="14" fill="url(#lgh)" />
              <polygon points="32,16 48,24 32,32 16,24" fill="#38bdf8" />
              <path d="M48 24v10" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="48" cy="36" r="2" fill="#2dd4bf" />
              <rect x="20" y="38" width="7" height="3.5" rx="1" fill="#2dd4bf" />
              <rect x="29" y="38" width="7" height="3.5" rx="1" fill="#93c5fd" />
              <rect x="38" y="38" width="7" height="3.5" rx="1" fill="#93c5fd" />
              <rect x="20" y="44" width="7" height="3.5" rx="1" fill="#93c5fd" />
              <rect x="29" y="44" width="7" height="3.5" rx="1" fill="#2dd4bf" />
              <rect x="38" y="44" width="7" height="3.5" rx="1" fill="#93c5fd" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                Hệ thống Ma trận, Bản đặc tả & Ra đề kiểm tra
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-400/30 whitespace-nowrap">
                Chuẩn CV 7991 & QĐ 764
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-200 border border-sky-400/30 whitespace-nowrap"
                title="Ưu tiên 1: SGK Kết nối tri thức 2026 | Ưu tiên 2: Bộ SGK khác được Bộ GD&ĐT cấp phép lưu hành | Bắt buộc 100% trích dẫn nguồn"
              >
                📘 SGK Kết nối 2026 (Ưu tiên 1) & SGK Bộ GD&ĐT (Trích nguồn)
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate">
              Thiết kế ma trận, đặc tả YCCĐ và tạo bộ đề kiểm tra định kì chương trình GDPT 2018
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Account & Cloud Sync Dropdown Menu */}
          <div className="relative" ref={dropdownRef}>
            {currentUser ? (
              <button
                onClick={() => setIsAccountOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap border ${
                  cloudSessionForRestore
                    ? 'bg-gradient-to-r from-amber-600 to-indigo-600 border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                    : 'bg-indigo-700/80 hover:bg-indigo-600 border-indigo-400/30'
                }`}
                title="Quản lý tài khoản, đồng bộ & lịch sử phiên bản từ máy cũ"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-4 h-4 rounded-full object-cover border border-white/40"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>

                {cloudSessionForRestore ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                    Máy cũ
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                )}

                <ChevronDown
                  className={`w-3.5 h-3.5 text-indigo-200 transition-transform ${
                    isAccountOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            ) : (
              <button
                onClick={onOpenSyncModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap border border-indigo-400/30"
                title="Mở bảng Đổi máy & Đăng nhập Google để lưu phiên"
              >
                <Cloud className="w-3.5 h-3.5 text-indigo-200" />
                <span>Đổi máy / Đồng bộ</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            )}

            {/* Account Popover Menu */}
            {isAccountOpen && currentUser && (
              <div className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 text-slate-100 animate-in fade-in zoom-in-95 duration-150 z-50">
                {/* User Info Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-600"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 border border-indigo-400/40 flex items-center justify-center text-white font-bold text-base">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">
                      {currentUser.displayName || 'Tài khoản Google'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-[11px] text-emerald-300 font-medium">
                        Đang đồng bộ tự động Google Cloud
                      </span>
                    </div>
                  </div>
                </div>

                {/* VIEW 1: VERSION HISTORY VIEW */}
                {showHistory ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
                      <button
                        onClick={() => setShowHistory(false)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-white cursor-pointer font-medium"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Quay lại</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-amber-400" />
                          Các phiên bản ({historyList.length})
                        </span>
                        {historyList.length > 0 && (
                          <button
                            onClick={handleDeleteAllHistory}
                            className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                            title="Xóa toàn bộ các phiên bản cũ trong lịch sử"
                          >
                            Xóa hết
                          </button>
                        )}
                      </div>
                      <button
                        onClick={loadHistoryData}
                        disabled={isLoadingHistory}
                        className="text-slate-400 hover:text-white cursor-pointer p-1 rounded"
                        title="Tải lại lịch sử"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin text-indigo-400' : ''}`} />
                      </button>
                    </div>

                    {isLoadingHistory ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                        <span>Đang tải các phiên bản từ Google Cloud...</span>
                      </div>
                    ) : historyList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Chưa có phiên bản cũ nào được ghi nhận trên đám mây.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {historyList.map((ver) => {
                          const isFromOtherDevice = ver.deviceId && ver.deviceId !== currentDeviceId;
                          return (
                            <div
                              key={ver.id}
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-xs text-white truncate max-w-[200px]">
                                  {ver.title}
                                </p>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    isFromOtherDevice
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {isFromOtherDevice ? 'Máy cũ' : 'Máy này'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                                <span>
                                  {ver.rowsCount} mục câu hỏi •{' '}
                                  {new Date(ver.updatedAt).toLocaleTimeString('vi-VN')}{' '}
                                  {new Date(ver.updatedAt).toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2">
                                <button
                                  onClick={() =>
                                    handleSelectRestore({
                                      updatedAt: ver.updatedAt,
                                      sessionCode: ver.sessionCode || '',
                                      deviceId: ver.deviceId,
                                      userId: currentUser.uid,
                                      userEmail: currentUser.email || '',
                                      matrixTitle: ver.title,
                                      rowsCount: ver.rowsCount,
                                      state: ver.state,
                                    })
                                  }
                                  className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                                >
                                  <Download className="w-3.5 h-3.5 text-indigo-200" />
                                  <span>Tải bản này</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteHistoryItem(e, ver.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition active:scale-95 cursor-pointer"
                                  title="Xóa phiên bản này khỏi đám mây"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  /* VIEW 2: STANDARD POPUP MENU */
                  <>
                    {/* Section: Old Machine Session Available (ONLY appears when from an old/different machine!) */}
                    {cloudSessionForRestore && (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-amber-950/40 border border-amber-500/50 shadow-md">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                            <Laptop className="w-4 h-4 text-amber-400" />
                            <span>Phiên làm việc từ máy cũ</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                            Khác máy này
                          </span>
                        </div>

                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 mb-2.5">
                          <p className="font-semibold text-xs text-white truncate">
                            {cloudSessionForRestore.matrixTitle ||
                              `${cloudSessionForRestore.state.mon} lớp ${cloudSessionForRestore.state.grade}`}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {cloudSessionForRestore.rowsCount ?? cloudSessionForRestore.state.rows.length} mục
                            câu hỏi • Lưu lúc{' '}
                            {new Date(cloudSessionForRestore.updatedAt).toLocaleTimeString('vi-VN')}{' '}
                            {new Date(cloudSessionForRestore.updatedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSelectRestore(cloudSessionForRestore)}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                            title="Nạp phiên làm việc máy cũ vào máy này và đóng menu"
                          >
                            <Download className="w-4 h-4 text-slate-950" />
                            <span>Tải phiên máy cũ về máy này</span>
                          </button>
                          <button
                            onClick={handleDeleteActiveSession}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition active:scale-95 cursor-pointer shrink-0"
                            title="Xóa phiên làm việc này khỏi tài khoản (nếu không cần thiết)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center mt-1.5">
                          (Chọn xong sẽ tự động nạp dữ liệu và đóng bảng)
                        </p>
                      </div>
                    )}

                    {/* Quick Cloud Actions */}
                    <div className="mt-3 space-y-1.5">
                      {/* View All Versions Button */}
                      <button
                        onClick={() => {
                          setIsAccountOpen(false);
                          if (onOpenVersionPicker) {
                            onOpenVersionPicker();
                          } else {
                            handleToggleHistory();
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-xs text-indigo-200 font-semibold transition cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-amber-400" />
                          <span>Xem toàn bộ các phiên bản trên tài khoản</span>
                        </span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 font-bold">
                          {cloudVersionCount ? `${cloudVersionCount} bản` : 'Chọn nạp'}
                        </span>
                      </button>

                      <button
                        onClick={handleManualSyncClick}
                        disabled={isSyncingNow}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition cursor-pointer disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <Upload className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-bounce text-indigo-400' : 'text-indigo-300'}`} />
                          <span>{isSyncingNow ? 'Đang tải lên...' : 'Lưu bản máy này lên mây (Đồng bộ ngay)'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Tức thì</span>
                      </button>

                      {onOpenSyncModal && (
                        <button
                          onClick={() => {
                            setIsAccountOpen(false);
                            onOpenSyncModal();
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                            <span>Mã phiên & Đổi thiết bị qua mã...</span>
                          </span>
                          <span className="text-[10px] text-indigo-300 font-semibold">Xem mã</span>
                        </button>
                      )}
                    </div>
                  </>
                )}

                {/* Logout Button */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất tài khoản Google</span>
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* Save & Library Group */}
          <div className="flex items-center gap-1.5 pr-1.5 border-r border-slate-700/80">
            <button
              onClick={onSaveMatrix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Lưu ma trận và bản đặc tả (kèm YCCĐ) vào thư viện"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu Ma trận</span>
            </button>

            <button
              onClick={onOpenSavedModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Mở thư viện các ma trận đã lưu"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Đã lưu ({savedCount})</span>
            </button>

            {onOpenRegulatoryModal && (
              <button
                onClick={onOpenRegulatoryModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-slate-800 border border-emerald-500/50 text-emerald-200 font-bold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Mở Trung tâm Cập nhật & Kiểm định Quy chuẩn Khảo thí Bộ GD&ĐT (CV 7991, QĐ 764...)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quy chuẩn Bộ GD&ĐT</span>
              </button>
            )}
          </div>

          {/* Export Actions Group */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={onExportWord}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white text-indigo-900 font-bold text-xs shadow-xs hover:bg-indigo-50 transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Tải file Word (.docx) Ma trận & Bản đặc tả"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Word</span>
            </button>
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Tải file Excel (.xlsx) Ma trận & Bản đặc tả"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={onExportPdf}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="In hoặc lưu PDF Ma trận & Bản đặc tả"
            >
              <File className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              onClick={onCopyWord}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/20 border border-teal-400/30 text-teal-100 font-semibold text-xs hover:bg-teal-500/30 transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Sao chép bảng vào bộ nhớ tạm để dán sang Word"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copyFeedback || 'Sao chép'}</span>
            </button>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-2 text-xs text-teal-100 bg-white/10 px-3 py-1 rounded-lg border border-white/15 flex items-center justify-between">
          <span>{statusMessage}</span>
        </div>
      )}
    </header>
  );
};
