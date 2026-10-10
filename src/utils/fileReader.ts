import * as XLSX from 'xlsx';
import mammoth from 'mammoth';

export async function readFileText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (['txt', 'csv', 'md'].includes(ext)) {
    return await file.text();
  }

  if (['xlsx', 'xls'].includes(ext)) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return workbook.SheetNames.map(
      (name) => `## Sheet: ${name}\n` + XLSX.utils.sheet_to_csv(workbook.Sheets[name])
    ).join('\n\n');
  }

  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }

  if (ext === 'pdf') {
    // For PDF, try to read as text or extract textual characters if possible
    try {
      const buffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const raw = textDecoder.decode(buffer);
      // Extract text objects inside parenthesis or brackets
      const matches = raw.match(/\(([^()]+)\)/g);
      if (matches && matches.length > 20) {
        return matches.map((m) => m.slice(1, -1)).join(' ');
      }
    } catch {
      // fallback
    }
    throw new Error(
      'Không thể đọc nội dung văn bản từ tệp PDF này (có thể là dạng scan). Vui lòng chuyển sang định dạng Word (.docx) hoặc .txt.'
    );
  }

  throw new Error(
    `Chưa hỗ trợ định dạng .${ext}. Vui lòng sử dụng tệp Word (.docx), Excel (.xlsx) hoặc .txt.`
  );
}
