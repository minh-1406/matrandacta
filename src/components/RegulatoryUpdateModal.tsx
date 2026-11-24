import React, { useState, useEffect } from 'react';
import { MoetRegulationDoc } from '../constants/moetRegulations';
import { GEOGRAPHY_EXAM_RULES, GENERAL_EXAM_RULES, ExamRuleItem } from '../constants/examRules';
import {
  deleteCustomRegulation,
  getStoredRegulations,
  saveCustomRegulation,
  searchAndFetchLatestMoetRegulations,
} from '../services/regulationService';
import {
  BookOpen,
  FileCheck,
  Search,
  Sparkles,
  Plus,
  Trash2,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wand2,
} from 'lucide-react';

interface RegulatoryUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegulatoryUpdateModal: React.FC<RegulatoryUpdateModalProps> = ({ isOpen, onClose }) => {
  const [modalTab, setModalTab] = useState<'docs' | 'rules_geo' | 'rules_general'>('rules_geo');
  const [ruleGroupFilter, setRuleGroupFilter] = useState<string>('all');
  const [regulations, setRegulations] = useState<MoetRegulationDoc[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // New custom regulation form state
  const [customCode, setCustomCode] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customIssuer, setCustomIssuer] = useState('Sở GD&ĐT / Trường THPT');
  const [customSummary, setCustomSummary] = useState('');
  const [customDirectives, setCustomDirectives] = useState('');

  useEffect(() => {
    if (isOpen) {
      setRegulations(getStoredRegulations());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLiveFetch = async () => {
    setIsSearching(true);
    setStatusMessage('Đang kết nối AI & Google Search để tra cứu các công văn/văn bản mới nhất từ Bộ GD&ĐT...');
    try {
      const updated = await searchAndFetchLatestMoetRegulations(searchQuery);
      setRegulations(updated);
      setStatusMessage('✨ Đã cập nhật thành công văn bản chỉ đạo khảo thí mới nhất từ Bộ GD&ĐT!');
    } catch (err: any) {
      setStatusMessage(`Lỗi khi tra cứu văn bản mới: ${err?.message || 'Không thể kết nối'}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCode.trim() || !customTitle.trim()) return;

    const newDoc: MoetRegulationDoc = {
      id: `custom-doc-${Date.now()}`,
      codeNumber: customCode.trim(),
      title: customTitle.trim(),
      issuedDate: new Date().toLocaleDateString('vi-VN'),
      issuer: customIssuer.trim() || 'Sở GD&ĐT',
      status: 'Mới cập nhật',
      summary: customSummary.trim() || 'Văn bản quy định chuyên môn kiểm tra đánh giá địa phương.',
      keyDirectives: customDirectives
        ? customDirectives.split('\n').filter((line) => line.trim().length > 0)
        : ['Áp dụng quy định kiểm tra đánh giá địa phương'],
      appliedInSystem: ['Hệ thống tự động ghi nhận và áp dụng vào bộ quy tắc kiểm định đề thi'],
      isCustom: true,
    };

    const updated = saveCustomRegulation(newDoc);
    setRegulations(updated);
    setShowAddCustom(false);
    setCustomCode('');
    setCustomTitle('');
    setCustomSummary('');
    setCustomDirectives('');
    setStatusMessage(`✨ Đã lưu thành công văn bản chỉ đạo "${newDoc.codeNumber}" vào hệ thống!`);
  };

  const handleDelete = (docId: string) => {
    const updated = deleteCustomRegulation(docId);
    setRegulations(updated);
    setStatusMessage('Đã xóa văn bản khỏi danh mục.');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-50 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white px-5 py-4 border-b border-indigo-800 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                Cơ sở Pháp lý & Khảo thí
              </span>
              <span className="bg-indigo-700/80 text-indigo-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/40">
                Bộ GD&ĐT / Cục Khảo thí
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              Trung tâm Cập nhật & Kiểm định Quy chuẩn Khảo thí Quốc gia
            </h2>
            <p className="text-xs text-slate-300">
              Cập nhật liên tục các Văn bản chỉ đạo, Công văn 7991, Quyết định 764 và quy định kiểm tra đánh giá mới nhất hiện hành.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUB-TAB NAVIGATION BAR */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setModalTab('rules_geo');
                setRuleGroupFilter('all');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                modalTab === 'rules_geo'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>📘 Bộ quy tắc môn Địa lí THPT (8 nhóm A–H)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalTab('rules_general');
                setRuleGroupFilter('all');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                modalTab === 'rules_general'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>📋 Bộ quy tắc chung các môn (8 nhóm A–H)</span>
            </button>

            <button
              type="button"
              onClick={() => setModalTab('docs')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                modalTab === 'docs'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Văn bản pháp quy (CV 7991, 8773, QĐ 764)</span>
            </button>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
            {modalTab === 'rules_geo' ? 'Áp dụng tự động khi chọn môn Địa lí' : modalTab === 'rules_general' ? 'Áp dụng cho tất cả các môn khác' : 'Cơ sở pháp lý ban hành'}
          </span>
        </div>

        {modalTab === 'docs' && (
          <>
            {/* SEARCH & ACTION TOOLBAR */}
            <div className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[280px] relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập từ khóa tìm văn bản mới (ví dụ: công văn kiểm tra đánh giá 2025, định dạng đề thi 2026...)"
                className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLiveFetch}
                disabled={isSearching}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                title="Sử dụng AI kết hợp Google Search để tự động tra cứu văn bản/công văn khảo thí mới nhất từ Bộ GD&ĐT"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                <span>{isSearching ? 'Đang tra cứu AI...' : '🔍 AI Tra cứu & Cập nhật văn bản mới'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>{showAddCustom ? 'Ẩn form nhập' : '➕ Thêm công văn địa phương'}</span>
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="text-xs text-indigo-800 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 flex items-center justify-between gap-2 font-medium animate-in fade-in">
              <span>{statusMessage}</span>
              <button
                type="button"
                onClick={() => setStatusMessage('')}
                className="text-indigo-400 hover:text-indigo-700 text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          )}

          {/* FORM TO ADD CUSTOM LOCAL DIRECTIVE */}
          {showAddCustom && (
            <form onSubmit={handleCreateCustom} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3 animate-in slide-in-from-top duration-200">
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Thêm Văn bản / Công văn Chỉ đạo kiểm tra của Sở GD&ĐT hoặc Nhà trường</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Số / Ký hiệu văn bản *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Công văn 1234/SGDĐT-GDTrH"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cơ quan ban hành:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Sở GD&ĐT Hà Nội / Tổ Chuyên môn"
                    value={customIssuer}
                    onChange={(e) => setCustomIssuer(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tên đầy đủ của Văn bản *:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hướng dẫn tổ chức kiểm tra định kỳ năm học 2025 - 2026"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nội dung tóm tắt cốt lõi:
                </label>
                <input
                  type="text"
                  placeholder="Mô tả tóm tắt các yêu cầu bắt buộc về cấu trúc, ma trận hoặc đặc tả..."
                  value={customSummary}
                  onChange={(e) => setCustomSummary(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Các chỉ thị bắt buộc (mỗi dòng 1 chỉ thị):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ:&#10;- Bắt buộc tỉ lệ nhận biết thông hiểu đạt 70%&#10;- Kiểm soát số câu đúng sai không lặp lại giữa các đề"
                  value={customDirectives}
                  onChange={(e) => setCustomDirectives(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                >
                  Lưu văn bản chỉ đạo
                </button>
              </div>
            </form>
          )}
        </div>

        {/* BODY LIST OF REGULATIONS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {regulations.map((doc) => (
              <div
                key={doc.id}
                className={`bg-white rounded-2xl p-4 border transition shadow-2xs hover:shadow-xs space-y-3 ${
                  doc.isCustom ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-indigo-100 text-indigo-950 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        {doc.codeNumber}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Ban hành: {doc.issuedDate} ({doc.issuer})
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/80">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {doc.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {doc.title}
                    </h3>
                  </div>

                  {doc.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      title="Xóa văn bản này"
                      className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                  <b>Tóm tắt chỉ đạo:</b> {doc.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="space-y-1.5 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <b className="text-indigo-900 uppercase text-[11px] tracking-wider block flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Yêu cầu chỉ đạo cốt lõi của Văn bản:
                    </b>
                    <ul className="space-y-1 text-slate-700 list-disc pl-4">
                      {doc.keyDirectives.map((dir, dIdx) => (
                        <li key={dIdx}>{dir}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <b className="text-emerald-900 uppercase text-[11px] tracking-wider block flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Thực thi tự động trong Hệ thống:
                    </b>
                    <ul className="space-y-1 text-slate-700 list-disc pl-4 font-medium">
                      {doc.appliedInSystem.map((app, aIdx) => (
                        <li key={aIdx}>{app}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {/* RULES BROWSER TAB FOR GEOGRAPHY OR GENERAL SUBJECTS */}
        {(modalTab === 'rules_geo' || modalTab === 'rules_general') && (() => {
          const isGeo = modalTab === 'rules_geo';
          const activeRules = isGeo ? GEOGRAPHY_EXAM_RULES : GENERAL_EXAM_RULES;

          const filteredRules = activeRules.filter((rule) => {
            const matchesGroup = ruleGroupFilter === 'all' || rule.groupId === ruleGroupFilter;
            const matchesQuery =
              !searchQuery.trim() ||
              rule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rule.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rule.groupTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
              rule.sourceDetail.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (rule.checkMethod && rule.checkMethod.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesGroup && matchesQuery;
          });

          const groups = [
            { id: 'all', label: 'Tất cả nhóm' },
            { id: 'A', label: 'A. Ma trận & Đặc tả' },
            { id: 'B', label: isGeo ? 'B. Câu hỏi & Diễn đạt' : 'B. 4 Lựa chọn (1 ĐA)' },
            { id: 'C', label: isGeo ? 'C. 4 Lựa chọn (1 ĐA)' : 'C. Đúng / Sai' },
            { id: 'D', label: isGeo ? 'D. Đúng / Sai' : 'D. Trả lời ngắn' },
            { id: 'E', label: isGeo ? 'E. Trả lời ngắn' : 'E. Tự luận' },
            { id: 'F', label: isGeo ? 'F. Số liệu & Biểu đồ' : 'F. Đặc thù' },
            { id: 'G', label: isGeo ? 'G. Tự luận & Chấm' : 'G. Chống SGK' },
            { id: 'H', label: 'H. Chống lộ đáp án' },
          ];

          return (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden">
              {/* FILTER & STATS BANNER */}
              <div className="p-3.5 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isGeo
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      }`}
                    >
                      {isGeo ? 'Chuyên biệt môn Địa lí THPT' : 'Áp dụng chung các môn học'}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      Tổng số: {activeRules.length} quy tắc cứng | Đang hiển thị: {filteredRules.length}
                    </span>
                  </div>

                  <div className="relative min-w-[240px]">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm mã (VD: C20, D7, E1) hoặc từ khóa quy tắc..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  </div>
                </div>

                {/* Automation notice */}
                <div
                  className={`text-[11px] p-2 rounded-lg border font-medium flex items-center justify-between ${
                    isGeo
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}
                >
                  <span>
                    ⚡ <b>Cơ chế tự động:</b>{' '}
                    {isGeo
                      ? 'Khi chọn môn Địa lí, hệ thống tự động nạp bộ quy tắc này vào Prompt của AI & Checker khảo thí để kiểm soát gắt gao Atlat, bảng số liệu, cấu trúc tỷ lệ %...'
                      : 'Khi chọn các môn khác (Toán, Văn, Sử, Sinh, Hóa, Lí, GDCD...), hệ thống tự động nạp bộ quy tắc chung này để bảo đảm tính chuẩn xác tuyệt đối.'}
                  </span>
                  <span className="shrink-0 font-bold ml-2">100% Cứng & Bắt buộc</span>
                </div>

                {/* GROUP FILTER BUTTONS */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {groups.map((grp) => {
                    const count =
                      grp.id === 'all'
                        ? activeRules.length
                        : activeRules.filter((r) => r.groupId === grp.id).length;
                    if (grp.id !== 'all' && count === 0) return null;
                    const isActive = ruleGroupFilter === grp.id;
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setRuleGroupFilter(grp.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {grp.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RULES LIST CONTAINER */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredRules.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm font-semibold">Không tìm thấy quy tắc phù hợp với bộ lọc hiện tại.</p>
                  </div>
                ) : (
                  filteredRules.map((rule) => {
                    const isStrictNotice =
                      rule.id === 'C20' ||
                      rule.id === 'F9' ||
                      rule.id === 'D7' ||
                      rule.id === 'E1' ||
                      rule.id === 'H1' ||
                      rule.id === 'G11';

                    const sourceBadgeClass =
                      rule.sourceType === 'VB'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : rule.sourceType === 'TH'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300';

                    return (
                      <div
                        key={rule.id}
                        className={`p-3.5 rounded-xl bg-white border transition shadow-xs ${
                          isStrictNotice
                            ? 'border-rose-300 bg-rose-50/20 ring-1 ring-rose-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs px-2.5 py-0.5 rounded-md bg-slate-900 text-white tracking-wider">
                              [{rule.id}]
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">{rule.groupTitle}</span>
                            {isStrictNotice && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white">
                                {rule.id === 'C20' || rule.id === 'F9'
                                  ? 'Cấm tuyệt đối Atlat'
                                  : rule.id === 'D7'
                                  ? 'Cấm 4/4 Đúng hoặc 4/4 Sai'
                                  : rule.id === 'E1'
                                  ? 'Tối đa 4 ký tự'
                                  : 'Trọng yếu'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sourceBadgeClass}`}
                            >
                              Nguồn: {rule.sourceType === 'VB' ? 'Văn bản Bộ' : rule.sourceType === 'TH' ? 'Tập huấn Bộ' : 'Kĩ thuật khảo thí'} ({rule.sourceDetail})
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Bắt buộc
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-900 leading-relaxed mb-2">
                          {rule.content}
                        </p>

                        {rule.checkMethod && (
                          <div className="text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700 flex items-start gap-1.5 font-medium">
                            <span className="font-bold text-slate-900 shrink-0">🔍 Cách kiểm tra:</span>
                            <span>{rule.checkMethod}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>
              Hệ thống tự động kiểm định 100% Ma trận, Đặc tả & Đề thi bám sát liên tục các quy định pháp quy mới nhất của Bộ GD&ĐT.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng Trung tâm Quy chuẩn
          </button>
        </div>
      </div>
    </div>
  );
};
