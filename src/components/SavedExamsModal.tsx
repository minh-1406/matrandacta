import React, { useState, useEffect, useRef } from 'react';
import {
  ExamHeaderConfig,
  ExamSemester,
  GeneratedQuestion,
  QuestionPointConfig,
  SavedExamItem,
  SubjectName,
} from '../types';
import {
  getSavedExams,
  saveExamItem,
  deleteSavedExamItem,
  deleteAllSavedExams,
  renameSavedExamItem,
  exportSavedExamsJSON,
  importSavedExamsJSON,
} from '../utils/storageUtils';
import {
  exportExamWord,
  exportAnswerWord,
  exportAnswerExcel,
} from '../utils/exportUtils';
import {
  X,
  Save,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  Clock,
  FolderOpen,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';

interface SavedExamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadExam: (exam: SavedExamItem) => void;
  currentQuestionsPerSource?: GeneratedQuestion[][];
  currentExamCodes?: string[];
  currentNumSets?: number;
  currentSubject?: SubjectName;
  currentGrade?: string;
  currentSemester?: ExamSemester;
  currentPoints?: QuestionPointConfig;
  currentHeaderConfig?: ExamHeaderConfig;
  currentCustomPrompt?: string;
}

export const SavedExamsModal: React.FC<SavedExamsModalProps> = ({
  isOpen,
  onClose,
  onLoadExam,
  currentQuestionsPerSource = [],
  currentExamCodes = ['101'],
  currentNumSets = 1,
  currentSubject = 'Lịch sử',
  currentGrade = '10',
  currentSemester = 'Giữa kì I',
  currentPoints = { tn: 0.25, ds: 1, tln: 0.25, tl: 1 },
  currentHeaderConfig,
  currentCustomPrompt = '',
}) => {
  const [exams, setExams] = useState<SavedExamItem[]>([]);
  const [saveTitle, setSaveTitle] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasCurrentQuestions =
    currentQuestionsPerSource.length > 0 &&
    currentQuestionsPerSource.some((s) => s.length > 0);

  useEffect(() => {
    if (isOpen) {
      refreshList();
      const defaultTitle = `Bộ đề ${currentSubject} ${currentGrade} - ${currentSemester} (${currentNumSets} mã đề)`;
      setSaveTitle(defaultTitle);
      setStatusMsg('');
    }
  }, [isOpen, currentSubject, currentGrade, currentSemester, currentNumSets]);

  const refreshList = () => {
    setExams(getSavedExams());
  };

  if (!isOpen) return null;

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCurrentQuestions) {
      setStatusMsg('Chưa có câu hỏi nào trong đề thi hiện tại để lưu.');
      return;
    }
    const titleToUse =
      saveTitle.trim() ||
      `Bộ đề ${currentSubject} ${currentGrade} - ${currentSemester} (${currentNumSets} mã đề)`;
    saveExamItem(
      titleToUse,
      currentSubject,
      currentGrade,
      currentSemester,
      currentNumSets,
      currentExamCodes,
      currentPoints,
      currentQuestionsPerSource,
      undefined,
      currentHeaderConfig,
      currentCustomPrompt
    );
    refreshList();
    setStatusMsg(`🎉 Đã lưu thành công bộ đề "${titleToUse}" vào thư viện!`);
  };

  const handleDelete = (id: string, title: string) => {
    deleteSavedExamItem(id);
    refreshList();
    setStatusMsg(`✓ Đã xóa bộ đề "${title}" khỏi thư viện.`);
  };

  const handleDeleteAll = () => {
    deleteAllSavedExams();
    setExams([]);
    setStatusMsg('✓ Đã xóa toàn bộ tất cả bộ đề trong thư viện đề thi.');
  };

  const handleStartRename = (item: SavedExamItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      renameSavedExamItem(id, editingTitle.trim());
      refreshList();
      setEditingId(null);
      setStatusMsg('Đã đổi tên bộ đề.');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const updated = importSavedExamsJSON(text);
        setExams(updated);
        setStatusMsg(`🎉 Đã nhập thành công đề thi từ tệp "${file.name}"!`);
      } catch (err: any) {
        setStatusMsg(`Lỗi nhập tệp: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleLoadExamToWorkspace = (item: SavedExamItem) => {
    onLoadExam(item);
    onClose();
  };

  const handleDownloadItemExamWord = (item: SavedExamItem) => {
    const baseName = `De_${item.subject}_Lop${item.grade}_${item.semester}`.replace(/\s+/g, '_');
    exportExamWord(
      item.questionsPerSource,
      item.title,
      item.subject,
      item.grade,
      item.semester,
      item.points || { tn: 0.25, ds: 1, tln: 0.25, tl: 1 },
      baseName,
      item.examCodes,
      item.headerConfig
    );
  };

  const handleDownloadItemAnswerWord = (item: SavedExamItem) => {
    const baseName = `HuongDanCham_${item.subject}_Lop${item.grade}_${item.semester}`.replace(/\s+/g, '_');
    exportAnswerWord(
      item.questionsPerSource,
      `Hướng dẫn chấm đề ${item.subject} - Lớp ${item.grade} - ${item.semester}`,
      item.subject,
      item.grade,
      item.semester,
      baseName,
      item.examCodes,
      item.headerConfig
    );
  };

  const handleDownloadItemAnswerExcel = (item: SavedExamItem) => {
    const baseName = `DapAn_${item.subject}_Lop${item.grade}_${item.semester}`.replace(/\s+/g, '_');
    exportAnswerExcel(item.questionsPerSource, baseName, item.examCodes);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FolderOpen className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Thư viện Đề thi đã lưu (Gồm cả Đề và Đáp án)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  Trọn bộ Đề + Hướng dẫn chấm
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Lưu trữ và tải về tệp Word Đề thi, tệp Word Đáp án & Biểu điểm, bảng đáp án Excel và sao lưu đề thi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-indigo-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Status Alert */}
          {statusMsg && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-900 flex items-center justify-between animate-fade-in">
              <span>{statusMsg}</span>
              <button
                onClick={() => setStatusMsg('')}
                className="text-indigo-500 hover:text-indigo-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Section 1: Save Current Exam Form */}
          {hasCurrentQuestions ? (
            <div className="bg-gradient-to-br from-indigo-50 via-white to-emerald-50/50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                    Lưu đề thi tạo ra gồm cả Đề và Đáp án vào thư viện
                  </h3>
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  Đầy đủ {currentQuestionsPerSource.length} mã đề ({currentQuestionsPerSource[0]?.length || 0} câu/đề + đáp án)
                </span>
              </div>

              <form
                onSubmit={handleSaveCurrent}
                className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
              >
                <input
                  type="text"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Nhập tên gọi bộ đề (VD: Đề thi Giữa kì I Lịch sử 10 - 4 mã đề)..."
                  className="flex-1 bg-white border border-indigo-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Lưu Đề & Đáp án
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 italic text-center">
              Chưa có câu hỏi nào trong đề thi hiện tại. Tạo đề thi mới hoặc mở đề thi đã lưu bên dưới.
            </div>
          )}

          {/* Section 2: Quick Import / Export Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95">
                <Upload className="w-3.5 h-3.5 text-indigo-300" />
                <span>Tải đề từ tệp (.json)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              {exams.length > 0 && (
                <button
                  onClick={() => exportSavedExamsJSON()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Xuất tất cả tệp JSON</span>
                </button>
              )}
            </div>

            {exams.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tất cả đề đã lưu</span>
              </button>
            )}
          </div>

          {/* Section 3: Saved Exams List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <span>Danh sách đề thi đã lưu ({exams.length})</span>
              </h3>
            </div>

            {exams.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center space-y-2">
                <FolderOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Thư viện chưa có bộ đề thi nào được lưu.
                </p>
                <p className="text-[11px] text-slate-400">
                  Tạo đề thi mới và bấm "Lưu đề vào thư viện" hoặc bấm "Tải đề từ tệp (.json)" để tải đề thi lên.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {exams.map((item) => {
                  const qCountPerSource = item.questionsPerSource[0]?.length || 0;
                  const isEditing = editingId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="flex-1 bg-slate-50 border border-indigo-400 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                            <button
                              onClick={() => handleSaveRename(item.id)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                              title="Lưu tên"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-slate-800 truncate">
                              {item.title}
                            </h4>
                            <button
                              onClick={() => handleStartRename(item)}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded transition shrink-0"
                              title="Đổi tên bộ đề"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(item.updatedAt).toLocaleDateString('vi-VN')} {new Date(item.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg">
                            Môn {item.subject} - Lớp {item.grade}
                          </span>
                          <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-700 font-medium rounded-lg">
                            {item.semester}
                          </span>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg">
                            {item.numSets} mã đề ({item.examCodes?.join(', ') || '101'})
                          </span>
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 font-semibold rounded-lg">
                            {qCountPerSource} câu hỏi/đề
                          </span>
                          {item.customPrompt && (
                            <span className="px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-medium rounded-lg truncate max-w-[280px]" title={`Yêu cầu của giáo viên: ${item.customPrompt}`}>
                              🎯 "{item.customPrompt}"
                            </span>
                          )}
                        </div>

                        {/* Card Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadItemExamWord(item)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Tải tệp Đề thi dạng Word (.docx)"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Đề Word</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadItemAnswerWord(item)}
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Tải tệp Đáp án & Hướng dẫn chấm dạng Word (.docx)"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            <span>Đáp án Word</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadItemAnswerExcel(item)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Tải bảng đáp án dạng Excel (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Đáp án Excel</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => exportSavedExamsJSON(item.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                            title="Xuất tệp sao lưu JSON (.json)"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>JSON</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadExamToWorkspace(item)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            title="Mở đề thi vào không gian làm việc hiện tại"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Mở đề</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Xóa bộ đề khỏi thư viện"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
