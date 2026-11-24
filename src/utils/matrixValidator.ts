import { MatrixRow, QuestionPointConfig, StructureMode, SubjectName } from '../types';
import { MatrixSums, formatNumber, getY, isPlaceholderOrInvalidYccd } from './matrixCalculations';
import { NOCALC, PRACT } from '../constants/curriculumData';

export interface ValidationErrorItem {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: 'score' | 'true_false' | 'content' | 'spec' | 'points' | 'export';
  title: string;
  description: string;
  rowIndex?: number;
  rowName?: string;
  autoFixType?: 'redistribute' | 'fix_true_false' | 'fill_specs' | 'remove_empty' | 'standardize_all';
}

export interface ValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: ValidationErrorItem[];
  warnings: ValidationErrorItem[];
  totalScore: number;
  scoreDifference: number;
  summaryMessage: string;
}

export function validateMatrix(
  rows: MatrixRow[],
  sums: MatrixSums,
  points: QuestionPointConfig,
  mon: SubjectName,
  structureMode: StructureMode,
  noTLN: boolean,
  targetTotalScore: number = 10,
  targetFormatPoints: number[] = [3, 2, 2, 3],
  targetLevelPoints: number[] = [4, 3, 3]
): ValidationResult {
  const errors: ValidationErrorItem[] = [];
  const warnings: ValidationErrorItem[] = [];

  // 1. Matrix empty check
  if (!rows || rows.length === 0) {
    errors.push({
      id: 'matrix_empty',
      severity: 'error',
      category: 'content',
      title: 'Ma trận chưa có nội dung (0 dòng)',
      description: 'Vui lòng nhấn "Thêm dòng" hoặc "Cập nhật lại PPCT & YCCĐ chuẩn" để tạo dữ liệu.',
      autoFixType: 'standardize_all',
    });
    return {
      isValid: false,
      hasErrors: true,
      hasWarnings: false,
      errors,
      warnings,
      totalScore: 0,
      scoreDifference: targetTotalScore,
      summaryMessage: 'Ma trận chưa có nội dung!',
    };
  }

  // 2. Total score check
  const totalScore = +sums.T.toFixed(2);
  const scoreDiff = +(totalScore - targetTotalScore).toFixed(2);
  const absScoreDiff = Math.abs(scoreDiff);

  if (absScoreDiff > 0.05) {
    errors.push({
      id: 'total_score_mismatch',
      severity: 'error',
      category: 'score',
      title: `Tổng điểm hiện tại là ${formatNumber(totalScore)}đ (Quy định: ${formatNumber(targetTotalScore)}.0đ)`,
      description: scoreDiff > 0
        ? `Tổng điểm đang VƯỢT QUÁ quy định ${formatNumber(absScoreDiff)} điểm (${formatNumber(totalScore)}đ / ${targetTotalScore}.0đ). Bạn cần giảm bớt câu hỏi hoặc bấm "Tự động sửa lỗi".`
        : `Tổng điểm đang THIẾU ${formatNumber(absScoreDiff)} điểm (${formatNumber(totalScore)}đ / ${targetTotalScore}.0đ). Bạn cần tăng thêm câu hỏi hoặc bấm "Tự động sửa lỗi".`,
      autoFixType: 'redistribute',
    });
  }

  // 3. True/False question check (CV 7991: mỗi câu lớn Đúng/Sai bắt buộc gồm 4 ý nhỏ)
  const totalTrueFalseItems = sums.t[3] + sums.t[4] + sums.t[5];
  if (totalTrueFalseItems > 0 && totalTrueFalseItems % 4 !== 0) {
    const remainder = totalTrueFalseItems % 4;
    errors.push({
      id: 'true_false_not_divisible_by_4',
      severity: 'error',
      category: 'true_false',
      title: `Số ý dạng Đúng - Sai chưa chia hết cho 4 (${totalTrueFalseItems} ý)`,
      description: `Theo Công văn 7991, mỗi câu hỏi Đúng - Sai bắt buộc gồm 4 ý nhỏ (a, b, c, d). Hiện tổng số ý là ${totalTrueFalseItems} (thiếu ${4 - remainder} ý để tạo thành câu hoàn chỉnh).`,
      autoFixType: 'fix_true_false',
    });
  }

  // 4. Content completeness check per row
  rows.forEach((r, idx) => {
    const rowNum = idx + 1;
    const cleanC = (r.c || '').trim();
    const cleanN = (r.n || '').trim();

    if (!cleanC) {
      errors.push({
        id: `empty_chapter_${idx}`,
        severity: 'error',
        category: 'content',
        rowIndex: idx,
        rowName: cleanN || `Dòng ${rowNum}`,
        title: `Dòng ${rowNum} để trống tên Chủ đề / Chương`,
        description: `Ô Chủ đề/Chương tại dòng ${rowNum} đang bị bỏ trống. Vui lòng nhập tên chương hoặc xóa dòng này.`,
        autoFixType: 'remove_empty',
      });
    }

    if (!cleanN) {
      errors.push({
        id: `empty_lesson_${idx}`,
        severity: 'error',
        category: 'content',
        rowIndex: idx,
        rowName: cleanC || `Dòng ${rowNum}`,
        title: `Dòng ${rowNum} để trống tên Bài học / Nội dung kiến thức`,
        description: `Ô Nội dung/đơn vị kiến thức tại dòng ${rowNum} ("${cleanC || `Dòng ${rowNum}`}") đang bị bỏ trống.`,
        autoFixType: 'remove_empty',
      });
    }

    // Row total questions check
    const y = getY(r);
    const sumRowV = r.v.reduce((a, b) => a + b, 0);
    const sumRowY = y.reduce((a, b) => a + b, 0);

    if (sumRowV === 0 && sumRowY === 0) {
      warnings.push({
        id: `zero_questions_row_${idx}`,
        severity: 'warning',
        category: 'content',
        rowIndex: idx,
        rowName: cleanN || cleanC,
        title: `Dòng ${rowNum} ("${cleanN || cleanC}") chưa có câu hỏi nào (0 điểm)`,
        description: `Dòng này hiện chưa được phân bổ bất kỳ câu hỏi nào. Nếu không kiểm tra nội dung này, bạn có thể xóa dòng để ma trận gọn gàng hơn.`,
      });
    }

    // Row True/False sub-item completeness
    const rowHasDSQ = (r.v[3] || 0) + (r.v[4] || 0) + (r.v[5] || 0) > 0;
    if (rowHasDSQ && sumRowY === 0) {
      errors.push({
        id: `ds_no_subitems_row_${idx}`,
        severity: 'error',
        category: 'true_false',
        rowIndex: idx,
        rowName: cleanN || cleanC,
        title: `Dòng ${rowNum} có câu Đúng/Sai nhưng chưa nhập số ý nhỏ`,
        description: `Tại dòng "${cleanN || cleanC}", cột câu hỏi Đúng/Sai có số câu lớn nhưng số ý nhỏ trong ngoặc đang là 0. Quy định mỗi câu phải đủ 4 ý.`,
        autoFixType: 'fix_true_false',
      });
    }

    // Specification completeness check (if questions > 0, YCCĐ should not be placeholder or empty)
    const qBiet = (r.v[0] || 0) + (y[0] || 0) + (r.v[6] || 0) + (r.v[9] || 0);
    const qHieu = (r.v[1] || 0) + (y[1] || 0) + (r.v[7] || 0) + (r.v[10] || 0);
    const qVd = (r.v[2] || 0) + (y[2] || 0) + (r.v[8] || 0) + (r.v[11] || 0);

    const sBiet = r.s?.[0] || '';
    const sHieu = r.s?.[1] || '';
    const sVd = r.s?.[2] || '';

    if (qBiet > 0 && isPlaceholderOrInvalidYccd(sBiet, cleanN || cleanC)) {
      warnings.push({
        id: `missing_yccd_biet_row_${idx}`,
        severity: 'warning',
        category: 'spec',
        rowIndex: idx,
        rowName: cleanN || cleanC,
        title: `Dòng ${rowNum} thiếu YCCĐ mức độ Biết`,
        description: `Dòng "${cleanN || cleanC}" có ${qBiet} câu/ý mức độ Biết nhưng Bản đặc tả chưa có Yêu cầu cần đạt chi tiết.`,
        autoFixType: 'fill_specs',
      });
    }

    if (qHieu > 0 && isPlaceholderOrInvalidYccd(sHieu, cleanN || cleanC)) {
      warnings.push({
        id: `missing_yccd_hieu_row_${idx}`,
        severity: 'warning',
        category: 'spec',
        rowIndex: idx,
        rowName: cleanN || cleanC,
        title: `Dòng ${rowNum} thiếu YCCĐ mức độ Thông hiểu`,
        description: `Dòng "${cleanN || cleanC}" có ${qHieu} câu/ý mức độ Thông hiểu nhưng Bản đặc tả chưa có Yêu cầu cần đạt chi tiết.`,
        autoFixType: 'fill_specs',
      });
    }

    if (qVd > 0 && isPlaceholderOrInvalidYccd(sVd, cleanN || cleanC)) {
      warnings.push({
        id: `missing_yccd_vd_row_${idx}`,
        severity: 'warning',
        category: 'spec',
        rowIndex: idx,
        rowName: cleanN || cleanC,
        title: `Dòng ${rowNum} thiếu YCCĐ mức độ Vận dụng`,
        description: `Dòng "${cleanN || cleanC}" có ${qVd} câu/ý mức độ Vận dụng nhưng Bản đặc tả chưa có Yêu cầu cần đạt chi tiết.`,
        autoFixType: 'fill_specs',
      });
    }
  });

  // 5. Point config checks
  if (points.tn <= 0 || points.ds <= 0 || points.tl <= 0 || (!noTLN && points.tln <= 0)) {
    errors.push({
      id: 'invalid_point_config',
      severity: 'error',
      category: 'points',
      title: 'Điểm số mỗi câu hỏi không hợp lệ (<= 0)',
      description: 'Số điểm của mỗi câu hỏi trong mục "Điểm số mỗi câu hỏi" phải lớn hơn 0.',
    });
  }

  // 6. Format Ratios Warnings (if CV 7991 mode)
  const isStandardMode = structureMode === 'k' && !['Ngữ văn', 'Tiếng Anh', ...PRACT].includes(mon);
  if (isStandardMode) {
    const formatLabels = ['Nhiều lựa chọn', 'Đúng – Sai', 'Trả lời ngắn', 'Tự luận'];
    sums.f.forEach((actualPts: number, i: number) => {
      const targetPts = targetFormatPoints[i];
      if (Math.abs(actualPts - targetPts) > 0.75) {
        warnings.push({
          id: `format_ratio_deviates_${i}`,
          severity: 'warning',
          category: 'score',
          title: `Điểm phần ${formatLabels[i]} lệch so với khung quy định`,
          description: `Phần ${formatLabels[i]} hiện có ${formatNumber(actualPts)}đ (Khung quy định CV 7991 là ${formatNumber(targetPts)}đ).`,
          autoFixType: 'redistribute',
        });
      }
    });

    const levelLabels = ['Nhận biết', 'Thông hiểu', 'Vận dụng'];
    sums.lv.forEach((actualPts: number, i: number) => {
      const targetPts = targetLevelPoints[i];
      if (Math.abs(actualPts - targetPts) > 0.75) {
        warnings.push({
          id: `level_ratio_deviates_${i}`,
          severity: 'warning',
          category: 'score',
          title: `Tỉ lệ mức độ ${levelLabels[i]} lệch so với khung 40/30/30`,
          description: `Mức độ ${levelLabels[i]} hiện có ${formatNumber(actualPts)}đ (Mục tiêu chuẩn là ${formatNumber(targetPts)}đ).`,
          autoFixType: 'redistribute',
        });
      }
    });
  }

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const isValid = !hasErrors;

  let summaryMessage = 'Ma trận và Bản đặc tả đạt chuẩn 100% quy định!';
  if (hasErrors) {
    summaryMessage = `Phát hiện ${errors.length} lỗi bắt buộc cần sửa chữa trước khi xuất tệp!`;
  } else if (hasWarnings) {
    summaryMessage = `Có ${warnings.length} lưu ý cần xem xét để ma trận hoàn hảo hơn.`;
  }

  return {
    isValid,
    hasErrors,
    hasWarnings,
    errors,
    warnings,
    totalScore,
    scoreDifference: scoreDiff,
    summaryMessage,
  };
}
