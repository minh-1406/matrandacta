/**
 * Exam Code Generator Utility (Mã đề thi tự động)
 * Supports:
 * - 4 digits (default) or 3 digits
 * - Cascade calculation from first code (mã đầu / mã gốc)
 * - Rules:
 *   + Sequential (+1): 1001, 1002, 1003... or 101, 102, 103...
 *   + Step +2: 1001, 1003, 1005... or 101, 103, 105...
 *   + Rule-based Pseudo-random (Quy luật ngẫu nhiên chuẩn thi trắc nghiệm):
 *     Deterministic non-repeating permutation based on the first code
 * - Instant randomization (Tạo ngẫu nhiên)
 */

export type ExamCodePattern = 'sequential' | 'step2' | 'pseudorandom';

export interface ExamCodeSettings {
  digits: 3 | 4;
  pattern: ExamCodePattern;
  autoCascade: boolean;
}

/**
 * Normalizes a code string to ensure it fits the given digit length and is numeric.
 */
export function normalizeCode(raw: string, digits: 3 | 4, fallbackNum: number): string {
  const digitsOnly = raw.replace(/\D/g, '');
  if (!digitsOnly) {
    return String(fallbackNum).padStart(digits, '0');
  }
  if (digitsOnly.length > digits) {
    return digitsOnly.slice(0, digits);
  }
  return digitsOnly.padStart(digits, '0');
}

/**
 * Generates an array of exam codes of length `count`.
 * - The first code is anchored to `firstCodeStr` (or default if invalid/empty).
 * - Subsequent codes are computed automatically according to `pattern`.
 */
export function generateExamCodeList(
  count: number,
  firstCodeStr: string,
  digits: 3 | 4,
  pattern: ExamCodePattern
): string[] {
  const totalCount = Math.max(1, count);
  const minVal = digits === 3 ? 101 : 1001;
  const maxVal = digits === 3 ? 999 : 9999;
  const range = maxVal - minVal + 1;

  // Normalize initial first code
  let cleanFirst = firstCodeStr.replace(/\D/g, '');
  let firstNum = parseInt(cleanFirst, 10);
  if (isNaN(firstNum) || firstNum < (digits === 3 ? 100 : 1000) || firstNum > maxVal) {
    firstNum = minVal;
  }

  const firstFormatted = String(firstNum).padStart(digits, '0');
  const result: string[] = [firstFormatted];
  const used = new Set<string>([firstFormatted]);

  if (totalCount === 1) {
    return result;
  }

  if (pattern === 'sequential') {
    for (let i = 1; i < totalCount; i++) {
      let val = firstNum + i;
      if (val > maxVal) {
        val = minVal + ((val - minVal) % range);
      }
      const codeStr = String(val).padStart(digits, '0');
      result.push(codeStr);
      used.add(codeStr);
    }
  } else if (pattern === 'step2') {
    for (let i = 1; i < totalCount; i++) {
      let val = firstNum + i * 2;
      if (val > maxVal) {
        val = minVal + ((val - minVal) % range);
      }
      const codeStr = String(val).padStart(digits, '0');
      result.push(codeStr);
      used.add(codeStr);
    }
  } else if (pattern === 'pseudorandom') {
    // Prime stride coprime to range, guaranteeing full unique cycle with authentic scrambling
    // For 4 digits: range 9000, prime 1723 (gcd(1723, 9000) = 1)
    // For 3 digits: range 899, prime 137 (gcd(137, 899) = 1)
    const primeStep = digits === 3 ? 137 : 1723;
    let currVal = firstNum;

    for (let i = 1; i < totalCount; i++) {
      let candidate = '';
      let attempts = 0;
      while (attempts < 500) {
        currVal = minVal + ((currVal - minVal + primeStep + (attempts * 19)) % range);
        candidate = String(currVal).padStart(digits, '0');
        if (!used.has(candidate)) {
          break;
        }
        attempts++;
      }
      if (!candidate || used.has(candidate)) {
        // Fallback safely if collision
        let fb = minVal + i;
        while (used.has(String(fb).padStart(digits, '0')) && fb <= maxVal) {
          fb++;
        }
        candidate = String(fb).padStart(digits, '0');
      }
      used.add(candidate);
      result.push(candidate);
    }
  }

  return result;
}

/**
 * Generates a pleasant random starting code.
 */
export function generateRandomFirstCode(digits: 3 | 4): string {
  if (digits === 3) {
    // Generate standard 3-digit exam code e.g. 101, 204, 315, 428, 572...
    const prefixes = [1, 2, 3, 4, 5, 6, 7, 8];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const rest = Math.floor(Math.random() * 90) + 10;
    return `${p}${rest}`;
  } else {
    // Generate standard 4-digit exam code e.g. 1001, 1204, 2401, 3105, 4208...
    const currentYearShort = new Date().getFullYear() % 100; // e.g. 25
    const choices = [
      () => `${currentYearShort}0${Math.floor(Math.random() * 9) + 1}`, // e.g. 2501, 2502
      () => `${Math.floor(Math.random() * 8) + 1}${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 90) + 10}`, // e.g. 1324
      () => `${(Math.floor(Math.random() * 7) + 1) * 1000 + Math.floor(Math.random() * 90) + 1}`, // e.g. 2014
    ];
    const fn = choices[Math.floor(Math.random() * choices.length)];
    return fn();
  }
}

/**
 * Generates a completely new set of unique codes with a randomized start.
 */
export function generateRandomExamCodes(
  count: number,
  digits: 3 | 4,
  pattern: ExamCodePattern = 'pseudorandom'
): string[] {
  const randomFirst = generateRandomFirstCode(digits);
  return generateExamCodeList(count, randomFirst, digits, pattern);
}

/**
 * Converts existing codes between 3 and 4 digits cleanly.
 */
export function convertCodesDigitLength(
  currentCodes: string[],
  targetDigits: 3 | 4,
  pattern: ExamCodePattern
): string[] {
  const count = currentCodes.length || 1;
  const first = currentCodes[0] || (targetDigits === 4 ? '1001' : '101');
  const cleanFirst = first.replace(/\D/g, '');

  let newFirst = '';
  if (targetDigits === 3) {
    if (cleanFirst.length >= 4) {
      // e.g. "1001" -> "101", "2401" -> "241"
      newFirst = `${cleanFirst.charAt(0)}${cleanFirst.slice(-2)}`;
    } else {
      newFirst = cleanFirst.padStart(3, '1');
    }
    const num = parseInt(newFirst, 10);
    if (isNaN(num) || num < 100) newFirst = '101';
  } else {
    if (cleanFirst.length === 3) {
      // e.g. "101" -> "1001", "241" -> "2401"
      newFirst = `${cleanFirst.charAt(0)}0${cleanFirst.slice(1)}`;
    } else {
      newFirst = cleanFirst.padStart(4, '0');
    }
    const num = parseInt(newFirst, 10);
    if (isNaN(num) || num < 1000) newFirst = '1001';
  }

  return generateExamCodeList(count, newFirst, targetDigits, pattern);
}
