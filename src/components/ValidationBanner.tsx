import React, { useState } from 'react';
import { MatrixSums, formatNumber } from '../utils/matrixCalculations';
import { StructureMode, SubjectName, MatrixRow, QuestionPointConfig } from '../types';
import { PRACT } from '../constants/curriculumData';
import { CheckCircle2, AlertTriangle, AlertCircle, Wand2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { validateMatrix, ValidationResult } from '../utils/matrixValidator';

interface ValidationBannerProps {
  sums: MatrixSums;
  mon: SubjectName;
  structureMode: StructureMode;
  noTLN: boolean;
  targetTotalScore: number;
  targetFormatPoints: number[];
  targetLevelPoints: number[];
  rows: MatrixRow[];
  points: QuestionPointConfig;
  onAutoFixAll?: () => void;
  onFixSpecificIssue?: (autoFixType: string, rowIndex?: number) => void;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  sums,
  mon,
  structureMode,
  noTLN,
  targetTotalScore,
  targetFormatPoints,
  targetLevelPoints,
  rows,
  points,
  onAutoFixAll,
  onFixSpecificIssue,
}) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Run comprehensive validation check
  const valResult: ValidationResult = validateMatrix(
    rows,
    sums,
    points,
    mon,
    structureMode,
    noTLN,
    targetTotalScore,
    targetFormatPoints,
    targetLevelPoints
  );

  const totalScore = +sums.T.toFixed(2);
  const isScoreTarget = Math.abs(totalScore - targetTotalScore) < 0.05;

  const totalTrueFalseItems = sums.t[3] + sums.t[4] + sums.t[5];
  const isDivisibleBy4 = totalTrueFalseItems % 4 === 0;

  const isStandardMode =
    structureMode === 'k' && !['Ngữ văn', 'Tiếng Anh', ...PRACT].includes(mon);

  const formatNames = ['TNLC', 'Đúng–Sai', 'TL ngắn', 'Tự luận'];
  const levelNames = ['Biết', 'Hiểu', 'Vận dụng'];

  return (
    <div
      className={`border rounded-xl px-3.5 py-2.5 shadow-2xs mb-3 transition-all duration-200 ${
        valResult.hasErrors
          ? 'bg-rose-50/60 border-rose-200'
          : valResult.hasWarnings
          ? 'bg-amber-50/50 border-amber-200'
          : 'bg-emerald-50/40 border-emerald-200'
      }`}
    >
      {/* Compact Single-Line Status & Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {valResult.hasErrors ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />
          ) : valResult.hasWarnings ? (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}

          <span className="text-xs font-bold text-slate-800">
            {valResult.hasErrors
              ? `Phát hiện ${valResult.errors.length} lỗi cấu trúc ma trận`
              : valResult.hasWarnings
              ? `Có ${valResult.warnings.length} lưu ý tối ưu theo CV 7991`
              : 'Ma trận & Bản đặc tả đạt chuẩn 100% CV 7991'}
          </span>

          <span
            className={`text-xs px-2 py-0.5 rounded-md font-bold tabular-nums ${
              isScoreTarget
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            Tổng: {formatNumber(totalScore)}/{targetTotalScore}đ
          </span>

          {/* Inline compact format breakdown */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-600 pl-2 border-l border-slate-300/80 tabular-nums">
            {formatNames.map((name, i) => {
              const actual = sums.f[i];
              const target = targetFormatPoints[i];
              const ok = Math.abs(actual - target) <= 0.5;
              return (
                <span
                  key={name}
                  className={`px-1.5 py-0.5 rounded ${
                    ok ? 'bg-white/80 text-slate-700' : 'bg-amber-100/80 text-amber-900 font-semibold'
                  }`}
                >
                  {name}: <b>{formatNumber(actual)}đ</b>
                </span>
              );
            })}
            {isStandardMode && (
              <span className="text-slate-400 pl-1">
                | Mức độ: {levelNames.map((n, i) => `${n} ${formatNumber(sums.lv[i])}đ`).join(' · ')}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(valResult.hasErrors || valResult.hasWarnings) && onAutoFixAll && (
            <button
              type="button"
              onClick={onAutoFixAll}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
              title="Các AI bổ trợ chạy ngầm và tự động sửa triệt để 100% lỗi & lưu ý ma trận đủ 10.0đ"
            >
              <Wand2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>Tự động sửa triệt để ({targetTotalScore}đ)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 border border-slate-300 text-xs text-slate-700 font-semibold hover:bg-white transition cursor-pointer whitespace-nowrap"
          >
            <span>{showDetails ? 'Thu gọn' : 'Chi tiết tỉ lệ'}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Detailed Issues List when expanded */}
      {showDetails && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2">
          {/* Explicit Errors List */}
          {valResult.errors.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Các lỗi cần khắc phục ngay ({valResult.errors.length}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {valResult.errors.map((err) => (
                  <div
                    key={err.id}
                    className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 flex flex-col justify-between"
                  >
                    <div>
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span>
                        {err.title}
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed mt-0.5">
                        {err.description}
                      </p>
                    </div>

                    {err.autoFixType && onFixSpecificIssue && (
                      <div className="pt-1.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onFixSpecificIssue(err.autoFixType!, err.rowIndex)}
                          className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 className="w-3 h-3 text-rose-600" />
                          <span>Sửa triệt để</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings List */}
          {valResult.warnings.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Lưu ý tối ưu ma trận ({valResult.warnings.length}):
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {valResult.warnings.slice(0, 4).map((warn) => (
                  <div
                    key={warn.id}
                    className="p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-xs flex items-start justify-between gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-amber-900 text-[11.5px]">{warn.title}</div>
                        <p className="text-slate-600 text-[11px] leading-tight mt-0.5">{warn.description}</p>
                      </div>
                    </div>
                    {warn.autoFixType && onFixSpecificIssue && (
                      <button
                        type="button"
                        onClick={() => onFixSpecificIssue(warn.autoFixType!, warn.rowIndex)}
                        className="px-2 py-1 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3 text-amber-600" />
                        <span>Sửa ngay</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CV 7991 Quick Metric Check Ratios */}
          <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 bg-white/70 p-2 rounded-lg border border-slate-200/70">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-slate-700">Theo 4 dạng:</span>
              {formatNames.map((name, i) => {
                const actual = sums.f[i];
                const target = targetFormatPoints[i];
                const ok = Math.abs(actual - target) <= 0.5;
                return (
                  <span key={name} className="flex items-center gap-1">
                    <span>{name}:</span>
                    <span className={`font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700 font-bold'}`}>
                      {formatNumber(actual)}đ
                    </span>
                    {isStandardMode && <span className="text-slate-400">({formatNumber(target)}đ)</span>}
                  </span>
                );
              })}

              {totalTrueFalseItems > 0 && (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    isDivisibleBy4 ? 'bg-blue-50 text-blue-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  Đúng – Sai: {Math.floor(totalTrueFalseItems / 4)} câu lớn ({totalTrueFalseItems} ý)
                  {!isDivisibleBy4 && ' ⚠️ Chưa đủ bộ 4 ý!'}
                </span>
              )}
            </div>

            {isStandardMode && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-slate-700">Theo mức độ:</span>
                {levelNames.map((name, i) => {
                  const actual = sums.lv[i];
                  const target = targetLevelPoints[i];
                  const ok = Math.abs(actual - target) <= 0.5;
                  return (
                    <span key={name} className="flex items-center gap-1">
                      <span>{name}:</span>
                      <span className={`font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700 font-bold'}`}>
                        {formatNumber(actual)}đ
                      </span>
                      <span className="text-slate-400">({formatNumber(target)}đ)</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
