import { FullAppState, SavedMatrixItem } from '../types';

const CURRENT_STATE_KEY = 'app_current_matrix_state';
const SAVED_LIST_KEY = 'app_saved_matrices_list';

export function loadAutoSavedState(): FullAppState | null {
  try {
    const raw = localStorage.getItem(CURRENT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FullAppState;
    if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load auto-saved state from localStorage:', err);
  }
  return null;
}

export function sanitizeStateForStorage(state: FullAppState): FullAppState {
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
    rows: JSON.parse(JSON.stringify(state.rows || [])),
    ppctData: undefined, // Do not store uploaded PPCT/YCCD in auto-saved state so reloads always start with clean file inputs
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
  const cleanState = sanitizeStateForStorage(state);

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
    title: title || `Ma trận ${state.mon} Lớp ${state.grade} - ${state.semester}`,
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
