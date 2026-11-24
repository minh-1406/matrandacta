import {
  ExamHeaderConfig,
  ExamSemester,
  FullAppState,
  GeneratedQuestion,
  QuestionPointConfig,
  SavedExamItem,
  SavedMatrixItem,
  SubjectName,
} from '../types';
import { ensureValidYccd } from './matrixCalculations';
import { sanitizeAllQuestionsRecursively } from './questionChecker';
import { repairVietnameseFontEncoding } from './fileReader';

const CURRENT_STATE_KEY = 'app_current_matrix_state';
const SAVED_LIST_KEY = 'app_saved_matrices_list';
const SAVED_EXAMS_KEY = 'app_saved_exams_list';

export function loadAutoSavedState(): FullAppState | null {
  try {
    const raw = localStorage.getItem(CURRENT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FullAppState;
    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
      parsed.rows = parsed.rows.map((r) => ({
        ...r,
        c: repairVietnameseFontEncoding(r.c || ''),
        n: repairVietnameseFontEncoding(r.n || ''),
        s: (Array.isArray(r.s) && r.s.length === 3
          ? [
              repairVietnameseFontEncoding(r.s[0] || ''),
              repairVietnameseFontEncoding(r.s[1] || ''),
              repairVietnameseFontEncoding(r.s[2] || ''),
            ]
          : ['', '', '']) as [string, string, string],
      }));
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load auto-saved state from localStorage:', err);
  }
  return null;
}

export function sanitizeStateForStorage(state: FullAppState, preservePpctText: boolean = false): FullAppState {
  const cleanRows = (state.rows || []).map((r) => ({
    c: repairVietnameseFontEncoding(r.c || ''),
    n: repairVietnameseFontEncoding(r.n || ''),
    v: Array.isArray(r.v) && r.v.length === 12 ? [...r.v] : (Array.isArray(r.v) ? [...r.v, ...new Array(Math.max(0, 12 - r.v.length)).fill(0)] : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    y: Array.isArray(r.y) && r.y.length === 3 ? [...r.y] : [0, 0, 0],
    s: (Array.isArray(r.s) && r.s.length === 3
      ? [
          repairVietnameseFontEncoding(r.s[0] || ''),
          repairVietnameseFontEncoding(r.s[1] || ''),
          repairVietnameseFontEncoding(r.s[2] || ''),
        ]
      : ['', '', '']) as [string, string, string],
  }));

  return {
    mon: state.mon || 'Toán',
    grade: state.grade || '10',
    semester: state.semester || 'Giữa kì I',
    structureMode: state.structureMode || 'k',
    noTLN: !!state.noTLN,
    targetTotalScore: state.targetTotalScore || 10,
    targetFormatPoints: state.targetFormatPoints ? [...state.targetFormatPoints] : [3, 2, 2, 3],
    targetLevelPoints: state.targetLevelPoints ? [...state.targetLevelPoints] : [4, 3, 3],
    points: { ...state.points },
    rows: cleanRows,
    ppctData: (preservePpctText && state.ppctData)
      ? {
          text: (state.ppctData.text || '').slice(0, 80000),
          yccdText: (state.ppctData.yccdText || '').slice(0, 80000),
          base64: '',
          mimeType: state.ppctData.mimeType || 'text/plain',
          yccdBase64: '',
          yccdMimeType: state.ppctData.yccdMimeType || 'text/plain',
        }
      : undefined,
  };
}

function safeSaveMatricesList(list: SavedMatrixItem[]): void {
  try {
    localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('QuotaExceededError when saving matrices list, attempting cleanup...', err);
    try {
      // Step 1: Strip heavy ppctData from older items
      const stripped = list.map((item, index) => {
        if (index > 0 && item.state?.ppctData) {
          return {
            ...item,
            state: {
              ...item.state,
              ppctData: undefined,
            },
          };
        }
        return item;
      });
      localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(stripped));
    } catch (err2) {
      // Step 2: Keep top 10 items without ppctData
      try {
        const pruned = list.slice(0, 10).map((item) => ({
          ...item,
          state: {
            ...item.state,
            ppctData: undefined,
          },
        }));
        localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(pruned));
      } catch (err3) {
        console.error('Failed to save matrices list to localStorage:', err3);
      }
    }
  }
}

export function saveAutoSavedState(state: FullAppState): void {
  try {
    const clean = sanitizeStateForStorage(state);
    localStorage.setItem(CURRENT_STATE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.error('Failed to auto-save state to localStorage:', err);
  }
}

export function getSavedMatrices(): SavedMatrixItem[] {
  try {
    const raw = localStorage.getItem(SAVED_LIST_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedMatrixItem[];
    if (Array.isArray(list)) {
      return list.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
  } catch (err) {
    console.error('Failed to read saved matrices list from localStorage:', err);
  }
  return [];
}

export function saveMatrixItem(
  title: string,
  state: FullAppState,
  existingId?: string
): SavedMatrixItem {
  const list = getSavedMatrices();
  const now = new Date().toISOString();

  // Ensure valid YCCD on all rows before saving so specification table is 100% complete
  const rowsWithValidYccd = ensureValidYccd(
    state.rows || [],
    state.mon || 'Toán',
    state.grade || '10',
    state.ppctData,
    false
  );

  const cleanState = sanitizeStateForStorage({
    ...state,
    rows: rowsWithValidYccd,
  }, true);

  if (existingId) {
    const idx = list.findIndex((x) => x.id === existingId);
    if (idx >= 0) {
      const updated: SavedMatrixItem = {
        ...list[idx],
        title: title || list[idx].title,
        updatedAt: now,
        state: cleanState,
      };
      list[idx] = updated;
      safeSaveMatricesList(list);
      return updated;
    }
  }

  const newItem: SavedMatrixItem = {
    id: `matrix_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title || `Ma trận & Bản đặc tả ${state.mon} Lớp ${state.grade} - ${state.semester}`,
    createdAt: now,
    updatedAt: now,
    state: cleanState,
  };

  list.unshift(newItem);
  safeSaveMatricesList(list);
  return newItem;
}

export function deleteSavedMatrixItem(id: string): SavedMatrixItem[] {
  const list = getSavedMatrices().filter((x) => x.id !== id);
  localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(list));
  return list;
}

export function deleteAllSavedMatrices(): SavedMatrixItem[] {
  localStorage.setItem(SAVED_LIST_KEY, JSON.stringify([]));
  return [];
}

export function renameSavedMatrixItem(id: string, newTitle: string): SavedMatrixItem[] {
  const list = getSavedMatrices();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    list[idx].title = newTitle;
    list[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(list));
  }
  return list;
}

export function exportSavedMatricesJSON(): void {
  const list = getSavedMatrices();
  const dataStr = JSON.stringify(list, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Danh_Sach_Ma_Tran_Da_Luu_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function importSavedMatricesJSON(jsonText: string): SavedMatrixItem[] {
  try {
    const imported = JSON.parse(jsonText);
    const existing = getSavedMatrices();
    const existingMap = new Map(existing.map((x) => [x.id, x]));

    const itemsToProcess = Array.isArray(imported) ? imported : [imported];
    let addedCount = 0;

    for (const item of itemsToProcess) {
      if (item && item.state && Array.isArray(item.state.rows)) {
        const id = item.id || `imported_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        existingMap.set(id, {
          id,
          title: item.title || `Ma trận nhập (${item.state.mon || 'Môn'})`,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          state: item.state,
        });
        addedCount++;
      }
    }

    const newList = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    localStorage.setItem(SAVED_LIST_KEY, JSON.stringify(newList));
    return newList;
  } catch (err) {
    console.error('Failed to parse imported JSON file:', err);
    throw new Error('Định dạng tệp JSON không hợp lệ.');
  }
}

/* ==================== SAVED EXAMS UTILITIES ==================== */

export function getSavedExams(): SavedExamItem[] {
  try {
    const raw = localStorage.getItem(SAVED_EXAMS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedExamItem[];
    if (Array.isArray(list)) {
      return list
        .map((item) => ({
          ...item,
          questionsPerSource: Array.isArray(item.questionsPerSource)
            ? item.questionsPerSource.map((set) => sanitizeAllQuestionsRecursively(set))
            : [],
        }))
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  } catch (err) {
    console.error('Failed to read saved exams list from localStorage:', err);
  }
  return [];
}

export function saveExamItem(
  title: string,
  subject: SubjectName,
  grade: string,
  semester: ExamSemester,
  numSets: number,
  examCodes: string[],
  points: QuestionPointConfig,
  questionsPerSource: GeneratedQuestion[][],
  existingId?: string,
  headerConfig?: ExamHeaderConfig,
  customPrompt?: string
): SavedExamItem {
  const list = getSavedExams();
  const now = new Date().toISOString();

  if (existingId) {
    const idx = list.findIndex((x) => x.id === existingId);
    if (idx >= 0) {
      const updated: SavedExamItem = {
        ...list[idx],
        title: title || list[idx].title,
        subject,
        grade,
        semester,
        updatedAt: now,
        numSets,
        examCodes: [...examCodes],
        points: { ...points },
        questionsPerSource: JSON.parse(JSON.stringify(questionsPerSource)),
        headerConfig: headerConfig || list[idx].headerConfig,
        customPrompt: customPrompt ?? list[idx].customPrompt,
      };
      list[idx] = updated;
      localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(list));
      return updated;
    }
  }

  const newItem: SavedExamItem = {
    id: `exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: title || `Đề thi ${subject} ${grade} - ${semester} (${numSets} mã đề)`,
    subject,
    grade,
    semester,
    createdAt: now,
    updatedAt: now,
    numSets,
    examCodes: [...examCodes],
    points: { ...points },
    questionsPerSource: JSON.parse(JSON.stringify(questionsPerSource)),
    headerConfig,
    customPrompt,
  };

  list.unshift(newItem);
  try {
    localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Quota exceeded saving exam item, keeping latest 15 exams...', err);
    localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(list.slice(0, 15)));
  }
  return newItem;
}

export function deleteSavedExamItem(id: string): SavedExamItem[] {
  const list = getSavedExams().filter((x) => x.id !== id);
  localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(list));
  return list;
}

export function deleteAllSavedExams(): SavedExamItem[] {
  localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify([]));
  return [];
}

export function renameSavedExamItem(id: string, newTitle: string): SavedExamItem[] {
  const list = getSavedExams();
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) {
    list[idx].title = newTitle;
    list[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(list));
  }
  return list;
}

export function exportSavedExamsJSON(examId?: string): void {
  const list = getSavedExams();
  let exportData: any = list;
  let filename = `Thuvien_De_Thi_${new Date().toISOString().slice(0, 10)}.json`;

  if (examId) {
    const single = list.find((x) => x.id === examId);
    if (single) {
      exportData = single;
      filename = `De_Thi_${single.subject}_Lop${single.grade}_${single.title.replace(/\s+/g, '_')}.json`;
    }
  }

  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function importSavedExamsJSON(jsonText: string): SavedExamItem[] {
  try {
    const imported = JSON.parse(jsonText);
    const existing = getSavedExams();
    const existingMap = new Map(existing.map((x) => [x.id, x]));

    const itemsToProcess = Array.isArray(imported) ? imported : [imported];

    for (const item of itemsToProcess) {
      if (item && Array.isArray(item.questionsPerSource)) {
        const id = item.id || `imported_exam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        existingMap.set(id, {
          id,
          title: item.title || `Đề thi nhập (${item.subject || 'Môn'} Lớp ${item.grade || '10'})`,
          subject: item.subject || 'Lịch sử',
          grade: item.grade || '10',
          semester: item.semester || 'Giữa kì I',
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          numSets: item.numSets || item.questionsPerSource.length || 1,
          examCodes: item.examCodes || Array.from({ length: item.questionsPerSource.length || 1 }, (_, i) => String(101 + i)),
          points: item.points || { tn: 0.25, ds: 1, tln: 0.25, tl: 1 },
          questionsPerSource: item.questionsPerSource,
        });
      }
    }

    const newList = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(newList));
    return newList;
  } catch (err) {
    console.error('Failed to parse imported exam JSON file:', err);
    throw new Error('Định dạng tệp JSON đề thi không hợp lệ.');
  }
}

const CUSTOM_API_KEY = 'custom_gemini_api_key';

export function getStoredApiKey(): string {
  try {
    return (localStorage.getItem(CUSTOM_API_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(CUSTOM_API_KEY, key.trim());
    } else {
      localStorage.removeItem(CUSTOM_API_KEY);
    }
  } catch (err) {
    console.error('Failed to save API key to localStorage:', err);
  }
}

