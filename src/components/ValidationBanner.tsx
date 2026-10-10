import React from 'react';
import { MatrixSums, formatNumber } from '../utils/matrixCalculations';
import { StructureMode, SubjectName } from '../types';
import { PRACT } from '../constants/curriculumData';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ValidationBannerProps {
  sums: MatrixSums;
  mon: SubjectName;
  structureMode: StructureMode;
  noTLN: boolean;
}

export const ValidationBanner: React.FC<ValidationBannerProps> = ({
  sums,
  mon,
  structureMode,
  noTLN,
}) => {
  const totalScore = +sums.T.toFixed(2);
  const isScore10 = Math.abs(totalScore - 10) < 0.01;

  const totalTrueFalseItems = sums.t[3] + sums.t[4] + sums.t[5];
  const isDivisibleBy4 = totalTrueFalseItems % 4 === 0;

  const isStandardMode =
    structureMode === 'k' && !['Ngữ văn', 'Tiếng Anh', ...PRACT].includes(mon);

  const targetFormatPoints = noTLN ? [3, 4, 0, 3] : [3, 2, 2, 3];
  const targetLevelPoints = [4, 3, 3];

  const formatNames = ['Nhiều lựa chọn', 'Đúng – Sai', 'Trả lời ngắn', 'Tự luận'];
  const levelNames = ['Biết', 'Hiểu', 'Vận dụng'];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-4 space-y-2.5">
      {/* Top summary row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          {isScore10 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span className="text-sm font-semibold text-slate-800">
            Tổng điểm:{' '}
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                isScore10 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {formatNumber(totalScore)} / 10
            </span>
          </span>
        </div>

        <div className="text-xs text-slate-600 flex items-center gap-2">
          {totalTrueFalseItems > 0 && (
            <span
              className={`px-2.5 py-1 rounded-full font-medium ${
                isDivisibleBy4
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-rose-50 text-rose-700 flex items-center gap-1'
              }`}
            >
              {!isDivisibleBy4 && <AlertTriangle className="w-3.5 h-3.5" />}
              Đúng – Sai: {totalTrueFalseItems / 4} câu ({totalTrueFalseItems} ý nhỏ)
              {!isDivisibleBy4 && ' - Chưa chia hết cho 4'}
            </span>
          )}
        </div>
      </div>

      {/* Ratios check according to CV 7991 */}
      {isStandardMode && (
        <div className="text-xs text-slate-600 space-y-1.5 pt-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-slate-700">Theo dạng:</span>
            {formatNames.map((name, i) => {
              const actual = sums.f[i];
              const target = targetFormatPoints[i];
              const ok = Math.abs(actual - target) <= 0.5;
              return (
                <span key={name} className="flex items-center gap-1">
                  <span>{name}:</span>
                  <span
                    className={`font-semibold ${
                      ok ? 'text-emerald-700' : 'text-amber-700 font-bold'
                    }`}
                  >
                    {formatNumber(actual)}đ
                  </span>
                  <span className="text-slate-400">({formatNumber(target)}đ)</span>
                </span>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-slate-700">Theo mức độ:</span>
            {levelNames.map((name, i) => {
              const actual = sums.lv[i];
              const target = targetLevelPoints[i];
              const ok = Math.abs(actual - target) <= 0.5;
              return (
                <span key={name} className="flex items-center gap-1">
                  <span>{name}:</span>
                  <span
                    className={`font-semibold ${
                      ok ? 'text-emerald-700' : 'text-amber-700 font-bold'
                    }`}
                  >
                    {formatNumber(actual)}đ
                  </span>
                  <span className="text-slate-400">({formatNumber(target)}đ)</span>
                </span>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Đạt chuẩn khi chênh lệch không quá 0,5 điểm so với tỉ lệ quy định trong Phụ lục Công văn 7991/BGDĐT-GDTrH.
          </p>
        </div>
      )}
    </div>
  );
};
