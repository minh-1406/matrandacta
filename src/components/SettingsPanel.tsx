import React, { useState } from 'react';
import { SubjectName, ExamSemester, StructureMode, QuestionPointConfig, MatrixRow } from '../types';
import { MON } from '../constants/curriculumData';
import { readFileText } from '../utils/fileReader';
import { reconcileCurriculum } from '../services/geminiService';
import { ChevronDown, ChevronUp, Sparkles, RotateCcw, Upload } from 'lucide-react';

interface SettingsPanelProps {
  mon: SubjectName;
  onMonChange: (val: SubjectName) => void;
  grade: string;
  onGradeChange: (val: string) => void;
  semester: ExamSemester;
  onSemesterChange: (val: ExamSemester) => void;
  structureMode: StructureMode;
  onStructureModeChange: (val: StructureMode) => void;
  noTLN: boolean;
  onNoTLNChange: (val: boolean) => void;
  points: QuestionPointConfig;
  onPointsChange: (pts: QuestionPointConfig) => void;
  pointNote: string;
  currentRows: MatrixRow[];
  onReconcileSuccess: (
    updated: { c: string; n: string; s: [string, string, string] }[],
    notes: string
  ) => void;
  onResetDefault: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  mon,
  onMonChange,
  grade,
  onGradeChange,
  semester,
  onSemesterChange,
  structureMode,
  onStructureModeChange,
  noTLN,
  onNoTLNChange,
  points,
  onPointsChange,
  pointNote,
  currentRows,
  onReconcileSuccess,
  onResetDefault,
}) => {
  const [showReconcile, setShowReconcile] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [ppctFileText, setPpctFileText] = useState<string>('');
  const [yccdFileText, setYccdFileText] = useState<string>('');
  const [reconcileStatus, setReconcileStatus] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);

  const handlePpctUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setReconcileStatus(`Đang đọc tệp PPCT: ${file.name}...`);
      const text = await readFileText(file);
      setPpctFileText(text.slice(0, 30000));
      setReconcileStatus(`Đã đọc PPCT: ${file.name} (${text.length} ký tự).`);
    } catch (err: any) {
      setReconcileStatus(`Lỗi đọc PPCT: ${err.message}`);
    }
  };

  const handleYccdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setReconcileStatus(`Đang đọc tệp YCCĐ: ${file.name}...`);
      const text = await readFileText(file);
      setYccdFileText(text.slice(0, 30000));
      setReconcileStatus(`Đã đọc YCCĐ: ${file.name} (${text.length} ký tự).`);
    } catch (err: any) {
      setReconcileStatus(`Lỗi đọc YCCĐ: ${err.message}`);
    }
  };

  const handleRunReconcile = async () => {
    if (!ppctFileText && !yccdFileText) {
      setReconcileStatus('Vui lòng chọn ít nhất một tệp PPCT hoặc YCCĐ trước khi đối chiếu.');
      return;
    }

    try {
      setIsReconciling(true);
      setReconcileStatus('Đang gọi AI Gemini đối chiếu chương trình và yêu cầu cần đạt...');
      const res = await reconcileCurriculum(mon, grade, semester, currentRows, ppctFileText, yccdFileText);
      if (res && res.rows && res.rows.length > 0) {
        onReconcileSuccess(res.rows, res.notes || '');
        setReconcileStatus('Đã đối chiếu và cập nhật ma trận thành công!');
        setReconcileNotes(res.notes || '');
      } else {
        setReconcileStatus('Không nhận được kết quả hợp lệ từ AI. Giữ nguyên nội dung.');
      }
    } catch (err: any) {
      setReconcileStatus(`Lỗi đối chiếu: ${err.message || 'Không thể kết nối Gemini API'}`);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-4 space-y-4">
      {/* Primary Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Môn học</label>
          <select
            value={mon}
            onChange={(e) => onMonChange(e.target.value as SubjectName)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            {MON.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Khối lớp</label>
          <select
            value={grade}
            onChange={(e) => onGradeChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="10">Khối 10</option>
            <option value="11">Khối 11</option>
            <option value="12">Khối 12</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kì kiểm tra</label>
          <select
            value={semester}
            onChange={(e) => onSemesterChange(e.target.value as ExamSemester)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="Giữa kì I">Giữa kì I</option>
            <option value="Cuối kì I">Cuối kì I</option>
            <option value="Giữa kì II">Giữa kì II</option>
            <option value="Cuối kì II">Cuối kì II</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cấu trúc đề</label>
          <select
            value={structureMode}
            onChange={(e) => onStructureModeChange(e.target.value as StructureMode)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            <option value="k">Theo Phụ lục CV 7991</option>
            <option value="t">Theo cấu trúc đề tốt nghiệp (QĐ 764)</option>
          </select>
        </div>
      </div>

      {/* Checkbox for no Short-answer */}
      <div className="pt-1">
        <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={noTLN}
            onChange={(e) => onNoTLNChange(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span className="font-medium">
            Môn không dùng dạng Trả lời ngắn (chuyển điểm sang “Đúng – Sai”)
          </span>
        </label>
      </div>

      {/* Accordion 1: Upload PPCT / YCCD */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
        <button
          type="button"
          onClick={() => setShowReconcile(!showReconcile)}
          className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-sm text-indigo-700 hover:bg-slate-100/70 transition"
        >
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Tải lên PPCT, YCCĐ để đối chiếu bằng AI Gemini (không bắt buộc)
          </span>
          {showReconcile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showReconcile && (
          <div className="p-4 border-t border-slate-200 bg-white space-y-3">
            <p className="text-xs text-slate-500">
              Hỗ trợ tệp Word (.docx), Excel (.xlsx), .txt, .csv. Nếu không tải lên, hệ thống sẽ sử dụng danh mục bài học chuẩn SGK Kết nối tri thức.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Phân phối chương trình (PPCT)
                </label>
                <input
                  type="file"
                  accept=".docx,.xlsx,.xls,.csv,.txt"
                  onChange={handlePpctUpload}
                  className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Yêu cầu cần đạt (YCCĐ)
                </label>
                <input
                  type="file"
                  accept=".docx,.xlsx,.xls,.csv,.txt"
                  onChange={handleYccdUpload}
                  className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRunReconcile}
                disabled={isReconciling}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isReconciling ? 'Đang đối chiếu...' : 'Đối chiếu và điều chỉnh bằng AI'}
              </button>
              <button
                type="button"
                onClick={onResetDefault}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Dùng lại nội dung mặc định
              </button>
            </div>

            {reconcileStatus && (
              <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                {reconcileStatus}
              </div>
            )}
            {reconcileNotes && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
                <b>Ghi chú đối chiếu:</b> {reconcileNotes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Accordion 2: Points configuration */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
        <button
          type="button"
          onClick={() => setShowPoints(!showPoints)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left font-semibold text-xs text-slate-700 hover:bg-slate-100/70 transition"
        >
          <span>Điểm số mỗi câu hỏi</span>
          {showPoints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showPoints && (
          <div className="p-4 border-t border-slate-200 bg-white space-y-3">
            <p className="text-xs text-slate-500">{pointNote}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nhiều lựa chọn (TNLC)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={points.tn}
                  onChange={(e) => onPointsChange({ ...points, tn: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Đúng/Sai (câu 4 ý)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={points.ds}
                  onChange={(e) => onPointsChange({ ...points, ds: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Trả lời ngắn (TLN)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={points.tln}
                  onChange={(e) => onPointsChange({ ...points, tln: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Tự luận (TL)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={points.tl}
                  onChange={(e) => onPointsChange({ ...points, tl: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center font-semibold"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
