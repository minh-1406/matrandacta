import React, { useState, useEffect } from 'react';
import { SubjectName, ExamSemester, StructureMode, QuestionPointConfig, MatrixRow } from './types';
import {
  generateDefaultRows,
  getPresetPoints,
  calculateSums,
} from './utils/matrixCalculations';
import { NOCALC } from './constants/curriculumData';
import {
  copyHTMLToClipboard,
  exportMatrixExcel,
  exportMatrixPDF,
  exportMatrixWord,
  generateMatrixHTML,
} from './utils/exportUtils';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { ValidationBanner } from './components/ValidationBanner';
import { MatrixTable } from './components/MatrixTable';
import { SpecTable } from './components/SpecTable';
import { QuestionGenerator } from './components/QuestionGenerator';
import { TableProperties, FileText, Sparkles } from 'lucide-react';

export default function App() {
  const [mon, setMon] = useState<SubjectName>('Toán');
  const [grade, setGrade] = useState<string>('10');
  const [semester, setSemester] = useState<ExamSemester>('Giữa kì I');
  const [structureMode, setStructureMode] = useState<StructureMode>('k');
  const [noTLN, setNoTLN] = useState<boolean>(false);

  const [points, setPoints] = useState<QuestionPointConfig>({ tn: 0.25, ds: 1, tln: 0.5, tl: 1 });
  const [pointNote, setPointNote] = useState<string>('');
  const [rows, setRows] = useState<MatrixRow[]>([]);

  const [activeTab, setActiveTab] = useState<'mt' | 'dt' | 'qt'>('mt');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Initialize or reset when Subject, Grade, Semester or Structure changes
  useEffect(() => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);

    const { note, points: presetPts } = getPresetPoints(mon, structureMode);
    setPointNote(note);
    setPoints(presetPts);

    const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
    setRows(defaultRows);
  }, [mon, grade, semester, structureMode, noTLN]);

  const sums = calculateSums(rows, points);
  const pageTitle = `Ma trận và bản đặc tả ${mon} lớp ${grade} · ${semester}`;

  // Reset to default
  const handleResetDefault = () => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
    setRows(defaultRows);
    setStatusMessage('Đã quay về ma trận mặc định.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Reconcile Success handler from AI
  const handleReconcileSuccess = (
    updated: { c: string; n: string; s: [string, string, string] }[],
    notes: string
  ) => {
    const newRows: MatrixRow[] = updated.map((item, idx) => {
      const existing = rows[idx];
      return {
        c: item.c,
        n: item.n,
        v: existing ? existing.v : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        y: existing ? existing.y : [0, 0, 0],
        s: item.s,
      };
    });
    setRows(newRows);
    setStatusMessage(`Đã đối chiếu thành công: ${notes.slice(0, 100)}`);
  };

  // Export handlers
  const handleExportWord = async () => {
    try {
      setStatusMessage('Đang khởi tạo tệp Word (.docx)...');
      const filename = `MaTran_DacTa_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
      await exportMatrixWord(rows, points, pageTitle, filename);
      setStatusMessage('Đã tải xuống tệp Word thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất Word: ${err.message || 'Không thể tạo tệp Word'}`);
    }
  };

  const handleExportPdf = async () => {
    try {
      setStatusMessage('Đang khởi tạo tệp PDF...');
      const filename = `MaTran_DacTa_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
      const html = generateMatrixHTML(rows, points, pageTitle);
      await exportMatrixPDF(html, filename);
      setStatusMessage('Đã tải xuống tệp PDF thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất PDF: ${err.message || 'Không thể tạo tệp PDF'}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      setStatusMessage('Đang xuất tệp Excel (.xlsx)...');
      const filename = `MaTran_DacTa_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
      await exportMatrixExcel(rows, points, filename);
      setStatusMessage('Đã tải xuống tệp Excel thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất Excel: ${err.message}`);
    }
  };

  const handleCopyWord = async () => {
    const html = generateMatrixHTML(rows, points, pageTitle);
    const success = await copyHTMLToClipboard(html);
    if (success) {
      setCopyFeedback('Đã sao chép! Bạn hãy dán (Ctrl+V) vào Word');
      setTimeout(() => setCopyFeedback(null), 3500);
    } else {
      setStatusMessage('Không thể sao chép tự động, vui lòng thử nút Tải Word.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <main className="max-w-[1360px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* Header */}
        <Header
          onExportWord={handleExportWord}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onCopyWord={handleCopyWord}
          copyFeedback={copyFeedback}
          statusMessage={statusMessage}
        />

        {/* Global Settings Panel */}
        <SettingsPanel
          mon={mon}
          onMonChange={setMon}
          grade={grade}
          onGradeChange={setGrade}
          semester={semester}
          onSemesterChange={setSemester}
          structureMode={structureMode}
          onStructureModeChange={setStructureMode}
          noTLN={noTLN}
          onNoTLNChange={setNoTLN}
          points={points}
          onPointsChange={setPoints}
          pointNote={pointNote}
          currentRows={rows}
          onReconcileSuccess={handleReconcileSuccess}
          onResetDefault={handleResetDefault}
        />

        {/* Validation Check Banner */}
        <ValidationBanner
          sums={sums}
          mon={mon}
          structureMode={structureMode}
          noTLN={noTLN}
        />

        {/* Title Bar */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            {pageTitle}
          </h2>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 noprint">
          <button
            onClick={() => setActiveTab('mt')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              activeTab === 'mt'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/70'
            }`}
          >
            <TableProperties className="w-4 h-4" />
            1. Ma trận đề kiểm tra định kì
          </button>

          <button
            onClick={() => setActiveTab('dt')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              activeTab === 'dt'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/70'
            }`}
          >
            <FileText className="w-4 h-4" />
            2. Bản đặc tả đề kiểm tra định kì
          </button>

          <button
            onClick={() => setActiveTab('qt')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
              activeTab === 'qt'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100/70'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            3. Tạo câu hỏi từ ma trận (AI)
          </button>
        </nav>

        {/* Tab Content */}
        {activeTab === 'mt' && (
          <MatrixTable
            rows={rows}
            onChange={setRows}
            points={points}
            onPointsChange={setPoints}
            mon={mon}
            grade={grade}
            semester={semester}
            onResetDefault={handleResetDefault}
          />
        )}

        {activeTab === 'dt' && (
          <SpecTable
            rows={rows}
            onChange={setRows}
          />
        )}

        {activeTab === 'qt' && (
          <QuestionGenerator
            rows={rows}
            mon={mon}
            grade={grade}
            semester={semester}
            points={points}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p>
            Phần mềm xây dựng ma trận và bản đặc tả đề kiểm tra định kì THPT ·{' '}
            <b>Tác giả: Ths. Nguyễn Đắc Quang Minh - Trường THPT Phan Đăng Lưu</b>
          </p>
        </footer>
      </main>
    </div>
  );
}
