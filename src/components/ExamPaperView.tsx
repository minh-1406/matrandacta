import React from 'react';
import {
  ExamHeaderConfig,
  GeneratedQuestion,
  QuestionPointConfig,
  SubjectName,
} from '../types';
import { formatNumber, formatVietnameseNumber } from '../utils/matrixCalculations';
import { parsePartIIITableQuestion, getSafeTrueFalseItems } from '../utils/questionChecker';
import { Trash2, RotateCcw, Filter } from 'lucide-react';

interface ExamPaperViewProps {
  questions: GeneratedQuestion[];
  examCode: string;
  setIndex: number;
  headerConfig: ExamHeaderConfig;
  mon: SubjectName;
  grade: string | number;
  semester: string;
  points: QuestionPointConfig;
  isCompact?: boolean;
  editable?: boolean;
  levelFilter?: 'ALL' | 'B' | 'H' | 'V';
  onEditStem?: (qIdx: number, val: string) => void;
  onEditAsk?: (qIdx: number, val: string) => void;
  onEditOpt?: (qIdx: number, optIdx: number, val: string) => void;
  onEditSubItem?: (qIdx: number, itemIdx: number, val: string) => void;
  onEditAns?: (qIdx: number, val: string) => void;
  onEditLevel?: (qIdx: number, level: 'B' | 'H' | 'V') => void;
  onToggleSubItemAns?: (qIdx: number, itemIdx: number) => void;
  onDeleteQuestion?: (qIdx: number) => void;
  onRegenerateQuestion?: (qIdx: number) => void;
  idPrefix?: string;
}

export const ExamPaperView: React.FC<ExamPaperViewProps> = ({
  questions,
  examCode,
  setIndex,
  headerConfig,
  mon,
  grade,
  semester,
  points,
  isCompact = false,
  editable = true,
  levelFilter = 'ALL',
  onEditStem,
  onEditAsk,
  onEditOpt,
  onEditSubItem,
  onEditAns,
  onEditLevel,
  onToggleSubItemAns,
  onDeleteQuestion,
  onRegenerateQuestion,
  idPrefix = 'exam-preview-container',
}) => {
  if (!questions || questions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
        Chưa có câu hỏi nào trong đề thi này.
      </div>
    );
  }

  // Phân loại toàn bộ câu hỏi gốc
  const allNlcQuestions = questions.filter((q) => q.d === 'NLC');
  const allDsQuestions = questions.filter((q) => q.d === 'DS');
  const allTlnQuestions = questions.filter((q) => q.d === 'TLN');
  const allTlQuestions = questions.filter((q) => q.d === 'TL');

  // Hàm kiểm tra câu hỏi khớp mức độ nhận thức (3 mức độ: Nhận biết, Thông hiểu, Vận dụng)
  const matchesLevel = (q: GeneratedQuestion) => {
    if (!levelFilter || levelFilter === 'ALL') return true;
    if (levelFilter === 'V') {
      return q.m === 'V' || (q.items && q.items.some((it) => it.m === 'V'));
    }
    if (levelFilter === 'H') {
      return q.m === 'H' || (q.items && q.items.some((it) => it.m === 'H'));
    }
    if (levelFilter === 'B') {
      return q.m === 'B' || (q.items && q.items.some((it) => it.m === 'B'));
    }
    return true;
  };

  // Danh sách câu hỏi sau khi áp dụng bộ lọc mức độ
  const nlcQuestions = allNlcQuestions.filter(matchesLevel);
  const dsQuestions = allDsQuestions.filter(matchesLevel);
  const tlnQuestions = allTlnQuestions.filter(matchesLevel);
  const tlQuestions = allTlQuestions.filter(matchesLevel);

  const totalFilteredQuestions =
    nlcQuestions.length + dsQuestions.length + tlnQuestions.length + tlQuestions.length;

  const objectiveScore =
    allNlcQuestions.length * (points.tn || 0.25) +
    allDsQuestions.length * (points.ds || 1) +
    allTlnQuestions.length * (points.tln || 0.5);
  const rawTlTotal = allTlQuestions.length * (points.tl || 1);
  const totalTlScore =
    objectiveScore > 0 &&
    objectiveScore < 10 &&
    Math.abs(objectiveScore + rawTlTotal - 10) > 0.01 &&
    points.tl === 1
      ? Math.round((10 - objectiveScore) * 100) / 100
      : Math.round((rawTlTotal > 0 ? rawTlTotal : 3) * 100) / 100;
  const tlScoreStr = Number.isInteger(totalTlScore)
    ? `${totalTlScore},0`
    : String(totalTlScore).replace('.', ',');

  // Helper render huy hiệu / dropdown chọn mức độ nhận thức cho câu hỏi (3 mức: Biết, Hiểu, Vận dụng)
  const renderLevelBadge = (q: GeneratedQuestion, globalIdx: number) => {
    const effectiveLevel = q.m === 'H' || q.m === 'V' ? q.m : 'B';

    const badgeStyles: Record<string, string> = {
      B: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100',
      H: 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100',
      V: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    };

    const levelLabels: Record<string, string> = {
      B: 'Biết (NB)',
      H: 'Hiểu (TH)',
      V: 'Vận dụng (VD)',
    };

    if (editable && onEditLevel) {
      return (
        <select
          value={effectiveLevel}
          onChange={(e) => onEditLevel(globalIdx, e.target.value as 'B' | 'H' | 'V')}
          className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 ${
            badgeStyles[effectiveLevel] || badgeStyles.B
          }`}
          title="Bấm để thay đổi mức độ nhận thức của câu hỏi này"
        >
          <option value="B">Biết (NB)</option>
          <option value="H">Hiểu (TH)</option>
          <option value="V">Vận dụng (VD)</option>
        </select>
      );
    }

    return (
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
          badgeStyles[effectiveLevel] || badgeStyles.B
        }`}
      >
        {levelLabels[effectiveLevel] || 'Biết (NB)'}
      </span>
    );
  };

  const renderStimulusSources = (srcs?: any[]) => {
    if (!srcs || srcs.length === 0) return null;
    return srcs.map((s, sIdx) => {
      const cleanSrc = (s.src || '').replace(/^(Chương \d+|Câu \d+|Nguồn:)\s*/gi, '').trim();
      const cleanText = (s.text || '').replace(/^(Chương \d+|Câu \d+)\s*/gi, '').trim();
      return (
        <div key={sIdx} className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
          {cleanText && <p className="italic leading-relaxed">{cleanText}</p>}

          {s.table && (
            <div className="space-y-1.5 overflow-x-auto">
              {s.table.title && <p className="font-bold text-indigo-900">{s.table.title}</p>}
              <table className="w-full border-collapse border border-slate-300 text-[11.5px]">
                {s.table.head && (
                  <thead>
                    <tr className="bg-indigo-50">
                      {s.table.head.map((h: string, hIdx: number) => (
                        <th key={hIdx} className="border border-slate-300 px-2 py-1 text-center font-semibold text-slate-800">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {(s.table.rows || []).map((row: string[], rIdx: number) => (
                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                      {row.map((cell: string, cIdx: number) => (
                        <td key={cIdx} className={`border border-slate-300 px-2 py-1 ${cIdx === 0 ? 'text-left font-medium' : 'text-center'}`}>
                          {formatVietnameseNumber(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {s.chart && (
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1.5">
              {s.chart.title && (
                <p className="font-bold text-indigo-900">
                  {s.chart.title} {s.chart.unit ? `(Đơn vị: ${s.chart.unit})` : ''}
                </p>
              )}
              <div className="space-y-1">
                {(s.chart.series || []).map((ser: any, srIdx: number) => (
                  <div key={srIdx} className="text-[11px] text-slate-700">
                    <span className="font-semibold">{ser.name || 'Số liệu'}:</span>{' '}
                    {(ser.values || []).map((v: any) => formatVietnameseNumber(v)).join(' · ')}
                  </div>
                ))}
                {s.chart.labels && (
                  <div className="text-[10.5px] text-slate-500 italic">
                    Nhãn: {s.chart.labels.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {s.fig && (
            <div className="bg-slate-50 p-3 rounded border border-dashed border-slate-300 text-center text-slate-600 space-y-1">
              <span className="text-[11px] font-bold uppercase text-indigo-700 block">
                📊 [Hình minh họa / Sơ đồ / Bản đồ]
              </span>
              <p className="italic">{s.fig}</p>
            </div>
          )}

          {cleanSrc && (
            <p className="text-[11px] text-slate-500 font-medium pt-1 text-right">
              <i>(Nguồn: {cleanSrc})</i>
            </p>
          )}
        </div>
      );
    });
  };

  return (
    <div
      id={`${idPrefix}-${setIndex}`}
      className={`bg-white border border-slate-200 rounded-2xl ${
        isCompact ? 'p-4 sm:p-5' : 'p-6 sm:p-8'
      } shadow-sm space-y-6 text-slate-800 font-sans`}
    >
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        {/* Top 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-semibold mb-2">
          {/* Left Column: Sở / Trường / Trang */}
          <div className="text-center space-y-0.5">
            <div className="font-bold text-slate-900 uppercase">
              {headerConfig.soGiaoDuc?.trim() || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........'}
            </div>
            <div className="font-bold text-slate-900 uppercase">
              {headerConfig.truongThpt?.trim() || 'TRƯỜNG THPT ..........................'}
            </div>
            <div className="text-slate-400 text-xs">----------</div>
            <div className="italic text-slate-600 text-[11.5px] font-normal pt-0.5">
              {headerConfig.ghiChuDeThi?.trim() || '(Đề thi có ... trang)'}
            </div>
          </div>

          {/* Right Column: Kỳ thi / Môn / Thời gian */}
          <div className="text-center space-y-0.5">
            <div className="text-slate-900 font-bold uppercase text-xs sm:text-sm">
              {headerConfig.tenKyThi?.trim() ||
                (semester ? `ĐỀ KIỂM TRA ${semester.toUpperCase()}` : 'KỲ THI KIỂM TRA ĐỊNH KÌ')}{' '}
              - NĂM HỌC {headerConfig.namHoc?.trim() || '2024 - 2025'}
            </div>
            <div className="text-slate-800 font-bold uppercase text-xs sm:text-sm">
              MÔN: {mon.toUpperCase()} - LỚP {grade}
            </div>
            <div className="italic text-slate-600 text-xs font-normal">
              Thời gian làm bài: {headerConfig.thoiGianLamBai?.trim() || '50'} phút (không kể thời gian phát đề)
            </div>
          </div>
        </div>

        {/* Candidate Info & Exam Code Box on a Single Row */}
        <div className="flex flex-row justify-between items-center gap-2 text-xs font-medium text-slate-700 pt-2 border-t border-slate-100">
          <div className="truncate">
            <b>Họ và tên:</b> ........................................
          </div>
          <div className="truncate">
            <b>SBD:</b> ....................
          </div>
          <div className="border-2 border-slate-900 bg-white px-3 py-1 text-center shrink-0 rounded-none shadow-2xs">
            <span className="font-bold text-slate-900 text-xs">
              Mã đề <span className="font-mono text-slate-950 font-black ml-1">{examCode || '101'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Empty State when filtering returns 0 questions */}
      {totalFilteredQuestions === 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-8 text-center text-amber-900 shadow-2xs space-y-2 my-4">
          <Filter className="w-8 h-8 text-amber-600 mx-auto opacity-70" />
          <h4 className="font-bold text-sm">Không tìm thấy câu hỏi nào thuộc mức độ nhận thức này</h4>
          <p className="text-xs text-amber-800">
            Đề thi hiện tại không có câu hỏi ở mức độ đã chọn. Thầy cô vui lòng chọn mức độ khác trên thanh lọc hoặc bấm "Tất cả" để xem toàn bộ đề thi.
          </p>
        </div>
      )}

      {/* Part I: Multiple Choice */}
      {nlcQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs sm:text-sm text-slate-900 border-b border-indigo-100 pb-1.5 leading-relaxed flex flex-wrap items-center justify-between gap-1">
            <div>
              <span className="font-bold text-indigo-900">
                PHẦN I. Câu trả lời trắc nghiệm nhiều phương án lựa chọn.
              </span>{' '}
              <span>
                Học sinh trả lời từ câu 1 đến câu {allNlcQuestions.length}. Mỗi câu hỏi học sinh chỉ chọn một phương án.
              </span>
            </div>
            {levelFilter !== 'ALL' && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                Hiển thị {nlcQuestions.length}/{allNlcQuestions.length} câu
              </span>
            )}
          </div>

          <div className="space-y-4">
            {nlcQuestions.map((q, idx) => {
              const globalIdx = questions.indexOf(q);
              const realQNum = q._num || (allNlcQuestions.indexOf(q) + 1);
              return (
                <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                      Câu {realQNum}.
                    </span>
                    {editable ? (
                      <input
                        type="text"
                        value={q.stem}
                        onChange={(e) => onEditStem && onEditStem(globalIdx, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                      />
                    ) : (
                      <span className="flex-1 text-xs font-medium text-slate-800 p-1">
                        {q.stem}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderLevelBadge(q, globalIdx)}
                      {editable && onRegenerateQuestion && (
                        <button
                          type="button"
                          onClick={() => onRegenerateQuestion(globalIdx)}
                          title={`Soạn lại Câu ${realQNum} (Đối chiếu tài liệu tải lên hoặc Web & SGK Kết nối tri thức)`}
                          className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Soạn lại</span>
                        </button>
                      )}
                      {editable && onDeleteQuestion && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(globalIdx)}
                          title={`Xóa Câu ${realQNum} khỏi đề thi`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`grid ${isCompact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2 pl-4 text-xs`}>
                    {(q.opts || []).map((opt, oIdx) => {
                      const letter = 'ABCD'[oIdx];
                      const isCorrect = letter === q.ans;
                      return (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-1.5 p-1 rounded-lg transition ${
                            isCorrect ? 'bg-indigo-50/90 border border-indigo-200 shadow-2xs' : ''
                          }`}
                        >
                          {editable && onEditAns ? (
                            <button
                              type="button"
                              onClick={() => onEditAns(globalIdx, letter)}
                              title={
                                isCorrect
                                  ? 'Đây là ĐÁP ÁN ĐÚNG hiện tại (Bấm vào chữ cái khác để đổi đáp án)'
                                  : `Bấm để chọn ${letter} làm ĐÁP ÁN ĐÚNG`
                              }
                              className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition cursor-pointer shrink-0 ${
                                isCorrect
                                  ? 'bg-indigo-600 text-white underline shadow-2xs ring-2 ring-indigo-300'
                                  : 'text-slate-600 hover:bg-slate-200 hover:text-indigo-700'
                              }`}
                            >
                              {letter}.
                            </button>
                          ) : (
                            <b className={`text-slate-700 ${isCorrect ? 'underline font-bold text-indigo-900' : ''}`}>
                              {letter}.
                            </b>
                          )}
                          {editable ? (
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => onEditOpt && onEditOpt(globalIdx, oIdx, e.target.value)}
                              className="flex-1 bg-transparent hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400 text-slate-700"
                            />
                          ) : (
                            <span className="flex-1 p-1 text-slate-700">{opt}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Part II: True/False */}
      {dsQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs sm:text-sm text-slate-900 border-b border-indigo-100 pb-1.5 leading-relaxed flex flex-wrap items-center justify-between gap-1">
            <div>
              <span className="font-bold text-indigo-900">
                PHẦN II. Câu trắc nghiệm đúng sai.
              </span>{' '}
              <span>
                Học sinh trả lời từ câu 1 đến câu {allDsQuestions.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, học sinh chọn đúng hoặc sai.
              </span>
            </div>
            {levelFilter !== 'ALL' && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                Hiển thị {dsQuestions.length}/{allDsQuestions.length} câu
              </span>
            )}
          </div>

          <div className="space-y-4">
            {dsQuestions.map((q, idx) => {
              const globalIdx = questions.indexOf(q);
              const realQNum = q._num || (allDsQuestions.indexOf(q) + 1);
              return (
                <div key={idx} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                      Câu {realQNum}.
                    </span>
                    {(() => {
                      const hasTable = !!(q.srcs && q.srcs.some((s) => s.k === 'table' || (s as any).table));
                      const stemText = hasTable ? 'Cho bảng số liệu sau:' : q.stem;
                      return editable ? (
                        <input
                          type="text"
                          value={stemText}
                          onChange={(e) => onEditStem && onEditStem(globalIdx, e.target.value)}
                          className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                        />
                      ) : (
                        <span className="flex-1 text-xs font-medium text-slate-800 p-1">
                          {stemText}
                        </span>
                      );
                    })()}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderLevelBadge(q, globalIdx)}
                      {editable && onRegenerateQuestion && (
                        <button
                          type="button"
                          onClick={() => onRegenerateQuestion(globalIdx)}
                          title={`Soạn lại Câu ${realQNum} (Đối chiếu tài liệu tải lên hoặc Web & SGK Kết nối tri thức)`}
                          className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Soạn lại</span>
                        </button>
                      )}
                      {editable && onDeleteQuestion && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(globalIdx)}
                          title={`Xóa Câu ${realQNum} khỏi đề thi`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sources & Stimulus */}
                  {renderStimulusSources(q.srcs)}

                  {/* Items a, b, c, d */}
                  <div className="space-y-2 pl-1 sm:pl-3 text-xs">
                    {getSafeTrueFalseItems(q.items, setIndex * 5 + idx).map((it, iIdx) => {
                      const isHighlighted = levelFilter !== 'ALL' && it.m === levelFilter;
                      return (
                        <div
                          key={iIdx}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-xl border transition shadow-2xs ${
                            isHighlighted
                              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300'
                              : 'bg-white/80 border-slate-200/80 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-2 flex-1 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                                it.a ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {'abcd'[iIdx]}
                            </span>
                            {editable ? (
                              <input
                                type="text"
                                value={it.t}
                                onChange={(e) => onEditSubItem && onEditSubItem(globalIdx, iIdx, e.target.value)}
                                className="flex-1 bg-transparent hover:bg-slate-50 focus:bg-white p-1 rounded-lg border border-transparent focus:border-indigo-400 text-slate-800 text-xs font-medium"
                              />
                            ) : (
                              <span className="flex-1 p-1 text-slate-800 text-xs font-medium leading-relaxed">{it.t}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                            {editable && onToggleSubItemAns ? (
                              <button
                                type="button"
                                onClick={() => onToggleSubItemAns(globalIdx, iIdx)}
                                title="Bấm để hoán đổi Đúng / Sai cho ý này (Bảng đáp án và file xuất sẽ tự động cập nhật)"
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs border active:scale-95 ${
                                  it.a
                                    ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                }`}
                              >
                                {it.a ? '✓ Đúng' : '✗ Sai'}
                              </button>
                            ) : (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  it.a ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {it.a ? 'Đúng' : 'Sai'}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                it.m === 'B'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : it.m === 'H'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {it.m === 'B' ? 'Biết' : it.m === 'H' ? 'Hiểu' : 'Vận dụng'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Part III: Short Answer */}
      {tlnQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs sm:text-sm text-slate-900 border-b border-indigo-100 pb-1.5 leading-relaxed flex flex-wrap items-center justify-between gap-1">
            <div>
              <span className="font-bold text-indigo-900">
                PHẦN III. Câu trắc nghiệm yêu cầu trả lời ngắn.
              </span>{' '}
              <span>
                Học sinh trả lời từ câu 1 đến câu {allTlnQuestions.length}.
              </span>
            </div>
            {levelFilter !== 'ALL' && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                Hiển thị {tlnQuestions.length}/{allTlnQuestions.length} câu
              </span>
            )}
          </div>

          <div className="space-y-3">
            {tlnQuestions.map((q, idx) => {
              const globalIdx = questions.indexOf(q);
              const realQNum = q._num || (allTlnQuestions.indexOf(q) + 1);
              const tableInfo = parsePartIIITableQuestion(q);
              return (
                <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                      Câu {realQNum}.
                    </span>
                    {tableInfo.hasTable ? (
                      <span className="flex-1 text-xs font-bold text-slate-800 p-1">
                        {tableInfo.leadIn}
                      </span>
                    ) : editable ? (
                      <input
                        type="text"
                        value={q.stem}
                        onChange={(e) => onEditStem && onEditStem(globalIdx, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                      />
                    ) : (
                      <span className="flex-1 text-xs font-medium text-slate-800 p-1">
                        {q.stem}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderLevelBadge(q, globalIdx)}
                      {editable && onRegenerateQuestion && (
                        <button
                          type="button"
                          onClick={() => onRegenerateQuestion(globalIdx)}
                          title={`Soạn lại Câu ${realQNum} (Đối chiếu tài liệu tải lên hoặc Web & SGK Kết nối tri thức)`}
                          className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Soạn lại</span>
                        </button>
                      )}
                      {editable && onDeleteQuestion && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(globalIdx)}
                          title={`Xóa Câu ${realQNum} khỏi đề thi`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sources & Data Table for Part III (if any) */}
                  {renderStimulusSources(q.srcs)}

                  {/* Question prompt / calculation command below data table */}
                  {tableInfo.hasTable && (
                    <div className="pl-1 sm:pl-2 text-xs text-slate-800">
                      {editable && onEditAsk ? (
                        <input
                          type="text"
                          value={q.ask || tableInfo.questionPrompt}
                          onChange={(e) => onEditAsk(globalIdx, e.target.value)}
                          className="w-full bg-white text-xs font-semibold text-slate-900 p-1.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                          placeholder="Nội dung câu hỏi / yêu cầu tính toán bên dưới bảng..."
                        />
                      ) : (
                        <p className="font-semibold text-slate-900 leading-relaxed p-1">
                          {q.ask || tableInfo.questionPrompt}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-slate-500 pl-4 space-y-1">
                    <div className="text-slate-400 font-mono">
                      Trả lời: [ .......................................................... ]
                    </div>
                    <div className="flex items-center gap-2 font-bold text-indigo-700">
                      <span>Đáp án (tối đa 4 kí tự):</span>
                      {editable && onEditAns ? (
                        <input
                          type="text"
                          maxLength={4}
                          value={q.ans || ''}
                          onChange={(e) => onEditAns(globalIdx, e.target.value)}
                          placeholder="0.00"
                          className="w-20 px-2 py-0.5 text-center font-mono font-bold bg-white border border-indigo-300 text-indigo-900 rounded focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                          title="Sửa trực tiếp đáp án trả lời ngắn (tối đa 4 ký tự theo quy định của Bộ)"
                        />
                      ) : (
                        <span className="bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                          {q.ans}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Part IV: Essay */}
      {tlQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs sm:text-sm text-slate-900 border-b border-indigo-100 pb-1.5 leading-relaxed flex flex-wrap items-center justify-between gap-1">
            <div>
              <span className="font-bold text-indigo-900">
                PHẦN IV. Tự luận (Từ câu 1 đến câu {allTlQuestions.length}; {tlScoreStr} điểm)
              </span>
            </div>
            {levelFilter !== 'ALL' && (
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                Hiển thị {tlQuestions.length}/{allTlQuestions.length} câu
              </span>
            )}
          </div>
          <div className="space-y-3">
            {tlQuestions.map((q, idx) => {
              const globalIdx = questions.indexOf(q);
              const realQNum = q._num || (allTlQuestions.indexOf(q) + 1);
              return (
                <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-xs text-indigo-800 whitespace-nowrap">
                      Câu {realQNum}.
                    </span>
                    {editable ? (
                      <input
                        type="text"
                        value={q.stem}
                        onChange={(e) => onEditStem && onEditStem(globalIdx, e.target.value)}
                        className="flex-1 bg-transparent text-xs font-medium text-slate-800 hover:bg-white focus:bg-white p-1 rounded border border-transparent focus:border-indigo-400"
                      />
                    ) : (
                      <span className="flex-1 text-xs font-medium text-slate-800 p-1">
                        {q.stem}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderLevelBadge(q, globalIdx)}
                      {editable && onRegenerateQuestion && (
                        <button
                          type="button"
                          onClick={() => onRegenerateQuestion(globalIdx)}
                          title={`Soạn lại Câu ${realQNum} (Đối chiếu tài liệu tải lên hoặc Web & SGK Kết nối tri thức)`}
                          className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Soạn lại</span>
                        </button>
                      )}
                      {editable && onDeleteQuestion && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(globalIdx)}
                          title={`Xóa Câu ${realQNum} khỏi đề thi`}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition inline-flex items-center gap-0.5 text-xs font-medium cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] hidden sm:inline">Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="text-center font-bold text-xs text-slate-500 pt-4 border-t border-slate-200">
        ------------------------ HẾT ------------------------
        <div className="text-[11px] font-normal italic text-slate-400">
          (Giám thị coi thi không giải thích gì thêm)
        </div>
      </div>

      {/* Footer: Trang ... - Mã đề ... (Right-aligned) */}
      <div className="text-right text-xs font-medium text-slate-500 pt-2 border-t border-dashed border-slate-200">
        Trang 1 - Mã đề {examCode || '101'}
      </div>

      {/* Answer Key & Guide Section */}
      <div className="pt-6 border-t-2 border-indigo-200 space-y-3">
        <h4 className="font-bold text-sm text-indigo-900 uppercase">
          ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM (MÃ ĐỀ: {examCode || '1001'})
        </h4>

        {nlcQuestions.length > 0 && (
          <div className="text-xs space-y-1">
            <b className="text-slate-800">Phần I:</b>{' '}
            {nlcQuestions
              .map((q, i) => `Câu ${i + 1}: ${q.ans}`)
              .join(' · ')}
          </div>
        )}

        {dsQuestions.length > 0 && (
          <div className="text-xs space-y-1">
            <b className="text-slate-800">Phần II:</b>{' '}
            {dsQuestions
              .map((q, i) => {
                const safeItems = getSafeTrueFalseItems(q.items, setIndex * 5 + i);
                const correct = safeItems
                  .map((it, idx) => (it.a ? 'abcd'[idx] : null))
                  .filter(Boolean);
                const incorrect = safeItems
                  .map((it, idx) => (!it.a ? 'abcd'[idx] : null))
                  .filter(Boolean);
                return `Câu ${i + 1}: ${correct.join(',')} Đ, ${incorrect.join(',')} S`;
              })
              .join(' · ')}
          </div>
        )}

        {tlnQuestions.length > 0 && (
          <div className="text-xs space-y-1">
            <b className="text-slate-800">Phần III:</b>{' '}
            {tlnQuestions
              .map((q, i) => `Câu ${i + 1}: ${q.ans}`)
              .join(' · ')}
          </div>
        )}

        {tlQuestions.length > 0 && (
          <div className="text-xs space-y-1.5">
            <b className="text-slate-800">Phần IV:</b>
            {tlQuestions.map((q, i) => (
              <div key={i} className="pl-2 space-y-1">
                <div className="font-semibold text-slate-800">Câu {i + 1}:</div>
                <div className="pl-2 whitespace-pre-line text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {q.ans}
                </div>
                {q.rubric && q.rubric.length > 0 && (
                  <div className="pt-1">
                    <div className="font-medium text-slate-700 pl-2">Biểu điểm thành phần:</div>
                    {q.rubric.map((rb, rIdx) => (
                      <div key={rIdx} className="pl-4 text-slate-600">
                        - Ý {rIdx + 1}: {rb.y} ({formatVietnameseNumber(formatNumber(rb.d))} điểm)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Trang X - Mã đề Y (right aligned) */}
      <div className="pt-4 mt-6 border-t border-slate-200 flex justify-end text-xs text-slate-500 italic">
        <span>Trang 1 - Mã đề {examCode || '101'}</span>
      </div>
    </div>
  );
};
