import { ExamSemester, MatrixRow, QuestionPointConfig, StructureMode, SubjectName } from '../types';
import {
  consolidateRowsByChapter,
  distributeQuestions,
  ensureOneLessonPerRow,
  ensureValidYccd,
  parseMatrixOrYccdTableFromText,
  standardizeMatrixAndSpecToCv7991,
} from '../utils/matrixCalculations';
import { parseExamDocumentFSM } from '../utils/examDocumentParser';

export interface MatrixWorkerRequest {
  id: string;
  type: 'PARSE_AND_STANDARDIZE_MATRIX' | 'STANDARDIZE_MATRIX_ROWS' | 'PARSE_EXAM_DOCUMENT_FSM';
  payload: any;
}

export interface MatrixWorkerResponse {
  id: string;
  ok: boolean;
  result?: any;
  error?: string;
}

// Self-contained polyfill inside Worker scope for Safari / WebKit
(function ensureIteratorPolyfill() {
  const g = globalThis as any;
  const iterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
  if (typeof g.Iterator === 'undefined') {
    function IteratorPolyfill() {}
    if (iterProto) {
      IteratorPolyfill.prototype = iterProto;
    }
    g.Iterator = IteratorPolyfill;
  } else if (!g.Iterator.prototype && iterProto) {
    g.Iterator.prototype = iterProto;
  }
})();

self.onmessage = (event: MessageEvent<MatrixWorkerRequest>) => {
  const { id, type, payload } = event.data || {};
  if (!id || !type) return;

  try {
    if (type === 'PARSE_AND_STANDARDIZE_MATRIX') {
      const {
        fileText,
        mon,
        grade,
        semester,
        structureMode,
        noTLN,
        points,
        targetFormatPoints,
        targetLevelPoints,
      } = payload as {
        fileText: string;
        mon: SubjectName;
        grade: string;
        semester: ExamSemester;
        structureMode: StructureMode;
        noTLN: boolean;
        points: QuestionPointConfig;
        targetFormatPoints?: number[];
        targetLevelPoints?: number[];
      };

      const extracted = parseMatrixOrYccdTableFromText(fileText, mon, semester, true);
      if (!extracted || extracted.length === 0) {
        const resp: MatrixWorkerResponse = { id, ok: true, result: { rows: [] } };
        self.postMessage(resp);
        return;
      }

      const hasQuestions = extracted.some(
        (r) => (r.v && r.v.some((val) => val > 0)) || (r.y && r.y.some((val) => val > 0))
      );

      let finalRows = extracted;
      if (!hasQuestions) {
        finalRows = distributeQuestions(
          finalRows,
          mon,
          structureMode,
          noTLN,
          points,
          targetFormatPoints,
          targetLevelPoints,
          true
        );
      }

      const standardized = standardizeMatrixAndSpecToCv7991(
        finalRows,
        mon,
        grade,
        semester,
        structureMode,
        noTLN,
        points,
        targetFormatPoints,
        targetLevelPoints,
        { text: fileText, yccdText: fileText },
        hasQuestions || Boolean(fileText)
      );

      const resp: MatrixWorkerResponse = {
        id,
        ok: true,
        result: {
          rows: standardized,
          hasQuestions,
        },
      };
      self.postMessage(resp);
      return;
    }

    if (type === 'STANDARDIZE_MATRIX_ROWS') {
      const {
        rows,
        mon,
        grade,
        semester,
        structureMode,
        noTLN,
        points,
        targetFormatPoints,
        targetLevelPoints,
        fileText,
        preserveExistingQuestions,
      } = payload as {
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
      };

      let workingRows = rows;
      if (!fileText) {
        workingRows = consolidateRowsByChapter(workingRows, mon, semester, '', false);
        if (!preserveExistingQuestions) {
          workingRows = distributeQuestions(
            workingRows,
            mon,
            structureMode,
            noTLN,
            points,
            targetFormatPoints,
            targetLevelPoints
          );
        }
        workingRows = ensureValidYccd(workingRows, mon, grade, { text: '' }, true);
      }

      const standardized = standardizeMatrixAndSpecToCv7991(
        workingRows,
        mon,
        grade,
        semester,
        structureMode,
        noTLN,
        points,
        targetFormatPoints,
        targetLevelPoints,
        { text: fileText || '', yccdText: fileText || '' },
        Boolean(preserveExistingQuestions || fileText)
      );

      const resp: MatrixWorkerResponse = {
        id,
        ok: true,
        result: { rows: ensureOneLessonPerRow(standardized) },
      };
      self.postMessage(resp);
      return;
    }

    if (type === 'PARSE_EXAM_DOCUMENT_FSM') {
      const { formattedText, defaultSubject, defaultGrade, defaultSemester } = payload as {
        formattedText: string;
        defaultSubject: SubjectName;
        defaultGrade: string;
        defaultSemester: ExamSemester;
      };

      const parsed = parseExamDocumentFSM(
        formattedText,
        defaultSubject,
        defaultGrade,
        defaultSemester
      );
      const resp: MatrixWorkerResponse = { id, ok: true, result: parsed };
      self.postMessage(resp);
      return;
    }

    const unknownResp: MatrixWorkerResponse = {
      id,
      ok: false,
      error: `Unknown worker task type: ${type}`,
    };
    self.postMessage(unknownResp);
  } catch (err: any) {
    const errResp: MatrixWorkerResponse = {
      id,
      ok: false,
      error: err?.message || String(err),
    };
    self.postMessage(errResp);
  }
};
