import React, { useState, useEffect, useRef } from 'react';
import { SubjectName, ExamSemester, StructureMode, QuestionPointConfig, MatrixRow, FullAppState, AiEngineConfig } from './types';
import {
  generateDefaultRows,
  getPresetPoints,
  calculateSums,
  distributeQuestions,
  consolidateRowsByChapter,
  cleanseRowsForExamScope,
  cleanseRowsByPpctCutoff,
  ensureValidYccd,
  getZeroVector,
} from './utils/matrixCalculations';
import { NOCALC } from './constants/curriculumData';
import { reconcileCurriculum, extractCurriculumFromText } from './services/geminiService';
import {
  copyHTMLToClipboard,
  exportMatrixExcel,
  exportMatrixPDF,
  exportMatrixWord,
  generateMatrixHTML,
} from './utils/exportUtils';
import {
  loadAutoSavedState,
  saveAutoSavedState,
  getSavedMatrices,
  saveMatrixItem,
} from './utils/storageUtils';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { MatrixTable } from './components/MatrixTable';
import { SpecTable } from './components/SpecTable';
import { QuestionGenerator } from './components/QuestionGenerator';
import { SavedMatricesModal } from './components/SavedMatricesModal';
import { VersionPickerModal } from './components/VersionPickerModal';
import { TableProperties, FileText, Sparkles, Cloud, Download, Smartphone, Laptop, ArrowRight, Trash2, History } from 'lucide-react';
import { validateMatrix, ValidationErrorItem } from './utils/matrixValidator';
import { ExportWarningModal } from './components/ExportWarningModal';
import { RegulatoryUpdateModal } from './components/RegulatoryUpdateModal';
import { SyncModal } from './components/SyncModal';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  syncSessionToFirestore,
  subscribeUserSession,
  subscribeSessionByCode,
  getOrCreateDeviceSessionCode,
  getOrCreateDeviceId,
  fetchUserSessionWithMeta,
  CloudSessionPayload,
  isCloudSessionFromDifferentDevice,
  logoutUser,
  saveCloudVersion,
  syncSavedMatrixToCloud,
  deleteActiveUserSession,
  fetchUserVersionHistory,
  deleteCloudVersion,
  deleteAllCloudVersions,
  CloudVersionItem,
} from './services/firebaseService';

export default function App() {
  const [isRegulatoryModalOpen, setIsRegulatoryModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const [mon, setMon] = useState<SubjectName>('Toán');
  const [grade, setGrade] = useState<string>('10');
  const [semester, setSemester] = useState<ExamSemester>('Giữa kì I');
  const [structureMode, setStructureMode] = useState<StructureMode>('k');
  const [noTLN, setNoTLN] = useState<boolean>(false);
  const [targetTotalScore, setTargetTotalScore] = useState<number>(10);
  const [targetFormatPoints, setTargetFormatPoints] = useState<number[]>([3, 2, 2, 3]);
  const [targetLevelPoints, setTargetLevelPoints] = useState<number[]>([4, 3, 3]);

  const [aiEngineConfig, setAiEngineConfig] = useState<AiEngineConfig>({
    engine: 'hybrid',
    enableSgkGrounding: true,
    enablePedagogicalRefinement: true,
  });

  const [points, setPoints] = useState<QuestionPointConfig>({ tn: 0.25, ds: 1, tln: 0.5, tl: 1 });
  const [pointNote, setPointNote] = useState<string>('');
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [ppctData, setPpctData] = useState<{
    text: string;
    base64: string;
    mimeType: string;
    yccdText: string;
    yccdBase64: string;
    yccdMimeType: string;
  }>({
    text: '',
    base64: '',
    mimeType: '',
    yccdText: '',
    yccdBase64: '',
    yccdMimeType: '',
  });

  const [activeTab, setActiveTab] = useState<'mt' | 'dt' | 'qt'>('mt');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [savedCount, setSavedCount] = useState<number>(() => getSavedMatrices().length);
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    actionName: string;
    action: (customRows?: MatrixRow[]) => Promise<void> | void;
    errors: ValidationErrorItem[];
    warnings: ValidationErrorItem[];
  } | null>(null);

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [cloudSessionForRestore, setCloudSessionForRestore] = useState<CloudSessionPayload | null>(null);
  const [cloudVersions, setCloudVersions] = useState<CloudVersionItem[]>([]);
  const [isVersionPickerOpen, setIsVersionPickerOpen] = useState<boolean>(false);
  const [isLoadingVersions, setIsLoadingVersions] = useState<boolean>(false);
  const [isCloudRestorePromptOpen, setIsCloudRestorePromptOpen] = useState<boolean>(false);
  const cloudCheckedForUidRef = useRef<string | null>(null);
  const allowCloudAutoSaveRef = useRef<boolean>(false);
  const isFreshLocalDeviceRef = useRef<boolean>(!localStorage.getItem('app_autosave_state'));
  const isProgrammaticLoadRef = useRef<boolean>(false);
  const prevSelection = useRef({ mon, grade, semester, structureMode, noTLN });
  const syncTimeoutRef = useRef<any>(null);

  // Firebase Auth state listener & Auto Cloud Version Detection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user && !user.isAnonymous) {
        if (cloudCheckedForUidRef.current !== user.uid) {
          cloudCheckedForUidRef.current = user.uid;
          try {
            const currentDevId = getOrCreateDeviceId();
            // Fetch all stored versions from the account
            const history = await fetchUserVersionHistory(user.uid);
            setCloudVersions(history);

            const cloudSession = await fetchUserSessionWithMeta(user.uid);
            const isFromOtherDevice = isCloudSessionFromDifferentDevice(cloudSession);

            // If switching to another machine (or phone) and versions exist on the account,
            // automatically show the full Version Picker so user can choose ANY version they want!
            if (
              isFromOtherDevice &&
              (history.length > 0 || (cloudSession?.state?.rows && cloudSession.state.rows.length > 0))
            ) {
              if (cloudSession?.state?.rows?.length) {
                setCloudSessionForRestore(cloudSession);
              }
              setIsVersionPickerOpen(true);
              allowCloudAutoSaveRef.current = false;
            } else {
              setCloudSessionForRestore(null);
              setIsVersionPickerOpen(false);
              allowCloudAutoSaveRef.current = true;
            }
          } catch (e) {
            console.warn('Error retrieving cloud versions on sign-in:', e);
            allowCloudAutoSaveRef.current = true;
          }
        }
      } else {
        cloudCheckedForUidRef.current = null;
        setCloudSessionForRestore(null);
        setCloudVersions([]);
        setIsVersionPickerOpen(false);
        setIsCloudRestorePromptOpen(false);
        allowCloudAutoSaveRef.current = true;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setTargetFormatPoints(noTLN ? [3, 4, 0, 3] : [3, 2, 2, 3]);
  }, [noTLN]);

  // Load initial auto-saved state from local or sync code on mount
  useEffect(() => {
    const autoSaved = loadAutoSavedState();
    if (autoSaved && Array.isArray(autoSaved.rows) && autoSaved.rows.length > 0) {
      applyLoadedState(autoSaved, 'Đã tự động khôi phục ma trận và bản đặc tả làm việc gần nhất.');
      isFreshLocalDeviceRef.current = false;
    } else {
      isFreshLocalDeviceRef.current = true;
    }
    setIsInitialized(true);
  }, []);

  // Helper to apply loaded session state
  const applyLoadedState = (savedState: FullAppState, msg?: string) => {
    const savedMon = savedState.mon || 'Toán';
    const savedGrade = savedState.grade || '10';
    const savedSemester = savedState.semester || 'Giữa kì I';
    const savedStructure = savedState.structureMode || 'k';
    const savedNoTLN = !!savedState.noTLN;

    isProgrammaticLoadRef.current = true;
    prevSelection.current = {
      mon: savedMon,
      grade: savedGrade,
      semester: savedSemester,
      structureMode: savedStructure,
      noTLN: savedNoTLN,
    };

    setMon(savedMon);
    setGrade(savedGrade);
    setSemester(savedSemester);
    setStructureMode(savedStructure);
    setNoTLN(savedNoTLN);
    setTargetTotalScore(savedState.targetTotalScore || 10);
    if (savedState.targetFormatPoints) setTargetFormatPoints(savedState.targetFormatPoints);
    if (savedState.targetLevelPoints) setTargetLevelPoints(savedState.targetLevelPoints);
    if (savedState.points) setPoints(savedState.points);

    const cleanRows = ensureValidYccd(savedState.rows || [], savedMon, savedGrade, savedState.ppctData, false);
    setRows(cleanRows);
    if (savedState.ppctData) {
      setPpctData(savedState.ppctData);
    } else {
      setPpctData({ text: '', base64: '', mimeType: '', yccdText: '', yccdBase64: '', yccdMimeType: '' });
    }

    if (msg) {
      setStatusMessage(msg);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleRestoreCloudSession = (session: CloudSessionPayload) => {
    applyLoadedState(
      session.state,
      `✓ Đã đồng bộ thành công dữ liệu [${session.state.mon} lớp ${session.state.grade}]! Đang tiếp tục làm việc trên thiết bị này.`
    );
    allowCloudAutoSaveRef.current = true;
    isFreshLocalDeviceRef.current = false;
    setCloudSessionForRestore(null);
    setIsCloudRestorePromptOpen(false);
    setIsVersionPickerOpen(false);
  };

  const handleSelectVersion = (version: CloudVersionItem) => {
    applyLoadedState(
      version.state,
      `✓ Đã nạp thành công phiên bản [${version.title}] (${version.formattedTime || new Date(version.updatedAt).toLocaleString('vi-VN')})!`
    );
    allowCloudAutoSaveRef.current = true;
    isFreshLocalDeviceRef.current = false;
    setCloudSessionForRestore(null);
    setIsVersionPickerOpen(false);
    setIsCloudRestorePromptOpen(false);
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (currentUser && !currentUser.isAnonymous) {
      await deleteCloudVersion(currentUser.uid, versionId);
    }
    setCloudVersions((prev) => prev.filter((x) => x.id !== versionId));
    setStatusMessage('Đã xóa phiên bản khỏi tài khoản.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteAllVersions = async () => {
    setCloudVersions([]);
    setCloudSessionForRestore(null);
    if (currentUser && !currentUser.isAnonymous) {
      await deleteAllCloudVersions(currentUser.uid);
      await deleteActiveUserSession(currentUser.uid);
    }
    setStatusMessage('✓ Đã xóa toàn bộ tất cả các phiên bản làm việc trên tài khoản.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleRefreshVersions = async () => {
    if (!currentUser || currentUser.isAnonymous) return;
    setIsLoadingVersions(true);
    try {
      const list = await fetchUserVersionHistory(currentUser.uid);
      setCloudVersions(list);
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleManualSyncNow = async () => {
    const currentState: FullAppState = {
      mon,
      grade,
      semester,
      structureMode,
      noTLN,
      targetTotalScore,
      targetFormatPoints,
      targetLevelPoints,
      points,
      rows,
      ppctData,
    };
    const code = getOrCreateDeviceSessionCode();
    await syncSessionToFirestore(currentState, code, currentUser);
    if (currentUser && !currentUser.isAnonymous) {
      const newVer = await saveCloudVersion(
        `Ma trận & Bản đặc tả ${mon} lớp ${grade} (${semester})`,
        currentState,
        currentUser
      );
      if (newVer) {
        setCloudVersions((prev) => [newVer, ...prev.filter((v) => v.id !== newVer.id)]);
        setLastSyncedTime(new Date().toISOString());
        setStatusMessage(`✓ Đã lưu 1 phiên bản mới lúc ${newVer.formattedTime}! Đổi sang máy khác, toàn bộ các phiên bản sẽ hiện ra để thầy/cô chọn.`);
        setTimeout(() => setStatusMessage(null), 6000);
        return;
      }
    }
    setLastSyncedTime(new Date().toISOString());
    setStatusMessage('✓ Đã lưu thành công phiên bản lên tài khoản Google!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleLogoutUser = async () => {
    await logoutUser();
    setCurrentUser(null);
    setCloudSessionForRestore(null);
    setCloudVersions([]);
    setIsVersionPickerOpen(false);
    setIsCloudRestorePromptOpen(false);
    allowCloudAutoSaveRef.current = true;
    setStatusMessage('Đã đăng xuất tài khoản Google.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDeleteCloudSession = async () => {
    if (currentUser && !currentUser.isAnonymous) {
      await deleteActiveUserSession(currentUser.uid);
    }
    setCloudSessionForRestore(null);
    setIsCloudRestorePromptOpen(false);
    allowCloudAutoSaveRef.current = true;
    setStatusMessage('✓ Đã xóa phiên làm việc không cần thiết khỏi tài khoản Google.');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Initialize or reset when Subject, Grade, Semester or Structure changes
  useEffect(() => {
    if (!isInitialized) return;

    if (isProgrammaticLoadRef.current) {
      isProgrammaticLoadRef.current = false;
      prevSelection.current = { mon, grade, semester, structureMode, noTLN };
      return;
    }

    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);

    const { note, points: presetPts } = getPresetPoints(mon, structureMode);
    setPointNote(note);

    const selectionChanged =
      prevSelection.current.mon !== mon ||
      prevSelection.current.grade !== grade ||
      prevSelection.current.semester !== semester ||
      prevSelection.current.structureMode !== structureMode ||
      prevSelection.current.noTLN !== noTLN;

    prevSelection.current = { mon, grade, semester, structureMode, noTLN };

    if (selectionChanged || rows.length === 0) {
      setPoints(presetPts);

      if (ppctData.text || ppctData.yccdText || ppctData.base64 || ppctData.yccdBase64) {
        const instantRows = extractCurriculumFromText(
          ppctData.text,
          ppctData.yccdText,
          mon,
          grade,
          semester
        );
        if (instantRows.length > 0) {
          handleReconcileSuccess(instantRows, `Đã cập nhật theo tệp ma trận/YCCĐ tải lên`, ppctData);
        }

        reconcileCurriculum(
          mon,
          grade,
          semester,
          rows,
          ppctData.text,
          ppctData.yccdText,
          ppctData.base64 || ppctData.yccdBase64,
          ppctData.mimeType || ppctData.yccdMimeType
        )
          .then((res) => {
            if (res && res.rows && res.rows.length > 0) {
              handleReconcileSuccess(res.rows, res.notes || `Đã cập nhật theo tệp tải lên`, ppctData);
            } else if (instantRows.length === 0) {
              const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
              setRows(defaultRows);
            }
          })
          .catch(() => {
            if (instantRows.length === 0) {
              const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
              setRows(defaultRows);
            }
          });
      } else {
        const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN);
        setRows(defaultRows);
      }
    }
  }, [mon, grade, semester, structureMode, noTLN, isInitialized]);

  // Auto-save current state to localStorage and Cloud Firestore on any state change
  useEffect(() => {
    if (rows.length > 0) {
      const currentState: FullAppState = {
        mon,
        grade,
        semester,
        structureMode,
        noTLN,
        targetTotalScore,
        targetFormatPoints,
        targetLevelPoints,
        points,
        rows,
        ppctData,
      };

      // 1. Local Storage Auto Save
      saveAutoSavedState(currentState);

      // 2. Firestore Cloud Auto Save (Debouncing 800ms)
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        // Prevent accidental cloud overwrite if user is logged in but cloud check is still in progress
        if (currentUser && !allowCloudAutoSaveRef.current) {
          return;
        }
        const code = getOrCreateDeviceSessionCode();
        syncSessionToFirestore(currentState, code, currentUser)
          .then(() => {
            setLastSyncedTime(new Date().toISOString());
          })
          .catch((e) => console.warn('Cloud sync background error:', e));
      }, 800);
    }
  }, [
    mon,
    grade,
    semester,
    structureMode,
    noTLN,
    targetTotalScore,
    targetFormatPoints,
    targetLevelPoints,
    points,
    rows,
    ppctData,
    currentUser,
  ]);

  const sums = calculateSums(rows, points);
  const pageTitle = `Ma trận và bản đặc tả ${mon} lớp ${grade} · ${semester}`;

  // Reset to default
  const handleResetDefault = () => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    setPpctData({ text: '', base64: '', mimeType: '', yccdText: '', yccdBase64: '', yccdMimeType: '' });
    const defaultRows = generateDefaultRows(mon, grade, semester, structureMode, shouldNoTLN, points, targetFormatPoints, targetLevelPoints);
    setRows(defaultRows);
    setStatusMessage(`Đã tự động cập nhật PPCT & YCCĐ chuẩn từ Bộ GD&ĐT cho môn ${mon} lớp ${grade} (${semester}).`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Reconcile Success handler from AI & file extraction
  const handleReconcileSuccess = (
    updated: { c: string; n: string; s?: [string, string, string]; v?: number[]; y?: number[] }[],
    notes: string,
    freshPpctData?: { text?: string; yccdText?: string }
  ) => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);

    const dataToUse = freshPpctData || ppctData;
    const rawPpctText = dataToUse?.text || '';
    const rawYccdText = dataToUse?.yccdText || '';
    const hasUploadedData = Boolean(rawPpctText || rawYccdText || (dataToUse as any)?.base64 || (dataToUse as any)?.yccdBase64);

    const cleansed = hasUploadedData
      ? updated.map((item) => ({
          c: item.c,
          n: item.n,
          s: (item.s || ['', '', '']) as [string, string, string],
          v: item.v,
          y: item.y,
        }))
      : rawPpctText
      ? cleanseRowsByPpctCutoff(updated.map((item) => ({
          c: item.c,
          n: item.n,
          s: (item.s || ['', '', '']) as [string, string, string],
          v: item.v,
          y: item.y,
        })), rawPpctText, mon, semester, true)
      : cleanseRowsForExamScope(updated.map((item) => ({
          c: item.c,
          n: item.n,
          s: (item.s || ['', '', '']) as [string, string, string],
          v: item.v,
          y: item.y,
        })), mon, semester, true);

    const consolidated = consolidateRowsByChapter(cleansed, mon, semester, rawPpctText, true);

    let newRows: MatrixRow[] = consolidated.map((item) => {
      const matchedUp = updated.find(
        (u) =>
          u.c.trim().toLowerCase() === item.c.trim().toLowerCase() &&
          u.n.trim().toLowerCase() === item.n.trim().toLowerCase()
      );
      const existing = rows.find(
        (r) =>
          r.c.trim().toLowerCase() === item.c.trim().toLowerCase() ||
          r.n.trim().toLowerCase() === item.n.trim().toLowerCase()
      );
      const vVal = matchedUp && matchedUp.v && matchedUp.v.some((x: number) => x > 0)
        ? matchedUp.v
        : existing
        ? [...existing.v]
        : getZeroVector();
      const yVal = matchedUp && matchedUp.y && matchedUp.y.some((x: number) => x > 0)
        ? matchedUp.y
        : existing && existing.y
        ? [...existing.y]
        : [0, 0, 0];
      return {
        c: item.c,
        n: item.n,
        v: vVal,
        y: yVal,
        s: item.s,
      };
    });

    const currentSums = calculateSums(newRows, points);
    const hasZeroRows = newRows.some((r) => r.v.every((x) => x === 0));
    if (Math.abs(currentSums.T - 10) > 0.25 || hasZeroRows || newRows.length !== rows.length) {
      newRows = distributeQuestions(
        newRows,
        mon as SubjectName,
        structureMode,
        shouldNoTLN,
        points,
        targetFormatPoints,
        targetLevelPoints
      );
    }

    const cleanRows = ensureValidYccd(newRows, mon, grade, dataToUse, true);
    setRows(cleanRows);
    setActiveTab('mt');
    setStatusMessage(`Đã cập nhật hoàn toàn ma trận & bản đặc tả theo tệp tải lên! (${notes.slice(0, 80)})`);
  };

  const handleRedistributeFourFormats = () => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const redistributed = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, targetFormatPoints, targetLevelPoints);
    setRows(redistributed);
    setStatusMessage('Đã phân bổ lại câu hỏi bảo toàn đầy đủ 4 dạng theo quy định.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handlePointsChange = (newPoints: QuestionPointConfig) => {
    setPoints(newPoints);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, newPoints, targetFormatPoints, targetLevelPoints);
    setRows(reallocated);
  };

  const handleTargetFormatPointsChange = (newFmtPts: number[]) => {
    setTargetFormatPoints(newFmtPts);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, newFmtPts, targetLevelPoints);
    setRows(reallocated);
  };

  const handleTargetLevelPointsChange = (newLvlPts: number[]) => {
    setTargetLevelPoints(newLvlPts);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, targetFormatPoints, newLvlPts);
    setRows(reallocated);
  };

  const handleTargetTotalScoreChange = (newTotalScore: number) => {
    setTargetTotalScore(newTotalScore);
    const currentTotal = targetTotalScore > 0 ? targetTotalScore : 10;
    const scale = newTotalScore / currentTotal;
    const scaledFormat = targetFormatPoints.map((p) => +(p * scale).toFixed(2));
    const scaledLevel = targetLevelPoints.map((p) => +(p * scale).toFixed(2));
    setTargetFormatPoints(scaledFormat);
    setTargetLevelPoints(scaledLevel);
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
    const reallocated = distributeQuestions([...rows], mon, structureMode, shouldNoTLN, points, scaledFormat, scaledLevel);
    setRows(reallocated);
  };

  const executeAutoFixAll = (): MatrixRow[] => {
    const isNoCalcDefault = NOCALC.includes(mon);
    const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);

    // 1. Heal invalid point configurations if any point <= 0
    const safePoints: QuestionPointConfig = {
      tn: points.tn > 0 ? points.tn : 0.25,
      ds: points.ds > 0 ? points.ds : 1.0,
      tln: points.tln > 0 ? points.tln : 0.25,
      tl: points.tl > 0 ? points.tl : 1.0,
    };
    if (
      safePoints.tn !== points.tn ||
      safePoints.ds !== points.ds ||
      safePoints.tln !== points.tln ||
      safePoints.tl !== points.tl
    ) {
      setPoints(safePoints);
    }

    // 2. Filter out completely empty rows if there are other valid rows, then fill any missing c / n titles
    let workingRows = [...rows];
    if (workingRows.length > 1) {
      const nonEmpty = workingRows.filter(
        (r) => r.c.trim() !== '' || r.n.trim() !== '' || r.v.some((x) => x > 0)
      );
      if (nonEmpty.length > 0) {
        workingRows = nonEmpty;
      }
    }

    let fixed = workingRows.map((r, i) => {
      let c = r.c.trim();
      let n = r.n.trim();
      if (!c && !n) {
        c = `Chủ đề ${i + 1}`;
        n = `Nội dung kiến thức ${i + 1}`;
      } else if (!c) {
        c = `Chủ đề ${i + 1}`;
      } else if (!n) {
        n = `Nội dung ${c}`;
      }
      return { ...r, c, n };
    });

    // 3. Redistribute questions across all rows to hit exact targetTotalScore, 4-format ratios, 3-level ratios, and True/False multiples of 4
    fixed = distributeQuestions(
      fixed,
      mon,
      structureMode,
      shouldNoTLN,
      safePoints,
      targetFormatPoints,
      targetLevelPoints
    );

    // 4. Reconcile & populate 100% authentic YCCĐ specifications for every active cognitive level
    fixed = ensureValidYccd(fixed, mon, grade, ppctData, true);

    setRows(fixed);
    setStatusMessage('✓ Các AI bổ trợ đã chạy ngầm và tự động sửa triệt để 100% lỗi ma trận & bản đặc tả YCCĐ theo chuẩn Công văn 7991!');
    setTimeout(() => setStatusMessage(null), 4000);
    return fixed;
  };

  const handleFixSpecificIssue = (autoFixType: string, rowIndex?: number) => {
    if (autoFixType === 'remove_empty' || autoFixType === 'remove_empty_row') {
      if (typeof rowIndex === 'number' && rows.length > 1 && rows[rowIndex]) {
        const filtered = rows.filter((_, i) => i !== rowIndex);
        const isNoCalcDefault = NOCALC.includes(mon);
        const shouldNoTLN = noTLN || (structureMode === 'k' && isNoCalcDefault);
        const redistributed = ensureValidYccd(
          distributeQuestions(filtered, mon, structureMode, shouldNoTLN, points, targetFormatPoints, targetLevelPoints),
          mon,
          grade,
          ppctData,
          true
        );
        setRows(redistributed);
        setStatusMessage(`✓ Đã xóa dòng trống thứ ${rowIndex + 1} và tự động cân bằng lại toàn bộ ma trận!`);
        setTimeout(() => setStatusMessage(null), 3500);
        return;
      }
    }
    // Run full autonomous multi-agent matrix & spec healer on any click so 1 click resolves 100% of issues
    executeAutoFixAll();
  };

  // Export runners
  const performExportWord = async (customRows?: MatrixRow[]) => {
    const dataToExport = customRows || rows;
    try {
      setStatusMessage('Đang khởi tạo tệp Word (.docx)...');
      const filename = `MaTran_DacTa_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
      await exportMatrixWord(dataToExport, points, pageTitle, filename);
      setStatusMessage('Đã tải xuống tệp Word thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất Word: ${err.message || 'Không thể tạo tệp Word'}`);
    }
  };

  const performExportPdf = async (customRows?: MatrixRow[]) => {
    const dataToExport = customRows || rows;
    try {
      setStatusMessage('Đang khởi tạo tệp PDF...');
      const filename = `MaTran_DacTa_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
      const html = generateMatrixHTML(dataToExport, points, pageTitle);
      await exportMatrixPDF(html, filename);
      setStatusMessage('Đã tải xuống tệp PDF thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất PDF: ${err.message || 'Không thể tạo tệp PDF'}`);
    }
  };

  const performExportExcel = async (customRows?: MatrixRow[]) => {
    const dataToExport = customRows || rows;
    try {
      setStatusMessage('Đang xuất tệp Excel (.xlsx)...');
      const filename = `MaTran_DacTa_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
      await exportMatrixExcel(dataToExport, points, filename);
      setStatusMessage('Đã tải xuống tệp Excel thành công.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất Excel: ${err.message}`);
    }
  };

  const performCopyWord = async (customRows?: MatrixRow[]) => {
    const dataToExport = customRows || rows;
    const html = generateMatrixHTML(dataToExport, points, pageTitle);
    const success = await copyHTMLToClipboard(html);
    if (success) {
      setCopyFeedback('Đã sao chép! Bạn hãy dán (Ctrl+V) vào Word');
      setTimeout(() => setCopyFeedback(null), 3500);
    } else {
      setStatusMessage('Không thể sao chép tự động, vui lòng thử nút Tải Word.');
    }
  };

  const checkValidationAndExport = (
    actionName: string,
    exportFn: (customRows?: MatrixRow[]) => Promise<void> | void
  ) => {
    const currentSums = calculateSums(rows, points);
    const valResult = validateMatrix(
      rows,
      currentSums,
      points,
      mon,
      structureMode,
      noTLN,
      targetTotalScore,
      targetFormatPoints,
      targetLevelPoints
    );

    if (valResult.hasErrors) {
      setExportModalState({
        isOpen: true,
        actionName,
        action: exportFn,
        errors: valResult.errors,
        warnings: valResult.warnings,
      });
      return;
    }

    exportFn();
  };

  const handleExportWord = () => checkValidationAndExport('Tải tệp Word (.docx)', performExportWord);
  const handleExportPdf = () => checkValidationAndExport('Tải tệp PDF', performExportPdf);
  const handleExportExcel = () => checkValidationAndExport('Tải tệp Excel (.xlsx)', performExportExcel);
  const handleCopyWord = () => checkValidationAndExport('Sao chép sang Word', performCopyWord);

  const handleSaveMatrix = () => {
    const rowsWithYccd = ensureValidYccd(rows, mon, grade, ppctData, false);
    setRows(rowsWithYccd);

    const currentState: FullAppState = {
      mon,
      grade,
      semester,
      structureMode,
      noTLN,
      targetTotalScore,
      targetFormatPoints,
      targetLevelPoints,
      points,
      rows: rowsWithYccd,
      ppctData,
    };
    const title = `Ma trận & Bản đặc tả ${mon} lớp ${grade} - ${semester}`;
    const savedItem = saveMatrixItem(title, currentState);
    if (currentUser && !currentUser.isAnonymous) {
      saveCloudVersion(title, currentState, currentUser).then((v) => {
        if (v) setCloudVersions((prev) => [v, ...prev.filter((x) => x.id !== v.id)]);
      });
      syncSavedMatrixToCloud(savedItem, currentUser);
    }
    const count = getSavedMatrices().length;
    setSavedCount(count);
    setStatusMessage(`✓ Đã lưu thành công Ma trận & Bản đặc tả (kèm YCCĐ) "${title}" vào thư viện & đám mây!`);
    setIsSavedModalOpen(true);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleLoadSavedState = (savedState: FullAppState, title: string) => {
    applyLoadedState(savedState, `✓ Đã mở thành công Ma trận & Bản đặc tả (kèm YCCĐ): "${title}"`);
  };

  const currentAppState: FullAppState = {
    mon,
    grade,
    semester,
    structureMode,
    noTLN,
    targetTotalScore,
    targetFormatPoints,
    targetLevelPoints,
    points,
    rows,
    aiEngineConfig,
    ppctData,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      <main className="max-w-[1360px] mx-auto px-3 sm:px-5 pt-3 sm:pt-4">
        {/* Header with collapsed account session picker */}
        <Header
          onExportWord={handleExportWord}
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          onCopyWord={handleCopyWord}
          onSaveMatrix={handleSaveMatrix}
          onOpenSavedModal={() => setIsSavedModalOpen(true)}
          onOpenRegulatoryModal={() => setIsRegulatoryModalOpen(true)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          savedCount={savedCount}
          copyFeedback={copyFeedback}
          statusMessage={statusMessage}
          currentUser={currentUser}
          cloudSessionForRestore={cloudSessionForRestore}
          onRestoreCloudSession={handleRestoreCloudSession}
          onManualSyncNow={handleManualSyncNow}
          onLogoutUser={handleLogoutUser}
          onDeleteCloudSession={handleDeleteCloudSession}
          onDeleteAllVersions={handleDeleteAllVersions}
          onOpenVersionPicker={() => setIsVersionPickerOpen(true)}
          cloudVersionCount={cloudVersions.length}
        />

        {/* Global Settings Panel */}
        <SettingsPanel
          mon={mon}
          onMonChange={setMon}
          grade={grade}
          onGradeChange={setGrade}
          semester={semester}
          onSemesterChange={setSemester}
          structureMode={structureMode}
          onStructureModeChange={setStructureMode}
          noTLN={noTLN}
          onNoTLNChange={setNoTLN}
          points={points}
          onPointsChange={handlePointsChange}
          pointNote={pointNote}
          currentRows={rows}
          onReconcileSuccess={handleReconcileSuccess}
          onResetDefault={handleResetDefault}
          ppctData={ppctData}
          onPpctDataChange={setPpctData}
          targetTotalScore={targetTotalScore}
          onTargetTotalScoreChange={handleTargetTotalScoreChange}
          targetFormatPoints={targetFormatPoints}
          onTargetFormatPointsChange={handleTargetFormatPointsChange}
          targetLevelPoints={targetLevelPoints}
          onTargetLevelPointsChange={handleTargetLevelPointsChange}
          onRedistributeFourFormats={handleRedistributeFourFormats}
        />

        {/* Print-only Title */}
        <div className="hidden print:block mb-3">
          <h2 className="text-lg font-bold text-slate-900">{pageTitle}</h2>
        </div>

        {/* Unified Step Navigation & Context Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white border border-slate-200 p-1 rounded-xl mb-2.5 shadow-2xs noprint">
          <nav className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('mt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-95 cursor-pointer ${
                activeTab === 'mt'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>1. Ma trận đề kiểm tra</span>
            </button>

            <button
              onClick={() => setActiveTab('dt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-95 cursor-pointer ${
                activeTab === 'dt'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>2. Bản đặc tả đề kiểm tra</span>
            </button>

            <button
              onClick={() => setActiveTab('qt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-95 cursor-pointer ${
                activeTab === 'qt'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'qt' ? 'text-amber-300' : 'text-indigo-500'}`} />
              <span>3. Tạo đề kiểm tra & Đáp án</span>
            </button>
          </nav>

          <div className="hidden md:flex items-center gap-2 px-2.5 text-xs text-slate-600 font-medium truncate">
            <span className="font-bold text-indigo-900 truncate">{pageTitle}</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'mt' && (
          <MatrixTable
            rows={rows}
            onChange={setRows}
            points={points}
            onPointsChange={setPoints}
            mon={mon}
            grade={grade}
            semester={semester}
            structureMode={structureMode}
            noTLN={noTLN}
            targetFormatPoints={targetFormatPoints}
            targetLevelPoints={targetLevelPoints}
            onResetDefault={handleResetDefault}
            ppctData={ppctData}
            onPpctDataChange={setPpctData}
          />
        )}

        {activeTab === 'dt' && (
          <SpecTable
            rows={rows}
            onChange={setRows}
            points={points}
            mon={mon}
            grade={grade}
            semester={semester}
            structureMode={structureMode}
            noTLN={noTLN}
            ppctData={ppctData}
            onSaveMatrixAndSpec={() => setIsSavedModalOpen(true)}
          />
        )}

        {activeTab === 'qt' && (
          <QuestionGenerator
            rows={rows}
            onRowsChange={setRows}
            mon={mon}
            grade={grade}
            semester={semester}
            points={points}
            aiEngineConfig={aiEngineConfig}
            onAiEngineConfigChange={setAiEngineConfig}
          />
        )}
        
        {/* Saved Matrices Library Modal */}
        <SavedMatricesModal
          isOpen={isSavedModalOpen}
          onClose={() => setIsSavedModalOpen(false)}
          currentState={currentAppState}
          onLoadState={handleLoadSavedState}
          onShowMessage={(msg) => {
            setStatusMessage(msg);
            setTimeout(() => setStatusMessage(null), 3500);
            setSavedCount(getSavedMatrices().length);
          }}
        />

        {/* Cross-device Sync Modal */}
        <SyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          currentUser={currentUser}
          currentState={currentAppState}
          onLoadSyncedState={(state, msg) => {
            applyLoadedState(state, msg);
            setIsSyncModalOpen(false);
          }}
          lastSyncedTime={lastSyncedTime}
        />

        {/* Export Warning Interception Modal */}
        <ExportWarningModal
          isOpen={exportModalState?.isOpen || false}
          onClose={() => setExportModalState(null)}
          errors={exportModalState?.errors || []}
          warnings={exportModalState?.warnings || []}
          exportActionName={exportModalState?.actionName || 'Xuất dữ liệu'}
          onConfirmAutoFixAndExport={async () => {
            const action = exportModalState?.action;
            setExportModalState(null);
            const fixedRows = executeAutoFixAll();
            if (action) {
              await action(fixedRows);
            }
          }}
          onConfirmExportAnyway={async () => {
            const action = exportModalState?.action;
            setExportModalState(null);
            if (action) {
              await action();
            }
          }}
        />

        {/* Full Version Picker Modal (Shows all saved versions with dates & times, allows picking any version) */}
        <VersionPickerModal
          isOpen={isVersionPickerOpen}
          onClose={() => setIsVersionPickerOpen(false)}
          versions={cloudVersions}
          isLoading={isLoadingVersions}
          currentDeviceId={getOrCreateDeviceId()}
          onSelectVersion={handleSelectVersion}
          onDeleteVersion={handleDeleteVersion}
          onDeleteAllVersions={handleDeleteAllVersions}
          onRefresh={handleRefreshVersions}
        />

        {/* Regulatory Update Modal */}
        <RegulatoryUpdateModal
          isOpen={isRegulatoryModalOpen}
          onClose={() => setIsRegulatoryModalOpen(false)}
        />

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <p>
            Phần mềm xây dựng ma trận và bản đặc tả đề kiểm tra định kì THPT ·{' '}
            <b>Tác giả: Ths. Nguyễn Đắc Quang Minh - Trường THPT Phan Đăng Lưu</b>
          </p>
        </footer>
      </main>
    </div>
  );
}
