export interface QuestionPointConfig {
  tn: number;  // Multiple Choice (TNLC) per question
  ds: number;  // True/False (ĐS) per 4-item question
  tln: number; // Short Answer (TLN) per question
  tl: number;  // Essay (TL) per point unit
}

export interface MatrixRow {
  c: string; // Chapter / Topic name (Chủ đề / Chương)
  n: string; // Detailed content / subtopics (Nội dung / đơn vị kiến thức)
  v: number[]; // 12 numbers: [TNLC-B, TNLC-H, TNLC-V, DS-B, DS-H, DS-V, TLN-B, TLN-H, TLN-V, TL-B, TL-H, TL-V]
  y?: number[]; // [Biết, Hiểu, Vận dụng] count of sub-items for True/False (mỗi câu lớn có 4 ý)
  s?: [string, string, string]; // [Biết, Hiểu, Vận dụng] learning outcomes
}

export interface TrueFalseSubItem {
  t: string;      // statement text
  a: boolean;     // true or false
  m: 'B' | 'H' | 'V'; // level
}

export interface QuestionSourceItem {
  k?: 'text' | 'table' | 'chart' | 'fig';
  text?: string;
  table?: {
    title?: string;
    head?: string[];
    rows?: (string | number)[][];
  };
  chart?: {
    type?: 'bar' | 'line' | 'pie';
    title?: string;
    unit?: string;
    labels?: string[];
    series?: {
      name?: string;
      values?: number[];
    }[];
  };
  fig?: string; // image description
  src?: string; // citation source
}

export interface RubricItem {
  y: string; // criteria description
  d: number; // points
}

export interface GeneratedQuestion {
  d: 'NLC' | 'DS' | 'TLN' | 'TL';
  m: 'B' | 'H' | 'V';
  stem: string;
  opts?: string[];
  ans?: string;
  items?: TrueFalseSubItem[];
  rubric?: RubricItem[];
  srcs?: QuestionSourceItem[];
  gt?: string; // explanation
  chk?: boolean; // needs verification against textbook
  r?: number; // associated row index in matrix
  _num?: number;
}

export type SubjectName =
  | 'Toán'
  | 'Vật lí'
  | 'Hóa học'
  | 'Sinh học'
  | 'Lịch sử'
  | 'Địa lí'
  | 'Giáo dục kinh tế và pháp luật'
  | 'Tin học'
  | 'Công nghệ'
  | 'Tiếng Anh'
  | 'Ngữ văn'
  | 'Giáo dục quốc phòng và an ninh'
  | 'Giáo dục thể chất'
  | 'Âm nhạc'
  | 'Mĩ thuật'
  | 'Hoạt động trải nghiệm, hướng nghiệp';

export type ExamSemester = 'Giữa kì I' | 'Cuối kì I' | 'Giữa kì II' | 'Cuối kì II';
export type StructureMode = 'k' | 't'; // 'k': CV 7991, 't': QĐ 764

export interface FullAppState {
  mon: SubjectName;
  grade: string;
  semester: ExamSemester;
  structureMode: StructureMode;
  noTLN: boolean;
  targetTotalScore: number;
  targetFormatPoints: number[];
  targetLevelPoints: number[];
  points: QuestionPointConfig;
  rows: MatrixRow[];
  ppctData?: {
    text: string;
    base64: string;
    mimeType: string;
    yccdText: string;
    yccdBase64: string;
    yccdMimeType: string;
  };
}

export interface SavedMatrixItem {
  id: string;
  title: string;
  updatedAt: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  state: FullAppState;
}
