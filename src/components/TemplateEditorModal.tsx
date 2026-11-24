import React, { useState, useEffect } from 'react';
import { SubjectName } from '../types';
import { CURRICULUM_DATA, DETAILED_SPECS } from '../constants/curriculumData';
import { X, Download, Copy, Sparkles, Check, FileText, ListChecks, Wand2, RefreshCw } from 'lucide-react';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mon: SubjectName;
  grade: string;
  ppctText: string;
  yccdText: string;
  onSavePpctAndYccd: (newPpct: string, newYccd: string) => void;
}

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  mon,
  grade,
  ppctText,
  yccdText,
  onSavePpctAndYccd,
}) => {
  const [activeTab, setActiveTab] = useState<'ppct' | 'yccd'>('ppct');
  const [editedPpct, setEditedPpct] = useState<string>('');
  const [editedYccd, setEditedYccd] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setEditedPpct(ppctText || '');
    setEditedYccd(yccdText || '');
  }, [ppctText, yccdText, isOpen]);

  if (!isOpen) return null;

  // Generate standard GDPT 2018 sample PPCT
  const handleLoadSamplePPCT = () => {
    const list = CURRICULUM_DATA[mon] && CURRICULUM_DATA[mon][grade];
    let sample = `PHÂN PHỐI CHƯƠNG TRÌNH MÔN ${mon.toUpperCase()} LỚP ${grade} - CHUẨN GDPT 2018\n\nSTT\tTuần\tTên Chương / Bài học (Nội dung)\tSố tiết\n`;

    if (list && Array.isArray(list)) {
      list.forEach((item: any, idx: number) => {
        const title = Array.isArray(item) ? item[0] : String(item);
        if (/chuyên\s*đề/i.test(title)) return;
        sample += `${idx + 1}\tTuần ${Math.floor(idx / 2) + 1}\t${title}\t2\n`;
      });
    } else {
      sample += `1\tTuần 1\tCHƯƠNG 1. KIẾN THỨC TRỌNG TÂM MÔN ${mon.toUpperCase()}\t\n`;
      sample += `2\tTuần 1\tBài 1. Khái niệm và tính chất cơ bản\t2\n`;
      sample += `3\tTuần 2\tBài 2. Phương pháp giải bài tập thực hành\t2\n`;
      sample += `4\tTuần 3\tCHƯƠNG 2. ỨNG DỤNG VÀ THỰC TIỄN\t\n`;
      sample += `5\tTuần 3\tBài 3. Ứng dụng thực tiễn và liên hệ\t2\n`;
    }

    setEditedPpct(sample);
    setStatusMsg(`Đã tải tệp mẫu PPCT chuẩn GDPT 2018 cho môn ${mon} lớp ${grade}`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Generate standard GDPT 2018 sample YCCĐ
  const handleLoadSampleYCCD = () => {
    const specs = DETAILED_SPECS[mon] && DETAILED_SPECS[mon][grade];
    let sample = `DANH MỤC YÊU CẦU CẦN ĐẠT MÔN ${mon.toUpperCase()} LỚP ${grade} - CHUẨN GDPT 2018\n\nSTT\tChủ đề / Đơn vị kiến thức (Bài học)\tYêu cầu cần đạt\n`;

    if (specs && Array.isArray(specs)) {
      specs.forEach((item: any, idx: number) => {
        if (!item || item.length < 4) return;
        const lessonName = item[0].split('\n')[0];
        const biet = item[1];
        const hieu = item[2];
        const vanDung = item[3];
        sample += `${idx + 1}\t${lessonName}\t- Nhận biết: ${biet}\n- Thông hiểu: ${hieu}\n- Vận dụng: ${vanDung}\n\n`;
      });
    } else {
      sample += `1\tBài 1. Khái niệm và tính chất cơ bản\t- Nhận biết: Nêu được khái niệm, định nghĩa cốt lõi của Bài 1.\n- Thông hiểu: Hiểu và giải thích được các tính chất, cơ chế trong Bài 1.\n- Vận dụng: Vận dụng được kiến thức Bài 1 để giải quyết bài tập, thực tiễn.\n\n`;
      sample += `2\tBài 2. Phương pháp giải bài tập thực hành\t- Nhận biết: Nêu được các bước giải bài tập Bài 2.\n- Thông hiểu: Phân tích, so sánh các trường hợp trong Bài 2.\n- Vận dụng: Vận dụng thành thạo phương pháp vào tình huống mới.\n\n`;
    }

    setEditedYccd(sample);
    setStatusMsg(`Đã tải tệp mẫu YCCĐ chuẩn GDPT 2018 cho môn ${mon} lớp ${grade}`);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Auto-format typed text to clean template
  const handleFormatTextToTemplate = (type: 'ppct' | 'yccd') => {
    if (type === 'ppct') {
      if (!editedPpct.trim()) {
        handleLoadSamplePPCT();
        return;
      }
      const rawLines = editedPpct.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let formatted = `PHÂN PHỐI CHƯƠNG TRÌNH MÔN ${mon.toUpperCase()} LỚP ${grade} (ĐÃ CHUẨN HÓA)\n\nSTT\tTuần\tTên Chương / Bài học\tSố tiết\n`;
      let count = 1;
      rawLines.forEach((line) => {
        if (/cộng\s*hòa|bộ\s*giáo\s*dục|sở\s*gd|phân\s*phối\s*chương\s*trình|stt\t/i.test(line)) return;
        const clean = line.replace(/^[+\*\-•\–\—]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
        if (/^(?:chương|chủ đề)\s*\d+/i.test(clean)) {
          formatted += `${count}\tTuần ${Math.ceil(count / 2)}\t${clean.toUpperCase()}\t\n`;
        } else if (/^bài\s*\d+/i.test(clean) || clean.length > 5) {
          const bàiTitle = /^bài\s*\d+/i.test(clean) ? clean : `Bài ${count}. ${clean}`;
          formatted += `${count}\tTuần ${Math.ceil(count / 2)}\t${bàiTitle}\t2\n`;
        }
        count++;
      });
      setEditedPpct(formatted);
      setStatusMsg('Đã chuẩn hóa định dạng văn bản PPCT theo mẫu chuẩn!');
    } else {
      if (!editedYccd.trim()) {
        handleLoadSampleYCCD();
        return;
      }
      const rawLines = editedYccd.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let formatted = `YÊU CẦU CẦN ĐẠT MÔN ${mon.toUpperCase()} LỚP ${grade} (ĐÃ CHUẨN HÓA)\n\nSTT\tChủ đề / Bài học\tYêu cầu cần đạt\n`;
      let count = 1;
      rawLines.forEach((line) => {
        if (/cộng\s*hòa|bộ\s*giáo\s*dục|yêu\s*cầu\s*cần\s*đạt|stt\t/i.test(line)) return;
        const clean = line.replace(/^[+\*\-•\–\—]\s*/, '').trim();
        if (/^bài\s*\d+/i.test(clean) || /^chương\s*\d+/i.test(clean)) {
          formatted += `\n${count}\t${clean}\t`;
          count++;
        } else if (clean.length > 5) {
          formatted += `${clean}\n`;
        }
      });
      setEditedYccd(formatted);
      setStatusMsg('Đã chuẩn hóa định dạng văn bản YCCĐ theo mẫu chuẩn!');
    }
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleDownloadFile = (type: 'ppct' | 'yccd') => {
    const text = type === 'ppct' ? editedPpct : editedYccd;
    const filename = type === 'ppct'
      ? `PPCT_Mau_${mon}_Lop${grade}.txt`
      : `YCCD_Mau_${mon}_Lop${grade}.txt`;

    const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyAndClose = () => {
    onSavePpctAndYccd(editedPpct, editedYccd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Chỉnh sửa & Chuẩn hóa PPCT / YCCĐ theo mẫu
              </h3>
              <p className="text-xs text-slate-500">
                Môn: <b>{mon}</b> · Khối: <b>{grade}</b> · Tự động điều chỉnh cấu trúc văn bản khớp 100% CV 7991
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-5 pt-2">
          <button
            onClick={() => setActiveTab('ppct')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'ppct'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-indigo-600" />
            1. Phân phối chương trình (PPCT)
          </button>

          <button
            onClick={() => setActiveTab('yccd')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition ${
              activeTab === 'yccd'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListChecks className="w-4 h-4 text-indigo-600" />
            2. Danh mục Yêu cầu cần đạt (YCCĐ)
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className="mx-5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            {statusMsg}
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'ppct' ? (
            <div className="space-y-3">
              {/* Action bar for PPCT */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSamplePPCT}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Nạp Mẫu PPCT chuẩn ({mon} {grade})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFormatTextToTemplate('ppct')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    Chuẩn hóa định dạng văn bản
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(editedPpct)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Sao chép
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile('ppct')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Tải file (.txt)
                  </button>
                </div>
              </div>

              {/* Textarea Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung Phân phối chương trình (Ghi từng bài/chương theo dòng):
                </label>
                <textarea
                  rows={14}
                  value={editedPpct}
                  onChange={(e) => setEditedPpct(e.target.value)}
                  placeholder={`Dán hoặc nhập nội dung PPCT tại đây...\nVí dụ:\nCHƯƠNG 1. CƠ HỌC\nBài 1. Chuyển động thẳng đều\nBài 2. Chuyển động biến đổi đều`}
                  className="w-full font-mono text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed shadow-xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Action bar for YCCD */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSampleYCCD}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Nạp Mẫu YCCĐ chuẩn ({mon} {grade})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFormatTextToTemplate('yccd')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                    Chuẩn hóa định dạng văn bản
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(editedYccd)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    Sao chép
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile('yccd')}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Tải file (.txt)
                  </button>
                </div>
              </div>

              {/* Textarea Editor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung Yêu cầu cần đạt (Tương ứng với tên bài học):
                </label>
                <textarea
                  rows={14}
                  value={editedYccd}
                  onChange={(e) => setEditedYccd(e.target.value)}
                  placeholder={`Dán hoặc nhập YCCĐ tại đây...\nVí dụ:\nBài 1. Khái niệm và tính chất\n- Nhận biết: Nêu được khái niệm...\n- Thông hiểu: Hiểu và giải thích được...\n- Vận dụng: Vận dụng được...`}
                  className="w-full font-mono text-xs text-slate-800 bg-white border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed shadow-xs"
                />
              </div>
            </div>
          )}

          {copyFeedback && (
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-lg text-center font-semibold">
              {copyFeedback}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-500 hidden sm:block">
            Khi bấm Cập nhật, hệ thống sẽ tự động trích xuất và đối chiếu trực tiếp lên Ma trận & Bản đặc tả.
          </p>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleApplyAndClose}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>🚀 Cập nhật Ma trận & Bản đặc tả từ PPCT/YCCĐ đã chỉnh</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
