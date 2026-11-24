import { ExamSemester, MatrixRow, QuestionPointConfig, StructureMode, SubjectName } from '../types';
import {
  consolidateRowsByChapter,
  distributeQuestions,
  ensureOneLessonPerRow,
  ensureValidYccd,
  parseMatrixOrYccdTableFromText,
  standardizeMatrixAndSpecToCv7991,
} from './matrixCalculations';
import { DeterministicExamParseResult, parseExamDocumentFSM } from './examDocumentParser';
import type { MatrixWorkerRequest, MatrixWorkerResponse } from '../workers/matrixWorker';

let sharedWorker: Worker | null = null;
let reqCounter = 0;
const pendingCallbacks = new Map<
  string,
  { resolve: (val: any) => void; reject: (err: any) => void; timer: ReturnType<typeof setTimeout> }
>();

function getMatrixWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (sharedWorker) return sharedWorker;

  try {
    sharedWorker = new Worker(new URL('../workers/matrixWorker.ts', import.meta.url), {
      type: 'module',
    });

    sharedWorker.onmessage = (event: MessageEvent<MatrixWorkerResponse>) => {
      const { id, ok, result, error } = event.data || {};
      const entry = pendingCallbacks.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pendingCallbacks.delete(id);
      if (ok) {
        entry.resolve(result);
      } else {
        entry.reject(new Error(error || 'Matrix worker execution failed'));
      }
    };

    sharedWorker.onerror = () => {
      // Reject pending tasks so callers fall back cleanly to synchronous execution
      pendingCallbacks.forEach((entry) => {
        clearTimeout(entry.timer);
        entry.reject(new Error('Web Worker runtime error'));
      });
      pendingCallbacks.clear();
      sharedWorker = null;
    };

    return sharedWorker;
  } catch {
    sharedWorker = null;
    return null;
  }
}

function runWorkerTask<T>(
  type: MatrixWorkerRequest['type'],
  payload: any,
  fallbackFn: () => T,
  timeoutMs: number = 8000
): Promise<T> {
  const worker = getMatrixWorker();
  if (!worker) {
    return Promise.resolve().then(fallbackFn);
  }

  return new Promise<T>((resolve) => {
    const id = `mw_${++reqCounter}_${Date.now()}`;
    const timer = setTimeout(() => {
      pendingCallbacks.delete(id);
      resolve(fallbackFn());
    }, timeoutMs);

    pendingCallbacks.set(id, {
      resolve: (res: T) => resolve(res),
      reject: () => resolve(fallbackFn()),
      timer,
    });

    try {
      const msg: MatrixWorkerRequest = { id, type, payload };
      worker.postMessage(msg);
    } catch {
      clearTimeout(timer);
      pendingCallbacks.delete(id);
      resolve(fallbackFn());
    }
  });
}

export async function runStandardizeMatrixRowsAsync(params: {
  rows: MatrixRow[];
  mon: SubjectName;
  grade: string;
  semester: ExamSemester;
  structureMode: StructureMode;
  noTLN: boolean;
  points: QuestionPointConfig;
  targetFormatPoints?: number[];
  targetLevelPoints?: number[];
  fileText?: string;
  preserveExistingQuestions?: boolean;
}): Promise<MatrixRow[]> {
  const res = await runWorkerTask<{ rows: MatrixRow[] }>(
    'STANDARDIZE_MATRIX_ROWS',
    params,
    () => {
      let workingRows = params.rows;
      if (!params.fileText) {
        workingRows = consolidateRowsByChapter(workingRows, params.mon, params.semester, '', false);
        if (!params.preserveExistingQuestions) {
          workingRows = distributeQuestions(
            workingRows,
            params.mon,
            params.structureMode,
            params.noTLN,
            params.points,
            params.targetFormatPoints,
            params.targetLevelPoints
          );
        }
        workingRows = ensureValidYccd(workingRows, params.mon, params.grade, { text: '' }, true);
      }
      const standardized = standardizeMatrixAndSpecToCv7991(
        workingRows,
        params.mon,
        params.grade,
        params.semester,
        params.structureMode,
        params.noTLN,
        params.points,
        params.targetFormatPoints,
        params.targetLevelPoints,
        { text: params.fileText || '', yccdText: params.fileText || '' },
        Boolean(params.preserveExistingQuestions || params.fileText)
      );
      return { rows: ensureOneLessonPerRow(standardized) };
    }
  );
  return res.rows;
}

export async function runParseExamDocumentFSMAsync(
  formattedText: string,
  defaultSubject: SubjectName,
  defaultGrade: string,
  defaultSemester: ExamSemester
): Promise<DeterministicExamParseResult> {
  return runWorkerTask<DeterministicExamParseResult>(
    'PARSE_EXAM_DOCUMENT_FSM',
    { formattedText, defaultSubject, defaultGrade, defaultSemester },
    () => parseExamDocumentFSM(formattedText, defaultSubject, defaultGrade, defaultSemester)
  );
}
