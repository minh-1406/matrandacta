import React from 'react';
import { AiEngine, AiEngineConfig } from '../types';
import { Cpu, Brain, Zap, BookOpen, Sparkles, Check } from 'lucide-react';

interface AiEngineSelectorProps {
  config: AiEngineConfig;
  onChange: (newConfig: AiEngineConfig) => void;
  compact?: boolean;
}

export const AiEngineSelector: React.FC<AiEngineSelectorProps> = ({ config, onChange, compact = false }) => {
  const currentEngine = config.engine || 'hybrid';

  const engines: {
    id: AiEngine;
    name: string;
    subName: string;
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    bgColor: string;
    badge: string;
    description: string;
  }[] = [
    {
      id: 'hybrid',
      name: 'Tổng hợp Đa Trí Tuệ Nhân Tạo',
      subName: 'Claude Sonnet + ChatGPT + NotebookLM + Gemini',
      icon: <Sparkles className="w-4 h-4 text-amber-500" />,
      color: 'text-amber-700',
      borderColor: 'border-amber-300',
      bgColor: 'bg-gradient-to-r from-amber-50 via-indigo-50 to-purple-50',
      badge: 'Khuyên dùng (Độ chuẩn 100%)',
      description: 'Kết hợp tư duy sư phạm Claude Sonnet, chuẩn RAG SGK NotebookLM, văn phong mượt ChatGPT và tra cứu Gemini.',
    },
    {
      id: 'claude',
      name: 'Claude Sonnet 3.5 / 3.7 / 5.5',
      subName: 'Anthropic AI Education Engine',
      icon: <Brain className="w-4 h-4 text-purple-600" />,
      color: 'text-purple-700',
      borderColor: 'border-purple-300',
      bgColor: 'bg-purple-50/60',
      badge: 'Lập luận sư phạm chuyên sâu',
      description: 'Suy luận logic đa bước, bám sát Công văn 7991, phương án nhiễu sâu sắc, loại bỏ hoàn toàn nhận xét mập mờ.',
    },
    {
      id: 'chatgpt',
      name: 'ChatGPT (GPT-4o / GPT-4.5)',
      subName: 'OpenAI Education Engine',
      icon: <Zap className="w-4 h-4 text-emerald-600" />,
      color: 'text-emerald-700',
      borderColor: 'border-emerald-300',
      bgColor: 'bg-emerald-50/60',
      badge: 'Tốc độ & Văn phong mượt',
      description: 'Tạo đề nhanh vượt trội, diễn đạt văn phong tiếng Việt mượt mà, biến thể lựa chọn đa dạng.',
    },
    {
      id: 'notebooklm',
      name: 'NotebookLM - Grounded SGK 2026',
      subName: 'Google Knowledge Base RAG',
      icon: <BookOpen className="w-4 h-4 text-blue-600" />,
      color: 'text-blue-700',
      borderColor: 'border-blue-300',
      bgColor: 'bg-blue-50/60',
      badge: 'Chuẩn 100% SGK Kết nối',
      description: 'Chống ảo giác tuyệt đối, bám sát SGK Kết nối tri thức 2026. Hướng dẫn chấm ngắn gọn, cụ thể, loại bỏ tên chương/bài.',
    },
    {
      id: 'gemini',
      name: 'Google Gemini 2.5 / 3.8 / Argon',
      subName: 'Google Multimodal Engine',
      icon: <Cpu className="w-4 h-4 text-indigo-600" />,
      color: 'text-indigo-700',
      borderColor: 'border-indigo-300',
      bgColor: 'bg-indigo-50/60',
      badge: 'Đa mô thức & Search Grounded',
      description: 'Xử lý chính xác bảng số liệu, biểu đồ, tư liệu thực tế và tra cứu trực tuyến.',
    },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-slate-600 shrink-0 flex items-center gap-1">
          <Brain className="w-3.5 h-3.5 text-indigo-600" />
          <span>Mô hình AI:</span>
        </label>
        <select
          value={currentEngine}
          onChange={(e) => onChange({ ...config, engine: e.target.value as AiEngine })}
          className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition cursor-pointer"
        >
          {engines.map((eng) => (
            <option key={eng.id} value={eng.id}>
              {eng.name} ({eng.badge})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Cấu hình Trí tuệ Nhân tạo Biên soạn Đề (AI Engine Pipeline)
            </h4>
            <p className="text-[11px] text-slate-500">
              Chọn mô hình AI chuyên dụng hoặc chế độ Tổng hợp Đa Trí Tuệ Nhân Tạo (Claude + ChatGPT + NotebookLM + Gemini)
            </p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
          Chương trình GDPT 2018
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {engines.map((eng) => {
          const isSelected = currentEngine === eng.id;
          return (
            <button
              key={eng.id}
              type="button"
              onClick={() => onChange({ ...config, engine: eng.id })}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? `${eng.borderColor} ${eng.bgColor} ring-2 ring-indigo-500/30 shadow-2xs`
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-300'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
              <div className="flex items-start gap-2 mb-1.5 pr-5">
                <div className="shrink-0 mt-0.5">{eng.icon}</div>
                <div>
                  <div className={`text-xs font-bold ${eng.color}`}>{eng.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{eng.subName}</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug mb-2">{eng.description}</p>
              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {eng.badge}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={config.enableSgkGrounding ?? true}
            onChange={(e) => onChange({ ...config, enableSgkGrounding: e.target.checked })}
            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span>Bám sát 100% Sách giáo khoa Bộ Kết nối tri thức với cuộc sống (2026)</span>
        </label>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
          <input
            type="checkbox"
            checked={config.enablePedagogicalRefinement ?? true}
            onChange={(e) => onChange({ ...config, enablePedagogicalRefinement: e.target.checked })}
            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span>Tự động kiểm định ma trận & loại bỏ lỗi kí tự, lỗi chương/bài trong đáp án</span>
        </label>
      </div>
    </div>
  );
};
