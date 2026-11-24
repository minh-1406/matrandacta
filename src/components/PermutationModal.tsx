import React, { useState } from 'react';
import { GeneratedQuestion } from '../types';
import {
  Shuffle,
  X,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';

export type PermutationPartMode = 'both' | 'options_only' | 'questions_only' | 'none';

export interface PermutationConfig {
  baseSetIndex: number;
  count: number;
  action: 'append' | 'replace';
  partModes: {
    NLC: PermutationPartMode;
    DS: PermutationPartMode;
    TLN: PermutationPartMode;
    TL: PermutationPartMode;
  };
}

interface PermutationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sets: GeneratedQuestion[][];
  examCodes: string[];
  activeSetIndex: number;
  onGeneratePermutations: (config: PermutationConfig) => void;
}

export const PermutationModal: React.FC<PermutationModalProps> = ({
  isOpen,
  onClose,
  sets,
  examCodes,
  activeSetIndex,
  onGeneratePermutations,
}) => {
  const [baseSetIndex, setBaseSetIndex] = useState<number>(activeSetIndex >= 0 ? activeSetIndex : 0);
  const [count, setCount] = useState<number>(3);
  const [action, setAction] = useState<'append' | 'replace'>('append');

  // Per-part shuffle settings
  const [nlcMode, setNlcMode] = useState<PermutationPartMode>('both');
  const [dsMode, setDsMode] = useState<PermutationPartMode>('both');
  const [tlnMode, setTlnMode] = useState<PermutationPartMode>('questions_only');
  const [tlMode, setTlMode] = useState<PermutationPartMode>('none');

  if (!isOpen) return null;

  const handleRun = () => {
    onGeneratePermutations({
      baseSetIndex,
      count,
      action,
      partModes: {
        NLC: nlcMode,
        DS: dsMode,
        TLN: tlnMode,
        TL: tlMode,
      },
    });
    onClose();
  };

  const selectedBaseQuestions = sets[baseSetIndex] || sets[0] || [];
  const baseCode = examCodes[baseSetIndex] || `Đề ${baseSetIndex + 1}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto noprint">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white px-6 py-4 flex items-center justify-between border-b border-indigo-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Tạo Đề Hoán Vị Tự Động (Trộn Đề & Đảo Đáp Án)
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Khảo thí chuẩn
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Tự động sinh các đề hoán vị từ đề gốc với bảo toàn 100% đáp án đúng và ma trận câu hỏi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Choose Source Exam */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                1. Chọn đề thi gốc (Base Exam):
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                Gồm {selectedBaseQuestions.length} câu hỏi chuẩn
              </span>
            </label>
            <select
              value={baseSetIndex}
              onChange={(e) => setBaseSetIndex(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition cursor-pointer"
            >
              {sets.map((s, idx) => (
                <option key={idx} value={idx}>
                  Đề số {idx + 1} — Mã đề: {examCodes[idx] || (101 + idx)} ({s.length} câu)
                  {idx === activeSetIndex ? ' ★ (Đề đang chọn)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Section 2: Number of Permuted Sets */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                2. Số lượng đề hoán vị muốn tạo:
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 3, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCount(num)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      count === num
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-100'
                    }`}
                  >
                    +{num} đề
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="30"
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-center text-sm font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
              />
              <span className="text-xs text-indigo-900 font-medium">
                Hệ thống sẽ tạo <b>{count} mã đề hoán vị mới</b> dựa trên nội dung chuẩn của Mã đề <b>{baseCode}</b>.
              </span>
            </div>
          </div>

          {/* Section 3: Detailed Per-Part Permutation Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                3. Tùy chọn hoán vị chi tiết theo từng phần thi:
              </h4>
              <span className="text-[11px] text-slate-500">
                Lựa chọn quy tắc đảo vị trí câu & phương án
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Part I: NLC */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:border-indigo-300 transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    Phần I: Trắc nghiệm 4 lựa chọn (NLC)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      id: 'both',
                      label: '🔀 Xáo cả câu hỏi & đảo 4 vị trí đáp án A,B,C,D',
                      desc: '(Khuyên dùng - Cân bằng xác suất đáp án A,B,C,D)',
                    },
                    {
                      id: 'options_only',
                      label: '🔤 Chỉ đảo 4 vị trí đáp án A,B,C,D',
                      desc: '(Giữ nguyên thứ tự câu hỏi trong đề)',
                    },
                    {
                      id: 'questions_only',
                      label: '📋 Chỉ xáo thứ tự câu hỏi',
                      desc: '(Giữ nguyên vị trí các phương án A,B,C,D)',
                    },
                    {
                      id: 'none',
                      label: '🔒 Không xáo',
                      desc: '(Giữ nguyên 100% Phần I)',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        nlcMode === opt.id
                          ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-300/50 text-indigo-950 font-semibold'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nlcMode"
                        checked={nlcMode === opt.id}
                        onChange={() => setNlcMode(opt.id as PermutationPartMode)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10.5px] font-normal text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Part II: DS */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:border-emerald-300 transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Phần II: Câu hỏi Đúng / Sai (DS)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      id: 'both',
                      label: '🔀 Xáo cả câu hỏi & các ý a, b, c, d',
                      desc: '(Khuyên dùng - Đảm bảo tính phân hóa cao)',
                    },
                    {
                      id: 'options_only',
                      label: '🔤 Chỉ đảo vị trí 4 ý a, b, c, d',
                      desc: '(Cố định thứ tự các câu chính Phần II)',
                    },
                    {
                      id: 'questions_only',
                      label: '📋 Chỉ xáo thứ tự câu hỏi',
                      desc: '(Giữ nguyên thứ tự các ý a, b, c, d)',
                    },
                    {
                      id: 'none',
                      label: '🔒 Không xáo',
                      desc: '(Giữ nguyên 100% Phần II)',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        dsMode === opt.id
                          ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-300/50 text-emerald-950 font-semibold'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="dsMode"
                        checked={dsMode === opt.id}
                        onChange={() => setDsMode(opt.id as PermutationPartMode)}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10.5px] font-normal text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Part III: TLN */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:border-amber-300 transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Phần III: Câu hỏi Trả lời ngắn (TLN)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      id: 'questions_only',
                      label: '🔀 Xáo thứ tự câu hỏi Trả lời ngắn',
                      desc: '(Bảo toàn giá trị đáp án số duy nhất)',
                    },
                    {
                      id: 'none',
                      label: '🔒 Không xáo thứ tự câu',
                      desc: '(Giữ nguyên thứ tự câu Phần III)',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        tlnMode === opt.id
                          ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-300/50 text-amber-950 font-semibold'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tlnMode"
                        checked={tlnMode === opt.id}
                        onChange={() => setTlnMode(opt.id as PermutationPartMode)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10.5px] font-normal text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Part IV: TL */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:border-purple-300 transition shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                    Phần IV: Câu hỏi Tự luận (TL)
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {[
                    {
                      id: 'questions_only',
                      label: '🔀 Xáo thứ tự các câu Tự luận',
                      desc: '(Hoán vị vị trí các bài tự luận)',
                    },
                    {
                      id: 'none',
                      label: '🔒 Không xáo thứ tự câu Tự luận',
                      desc: '(Khuyên dùng - Giữ nguyên thứ tự tăng dần độ khó)',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        tlMode === opt.id
                          ? 'bg-purple-50/80 border-purple-400 ring-1 ring-purple-300/50 text-purple-950 font-semibold'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tlMode"
                        checked={tlMode === opt.id}
                        onChange={() => setTlMode(opt.id as PermutationPartMode)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <div>
                        <div>{opt.label}</div>
                        <div className="text-[10.5px] font-normal text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Action mode */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
            <label className="block font-bold text-slate-800 uppercase tracking-wide">
              4. Phương thức cập nhật danh sách đề:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  action === 'append'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-300/40 text-slate-900 font-bold shadow-2xs'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="permutationAction"
                  checked={action === 'append'}
                  onChange={() => setAction('append')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <div className="text-indigo-900">➕ Thêm mới vào danh sách đề hiện có</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Giữ các đề đã có ({sets.length} đề), tự tạo thêm {count} đề hoán vị nối tiếp
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  action === 'replace'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-300/40 text-slate-900 font-bold shadow-2xs'
                    : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="permutationAction"
                  checked={action === 'replace'}
                  onChange={() => setAction('replace')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <div className="text-indigo-900">🔄 Tạo lại trọn bộ đề (Gốc + Hoán vị)</div>
                  <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                    Đặt lại danh sách gồm 1 Đề gốc ({baseCode}) + {count} Đề hoán vị mới
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleRun}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>⚡ Tạo {count} Đề Hoán Vị Tự Động</span>
          </button>
        </div>
      </div>
    </div>
  );
};
