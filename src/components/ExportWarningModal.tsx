import React from 'react';
import { ValidationErrorItem } from '../utils/matrixValidator';
import { AlertCircle, AlertTriangle, Wand2, Download, X } from 'lucide-react';

interface ExportWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
  exportActionName: string; // e.g. "Tải tệp Word (.docx)", "Tải tệp PDF", "Sao chép sang Word"
  onConfirmAutoFixAndExport: () => void;
  onConfirmExportAnyway: () => void;
}

export const ExportWarningModal: React.FC<ExportWarningModalProps> = ({
  isOpen,
  onClose,
  errors,
  warnings,
  exportActionName,
  onConfirmAutoFixAndExport,
  onConfirmExportAnyway,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cảnh báo trước khi {exportActionName}
              </h3>
              <p className="text-xs text-slate-500">
                Phát hiện một số nội dung trong ma trận chưa đúng quy định của Công văn 7991.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Items List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {errors.map((err) => (
            <div key={err.id} className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-0.5">
              <div className="font-bold text-rose-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                {err.title}
              </div>
              <p className="text-slate-700 text-[11.5px] leading-relaxed">
                {err.description}
              </p>
            </div>
          ))}

          {warnings.length > 0 && errors.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Lưu ý tỉ lệ câu hỏi:
              </div>
              <ul className="list-disc pl-4 text-slate-700 space-y-0.5 text-[11px]">
                {warnings.slice(0, 3).map((w) => (
                  <li key={w.id}>{w.title}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onConfirmAutoFixAndExport}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Wand2 className="w-4 h-4 text-emerald-200" />
            <span>✨ Tự động sửa lỗi & Xuất ngay (Khuyên dùng)</span>
          </button>

          <button
            type="button"
            onClick={onConfirmExportAnyway}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Vẫn tiếp tục xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
