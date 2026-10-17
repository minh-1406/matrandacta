import React, { useState } from 'react';
import { SubjectName, ExamSemester, StructureMode, QuestionPointConfig, MatrixRow } from '../types';
import { MON } from '../constants/curriculumData';
import { readFileText, fileToBase64 } from '../utils/fileReader';
import { reconcileCurriculum, extractCurriculumFromText } from '../services/geminiService';
import { ensureValidYccd } from '../utils/matrixCalculations';
import { ChevronDown, ChevronUp, Sparkles, RotateCcw, Upload, Trash2, Loader2, FileText, HelpCircle, Copy, Check, Download } from 'lucide-react';

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
    updated: { c: string; n: string; s?: [string, string, string]; v?: number[]; y?: number[] }[],
    notes: string,
    freshPpctData?: { text?: string; yccdText?: string }
  ) => void;
  onResetDefault: () => void;
  ppctData: { text: string; base64: string; mimeType: string; yccdText: string; yccdBase64: string; yccdMimeType: string };
  onPpctDataChange: (data: { text: string; base64: string; mimeType: string; yccdText: string; yccdBase64: string; yccdMimeType: string }) => void;
  targetTotalScore: number;
  onTargetTotalScoreChange: (val: number) => void;
  targetFormatPoints: number[];
  onTargetFormatPointsChange: (val: number[]) => void;
  targetLevelPoints: number[];
  onTargetLevelPointsChange: (val: number[]) => void;
  onRedistributeFourFormats?: () => void;
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
  ppctData,
  onPpctDataChange,
  targetTotalScore,
  onTargetTotalScoreChange,
  targetFormatPoints,
  onTargetFormatPointsChange,
  targetLevelPoints,
  onTargetLevelPointsChange,
  onRedistributeFourFormats,
}) => {
  const [showReconcile, setShowReconcile] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [ppctFileText, setPpctFileText] = useState<string>('');
  const [ppctBase64, setPpctBase64] = useState<string>('');
  const [ppctMimeType, setPpctMimeType] = useState<string>('');

  const [yccdFileText, setYccdFileText] = useState<string>('');
  const [yccdBase64, setYccdBase64] = useState<string>('');
  const [yccdMimeType, setYccdMimeType] = useState<string>('');

  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [guideTab, setGuideTab] = useState<'ppct' | 'yccd'>('ppct');
  const [copied, setCopied] = useState<boolean>(false);

  const downloadSamplePPCT = (ext: 'csv' | 'txt' = 'csv') => {
    const contentCSV = `STT,Tuần,Nội dung bài học / Tên chương,Số tiết
1,Tuần 1,CHƯƠNG 1. SỬ DỤNG BẢN ĐỒ,
2,Tuần 1,Bài 1. Một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ,2
3,Tuần 2,Bài 2. Phương pháp sử dụng bản đồ trong học tập địa lí và đời sống,1
4,Tuần 3,Bài 3. Một số ứng dụng của GPS và bản đồ số trong đời sống,1
5,Tuần 4,CHƯƠNG 2. TRÁI ĐẤT,
6,Tuần 4,Bài 4. Trái Đất trong hệ Mặt Trời. Vận tự quay của Trái Đất,2
7,Tuần 5,Bài 5. Hệ quả địa lí các chuyển động của Trái Đất,2
8,Tuần 6,CHƯƠNG 3. THẠCH QUYỂN,
9,Tuần 6,Bài 6. Thạch quyển. Nội lực và tác động của nội lực,2
10,Tuần 7,Bài 7. Tác động của ngoại lực đến địa hình bề mặt Trái Đất,2
11,Tuần 8,CHƯƠNG 4. KHÍ QUYỂN,
12,Tuần 8,Bài 8. Khí quyển. Nhiệt độ không khí,2
13,Tuần 9,Bài 9. Khí áp và gió,2
14,Tuần 10,Bài 10. Mưa,2
15,Tuần 11,CHƯƠNG 5. THUỶ QUYỂN,
16,Tuần 11,Bài 11. Thuỷ quyển. Nước trên lục địa,2
17,Tuần 12,Bài 12. Biển và đại dương,2
18,Tuần 13,CHƯƠNG 6. SINH QUYỂN,
19,Tuần 13,Bài 13. Đất và sinh quyển,2
20,Tuần 14,CHUYÊN ĐỀ HỌC TẬP (AI TỰ ĐỘNG LỌC BỎ),
21,Tuần 14,Chuyên đề 10.1. Biến đổi khí hậu,10`;

    const bom = '\uFEFF';
    const blob = new Blob([bom + contentCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Phan_Phoi_Chuong_Trinh_Mon_${mon}_Lop_${grade}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleYCCD = (ext: 'csv' | 'txt' = 'csv') => {
    const contentCSV = `STT,Chủ đề / Đơn vị kiến thức (Bài học),Yêu cầu cần đạt
1,Bài 1. Một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ,"- Trình bày được một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ.
- Phân biệt được các phương pháp ký hiệu, đường chuyển động, chấm điểm, bản đồ - biểu đồ."
2,Bài 2. Phương pháp sử dụng bản đồ trong học tập địa lí và đời sống,"- Sử dụng được bản đồ trong học tập địa lí và đời sống.
- Xác định được vị trí địa lí của một số đối tượng trên bản đồ."
3,Bài 3. Một số ứng dụng của GPS và bản đồ số trong đời sống,"- Nêu được một số ứng dụng của GPS và bản đồ số trong đời sống.
- Sử dụng được GPS và bản đồ số trên thiết bị di động."
4,Bài 4. Trái Đất trong hệ Mặt Trời. Vận tự quay của Trái Đất,"- Trình bày được vị trí của Trái Đất trong hệ Mặt Trời.
- Phân tích các hệ quả địa lí của chuyển động tự quay của Trái Đất."
5,Bài 5. Hệ quả địa lí các chuyển động của Trái Đất,"- Phân tích được các hệ quả địa lí của chuyển động quanh Mặt Trời."
6,Bài 6. Thạch quyển. Nội lực và tác động của nội lực,"- Trình bày được khái niệm thạch quyển.
- Phân tích được tác động của nội lực đến địa hình bề mặt Trái Đất."
7,Bài 7. Tác động của ngoại lực đến địa hình bề mặt Trái Đất,"- Phân tích được các quá trình ngoại lực và tác động của ngoại lực."
8,Bài 8. Khí quyển. Nhiệt độ không khí,"- Trình bày được cấu trúc của khí quyển.
- Phân tích sự phân bố nhiệt độ không khí trên Trái Đất."
9,Bài 9. Khí áp và gió,"- Trình bày được nguyên nhân hình thành khí áp và các đai khí áp.
- Phân biệt được các loại gió chính trên Trái Đất."
10,Bài 10. Mưa,"- Phân tích được các nhân tố ảnh hưởng đến lượng mưa.
- Trình bày được sự phân bố lượng mưa trên Trái Đất."`;

    const bom = '\uFEFF';
    const blob = new Blob([bom + contentCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Yau_Cau_Can_Dat_Mon_${mon}_Lop_${grade}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [reconcileStatus, setReconcileStatus] = useState<string>('');
  const [reconcileNotes, setReconcileNotes] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);

  const runReconcileWithData = async (
    pText: string,
    yText: string,
    pB64: string,
    yB64: string,
    pMime: string,
    yMime: string
  ) => {
    try {
      setIsReconciling(true);
      setReconcileStatus('Đang gọi AI Gemini đối chiếu chương trình từ tệp tải lên...');
      const res = await reconcileCurriculum(
        mon,
        grade,
        semester,
        currentRows,
        pText,
        yText,
        pB64 || yB64,
        pMime || yMime
      );
      if (res && res.rows && res.rows.length > 0) {
        if (pText || yText) {
          onPpctDataChange({
            text: pText,
            base64: pB64,
            mimeType: pMime,
            yccdText: yText,
            yccdBase64: yB64,
            yccdMimeType: yMime,
          });
        }
        onReconcileSuccess(res.rows, res.notes || '', { text: pText, yccdText: yText });
        setReconcileStatus('Đã đối chiếu và cập nhật ma trận thành công từ tệp!');
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

  const handlePpctUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setReconcileStatus(`Đang đọc tệp PPCT: ${file.name}...`);
      const text = await readFileText(file);
      const b64 = await fileToBase64(file);
      const textTrunc = text.slice(0, 300000);
      const mime = file.type || 'application/pdf';
      setPpctFileText(textTrunc);
      setPpctBase64(b64);
      setPpctMimeType(mime);
      const updatedPpctData = {
        ...ppctData,
        text: textTrunc,
        base64: b64,
        mimeType: mime,
      };
      onPpctDataChange(updatedPpctData);

      // CRITICAL: Extract curriculum from uploaded file and update matrix immediately!
      const currentYccd = yccdFileText || ppctData.yccdText || '';
      const extracted = extractCurriculumFromText(textTrunc, currentYccd, mon, grade, semester);
      if (extracted.length > 0) {
        onReconcileSuccess(extracted, `Đã lấy đúng 100% dữ liệu từ tệp PPCT "${file.name}"`, updatedPpctData);
        setReconcileStatus(`✓ Đã nạp đúng ${extracted.length} chương/chủ đề và toàn bộ bài học từ tệp "${file.name}" vào Ma trận! Đang đối chiếu YCCĐ cho Bản đặc tả...`);

        // Automatically run background AI reconcile to refine YCCĐ for the Spec Table
        runReconcileWithData(
          textTrunc,
          currentYccd,
          b64,
          yccdBase64 || ppctData.yccdBase64 || '',
          mime,
          yccdMimeType || ppctData.yccdMimeType || ''
        );
      } else {
        setReconcileStatus(`Đã tải lên tệp PPCT "${file.name}". Bấm nút "Đối chiếu và điều chỉnh bằng AI" bên dưới để trích xuất.`);
      }
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
      const b64 = await fileToBase64(file);
      const textTrunc = text.slice(0, 300000);
      const mime = file.type || 'application/pdf';
      setYccdFileText(textTrunc);
      setYccdBase64(b64);
      setYccdMimeType(mime);
      const updatedPpctData = {
        ...ppctData,
        yccdText: textTrunc,
        yccdBase64: b64,
        yccdMimeType: mime,
      };
      onPpctDataChange(updatedPpctData);

      // Immediately sync YCCĐ into current rows for Spec Table
      const updatedWithYccd = ensureValidYccd(currentRows, mon, grade, updatedPpctData, true);
      onReconcileSuccess(updatedWithYccd, `Đã đồng bộ YCCĐ từ tệp "${file.name}"`, updatedPpctData);
      setReconcileStatus(`✓ Đã đồng bộ yêu cầu cần đạt từ tệp "${file.name}" vào Bản đặc tả!`);

      // Trigger background AI reconcile to refine
      runReconcileWithData(
        ppctFileText || ppctData.text || '',
        textTrunc,
        ppctBase64 || ppctData.base64 || '',
        b64,
        ppctMimeType || ppctData.mimeType || '',
        mime
      );
    } catch (err: any) {
      setReconcileStatus(`Lỗi đọc YCCĐ: ${err.message}`);
    }
  };

  const ppctInputRef = React.useRef<HTMLInputElement>(null);
  const yccdInputRef = React.useRef<HTMLInputElement>(null);

  const handleClearPpct = () => {
    setPpctFileText('');
    setPpctBase64('');
    setPpctMimeType('');
    if (ppctInputRef.current) {
      ppctInputRef.current.value = '';
    }
    onPpctDataChange({
      ...ppctData,
      text: '',
      base64: '',
      mimeType: '',
    });
    setReconcileStatus('Đã xóa tệp PPCT cá nhân.');
  };

  const handleClearYccd = () => {
    setYccdFileText('');
    setYccdBase64('');
    setYccdMimeType('');
    if (yccdInputRef.current) {
      yccdInputRef.current.value = '';
    }
    onPpctDataChange({
      ...ppctData,
      yccdText: '',
      yccdBase64: '',
      yccdMimeType: '',
    });
    setReconcileStatus('Đã xóa tệp YCCĐ cá nhân.');
  };

  const handleRunReconcile = async () => {
    setIsReconciling(true);
    setReconcileStatus(`⚡ Đang kích hoạt AI đối chiếu tệp cho kỳ: ${semester} (Môn ${mon} lớp ${grade})...`);

    // Yield control briefly so UI updates loading spinner instantly
    await new Promise((r) => setTimeout(r, 50));

    const pText = ppctFileText || ppctData.text || '';
    const yText = yccdFileText || ppctData.yccdText || '';
    const pB64 = ppctBase64 || ppctData.base64 || '';
    const yB64 = yccdBase64 || ppctData.yccdBase64 || '';
    const pMime = ppctMimeType || ppctData.mimeType || '';
    const yMime = yccdMimeType || ppctData.yccdMimeType || '';

    // Step 1: Immediately extract and update matrix and spec table locally (0ms latency)
    const localExtracted = extractCurriculumFromText(pText, yText, mon, grade, semester);
    if (localExtracted.length > 0) {
      onReconcileSuccess(localExtracted, `Đã trích xuất ${localExtracted.length} chương trực tiếp từ tệp (Giới hạn ${semester})`, { text: pText, yccdText: yText });
      setReconcileStatus(`Đã trích xuất ngay ${localExtracted.length} chương/chủ đề từ tệp! Đang hoàn thiện đối chiếu YCCĐ bằng AI cho ${semester}...`);
    } else {
      const updatedLocally = ensureValidYccd(currentRows, mon, grade, { text: pText, yccdText: yText }, true);
      onReconcileSuccess(updatedLocally, `Đã đối chiếu YCCĐ từ tệp tải lên (Giới hạn ${semester})`, { text: pText, yccdText: yText });
    }

    // Step 2: Call Gemini AI in background to refine and polish
    await runReconcileWithData(
      pText,
      yText,
      pB64,
      yB64,
      pMime,
      yMime
    );
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Tải lên PPCT cá nhân (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() => downloadSamplePPCT('csv')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    Tải file mẫu PPCT (.csv)
                  </button>
                </div>
                <input
                  type="file"
                  ref={ppctInputRef}
                  accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handlePpctUpload}
                  className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {(ppctFileText || ppctBase64 || ppctData.text || ppctData.base64) && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-100">
                    <span className="truncate font-medium">✓ Đã tải tệp PPCT</span>
                    <button
                      type="button"
                      onClick={handleClearPpct}
                      className="text-red-600 hover:text-red-800 hover:underline font-semibold ml-2 shrink-0 inline-flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa tệp
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    Tải lên YCCĐ cá nhân (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() => downloadSampleYCCD('csv')}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    <Download className="w-3 h-3" />
                    Tải file mẫu YCCĐ (.csv)
                  </button>
                </div>
                <input
                  type="file"
                  ref={yccdInputRef}
                  accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
                  onChange={handleYccdUpload}
                  className="w-full text-xs text-slate-500 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {(yccdFileText || yccdBase64 || ppctData.yccdText || ppctData.yccdBase64) && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-100">
                    <span className="truncate font-medium">✓ Đã tải tệp YCCĐ</span>
                    <button
                      type="button"
                      onClick={handleClearYccd}
                      className="text-red-600 hover:text-red-800 hover:underline font-semibold ml-2 shrink-0 inline-flex items-center gap-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa tệp
                    </button>
                  </div>
                )}
              </div>
            </div>


            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRunReconcile}
                disabled={isReconciling}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm active:scale-95 cursor-pointer"
              >
                {isReconciling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Đang AI đối chiếu tệp ({semester})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Đối chiếu và điều chỉnh bằng AI</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onResetDefault}
                disabled={isReconciling}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Cập nhật lại PPCT & YCCĐ chuẩn từ Bộ GD&ĐT
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{showGuide ? 'Ẩn hướng dẫn cấu trúc file' : '📋 Xem cấu trúc file chuẩn AI lọc 100%'}</span>
              </button>
            </div>

            {/* Structure Guide Panel */}
            {showGuide && (
              <div className="mt-3 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-xs text-slate-800">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-700" />
                    Cấu Trúc Tệp Chuẩn Giúp AI Trích Xuất Chính Xác 100%
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setGuideTab('ppct')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        guideTab === 'ppct' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      Mẫu tệp PPCT
                    </button>
                    <button
                      type="button"
                      onClick={() => setGuideTab('yccd')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        guideTab === 'yccd' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-amber-100'
                      }`}
                    >
                      Mẫu tệp YCCĐ
                    </button>
                  </div>
                </div>

                {guideTab === 'ppct' ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                      <p className="text-slate-700">
                        <b>Định dạng hỗ trợ:</b> Word (`.docx`), Excel (`.xlsx`), CSV (`.csv`), PDF (`.pdf`).
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadSamplePPCT('csv')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải tệp mẫu PPCT (.csv / Excel)
                      </button>
                    </div>
                    <p className="text-slate-700 font-medium">
                      Cấu trúc bảng PPCT chuẩn khuyến nghị:
                    </p>
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] leading-relaxed text-slate-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b">
                            <th className="p-1 border">STT</th>
                            <th className="p-1 border">Tuần</th>
                            <th className="p-1 border">Tên Chương / Bài học (Nội dung)</th>
                            <th className="p-1 border">Số tiết</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-amber-50/50 font-bold text-indigo-900">
                            <td className="p-1 border">1</td>
                            <td className="p-1 border">Tuần 1</td>
                            <td className="p-1 border">CHƯƠNG 1. SỬ DỤNG BẢN ĐỒ</td>
                            <td className="p-1 border"></td>
                          </tr>
                          <tr>
                            <td className="p-1 border">2</td>
                            <td className="p-1 border">Tuần 1</td>
                            <td className="p-1 border">Bài 1. Một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ</td>
                            <td className="p-1 border">2</td>
                          </tr>
                          <tr>
                            <td className="p-1 border">3</td>
                            <td className="p-1 border">Tuần 2</td>
                            <td className="p-1 border">Bài 2. Phương pháp sử dụng bản đồ trong học tập địa lí và đời sống</td>
                            <td className="p-1 border">1</td>
                          </tr>
                          <tr className="bg-amber-50/50 font-bold text-indigo-900">
                            <td className="p-1 border">4</td>
                            <td className="p-1 border">Tuần 3</td>
                            <td className="p-1 border">CHƯƠNG 2. TRÁI ĐẤT</td>
                            <td className="p-1 border"></td>
                          </tr>
                          <tr>
                            <td className="p-1 border">5</td>
                            <td className="p-1 border">Tuần 3</td>
                            <td className="p-1 border">Bài 3. Trái Đất trong hệ Mặt Trời. Thuyết khí quyển...</td>
                            <td className="p-1 border">2</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      <li><b>Tên Chương:</b> Phải ghi rõ <code>CHƯƠNG X. TÊN CHƯƠNG</code> (Ví dụ: <i>CHƯƠNG 1. SỬ DỤNG BẢN ĐỒ</i>).</li>
                      <li><b>Tên Bài:</b> Phải ghi rõ <code>Bài X. Tên bài...</code> tương ứng bên dưới từng chương.</li>
                      <li><b>Phần Chuyên đề:</b> Nằm ở mục/bảng riêng có tiêu đề <code>CHUYÊN ĐỀ HỌC TẬP</code> để AI tự động loại bỏ.</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                      <p className="text-slate-700 font-medium">
                        Cấu trúc bảng Yêu cầu cần đạt (YCCĐ) khuyến nghị:
                      </p>
                      <button
                        type="button"
                        onClick={() => downloadSampleYCCD('csv')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Tải tệp mẫu YCCĐ (.csv / Excel)
                      </button>
                    </div>
                    <div className="overflow-x-auto bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] leading-relaxed text-slate-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b">
                            <th className="p-1 border w-12">STT</th>
                            <th className="p-1 border w-1/3">Chủ đề / Đơn vị kiến thức (Tên bài)</th>
                            <th className="p-1 border">Yêu cầu cần đạt (YCCĐ)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="p-1 border">1</td>
                            <td className="p-1 border font-semibold">Bài 1. Một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ</td>
                            <td className="p-1 border">
                              - Trình bày được một số phương pháp biểu hiện đối tượng địa lí trên bản đồ.<br/>
                              - Phân biệt được các phương pháp biểu hiện ký hiệu, đường chuyển động...
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 border">2</td>
                            <td className="p-1 border font-semibold">Bài 2. Phương pháp sử dụng bản đồ trong học tập và đời sống</td>
                            <td className="p-1 border">
                              - Sử dụng được bản đồ trong học tập địa lí và đời sống.<br/>
                              - Xác định được vị trí địa lí của đối tượng trên bản đồ.
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-700">
                      <li>Tên bài trong file YCCĐ phải khớp tên bài trong file PPCT để AI đối chiếu chính xác.</li>
                      <li>Yêu cầu cần đạt trình bày dưới dạng gạch đầu dòng rõ ràng để đưa trực tiếp vào Bản đặc tả.</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {reconcileStatus && (
              <div className={`text-xs p-3 rounded-xl border flex items-center gap-2 ${
                isReconciling 
                  ? 'bg-amber-50 text-amber-900 border-amber-200 animate-pulse font-medium' 
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}>
                {isReconciling && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-600" />}
                <span>{reconcileStatus}</span>
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
                  step="0.25"
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
                  step="0.25"
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
                  step="0.25"
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
                  step="0.25"
                  min="0"
                  value={points.tl}
                  onChange={(e) => onPointsChange({ ...points, tl: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center font-semibold"
                />
              </div>
            </div>

            {onRedistributeFourFormats && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onRedistributeFourFormats}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Tự động phân bổ lại ma trận bảo toàn 4 dạng câu hỏi (10.0đ)
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">
                Thang tổng điểm đề kiểm tra (Mặc định 10.0đ, có thể chỉnh 20đ, 100đ...):
              </label>
              <input
                type="number"
                step="0.25"
                min="1"
                value={targetTotalScore}
                onChange={(e) => onTargetTotalScoreChange(Number(e.target.value) || 10)}
                className="w-32 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold text-indigo-700"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Điều chỉnh điểm chuẩn theo dạng (TNLC, Đúng/Sai, Trả lời ngắn, Tự luận) (mỗi lần ±0.25):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['TNLC', 'Đúng/Sai', 'Trả lời ngắn', 'Tự luận'].map((name, i) => (
                  <div key={name}>
                    <span className="text-[11px] text-slate-500 block mb-0.5">{name}</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={targetFormatPoints[i]}
                      onChange={(e) => {
                        const next = [...targetFormatPoints];
                        next[i] = Number(e.target.value) || 0;
                        onTargetFormatPointsChange(next);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-center font-semibold"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Điều chỉnh điểm chuẩn theo mức độ (Biết, Hiểu, Vận dụng) (mỗi lần ±0.25):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Biết', 'Hiểu', 'Vận dụng'].map((name, i) => (
                  <div key={name}>
                    <span className="text-[11px] text-slate-500 block mb-0.5">{name}</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={targetLevelPoints[i]}
                      onChange={(e) => {
                        const next = [...targetLevelPoints];
                        next[i] = Number(e.target.value) || 0;
                        onTargetLevelPointsChange(next);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-center font-semibold"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
