import React, { useState, useEffect } from 'react';
import { SubjectName, ExamSemester, StructureMode, QuestionPointConfig, MatrixRow, FullAppState } from './types';
import {
  generateDefaultRows,
  getPresetPoints,
  calculateSums,
  distributeQuestions,
  consolidateRowsByChapter,
  ensureValidYccd,
  getZeroVector,
} from './utils/matrixCalculations';
import { NOCALC } from './constants/curriculumData';
import { reconcileCurriculum, extractCurriculumFromText } from './services/geminiService';
import {
  copyHTMLToClipboard,
  exportMatrixExcel,
  exportMatrixPDF,
  exportMatrixWord,
  generateMatrixHTML,
} from './utils/exportUtils';
import {
  loadAutoSavedState,
  saveAutoSavedState,
  getSavedMatrices,
  saveMatrixItem,
} from './utils/storageUtils';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { ValidationBanner } from './components/ValidationBanner';
import { MatrixTable } from './components/MatrixTable';
import { SpecTable } from './components/SpecTable';
import { QuestionGenerator } from './components/QuestionGenerator';
import { SavedMatricesModal } from './components/SavedMatricesModal';
import { TableProperties, FileText, Sparkles } from 'lucide-react';

export default function App() {
  const [mon, setMon] = useState<SubjectName>('Toán');
  const [grade, setGrade] = useState<string>('10');
  const [semester, setSemester] = useState<ExamSemester>('Giữa kì I');
  const [structureMode, setStructureMode] = useState<StructureMode>('k');
  const [noTLN, setNoTLN] = useState<boolean>(false);
  const [targetTotalScore, setTargetTotalScore] = useState<number>(10);
  const [targetFormatPoints, setTargetFormatPoints] = useState<number[]>([3, 2, 2, 3]);
  const [targetLevelPoints, setTargetLevelPoints] = useState<number[]>([4, 3, 3]);

  const [points, setPoints] = useState<QuestionPointConfig>({ tn: 0.25, ds: 1, tln: 0.5, tl: 1 });
  const [pointNote, setPointNote] = useState<string>('');
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [ppctData, setPpctData] = useState<{
    text: string;
    base64: string;
    mimeType: string;
    yccdText: string;
    yccdBase64: string;
    yccdMimeType: string;
  }>({
    text: '',
    base64: '',
    mimeType: '',
    yccdText: '',
    yccdBase64: '',
    yccdMimeType: '',
  });

  const [activeTab, setActiveTab] = useState<'mt' | 'dt' | 'qt'>('mt');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(() => getSavedMatrices().length);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const prevSelection = React.useRef({ mon, grade, semester, structureMode, noTLN });

  useEffect(() => {
    setTargetFormatPoints(noTLN ? [3, 4, 0, 3] : [3, 2, 2, 3]);
  }, [noTLN]);

  // Load auto-saved session on initial mount
  useEffect(() => {
    const autoSaved = loadAutoSavedState();
    if (autoSaved && Array.isArray(autoSaved.rows) && autoSaved.rows.length > 0) {
      const savedMon = autoSaved.mon || 'Toán';
      const savedGrade = autoSaved.grade || '10';
      setMon(savedMon);
      setGrade(savedGrade);
      setSemester(autoSaved.semester || 'Giữa kì I');
      setStructureMode(autoSaved.structureMode || 'k');
      setNoTLN(!!autoSaved.noTLN);
      setTargetTotalScore(autoSaved.targetTotalScore || 10);
      if (autoSaved.targetFormatPoints) setTargetFormatPoints(autoSaved.targetFormatPoints);
      if (autoSaved.targetLevelPoints) setTargetLevelPoints(autoSaved.targetLevelPoints);
      if (autoSaved.points) setPoints(autoSaved.points);
      
      const cleanRows = ensureValidYccd(autoSaved.rows, savedMon, savedGrade, undefined);
      setRows(cleanRows);
      setPpctData({ text: '', base64: '', mimeType: '', yccdText: '', yccdBase64: '', yccdMimeType: '' });
      setStatusMessage('Đã tự động khôi phục ma trận và bản đặc tả làm việc gần nhất.');
      setTimeout(() => setStatusMessage(null), 4000);
    }
    setIsInitialized(true);
  }, []);

  // Initialize or reset when Subject, Grade, Semester or Structure changes
  useEffect(() => {
    if (!isInitialized) return;

    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);

    const { note, points: presetPts } = getPresetPoints(mon, structureMode);
    setPointNote(note);

    const selectionChanged =
      prevSelection.current.mon !== mon ||
      prevSelection.current.grade !== grade ||
      prevSelection.current.semester !== semester ||
      prevSelection.current.structureMode !== structureMode ||
      prevSelection.current.noTLN !== noTLN;

    prevSelection.current = { mon, grade, semester, structureMode, noTLN };

    if (selectionChanged || rows.length === 0) {
      setPoints(presetPts);

      if (ppctData.text || ppctData.base64) {
        // Immediate deterministic local extraction: 0ms latency!
        const instantRows = extractCurriculumFromText(
          ppctData.text,
          ppctData.yccdText,
          mon,
          grade,
          semester
        );
        if (instantRows.length > 0) {
          handleReconcileSuccess(instantRows, `Đã giới hạn nội dung cho ${semester}`, ppctData);
        }

        reconcileCurriculum(
          mon,
          grade,
          semester,
          rows,
          ppctData.text,
          ppctData.yccdText,
          ppctData.base64 || ppctData.yccdBase64,
          ppctData.mimeType || ppctData.yccdMimeType
        )
          .then((res) => {
            if (res && res.rows && res.rows.length > 0) {
              handleReconcileSuccess(res.rows, res.notes || `Đã cập nhật theo giới hạn ${semester}`, ppctData);
            } else if (instantRows.length === 0) {
              const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
              setRows(defaultRows);
            }
          })
          .catch(() => {
            if (instantRows.length === 0) {
              const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
              setRows(defaultRows);
            }
          });
      } else {
        // No custom PPCT uploaded -> Generate standard Ministry curriculum matrix for selected mon, grade, semester
        const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
        setRows(defaultRows);
      }
    }
  }, [mon, grade, semester, structureMode, noTLN, isInitialized]);

  // Auto-save current state to localStorage on any state change
  useEffect(() => {
    if (rows.length > 0) {
      const currentState: FullAppState = {
        mon,
        grade,
        semester,
        structureMode,
        noTLN,
        targetTotalScore,
        targetFormatPoints,
        targetLevelPoints,
        points,
        rows,
        ppctData,
      };
      saveAutoSavedState(currentState);
    }
  }, [
    mon,
    grade,
    semester,
    structureMode,
    noTLN,
    targetTotalScore,
    targetFormatPoints,
    targetLevelPoints,
    points,
    rows,
    ppctData,
  ]);

  const sums = calculateSums(rows, points);
  const pageTitle = `Ma trận và bản đặc tả ${mon} lớp ${grade} · ${semester}`;

  // Reset to default
  const handleResetDefault = () => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    setPpctData({ text: '', base64: '', mimeType: '', yccdText: '', yccdBase64: '', yccdMimeType: '' });
    const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN, points, targetFormatPoints, targetLevelPoints);
    setRows(defaultRows);
    setStatusMessage(`Đã tự động cập nhật PPCT & YCCĐ chuẩn từ Bộ GD&ĐT cho môn ${mon} lớp ${grade} (${semester}).`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Reconcile Success handler from AI & file extraction
  const handleReconcileSuccess = (
    updated: { c: string; n: string; s?: [string, string, string]; v?: number[]; y?: number[] }[],
    notes: string,
    freshPpctData?: { text?: string; yccdText?: string }
  ) => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);

    const consolidated = consolidateRowsByChapter(updated.map((item) => ({
      c: item.c,
      n: item.n,
      s: item.s || ['', '', ''],
    })));

    let newRows: MatrixRow[] = consolidated.map((item) => {
      const matchedUp = updated.find(
        (u) =>
          u.c.trim().toLowerCase() === item.c.trim().toLowerCase() &&
          u.n.trim().toLowerCase() === item.n.trim().toLowerCase()
      );
      // Find matching existing row if any to preserve question distribution
      const existing = rows.find(
        (r) =>
          r.c.trim().toLowerCase() === item.c.trim().toLowerCase() ||
          r.n.trim().toLowerCase() === item.n.trim().toLowerCase()
      );
      const vVal = matchedUp && matchedUp.v && matchedUp.v.some((x: number) => x > 0)
        ? matchedUp.v
        : existing
        ? [...existing.v]
        : getZeroVector();
      const yVal = matchedUp && matchedUp.y && matchedUp.y.some((x: number) => x > 0)
        ? matchedUp.y
        : existing && existing.y
        ? [...existing.y]
        : [0, 0, 0];
      return {
        c: item.c,
        n: item.n,
        v: vVal,
        y: yVal,
        s: item.s,
      };
    });

    // Check if question distribution needs recalculation (if total score != 10 or any row has 0 questions or rows changed)
    const currentSums = calculateSums(newRows, points);
    const hasZeroRows = newRows.some((r) => r.v.every((x) => x === 0));
    if (Math.abs(currentSums.T - 10) > 0.25 || hasZeroRows || newRows.length !== rows.length) {
      newRows = distributeQuestions(
        newRows,
        mon as SubjectName,
        structureMode,
        shouldNoTLN,
        points,
        targetFormatPoints,
        targetLevelPoints
      );
    }

    const dataToUse = freshPpctData || ppctData;
    const cleanRows = ensureValidYccd(newRows, mon, grade, dataToUse, true);
    setRows(cleanRows);
    setActiveTab('mt');
    setStatusMessage(`Đã cập nhật hoàn toàn ma trận & bản đặc tả theo tệp tải lên! (${notes.slice(0, 80)})`);
  };

  const handleRedistributeFourFormats = () => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const redistributed = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, targetFormatPoints, targetLevelPoints);
    setRows(redistributed);
    setStatusMessage('Đã phân bổ lại câu hỏi bảo toàn đầy đủ 4 dạng theo quy định.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handlePointsChange = (newPoints: QuestionPointConfig) => {
    setPoints(newPoints);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, newPoints, targetFormatPoints, targetLevelPoints);
    setRows(reallocated);
  };

  const handleTargetFormatPointsChange = (newFmtPts: number[]) => {
    setTargetFormatPoints(newFmtPts);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, newFmtPts, targetLevelPoints);
    setRows(reallocated);
  };

  const handleTargetLevelPointsChange = (newLvlPts: number[]) => {
    setTargetLevelPoints(newLvlPts);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, targetFormatPoints, newLvlPts);
    setRows(reallocated);
  };

  const handleTargetTotalScoreChange = (newTotalScore: number) => {
    setTargetTotalScore(newTotalScore);
    const currentTotal = targetTotalScore > 0 ? targetTotalScore : 10;
    const scale = newTotalScore / currentTotal;
    const scaledFormat = targetFormatPoints.map((p) => +(p * scale).toFixed(2));
    const scaledLevel = targetLevelPoints.map((p) => +(p * scale).toFixed(2));
    setTargetFormatPoints(scaledFormat);
    setTargetLevelPoints(scaledLevel);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, scaledFormat, scaledLevel);
    setRows(reallocated);
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

  const handleSaveMatrix = () => {
    const currentState: FullAppState = {
      mon,
      grade,
      semester,
      structureMode,
      noTLN,
      targetTotalScore,
      targetFormatPoints,
      targetLevelPoints,
      points,
      rows,
      ppctData,
    };
    const title = `Ma trận ${mon} lớp ${grade} - ${semester}`;
    saveMatrixItem(title, currentState);
    const count = getSavedMatrices().length;
    setSavedCount(count);
    setStatusMessage(`Đã lưu thành công ma trận "${title}" vào thư viện!`);
    setIsSavedModalOpen(true);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleLoadSavedState = (savedState: FullAppState, title: string) => {
    const loadedMon = savedState.mon || 'Toán';
    const loadedGrade = savedState.grade || '10';
    setMon(loadedMon);
    setGrade(loadedGrade);
    setSemester(savedState.semester || 'Giữa kì I');
    setStructureMode(savedState.structureMode || 'k');
    setNoTLN(!!savedState.noTLN);
    setTargetTotalScore(savedState.targetTotalScore || 10);
    if (savedState.targetFormatPoints) setTargetFormatPoints(savedState.targetFormatPoints);
    if (savedState.targetLevelPoints) setTargetLevelPoints(savedState.targetLevelPoints);
    if (savedState.points) setPoints(savedState.points);
    setPpctData({ text: '', base64: '', mimeType: '', yccdText: '', yccdBase64: '', yccdMimeType: '' });

    const cleanRows = ensureValidYccd(
      savedState.rows || [],
      loadedMon,
      loadedGrade,
      undefined,
      true
    );
    setRows(cleanRows);
    setActiveTab('mt');
    setStatusMessage(`Đã tải ma trận & đối chiếu hoàn thiện YCCĐ bản đặc tả: "${title}"`);
    setTimeout(() => setStatusMessage(null), 3500);
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
          onSaveMatrix={handleSaveMatrix}
          onOpenSavedModal={() => setIsSavedModalOpen(true)}
          savedCount={savedCount}
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
          onPointsChange={handlePointsChange}
          pointNote={pointNote}
          currentRows={rows}
          onReconcileSuccess={handleReconcileSuccess}
          onResetDefault={handleResetDefault}
          ppctData={ppctData}
          onPpctDataChange={setPpctData}
          targetTotalScore={targetTotalScore}
          onTargetTotalScoreChange={handleTargetTotalScoreChange}
          targetFormatPoints={targetFormatPoints}
          onTargetFormatPointsChange={handleTargetFormatPointsChange}
          targetLevelPoints={targetLevelPoints}
          onTargetLevelPointsChange={handleTargetLevelPointsChange}
          onRedistributeFourFormats={handleRedistributeFourFormats}
        />

        {/* Validation Check Banner */}
        <ValidationBanner
          sums={sums}
          mon={mon}
          structureMode={structureMode}
          noTLN={noTLN}
          targetTotalScore={targetTotalScore}
          targetFormatPoints={targetFormatPoints}
          targetLevelPoints={targetLevelPoints}
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
            structureMode={structureMode}
            noTLN={noTLN}
            targetFormatPoints={targetFormatPoints}
            targetLevelPoints={targetLevelPoints}
            onResetDefault={handleResetDefault}
            ppctData={ppctData}
          />
        )}

        {activeTab === 'dt' && (
          <SpecTable
            rows={rows}
            onChange={setRows}
            points={points}
            mon={mon}
            grade={grade}
            ppctData={ppctData}
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

        {/* Saved Matrices Library Modal */}
        <SavedMatricesModal
          isOpen={isSavedModalOpen}
          onClose={() => setIsSavedModalOpen(false)}
          currentState={{
            mon,
            grade,
            semester,
            structureMode,
            noTLN,
            targetTotalScore,
            targetFormatPoints,
            targetLevelPoints,
            points,
            rows,
            ppctData,
          }}
          onLoadState={handleLoadSavedState}
          onShowMessage={(msg) => {
            setStatusMessage(msg);
            setTimeout(() => setStatusMessage(null), 3500);
            setSavedCount(getSavedMatrices().length);
          }}
        />

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
