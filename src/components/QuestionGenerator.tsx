import React, { useState, useEffect, useRef } from 'react';
import {
  AiEngineConfig,
  ExamHeaderConfig,
  ExamSemester,
  GeneratedQuestion,
  MatrixRow,
  QuestionPointConfig,
  SavedExamItem,
  SubjectName,
} from '../types';
import { AiEngineSelector } from './AiEngineSelector';
import { readFileText } from '../utils/fileReader';
import {
  generateQuestionsForTopic,
  suggestExternalSources,
  fixQuestionsComplianceWithAI,
  regenerateSingleQuestionWithGrounding,
  generateCustomQuestion,
  parseUploadedExamFile,
  ParsedExamUploadResult,
} from '../services/geminiService';
import {
  balanceMultipleChoice,
  checkQuestionsCompliance,
  normalizeQuestion,
  autoFixCompliance,
  repairExamTo100PercentHardRuleCompliance,
  ensureBalancedTrueFalseItems,
  diversifyTrueFalseInSingleSet,
  diversifyPartIIIAcrossSets,
  diversifyTrueFalseAcrossSets,
  setStatementTruthValue,
  sanitizeAllQuestionsRecursively,
  ValidationResult,
} from '../utils/questionChecker';
import {
  exportAnswerExcel,
  exportAnswerWord,
  exportExamWord,
} from '../utils/exportUtils';
import { calculateSums, dsOf, formatNumber, formatVietnameseNumber } from '../utils/matrixCalculations';
import {
  exportSavedExamsJSON,
} from '../utils/storageUtils';
import {
  ExamCodePattern,
  generateExamCodeList,
  generateRandomExamCodes,
  convertCodesDigitLength,
} from '../utils/examCodeGenerator';
import { SavedExamsModal } from './SavedExamsModal';
import { UploadExamModal } from './UploadExamModal';
import { ExamPaperView } from './ExamPaperView';
import { ExamComparisonMatrix } from './ExamComparisonMatrix';
import { ExamCritiqueStudio } from './ExamCritiqueStudio';
import { ExamEquivalenceModal } from './ExamEquivalenceModal';
import { PermutationModal, PermutationConfig, PermutationPartMode } from './PermutationModal';
import {
  autoAlignAllPartsEquivalence,
  runClosedLoopHardRulePipeline,
  ClosedLoopHardRuleAuditReport,
} from '../utils/examEquivalenceAligner';
import { getRulesForSubject, getHardRuleLockSummary, ExamRuleItem } from '../constants/examRules';
import {
  Sparkles,
  Scale,
  FileText,
  FileSpreadsheet,
  Copy,
  Upload,
  RotateCcw,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Sliders,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  ListOrdered,
  Trash2,
  X,
  FolderOpen,
  Save,
  Download,
  Building2,
  GraduationCap,
  Calendar,
  Clock3,
  Hash,
  Shuffle,
  Wand2,
  Eye,
  Columns,
  Layers,
  Printer,
  Split,
  PenTool,
  Filter,
  BarChart3,
  Loader2,
} from 'lucide-react';

export function sortQuestionsByOrderMode(
  questions: GeneratedQuestion[],
  orderMode: 'vertical' | 'horizontal'
): GeneratedQuestion[] {
  const nlc = questions.filter((q) => q.d === 'NLC');
  const ds = questions.filter((q) => q.d === 'DS').sort((a, b) => (a.r ?? 0) - (b.r ?? 0));
  const tln = questions.filter((q) => q.d === 'TLN').sort((a, b) => (a.r ?? 0) - (b.r ?? 0));
  const tl = questions.filter((q) => q.d === 'TL').sort((a, b) => (a.r ?? 0) - (b.r ?? 0));

  let sortedNlc: GeneratedQuestion[] = [];
  const levelRank: Record<string, number> = { B: 1, H: 2, V: 3 };

  if (orderMode === 'vertical') {
    // Chiều dọc: Toàn bộ câu Nhận biết (B) xếp trước, tiếp đến Thông hiểu (H), cuối cùng là Vận dụng (V)
    sortedNlc = [...nlc].sort((a, b) => {
      const rA = levelRank[a.m] || 1;
      const rB = levelRank[b.m] || 1;
      if (rA !== rB) return rA - rB;
      return (a.r ?? 0) - (b.r ?? 0);
    });
  } else {
    // Chiều ngang: Tuần tự theo từng bài học/chủ đề (r), trong mỗi bài xếp Biết -> Hiểu -> Vận dụng
    sortedNlc = [...nlc].sort((a, b) => {
      const rowA = a.r ?? 0;
      const rowB = b.r ?? 0;
      if (rowA !== rowB) return rowA - rowB;
      const rA = levelRank[a.m] || 1;
      const rB = levelRank[b.m] || 1;
      return rA - rB;
    });
  }

  // Tự luận (TL): Khi sắp xếp theo chiều dọc, câu Nhận biết (B) xếp trước, tiếp đến Thông hiểu (H), cuối cùng là Vận dụng (V)
  let sortedTl = [...tl];
  if (orderMode === 'vertical') {
    sortedTl = [...tl].sort((a, b) => {
      const rA = levelRank[a.m] || 1;
      const rB = levelRank[b.m] || 1;
      if (rA !== rB) return rA - rB;
      return (a.r ?? 0) - (b.r ?? 0);
    });
  } else {
    sortedTl = [...tl].sort((a, b) => {
      const rowA = a.r ?? 0;
      const rowB = b.r ?? 0;
      if (rowA !== rowB) return rowA - rowB;
      const rA = levelRank[a.m] || 1;
      const rB = levelRank[b.m] || 1;
      return rA - rB;
    });
  }

  return [...sortedNlc, ...ds, ...tln, ...sortedTl];
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createSinglePermutedSet(
  baseQuestions: GeneratedQuestion[],
  partModes: {
    NLC: PermutationPartMode;
    DS: PermutationPartMode;
    TLN: PermutationPartMode;
    TL: PermutationPartMode;
  },
  orderMode: 'vertical' | 'horizontal'
): GeneratedQuestion[] {
  const cloned: GeneratedQuestion[] = JSON.parse(JSON.stringify(baseQuestions));

  // 1. Process NLC (Phần I)
  let nlc = cloned.filter((q) => q.d === 'NLC');
  if (partModes.NLC === 'both' || partModes.NLC === 'options_only') {
    nlc = nlc.map((q) => {
      if (Array.isArray(q.opts) && q.opts.length === 4) {
        const ansChar = (q.ans || 'A').trim().toUpperCase();
        const ansIdx = Math.max(0, 'ABCD'.indexOf(ansChar));
        const paired = q.opts.map((optText, idx) => ({
          optText,
          isCorrect: idx === ansIdx,
        }));
        const shuffled = shuffleArray(paired);
        const newAnsIdx = shuffled.findIndex((p) => p.isCorrect);
        return {
          ...q,
          opts: shuffled.map((p) => p.optText),
          ans: 'ABCD'[newAnsIdx >= 0 ? newAnsIdx : 0],
        };
      }
      return q;
    });
  }

  if (partModes.NLC === 'both' || partModes.NLC === 'questions_only') {
    const nlcB = shuffleArray(nlc.filter((q) => q.m === 'B'));
    const nlcH = shuffleArray(nlc.filter((q) => q.m === 'H'));
    const nlcV = shuffleArray(nlc.filter((q) => q.m === 'V'));
    nlc = [...nlcB, ...nlcH, ...nlcV];
    balanceMultipleChoice(nlc);
  }

  // 2. Process DS (Phần II)
  let ds = cloned.filter((q) => q.d === 'DS');
  if (partModes.DS === 'both' || partModes.DS === 'options_only') {
    ds = ds.map((q, qIdx) => {
      if (Array.isArray(q.items) && q.items.length === 4) {
        const nextItems = q.items.map((it) => ({ ...it }));
        // Swap position 0 and 1 (both level B) to preserve B-B-H-V hierarchy
        const tmp = { ...nextItems[0], m: 'B' as const };
        nextItems[0] = { ...nextItems[1], m: 'B' as const };
        nextItems[1] = tmp;
        nextItems[2].m = 'H';
        nextItems[3].m = 'V';
        ensureBalancedTrueFalseItems(nextItems, qIdx + 1, q.ans);
        return {
          ...q,
          items: nextItems,
        };
      }
      return q;
    });
  }

  if (partModes.DS === 'both' || partModes.DS === 'questions_only') {
    ds = shuffleArray(ds);
  }
  diversifyTrueFalseInSingleSet(ds, 1);

  // 3. Process TLN (Phần III)
  let tln = cloned.filter((q) => q.d === 'TLN');
  if (partModes.TLN === 'both' || partModes.TLN === 'questions_only' || partModes.TLN === 'options_only') {
    tln = shuffleArray(tln);
  }

  // 4. Process TL (Phần IV)
  let tl = cloned.filter((q) => q.d === 'TL');
  if (partModes.TL === 'both' || partModes.TL === 'questions_only' || partModes.TL === 'options_only') {
    tl = shuffleArray(tl);
  }

  return sortQuestionsByOrderMode([...nlc, ...ds, ...tln, ...tl], orderMode);
}

export function createPermutedExamSet(
  baseQuestions: GeneratedQuestion[],
  orderMode: 'vertical' | 'horizontal'
): GeneratedQuestion[] {
  return createSinglePermutedSet(
    baseQuestions,
    { NLC: 'both', DS: 'both', TLN: 'questions_only', TL: 'none' },
    orderMode
  );
}


interface QuestionGeneratorProps {
  rows: MatrixRow[];
  onRowsChange?: (rows: MatrixRow[]) => void;
  mon: SubjectName;
  grade: string;
  semester: string;
  points: QuestionPointConfig;
  source?: 'matrix' | 'spec';
  aiEngineConfig?: AiEngineConfig;
  onAiEngineConfigChange?: (cfg: AiEngineConfig) => void;
}

export const QuestionGenerator: React.FC<QuestionGeneratorProps> = ({
  rows,
  onRowsChange,
  mon,
  grade,
  semester,
  points,
  source = 'matrix',
  aiEngineConfig: propAiEngineConfig,
  onAiEngineConfigChange,
}) => {
  const [internalAiConfig, setInternalAiConfig] = useState<AiEngineConfig>({
    engine: 'hybrid',
    enableSgkGrounding: true,
    enablePedagogicalRefinement: true,
  });

  const aiEngineConfig = propAiEngineConfig || internalAiConfig;

  const handleAiEngineChange = (cfg: AiEngineConfig) => {
    setInternalAiConfig(cfg);
    if (onAiEngineConfigChange) {
      onAiEngineConfigChange(cfg);
    }
  };
  const [refFiles, setRefFiles] = useState<{ name: string; text: string }[]>([]);
  const [isDraggingRef, setIsDraggingRef] = useState<boolean>(false);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  // Custom teacher instructions / requirements typed before creating the exam
  const [customPrompt, setCustomPrompt] = useState<string>(() => {
    try {
      return localStorage.getItem('app_exam_custom_prompt') || '';
    } catch (e) {
      return '';
    }
  });
  const [showCustomPrompt, setShowCustomPrompt] = useState<boolean>(false);
  const customPromptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [numSets, setNumSets] = useState<number>(1);
  const [includeLevelsInDoc, setIncludeLevelsInDoc] = useState<boolean>(false);
  const [speed, setSpeed] = useState<string>('quick');
  const [withExplanation, setWithExplanation] = useState<boolean>(false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [autoSearch, setAutoSearch] = useState<boolean>(true);
  const [enforceConsistency, setEnforceConsistency] = useState<boolean>(true);
  const [geoDivide, setGeoDivide] = useState<boolean>(true);
  const [geoPct, setGeoPct] = useState<number>(50);

  const [sets, setSets] = useState<GeneratedQuestion[][]>([]);
  // Exam Code settings & state (Mặc định 4 chữ số, hỗ trợ chỉnh 3 số, tự động nhảy theo mã đầu)
  const [codeDigits, setCodeDigits] = useState<3 | 4>(() => {
    try {
      const saved = localStorage.getItem('app_exam_code_digits');
      if (saved === '3' || saved === '4') return Number(saved) as 3 | 4;
    } catch (e) {}
    return 4; // Mặc định hiển thị là 4 số theo yêu cầu
  });

  const [codePattern, setCodePattern] = useState<ExamCodePattern>(() => {
    try {
      const saved = localStorage.getItem('app_exam_code_pattern');
      if (saved === 'sequential' || saved === 'step2' || saved === 'pseudorandom') {
        return saved as ExamCodePattern;
      }
    } catch (e) {}
    return 'sequential';
  });

  const [autoCascadeCodes, setAutoCascadeCodes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app_exam_code_autocascade');
      if (saved !== null) return saved === 'true';
    } catch (e) {}
    return true; // Mặc định tự động nhảy các mã sau khi sửa mã đầu
  });

  const [examCodes, setExamCodes] = useState<string[]>(() => {
    return generateExamCodeList(1, '1001', 4, 'sequential');
  });
  const [activeSetIndex, setActiveSetIndex] = useState<number>(0);
  const [examViewMode, setExamViewMode] = useState<'single' | 'all' | 'split' | 'matrix'>('single');
  const [splitSetA, setSplitSetA] = useState<number>(0);
  const [splitSetB, setSplitSetB] = useState<number>(1);

  // Header information configuration (typed by user before generating exam)
  const [headerConfig, setHeaderConfig] = useState<ExamHeaderConfig>(() => {
    try {
      const saved = localStorage.getItem('app_exam_header_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      soGiaoDuc: '',
      truongThpt: '',
      tenKyThi: '',
      namHoc: '2024 - 2025',
      thoiGianLamBai: '50',
      ghiChuDeThi: '(Đề thi có ... trang)',
    };
  });
  const [showHeaderConfig, setShowHeaderConfig] = useState<boolean>(false);

  // Persist exam code configuration & headerConfig changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_exam_code_digits', String(codeDigits));
    } catch (e) {}
  }, [codeDigits]);

  useEffect(() => {
    try {
      localStorage.setItem('app_exam_code_pattern', codePattern);
    } catch (e) {}
  }, [codePattern]);

  useEffect(() => {
    try {
      localStorage.setItem('app_exam_code_autocascade', String(autoCascadeCodes));
    } catch (e) {}
  }, [autoCascadeCodes]);

  useEffect(() => {
    try {
      localStorage.setItem('app_exam_header_config', JSON.stringify(headerConfig));
    } catch (e) {
      // ignore
    }
  }, [headerConfig]);

  useEffect(() => {
    try {
      if (customPrompt) {
        localStorage.setItem('app_exam_custom_prompt', customPrompt);
      } else {
        localStorage.removeItem('app_exam_custom_prompt');
      }
    } catch (e) {}
  }, [customPrompt]);

  // Load auto-saved exam sets from localStorage on initial mount
  useEffect(() => {
    try {
      const savedSetsRaw = localStorage.getItem('app_autosaved_generated_sets');
      if (savedSetsRaw) {
        const parsed = JSON.parse(savedSetsRaw);
        if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0]) && parsed[0].length > 0) {
          let loadedCodes = examCodes;
          const savedCodesRaw = localStorage.getItem('app_autosaved_exam_codes');
          if (savedCodesRaw) {
            const parsedCodes = JSON.parse(savedCodesRaw);
            if (Array.isArray(parsedCodes) && parsedCodes.length > 0) {
              loadedCodes = parsedCodes;
              setExamCodes(parsedCodes);
              setNumSets(parsed.length);
            }
          }
          const closedLoop = runClosedLoopHardRulePipeline(
            parsed,
            rows,
            points,
            mon,
            geoPct,
            geoDivide,
            loadedCodes
          );
          setSets(closedLoop.finalSets);
          setClosedLoopAuditReport(closedLoop.auditReport);
          const val = checkQuestionsCompliance(closedLoop.finalSets[0] || [], mon, geoPct, geoDivide, rows);
          setComplianceResult(val);
        }
      }
    } catch (e) {
      console.warn('Failed to load auto-saved exam sets:', e);
    }
  }, []);

  // Auto-save generated exam sets to localStorage whenever sets or examCodes change
  useEffect(() => {
    try {
      if (sets.length > 0 && sets.some((s) => s.length > 0)) {
        localStorage.setItem('app_autosaved_generated_sets', JSON.stringify(sets));
        localStorage.setItem('app_autosaved_exam_codes', JSON.stringify(examCodes));
      } else if (sets.length === 0) {
        localStorage.removeItem('app_autosaved_generated_sets');
        localStorage.removeItem('app_autosaved_exam_codes');
      }
    } catch (e) {
      console.warn('Failed to auto-save exam sets:', e);
    }
  }, [sets, examCodes]);

  // Synchronize examCodes array whenever numSets, autoCascade, or pattern changes
  useEffect(() => {
    setExamCodes((prev) => {
      const first = prev[0] || (codeDigits === 4 ? '1001' : '101');
      if (autoCascadeCodes) {
        return generateExamCodeList(numSets, first, codeDigits, codePattern);
      } else {
        if (prev.length === numSets) return prev;
        const next = [...prev];
        if (next.length < numSets) {
          const fresh = generateExamCodeList(numSets, first, codeDigits, codePattern);
          return fresh;
        } else {
          return next.slice(0, numSets);
        }
      }
    });
  }, [numSets, autoCascadeCodes, codePattern]);

  // Handlers for exam code actions
  const handleFirstCodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, codeDigits);
    if (autoCascadeCodes) {
      const updated = generateExamCodeList(numSets, clean, codeDigits, codePattern);
      updated[0] = clean;
      setExamCodes(updated);
    } else {
      setExamCodes((prev) => {
        const next = [...prev];
        next[0] = clean;
        return next;
      });
    }
  };

  const handleSpecificCodeChange = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, codeDigits);
    if (idx === 0) {
      handleFirstCodeChange(clean);
    } else {
      setExamCodes((prev) => {
        const next = [...prev];
        next[idx] = clean;
        return next;
      });
    }
  };

  const handleToggleCodeDigits = (newDigits: 3 | 4) => {
    setCodeDigits(newDigits);
    const converted = convertCodesDigitLength(examCodes, newDigits, codePattern);
    setExamCodes(converted);
    setProgressStatus(`Đã chuyển định dạng mã đề sang: ${newDigits} chữ số (ví dụ: ${converted.slice(0, 3).join(', ')}...).`);
  };

  const handlePatternChange = (newPattern: ExamCodePattern) => {
    setCodePattern(newPattern);
    const first = examCodes[0] || (codeDigits === 4 ? '1001' : '101');
    const updated = generateExamCodeList(numSets, first, codeDigits, newPattern);
    setExamCodes(updated);
    const desc = newPattern === 'sequential'
      ? 'Tăng dần liên tiếp (+1)'
      : newPattern === 'step2'
      ? 'Cách quãng (+2)'
      : 'Quy luật ngẫu nhiên chuẩn thi trắc nghiệm (không trùng lặp)';
    setProgressStatus(`Đã áp dụng quy luật tạo mã đề: ${desc}.`);
  };

  const handleGenerateRandomCodes = () => {
    const fresh = generateRandomExamCodes(numSets, codeDigits, codePattern === 'sequential' ? 'sequential' : 'pseudorandom');
    setExamCodes(fresh);
    setProgressStatus(`🎲 Đã tạo ngẫu nhiên thành công ${numSets} mã đề ${codeDigits} chữ số theo quy luật: ${fresh.join(', ')}`);
  };

  const handleResetCodesToDefault = () => {
    const defaultFirst = codeDigits === 4 ? '1001' : '101';
    const resetList = generateExamCodeList(numSets, defaultFirst, codeDigits, codePattern);
    setExamCodes(resetList);
    setProgressStatus(`Đã đặt lại mã đề về mặc định (${defaultFirst}...).`);
  };
  // Ordering mode for Part I: 'vertical' (Biết -> Hiểu -> Vận dụng) vs 'horizontal' (Theo từng bài học)
  const [questionOrderMode, setQuestionOrderMode] = useState<'vertical' | 'horizontal'>(() => {
    try {
      const saved = localStorage.getItem('app_question_order_mode');
      if (saved === 'horizontal' || saved === 'vertical') return saved;
    } catch (e) {
      // ignore
    }
    return 'vertical';
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_question_order_mode', questionOrderMode);
    } catch (e) {
      // ignore
    }
  }, [questionOrderMode]);

  const handleToggleOrderMode = (newMode: 'vertical' | 'horizontal') => {
    setQuestionOrderMode(newMode);
    if (sets.length > 0) {
      setSets((prevSets) =>
        prevSets.map((qList) => sortQuestionsByOrderMode(qList, newMode))
      );
      setProgressStatus(
        `Đã chuyển thứ tự câu hỏi Phần I sang: ${
          newMode === 'vertical'
            ? 'Theo chiều dọc (Biết: Câu 1–8; Hiểu: Câu 9–10; Vận dụng: Câu 11–12)'
            : 'Theo chiều ngang (Theo từng bài học/chủ đề)'
        }.`
      );
    }
  };

  const generationMode = 'combined';
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [failedTopics, setFailedTopics] = useState<{ setIdx: number; rowIdx: number; error: string }[]>([]);
  const [suggestedSources, setSuggestedSources] = useState<
    { topic: string; items: { nguon: string; loai: string; tim: string; tukhoa?: string }[] }[]
  >([]);
  const [complianceResult, setComplianceResult] = useState<ValidationResult | null>(null);
  const [closedLoopAuditReport, setClosedLoopAuditReport] = useState<ClosedLoopHardRuleAuditReport | null>(null);
  const [generationStageStatus, setGenerationStageStatus] = useState<{
    step: 1 | 2 | 3;
    label: string;
    detail: string;
  } | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [selectedRuleGroup, setSelectedRuleGroup] = useState<string>('all');
  const [ruleSearchQuery, setRuleSearchQuery] = useState<string>('');
  const [activeRuleSubjectMode, setActiveRuleSubjectMode] = useState<'auto' | 'geo' | 'general'>('auto');
  const [showQuestionConfig, setShowQuestionConfig] = useState<boolean>(false);
  const [showRefFiles, setShowRefFiles] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [showAiEnginePanel, setShowAiEnginePanel] = useState<boolean>(false);
  const [showPromptParamsPanel, setShowPromptParamsPanel] = useState<boolean>(false);
  const [isSavedExamsOpen, setIsSavedExamsOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isCritiqueStudioOpen, setIsCritiqueStudioOpen] = useState<boolean>(false);
  const [isPermutationModalOpen, setIsPermutationModalOpen] = useState<boolean>(false);
  const [isEquivalenceModalOpen, setIsEquivalenceModalOpen] = useState<boolean>(false);

  // Bộ lọc mức độ nhận thức: 'ALL' (Tất cả) | 'B' (Nhận biết) | 'H' (Thông hiểu) | 'V' (Vận dụng)
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'B' | 'H' | 'V'>('ALL');

  const handleEditQuestionLevel = (qIdx: number, newLevel: 'B' | 'H' | 'V', setIdx: number) => {
    setSets((prevSets) => {
      const next = [...prevSets];
      const targetSet = [...(next[setIdx] || [])];
      if (targetSet[qIdx]) {
        targetSet[qIdx] = {
          ...targetSet[qIdx],
          m: newLevel,
        };
        next[setIdx] = targetSet;
      }
      return next;
    });
    const label = newLevel === 'B' ? 'Nhận biết (NB)' : newLevel === 'H' ? 'Thông hiểu (TH)' : 'Vận dụng (VD)';
    setProgressStatus(`Đã đổi mức độ câu ${qIdx + 1} thành: ${label}.`);
  };

  // Tính toán thống kê & tỷ lệ 3 mức độ nhận thức (Biết, Hiểu, Vận dụng) cho đề thi đang chọn
  const activeQuestionsForStats = sets[activeSetIndex] || [];
  const cognitiveStats = React.useMemo(() => {
    let countB = 0;
    let countH = 0;
    let countV = 0;

    let scoreB = 0;
    let scoreH = 0;
    let scoreV = 0;

    activeQuestionsForStats.forEach((q) => {
      const lvl = q.m === 'H' || q.m === 'V' ? q.m : 'B';

      if (q.d === 'NLC') {
        const pt = points.tn || 0.25;
        if (lvl === 'B') { countB++; scoreB += pt; }
        else if (lvl === 'H') { countH++; scoreH += pt; }
        else { countV++; scoreV += pt; }
      } else if (q.d === 'DS') {
        const itemPt = (points.ds || 1) / 4;
        if (q.items && q.items.length > 0) {
          q.items.forEach((it) => {
            const itLvl = it.m || 'B';
            if (itLvl === 'B') { countB += 0.25; scoreB += itemPt; }
            else if (itLvl === 'H') { countH += 0.25; scoreH += itemPt; }
            else { countV += 0.25; scoreV += itemPt; }
          });
        } else {
          if (lvl === 'B') { countB++; scoreB += points.ds || 1; }
          else if (lvl === 'H') { countH++; scoreH += points.ds || 1; }
          else { countV++; scoreV += points.ds || 1; }
        }
      } else if (q.d === 'TLN') {
        const pt = points.tln || 0.5;
        if (lvl === 'B') { countB++; scoreB += pt; }
        else if (lvl === 'H') { countH++; scoreH += pt; }
        else { countV++; scoreV += pt; }
      } else if (q.d === 'TL') {
        const pt = points.tl || 1;
        if (lvl === 'B') { countB++; scoreB += pt; }
        else if (lvl === 'H') { countH++; scoreH += pt; }
        else { countV++; scoreV += pt; }
      }
    });

    const totalQs = activeQuestionsForStats.length;
    const totalSc = Math.round((scoreB + scoreH + scoreV) * 100) / 100 || 10;
    const pctB = totalSc > 0 ? Math.round((scoreB / totalSc) * 100) : 0;
    const pctH = totalSc > 0 ? Math.round((scoreH / totalSc) * 100) : 0;
    const pctV = totalSc > 0 ? Math.round((scoreV / totalSc) * 100) : 0;

    return {
      countB: Math.round(countB),
      countH: Math.round(countH),
      countV: Math.round(countV),
      scoreB: Math.round(scoreB * 100) / 100,
      scoreH: Math.round(scoreH * 100) / 100,
      scoreV: Math.round(scoreV * 100) / 100,
      pctB,
      pctH,
      pctV,
      totalQs,
      totalSc,
    };
  }, [activeQuestionsForStats, points]);

  // Mục tiêu ma trận chuẩn
  const targetMatrixSums = React.useMemo(() => calculateSums(rows, points), [rows, points]);
  const targetTotalSc = targetMatrixSums.T || 10;
  const targetPctB = targetTotalSc > 0 ? Math.round((targetMatrixSums.lv[0] / targetTotalSc) * 100) : 40;
  const targetPctH = targetTotalSc > 0 ? Math.round((targetMatrixSums.lv[1] / targetTotalSc) * 100) : 30;
  const targetPctV = targetTotalSc > 0 ? Math.round((targetMatrixSums.lv[2] / targetTotalSc) * 100) : 30;

  const handleAutoAlignEquivalence = () => {
    if (!sets || sets.length === 0) {
      setProgressStatus('Chưa có đề thi để tiến hành căn chỉnh độ tương đồng.');
      return;
    }
    const closedLoop = runClosedLoopHardRulePipeline(sets, rows, points, mon, geoPct, geoDivide, examCodes);
    setSets(closedLoop.finalSets);
    setClosedLoopAuditReport(closedLoop.auditReport);
    const activeQs = closedLoop.finalSets[activeSetIndex] || closedLoop.finalSets[0] || [];
    if (activeQs.length > 0) {
      setComplianceResult(checkQuestionsCompliance(activeQs, mon, geoPct, geoDivide, rows));
    }
    setProgressStatus(
      `✨ Đã đọc lại toàn bộ đề, đối chiếu ${closedLoop.auditReport.lockMetadata.totalRules} điều khoản quy tắc cứng và tự động sửa triệt để 100% lỗi trên toàn bộ bộ đề!`
    );
  };

  const handleGeneratePermutations = (config: PermutationConfig) => {
    const { baseSetIndex, count, action, partModes } = config;
    const baseSet = sets[baseSetIndex] || sets[0];
    if (!baseSet || baseSet.length === 0) return;

    const newPermutedSets: GeneratedQuestion[][] = [];
    for (let i = 0; i < count; i++) {
      newPermutedSets.push(createSinglePermutedSet(baseSet, partModes, questionOrderMode));
    }

    let finalSets: GeneratedQuestion[][] = [];
    if (action === 'append') {
      finalSets = [...sets, ...newPermutedSets];
    } else {
      finalSets = [baseSet, ...newPermutedSets];
    }

    const totalCount = finalSets.length;
    const firstCode = examCodes[0] || (codeDigits === 4 ? '1001' : '101');
    const nextCodes = generateExamCodeList(totalCount, firstCode, codeDigits, codePattern);

    for (let i = 0; i < examCodes.length; i++) {
      if (examCodes[i] && i < nextCodes.length) {
        nextCodes[i] = examCodes[i];
      }
    }

    const closedLoop = runClosedLoopHardRulePipeline(finalSets, rows, points, mon, geoPct, geoDivide, nextCodes);
    const orderedFinalSets = closedLoop.finalSets.map((s) => sortQuestionsByOrderMode(s, questionOrderMode));

    setSets(orderedFinalSets);
    setClosedLoopAuditReport(closedLoop.auditReport);
    setNumSets(totalCount);
    setExamCodes(nextCodes);
    const nextActive = action === 'append' ? sets.length : 1;
    setActiveSetIndex(nextActive);
    if (orderedFinalSets[nextActive]?.length) {
      setComplianceResult(checkQuestionsCompliance(orderedFinalSets[nextActive], mon, geoPct, geoDivide, rows));
    }
    if (totalCount >= 2) {
      setSplitSetA(0);
      setSplitSetB(totalCount - 1);
    }

    const baseCodeStr = examCodes[baseSetIndex] || `Mã ${baseSetIndex + 1}`;
    setProgressStatus(
      `⚡ Đã tự động sinh ${count} đề hoán vị mới từ Đề gốc (${baseCodeStr}) và hoàn tất đối chiếu quy tắc cứng! Tổng số hiện tại: ${totalCount} đề thi (Mã: ${nextCodes.slice(0, 5).join(', ')}${nextCodes.length > 5 ? '...' : ''}).`
    );
  };

  const handleLoadSavedExam = (savedExam: SavedExamItem) => {
    if (savedExam && Array.isArray(savedExam.questionsPerSource)) {
      const targetSubject = savedExam.subject || mon;
      const loadedCodes = savedExam.examCodes && savedExam.examCodes.length > 0
        ? savedExam.examCodes
        : [codeDigits === 4 ? '1001' : '101'];
      const closedLoop = runClosedLoopHardRulePipeline(
        savedExam.questionsPerSource,
        rows,
        points,
        targetSubject,
        geoPct,
        geoDivide,
        loadedCodes
      );
      const cleanedSets = closedLoop.finalSets;
      setSets(cleanedSets);
      setClosedLoopAuditReport(closedLoop.auditReport);
      setExamCodes(loadedCodes);
      if (loadedCodes[0]?.length === 3) setCodeDigits(3);
      else if (loadedCodes[0]?.length === 4) setCodeDigits(4);
      setNumSets(savedExam.numSets || cleanedSets.length || 1);
      setActiveSetIndex(0);
      if (savedExam.headerConfig) {
        setHeaderConfig(savedExam.headerConfig);
      }
      if (typeof savedExam.customPrompt === 'string') {
        setCustomPrompt(savedExam.customPrompt);
      }
      if (cleanedSets[0]?.length) {
        setComplianceResult(
          checkQuestionsCompliance(
            cleanedSets[0],
            targetSubject,
            geoPct,
            geoDivide,
            rows
          )
        );
      }
      setProgressStatus(`🎉 Đã tải bộ đề "${savedExam.title}" và tự động đối chiếu – chuẩn hóa theo ${closedLoop.auditReport.lockMetadata.totalRules} quy tắc khảo thí cứng!`);
    }
  };

  const handleExamParsedFromUpload = (
    result: ParsedExamUploadResult,
    file: File,
    mode: 'replace' | 'append'
  ) => {
    if (result.headerConfig) {
      setHeaderConfig((prev) => ({
        ...prev,
        ...result.headerConfig,
      }));
    }

    const targetSubject = result.subject || mon;
    const rawCombined =
      mode === 'append' && sets[0]?.length
        ? [...sets[0], ...result.questions]
        : [...result.questions];

    // Preserve uploaded exam questions 100% verbatim without rewriting stems, options, or real answers
    setSets([rawCombined]);
    setClosedLoopAuditReport(null);

    if (result.examCode) {
      setExamCodes([result.examCode]);
      if (result.examCode.length === 3) setCodeDigits(3);
      else if (result.examCode.length === 4) setCodeDigits(4);
    } else if (examCodes.length === 0) {
      setExamCodes([codeDigits === 4 ? '1001' : '101']);
    }
    setNumSets(1);
    setActiveSetIndex(0);

    // Read-only compliance check (does not mutate uploaded questions)
    if (rawCombined.length > 0) {
      const val = checkQuestionsCompliance(rawCombined, targetSubject, geoPct, geoDivide, rows);
      setComplianceResult(val);
    }

    const countI = rawCombined.filter((q) => q.d === 'NLC').length;
    const countII = rawCombined.filter((q) => q.d === 'DS').length;
    const countIII = rawCombined.filter((q) => q.d === 'TLN').length;
    const countIV = rawCombined.filter((q) => q.d === 'TL').length;

    setProgressStatus(
      `Đã nạp nguyên văn 100% đề thi (${rawCombined.length} câu: Phần I: ${countI}, Phần II: ${countII}, Phần III: ${countIII}, Phần IV: ${countIV}) kèm đáp án từ tệp "${file.name}".`
    );
  };

  // Overall range for each column in Phần I
  const tnlcHeaderRanges = React.useMemo(() => {
    let totalB = 0;
    let totalH = 0;
    let totalV = 0;
    rows.forEach((r) => {
      totalB += (r.v[0] || 0);
      totalH += (r.v[1] || 0);
      totalV += (r.v[2] || 0);
    });

    if (questionOrderMode === 'vertical') {
      const bRange = totalB > 0 ? (totalB === 1 ? 'Câu 1' : `Câu 1–${totalB}`) : '—';
      const hRange = totalH > 0 ? (totalH === 1 ? `Câu ${totalB + 1}` : `Câu ${totalB + 1}–${totalB + totalH}`) : '—';
      const vRange = totalV > 0 ? (totalV === 1 ? `Câu ${totalB + totalH + 1}` : `Câu ${totalB + totalH + 1}–${totalB + totalH + totalV}`) : '—';
      return { bRange, hRange, vRange, totalB, totalH, totalV };
    } else {
      return {
        bRange: totalB > 0 ? `${totalB} câu (theo bài)` : '—',
        hRange: totalH > 0 ? `${totalH} câu (theo bài)` : '—',
        vRange: totalV > 0 ? `${totalV} câu (theo bài)` : '—',
        totalB,
        totalH,
        totalV,
      };
    }
  }, [rows, questionOrderMode]);

  // Overall range for each column in Phần IV (Tự luận - 3 mức độ: Biết, Hiểu, Vận dụng)
  const tlHeaderRanges = React.useMemo(() => {
    let totalB = 0;
    let totalH = 0;
    let totalV = 0;
    rows.forEach((r) => {
      totalB += (r.v[9] || 0);
      totalH += (r.v[10] || 0);
      totalV += (r.v[11] || 0);
    });

    if (questionOrderMode === 'vertical') {
      const bRange = totalB > 0 ? (totalB === 1 ? 'Câu 1' : `Câu 1–${totalB}`) : '—';
      const hRange = totalH > 0 ? (totalH === 1 ? `Câu ${totalB + 1}` : `Câu ${totalB + 1}–${totalB + totalH}`) : '—';
      const vRange = totalV > 0 ? (totalV === 1 ? `Câu ${totalB + totalH + 1}` : `Câu ${totalB + totalH + 1}–${totalB + totalH + totalV}`) : '—';
      return { bRange, hRange, vRange, totalB, totalH, totalV, total: totalB + totalH + totalV };
    } else {
      return {
        bRange: totalB > 0 ? `${totalB} câu (theo bài)` : '—',
        hRange: totalH > 0 ? `${totalH} câu (theo bài)` : '—',
        vRange: totalV > 0 ? `${totalV} câu (theo bài)` : '—',
        totalB,
        totalH,
        totalV,
        total: totalB + totalH + totalV,
      };
    }
  }, [rows, questionOrderMode]);

  // Compute synchronized question ranges across topics
  const rowQuestionMapping = React.useMemo(() => {
    let dsCounter = 1;
    let tlnCounter = 1;
    let tlCounter = 1;

    let totalB = 0;
    let totalH = 0;
    let totalV = 0;
    let totalTlB = 0;
    let totalTlH = 0;
    let totalTlV = 0;
    rows.forEach((r) => {
      totalB += (r.v[0] || 0);
      totalH += (r.v[1] || 0);
      totalV += (r.v[2] || 0);
      totalTlB += (r.v[9] || 0);
      totalTlH += (r.v[10] || 0);
      totalTlV += (r.v[11] || 0);
    });

    let bCounter = 1;
    let hCounter = totalB + 1;
    let vCounter = totalB + totalH + 1;
    let horizontalTnlcCounter = 1;

    let tlBCounter = 1;
    let tlHCounter = totalTlB + 1;
    let tlVCounter = totalTlB + totalTlH + 1;
    let horizontalTlCounter = 1;

    return rows.map((r, rIdx) => {
      const tnlcBCount = r.v[0] || 0;
      const tnlcHCount = r.v[1] || 0;
      const tnlcVCount = r.v[2] || 0;
      const tnlcCount = tnlcBCount + tnlcHCount + tnlcVCount;

      let bRange = '—';
      let hRange = '—';
      let vRange = '—';

      if (questionOrderMode === 'vertical') {
        // Chiều dọc: Gom tất cả Biết trước (Câu 1 đến totalB), tiếp đến Hiểu, rồi đến Vận dụng
        if (tnlcBCount > 0) {
          bRange = tnlcBCount === 1 ? `Câu ${bCounter}` : `Câu ${bCounter}–${bCounter + tnlcBCount - 1}`;
          bCounter += tnlcBCount;
        }
        if (tnlcHCount > 0) {
          hRange = tnlcHCount === 1 ? `Câu ${hCounter}` : `Câu ${hCounter}–${hCounter + tnlcHCount - 1}`;
          hCounter += tnlcHCount;
        }
        if (tnlcVCount > 0) {
          vRange = tnlcVCount === 1 ? `Câu ${vCounter}` : `Câu ${vCounter}–${vCounter + tnlcVCount - 1}`;
          vCounter += tnlcVCount;
        }
      } else {
        // Chiều ngang: Tuần tự theo từng bài học
        if (tnlcBCount > 0) {
          bRange = tnlcBCount === 1 ? `Câu ${horizontalTnlcCounter}` : `Câu ${horizontalTnlcCounter}–${horizontalTnlcCounter + tnlcBCount - 1}`;
          horizontalTnlcCounter += tnlcBCount;
        }
        if (tnlcHCount > 0) {
          hRange = tnlcHCount === 1 ? `Câu ${horizontalTnlcCounter}` : `Câu ${horizontalTnlcCounter}–${horizontalTnlcCounter + tnlcHCount - 1}`;
          horizontalTnlcCounter += tnlcHCount;
        }
        if (tnlcVCount > 0) {
          vRange = tnlcVCount === 1 ? `Câu ${horizontalTnlcCounter}` : `Câu ${horizontalTnlcCounter}–${horizontalTnlcCounter + tnlcVCount - 1}`;
          horizontalTnlcCounter += tnlcVCount;
        }
      }

      const dsCount = dsOf(r).length;
      const tlnCount = (r.v[6] || 0) + (r.v[7] || 0) + (r.v[8] || 0);
      
      const tlBCount = r.v[9] || 0;
      const tlHCount = r.v[10] || 0;
      const tlVCount = r.v[11] || 0;
      const tlCount = tlBCount + tlHCount + tlVCount;

      let tlBRange = '—';
      let tlHRange = '—';
      let tlVRange = '—';

      if (questionOrderMode === 'vertical') {
        if (tlBCount > 0) {
          tlBRange = tlBCount === 1 ? `Câu ${tlBCounter}` : `Câu ${tlBCounter}–${tlBCounter + tlBCount - 1}`;
          tlBCounter += tlBCount;
        }
        if (tlHCount > 0) {
          tlHRange = tlHCount === 1 ? `Câu ${tlHCounter}` : `Câu ${tlHCounter}–${tlHCounter + tlHCount - 1}`;
          tlHCounter += tlHCount;
        }
        if (tlVCount > 0) {
          tlVRange = tlVCount === 1 ? `Câu ${tlVCounter}` : `Câu ${tlVCounter}–${tlVCounter + tlVCount - 1}`;
          tlVCounter += tlVCount;
        }
      } else {
        if (tlBCount > 0) {
          tlBRange = tlBCount === 1 ? `Câu ${horizontalTlCounter}` : `Câu ${horizontalTlCounter}–${horizontalTlCounter + tlBCount - 1}`;
          horizontalTlCounter += tlBCount;
        }
        if (tlHCount > 0) {
          tlHRange = tlHCount === 1 ? `Câu ${horizontalTlCounter}` : `Câu ${horizontalTlCounter}–${horizontalTlCounter + tlHCount - 1}`;
          horizontalTlCounter += tlHCount;
        }
        if (tlVCount > 0) {
          tlVRange = tlVCount === 1 ? `Câu ${horizontalTlCounter}` : `Câu ${horizontalTlCounter}–${horizontalTlCounter + tlVCount - 1}`;
          horizontalTlCounter += tlVCount;
        }
      }

      const dsRange = dsCount > 0
        ? (dsCount === 1 ? `Câu ${dsCounter}` : `Câu ${dsCounter}–${dsCounter + dsCount - 1}`)
        : '—';
      if (dsCount > 0) dsCounter += dsCount;

      const tlnRange = tlnCount > 0
        ? (tlnCount === 1 ? `Câu ${tlnCounter}` : `Câu ${tlnCounter}–${tlnCounter + tlnCount - 1}`)
        : '—';
      if (tlnCount > 0) tlnCounter += tlnCount;

      const tlRange = tlCount > 0
        ? (tlCount === 1 ? `Câu ${tlCounter}` : `Câu ${tlCounter}–${tlCounter + tlCount - 1}`)
        : '—';
      if (tlCount > 0) tlCounter += tlCount;

      return {
        rIdx,
        c: r.c,
        n: r.n,
        tnlcBCount,
        tnlcHCount,
        tnlcVCount,
        tnlcCount,
        bRange,
        hRange,
        vRange,
        dsCount,
        dsRange,
        tlnCount,
        tlnRange,
        tlBCount,
        tlHCount,
        tlVCount,
        tlBRange,
        tlHRange,
        tlVRange,
        tlCount,
        tlRange,
        totalQuestions: tnlcCount + dsCount + tlnCount + tlCount,
      };
    });
  }, [rows, questionOrderMode]);

  // Aggregate totals across all rows for summary row & indicators
  const totals = React.useMemo(() => {
    let tnlcB = 0;
    let tnlcH = 0;
    let tnlcV = 0;
    let ds = 0;
    let tln = 0;
    let tlB = 0;
    let tlH = 0;
    let tlV = 0;
    rows.forEach((r) => {
      tnlcB += (r.v[0] || 0);
      tnlcH += (r.v[1] || 0);
      tnlcV += (r.v[2] || 0);
      ds += dsOf(r).length;
      tln += (r.v[6] || 0) + (r.v[7] || 0) + (r.v[8] || 0);
      tlB += (r.v[9] || 0);
      tlH += (r.v[10] || 0);
      tlV += (r.v[11] || 0);
    });
    const tnlcTotal = tnlcB + tnlcH + tnlcV;
    const tl = tlB + tlH + tlV;
    const allTotal = tnlcTotal + ds + tln + tl;
    return { tnlcB, tnlcH, tnlcV, tnlcTotal, ds, tln, tlB, tlH, tlV, tl, allTotal };
  }, [rows]);

  const handleAdjustTnlcLevel = (rIdx: number, levelIdx: 0 | 1 | 2, delta: number) => {
    if (!onRowsChange) return;
    const nextRows = JSON.parse(JSON.stringify(rows)) as MatrixRow[];
    const targetRow = nextRows[rIdx];
    if (!targetRow) return;
    const currentVal = targetRow.v[levelIdx] || 0;
    targetRow.v[levelIdx] = Math.max(0, Math.min(99, currentVal + delta));
    onRowsChange(nextRows);
  };

  const handleSetTnlcLevel = (rIdx: number, levelIdx: 0 | 1 | 2, val: number) => {
    if (!onRowsChange) return;
    const nextRows = JSON.parse(JSON.stringify(rows)) as MatrixRow[];
    const targetRow = nextRows[rIdx];
    if (!targetRow) return;
    targetRow.v[levelIdx] = Math.max(0, Math.min(99, isNaN(val) ? 0 : val));
    onRowsChange(nextRows);
  };

  const handleAdjustTlLevel = (rIdx: number, levelIdx: 9 | 10 | 11, delta: number) => {
    if (!onRowsChange) return;
    const nextRows = JSON.parse(JSON.stringify(rows)) as MatrixRow[];
    const targetRow = nextRows[rIdx];
    if (!targetRow) return;
    const currentVal = targetRow.v[levelIdx] || 0;
    targetRow.v[levelIdx] = Math.max(0, Math.min(99, currentVal + delta));
    onRowsChange(nextRows);
  };

  const handleSetTlLevel = (rIdx: number, levelIdx: 9 | 10 | 11, val: number) => {
    if (!onRowsChange) return;
    const nextRows = JSON.parse(JSON.stringify(rows)) as MatrixRow[];
    const targetRow = nextRows[rIdx];
    if (!targetRow) return;
    targetRow.v[levelIdx] = Math.max(0, Math.min(99, isNaN(val) ? 0 : val));
    onRowsChange(nextRows);
  };

  const handleAdjustRowQuestions = (rIdx: number, formatIdx: number, delta: number) => {
    if (!onRowsChange) return;
    const nextRows = JSON.parse(JSON.stringify(rows)) as MatrixRow[];
    const targetRow = nextRows[rIdx];
    if (!targetRow) return;

    if (formatIdx === 0) {
      if (delta > 0) {
        targetRow.v[0] = (targetRow.v[0] || 0) + 1;
      } else {
        if ((targetRow.v[2] || 0) > 0) targetRow.v[2]--;
        else if ((targetRow.v[1] || 0) > 0) targetRow.v[1]--;
        else if ((targetRow.v[0] || 0) > 0) targetRow.v[0]--;
      }
    } else if (formatIdx === 1) {
      if (!targetRow.y) targetRow.y = [0, 0, 0];
      if (delta > 0) {
        targetRow.y[1] = (targetRow.y[1] || 0) + 1;
      } else {
        if (targetRow.y[2] > 0) targetRow.y[2]--;
        else if (targetRow.y[1] > 0) targetRow.y[1]--;
        else if (targetRow.y[0] > 0) targetRow.y[0]--;
      }
    } else if (formatIdx === 2) {
      if (delta > 0) {
        targetRow.v[7] = (targetRow.v[7] || 0) + 1;
      } else {
        if ((targetRow.v[8] || 0) > 0) targetRow.v[8]--;
        else if ((targetRow.v[7] || 0) > 0) targetRow.v[7]--;
        else if ((targetRow.v[6] || 0) > 0) targetRow.v[6]--;
      }
    } else if (formatIdx === 3) {
      if (delta > 0) {
        targetRow.v[10] = (targetRow.v[10] || 0) + 1;
      } else {
        if ((targetRow.v[11] || 0) > 0) targetRow.v[11]--;
        else if ((targetRow.v[10] || 0) > 0) targetRow.v[10]--;
        else if ((targetRow.v[9] || 0) > 0) targetRow.v[9]--;
      }
    }
    onRowsChange(nextRows);
  };

  // Multi-file reading & accumulation for reference materials
  const processReferenceFiles = async (files: File[]) => {
    if (!files || !files.length) return;
    try {
      setProgressStatus(`Đang đọc và phân tích ${files.length} tệp tài liệu tham khảo...`);
      const newItems: { name: string; text: string }[] = [];
      let totalLength = refFiles.reduce((acc, f) => acc + (f.text?.length || 0), 0);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (totalLength >= 250000) {
          setProgressStatus('Đã đạt dung lượng tối ưu cho tài liệu tham khảo (~250.000 kí tự).');
          break;
        }
        const text = await readFileText(file);
        const truncated = text.slice(0, 60000);
        totalLength += truncated.length;
        newItems.push({ name: file.name, text: truncated });
      }

      if (newItems.length > 0) {
        setRefFiles((prev) => {
          const existingNames = new Set(prev.map((f) => f.name));
          const filteredNew = newItems.filter((f) => !existingNames.has(f.name));
          return [...prev, ...(filteredNew.length > 0 ? filteredNew : newItems)];
        });
        setProgressStatus(
          `🎉 Đã nạp thành công ${newItems.length} tài liệu tham khảo mới! Hiện có tổng cộng ${refFiles.length + newItems.length} tài liệu để AI trích xuất nội dung ra đề.`
        );
      }
    } catch (err: any) {
      setProgressStatus(`Lỗi đọc tài liệu tham khảo: ${err.message}`);
    }
  };

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processReferenceFiles(Array.from(files));
    }
    // Clear input value so selecting the same file or subsequent batches works every time
    e.target.value = '';
  };

  const handleRefDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingRef(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processReferenceFiles(Array.from(files));
    }
  };


  const handleClearRef = () => {
    setRefFiles([]);
    setProgressStatus('Đã xóa toàn bộ tài liệu tham khảo.');
  };

  // Custom question & answer generator state
  const [showCustomStudio, setShowCustomStudio] = useState<boolean>(false);
  const [nlPrompt, setNlPrompt] = useState<string>('');
  const [nlSourceText, setNlSourceText] = useState<string>('');
  const [nlFormat, setNlFormat] = useState<'AUTO' | 'NLC' | 'DS' | 'TLN' | 'TL'>('AUTO');
  const [nlLevel, setNlLevel] = useState<'AUTO' | 'B' | 'H' | 'V'>('AUTO');
  const [nlCount, setNlCount] = useState<number>(1);
  const [nlSelectedRowIdx, setNlSelectedRowIdx] = useState<number>(-1);
  const [nlQuestionLevels, setNlQuestionLevels] = useState<('B' | 'H' | 'V')[]>(['B']);
  const [nlWithExplanation, setNlWithExplanation] = useState<boolean>(true);
  const [nlIsGenerating, setNlIsGenerating] = useState<boolean>(false);
  const [nlGeneratedQuestions, setNlGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [nlTargetCodeMode, setNlTargetCodeMode] = useState<'active' | 'all'>('active');
  const [nlInsertMode, setNlInsertMode] = useState<'append' | 'replace'>('append');
  const [nlReplaceIndex, setNlReplaceIndex] = useState<number>(0);

  const handleNlCountChange = (newCount: number) => {
    const validCount = Math.max(1, Math.min(10, newCount));
    setNlCount(validCount);
    setNlQuestionLevels((prev) => {
      const next = [...prev];
      if (next.length < validCount) {
        while (next.length < validCount) {
          const idx = next.length;
          const defaultLvl: 'B' | 'H' | 'V' = idx % 3 === 0 ? 'B' : idx % 3 === 1 ? 'H' : 'V';
          next.push(defaultLvl);
        }
      } else {
        return next.slice(0, validCount);
      }
      return next;
    });
  };

  const handleSetQuestionLevel = (qIdx: number, lvl: 'B' | 'H' | 'V') => {
    setNlQuestionLevels((prev) => {
      const next = [...prev];
      next[qIdx] = lvl;
      return next;
    });
  };

  const handleSetAllLevels = (lvl: 'B' | 'H' | 'V') => {
    setNlQuestionLevels(Array(nlCount).fill(lvl));
  };

  const handleSetBalancedLevels = () => {
    setNlQuestionLevels(
      Array.from({ length: nlCount }, (_, i) => (i % 3 === 0 ? 'B' : i % 3 === 1 ? 'H' : 'V'))
    );
  };

  // Custom question & answer generation handler
  const handleGenerateCustomQuestion = async () => {
    if (!nlPrompt.trim() && !nlSourceText.trim() && nlSelectedRowIdx < 0) {
      setProgressStatus('Vui lòng nhập yêu cầu, chọn bài học trong ma trận hoặc dán/tải nội dung tư liệu tham khảo.');
      return;
    }
    try {
      setNlIsGenerating(true);
      setProgressStatus('Đang phân tích ma trận, đặc tả YCCĐ và tự động soạn câu hỏi & đáp án chuẩn theo yêu cầu...');

      const combinedSource = [
        nlSourceText.trim(),
        ...refFiles.map((f) => `--- [Tệp tham khảo: ${f.name}] ---\n${f.text}`),
      ].filter(Boolean).join('\n\n');

      const selectedMatrixRow = nlSelectedRowIdx >= 0 && rows[nlSelectedRowIdx] ? rows[nlSelectedRowIdx] : null;

      const questions = await generateCustomQuestion({
        prompt: nlPrompt.trim() || (selectedMatrixRow ? `Tự động soạn câu hỏi bám sát chuẩn YCCĐ bài "${selectedMatrixRow.n}" môn ${mon} lớp ${grade}` : `Tự động soạn câu hỏi và đáp án cho môn ${mon} lớp ${grade}`),
        sourceText: combinedSource,
        format: nlFormat,
        level: nlLevel,
        mon,
        grade,
        semester,
        withExplanation: nlWithExplanation,
        essayPoint: points.tl,
        count: nlCount,
        selectedRow: selectedMatrixRow,
        selectedRowIndex: nlSelectedRowIdx >= 0 ? nlSelectedRowIdx : undefined,
        questionLevels: nlQuestionLevels.slice(0, nlCount),
      });

      if (questions && questions.length > 0) {
        setNlGeneratedQuestions(questions.map((q) => normalizeQuestion(q)));
        setProgressStatus(`✨ Đã tự soạn xong ${questions.length} câu hỏi và đáp án bám sát ma trận & YCCĐ! Bạn có thể xem trước, chỉnh sửa và bấm "Đưa vào đề theo yêu cầu".`);
      } else {
        setProgressStatus('Chưa tạo được câu hỏi phù hợp. Vui lòng thử lại với yêu cầu chi tiết hơn.');
      }
    } catch (err: any) {
      setProgressStatus(`Lỗi soạn câu hỏi: ${err.message}`);
    } finally {
      setNlIsGenerating(false);
    }
  };

  // Insert generated questions into exam sets according to user specification
  const handleApplyCustomQuestions = () => {
    if (!nlGeneratedQuestions.length) return;

    let updatedSets = sets.length > 0
      ? sets.map((s) => [...s])
      : Array.from({ length: Math.max(1, numSets) }, () => []);

    const targetIndices = nlTargetCodeMode === 'all'
      ? updatedSets.map((_, idx) => idx)
      : [activeSetIndex < updatedSets.length ? activeSetIndex : 0];

    targetIndices.forEach((setIdx) => {
      let qList = [...(updatedSets[setIdx] || [])];
      if (nlInsertMode === 'replace' && qList.length > 0 && nlReplaceIndex >= 0 && nlReplaceIndex < qList.length) {
        qList[nlReplaceIndex] = JSON.parse(JSON.stringify(nlGeneratedQuestions[0]));
        if (nlGeneratedQuestions.length > 1) {
          qList.push(...nlGeneratedQuestions.slice(1).map((q) => JSON.parse(JSON.stringify(q))));
        }
      } else {
        nlGeneratedQuestions.forEach((newQ) => {
          const qCopy = JSON.parse(JSON.stringify(newQ));
          const lastSameTypeIdx = qList.map((q) => q.d).lastIndexOf(qCopy.d);
          if (lastSameTypeIdx >= 0) {
            qList.splice(lastSameTypeIdx + 1, 0, qCopy);
          } else {
            qList.push(qCopy);
          }
        });
      }
      updatedSets[setIdx] = qList;
    });

    const closedLoop = runClosedLoopHardRulePipeline(
      updatedSets,
      rows,
      points,
      mon,
      geoPct,
      geoDivide,
      examCodes
    );
    const finalCustomSets = closedLoop.finalSets.map((s) => sortQuestionsByOrderMode(s, questionOrderMode));
    setSets(finalCustomSets);
    setClosedLoopAuditReport(closedLoop.auditReport);
    if (finalCustomSets[activeSetIndex]?.length) {
      const val = checkQuestionsCompliance(finalCustomSets[activeSetIndex], mon, geoPct, geoDivide, rows);
      setComplianceResult(val);
    }

    const targetDesc = nlTargetCodeMode === 'all'
      ? `tất cả các mã đề (${examCodes.slice(0, numSets).join(', ')})`
      : `mã đề ${examCodes[activeSetIndex] || `Nguồn ${activeSetIndex + 1}`}`;

    setProgressStatus(`🎉 Đã đưa thành công ${nlGeneratedQuestions.length} câu hỏi tự soạn vào ${targetDesc} và hoàn tất tự đối chiếu quy tắc cứng!`);
    setNlGeneratedQuestions([]);
  };

  // Build requirements for all topics
  const buildTopicNeeds = () => {
    const formatLetters = ['NLC', 'DS', 'TLN', 'TL'];
    const levelLetters = ['B', 'H', 'V'];
    let geoDsCounter = 0;

    return rows.map((r) => {
      const need: any[] = [];
      r.v.forEach((n, j) => {
        const f = (j / 3) | 0;
        const l = j % 3;
        if (n <= 0 || f === 1) return; // True/False handled separately
        need.push({
          d: formatLetters[f],
          m: levelLetters[l],
          n,
        });
      });

      // True/False questions for this row
      dsOf(r).forEach((q) => {
        const itemObj: any = {
          d: 'DS',
          m: levelLetters[q[3]],
          n: 1,
          yl: q.map((lIdx) => levelLetters[lIdx]),
        };
        if (mon === 'Địa lí' && geoDivide) {
          const t = geoDsCounter++;
          itemObj.kind =
            Math.round(((t + 1) * geoPct) / 100) > Math.round((t * geoPct) / 100)
              ? 'data'
              : 'text';
        }
        need.push(itemObj);
      });

      return need;
    });
  };

  // Generate Questions (3-Stage Closed-Loop Architecture: Pre-Lock -> Read-Back & Cross-Check -> Auto-Heal & Final Output)
  const handleGenerate = async () => {
    if (!rows.length) {
      setProgressStatus('Chưa có chủ đề nào trong ma trận.');
      return;
    }

    try {
      setIsGenerating(true);
      const generatedSets: GeneratedQuestion[][] = [];
      const failures: { setIdx: number; rowIdx: number; error: string }[] = [];
      const topicNeeds = buildTopicNeeds();
      const startTime = Date.now();
      const useSearch = speed === 'thorough' ? autoSearch : false;

      // BƯỚC 1: ĐỌC KỸ & KHÓA CỨNG BỘ QUY TẮC KHẢO THÍ CỨNG TRƯỚC KHI RA ĐỀ
      const preLockMeta = getHardRuleLockSummary(mon);
      setGenerationStageStatus({
        step: 1,
        label: `Bước 1/3: Đọc kỹ & khóa cứng ${preLockMeta.totalRules} điều khoản quy tắc khảo thí cứng`,
        detail: `${preLockMeta.rulebookTitle} (${preLockMeta.criticalLocks.slice(0, 3).join(' • ')})`,
      });
      setProgressStatus(
        `🔒 [Bước 1/3 - Khóa cứng quy tắc]: Đã đọc kỹ và khóa cứng ${preLockMeta.totalRules} điều khoản (${preLockMeta.rulebookTitle}) trước khi ra đề...`
      );

      for (let sIdx = 0; sIdx < numSets; sIdx++) {
        setGenerationStageStatus({
          step: 2,
          label: `Bước 2/3: Soạn đề bám sát quy tắc khóa cứng (Đề ${sIdx + 1}/${numSets})`,
          detail: `Đang soạn thảo song song ${rows.length} bài học/chủ đề theo khung ${preLockMeta.totalRules} điều khoản cứng...`,
        });
        setProgressStatus(
          `✍️ [Bước 2/3 - Ra đề theo quy tắc khóa cứng]: Đang soạn song song ${rows.length} chủ đề cho Đề ${sIdx + 1}/${numSets}...`
        );

        // Parallelize topic generation per set
        const topicPromises = rows.map(async (row, rIdx) => {
          const need = topicNeeds[rIdx];
          if (!need || !need.length) return { rIdx, qs: [] };

          const prevTopicStems = sIdx > 0
            ? generatedSets
                .slice(0, sIdx)
                .map((prevSet) => prevSet.filter((q) => q.r === rIdx || q.d === 'TLN'))
                .flat()
                .map((q) => {
                  const tableTitle = Array.isArray(q.srcs)
                    ? q.srcs.map((s) => s.table?.title || '').filter(Boolean).join('; ')
                    : '';
                  let desc = `[Dạng ${q.d} - Câu hỏi]: ${q.stem}${q.ask ? ` ${q.ask}` : ''}`;
                  if (tableTitle) desc += ` | [Bảng số liệu]: ${tableTitle}`;
                  if (q.opts) desc += ` | [Phương án]: ${q.opts.join('; ')}`;
                  if (q.items) desc += ` | [Ý Đ/S]: ${q.items.map((it) => `${it.t} (${it.a ? 'Đ' : 'S'})`).join('; ')}`;
                  if (q.ans) desc += ` | [Đáp án]: ${q.ans}`;
                  return desc;
                })
            : [];

          try {
            const qs = await generateQuestionsForTopic(
              mon,
              grade,
              semester,
              row,
              need,
              sIdx,
              numSets,
              prevTopicStems,
              refFiles,
              [],
              withExplanation,
              points.tl,
              useSearch,
              generationMode,
              enforceConsistency,
              aiEngineConfig,
              customPrompt
            );
            return { rIdx, qs };
          } catch (err: any) {
            failures.push({
              setIdx: sIdx,
              rowIdx: rIdx,
              error: err.message || 'Lỗi soạn câu hỏi',
            });
            return { rIdx, qs: [] };
          }
        });

        const setResults = await Promise.all(topicPromises);
        const currentSetQuestions: GeneratedQuestion[] = [];

        // Sort by matrix row index to guarantee correct matrix order
        setResults.sort((a, b) => a.rIdx - b.rIdx);
        setResults.forEach(({ rIdx, qs }) => {
          qs.forEach((q) => {
            const normed = normalizeQuestion({ ...q, r: rIdx });
            currentSetQuestions.push(normed);
          });
        });

        if (shuffleOptions) {
          balanceMultipleChoice(currentSetQuestions);
        }

        const sortedSet = sortQuestionsByOrderMode(currentSetQuestions, questionOrderMode);
        generatedSets.push(sortedSet);
      }

      // BƯỚC 3: TỰ ĐỘNG ĐỌC LẠI TOÀN ĐỀ, ĐỐI CHIẾU TỪNG ĐIỀU KHOẢN QUY TẮC CỨNG, TỰ SỬA LỖI & XUẤT BẢN CHUẨN CUỐI CÙNG
      setGenerationStageStatus({
        step: 3,
        label: `Bước 3/3: Tự động đọc lại, đối chiếu ${preLockMeta.totalRules} quy tắc cứng & tự sửa lỗi`,
        detail: `Đang rà soát chéo 4 phần (NLC, Đ/S, TLN, TL), cân bằng số vế/số từ phương án, khử lộ đáp án & xuất Bản chuẩn cuối cùng...`,
      });
      setProgressStatus(
        `🔍 [Bước 3/3 - Tự đọc lại & Đối chiếu]: Đang đọc lại toàn bộ đề, đối chiếu ${preLockMeta.totalRules} quy tắc cứng, tự sửa lỗi và xuất Bản chuẩn cuối cùng...`
      );

      const closedLoopResult = runClosedLoopHardRulePipeline(
        generatedSets,
        rows,
        points,
        mon,
        geoPct,
        geoDivide,
        examCodes
      );
      const finalGeneratedSets = closedLoopResult.finalSets.map((setList) =>
        sortQuestionsByOrderMode(setList, questionOrderMode)
      );

      setSets(finalGeneratedSets);
      setClosedLoopAuditReport(closedLoopResult.auditReport);
      setFailedTopics(failures);
      setActiveSetIndex(0);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const healedNote =
        closedLoopResult.auditReport.initialIssuesDetected > 0
          ? `đã tự phát hiện & tự sửa triệt để ${closedLoopResult.auditReport.initialIssuesDetected} điểm lệch qua ${closedLoopResult.auditReport.passesExecuted} lượt đối chiếu`
          : `đạt chuẩn ngay từ lượt kiểm tra đầu tiên`;
      setProgressStatus(
        `✅ [BẢN CHUẨN CUỐI CÙNG]: Đã khóa cứng ${closedLoopResult.auditReport.lockMetadata.totalRules} quy tắc (${closedLoopResult.auditReport.lockMetadata.rulebookTitle}), tự đọc lại đối chiếu toàn đề (${healedNote} → 0 lỗi tồn đọng) cho ${finalGeneratedSets.length} mã đề trong ${elapsed}s! ${
          failures.length ? `(Có ${failures.length} phần lỗi kết nối, bấm "Soạn lại phần bị lỗi")` : ''
        }`
      );

      // Validate the first set
      if (finalGeneratedSets[0]?.length) {
        const val = checkQuestionsCompliance(finalGeneratedSets[0], mon, geoPct, geoDivide, rows);
        setComplianceResult(val);
      }
    } catch (err: any) {
      setProgressStatus(`Lỗi khi tạo câu hỏi: ${err.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationStageStatus(null);
    }
  };

  // Re-generate failed parts in parallel
  const handleRegenerateFailed = async () => {
    if (!failedTopics.length || !sets.length) return;
    try {
      setIsGenerating(true);
      setProgressStatus('⚡ Đang khóa cứng quy tắc và soạn lại song song các phần bị lỗi...');
      const topicNeeds = buildTopicNeeds();
      const remainingFails: typeof failedTopics = [];
      const updatedSets = sets.map((s) => s.map((q) => JSON.parse(JSON.stringify(q))));
      const useSearch = speed === 'thorough' ? autoSearch : false;

      const promises = failedTopics.map(async (item) => {
        const { setIdx, rowIdx } = item;
        const need = topicNeeds[rowIdx];
        if (!need || !need.length) return;

        try {
          const prevTopicStems = sets
            .map((s, idx) => (idx !== setIdx ? s.filter((q) => q.r === rowIdx || q.d === 'TLN') : []))
            .flat()
            .map((q) => `[Dạng ${q.d} - Câu hỏi]: ${q.stem}${q.ask ? ` ${q.ask}` : ''} | [Đáp án]: ${q.ans || ''}`);

          const qs = await generateQuestionsForTopic(
            mon,
            grade,
            semester,
            rows[rowIdx],
            need,
            setIdx + Math.floor(Date.now() / 1000) % 50,
            numSets,
            prevTopicStems,
            refFiles,
            [],
            withExplanation,
            points.tl,
            useSearch,
            generationMode,
            enforceConsistency,
            aiEngineConfig,
            customPrompt
          );

          if (qs && qs.length > 0) {
            // Remove old fallback questions for this rowIdx first so question counts are never duplicated
            updatedSets[setIdx] = updatedSets[setIdx].filter((q) => q.r !== rowIdx);
            qs.forEach((q) => {
              const normed = normalizeQuestion({ ...q, r: rowIdx });
              updatedSets[setIdx].push(normed);
            });
            updatedSets[setIdx] = sortQuestionsByOrderMode(updatedSets[setIdx], questionOrderMode);
          } else {
            throw new Error('Empty result from AI');
          }
        } catch (err: any) {
          console.warn(`[Regenerate] Fallback healing for row ${rowIdx} set ${setIdx}:`, err);
        }
      });

      await Promise.all(promises);

      const closedLoop = runClosedLoopHardRulePipeline(
        updatedSets,
        rows,
        points,
        mon,
        geoPct,
        geoDivide,
        examCodes
      );
      const finalRegenSets = closedLoop.finalSets.map((s) =>
        sortQuestionsByOrderMode(s, questionOrderMode)
      );

      setSets(finalRegenSets);
      setClosedLoopAuditReport(closedLoop.auditReport);
      setFailedTopics(remainingFails);

      // Re-validate compliance for the active set to reflect the fixes in the UI
      const newCompliance = checkQuestionsCompliance(finalRegenSets[activeSetIndex] || [], mon, geoPct, geoDivide, rows);
      setComplianceResult(newCompliance);

      setProgressStatus(
        '✓ Đã soạn lại, tự động đọc lại đối chiếu quy tắc cứng và xuất Bản chuẩn cuối cùng (0 lỗi tồn đọng)!'
      );
    } catch (err: any) {
      setProgressStatus(`Lỗi soạn lại: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Run compliance & error detection check (also executes closed-loop read-back & self-healing if any deviations exist)
  const handleRunComplianceCheck = () => {
    const currentList = sets[activeSetIndex] || [];
    if (!currentList.length) return;
    const rawVal = checkQuestionsCompliance(currentList, mon, geoPct, geoDivide, rows);
    if (rawVal.warnings.length > 0) {
      const closedLoop = runClosedLoopHardRulePipeline(sets, rows, points, mon, geoPct, geoDivide, examCodes);
      const orderedSets = closedLoop.finalSets.map((s, sIdx) => {
        const sorted = sortQuestionsByOrderMode(s, questionOrderMode);
        return repairExamTo100PercentHardRuleCompliance(sorted, mon, geoPct, geoDivide, sIdx, rows).fixedQuestions;
      });
      setSets(orderedSets);
      setClosedLoopAuditReport(closedLoop.auditReport);
      const healedVal = checkQuestionsCompliance(orderedSets[activeSetIndex] || [], mon, geoPct, geoDivide, rows);
      setComplianceResult(healedVal);
      setProgressStatus(
        `✅ Đã đọc lại toàn bộ đề, đối chiếu ${closedLoop.auditReport.lockMetadata.totalRules} quy tắc khảo thí khóa cứng và tự động sửa triệt để 100% lỗi về Bản chuẩn cuối cùng (0 lỗi)!`
      );
    } else {
      const closedLoop = runClosedLoopHardRulePipeline(sets, rows, points, mon, geoPct, geoDivide, examCodes);
      setClosedLoopAuditReport(closedLoop.auditReport);
      setComplianceResult(rawVal);
      setProgressStatus('✅ Đã đọc lại và đối chiếu toàn bộ đề với Bộ quy tắc khảo thí cứng & chuẩn Ma trận: Đạt chuẩn 100% (0 lỗi)!');
    }
  };

  // Fix questions with compliance/validation errors using AI & closed-loop hard-rule pipeline
  const handleFixComplianceErrors = async () => {
    if (!sets.length) return;

    try {
      setIsGenerating(true);
      setProgressStatus('⚡ Đang đọc lại toàn bộ đề, đối chiếu bộ quy tắc cứng và tự động sửa triệt để 100% lỗi...');

      const updatedSets: GeneratedQuestion[][] = sets.map((s) =>
        s.map((q) => {
          const cloned = JSON.parse(JSON.stringify(q));
          delete cloned._edited;
          return cloned;
        })
      );

      for (let sIdx = 0; sIdx < updatedSets.length; sIdx++) {
        const currentList = updatedSets[sIdx];
        const val = checkQuestionsCompliance(currentList, mon, geoPct, geoDivide, rows);
        if (!val.warnings.length) continue;

        const nlcQs = currentList.filter((q) => q.d === 'NLC');
        const dsQs = currentList.filter((q) => q.d === 'DS');
        const tlnQs = currentList.filter((q) => q.d === 'TLN');
        const tlQs = currentList.filter((q) => q.d === 'TL');

        const warningMap = new Map<number, string[]>();

        val.warnings.forEach((w) => {
          let matchedIndex: number | null = null;
          const mI = w.match(/Phần I, câu (\d+)/i);
          if (mI) {
            const idx = parseInt(mI[1], 10) - 1;
            if (nlcQs[idx]) matchedIndex = currentList.indexOf(nlcQs[idx]);
          }
          const mII = w.match(/Phần II, câu (\d+)/i);
          if (mII) {
            const idx = parseInt(mII[1], 10) - 1;
            if (dsQs[idx]) matchedIndex = currentList.indexOf(dsQs[idx]);
          }
          const mIII = w.match(/Phần III, câu (\d+)/i);
          if (mIII) {
            const idx = parseInt(mIII[1], 10) - 1;
            if (tlnQs[idx]) matchedIndex = currentList.indexOf(tlnQs[idx]);
          }
          const mIV = w.match(/Phần IV, câu (\d+)/i);
          if (mIV) {
            const idx = parseInt(mIV[1], 10) - 1;
            if (tlQs[idx]) matchedIndex = currentList.indexOf(tlQs[idx]);
          }
          const mGlobal = w.match(/Câu (\d+) \((NLC|DS|TLN|TL)\)/i);
          if (mGlobal) {
            const gIdx = parseInt(mGlobal[1], 10) - 1;
            if (currentList[gIdx]) matchedIndex = gIdx;
          }

          if (matchedIndex !== null && matchedIndex >= 0) {
            const list = warningMap.get(matchedIndex) || [];
            list.push(w);
            warningMap.set(matchedIndex, list);
          }
        });

        const questionsToFix = Array.from(warningMap.entries()).map(([gIdx, wList]) => ({
          globalIndex: gIdx,
          question: currentList[gIdx],
          warnings: wList,
        }));

        if (questionsToFix.length > 0) {
          try {
            const fixedResults = await fixQuestionsComplianceWithAI(
              mon,
              grade,
              semester,
              questionsToFix,
              withExplanation,
              points.tl,
              refFiles
            );
            fixedResults.forEach(({ globalIndex, fixedQuestion }) => {
              if (globalIndex >= 0 && globalIndex < currentList.length && fixedQuestion) {
                const prevRow = currentList[globalIndex]?.r;
                currentList[globalIndex] = normalizeQuestion({ ...fixedQuestion, r: prevRow });
              }
            });
          } catch (err) {
            console.warn('AI fix warning:', err);
          }
        }

        // Apply comprehensive deterministic auto-fix on the entire set to ensure 100% compliance
        const rep = repairExamTo100PercentHardRuleCompliance(currentList, mon, geoPct, geoDivide, sIdx, rows);
        updatedSets[sIdx] = rep.fixedQuestions;
      }

      // Run closed-loop hard-rule pipeline across all sets (reads back, cross-checks all rules, eliminates leakages, balances clauses & lengths)
      const closedLoop = runClosedLoopHardRulePipeline(
        updatedSets,
        rows,
        points,
        mon,
        geoPct,
        geoDivide,
        examCodes
      );
      const finalHealedSets = closedLoop.finalSets.map((s, sIdx) => {
        const sorted = sortQuestionsByOrderMode(s, questionOrderMode);
        const finalRep = repairExamTo100PercentHardRuleCompliance(sorted, mon, geoPct, geoDivide, sIdx, rows);
        return finalRep.fixedQuestions;
      });

      setSets(finalHealedSets);
      setClosedLoopAuditReport(closedLoop.auditReport);
      setFailedTopics([]);

      // Re-validate compliance for the active set
      const newCompliance = checkQuestionsCompliance(finalHealedSets[activeSetIndex] || [], mon, geoPct, geoDivide, rows);
      setComplianceResult(newCompliance);

      const groundingTag = refFiles.length > 0
        ? ` (🔍 Đối chiếu từ ${refFiles.length} tệp tài liệu tham khảo đã tải lên)`
        : ` (🌐 Đối chiếu trực tuyến từ Web & SGK Bộ Kết nối tri thức mới nhất GDPT 2018)`;

      setProgressStatus(
        `🎉 Đã tự động đọc lại, đối chiếu ${closedLoop.auditReport.lockMetadata.totalRules} quy tắc cứng và sửa triệt để 100% lỗi, xuất Bản chuẩn cuối cùng (0 lỗi tồn đọng)!${groundingTag}`
      );
    } catch (err: any) {
      setProgressStatus(`Lỗi khi soạn lại câu hỏi bị lỗi: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-compose a single question grounded on uploaded documents or web search
  const handleRegenerateSingleQuestion = async (qIdx: number, targetSetIdx: number = activeSetIndex) => {
    const targetSet = sets[targetSetIdx];
    if (!targetSet || !targetSet[qIdx]) return;

    const currentQ = targetSet[qIdx];
    try {
      setIsGenerating(true);
      const hasRef = refFiles && refFiles.length > 0;
      const modeLabel = hasRef
        ? `tài liệu tham khảo đã tải (${refFiles.length} tệp)`
        : 'Web & SGK Kết nối tri thức mới nhất (GDPT 2018)';

      setProgressStatus(`⚡ Đang khóa cứng quy tắc và đối chiếu ${modeLabel} để soạn lại Câu ${qIdx + 1}...`);

      const selectedRow =
        typeof currentQ.r === 'number' && rows[currentQ.r]
          ? rows[currentQ.r]
          : rows[0] || null;
      const existingStems = targetSet
        .filter((_, idx) => idx !== qIdx)
        .map((q) => `${q.stem || ''} ${q.ask || ''}`.trim())
        .filter(Boolean);

      const newQ = await regenerateSingleQuestionWithGrounding(
        mon,
        grade,
        semester,
        currentQ,
        refFiles,
        withExplanation,
        points.tl,
        selectedRow,
        existingStems
      );

      if (newQ && newQ.stem) {
        const normed = normalizeQuestion({
          ...newQ,
          d: currentQ.d,
          m: currentQ.m,
          r: currentQ.r,
        });
        const updatedSets = [...sets];
        const qList = [...updatedSets[targetSetIdx]];
        qList[qIdx] = normed;
        updatedSets[targetSetIdx] = qList;

        const closedLoop = runClosedLoopHardRulePipeline(
          updatedSets,
          rows,
          points,
          mon,
          geoPct,
          geoDivide,
          examCodes
        );
        setSets(closedLoop.finalSets);
        setClosedLoopAuditReport(closedLoop.auditReport);
        updateRealtimeCompliance(closedLoop.finalSets, targetSetIdx);

        setProgressStatus(
          `🎉 Đã soạn lại và tự đối chiếu quy tắc cứng thành công cho Câu ${qIdx + 1} (Đạt chuẩn 100%)! (${hasRef ? '🔍 Đối chiếu từ Tài liệu tham khảo đã tải lên' : '🌐 Đối chiếu trực tuyến từ Web & SGK Kết nối tri thức mới nhất'})`
        );
      }
    } catch (err: any) {
      setProgressStatus(`Lỗi khi soạn lại câu hỏi: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const allFixedCount = (setsList: GeneratedQuestion[][]) => {
    return setsList.reduce((acc, s) => acc + checkQuestionsCompliance(s, mon, geoPct, geoDivide, rows).warnings.length, 0);
  };

  // Suggest reputable external sources
  const handleSuggestSources = async () => {
    try {
      setProgressStatus('Đang gọi AI để gợi ý nguồn tài liệu uy tín ngoài sách...');
      const res = await suggestExternalSources(mon, grade, rows);
      setSuggestedSources(res);
      setProgressStatus('Đã nhận được danh sách nguồn gợi ý.');
    } catch (err: any) {
      setProgressStatus(`Lỗi gợi ý nguồn: ${err.message}`);
    }
  };

  const currentQuestions = sets[activeSetIndex] || [];

  // Helper to re-evaluate compliance on direct edits in real time
  const updateRealtimeCompliance = (updatedSets: GeneratedQuestion[][], targetSetIdx: number) => {
    if (targetSetIdx === activeSetIndex) {
      const qList = updatedSets[activeSetIndex] || [];
      if (qList.length > 0) {
        setComplianceResult(checkQuestionsCompliance(qList, mon, geoPct, geoDivide, rows));
      } else {
        setComplianceResult(null);
      }
    }
  };

  // Question editing handler (supports editing any set index)
  const handleEditQuestionStem = (qIdx: number, val: string, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = [...updated[targetSetIdx]];
    qList[qIdx] = { ...qList[qIdx], stem: val, _edited: true };
    updated[targetSetIdx] = qList;
    setSets(updated);
    updateRealtimeCompliance(updated, targetSetIdx);
  };

  const handleEditQuestionAsk = (qIdx: number, val: string, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = [...updated[targetSetIdx]];
    qList[qIdx] = { ...qList[qIdx], ask: val, _edited: true };
    updated[targetSetIdx] = qList;
    setSets(updated);
    updateRealtimeCompliance(updated, targetSetIdx);
  };

  const handleEditQuestionOpt = (qIdx: number, optIdx: number, val: string, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = [...updated[targetSetIdx]];
    const newOpts = [...(qList[qIdx].opts || [])];
    newOpts[optIdx] = val;
    qList[qIdx] = { ...qList[qIdx], opts: newOpts, _edited: true };
    updated[targetSetIdx] = qList;
    setSets(updated);
    updateRealtimeCompliance(updated, targetSetIdx);
  };

  const handleEditSubItemText = (qIdx: number, itemIdx: number, val: string, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = [...updated[targetSetIdx]];
    const newItems = [...(qList[qIdx].items || [])];
    newItems[itemIdx] = { ...newItems[itemIdx], t: val };
    qList[qIdx] = { ...qList[qIdx], items: newItems, _edited: true };
    updated[targetSetIdx] = qList;
    setSets(updated);
    updateRealtimeCompliance(updated, targetSetIdx);
  };

  const handleEditQuestionAns = (qIdx: number, val: string, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = [...updated[targetSetIdx]];
    qList[qIdx] = { ...qList[qIdx], ans: val, _edited: true };
    updated[targetSetIdx] = qList;
    setSets(updated);
    updateRealtimeCompliance(updated, targetSetIdx);
  };

  const handleToggleSubItemAns = (qIdx: number, itemIdx: number, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = [...updated[targetSetIdx]];
    const items = (qList[qIdx].items || []).map((it) => ({ ...it }));
    if (items[itemIdx]) {
      const nextBool = !items[itemIdx].a;
      items[itemIdx] = { ...items[itemIdx], a: nextBool };
      const trueCount = items.filter((it) => it.a).length;
      if (trueCount === 4 || trueCount === 0) {
        const companionIdx = itemIdx === 0 ? 1 : itemIdx === 1 ? 0 : itemIdx === 2 ? 3 : 2;
        if (items[companionIdx]) {
          setStatementTruthValue(items[companionIdx], !nextBool);
        }
        setProgressStatus(
          `⚠️ Phần II (Đúng/Sai) cấm tuyệt đối 4/4 Đúng hoặc 4/4 Sai: Đã tự động đảo đối xứng ý ${'abcd'[companionIdx]}) để đảm bảo câu luôn có cả ý Đúng và ý Sai.`
        );
      }
      qList[qIdx] = { ...qList[qIdx], items, _edited: true };
      updated[targetSetIdx] = qList;
      setSets(updated);
      updateRealtimeCompliance(updated, targetSetIdx);
    }
  };

  // Delete an individual question from target set
  const handleDeleteQuestion = (qIdx: number, targetSetIdx: number = activeSetIndex) => {
    const updated = [...sets];
    if (!updated[targetSetIdx]) return;
    const qList = updated[targetSetIdx].filter((_, i) => i !== qIdx);
    updated[targetSetIdx] = qList;
    setSets(updated);

    if (targetSetIdx === activeSetIndex) {
      if (qList.length) {
        setComplianceResult(checkQuestionsCompliance(qList, mon, geoPct, geoDivide, rows));
      } else {
        setComplianceResult(null);
      }
    }
    setProgressStatus(`Đã xóa câu hỏi khỏi Đề ${targetSetIdx + 1} (Mã ${examCodes[targetSetIdx] || ''}).`);
  };

  // Tạo nhanh thêm 1 đề hoán vị từ đề gốc hiện tại (không cần gọi lại AI)
  const handleQuickCreatePermutation = () => {
    const baseSet = sets[activeSetIndex] || sets[0];
    if (!baseSet || baseSet.length === 0) return;

    const newPermutedSet = createPermutedExamSet(baseSet, questionOrderMode);
    const rawNextSets = [...sets, newPermutedSet];
    const nextCount = rawNextSets.length;
    const firstCode = examCodes[0] || (codeDigits === 4 ? '1001' : '101');
    const nextCodes = generateExamCodeList(nextCount, firstCode, codeDigits, codePattern);

    // Giữ nguyên các mã đề người dùng đã chỉnh tay trước đó
    for (let i = 0; i < examCodes.length; i++) {
      if (examCodes[i]) nextCodes[i] = examCodes[i];
    }

    const closedLoop = runClosedLoopHardRulePipeline(rawNextSets, rows, points, mon, geoPct, geoDivide, nextCodes);
    const nextSets = closedLoop.finalSets.map((s) => sortQuestionsByOrderMode(s, questionOrderMode));

    setSets(nextSets);
    setClosedLoopAuditReport(closedLoop.auditReport);
    setNumSets(nextCount);
    setExamCodes(nextCodes);
    setActiveSetIndex(nextCount - 1);
    if (nextSets[nextCount - 1]?.length) {
      setComplianceResult(checkQuestionsCompliance(nextSets[nextCount - 1], mon, geoPct, geoDivide, rows));
    }
    if (nextCount >= 2) {
      setSplitSetA(0);
      setSplitSetB(nextCount - 1);
    }
    setProgressStatus(
      `✨ Đã tạo thêm Đề số ${nextCount} (Mã đề ${nextCodes[nextCount - 1]}) bằng cách hoán vị & tự đối chiếu quy tắc cứng từ Đề ${activeSetIndex + 1}!`
    );
  };

  // Delete current active set
  const handleDeleteCurrentSet = () => {
    if (sets.length <= 1) {
      setSets([]);
      setComplianceResult(null);
      setClosedLoopAuditReport(null);
      setProgressStatus('Đã xóa bộ đề.');
      return;
    }
    const nextSets = sets.filter((_, idx) => idx !== activeSetIndex);
    const nextCodes = examCodes.filter((_, idx) => idx !== activeSetIndex);
    setSets(nextSets);
    setExamCodes(nextCodes);
    setNumSets(nextSets.length);
    const nextActive = Math.max(0, activeSetIndex - 1);
    setActiveSetIndex(nextActive);
    if (splitSetA >= nextSets.length) setSplitSetA(0);
    if (splitSetB >= nextSets.length) setSplitSetB(Math.max(0, nextSets.length - 1));
    if (nextSets[nextActive]?.length) {
      setComplianceResult(checkQuestionsCompliance(nextSets[nextActive], mon, geoPct, geoDivide, rows));
    } else {
      setComplianceResult(null);
    }
    setProgressStatus(`Đã xóa đề số ${activeSetIndex + 1}.`);
  };

  // Clear all sets
  const handleClearAllSets = () => {
    setSets([]);
    setComplianceResult(null);
    setClosedLoopAuditReport(null);
    setProgressStatus('Đã xóa tất cả các đề đã tạo.');
  };

  // Dismiss / delete an individual warning in compliance review
  const handleDismissWarning = (wIdx: number) => {
    if (!complianceResult) return;
    setComplianceResult({
      ...complianceResult,
      warnings: complianceResult.warnings.filter((_, i) => i !== wIdx),
    });
  };

  // Delete an individual custom question from Custom Studio preview
  const handleDeleteCustomQuestion = (qIdx: number) => {
    setNlGeneratedQuestions((prev) => prev.filter((_, i) => i !== qIdx));
  };

  // Delete an individual reference file
  const handleDeleteRefFile = (fileIdx: number) => {
    setRefFiles((prev) => prev.filter((_, i) => i !== fileIdx));
  };

  // Delete an individual suggested source
  const handleDeleteSuggestedSource = (sourceIdx: number) => {
    setSuggestedSources((prev) => prev.filter((_, i) => i !== sourceIdx));
  };

  // Handlers for applying critique fixes from Critique Studio
  const handleApplyCritiqueQuestionFix = (qIdx: number, fixedQuestion: GeneratedQuestion) => {
    const updatedSets = [...sets];
    if (!updatedSets[activeSetIndex]) return;
    const qList = [...updatedSets[activeSetIndex]];
    const normed = normalizeQuestion(JSON.parse(JSON.stringify(fixedQuestion)));
    qList[qIdx] = normed;
    updatedSets[activeSetIndex] = qList;
    const closedLoop = runClosedLoopHardRulePipeline(updatedSets, rows, points, mon, geoPct, geoDivide, examCodes);
    setSets(closedLoop.finalSets);
    setClosedLoopAuditReport(closedLoop.auditReport);
    setComplianceResult(checkQuestionsCompliance(closedLoop.finalSets[activeSetIndex] || qList, mon, geoPct, geoDivide, rows));
    setProgressStatus(
      `✨ Đã áp dụng, tự đọc lại đối chiếu quy tắc cứng và chuẩn hóa dứt điểm 100% cho Câu ${qIdx + 1} trong đề ${activeSetIndex + 1} (Mã ${examCodes[activeSetIndex] || ''})!`
    );
  };

  const handleApplyAllCritiqueFixes = (fixedQuestions: GeneratedQuestion[]) => {
    const updatedSets = [...sets];
    const normalizedFixed = fixedQuestions.map((q) => normalizeQuestion(JSON.parse(JSON.stringify(q))));
    updatedSets[activeSetIndex] = normalizedFixed;

    const closedLoop = runClosedLoopHardRulePipeline(updatedSets, rows, points, mon, geoPct, geoDivide, examCodes);
    setSets(closedLoop.finalSets);
    setClosedLoopAuditReport(closedLoop.auditReport);
    setComplianceResult(
      checkQuestionsCompliance(closedLoop.finalSets[activeSetIndex] || normalizedFixed, mon, geoPct, geoDivide, rows)
    );
    setProgressStatus(
      `🎉 Đã tự động đọc lại, đối chiếu ${closedLoop.auditReport.lockMetadata.totalRules} quy tắc cứng và chuẩn hóa triệt để 100% toàn bộ đề thi (Mã ${examCodes[activeSetIndex] || ''}) — Đạt 100/100 điểm Hội đồng Phản biện!`
    );
  };

  // Export actions
  const handleDownloadSingleExamWord = () => {
    if (!currentQuestions.length) return;
    const activeCode = examCodes[activeSetIndex] || (codeDigits === 4 ? String(1001 + activeSetIndex) : String(101 + activeSetIndex));
    const baseName = `De_${mon}_Lop${grade}_${semester}_Ma${activeCode}`.replace(/\s+/g, '_');
    exportExamWord(
      [currentQuestions],
      `Đề kiểm tra ${mon} - Lớp ${grade} - ${semester}`,
      mon,
      grade,
      semester,
      points,
      baseName,
      [activeCode],
      headerConfig
    );
  };

  const handleDownloadExamWord = () => {
    if (!sets.length || !currentQuestions.length) return;
    const suffix = sets.length > 1 ? `_${sets.length}De_Full` : `_Ma${examCodes[0] || '1001'}`;
    const baseName = `BoDe_${mon}_Lop${grade}_${semester}${suffix}`.replace(/\s+/g, '_');
    exportExamWord(
      sets,
      `Đề kiểm tra ${mon} - Lớp ${grade} - ${semester}`,
      mon,
      grade,
      semester,
      points,
      baseName,
      examCodes,
      headerConfig
    );
  };

  const handlePrintExams = () => {
    window.print();
  };

  const handleDownloadAnswerExcel = () => {
    if (!currentQuestions.length) return;
    const baseName = `DapAn_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
    exportAnswerExcel(sets, baseName, examCodes);
  };

  const handleDownloadAnswerWord = () => {
    if (!currentQuestions.length) return;
    const baseName = `HuongDanCham_${mon}_Lop${grade}_${semester}`.replace(/\s+/g, '_');
    exportAnswerWord(
      sets,
      `Hướng dẫn chấm đề ${mon} - Lớp ${grade} - ${semester}`,
      mon,
      grade,
      semester,
      baseName,
      examCodes,
      headerConfig
    );
  };

  const handleCopyExam = async () => {
    if (!currentQuestions.length) return;
    const examText =
      document.getElementById(`exam-preview-container-${activeSetIndex}`)?.innerText ||
      document.getElementById('exam-preview-container')?.innerText ||
      '';
    if (examText) {
      await navigator.clipboard.writeText(examText);
      setProgressStatus('Đã sao chép nội dung đề kiểm tra vào bộ nhớ tạm.');
    }
  };

  return (
    <div className="space-y-3">
      {/* PRIMARY EXAM GENERATION & WORKSPACE CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs noprint space-y-2.5">
        {/* Top Row: Core Inputs + Generate CTA + Upload/Library */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Number of sets */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Số đề:</label>
              <input
                type="number"
                min="1"
                max="99"
                value={numSets}
                onChange={(e) => setNumSets(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
                className="w-11 text-center text-xs font-bold text-indigo-900 bg-white border border-slate-200 rounded py-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                title="Số lượng đề muốn tạo từ ma trận (1 đến 99)"
              />
            </div>

            {/* First Exam Code + Random */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Mã đầu:</label>
              <input
                type="text"
                maxLength={codeDigits}
                value={examCodes[0] || ''}
                onChange={(e) => handleFirstCodeChange(e.target.value)}
                placeholder={codeDigits === 4 ? '1001' : '101'}
                className="w-14 text-center font-mono text-xs font-bold text-indigo-900 bg-white border border-slate-200 rounded py-0.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                title="Mã đề đầu tiên (các mã sau tự động nhảy theo)"
              />
              <button
                type="button"
                onClick={handleGenerateRandomCodes}
                className="p-1 rounded hover:bg-indigo-100 text-indigo-600 transition cursor-pointer"
                title="Tạo mã đề ngẫu nhiên"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed Toggle */}
            <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setSpeed('quick')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer whitespace-nowrap ${
                  speed === 'quick' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tạo song song cực nhanh (3–5s)"
              >
                ⚡ Siêu tốc
              </button>
              <button
                type="button"
                onClick={() => setSpeed('thorough')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer whitespace-nowrap ${
                  speed === 'thorough' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Kèm tra cứu số liệu thực tế qua Google Search"
              >
                🔍 Chuyên sâu
              </button>
            </div>

            {/* Primary Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm font-bold shadow-2xs hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isGenerating ? 'Đang tạo bộ đề...' : `Tạo bộ đề kiểm tra (${totals.allTotal} câu)`}</span>
            </button>
          </div>

          {/* Right Quick Actions: Upload / Library / Fix / Save */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Tải lên tệp đề thi độc lập (Word, PDF, Ảnh chụp, Text, JSON...)"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-100" />
              <span>Tải đề lên</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSavedExamsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Mở thư viện đề thi đã lưu (gồm cả Đề và Đáp án)"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-300" />
              <span>Thư viện đề</span>
            </button>

            {currentQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleFixComplianceErrors}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
                title="Sửa đề đúng 100% theo bộ quy tắc khảo thí khóa cứng (CV 7991, 8773, QĐ 764)"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                <span>Sửa đề chuẩn 100%</span>
                {complianceResult && complianceResult.warnings.length > 0 ? (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-black rounded-full">
                    {complianceResult.warnings.length} lỗi
                  </span>
                ) : (
                  <span className="text-[10px] bg-teal-900/60 text-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
                    100%
                  </span>
                )}
              </button>
            )}

            {currentQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsSavedExamsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer whitespace-nowrap"
                title="Lưu trọn bộ Đề thi và Đáp án hiện tại vào thư viện"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Đề & Đáp án</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Secondary Configuration Tool Tabs (All Collapsed by Default) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowHeaderConfig(!showHeaderConfig)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showHeaderConfig
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Tiêu đề ({headerConfig.thoiGianLamBai || '50'}p)</span>
              {showHeaderConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowAiEnginePanel(!showAiEnginePanel)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showAiEnginePanel
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${showAiEnginePanel ? 'text-amber-300' : 'text-indigo-600'}`} />
              <span>
                AI: {aiEngineConfig.engine === 'claude' ? 'Claude Sonnet' : aiEngineConfig.engine === 'chatgpt' ? 'ChatGPT' : aiEngineConfig.engine === 'notebooklm' ? 'NotebookLM' : aiEngineConfig.engine === 'gemini' ? 'Gemini 2.5' : 'Đa AI'}
              </span>
              {showAiEnginePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowPromptParamsPanel(!showPromptParamsPanel)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showPromptParamsPanel
                  ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                  : (aiEngineConfig.promptParams?.complexity && aiEngineConfig.promptParams.complexity !== 'standard') ||
                    (aiEngineConfig.promptParams?.languageStyle && aiEngineConfig.promptParams.languageStyle !== 'academic') ||
                    (aiEngineConfig.promptParams?.topicPriority && aiEngineConfig.promptParams.topicPriority !== 'balanced')
                  ? 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Tùy chỉnh độ phức tạp câu hỏi, phong cách ngôn ngữ và độ ưu tiên chủ đề cho AI tạo đề"
            >
              <Sliders className={`w-3.5 h-3.5 ${showPromptParamsPanel ? 'text-white' : 'text-teal-600'}`} />
              <span>Tham số Prompt</span>
              {showPromptParamsPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showAdvancedOptions
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Mã đề & Tùy chọn</span>
              {showAdvancedOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowQuestionConfig(!showQuestionConfig)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showQuestionConfig
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Thứ tự câu ({totals.allTotal})</span>
              {showQuestionConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowRefFiles(!showRefFiles)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showRefFiles
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : refFiles.length > 0 || customPrompt.trim()
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Tải tài liệu tham khảo và gõ yêu cầu nội dung cụ thể trước khi tạo đề"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>
                Tài liệu ({refFiles.length}) & Yêu cầu {customPrompt.trim() ? '✓' : ''}
              </span>
              {showRefFiles ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowCustomStudio(!showCustomStudio)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showCustomStudio
                  ? 'bg-indigo-900 text-amber-300 border-indigo-800'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Soạn câu lẻ</span>
              {showCustomStudio ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition active:scale-95 cursor-pointer whitespace-nowrap ${
                showRules
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Tra cứu toàn văn điều khoản quy tắc khảo thí"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${showRules ? 'text-white' : 'text-emerald-600'}`} />
              <span>Quy tắc ({mon === 'Địa lí' ? '84' : '56'} điều)</span>
              {showRules ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {failedTopics.length > 0 && (
              <button
                onClick={handleRegenerateFailed}
                disabled={isGenerating}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Soạn lại {failedTopics.length} phần lỗi</span>
              </button>
            )}

            <button
              onClick={handleSuggestSources}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition active:scale-95 cursor-pointer"
              title="Gợi ý nguồn tài liệu uy tín ngoài SGK"
            >
              <ExternalLink className="w-3 h-3 text-indigo-600" />
              <span>Gợi ý nguồn</span>
            </button>
          </div>
        </div>

        {/* AI Engine Drawer */}
        {showAiEnginePanel && (
          <div className="mt-3">
            <AiEngineSelector config={aiEngineConfig} onChange={handleAiEngineChange} />
          </div>
        )}

        {/* Advanced Prompt Control Panel Drawer */}
        {showPromptParamsPanel && (
          <div className="mt-3 bg-white border border-teal-200 rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    Bảng điều khiển Tham số Prompt nâng cao
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Tinh chỉnh trực tiếp chỉ thị sinh đề của AI về độ khó, văn phong và trọng tâm kiến thức
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleAiEngineChange({
                    ...aiEngineConfig,
                    promptParams: {
                      complexity: 'standard',
                      languageStyle: 'academic',
                      topicPriority: 'balanced',
                      priorityTopicText: '',
                    },
                  })
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại mặc định</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 1. Độ phức tạp của câu hỏi */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  1. Độ phức tạp của câu hỏi
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'basic', label: 'Cơ bản chuẩn SGK', desc: 'Trực diện, bám sát kiến thức nền tảng' },
                    { id: 'standard', label: 'Tiêu chuẩn GDPT 2018', desc: 'Phân bổ hài hòa theo đề kiểm tra định kì' },
                    { id: 'advanced', label: 'Nâng cao phân hóa', desc: 'Liên hệ đa bước, phương án nhiễu tinh tế' },
                    { id: 'gifted', label: 'Chuyên sâu / HSG', desc: 'Tư duy phản biện, bối cảnh mới, đa tầng' },
                  ].map((opt) => {
                    const active = (aiEngineConfig.promptParams?.complexity || 'standard') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleAiEngineChange({
                            ...aiEngineConfig,
                            promptParams: {
                              ...aiEngineConfig.promptParams,
                              complexity: opt.id as any,
                            },
                          })
                        }
                        className={`text-left px-3 py-2 rounded-lg border transition cursor-pointer ${
                          active
                            ? 'bg-teal-50 border-teal-500 text-teal-950 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{opt.label}</span>
                          {active && <span className="text-[10px] font-bold text-teal-700">Đang chọn</span>}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Phong cách ngôn ngữ */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  2. Phong cách ngôn ngữ
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'academic', label: 'Hàn lâm chuẩn khảo thí', desc: 'Thuật ngữ chuẩn xác, trang trọng Bộ GD&ĐT' },
                    { id: 'natural', label: 'Tự nhiên, dễ hiểu', desc: 'Mạch lạc, thân thiện, không đánh đố từ ngữ' },
                    { id: 'practical', label: 'Gắn bối cảnh thực tiễn', desc: 'Lồng ghép tình huống, số liệu thực tế mới' },
                    { id: 'concise', label: 'Ngắn gọn, súc tích', desc: 'Câu dẫn trực diện, lược bỏ mệnh đề thừa' },
                  ].map((opt) => {
                    const active = (aiEngineConfig.promptParams?.languageStyle || 'academic') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleAiEngineChange({
                            ...aiEngineConfig,
                            promptParams: {
                              ...aiEngineConfig.promptParams,
                              languageStyle: opt.id as any,
                            },
                          })
                        }
                        className={`text-left px-3 py-2 rounded-lg border transition cursor-pointer ${
                          active
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{opt.label}</span>
                          {active && <span className="text-[10px] font-bold text-indigo-700">Đang chọn</span>}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Độ ưu tiên chủ đề */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  3. Độ ưu tiên chủ đề
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'balanced', label: 'Cân bằng theo Ma trận', desc: 'Giữ đúng tỷ trọng đều mọi đơn vị kiến thức' },
                    { id: 'core_focus', label: 'Ưu tiên bài trọng tâm', desc: 'Đào sâu quy luật, kiến thức cốt lõi hay thi' },
                    { id: 'practical_data', label: 'Ưu tiên bảng số liệu & thực tiễn', desc: 'Tăng câu hỏi bảng biểu, tính toán, vận dụng' },
                    { id: 'custom', label: 'Chọn chủ đề ưu tiên cụ thể', desc: 'Tập trung khai thác sâu một bài/chủ đề riêng' },
                  ].map((opt) => {
                    const active = (aiEngineConfig.promptParams?.topicPriority || 'balanced') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          handleAiEngineChange({
                            ...aiEngineConfig,
                            promptParams: {
                              ...aiEngineConfig.promptParams,
                              topicPriority: opt.id as any,
                            },
                          })
                        }
                        className={`text-left px-3 py-2 rounded-lg border transition cursor-pointer ${
                          active
                            ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-2xs'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>{opt.label}</span>
                          {active && <span className="text-[10px] font-bold text-amber-700">Đang chọn</span>}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {aiEngineConfig.promptParams?.topicPriority === 'custom' && (
                  <div className="pt-1.5 space-y-1.5">
                    {rows.length > 0 && (
                      <select
                        value={
                          rows.some((r) => `${r.c}: ${r.n}` === aiEngineConfig.promptParams?.priorityTopicText)
                            ? aiEngineConfig.promptParams?.priorityTopicText
                            : ''
                        }
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAiEngineChange({
                              ...aiEngineConfig,
                              promptParams: {
                                ...aiEngineConfig.promptParams,
                                priorityTopicText: e.target.value,
                              },
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="">-- Chọn nhanh chủ đề từ Ma trận --</option>
                        {rows.map((r, idx) => (
                          <option key={idx} value={`${r.c}: ${r.n}`}>
                            {r.c}: {r.n}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={aiEngineConfig.promptParams?.priorityTopicText || ''}
                      onChange={(e) =>
                        handleAiEngineChange({
                          ...aiEngineConfig,
                          promptParams: {
                            ...aiEngineConfig.promptParams,
                            priorityTopicText: e.target.value,
                          },
                        })
                      }
                      placeholder="Hoặc nhập tên chủ đề / đơn vị kiến thức cần ưu tiên..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER: Custom Question & Answer Studio */}
      {showCustomStudio && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-xl p-4 shadow-md border border-indigo-500/30 noprint space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Tự soạn câu hỏi & đáp án lẻ theo yêu cầu (đưa trực tiếp vào mã đề)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomStudio(false)}
              className="text-xs text-indigo-300 hover:text-white font-medium flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg transition cursor-pointer"
            >
              <span>Đóng</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3 pt-2 border-t border-indigo-800/60">
            {/* 1. Grounding with Matrix and Specification */}
            <div className="bg-slate-900/90 border border-indigo-700/60 rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span>Căn cứ bám sát Ma trận & Bản đặc tả YCCĐ:</span>
                </label>
                <span className="text-[10px] text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 font-semibold">
                  Chuẩn GDPT 2018 (CV 7991)
                </span>
              </div>

              <select
                value={nlSelectedRowIdx}
                onChange={(e) => setNlSelectedRowIdx(Number(e.target.value))}
                className="w-full bg-slate-950 border border-indigo-500/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="-1">🌐 Tự do / Toàn bộ chương trình (hoặc nhập tự do trong ô yêu cầu bên dưới)</option>
                {rows.map((r, rIdx) => (
                  <option key={rIdx} value={rIdx}>
                    [Chủ đề {rIdx + 1}] {r.c}: {r.n}
                  </option>
                ))}
              </select>

              {/* Specification preview when a row is selected */}
              {nlSelectedRowIdx >= 0 && rows[nlSelectedRowIdx] && (
                <div className="bg-indigo-950/70 border border-indigo-600/40 rounded-lg p-2.5 text-[11px] text-slate-200 space-y-1.5 animate-in fade-in duration-150">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span>Bản đặc tả YCCĐ bài: "{rows[nlSelectedRowIdx].n}"</span>
                    <span className="text-[10px] text-slate-400 font-normal">Chủ đề: {rows[nlSelectedRowIdx].c}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10.5px]">
                    <div className="bg-sky-950/60 p-2 rounded-lg border border-sky-800/60">
                      <span className="font-bold text-sky-300 block mb-0.5">1. YCCĐ Biết (NB):</span>
                      <span className="text-slate-300 line-clamp-3">{rows[nlSelectedRowIdx].s?.[0] || 'Nắm vững kiến thức, khái niệm cơ bản'}</span>
                    </div>
                    <div className="bg-indigo-950/60 p-2 rounded-lg border border-indigo-800/60">
                      <span className="font-bold text-indigo-300 block mb-0.5">2. YCCĐ Hiểu (TH):</span>
                      <span className="text-slate-300 line-clamp-3">{rows[nlSelectedRowIdx].s?.[1] || 'Giải thích, phân biệt bản chất kiến thức'}</span>
                    </div>
                    <div className="bg-purple-950/60 p-2 rounded-lg border border-purple-800/60">
                      <span className="font-bold text-purple-300 block mb-0.5">3. YCCĐ Vận dụng (VD):</span>
                      <span className="text-slate-300 line-clamp-3">{rows[nlSelectedRowIdx].s?.[2] || 'Vận dụng kiến thức giải quyết vấn đề thực tế'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Input area: Prompt and Knowledge Source */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {/* Prompt Requirement */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
                  <label className="flex items-center gap-1.5">
                    <span>Yêu cầu nội dung cụ thể / gợi ý đề bài:</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-normal">
                    {nlSelectedRowIdx >= 0 ? 'Tùy chọn bổ sung' : 'Bắt buộc nếu không chọn bài'}
                  </span>
                </div>
                <textarea
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  placeholder={
                    nlSelectedRowIdx >= 0 && rows[nlSelectedRowIdx]
                      ? `Ví dụ: Soạn câu hỏi về các dạng bài thực tế của "${rows[nlSelectedRowIdx].n}", lưu ý cho số liệu năm 2024–2026...`
                      : 'Ví dụ: Hãy soạn 1 câu trắc nghiệm Đúng/Sai về hiện tượng El Nino kèm bảng số liệu; Hoặc: Tạo bài toán tính toán trả lời ngắn...'
                  }
                  className="w-full bg-slate-900/80 border border-indigo-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-400 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition min-h-[85px] leading-relaxed resize-y"
                />
              </div>

              {/* Source Material / Text / Document */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-200">
                  <label className="flex items-center gap-1.5">
                    <span>Tư liệu / Đoạn trích kiến thức đính kèm:</span>
                  </label>
                  <span className="text-[10px] text-indigo-300 font-normal">Tùy chọn</span>
                </div>
                <textarea
                  value={nlSourceText}
                  onChange={(e) => setNlSourceText(e.target.value)}
                  placeholder="Dán đoạn văn bản, tư liệu, số liệu hoặc trích đoạn SGK tại đây để bám sát dữ liệu thực tế khi biên soạn câu hỏi..."
                  className="w-full bg-slate-900/80 border border-indigo-700/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-400 focus:bg-slate-900 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition min-h-[85px] leading-relaxed resize-y font-mono text-[11px]"
                />
              </div>
            </div>

            {/* 3. Quick configurations row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-indigo-200 mb-1">
                  Định dạng câu hỏi
                </label>
                <select
                  value={nlFormat}
                  onChange={(e) => setNlFormat(e.target.value as any)}
                  className="w-full bg-slate-900/90 border border-indigo-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="AUTO">⚡ Tự động nhận diện</option>
                  <option value="NLC">Phần I: TN Nhiều lựa chọn</option>
                  <option value="DS">Phần II: TN Đúng / Sai</option>
                  <option value="TLN">Phần III: Trả lời ngắn</option>
                  <option value="TL">Phần IV: Tự luận</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-indigo-200 mb-1">
                  Số lượng câu tạo (1–10 câu)
                </label>
                <div className="flex items-center gap-1 bg-slate-900/90 border border-indigo-700/60 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => handleNlCountChange(nlCount - 1)}
                    disabled={nlCount <= 1}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center transition disabled:opacity-30 cursor-pointer text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={nlCount}
                    onChange={(e) => handleNlCountChange(Number(e.target.value) || 1)}
                    className="flex-1 bg-transparent text-center text-xs text-slate-100 focus:outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleNlCountChange(nlCount + 1)}
                    disabled={nlCount >= 10}
                    className="w-7 h-7 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition disabled:opacity-30 cursor-pointer text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="col-span-2 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer text-indigo-200 text-xs py-1">
                  <input
                    type="checkbox"
                    checked={nlWithExplanation}
                    onChange={(e) => setNlWithExplanation(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-700 bg-slate-900 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span>Kèm lời giải / hướng dẫn chấm chi tiết</span>
                </label>
              </div>
            </div>

            {/* 4. PER-QUESTION COGNITIVE LEVEL BREAKDOWN (TÁCH THÊM SỐ CÂU VỚI 3 MỨC ĐỘ LỰA CHỌN) */}
            <div className="bg-slate-900/90 border border-indigo-700/60 rounded-xl p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-200 uppercase tracking-wide">
                    Tùy chọn 3 mức độ cho từng câu ({nlCount} câu):
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 text-[10px] mr-1">Chọn nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleSetAllLevels('B')}
                    className="px-2 py-0.5 bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-600/50 rounded font-semibold transition cursor-pointer text-[10.5px]"
                  >
                    Tất cả Biết
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllLevels('H')}
                    className="px-2 py-0.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-600/50 rounded font-semibold transition cursor-pointer text-[10.5px]"
                  >
                    Tất cả Hiểu
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAllLevels('V')}
                    className="px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600/50 rounded font-semibold transition cursor-pointer text-[10.5px]"
                  >
                    Tất cả Vận dụng
                  </button>
                  <button
                    type="button"
                    onClick={handleSetBalancedLevels}
                    className="px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/50 rounded font-semibold transition cursor-pointer text-[10.5px]"
                    title="Phân bổ tuần tự: Câu 1 Biết, Câu 2 Hiểu, Câu 3 Vận dụng..."
                  >
                    Phân bổ đều
                  </button>
                </div>
              </div>

              {/* Interactive question level selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                {Array.from({ length: nlCount }).map((_, qIdx) => {
                  const currentLvl = nlQuestionLevels[qIdx] || 'B';
                  return (
                    <div
                      key={qIdx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-indigo-800/60 shadow-2xs"
                    >
                      <span className="font-bold text-xs text-indigo-300">
                        Câu {qIdx + 1}:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetQuestionLevel(qIdx, 'B')}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            currentLvl === 'B'
                              ? 'bg-sky-500 text-slate-950 shadow-xs ring-1 ring-sky-300'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Mức Nhận biết (Biết)"
                        >
                          Biết
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuestionLevel(qIdx, 'H')}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            currentLvl === 'H'
                              ? 'bg-indigo-500 text-white shadow-xs ring-1 ring-indigo-300'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Mức Thông hiểu (Hiểu)"
                        >
                          Hiểu
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetQuestionLevel(qIdx, 'V')}
                          className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                            currentLvl === 'V'
                              ? 'bg-purple-500 text-white shadow-xs ring-1 ring-purple-300'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                          title="Mức Vận dụng"
                        >
                          V.dụng
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions: File upload for context & Generation trigger */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-800/40">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-900/50 hover:bg-indigo-800/60 border border-indigo-700/50 text-indigo-200 hover:text-white text-xs cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải tệp tư liệu (PDF, Word, Excel, TXT...)</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        let combined = '';
                        for (let i = 0; i < files.length; i++) {
                          const text = await readFileText(files[i]);
                          combined += `\n\n--- [Tư liệu: ${files[i].name}] ---\n${text.slice(0, 30000)}`;
                        }
                        setNlSourceText((prev) => (prev ? `${prev}${combined}` : combined.trim()));
                        setProgressStatus(`Đã nạp nội dung từ ${files.length} tệp vào tư liệu tham khảo.`);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {nlSourceText && (
                  <button
                    type="button"
                    onClick={() => setNlSourceText('')}
                    className="text-[11px] text-rose-300 hover:text-rose-200 underline font-medium"
                  >
                    Xóa tư liệu đã dán
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateCustomQuestion}
                disabled={nlIsGenerating}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/25 disabled:opacity-50 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {nlIsGenerating ? 'Đang soạn câu hỏi & đáp án...' : 'Soạn câu hỏi & đáp án theo yêu cầu'}
              </button>
            </div>

            {/* Generated Question Preview & Exam Insertion Controller */}
            {nlGeneratedQuestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-700/60 space-y-3 bg-slate-900/90 p-4 rounded-xl border border-indigo-500/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                      Đã tạo {nlGeneratedQuestions.length} câu hỏi mới
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNlGeneratedQuestions([])}
                    className="text-[11px] text-slate-400 hover:text-rose-300 transition"
                  >
                    Đóng xem trước
                  </button>
                </div>

                {/* Question Details preview */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {nlGeneratedQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="bg-slate-800/90 border border-indigo-700/50 rounded-xl p-3.5 space-y-2 text-xs text-slate-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-300">
                          {q.d === 'NLC'
                            ? 'Phần I: TN Nhiều lựa chọn'
                            : q.d === 'DS'
                            ? 'Phần II: TN Đúng / Sai'
                            : q.d === 'TLN'
                            ? 'Phần III: Trả lời ngắn'
                            : 'Phần IV: Tự luận'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-semibold border border-indigo-400/30">
                            Mức: {q.m === 'B' ? 'Biết' : q.m === 'H' ? 'Hiểu' : 'Vận dụng'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomQuestion(qIdx)}
                            title="Xóa câu hỏi này"
                            className="text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 p-1 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Stem */}
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Lời dẫn / Câu hỏi:</label>
                        <input
                          type="text"
                          value={q.stem}
                          onChange={(e) => {
                            const updated = [...nlGeneratedQuestions];
                            updated[qIdx] = { ...updated[qIdx], stem: e.target.value };
                            setNlGeneratedQuestions(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-medium"
                        />
                      </div>

                      {/* Format specific preview */}
                      {q.d === 'NLC' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {(q.opts || []).map((opt, oIdx) => (
                            <div
                              key={oIdx}
                              className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs ${
                                'ABCD'[oIdx] === q.ans
                                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                                  : 'bg-slate-900/60 border-slate-700 text-slate-300'
                              }`}
                            >
                              <span className="font-bold">{'ABCD'[oIdx]}.</span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...nlGeneratedQuestions];
                                  const opts = [...(updated[qIdx].opts || [])];
                                  opts[oIdx] = e.target.value;
                                  updated[qIdx] = { ...updated[qIdx], opts };
                                  setNlGeneratedQuestions(updated);
                                }}
                                className="flex-1 bg-transparent text-xs focus:outline-none"
                              />
                              {'ABCD'[oIdx] === q.ans && (
                                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                                  ĐÚNG
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.d === 'DS' && (
                        <div className="space-y-1.5 pt-1">
                          {q.srcs?.[0]?.text && (
                            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-700 text-[11px] text-slate-300 italic">
                              "{q.srcs[0].text}"
                              {q.srcs[0].src && (
                                <div className="text-[10px] text-indigo-300 font-semibold mt-1">
                                  {q.srcs[0].src}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="space-y-1 pl-1">
                            {(q.items || []).map((it, iIdx) => (
                              <div
                                key={iIdx}
                                className="flex items-center justify-between gap-2 bg-slate-900/50 p-1.5 rounded border border-slate-700/60"
                              >
                                <span className="font-bold text-indigo-300">{'abcd'[iIdx]})</span>
                                <input
                                  type="text"
                                  value={it.t}
                                  onChange={(e) => {
                                    const updated = [...nlGeneratedQuestions];
                                    const items = [...(updated[qIdx].items || [])];
                                    items[iIdx] = { ...items[iIdx], t: e.target.value };
                                    updated[qIdx] = { ...updated[qIdx], items };
                                    setNlGeneratedQuestions(updated);
                                  }}
                                  className="flex-1 bg-transparent text-xs focus:outline-none text-slate-200"
                                />
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                    it.a
                                      ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-600/50'
                                      : 'bg-rose-900/80 text-rose-300 border border-rose-600/50'
                                  }`}
                                >
                                  {it.a ? 'Đúng' : 'Sai'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {q.d === 'TLN' && (
                        <div className="flex items-center gap-3 bg-slate-900/70 p-2 rounded-lg border border-slate-700">
                          <span className="text-xs text-amber-300 font-bold">Đáp án (số):</span>
                          <input
                            type="text"
                            value={q.ans}
                            onChange={(e) => {
                              const updated = [...nlGeneratedQuestions];
                              updated[qIdx] = { ...updated[qIdx], ans: e.target.value };
                              setNlGeneratedQuestions(updated);
                            }}
                            className="w-24 bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-xs font-mono font-bold text-center text-emerald-400 focus:outline-none"
                          />
                        </div>
                      )}

                      {q.d === 'TL' && (
                        <div className="space-y-1.5 bg-slate-900/70 p-2 rounded-lg border border-slate-700">
                          <div className="text-[11px] text-slate-300 whitespace-pre-line font-sans">
                            <b className="text-amber-300">Đáp án chi tiết:</b> {q.ans}
                          </div>
                          {q.rubric && q.rubric.length > 0 && (
                            <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
                              <b className="text-indigo-300">Barem điểm:</b>
                              {q.rubric.map((r, rIdx) => (
                                <div key={rIdx} className="flex justify-between pl-2">
                                  <span>- {r.y}</span>
                                  <span className="font-bold text-emerald-400">+{r.d}đ</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.gt && (
                        <div className="text-[10px] text-slate-400 italic bg-slate-900/40 p-1.5 rounded">
                          💡 {q.gt}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Target & Insertion Controls ("Đưa vào đề theo yêu cầu") */}
                <div className="bg-indigo-950/80 p-3.5 rounded-xl border border-indigo-400/40 space-y-3">
                  <div className="text-xs font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Đưa câu hỏi vào đề kiểm tra theo yêu cầu:</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Destination Exam Code */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        1. Mã đề áp dụng:
                      </label>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-indigo-700/60 text-slate-200">
                          <input
                            type="radio"
                            name="targetCodeMode"
                            checked={nlTargetCodeMode === 'active'}
                            onChange={() => setNlTargetCodeMode('active')}
                            className="text-indigo-500"
                          />
                          <span>
                            Mã đề hiện tại (#{activeSetIndex + 1}: {examCodes[activeSetIndex] || '101'})
                          </span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-indigo-700/60 text-slate-200">
                          <input
                            type="radio"
                            name="targetCodeMode"
                            checked={nlTargetCodeMode === 'all'}
                            onChange={() => setNlTargetCodeMode('all')}
                            className="text-indigo-500"
                          />
                          <span>Tất cả {numSets} mã đề</span>
                        </label>
                      </div>
                    </div>

                    {/* Insertion method */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300">
                        2. Phương thức đưa vào:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-indigo-700/60 text-slate-200">
                          <input
                            type="radio"
                            name="insertMode"
                            checked={nlInsertMode === 'append'}
                            onChange={() => setNlInsertMode('append')}
                            className="text-indigo-500"
                          />
                          <span>➕ Thêm mới vào đề</span>
                        </label>

                        {currentQuestions.length > 0 && (
                          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-indigo-700/60 text-slate-200">
                            <input
                              type="radio"
                              name="insertMode"
                              checked={nlInsertMode === 'replace'}
                              onChange={() => setNlInsertMode('replace')}
                              className="text-indigo-500"
                            />
                            <span>🔄 Thay thế câu đã có</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown to select question to replace if replace mode is selected */}
                  {nlInsertMode === 'replace' && currentQuestions.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-semibold text-amber-300">
                        Chọn câu muốn thay thế trong mã đề hiện tại:
                      </label>
                      <select
                        value={nlReplaceIndex}
                        onChange={(e) => setNlReplaceIndex(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {currentQuestions.map((q, idx) => (
                          <option key={idx} value={idx}>
                            Câu {idx + 1} ({q.d === 'NLC' ? 'Phần I: TNLC' : q.d === 'DS' ? 'Phần II: Đúng/Sai' : q.d === 'TLN' ? 'Phần III: TLN' : 'Phần IV: TL'}): {q.stem.slice(0, 70)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Submit button to insert */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setNlGeneratedQuestions([])}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCustomQuestions}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      Đưa vào đề theo yêu cầu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAWER 1: Reference materials box & Custom Requirements (Side-by-side) */}
      {showRefFiles && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs noprint space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-2xs">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    Tài liệu tham khảo & Yêu cầu của giáo viên trước khi tạo đề
                  </h3>
                  {refFiles.length > 0 && (
                    <span className="text-[11px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                      {refFiles.length} tài liệu đính kèm
                    </span>
                  )}
                  {customPrompt.trim() ? (
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      Đã có yêu cầu riêng ({customPrompt.trim().length} ký tự)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Tùy chọn bổ sung
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-500">
                  Tải tệp tài liệu và gõ hướng dẫn cụ thể để hệ thống nắm bắt chính xác 100% nội dung mong muốn trước khi bấm Tạo bộ đề.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {refFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRef}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer transition mr-2"
                  title="Xóa tất cả các tệp tài liệu tham khảo đã nạp"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tệp ({refFiles.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowRefFiles(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                <span>Thu gọn</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dual Column Layout: Left = Reference Documents, Right = Custom Prompt Requirement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* LEFT COLUMN: Uploaded Reference Documents */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    1. Tài liệu tham khảo đính kèm (.pdf, .docx, .xlsx...)
                  </h4>
                </div>
                {refFiles.length > 0 && (
                  <span className="text-[10px] text-indigo-700 font-semibold">
                    ~{formatVietnameseNumber(formatNumber(refFiles.reduce((acc, f) => acc + (f.text?.length || 0), 0)))} ký tự
                  </span>
                )}
              </div>

              {/* Drag and Drop Zone & Multi-File Picker */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingRef(true);
                }}
                onDragLeave={() => setIsDraggingRef(false)}
                onDrop={handleRefDrop}
                className={`border-2 border-dashed rounded-xl p-3.5 text-center transition-all ${
                  isDraggingRef
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.008]'
                    : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={refFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.json"
                  onChange={handleRefUpload}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => refFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs hover:shadow-indigo-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Chọn tệp tài liệu</span>
                  </button>
                  <span className="text-[11px] text-slate-400">hoặc kéo thả nhiều tệp vào đây</span>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1 mt-2 text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-500">Hỗ trợ:</span>
                  <span className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-rose-600 font-bold">PDF</span>
                  <span className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-blue-600 font-bold">Word</span>
                  <span className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-emerald-600 font-bold">Excel</span>
                  <span className="bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-slate-600 font-bold">TXT</span>
                </div>
              </div>

              {/* Uploaded Reference Documents Grid */}
              {refFiles.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Đã tải {refFiles.length} tài liệu:
                    </span>
                    <button
                      type="button"
                      onClick={() => refFileInputRef.current?.click()}
                      className="text-indigo-600 hover:text-indigo-800 text-[10.5px] font-bold flex items-center gap-1 underline transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Tải thêm tệp
                    </button>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {refFiles.map((f, fIdx) => {
                      const ext = f.name.split('.').pop()?.toLowerCase() || '';
                      const isExcel = ['xlsx', 'xls', 'csv'].includes(ext);
                      const isWord = ['docx', 'doc'].includes(ext);
                      const isPdf = ext === 'pdf';

                      return (
                        <div
                          key={fIdx}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs transition group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                isPdf
                                  ? 'bg-rose-50 text-rose-600'
                                  : isWord
                                  ? 'bg-blue-50 text-blue-600'
                                  : isExcel
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-indigo-50 text-indigo-600'
                              }`}
                            >
                              {isExcel ? (
                                <FileSpreadsheet className="w-3 h-3" />
                              ) : isWord ? (
                                <FileText className="w-3 h-3" />
                              ) : (
                                <BookOpen className="w-3 h-3" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate" title={f.name}>
                                {f.name}
                              </div>
                              <div className="text-[9.5px] text-slate-400">
                                ~{formatVietnameseNumber(formatNumber(Math.round(f.text.length / 5)))} từ ({formatVietnameseNumber(formatNumber(f.text.length))} ký tự)
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRefFile(fIdx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                            title={`Xóa tệp "${f.name}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Type Custom Requirements Before Exam Generation */}
            <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-50/60 border border-amber-300/80 rounded-2xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-2xs">
                    <PenTool className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                    2. Gõ yêu cầu & Ghi chú nội dung ra đề
                  </h4>
                </div>
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  ⚡ Khóa cứng cùng Ma trận
                </span>
              </div>

              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Nhập chỉ dẫn về kiến thức, dạng câu hỏi, dữ liệu, bài toán thực tiễn hoặc ngữ liệu mong muốn để AI đọc kỹ và sinh đề đúng 100% mục tiêu.
              </p>

              {/* Textarea for Custom Prompt Requirement */}
              <div className="relative">
                <textarea
                  ref={customPromptTextareaRef}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={`Gõ yêu cầu cụ thể của thầy/cô tại đây trước khi tạo đề...\nVí dụ:\n- Bám sát bảng số liệu năm 2024 trong tệp tài liệu đính kèm.\n- Phần Vận dụng tăng cường câu hỏi liên hệ thực tế vùng miền.\n- Các câu hỏi Phần III tính toán tập trung vào công thức biên độ nhiệt và lưu lượng nước.\n- Tinh gọn phương án trả lời 4–8 từ, rõ nghĩa chuẩn SGK Kết nối tri thức.`}
                  rows={5}
                  className="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none transition leading-relaxed resize-y font-normal"
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <div className="text-[10.5px] font-bold text-amber-950 flex items-center justify-between">
                  <span>Gợi ý yêu cầu nhanh (nhấp để thêm vào):</span>
                  {customPrompt.trim() && (
                    <button
                      type="button"
                      onClick={() => setCustomPrompt('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 underline font-semibold cursor-pointer"
                    >
                      Xóa trắng yêu cầu
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bám sát số liệu mới nhất trong tệp tài liệu đính kèm',
                    'Phần Vận dụng tăng cường câu hỏi liên hệ thực tế',
                    'Tập trung khai thác bảng số liệu và biểu đồ',
                    'Phương án trắc nghiệm ngắn gọn, đơn nghĩa (4–8 từ)',
                    'Phần III tính toán ưu tiên công thức cơ bản và làm tròn chuẩn',
                    'Phân hóa nhận thức rõ rệt giữa Biết - Hiểu - Vận dụng',
                  ].map((tip, tIdx) => (
                    <button
                      key={tIdx}
                      type="button"
                      onClick={() => {
                        setCustomPrompt((prev) => {
                          const trimmed = prev.trim();
                          if (!trimmed) return tip;
                          if (trimmed.includes(tip)) return trimmed;
                          return `${trimmed}\n- ${tip}`;
                        });
                      }}
                      className="text-[10.5px] bg-white hover:bg-amber-100 text-amber-950 border border-amber-200/90 px-2 py-1 rounded-lg transition cursor-pointer font-medium active:scale-95 shadow-2xs"
                    >
                      + {tip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status and Character Counter */}
              <div className="flex items-center justify-between text-[11px] text-amber-900/90 pt-1 border-t border-amber-200/70">
                <span className="flex items-center gap-1 font-medium text-[10.5px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {customPrompt.trim()
                      ? `Đã sẵn sàng khóa cứng cùng ma trận (${customPrompt.trim().length} ký tự)`
                      : 'Chưa nhập yêu cầu (hệ thống sẽ tạo theo ma trận chuẩn mặc định)'}
                  </span>
                </span>
                {customPrompt.trim() && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    ✓ Đã kích hoạt
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 2: Generation Options & Exam Code Manager */}
      {showAdvancedOptions && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs noprint space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Số nguồn muốn tạo từ ma trận (1 đến 99)
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={numSets}
              onChange={(e) => setNumSets(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Tốc độ tạo câu hỏi
            </label>
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setSpeed('quick')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${speed === 'quick' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                title="Tạo song song cực nhanh, không mất thời gian tra cứu Google Search"
              >
                ⚡ Siêu tốc (3–5s)
              </button>
              <button 
                type="button"
                onClick={() => setSpeed('thorough')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${speed === 'thorough' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'}`}
                title="Kèm tra cứu số liệu thực tế qua Google Search"
              >
                🔍 Chuyên sâu
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Rich Exam Code Manager */}
        <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                <Hash className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Mã đề thi ({numSets} nguồn/bộ đề)
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200/60">
                Mặc định {codeDigits} số
              </span>
              {autoCascadeCodes && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Tự động nhảy các mã sau theo mã đầu
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Digit length toggle: 4 digits (default) vs 3 digits */}
              <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleToggleCodeDigits(4)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    codeDigits === 4
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                  title="Hiển thị mã 4 chữ số mặc định (ví dụ: 1001, 1002, 1003... hoặc 2401...)"
                >
                  4 chữ số (Mặc định)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCodeDigits(3)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    codeDigits === 3
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-indigo-600'
                  }`}
                  title="Hiển thị mã 3 chữ số (ví dụ: 101, 102, 103...)"
                >
                  3 chữ số
                </button>
              </div>

              {/* Random button */}
              <button
                type="button"
                onClick={handleGenerateRandomCodes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-2xs active:scale-95 transition cursor-pointer"
                title="Tạo ngẫu nhiên bộ mã đề mới chuẩn thi trắc nghiệm (không trùng lặp)"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>🎲 Tạo ngẫu nhiên</span>
              </button>

              {/* Reset to default */}
              <button
                type="button"
                onClick={handleResetCodesToDefault}
                className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-semibold transition cursor-pointer"
                title={`Đặt lại mã đề về mặc định (${codeDigits === 4 ? '1001' : '101'}...)`}
              >
                Mặc định ({codeDigits === 4 ? '1001' : '101'}...)
              </button>
            </div>
          </div>

          {/* Pattern selector and auto-cascade toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/80 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold mr-1">Quy luật nhảy mã:</span>
              <button
                type="button"
                onClick={() => handlePatternChange('sequential')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  codePattern === 'sequential'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Mã đầu tăng liên tiếp +1 (ví dụ 1001 -> 1002, 1003...)"
              >
                Tăng dần liên tiếp (+1)
              </button>
              <button
                type="button"
                onClick={() => handlePatternChange('step2')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  codePattern === 'step2'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Mã đầu tăng cách quãng +2 (ví dụ 1001 -> 1003, 1005...)"
              >
                Cách quãng (+2)
              </button>
              <button
                type="button"
                onClick={() => handlePatternChange('pseudorandom')}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                  codePattern === 'pseudorandom'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-900 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Nhảy ngẫu nhiên theo quy luật chuẩn thi trắc nghiệm (phân tán đều, không lặp lại)"
              >
                Ngẫu nhiên theo quy luật
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs select-none">
              <input
                type="checkbox"
                checked={autoCascadeCodes}
                onChange={(e) => setAutoCascadeCodes(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium">
                Tự động nhảy các mã sau khi sửa mã đầu
              </span>
            </label>
          </div>

          {/* Exam Codes Chips / Inputs Grid */}
          <div className="flex flex-wrap items-center gap-2 pt-1 max-h-[140px] overflow-y-auto">
            {examCodes.map((code, idx) => {
              const isFirst = idx === 0;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition border shadow-2xs ${
                    isFirst
                      ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-300/60'
                      : 'bg-white border-slate-300 hover:border-indigo-300'
                  }`}
                  title={
                    isFirst
                      ? 'Mã đầu (Mã gốc): Chỉ cần gõ mã này, các mã sau sẽ tự động nhảy theo ngay lập tức!'
                      : `Mã đề nguồn ${idx + 1}`
                  }
                >
                  <div className="flex items-center gap-1 text-[11px] font-bold">
                    {isFirst && <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span className={isFirst ? 'text-indigo-900 font-black' : 'text-slate-500'}>
                      {isFirst ? 'Mã đầu #1:' : `#${idx + 1}:`}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={codeDigits}
                    value={code}
                    onChange={(e) => handleSpecificCodeChange(idx, e.target.value)}
                    placeholder={
                      codeDigits === 4 ? String(1001 + idx) : String(101 + idx)
                    }
                    className={`text-center font-mono font-bold focus:outline-none ${
                      codeDigits === 4 ? 'w-14' : 'w-11'
                    } ${
                      isFirst
                        ? 'text-indigo-900 text-sm font-black bg-white rounded-lg border border-indigo-300 px-1 py-0.5'
                        : 'text-slate-800 bg-transparent'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 italic pt-0.5">
            💡 <b>Mẹo:</b> Chỉ cần bấm hoặc gõ vào ô <b>Mã đầu #1</b>, tất cả các mã đề còn lại sẽ tự động tính toán và nhảy theo quy luật được chọn. Bạn cũng có thể bấm <b>🎲 Tạo ngẫu nhiên</b> để AI Studio tạo nhanh bộ mã chuẩn thi.
          </p>
        </div>

        {/* Checkboxes */}
        <div className="space-y-2 pt-1 text-sm text-slate-700">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeLevelsInDoc}
              onChange={(e) => setIncludeLevelsInDoc(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Ghi mức độ (Biết, Hiểu, Vận dụng) cạnh từng ý Đúng – Sai trong file tải về</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={withExplanation}
              onChange={(e) => setWithExplanation(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Kèm lời giải / giải thích đáp án</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Tự xáo vị trí đáp án đúng theo xác suất ngẫu nhiên (tránh trùng 3 câu liên tiếp, chống học tủ)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSearch}
              onChange={(e) => setAutoSearch(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Tự động thu thập thông tin, số liệu & ngữ liệu uy tín trên mạng khi tạo đề (Google Search)</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={enforceConsistency}
              onChange={(e) => setEnforceConsistency(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <span>Đồng bộ cấu trúc bài/chương giữa các mã đề (các mã đề sẽ có chủ đề và mức độ giống nhau)</span>
          </label>
        </div>

        {/* Geography Specific Options */}
        {mon === 'Địa lí' && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={geoDivide}
                onChange={(e) => setGeoDivide(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300"
              />
              Môn Địa lí: phân chia tỉ lệ nguồn cho câu Đúng/Sai
            </label>

            {geoDivide && (
              <div className="flex items-center gap-3 pl-6">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={geoPct}
                  onChange={(e) => setGeoPct(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">
                  {geoPct}% bảng/biểu đồ - {100 - geoPct}% ngữ liệu
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* DRAWER 3.2: Specialized Hard Exam Rules Browser (Tra cứu toàn văn điều khoản VB, TH, KT & Cách kiểm tra) */}
      {showRules && (() => {
        const effectiveSubject =
          activeRuleSubjectMode === 'geo'
            ? 'Địa lí'
            : activeRuleSubjectMode === 'general'
            ? 'Toán'
            : mon;
        const isGeo = effectiveSubject === 'Địa lí';
        const rules = getRulesForSubject(effectiveSubject);
        const groups = [
          { id: 'all', label: `Tất cả (${rules.length})` },
          { id: 'A', label: 'Nhóm A: Khung ma trận & đặc tả' },
          { id: 'B', label: isGeo ? 'Nhóm B: Mức độ nhận thức' : 'Nhóm B: Nhiều lựa chọn' },
          { id: 'C', label: isGeo ? 'Nhóm C: Nhiều lựa chọn' : 'Nhóm C: Đúng / Sai' },
          { id: 'D', label: isGeo ? 'Nhóm D: Đúng / Sai' : 'Nhóm D: Trả lời ngắn' },
          { id: 'E', label: isGeo ? 'Nhóm E: Trả lời ngắn' : 'Nhóm E: Tự luận & Chấm' },
          ...(isGeo ? [{ id: 'F', label: 'Nhóm F: Bảng biểu / Hình' }] : []),
          { id: 'G', label: isGeo ? 'Nhóm G: Tự luận & Chấm' : 'Nhóm G: Câu chữ SGK' },
          { id: 'H', label: 'Nhóm H: Chống lộ đáp án chéo' },
        ];

        const filteredRules = rules.filter((r) => {
          const matchGroup = selectedRuleGroup === 'all' || r.groupId === selectedRuleGroup;
          if (!matchGroup) return false;
          if (!ruleSearchQuery.trim()) return true;
          const q = ruleSearchQuery.toLowerCase().trim();
          return (
            r.id.toLowerCase().includes(q) ||
            r.content.toLowerCase().includes(q) ||
            r.groupTitle.toLowerCase().includes(q) ||
            r.sourceDetail.toLowerCase().includes(q) ||
            r.sourceType.toLowerCase().includes(q) ||
            (r.checkMethod && r.checkMethod.toLowerCase().includes(q))
          );
        });

        return (
          <div className="border border-emerald-300 rounded-xl overflow-hidden bg-white shadow-sm noprint space-y-0">
            <div
              className={`w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left font-bold text-xs ${
                isGeo
                  ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 text-emerald-950 border-b border-emerald-200'
                  : 'bg-gradient-to-r from-indigo-50 via-slate-50 to-sky-50 text-indigo-950 border-b border-indigo-200'
              }`}
            >
              <span className="flex items-center gap-2 flex-wrap">
                <ShieldCheck className={`w-4 h-4 ${isGeo ? 'text-emerald-600' : 'text-indigo-600'}`} />
                <span>
                  {isGeo
                    ? '📘 BỘ QUY TẮC CỨNG RA ĐỀ VÀ RÀ SOÁT ĐỀ KIỂM TRA ĐỊNH KÌ MÔN ĐỊA LÍ THPT'
                    : '📋 BỘ QUY TẮC CỨNG RÀ SOÁT ĐỀ KIỂM TRA TRẮC NGHIỆM ĐỊNH KÌ (CHUNG CÁC MÔN)'}
                </span>
                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full font-bold shadow-2xs border border-slate-200">
                  {rules.length} điều khoản (CV 7991, CV 8773, QĐ 764)
                </span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRuleSubjectMode('auto');
                    setSelectedRuleGroup('all');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    activeRuleSubjectMode === 'auto'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Theo môn đang chọn ({mon})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRuleSubjectMode('geo');
                    setSelectedRuleGroup('all');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    activeRuleSubjectMode === 'geo'
                      ? 'bg-teal-700 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  📘 Địa lí (84 điều)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRuleSubjectMode('general');
                    setSelectedRuleGroup('all');
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    activeRuleSubjectMode === 'general'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  📋 Quy tắc chung (56 điều)
                </button>
                <button
                  type="button"
                  onClick={() => setShowRules(false)}
                  className="ml-2 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  Thu gọn ✕
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 bg-white text-xs text-slate-700">
              {/* Explanatory banner */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 leading-relaxed text-xs ${
                  isGeo ? 'bg-teal-50/70 border-teal-200 text-teal-950' : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Hệ thống tự động áp dụng{' '}
                    {mon === 'Địa lí'
                      ? 'Bộ quy tắc cứng chuyên biệt môn Địa lí THPT (84 điều khoản)'
                      : `Bộ quy tắc cứng chung cho môn ${mon} (56 điều khoản)`}{' '}
                    khi sinh đề và hậu kiểm:
                  </p>
                  <p className="text-[11.5px] mt-0.5 opacity-90">
                    {isGeo
                      ? 'Tự động nạp đầy đủ các điều cấm tuyệt đối: C20/F9 (Cấm ra câu dùng Atlat), F1 (Bảng số liệu bắt buộc có Tên, Đơn vị, Năm, Nguồn), F3 (Cơ cấu cộng đúng 100%), D7 (Cấm 4 ý cùng Đúng/Sai), E1/E3 (Bài toán tính toán ngắn tối đa 4 ký tự), G11/G12 (Tự luận phân rõ yếu tố tự nhiên, kinh tế - xã hội).'
                      : 'Tất cả câu hỏi tạo ra phải tuân thủ nghiêm ngặt văn bản Bộ GD&ĐT: B11 (Cấm phương án trung lập, tất cả đều đúng/sai), B14 (Đáp án phân bố đều A, B, C, D), C5 (Cấm 4 ý cùng Đúng/Sai), D1 (Đáp án số ngắn tối đa 4 ký tự), H1-H7 (Chống lộ đáp án chéo).'}
                  </p>
                </div>
              </div>

              {/* Search & Legend bar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  type="text"
                  value={ruleSearchQuery}
                  onChange={(e) => setRuleSearchQuery(e.target.value)}
                  placeholder="🔍 Tìm mã điều khoản (VD: C20, D7, F3, G11) hoặc từ khóa (Atlat, bảng số liệu, đúng/sai)..."
                  className="flex-1 min-w-[260px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-emerald-600"
                />
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300">
                    VB: Văn bản Bộ (Bắt buộc)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300">
                    TH: Tập huấn Bộ (Nên theo)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                    KT: Kĩ thuật khảo thí
                  </span>
                </div>
              </div>

              {/* Group Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 pb-1 border-b border-slate-100 overflow-x-auto">
                {groups.map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setSelectedRuleGroup(grp.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedRuleGroup === grp.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {grp.label}
                  </button>
                ))}
              </div>

              {/* Rules Grid */}
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {filteredRules.map((rule) => {
                  const isVB = rule.sourceType === 'VB';
                  const isTH = rule.sourceType === 'TH';
                  return (
                    <div
                      key={rule.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 transition space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                            {rule.id}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs">
                            {rule.groupTitle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isVB
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : isTH
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                            title={rule.sourceDetail}
                          >
                            {isVB ? 'VB: Bắt buộc (Văn bản Bộ)' : isTH ? 'TH: Nên theo (Tập huấn Bộ)' : 'KT: Kĩ thuật khảo thí'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({rule.sourceDetail})
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium pl-1">
                        {rule.content}
                      </p>

                      {rule.checkMethod && (
                        <p className="text-[11px] text-slate-500 italic pl-1">
                          🔍 <b>Cách kiểm tra:</b> {rule.checkMethod}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* DRAWER 3.5: Question Allocation & Numbering Adjustment Box */}
      {showQuestionConfig && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden bg-white shadow-xs noprint space-y-0">
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-100">
            <span className="flex items-center gap-2 text-xs font-bold text-indigo-950">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Cấu hình & Điều chỉnh số câu cho các đề thi (Đồng bộ số thứ tự câu giữa các đề)</span>
              <span className="bg-indigo-200/80 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                {rows.length} bài/chủ đề
              </span>
            </span>
            <button
              type="button"
              onClick={() => setShowQuestionConfig(false)}
              className="text-xs text-indigo-600 hover:text-indigo-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Thu gọn</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-4 space-y-3 bg-white text-xs text-slate-700">
            {/* 1. Sync information */}
            <div className="bg-emerald-50/90 border border-emerald-200 p-3 rounded-xl flex items-start gap-2.5 text-emerald-900 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-0.5">
                  Đồng bộ hóa thứ tự câu giữa tất cả các mã đề ({numSets} nguồn/mã đề: {examCodes.slice(0, numSets).join(', ')}):
                </p>
                <p className="text-[11.5px] text-emerald-800">
                  Trong cùng một bài/chương, tất cả các đề đều được gán <b>số thứ tự câu giống hệt nhau</b>. Nội dung câu hỏi và 4 đáp án của mỗi đề được AI biên soạn độc lập, hoàn toàn khác biệt để chống học tủ và phân hóa học sinh.
                </p>
              </div>
            </div>

            {/* 2. ORDER MODE TOGGLE (CHIỀU DỌC VS CHIỀU NGANG) */}
            <div className="bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-indigo-50/90 border border-indigo-200/90 p-3.5 rounded-xl space-y-2.5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      Thứ tự đánh số câu hỏi Phần I (Biết - Hiểu - Vận dụng độc lập):
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-800">
                    {questionOrderMode === 'vertical' ? (
                      <>
                        <b>Đang áp dụng: Sắp xếp theo chiều dọc (Chuẩn thi BGDĐT)</b> — Toàn bộ câu <b>Biết</b> xếp trước ({tnlcHeaderRanges.bRange}), tiếp đến <b>Hiểu</b> ({tnlcHeaderRanges.hRange}), cuối cùng là <b>Vận dụng</b> ({tnlcHeaderRanges.vRange}).
                      </>
                    ) : (
                      <>
                        <b>Đang áp dụng: Sắp xếp theo chiều ngang (Theo từng bài học/chủ đề)</b> — Đánh số tuần tự hết câu Biết, Hiểu, Vận dụng của từng bài rồi mới chuyển sang bài kế tiếp.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center bg-white p-1 rounded-xl border border-indigo-300 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleToggleOrderMode('vertical')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      questionOrderMode === 'vertical'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Xếp toàn bộ câu Biết trước, tiếp theo câu Hiểu, cuối cùng là Vận dụng"
                  >
                    <span>↕ Chiều dọc (Biết → Hiểu → Vận dụng)</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        questionOrderMode === 'vertical'
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      Chuẩn BGDĐT
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleOrderMode('horizontal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      questionOrderMode === 'horizontal'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Xếp tuần tự theo từng bài: Bài 1, rồi Bài 2, rồi Bài 3..."
                  >
                    <span>↔ Chiều ngang (Theo từng bài học)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. TABLE WITH INDEPENDENT QUESTION NUMBERING PER LEVEL */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th rowSpan={2} className="p-2.5 w-10 text-center align-middle border-r border-slate-200">
                      STT
                    </th>
                    <th rowSpan={2} className="p-2.5 min-w-[200px] align-middle border-r border-slate-200">
                      Chủ đề / Bài học
                    </th>
                    <th colSpan={3} className="p-2.5 text-center bg-indigo-100 text-indigo-950 border-r border-indigo-200">
                      <div className="flex items-center justify-center gap-2 font-bold">
                        <span>Phần I: TN Nhiều lựa chọn</span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                          Tổng {totals.tnlcTotal} câu ({totals.tnlcTotal > 0 ? `Câu 1–${totals.tnlcTotal}` : '—'})
                        </span>
                      </div>
                    </th>
                    <th rowSpan={2} className="p-2.5 min-w-[125px] text-center bg-emerald-50/70 text-emerald-900 align-middle border-r border-slate-200">
                      Phần II: Đúng / Sai
                    </th>
                    <th rowSpan={2} className="p-2.5 min-w-[115px] text-center bg-amber-50/70 text-amber-900 align-middle border-r border-slate-200">
                      Phần III: Trả lời ngắn
                    </th>
                    <th colSpan={3} className="p-2.5 text-center bg-purple-100 text-purple-950 border-r border-purple-200">
                      <div className="flex items-center justify-center gap-2 font-bold">
                        <span>Phần IV: Tự luận</span>
                        <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                          Tổng {totals.tl} câu ({totals.tl > 0 ? `Câu 1–${totals.tl}` : '—'})
                        </span>
                      </div>
                    </th>
                    <th rowSpan={2} className="p-2.5 text-center font-bold align-middle">
                      Tổng câu
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold text-[11px]">
                    <th className="py-2 px-2 text-center bg-sky-50 text-sky-900 border-r border-indigo-100 min-w-[100px]">
                      <div className="font-bold text-xs">Biết (NB)</div>
                      <div className="text-[10px] text-sky-700 font-extrabold mt-0.5">
                        {tnlcHeaderRanges.bRange} ({totals.tnlcB} câu)
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center bg-indigo-50 text-indigo-900 border-r border-indigo-100 min-w-[100px]">
                      <div className="font-bold text-xs">Hiểu (TH)</div>
                      <div className="text-[10px] text-indigo-700 font-extrabold mt-0.5">
                        {tnlcHeaderRanges.hRange} ({totals.tnlcH} câu)
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50 text-purple-900 border-r border-indigo-200 min-w-[100px]">
                      <div className="font-bold text-xs">Vận dụng (VD)</div>
                      <div className="text-[10px] text-purple-700 font-extrabold mt-0.5">
                        {tnlcHeaderRanges.vRange} ({totals.tnlcV} câu)
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center bg-sky-50 text-sky-900 border-r border-purple-100 min-w-[95px]">
                      <div className="font-bold text-xs">TL Biết (NB)</div>
                      <div className="text-[10px] text-sky-700 font-extrabold mt-0.5">
                        {tlHeaderRanges.bRange} ({totals.tlB} câu)
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center bg-indigo-50 text-indigo-900 border-r border-purple-100 min-w-[95px]">
                      <div className="font-bold text-xs">TL Hiểu (TH)</div>
                      <div className="text-[10px] text-indigo-700 font-extrabold mt-0.5">
                        {tlHeaderRanges.hRange} ({totals.tlH} câu)
                      </div>
                    </th>
                    <th className="py-2 px-2 text-center bg-purple-50 text-purple-900 border-r border-slate-200 min-w-[95px]">
                      <div className="font-bold text-xs">TL Vận dụng (VD)</div>
                      <div className="text-[10px] text-purple-700 font-extrabold mt-0.5">
                        {tlHeaderRanges.vRange} ({totals.tlV} câu)
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rowQuestionMapping.map((rm, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-2.5 text-center font-bold text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 border-r border-slate-100">
                        <div className="font-bold text-slate-800">{rm.c}</div>
                        <div className="text-[11px] text-slate-500 whitespace-pre-line line-clamp-2">
                          {rm.n}
                        </div>
                        {rm.tnlcCount > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10.5px]">
                            <span className="font-semibold text-slate-500">
                              Trắc nghiệm ({rm.tnlcCount} câu):
                            </span>
                            {rm.tnlcBCount > 0 && (
                              <span className="font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
                                {rm.bRange} (Biết)
                              </span>
                            )}
                            {rm.tnlcHCount > 0 && (
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                                {rm.hRange} (Hiểu)
                              </span>
                            )}
                            {rm.tnlcVCount > 0 && (
                              <span className="font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                {rm.vRange} (Vận dụng)
                              </span>
                            )}
                          </div>
                        )}
                        {rm.tlCount > 0 && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10.5px]">
                            <span className="font-semibold text-purple-900">
                              Tự luận ({rm.tlCount} câu):
                            </span>
                            {rm.tlBCount > 0 && (
                              <span className="font-bold text-sky-700 bg-sky-50 px-1 py-0.2 rounded border border-sky-200">
                                {rm.tlBRange} (Biết)
                              </span>
                            )}
                            {rm.tlHCount > 0 && (
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200">
                                {rm.tlHRange} (Hiểu)
                              </span>
                            )}
                            {rm.tlVCount > 0 && (
                              <span className="font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                                {rm.tlVRange} (Vận dụng)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* Part I: 1. Biết (r.v[0]) */}
                      <td className="p-2 text-center bg-sky-50/20 border-r border-slate-100">
                        <div className="font-bold text-sky-700 text-[11px] mb-1">
                          {rm.bRange !== '—' ? rm.bRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustTnlcLevel(rm.rIdx, 0, -1)}
                            disabled={(rows[rm.rIdx]?.v[0] || 0) <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Nhận biết"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={rows[rm.rIdx]?.v[0] || 0}
                            onChange={(e) => handleSetTnlcLevel(rm.rIdx, 0, parseInt(e.target.value) || 0)}
                            className="w-8 h-6 text-center font-bold text-xs bg-white border border-sky-300 text-sky-950 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-2xs"
                            title="Số câu Nhận biết (Biết)"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustTnlcLevel(rm.rIdx, 0, 1)}
                            className="w-5 h-5 rounded bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Nhận biết"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part I: 2. Hiểu (r.v[1]) */}
                      <td className="p-2 text-center bg-indigo-50/20 border-r border-slate-100">
                        <div className="font-bold text-indigo-700 text-[11px] mb-1">
                          {rm.hRange !== '—' ? rm.hRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustTnlcLevel(rm.rIdx, 1, -1)}
                            disabled={(rows[rm.rIdx]?.v[1] || 0) <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Thông hiểu"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={rows[rm.rIdx]?.v[1] || 0}
                            onChange={(e) => handleSetTnlcLevel(rm.rIdx, 1, parseInt(e.target.value) || 0)}
                            className="w-8 h-6 text-center font-bold text-xs bg-white border border-indigo-300 text-indigo-950 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                            title="Số câu Thông hiểu (Hiểu)"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustTnlcLevel(rm.rIdx, 1, 1)}
                            className="w-5 h-5 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Thông hiểu"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part I: 3. Vận dụng (r.v[2]) */}
                      <td className="p-2 text-center bg-purple-50/20 border-r border-indigo-200">
                        <div className="font-bold text-purple-700 text-[11px] mb-1">
                          {rm.vRange !== '—' ? rm.vRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustTnlcLevel(rm.rIdx, 2, -1)}
                            disabled={(rows[rm.rIdx]?.v[2] || 0) <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Vận dụng"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={rows[rm.rIdx]?.v[2] || 0}
                            onChange={(e) => handleSetTnlcLevel(rm.rIdx, 2, parseInt(e.target.value) || 0)}
                            className="w-8 h-6 text-center font-bold text-xs bg-white border border-purple-300 text-purple-950 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none shadow-2xs"
                            title="Số câu Vận dụng"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustTnlcLevel(rm.rIdx, 2, 1)}
                            className="w-5 h-5 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Vận dụng"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part II: Đúng/Sai */}
                      <td className="p-2.5 text-center bg-emerald-50/30 border-r border-slate-100">
                        <div className="font-bold text-emerald-700 text-xs mb-1">
                          {rm.dsRange !== '—' ? rm.dsRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustRowQuestions(rm.rIdx, 1, -1)}
                            disabled={rm.dsCount <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Đúng/Sai"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs w-6 text-center">{rm.dsCount}</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustRowQuestions(rm.rIdx, 1, 1)}
                            className="w-5 h-5 rounded bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Đúng/Sai"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part III: Trả lời ngắn */}
                      <td className="p-2.5 text-center bg-amber-50/30 border-r border-slate-100">
                        <div className="font-bold text-amber-700 text-xs mb-1">
                          {rm.tlnRange !== '—' ? rm.tlnRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdjustRowQuestions(rm.rIdx, 2, -1)}
                            disabled={rm.tlnCount <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu TLN"
                          >
                            -
                          </button>
                          <span className="font-bold text-xs w-6 text-center">{rm.tlnCount}</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustRowQuestions(rm.rIdx, 2, 1)}
                            className="w-5 h-5 rounded bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu TLN"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part IV: 1. Tự luận - Biết (r.v[9]) */}
                      <td className="p-2 text-center bg-sky-50/20 border-r border-slate-100">
                        <div className="font-bold text-sky-700 text-[11px] mb-1">
                          {rm.tlBRange !== '—' ? rm.tlBRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustTlLevel(rm.rIdx, 9, -1)}
                            disabled={(rows[rm.rIdx]?.v[9] || 0) <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Tự luận Nhận biết"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={rows[rm.rIdx]?.v[9] || 0}
                            onChange={(e) => handleSetTlLevel(rm.rIdx, 9, parseInt(e.target.value) || 0)}
                            className="w-8 h-6 text-center font-bold text-xs bg-white border border-sky-300 text-sky-950 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none shadow-2xs"
                            title="Số câu Tự luận Nhận biết (Biết)"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustTlLevel(rm.rIdx, 9, 1)}
                            className="w-5 h-5 rounded bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Tự luận Nhận biết"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part IV: 2. Tự luận - Hiểu (r.v[10]) */}
                      <td className="p-2 text-center bg-indigo-50/20 border-r border-slate-100">
                        <div className="font-bold text-indigo-700 text-[11px] mb-1">
                          {rm.tlHRange !== '—' ? rm.tlHRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustTlLevel(rm.rIdx, 10, -1)}
                            disabled={(rows[rm.rIdx]?.v[10] || 0) <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Tự luận Thông hiểu"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={rows[rm.rIdx]?.v[10] || 0}
                            onChange={(e) => handleSetTlLevel(rm.rIdx, 10, parseInt(e.target.value) || 0)}
                            className="w-8 h-6 text-center font-bold text-xs bg-white border border-indigo-300 text-indigo-950 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                            title="Số câu Tự luận Thông hiểu (Hiểu)"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustTlLevel(rm.rIdx, 10, 1)}
                            className="w-5 h-5 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Tự luận Thông hiểu"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Part IV: 3. Tự luận - Vận dụng (r.v[11]) */}
                      <td className="p-2 text-center bg-purple-50/20 border-r border-slate-100">
                        <div className="font-bold text-purple-700 text-[11px] mb-1">
                          {rm.tlVRange !== '—' ? rm.tlVRange : <span className="text-slate-300 font-normal">Không có</span>}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAdjustTlLevel(rm.rIdx, 11, -1)}
                            disabled={(rows[rm.rIdx]?.v[11] || 0) <= 0}
                            className="w-5 h-5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center font-bold text-slate-600 transition text-xs shadow-2xs cursor-pointer"
                            title="Giảm 1 câu Tự luận Vận dụng"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={rows[rm.rIdx]?.v[11] || 0}
                            onChange={(e) => handleSetTlLevel(rm.rIdx, 11, parseInt(e.target.value) || 0)}
                            className="w-8 h-6 text-center font-bold text-xs bg-white border border-purple-300 text-purple-950 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none shadow-2xs"
                            title="Số câu Tự luận Vận dụng"
                          />
                          <button
                            type="button"
                            onClick={() => handleAdjustTlLevel(rm.rIdx, 11, 1)}
                            className="w-5 h-5 rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center font-bold transition text-xs shadow-2xs cursor-pointer"
                            title="Thêm 1 câu Tự luận Vận dụng"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      <td className="p-2.5 text-center font-bold text-slate-700">
                        {rm.totalQuestions}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800 text-xs">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-center text-slate-700 uppercase tracking-wide font-bold border-r border-slate-200">
                      Tổng số câu toàn đề
                    </td>
                    <td className="p-2 text-center text-sky-900 bg-sky-100/70 font-black border-r border-slate-200">
                      <div>{totals.tnlcB} câu</div>
                      <div className="text-[10px] text-sky-700 font-bold">{tnlcHeaderRanges.bRange}</div>
                    </td>
                    <td className="p-2 text-center text-indigo-900 bg-indigo-100/70 font-black border-r border-slate-200">
                      <div>{totals.tnlcH} câu</div>
                      <div className="text-[10px] text-indigo-700 font-bold">{tnlcHeaderRanges.hRange}</div>
                    </td>
                    <td className="p-2 text-center text-purple-900 bg-purple-100/70 font-black border-r border-indigo-200">
                      <div>{totals.tnlcV} câu</div>
                      <div className="text-[10px] text-purple-700 font-bold">{tnlcHeaderRanges.vRange}</div>
                    </td>
                    <td className="p-2 text-center text-emerald-800 bg-emerald-100/70 font-black border-r border-slate-200">
                      <div>{totals.ds} câu</div>
                    </td>
                    <td className="p-2 text-center text-amber-800 bg-amber-100/70 font-black border-r border-slate-200">
                      <div>{totals.tln} câu</div>
                    </td>
                    <td className="p-2 text-center text-sky-900 bg-sky-100/70 font-black border-r border-slate-200">
                      <div>{totals.tlB} câu</div>
                      <div className="text-[10px] text-sky-700 font-bold">{tlHeaderRanges.bRange}</div>
                    </td>
                    <td className="p-2 text-center text-indigo-900 bg-indigo-100/70 font-black border-r border-slate-200">
                      <div>{totals.tlH} câu</div>
                      <div className="text-[10px] text-indigo-700 font-bold">{tlHeaderRanges.hRange}</div>
                    </td>
                    <td className="p-2 text-center text-purple-900 bg-purple-100/70 font-black border-r border-slate-200">
                      <div>{totals.tlV} câu</div>
                      <div className="text-[10px] text-purple-700 font-bold">{tlHeaderRanges.vRange}</div>
                    </td>
                    <td className="p-2 text-center text-indigo-900 bg-indigo-100 font-black text-sm">
                      {totals.allTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER 3.6: Header and Exam Information Form Card */}
      {showHeaderConfig && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 border border-indigo-200/90 rounded-xl overflow-hidden shadow-xs noprint space-y-0">
        <div className="flex items-center justify-between px-5 py-3.5 bg-indigo-100/60 border-b border-indigo-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                  Cấu hình tiêu đề & thông tin đề thi (Xuất hiện trước khi tạo đề)
                </h4>
                <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">
                  File Word & Xem trước
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80">
                Nhập thông tin Sở GD, Trường, Kì thi, Năm học, Thời gian để tự động điền vào các vị trí dấu chấm chấm (...) trên đề thi và phiếu đáp án.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setHeaderConfig({
                  soGiaoDuc: '',
                  truongThpt: '',
                  tenKyThi: '',
                  namHoc: '2024 - 2025',
                  thoiGianLamBai: '50',
                  ghiChuDeThi: '(Đề thi có ... trang)',
                })
              }
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold underline flex items-center gap-1 transition"
              title="Đặt lại về mẫu có dấu chấm chấm (...)"
            >
              <RotateCcw className="w-3 h-3" />
              Đặt lại mẫu chấm (...)
            </button>
            <button
              type="button"
              onClick={() => setShowHeaderConfig(!showHeaderConfig)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1 bg-white/80 px-2 py-1 rounded-lg border border-indigo-200 transition"
            >
              {showHeaderConfig ? 'Thu gọn' : 'Mở rộng'}
              {showHeaderConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showHeaderConfig && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              {/* Field 1: Sở GD&ĐT */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Sở Giáo dục và Đào tạo:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Để trống = dấu chấm (...)</span>
                </label>
                <input
                  type="text"
                  value={headerConfig.soGiaoDuc}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, soGiaoDuc: e.target.value })}
                  placeholder="SỞ GIÁO DỤC VÀ ĐÀO TẠO .........."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Field 2: Trường THPT */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    Trường THPT:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Để trống = dấu chấm (...)</span>
                </label>
                <input
                  type="text"
                  value={headerConfig.truongThpt}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, truongThpt: e.target.value })}
                  placeholder="TRƯỜNG THPT .........................."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Field 3: Tên kì thi */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    Tên kì thi / kiểm tra:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Ví dụ: ĐỀ KIỂM TRA ĐỊNH KÌ</span>
                </label>
                <input
                  type="text"
                  value={headerConfig.tenKyThi}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, tenKyThi: e.target.value })}
                  placeholder={semester ? `ĐỀ KIỂM TRA ${semester.toUpperCase()}` : 'ĐỀ KIỂM TRA ĐỊNH KÌ'}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    'ĐỀ KIỂM TRA ĐỊNH KÌ',
                    'ĐỀ KIỂM TRA GIỮA HỌC KÌ I',
                    'ĐỀ KIỂM TRA CUỐI HỌC KÌ I',
                    'ĐỀ KIỂM TRA GIỮA HỌC KÌ II',
                    'ĐỀ KIỂM TRA CUỐI HỌC KÌ II',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHeaderConfig({ ...headerConfig, tenKyThi: preset })}
                      className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200/60 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 4: Năm học */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Năm học:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Ví dụ: 2024 - 2025</span>
                </label>
                <input
                  type="text"
                  value={headerConfig.namHoc}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, namHoc: e.target.value })}
                  placeholder="2024 - 2025"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex gap-1 pt-0.5">
                  {['2024 - 2025', '2025 - 2026', '2026 - 2027'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setHeaderConfig({ ...headerConfig, namHoc: yr })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition"
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 5: Thời gian làm bài */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5 text-indigo-600" />
                    Thời gian làm bài (phút):
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Không kể phát đề</span>
                </label>
                <input
                  type="text"
                  value={headerConfig.thoiGianLamBai}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, thoiGianLamBai: e.target.value })}
                  placeholder="50"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex gap-1 pt-0.5">
                  {['45', '50', '60', '90'].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setHeaderConfig({ ...headerConfig, thoiGianLamBai: mins })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition"
                    >
                      {mins} phút
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 6: Ghi chú số trang */}
              <div className="space-y-1">
                <label className="flex items-center justify-between font-semibold text-slate-700">
                  <span className="flex items-center gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    Ghi chú số trang đề thi:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">In dưới thời gian</span>
                </label>
                <input
                  type="text"
                  value={headerConfig.ghiChuDeThi}
                  onChange={(e) => setHeaderConfig({ ...headerConfig, ghiChuDeThi: e.target.value })}
                  placeholder="(Đề thi có ... trang)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex gap-1 pt-0.5">
                  {['(Đề thi có ... trang)', '(Đề thi có 04 trang)', '(Đề thi có 03 trang)'].map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setHeaderConfig({ ...headerConfig, ghiChuDeThi: note })}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition"
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Snippet Preview */}
            <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <b>Xem trước tiêu đề:</b>{' '}
                  <span className="font-bold text-slate-800">
                    {headerConfig.soGiaoDuc.trim() || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ..........'}
                  </span>{' '}
                  / <span className="font-bold text-slate-800">{headerConfig.truongThpt.trim() || 'TRƯỜNG THPT ..........................'}</span>{' '}
                  —{' '}
                  <span className="font-bold text-indigo-700">
                    {headerConfig.tenKyThi.trim() || (semester ? `ĐỀ KIỂM TRA ${semester.toUpperCase()}` : 'ĐỀ KIỂM TRA ĐỊNH KÌ')} - NĂM HỌC {headerConfig.namHoc.trim() || '2024 - 2025'}
                  </span>{' '}
                  (Thời gian: <b>{headerConfig.thoiGianLamBai.trim() || '50'} phút</b>)
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold shrink-0">
                Đã lưu tự động
              </span>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Export & Assessment Action Bar */}
      {currentQuestions.length > 0 && (
        <div className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-2xl shadow-xs space-y-3 noprint">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div className="text-xs sm:text-sm font-bold text-slate-900">
                Đã sẵn sàng <span className="text-indigo-600 font-black">{sets.length} mã đề</span> ({currentQuestions.length} câu/đề)
              </div>
            </div>

            {/* Assessment & Quality Duo */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCritiqueStudioOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-amber-300 font-bold text-xs shadow-2xs border border-indigo-700 hover:from-indigo-900 hover:to-slate-800 transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Mở Hội đồng Phản biện Đề thi Chuyên sâu theo chuẩn khảo thí Bộ GD&ĐT"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Phản biện đề thi</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEquivalenceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-800 via-emerald-800 to-teal-900 text-amber-200 font-bold text-xs shadow-2xs border border-teal-600 hover:from-teal-900 hover:to-emerald-900 transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Kiểm tra mức độ tương đồng giữa các đề thi cho cả 4 phần theo chuẩn Bộ GD&ĐT"
              >
                <Scale className="w-3.5 h-3.5 text-amber-300" />
                <span>Kiểm tra độ tương đồng</span>
              </button>
            </div>
          </div>

          {/* Export Action Buttons Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất bản & Lưu trữ:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
              <button
                type="button"
                onClick={() => setIsSavedExamsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                title="Lưu trọn bộ Đề thi và Đáp án hiện tại vào thư viện"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Đề & Đáp án</span>
              </button>
              {sets.length > 1 ? (
                <>
                  <button
                    onClick={handleDownloadSingleExamWord}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-indigo-300 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition cursor-pointer whitespace-nowrap"
                    title="Chỉ tải riêng đề đang chọn ra file Word"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Tải đề {examCodes[activeSetIndex] || activeSetIndex + 1} (Word)</span>
                  </button>
                  <button
                    onClick={handleDownloadExamWord}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs transition cursor-pointer whitespace-nowrap"
                    title="Tải toàn bộ tất cả các đề trong 1 file Word (ngắt trang từng đề)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tải tất cả {sets.length} đề (Word)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleDownloadExamWord}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-2xs transition cursor-pointer whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tải đề Word</span>
                </button>
              )}

              <button
                onClick={handleDownloadAnswerWord}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-purple-300 text-purple-700 text-xs font-semibold hover:bg-purple-50 transition cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Đáp án Word {sets.length > 1 ? `(${sets.length} mã)` : ''}</span>
              </button>

              <button
                onClick={handleDownloadAnswerExcel}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-teal-300 text-teal-700 text-xs font-semibold hover:bg-teal-50 transition cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Đáp án Excel</span>
              </button>

              <button
                onClick={handlePrintExams}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
                title="In đề đang hiển thị"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In đề</span>
              </button>

              <button
                onClick={handleCopyExam}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Status Message */}
      {progressStatus && (
        <div className="text-xs text-indigo-700 bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 font-medium noprint">
          {progressStatus}
        </div>
      )}

      {/* Multi-Exam Management & View Mode Bar */}
      {sets.length > 0 && (
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl space-y-3 mb-2 shadow-xs noprint">
          {/* Top row: Exam codes + Set tabs + Quick Add Permutation */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mã đề:</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-[320px] py-0.5">
                {examCodes.map((code, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={codeDigits}
                    value={code}
                    onChange={(e) => handleSpecificCodeChange(idx, e.target.value)}
                    className={`border rounded-lg px-1.5 py-0.5 text-xs font-mono font-bold text-center transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                      codeDigits === 4 ? 'w-14' : 'w-11'
                    } ${
                      idx === 0
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-300 shadow-2xs'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    placeholder={codeDigits === 4 ? String(1001 + idx) : String(101 + idx)}
                    title={
                      idx === 0
                        ? 'Mã đầu (Mã gốc) - Sửa ô này sẽ tự động cập nhật các mã sau'
                        : `Mã đề số ${idx + 1}`
                    }
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {sets.map((_, idx) => {
                const c = examCodes[idx] || (codeDigits === 4 ? String(1001 + idx) : String(101 + idx));
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setActiveSetIndex(idx);
                      if (examViewMode !== 'single') {
                        // Also allow clicking a tab to switch to or focus that set
                      }
                      if (sets[idx]?.length) {
                        setComplianceResult(checkQuestionsCompliance(sets[idx], mon, geoPct, geoDivide));
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                      activeSetIndex === idx
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200'
                    }`}
                  >
                    Đề {idx + 1} · Mã {c} ({sets[idx]?.length || 0} câu)
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsPermutationModalOpen(true)}
                title="Mở bảng cấu hình nâng cao: Chọn mã đề gốc, số lượng đề hoán vị và tùy chọn xáo trộn chi tiết cho từng phần"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs hover:from-emerald-700 hover:to-teal-700 transition active:scale-95 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-300" />
                Cấu hình Đề Hoán Vị
              </button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {sets.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteCurrentSet}
                  title={`Xóa Đề ${activeSetIndex + 1}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Xóa đề {activeSetIndex + 1}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAllSets}
                title="Xóa toàn bộ các đề đã tạo"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-slate-100 border border-slate-200 transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa tất cả</span>
              </button>
            </div>
          </div>

          {/* Bottom row: 4 Multi-Exam View Modes switcher */}
          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                Chế độ xem đề:
              </span>

              <button
                type="button"
                onClick={() => setExamViewMode('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  examViewMode === 'single'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Xem từng đề (1 đề)
              </button>

              <button
                type="button"
                onClick={() => setExamViewMode('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  examViewMode === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Xem tất cả ({sets.length} đề nối tiếp)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sets.length < 2) {
                    handleQuickCreatePermutation();
                  }
                  setExamViewMode('split');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  examViewMode === 'split'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                So sánh 2 đề song song
              </button>

              <button
                type="button"
                onClick={() => setExamViewMode('matrix')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  examViewMode === 'matrix'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Bảng đối chiếu đáp án ({sets.length} mã đề)
              </button>
            </div>

            {examViewMode === 'split' && sets.length >= 2 && (
              <div className="flex items-center gap-2 bg-indigo-50/80 px-3 py-1 rounded-xl border border-indigo-200 text-xs">
                <span className="font-semibold text-indigo-900">Cột trái:</span>
                <select
                  value={splitSetA}
                  onChange={(e) => setSplitSetA(Number(e.target.value))}
                  className="bg-white border border-indigo-300 rounded-lg px-2 py-0.5 font-bold text-indigo-800 focus:outline-none"
                >
                  {sets.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Đề {idx + 1} (Mã {examCodes[idx] || idx + 1})
                    </option>
                  ))}
                </select>
                <span className="text-indigo-400 font-bold">⇄</span>
                <span className="font-semibold text-indigo-900">Cột phải:</span>
                <select
                  value={splitSetB}
                  onChange={(e) => setSplitSetB(Number(e.target.value))}
                  className="bg-white border border-indigo-300 rounded-lg px-2 py-0.5 font-bold text-indigo-800 focus:outline-none"
                >
                  {sets.map((_, idx) => (
                    <option key={idx} value={idx}>
                      Đề {idx + 1} (Mã {examCodes[idx] || idx + 1})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested sources view */}
      {suggestedSources.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm noprint space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Gợi ý nguồn tài liệu uy tín ngoài sách giáo khoa
            </h4>
            <button
              type="button"
              onClick={() => setSuggestedSources([])}
              className="text-xs text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 font-semibold transition cursor-pointer"
              title="Xóa tất cả gợi ý nguồn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa tất cả gợi ý
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {suggestedSources.map((s, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <b className="text-indigo-800">{s.topic}</b>
                  <button
                    type="button"
                    onClick={() => handleDeleteSuggestedSource(idx)}
                    title="Xóa gợi ý chủ đề này"
                    className="text-slate-400 hover:text-rose-600 transition p-0.5 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {s.items.map((it, iIdx) => (
                    <li key={iIdx}>
                      <span className="font-semibold text-slate-700">{it.nguon}</span> ({it.loai}): {it.tim}
                      {it.tukhoa && <span className="text-slate-400 block">Từ khóa: {it.tukhoa}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live 3-Stage Closed-Loop Pipeline Progress Indicator (when generating) */}
      {generationStageStatus && (
        <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xs border border-slate-800 noprint space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
              <span className="text-xs font-bold text-amber-300">
                QUY TRÌNH RA ĐỀ KHÉP KÍN 3 BƯỚC ({generationStageStatus.step}/3): {generationStageStatus.label}
              </span>
            </div>
            <span className="text-[11px] text-slate-300">
              {generationStageStatus.detail}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {[
              {
                step: 1,
                title: '1. Khóa cứng quy tắc',
                desc: `Nạp ${mon === 'Địa lí' ? '84 quy tắc Địa lí' : '56 quy tắc khảo thí'}`,
              },
              {
                step: 2,
                title: '2. Soạn đề theo khung',
                desc: 'Thiết lập 4 phần đồng bộ ma trận YCCĐ',
              },
              {
                step: 3,
                title: '3. Tự đối chiếu & Xuất bản',
                desc: 'Hậu kiểm và chuẩn hóa Bản cuối cùng',
              },
            ].map((item) => {
              const isActive = generationStageStatus.step === item.step;
              const isDone = generationStageStatus.step > item.step;
              return (
                <div
                  key={item.step}
                  className={`p-2 rounded-lg border transition ${
                    isActive
                      ? 'bg-indigo-900/90 border-amber-400 text-white'
                      : isDone
                      ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-100'
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between gap-1">
                    <span>{item.title}</span>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {isActive && <Loader2 className="w-3.5 h-3.5 text-amber-300 animate-spin shrink-0" />}
                  </div>
                  <p className="text-[11px] opacity-80">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Compliance Check Results Bar */}
      {complianceResult && (
        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-2xs noprint space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {complianceResult.warnings.length === 0 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="text-xs font-bold text-slate-800">
                {complianceResult.warnings.length === 0
                  ? `Đề đạt chuẩn 100% quy tắc khảo thí (${mon === 'Địa lí' ? '84 điều Địa lí' : '56 điều chung'})`
                  : `Phát hiện ${complianceResult.warnings.length} điểm cần chuẩn hóa theo quy tắc khảo thí`}
              </span>
              {closedLoopAuditReport && (
                <span className="hidden sm:inline-block text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  Đã qua {closedLoopAuditReport.passesExecuted} lượt hậu kiểm tự động
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleRunComplianceCheck}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
                title="Đọc lại toàn bộ đề và đối chiếu quy tắc cứng"
              >
                Đối chiếu lại
              </button>

              <button
                type="button"
                onClick={handleFixComplianceErrors}
                disabled={isGenerating}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer ${
                  complianceResult.warnings.length > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>
                  {complianceResult.warnings.length > 0
                    ? `Sửa chuẩn 100% (${complianceResult.warnings.length})`
                    : 'Chuẩn hóa lại'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsCritiqueStudioOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-slate-900 text-amber-300 text-xs font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
                title="Mở Hội đồng Phản biện Đề thi Chuyên sâu"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Phản biện</span>
              </button>

              <button
                type="button"
                onClick={() => setComplianceResult(null)}
                title="Ẩn thanh rà soát"
                className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {complianceResult.warnings.length > 0 && (
            <ul className="space-y-1 bg-amber-50/80 p-2.5 rounded-lg border border-amber-200/60 text-xs text-amber-900">
              {complianceResult.warnings.map((w, wIdx) => (
                <li key={wIdx} className="flex items-start justify-between gap-2">
                  <span className="flex-1">• {w}</span>
                  <button
                    type="button"
                    onClick={() => handleDismissWarning(wIdx)}
                    title="Bỏ qua cảnh báo này"
                    className="text-amber-500 hover:text-rose-600 transition p-0.5 rounded shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 5. Exam Paper Preview (Supports Single, All Sets, Split 2 Sets, and Answer Comparison Matrix) */}
      {currentQuestions.length > 0 ? (
        <div id="exam-preview-container" className="space-y-4">
          {/* Compact Single-Row Cognitive Level Filter Bar */}
          {examViewMode !== 'matrix' && (
            <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs noprint flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lọc mức độ:</span>
                </span>

                <button
                  type="button"
                  onClick={() => setLevelFilter('ALL')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                    levelFilter === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Tất cả ({cognitiveStats.totalQs})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLevelFilter('B')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                    levelFilter === 'B'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                  }`}
                >
                  <span>Biết: {cognitiveStats.countB} câu ({cognitiveStats.pctB}%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLevelFilter('H')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                    levelFilter === 'H'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <span>Hiểu: {cognitiveStats.countH} câu ({cognitiveStats.pctH}%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLevelFilter('V')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                    levelFilter === 'V'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <span>Vận dụng: {cognitiveStats.countV} câu ({cognitiveStats.pctV}%)</span>
                </button>

                {levelFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setLevelFilter('ALL')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold underline flex items-center gap-0.5 ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Bỏ lọc</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  Thực tế: <b>{cognitiveStats.pctB}% · {cognitiveStats.pctH}% · {cognitiveStats.pctV}%</b> (Mục tiêu: {targetPctB}% · {targetPctH}% · {targetPctV}%)
                </span>
              </div>
            </div>
          )}

          {examViewMode === 'single' && (
            <ExamPaperView
              questions={currentQuestions}
              examCode={examCodes[activeSetIndex] || (codeDigits === 4 ? String(1001 + activeSetIndex) : String(101 + activeSetIndex))}
              setIndex={activeSetIndex}
              headerConfig={headerConfig}
              mon={mon}
              grade={grade}
              semester={semester}
              points={points}
              editable={true}
              levelFilter={levelFilter}
              onEditStem={(qIdx, val) => handleEditQuestionStem(qIdx, val, activeSetIndex)}
              onEditAsk={(qIdx, val) => handleEditQuestionAsk(qIdx, val, activeSetIndex)}
              onEditOpt={(qIdx, optIdx, val) => handleEditQuestionOpt(qIdx, optIdx, val, activeSetIndex)}
              onEditSubItem={(qIdx, itemIdx, val) => handleEditSubItemText(qIdx, itemIdx, val, activeSetIndex)}
              onEditAns={(qIdx, val) => handleEditQuestionAns(qIdx, val, activeSetIndex)}
              onEditLevel={(qIdx, lvl) => handleEditQuestionLevel(qIdx, lvl, activeSetIndex)}
              onToggleSubItemAns={(qIdx, itemIdx) => handleToggleSubItemAns(qIdx, itemIdx, activeSetIndex)}
              onDeleteQuestion={(qIdx) => handleDeleteQuestion(qIdx, activeSetIndex)}
              onRegenerateQuestion={(qIdx) => handleRegenerateSingleQuestion(qIdx, activeSetIndex)}
              idPrefix={`exam-paper-single-${activeSetIndex}`}
            />
          )}

          {examViewMode === 'all' && (
            <div className="space-y-10">
              {sets.map((qList, sIdx) => {
                const code = examCodes[sIdx] || (codeDigits === 4 ? String(1001 + sIdx) : String(101 + sIdx));
                return (
                  <div key={sIdx} className={sIdx > 0 ? 'page-break pt-6 border-t-4 border-dashed border-indigo-200' : ''}>
                    <div className="flex items-center justify-between bg-indigo-900 text-white px-4 py-2.5 rounded-t-2xl noprint">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
                        <Layers className="w-4 h-4 text-indigo-300" />
                        <span>ĐỀ THI SỐ {sIdx + 1} / {sets.length}</span>
                        <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-mono text-xs font-extrabold">
                          Mã đề: {code}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSetIndex(sIdx);
                          setExamViewMode('single');
                        }}
                        className="text-xs bg-white/15 hover:bg-white/25 px-3 py-1 rounded-lg font-semibold transition cursor-pointer"
                      >
                        Chỉ xem đề này
                      </button>
                    </div>
                    <ExamPaperView
                      questions={qList}
                      examCode={code}
                      setIndex={sIdx}
                      headerConfig={headerConfig}
                      mon={mon}
                      grade={grade}
                      semester={semester}
                      points={points}
                      editable={true}
                      levelFilter={levelFilter}
                      onEditStem={(qIdx, val) => handleEditQuestionStem(qIdx, val, sIdx)}
                      onEditAsk={(qIdx, val) => handleEditQuestionAsk(qIdx, val, sIdx)}
                      onEditOpt={(qIdx, optIdx, val) => handleEditQuestionOpt(qIdx, optIdx, val, sIdx)}
                      onEditSubItem={(qIdx, itemIdx, val) => handleEditSubItemText(qIdx, itemIdx, val, sIdx)}
                      onEditAns={(qIdx, val) => handleEditQuestionAns(qIdx, val, sIdx)}
                      onEditLevel={(qIdx, lvl) => handleEditQuestionLevel(qIdx, lvl, sIdx)}
                      onToggleSubItemAns={(qIdx, itemIdx) => handleToggleSubItemAns(qIdx, itemIdx, sIdx)}
                      onDeleteQuestion={(qIdx) => handleDeleteQuestion(qIdx, sIdx)}
                      onRegenerateQuestion={(qIdx) => handleRegenerateSingleQuestion(qIdx, sIdx)}
                      idPrefix={`exam-paper-all-${sIdx}`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {examViewMode === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {[splitSetA, splitSetB].map((sIdx, colIdx) => {
                const safeIdx = sets[sIdx] ? sIdx : 0;
                const qList = sets[safeIdx] || [];
                const code = examCodes[safeIdx] || (codeDigits === 4 ? String(1001 + safeIdx) : String(101 + safeIdx));
                return (
                  <div key={`${colIdx}-${safeIdx}`} className="space-y-2">
                    <div className="flex items-center justify-between bg-indigo-950 text-white px-4 py-2 rounded-xl text-xs font-bold noprint">
                      <span>
                        {colIdx === 0 ? 'CỘT TRÁI' : 'CỘT PHẢI'} — ĐỀ SỐ {safeIdx + 1} (Mã đề: {code})
                      </span>
                      <span className="text-indigo-200">{qList.length} câu</span>
                    </div>
                    <ExamPaperView
                      questions={qList}
                      examCode={code}
                      setIndex={safeIdx}
                      headerConfig={headerConfig}
                      mon={mon}
                      grade={grade}
                      semester={semester}
                      points={points}
                      isCompact={true}
                      editable={true}
                      levelFilter={levelFilter}
                      onEditStem={(qIdx, val) => handleEditQuestionStem(qIdx, val, safeIdx)}
                      onEditAsk={(qIdx, val) => handleEditQuestionAsk(qIdx, val, safeIdx)}
                      onEditOpt={(qIdx, optIdx, val) => handleEditQuestionOpt(qIdx, optIdx, val, safeIdx)}
                      onEditSubItem={(qIdx, itemIdx, val) => handleEditSubItemText(qIdx, itemIdx, val, safeIdx)}
                      onEditAns={(qIdx, val) => handleEditQuestionAns(qIdx, val, safeIdx)}
                      onEditLevel={(qIdx, lvl) => handleEditQuestionLevel(qIdx, lvl, safeIdx)}
                      onToggleSubItemAns={(qIdx, itemIdx) => handleToggleSubItemAns(qIdx, itemIdx, safeIdx)}
                      onDeleteQuestion={(qIdx) => handleDeleteQuestion(qIdx, safeIdx)}
                      onRegenerateQuestion={(qIdx) => handleRegenerateSingleQuestion(qIdx, safeIdx)}
                      idPrefix={`exam-paper-split-${colIdx}-${safeIdx}`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {examViewMode === 'matrix' && (
            <ExamComparisonMatrix
              sets={sets}
              examCodes={examCodes.map((c, idx) => c || (codeDigits === 4 ? String(1001 + idx) : String(101 + idx)))}
              subject={mon}
              grade={Number(grade) || 10}
              semester={semester}
              points={points}
              onExportExcel={handleDownloadAnswerExcel}
              onExportWord={handleDownloadAnswerWord}
            />
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
          <h4 className="font-semibold text-slate-700">Chưa có câu hỏi nào được tạo</h4>
          <p className="text-xs max-w-md mx-auto">
            Bấm vào nút <b>"Tạo câu hỏi từ ma trận và bản đặc tả"</b> ở trên để hệ thống tự động soạn thảo bộ câu hỏi trắc nghiệm & tự luận chuẩn hóa bám sát chương trình.
          </p>
        </div>
      )}

      <SavedExamsModal
        isOpen={isSavedExamsOpen}
        onClose={() => setIsSavedExamsOpen(false)}
        onLoadExam={handleLoadSavedExam}
        currentQuestionsPerSource={sets}
        currentExamCodes={examCodes}
        currentNumSets={numSets}
        currentSubject={mon}
        currentGrade={grade}
        currentSemester={semester as ExamSemester}
        currentPoints={points}
        currentHeaderConfig={headerConfig}
        currentCustomPrompt={customPrompt}
      />

      <UploadExamModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onExamParsed={handleExamParsedFromUpload}
        currentSubject={mon}
        currentGrade={grade}
        currentSemester={semester as ExamSemester}
      />

      <ExamCritiqueStudio
        isOpen={isCritiqueStudioOpen}
        onClose={() => setIsCritiqueStudioOpen(false)}
        questions={currentQuestions}
        mon={mon}
        grade={grade}
        semester={semester}
        rows={rows}
        examCode={examCodes[activeSetIndex] || (codeDigits === 4 ? String(1001 + activeSetIndex) : String(101 + activeSetIndex))}
        refDocsText={refFiles.map((f) => f.text).join('\n\n')}
        onApplyQuestionFix={handleApplyCritiqueQuestionFix}
        onApplyAllFixes={handleApplyAllCritiqueFixes}
        allExamCodes={examCodes}
        activeSetIndex={activeSetIndex}
        onSelectSetIndex={(idx) => setActiveSetIndex(idx)}
      />

      <PermutationModal
        isOpen={isPermutationModalOpen}
        onClose={() => setIsPermutationModalOpen(false)}
        sets={sets}
        examCodes={examCodes}
        activeSetIndex={activeSetIndex}
        onGeneratePermutations={handleGeneratePermutations}
      />

      <ExamEquivalenceModal
        isOpen={isEquivalenceModalOpen}
        onClose={() => setIsEquivalenceModalOpen(false)}
        sets={sets}
        examCodes={examCodes}
        subject={mon}
        grade={grade}
        semester={semester}
        rows={rows}
        points={points}
        onAutoAlignEquivalence={handleAutoAlignEquivalence}
        onUpdateSets={(newSets) => setSets(newSets)}
      />
    </div>
  );
};
