import React, { useState, useRef, useMemo } from 'react';
import { ExamSemester, SubjectName } from '../types';
import { parseUploadedExamFile, ParsedExamUploadResult } from '../services/geminiService';
import { formatVerbatimExamReport } from '../utils/examDocumentParser';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowRight,
  Trash2,
  Plus,
  Copy,
  Check,
} from 'lucide-react';

interface UploadExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamParsed: (result: ParsedExamUploadResult, file: File, mode: 'replace' | 'append') => void;
  currentSubject: SubjectName;
  currentGrade: string;
  currentSemester: ExamSemester;
}

export const UploadExamModal: React.FC<UploadExamModalProps> = ({
  isOpen,
  onClose,
  onExamParsed,
  currentSubject,
  currentGrade,
  currentSemester,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parsedPreview, setParsedPreview] = useState<ParsedExamUploadResult | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [copiedState, setCopiedState] = useState<'verbatim' | 'json' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const verbatimReport = useMemo(() => {
    if (!parsedPreview || !parsedPreview.questions.length) return '';
    return formatVerbatimExamReport(parsedPreview.questions, parsedPreview.partSummaries);
  }, [parsedPreview]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
    if (e.target) e.target.value = '';
  };

  const processFiles = async (newFiles: File[]) => {
    const combinedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(combinedFiles);
    setErrorMessage('');
    setIsProcessing(true);
    setStatusMessage(`Đang tải và phân tích ${combinedFiles.length} tệp đề thi & đáp án...`);

    try {
      let mergedQuestions: any[] = [];
      let lastHeaderConfig: any = null;
      let lastExamCode = '101';
      let lastPartSummaries: any = undefined;
      let anyExplicitAnswers = false;

      for (const file of combinedFiles) {
        const result = await parseUploadedExamFile(
          file,
          currentSubject,
          currentGrade,
          currentSemester
        );
        if (result.questions && result.questions.length > 0) {
          mergedQuestions = [...mergedQuestions, ...result.questions];
          if (result.headerConfig) lastHeaderConfig = result.headerConfig;
          if (result.examCode) lastExamCode = result.examCode;
          if (result.partSummaries && result.partSummaries.length > 0) {
            lastPartSummaries = result.partSummaries;
          }
          if (result.hasExplicitAnswers) anyExplicitAnswers = true;
        }
      }

      // Deduplicate questions by composite signature (prevent dropping distinct questions with generic stems)
      const getQuestionSig = (q: any) => {
        const normStem = String(q.stem || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const d = q.d || 'NLC';
        if (d === 'NLC') {
          const optsStr = Array.isArray(q.opts) ? q.opts.map((o: any) => String(o).trim().toLowerCase()).join('|') : '';
          return `${d}::${normStem}::${optsStr}`;
        }
        if (d === 'DS') {
          const itemsStr = Array.isArray(q.items) ? q.items.map((it: any) => String(it.t || '').trim().toLowerCase()).join('|') : '';
          return `${d}::${normStem}::${itemsStr}`;
        }
        if (d === 'TLN') {
          return `${d}::${normStem}::${String(q.ans || '').trim()}`;
        }
        return `${d}::${normStem}::${String(q.ans || '').slice(0, 50)}`;
      };

      const seenSignatures = new Set<string>();
      const uniqueQs: any[] = [];
      mergedQuestions.forEach((q) => {
        const sig = getQuestionSig(q);
        if (seenSignatures.has(sig)) return;
        seenSignatures.add(sig);
        uniqueQs.push(q);
      });

      if (uniqueQs.length === 0) {
        throw new Error('Không tìm thấy câu hỏi hợp lệ trong các tệp đã chọn. Hãy kiểm tra lại nội dung.');
      }

      const combinedResult: ParsedExamUploadResult = {
        headerConfig: lastHeaderConfig || {
          soGiaoDuc: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO',
          truongThpt: 'TRƯỜNG THPT',
          tenKyThi: 'ĐỀ KIỂM TRA ĐỊNH KÌ',
          namHoc: '2024 - 2025',
          thoiGianLamBai: '50',
          ghiChuDeThi: '(Đề thi có ... trang)',
        },
        subject: currentSubject,
        grade: currentGrade,
        semester: currentSemester,
        examCode: lastExamCode,
        questions: uniqueQs,
        partSummaries: lastPartSummaries,
        hasExplicitAnswers: anyExplicitAnswers,
      };

      setParsedPreview(combinedResult);
      setStatusMessage(`Đã trích xuất nguyên văn ${uniqueQs.length} câu hỏi từ ${combinedFiles.length} tệp!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi trích xuất đề thi từ tệp');
      setStatusMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFile = async (idx: number) => {
    const nextFiles = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(nextFiles);
    if (nextFiles.length === 0) {
      setParsedPreview(null);
      setErrorMessage('');
      setStatusMessage('');
    } else {
      await processFiles([]);
    }
  };

  const handleApplyToWorkspace = () => {
    if (!parsedPreview || selectedFiles.length === 0) return;
    onExamParsed(parsedPreview, selectedFiles[0], importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-teal-900 to-indigo-950 text-white flex items-center justify-between border-b border-emerald-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Tải đề thi lên độc lập
                </h3>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                  Word · PDF · Ảnh · JSON (Đa tệp)
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Tải lên một hoặc nhiều tệp đề thi (gồm cả đề và đáp án) để AI tự động trích xuất
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50/50">
          {/* Supported Format Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Định dạng hỗ trợ:
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-[11px]">
              <FileText className="w-3.5 h-3.5" /> Word (.doc, .docx)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-[11px]">
              <FileText className="w-3.5 h-3.5" /> PDF (.pdf)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 font-semibold text-[11px]">
              <ImageIcon className="w-3.5 h-3.5" /> Ảnh đề thi (.jpg, .png, .webp)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-[11px]">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Văn bản / JSON (.txt, .json)
            </span>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/70 scale-[1.01]'
                : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".doc,.docx,.pdf,.png,.jpg,.jpeg,.webp,.txt,.json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              ) : (
                <Upload className="w-6 h-6 text-emerald-600" />
              )}
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                Kéo thả nhiều tệp đề thi vào đây, hoặc bấm để chọn tệp
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Hỗ trợ chọn nhiều tệp cùng lúc (Word, PDF, ảnh, v.v.)
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition pointer-events-none"
            >
              Chọn tệp đề thi từ máy tính
            </button>
          </div>

          {/* Selected Files List with Delete Button */}
          {selectedFiles.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã đính kèm {selectedFiles.length} tệp đề thi:
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 underline transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tải thêm tệp
                </button>
              </div>

              <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, fIdx) => (
                  <div
                    key={fIdx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-emerald-300 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({Math.round(file.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(fIdx);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                      title={`Xóa tệp "${file.name}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing Status Indicator */}
          {isProcessing && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs font-semibold animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Đang phân tích và số hóa đề thi...</p>
                <p className="text-[11px] text-emerald-700 font-normal">{statusMessage}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không thể tải đề thi:</p>
                <p className="text-[11px] text-rose-700 font-normal mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Extracted Preview Card */}
          {parsedPreview && (
            <div className="bg-white border border-emerald-300 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kết quả trích xuất đề thi & đáp án thành công:</span>
                </div>
                <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  Tổng {parsedPreview.questions.length} câu hỏi
                </span>
              </div>

              {/* Counts Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-indigo-50 border border-indigo-200/70 p-2.5 rounded-xl">
                  <span className="text-[10px] text-indigo-700 uppercase font-bold block">Phần I (NLC)</span>
                  <b className="text-base text-indigo-900">
                    {parsedPreview.questions.filter((q) => q.d === 'NLC').length}
                  </b>
                  <span className="text-[10px] text-slate-500 block">câu</span>
                </div>
                <div className="bg-purple-50 border border-purple-200/70 p-2.5 rounded-xl">
                  <span className="text-[10px] text-purple-700 uppercase font-bold block">Phần II (Đ/S)</span>
                  <b className="text-base text-purple-900">
                    {parsedPreview.questions.filter((q) => q.d === 'DS').length}
                  </b>
                  <span className="text-[10px] text-slate-500 block">câu (4 ý/câu)</span>
                </div>
                <div className="bg-amber-50 border border-amber-200/70 p-2.5 rounded-xl">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">Phần III (TLN)</span>
                  <b className="text-base text-amber-900">
                    {parsedPreview.questions.filter((q) => q.d === 'TLN').length}
                  </b>
                  <span className="text-[10px] text-slate-500 block">câu</span>
                </div>
                <div className="bg-rose-50 border border-rose-200/70 p-2.5 rounded-xl">
                  <span className="text-[10px] text-rose-700 uppercase font-bold block">Phần IV (TL)</span>
                  <b className="text-base text-rose-900">
                    {parsedPreview.questions.filter((q) => q.d === 'TL').length}
                  </b>
                  <span className="text-[10px] text-slate-500 block">câu</span>
                </div>
              </div>

              {/* 100% Verbatim Structured Output per Section */}
              <div className="space-y-2 pt-2">
                <details open className="group bg-slate-50 border border-emerald-200 rounded-xl p-3">
                  <summary className="text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Bản trích xuất nguyên văn 100% theo từng phần & đáp án đúng
                    </span>
                    <span className="text-[10px] text-slate-500 group-open:hidden">Mở rộng</span>
                    <span className="text-[10px] text-slate-500 hidden group-open:inline">Thu gọn</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        Giữ nguyên văn nội dung gốc, bảng số liệu và đáp án đánh dấu
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(verbatimReport);
                          setCopiedState('verbatim');
                          setTimeout(() => setCopiedState(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold shadow-xs transition cursor-pointer"
                      >
                        {copiedState === 'verbatim' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Đã sao chép nguyên văn</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép nguyên văn</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[11px] leading-relaxed bg-white text-slate-800 border border-slate-200 p-3 rounded-xl overflow-x-auto max-h-[260px] whitespace-pre-wrap font-mono">
                      {verbatimReport}
                    </pre>
                  </div>
                </details>

                <details className="group bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <summary className="text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Xem cấu trúc JSON chuẩn (Số câu từng phần & Đáp án chi tiết)
                    </span>
                    <span className="text-[10px] text-slate-500 group-open:hidden">Bấm để xem</span>
                    <span className="text-[10px] text-slate-500 hidden group-open:inline">Thu gọn</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const nlcCount = parsedPreview.questions.filter(q => q.d === 'NLC').length;
                          const dsCount = parsedPreview.questions.filter(q => q.d === 'DS').length;
                          const tlnCount = parsedPreview.questions.filter(q => q.d === 'TLN').length;
                          const tlCount = parsedPreview.questions.filter(q => q.d === 'TL').length;
                          const partCounters = { NLC: 0, DS: 0, TLN: 0, TL: 0 };
                          const payload = {
                            tong_so_phan: [nlcCount, dsCount, tlnCount, tlCount].filter(c => c > 0).length,
                            tong_so_cau: parsedPreview.questions.length,
                            cau_truc_cac_phan: [
                              { ten_phan: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn", so_cau_trong_phan: nlcCount },
                              { ten_phan: "PHẦN II. Câu trắc nghiệm đúng sai", so_cau_trong_phan: dsCount },
                              { ten_phan: "PHẦN III. Câu trắc nghiệm trả lời ngắn", so_cau_trong_phan: tlnCount },
                              { ten_phan: "PHẦN IV. Tự luận", so_cau_trong_phan: tlCount },
                            ].filter(p => p.so_cau_trong_phan > 0),
                            dap_an_chi_tiet: parsedPreview.questions.map((q) => {
                              partCounters[q.d] += 1;
                              return {
                                phan: q.d === 'NLC' ? 'PHẦN I' : q.d === 'DS' ? 'PHẦN II' : q.d === 'TLN' ? 'PHẦN III' : 'PHẦN IV',
                                cau_so: partCounters[q.d],
                                loai_cau_hoi: q.d === 'NLC' ? 'Trắc nghiệm 1 đáp án' : q.d === 'DS' ? 'Trắc nghiệm Đúng Sai' : q.d === 'TLN' ? 'Trả lời ngắn' : 'Tự luận',
                                noi_dung_cau_hoi: q.stem,
                                ...(q.d === 'NLC' ? { phuong_an: q.opts, dap_an: q.ans } : {}),
                                ...(q.d === 'DS' ? { dap_an_dung_sai: q.items?.reduce((acc: any, it, i) => { acc['abcd'[i]] = it.a ? 'ĐÚNG' : 'SAI'; return acc; }, {}) } : {}),
                                ...(q.d === 'TLN' ? { dap_an: q.ans } : {}),
                                ...(q.d === 'TL' ? { yeu_cau: q.ans } : {}),
                              };
                            }),
                          };
                          navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                          setCopiedState('json');
                          setTimeout(() => setCopiedState(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-bold shadow-xs transition cursor-pointer"
                      >
                        {copiedState === 'json' ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Đã sao chép JSON</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép JSON chuẩn</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[10.5px] bg-slate-900 text-emerald-300 p-3 rounded-xl overflow-x-auto max-h-[220px] font-mono">
                      {JSON.stringify({
                        tong_so_phan: [
                          parsedPreview.questions.filter(q => q.d === 'NLC').length,
                          parsedPreview.questions.filter(q => q.d === 'DS').length,
                          parsedPreview.questions.filter(q => q.d === 'TLN').length,
                          parsedPreview.questions.filter(q => q.d === 'TL').length,
                        ].filter(c => c > 0).length,
                        tong_so_cau: parsedPreview.questions.length,
                        cau_truc_cac_phan: [
                          { ten_phan: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn", so_cau_trong_phan: parsedPreview.questions.filter(q => q.d === 'NLC').length },
                          { ten_phan: "PHẦN II. Câu trắc nghiệm đúng sai", so_cau_trong_phan: parsedPreview.questions.filter(q => q.d === 'DS').length },
                          { ten_phan: "PHẦN III. Câu trắc nghiệm trả lời ngắn", so_cau_trong_phan: parsedPreview.questions.filter(q => q.d === 'TLN').length },
                          { ten_phan: "PHẦN IV. Tự luận", so_cau_trong_phan: parsedPreview.questions.filter(q => q.d === 'TL').length },
                        ].filter(p => p.so_cau_trong_phan > 0),
                        dap_an_chi_tiet: parsedPreview.questions.slice(0, 5).map((q, idx) => ({
                          phan: q.d === 'NLC' ? 'PHẦN I' : q.d === 'DS' ? 'PHẦN II' : q.d === 'TLN' ? 'PHẦN III' : 'PHẦN IV',
                          cau_so: idx + 1,
                          loai_cau_hoi: q.d === 'NLC' ? 'Trắc nghiệm 1 đáp án' : q.d === 'DS' ? 'Trắc nghiệm Đúng Sai' : q.d === 'TLN' ? 'Trả lời ngắn' : 'Tự luận',
                          noi_dung_cau_hoi: q.stem,
                          ...(q.d === 'NLC' || q.d === 'TLN' ? { dap_an: q.ans } : {}),
                        })),
                      }, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>

              {/* Insertion Mode Option */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Chọn cách đưa vào đề thi:
                </label>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-emerald-50/50 p-2.5 rounded-xl border border-slate-300 has-checked:border-emerald-500 has-checked:bg-emerald-50/60 transition">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600"
                    />
                    <div>
                      <b className="text-slate-800 block">Thay thế đề thi hiện tại</b>
                      <span className="text-[10px] text-slate-500">Mở toàn bộ câu hỏi và đáp án từ tệp tải lên làm đề thi chính</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-emerald-50/50 p-2.5 rounded-xl border border-slate-300 has-checked:border-emerald-500 has-checked:bg-emerald-50/60 transition">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-emerald-600"
                    />
                    <div>
                      <b className="text-slate-800 block">Thêm nối tiếp vào đề</b>
                      <span className="text-[10px] text-slate-500">Giữ các câu đã có và thêm các câu từ tệp vào cuối đề thi</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>

          {parsedPreview && (
            <button
              type="button"
              onClick={handleApplyToWorkspace}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Nạp vào đề thi hiện tại ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
