import React from 'react';
import { Download, Copy, FileText, FileSpreadsheet, File, Save, FolderOpen } from 'lucide-react';

interface HeaderProps {
  onExportWord: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onCopyWord: () => void;
  onSaveMatrix: () => void;
  onOpenSavedModal: () => void;
  savedCount: number;
  copyFeedback: string | null;
  statusMessage: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onExportWord,
  onExportPdf,
  onExportExcel,
  onCopyWord,
  onSaveMatrix,
  onOpenSavedModal,
  savedCount,
  copyFeedback,
  statusMessage,
}) => {
  return (
    <header className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-700 to-teal-700 text-white p-5 shadow-lg mb-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-white/10 p-1 flex items-center justify-center shadow-inner border border-white/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 64 64"
              className="w-11 h-11"
              role="img"
              aria-label="Logo Ma trận và bản đặc tả"
            >
              <defs>
                <linearGradient id="lgh" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0a1338" />
                  <stop offset="100%" stopColor="#1b45c9" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" rx="16" fill="url(#lgh)" />
              <rect x="1" y="1" width="62" height="62" rx="15" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.5" />
              <polygon points="32,18 46,25 32,32 18,25" fill="#38bdf8" />
              <path d="M46 25v9" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="46" cy="35" r="1.8" fill="#2dd4bf" />
              <rect x="22" y="38" width="6" height="3" rx="1" fill="#2dd4bf" />
              <rect x="30" y="38" width="6" height="3" rx="1" fill="#93c5fd" />
              <rect x="38" y="38" width="6" height="3" rx="1" fill="#93c5fd" />
              <rect x="22" y="43" width="6" height="3" rx="1" fill="#93c5fd" />
              <rect x="30" y="43" width="6" height="3" rx="1" fill="#2dd4bf" />
              <rect x="38" y="43" width="6" height="3" rx="1" fill="#93c5fd" />
            </svg>
          </div>
          <div>
            <div className="text-xs uppercase font-semibold tracking-wider text-teal-200">
              Theo Phụ lục Công văn 7991/BGDĐT-GDTrH & QĐ 764
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Ma trận và bản đặc tả đề kiểm tra định kì
            </h1>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Save & Library */}
          <button
            onClick={onSaveMatrix}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm shadow transition active:scale-95"
            title="Lưu ma trận hiện tại"
          >
            <Save className="w-4 h-4" />
            Lưu ma trận
          </button>

          <button
            onClick={onOpenSavedModal}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 border border-white/30 text-white font-semibold text-sm hover:bg-white/30 transition active:scale-95"
            title="Mở thư viện các ma trận đã lưu"
          >
            <FolderOpen className="w-4 h-4" />
            Đã lưu ({savedCount})
          </button>

          {/* Export Actions */}
          <button
            onClick={onExportWord}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 font-semibold text-sm shadow hover:bg-slate-100 transition active:scale-95"
          >
            <FileText className="w-4 h-4" />
            Tải Word
          </button>
          <button
            onClick={onExportPdf}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 border border-white/30 text-white font-semibold text-sm hover:bg-white/30 transition active:scale-95"
          >
            <File className="w-4 h-4" />
            Tải PDF
          </button>
          <button
            onClick={onExportExcel}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 border border-white/30 text-white font-semibold text-sm hover:bg-white/30 transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Tải Excel
          </button>
          <button
            onClick={onCopyWord}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/20 border border-teal-300/40 text-teal-100 font-semibold text-sm hover:bg-teal-500/30 transition active:scale-95"
          >
            <Copy className="w-4 h-4" />
            {copyFeedback || 'Sao chép sang Word'}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-3 text-sm text-teal-100 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
          {statusMessage}
        </div>
      )}
    </header>
  );
};
