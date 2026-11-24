import React from 'react';
import { CloudVersionItem } from '../services/firebaseService';
import { FullAppState } from '../types';
import {
  History,
  Download,
  Trash2,
  X,
  RefreshCw,
  Clock,
  Laptop,
  Smartphone,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface VersionPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: CloudVersionItem[];
  isLoading: boolean;
  currentDeviceId: string;
  onSelectVersion: (version: CloudVersionItem) => void;
  onDeleteVersion: (versionId: string) => Promise<void>;
  onDeleteAllVersions: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const VersionPickerModal: React.FC<VersionPickerModalProps> = ({
  isOpen,
  onClose,
  versions,
  isLoading,
  currentDeviceId,
  onSelectVersion,
  onDeleteVersion,
  onDeleteAllVersions,
  onRefresh,
}) => {
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await onDeleteAllVersions();
      setFeedbackMsg('✓ Đã xóa toàn bộ tất cả các phiên bản làm việc đã lưu!');
      setTimeout(() => setFeedbackMsg(null), 3500);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl text-white flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md">
              <History className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Các phiên bản làm việc trên tài khoản Google
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                  {versions.length} phiên bản
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Mỗi lần lưu đều được ghi nhận kèm ngày giờ. Thầy/cô có thể chọn tải bất kỳ phiên bản nào để làm việc tiếp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading || isDeletingAll}
              className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 font-medium cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới danh sách</span>
            </button>
          </div>

          {versions.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmDeleteAll}
              disabled={isDeletingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Xóa tất cả các phiên bản không cần thiết trên đám mây"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingAll ? 'Đang xóa tất cả...' : 'Xóa tất cả phiên bản'}</span>
            </button>
          )}
        </div>

        {feedbackMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{feedbackMsg}</span>
            <button type="button" onClick={() => setFeedbackMsg(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Version List Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Đang tải danh sách các phiên bản từ tài khoản Google...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Chưa có phiên bản nào được lưu trên tài khoản</p>
              <p className="text-xs text-slate-500 mt-1">
                Hãy bấm nút <b className="text-teal-300">"Lưu lên tài khoản"</b> trên máy tính để tạo các phiên bản làm việc.
              </p>
            </div>
          ) : (
            versions.map((ver, idx) => {
              const isOtherDevice = ver.deviceId && ver.deviceId !== currentDeviceId;
              const dateStr = ver.formattedTime ||
                `${new Date(ver.updatedAt).toLocaleTimeString('vi-VN')} ngày ${new Date(ver.updatedAt).toLocaleDateString('vi-VN')}`;

              return (
                <div
                  key={ver.id || idx}
                  className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white">
                        {ver.title || `Ma trận ${ver.mon || ver.state?.mon} lớp ${ver.grade || ver.state?.grade}`}
                      </span>

                      {/* Device badge */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                          isOtherDevice
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isOtherDevice ? (
                          <>
                            <Laptop className="w-3 h-3" />
                            <span>Từ máy khác</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Máy này</span>
                          </>
                        )}
                      </span>

                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          Mới nhất
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                      <span className="text-indigo-300 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        {ver.rowsCount ?? ver.state?.rows?.length ?? 0} mục câu hỏi
                      </span>
                      {ver.state?.targetTotalScore && (
                        <>
                          <span>•</span>
                          <span>Tổng {ver.state.targetTotalScore} điểm</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto">
                    <button
                      onClick={() => onSelectVersion(ver)}
                      className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                      title="Nạp phiên bản này vào hệ thống và đóng bảng"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Nạp bản này</span>
                    </button>

                    <button
                      onClick={() => onDeleteVersion(ver.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition active:scale-95 cursor-pointer"
                      title="Xóa phiên bản này (không cần thiết)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
          <p className="text-slate-400 text-[11px]">
            Chọn xong hệ thống sẽ nạp dữ liệu và tự động đóng bảng.
          </p>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
