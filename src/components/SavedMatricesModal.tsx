import React, { useState, useRef, useEffect } from 'react';
import { SavedMatrixItem, FullAppState } from '../types';
import {
  saveMatrixItem,
  getSavedMatrices,
  deleteSavedMatrixItem,
  deleteAllSavedMatrices,
  renameSavedMatrixItem,
  exportSavedMatricesJSON,
  importSavedMatricesJSON,
} from '../utils/storageUtils';
import {
  FolderOpen,
  Save,
  Trash2,
  Edit3,
  Download,
  Upload,
  X,
  Check,
  Plus,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  Copy,
  Cloud,
} from 'lucide-react';
import {
  auth,
  fetchCloudSavedMatrices,
  syncSavedMatrixToCloud,
  deleteCloudSavedMatrix,
  deleteAllCloudSavedMatrices,
} from '../services/firebaseService';

interface SavedMatricesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: FullAppState;
  onLoadState: (state: FullAppState, title: string) => void;
  onShowMessage: (msg: string) => void;
}

export const SavedMatricesModal: React.FC<SavedMatricesModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onLoadState,
  onShowMessage,
}) => {
  const [savedList, setSavedList] = useState<SavedMatrixItem[]>(() => getSavedMatrices());
  const [saveTitleInput, setSaveTitleInput] = useState<string>(
    `Ma trận & Bản đặc tả ${currentState.mon} lớp ${currentState.grade} - ${currentState.semester}`
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deletedAllSessionRef = useRef<boolean>(false);

  // Always refresh the list when modal opens or state changes
  useEffect(() => {
    if (isOpen) {
      deletedAllSessionRef.current = false;
      setSavedList(getSavedMatrices());
      setSaveTitleInput(
        `Ma trận & Bản đặc tả ${currentState.mon} lớp ${currentState.grade} - ${currentState.semester}`
      );
      setSearchFilter('');
      setEditingId(null);
      setModalNotice(null);

      // If user is logged into Google, automatically retrieve saved matrices from other devices
      const user = auth.currentUser;
      if (user && !user.isAnonymous) {
        fetchCloudSavedMatrices(user.uid)
          .then((cloudItems) => {
            if (deletedAllSessionRef.current) return;
            if (cloudItems && cloudItems.length > 0) {
              const currentLocal = getSavedMatrices();
              const mergedMap = new Map<string, SavedMatrixItem>();
              currentLocal.forEach((it) => mergedMap.set(it.id, it));
              let hasNewFromCloud = false;
              cloudItems.forEach((c) => {
                if (c?.id && !mergedMap.has(c.id)) {
                  mergedMap.set(c.id, c);
                  hasNewFromCloud = true;
                }
              });
              if (hasNewFromCloud) {
                const mergedList = Array.from(mergedMap.values()).sort(
                  (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                );
                localStorage.setItem('app_saved_matrices_list', JSON.stringify(mergedList));
                setSavedList(mergedList);
              }
            }
          })
          .catch((e) => console.warn('Could not sync cloud saved matrices:', e));
      }
    }
  }, [isOpen, currentState.mon, currentState.grade, currentState.semester]);

  const refreshList = () => {
    setSavedList(getSavedMatrices());
  };

  if (!isOpen) return null;

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    deletedAllSessionRef.current = false;
    const title = saveTitleInput.trim() || `Ma trận ${currentState.mon} Lớp ${currentState.grade}`;
    const item = saveMatrixItem(title, currentState);
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      syncSavedMatrixToCloud(item, user);
    }
    refreshList();
    setModalNotice(`✓ Đã lưu thành công ma trận "${title}"!`);
    onShowMessage(`Đã lưu thành công ma trận "${title}"!`);
  };

  const handleLoad = (item: SavedMatrixItem) => {
    onLoadState(item.state, item.title);
    onShowMessage(`Đã tải ma trận: "${item.title}"`);
    onClose();
  };

  const handleDelete = (id: string, title: string) => {
    const updated = deleteSavedMatrixItem(id);
    setSavedList(updated);
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      deleteCloudSavedMatrix(user.uid, id);
    }
    setModalNotice(`✓ Đã xóa ma trận "${title}" khỏi danh sách.`);
    onShowMessage(`Đã xóa thành công ma trận "${title}" khỏi danh sách!`);
  };

  const handleDeleteAll = async () => {
    deletedAllSessionRef.current = true;
    const updated = deleteAllSavedMatrices();
    setSavedList(updated);
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      await deleteAllCloudSavedMatrices(user.uid);
    }
    setModalNotice('✓ Đã xóa toàn bộ tất cả các phiên bản ma trận & bản đặc tả đã lưu!');
    onShowMessage('Đã xóa toàn bộ tất cả ma trận trong thư viện đã lưu!');
  };

  const handleStartRename = (item: SavedMatrixItem) => {
    setEditingId(item.id);
    setEditTitleInput(item.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitleInput.trim()) {
      const updated = renameSavedMatrixItem(id, editTitleInput.trim());
      setSavedList(updated);
      onShowMessage('Đã đổi tên ma trận.');
    }
    setEditingId(null);
  };

  const handleDuplicate = (item: SavedMatrixItem) => {
    const dupTitle = `${item.title} (Bản sao)`;
    saveMatrixItem(dupTitle, item.state);
    refreshList();
    onShowMessage(`Đã tạo bản sao: "${dupTitle}"`);
  };

  const handleExportJSON = () => {
    exportSavedMatricesJSON();
    onShowMessage('Đã tải tệp sao lưu JSON danh sách ma trận.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const newList = importSavedMatricesJSON(text);
        setSavedList(newList);
        onShowMessage(`Đã nhập thành công ${newList.length} ma trận từ tệp JSON!`);
      } catch (err: any) {
        onShowMessage(`Lỗi nhập tệp: ${err.message || 'Tệp không hợp lệ'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredList = savedList.filter((item) => {
    if (!item) return false;
    const q = (searchFilter || '').toLowerCase().trim();
    if (!q) return true;
    const titleMatch = (item.title || '').toLowerCase().includes(q);
    const monMatch = item.state?.mon ? item.state.mon.toLowerCase().includes(q) : false;
    const gradeMatch = item.state?.grade ? String(item.state.grade).toLowerCase().includes(q) : false;
    const semesterMatch = item.state?.semester ? item.state.semester.toLowerCase().includes(q) : false;
    return titleMatch || monMatch || gradeMatch || semesterMatch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Thư viện Ma trận & Bản đặc tả (kèm YCCĐ) đã lưu
              </h3>
              <p className="text-xs text-slate-500">
                Quản lý, mở lại hoặc sao lưu các bản Ma trận và Bản đặc tả kèm YCCĐ chi tiết
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current Form Bar */}
        <div className="p-4 bg-indigo-50/60 border-b border-indigo-100">
          <form onSubmit={handleSaveCurrent} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1 relative">
              <input
                type="text"
                value={saveTitleInput}
                onChange={(e) => setSaveTitleInput(e.target.value)}
                placeholder="Đặt tên cho ma trận và bản đặc tả hiện tại..."
                className="w-full text-xs sm:text-sm font-medium px-3.5 py-2.5 bg-white border border-indigo-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Lưu Ma trận & Bản đặc tả
            </button>
          </form>
        </div>

        {/* Toolbar: Search + Backup/Import */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-white">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="🔍 Tìm theo môn, lớp, tên..."
            className="text-xs px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {savedList.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition active:scale-95 cursor-pointer"
                title="Xóa toàn bộ danh sách ma trận đã lưu"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa tất cả
              </button>
            )}

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={savedList.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              title="Tải về tệp JSON chứa toàn bộ ma trận đã lưu"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Sao lưu JSON
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              title="Nhập danh sách ma trận từ tệp JSON sao lưu"
            >
              <Upload className="w-3.5 h-3.5 text-teal-600" />
              Nhập JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Saved List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {modalNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
              <span>{modalNotice}</span>
              <button
                type="button"
                onClick={() => setModalNotice(null)}
                className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <FolderOpen className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
              <p className="text-sm font-medium">
                {savedList.length === 0
                  ? 'Chưa có ma trận nào được lưu. Nhập tên và bấm "Lưu ma trận hiện tại" ở trên để lưu lại!'
                  : 'Không tìm thấy ma trận phù hợp với từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const formattedDate = new Date(item.updatedAt).toLocaleString('vi-VN', {
                dateStyle: 'short',
                timeStyle: 'short',
              });

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Title or Edit Input */}
                    {editingId === item.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          className="text-sm font-bold text-slate-800 border border-indigo-400 rounded-lg px-2.5 py-1 w-full focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(item.id)}
                          className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-sm font-bold text-slate-800 truncate" title={item.title}>
                        {item.title}
                      </h4>
                    )}

                    {/* Meta badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        <BookOpen className="w-3 h-3" />
                        {item.state.mon} - Lớp {item.state.grade}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {item.state.semester}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {item.state.rows?.length || 0} bài học
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md ${
                          item.state.rows?.some((r) => r.s && (r.s[0] || r.s[1] || r.s[2]))
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.state.rows?.some((r) => r.s && (r.s[0] || r.s[1] || r.s[2]))
                          ? '✓ Kèm YCCĐ'
                          : 'Chưa có YCCĐ'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3" />
                        Lưu: {formattedDate}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    <button
                      onClick={() => handleLoad(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-95 shadow-sm cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Mở Ma trận & Bản đặc tả
                    </button>

                    <button
                      onClick={() => handleDuplicate(item)}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                      title="Nhân bản"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleStartRename(item)}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition"
                      title="Đổi tên"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="inline-flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition text-xs font-semibold"
                      title="Xóa ma trận này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xóa</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500">
          <span>Dữ liệu được lưu trữ an toàn trong bộ nhớ trình duyệt máy tính của bạn.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
