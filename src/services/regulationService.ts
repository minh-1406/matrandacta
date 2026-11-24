import { ACTIVE_MOET_REGULATIONS, MoetRegulationDoc } from '../constants/moetRegulations';
import { callGemini, safeJsonParse } from './geminiService';

const STORAGE_KEY_REGULATIONS = 'moet_custom_regulations_v1';

export function getStoredRegulations(): MoetRegulationDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REGULATIONS);
    if (raw) {
      const customDocs = JSON.parse(raw);
      if (Array.isArray(customDocs) && customDocs.length > 0) {
        // Merge stored custom regulations with active base regulations
        const baseIds = new Set(ACTIVE_MOET_REGULATIONS.map((d) => d.id));
        const nonBaseCustoms = customDocs.filter((d: MoetRegulationDoc) => !baseIds.has(d.id));
        return [...ACTIVE_MOET_REGULATIONS, ...nonBaseCustoms];
      }
    }
  } catch (err) {
    console.warn('Error reading stored regulations:', err);
  }
  return ACTIVE_MOET_REGULATIONS;
}

export function saveCustomRegulation(doc: MoetRegulationDoc): MoetRegulationDoc[] {
  const current = getStoredRegulations();
  const existingIdx = current.findIndex((d) => d.id === doc.id || d.codeNumber.toLowerCase() === doc.codeNumber.toLowerCase());
  let updated: MoetRegulationDoc[];
  if (existingIdx !== -1) {
    updated = [...current];
    updated[existingIdx] = doc;
  } else {
    updated = [doc, ...current];
  }

  try {
    const customOnly = updated.filter((d) => d.isCustom || !ACTIVE_MOET_REGULATIONS.some((b) => b.id === d.id));
    localStorage.setItem(STORAGE_KEY_REGULATIONS, JSON.stringify(customOnly));
  } catch (err) {
    console.warn('Error saving custom regulation:', err);
  }

  return updated;
}

export function deleteCustomRegulation(docId: string): MoetRegulationDoc[] {
  const current = getStoredRegulations();
  const updated = current.filter((d) => d.id !== docId || !d.isCustom);
  try {
    const customOnly = updated.filter((d) => d.isCustom);
    localStorage.setItem(STORAGE_KEY_REGULATIONS, JSON.stringify(customOnly));
  } catch (err) {
    console.warn('Error removing custom regulation:', err);
  }
  return getStoredRegulations();
}

/**
 * Perform live search & AI synthesis of the latest official MOET regulations
 * for exam generation, matrix structure, specifications, and assessment standards.
 */
export async function searchAndFetchLatestMoetRegulations(userQuery?: string): Promise<MoetRegulationDoc[]> {
  const searchQuery = userQuery?.trim()
    ? userQuery
    : 'quy dinh ra de thi ma tran ban dac ta cong van 7991 quyet dinh 764 bo giao duc nam 2025 2026';

  const prompt = `
Bạn là Chuyên gia Khảo thí và Pháp chế Giáo dục thuộc Cục Quản lý Chất lượng - Bộ Giáo dục và Đào tạo Việt Nam.
Hãy tra cứu và cập nhật các thông tin văn bản chỉ đạo mới nhất hiện hành liên quan đến:
- Công văn 7991/BGDĐT-GDTrH (Ma trận & Bản đặc tả đề kiểm tra định kỳ THCS, THPT).
- Quyết định 764/QĐ-BGDĐT (Cấu trúc định dạng đề thi tốt nghiệp THPT từ năm 2025 trở đi).
- Thông tư 22/2021/TT-BGDĐT và các hướng dẫn khảo thí mới nhất năm học 2024–2025 & 2025–2026.
- Bất kỳ văn bản/công văn chỉ đạo thi/kiểm tra đánh giá mới bổ sung từ Bộ GD&ĐT gần đây.

Câu hỏi tra cứu của người dùng: "${searchQuery}"

HÃY TRẢ VỀ DUY NHẤT 1 MẢNG JSON (không văn bản ngoài JSON) với cấu trúc:
[
  {
    "id": "ma-van-ban-unique",
    "codeNumber": "Số/Ký hiệu văn bản (Ví dụ: Công văn 7991/BGDĐT-GDTrH)",
    "title": "Tên đầy đủ của Văn bản/Chỉ thị",
    "issuedDate": "Ngày ban hành (DD/MM/YYYY)",
    "issuer": "Cơ quan ban hành (Bộ GD&ĐT / Cục Quản lý chất lượng)",
    "status": "Mới cập nhật",
    "summary": "Tóm tắt cốt lõi về quy chuẩn ra đề, ma trận, đặc tả và đánh giá học sinh",
    "keyDirectives": [
      "Chỉ thị cốt lõi 1",
      "Chỉ thị cốt lõi 2",
      "Chỉ thị cốt lõi 3"
    ],
    "appliedInSystem": [
      "Ứng dụng cụ thể vào thuật toán tự động xây dựng ma trận và bản đặc tả",
      "Ứng dụng vào bộ quy tắc kiểm định đề thi chuẩn khảo thí"
    ],
    "isCustom": true
  }
]
`;

  try {
    const response = await callGemini(
      prompt,
      'Bạn là Chuyên gia Khảo thí thuộc Bộ Giáo dục & Đào tạo. Hãy luôn tra cứu chính xác văn bản pháp quy hiện hành.',
      'application/json',
      true // Enable Search Grounding
    );

    const parsed = safeJsonParse(response, null);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const formattedDocs: MoetRegulationDoc[] = parsed.map((item: any, idx: number) => ({
        id: item.id || `fetched-reg-${Date.now()}-${idx}`,
        codeNumber: item.codeNumber || 'Văn bản Bộ GD&ĐT',
        title: item.title || 'Hướng dẫn chỉ đạo kiểm tra đánh giá',
        issuedDate: item.issuedDate || new Date().toLocaleDateString('vi-VN'),
        issuer: item.issuer || 'Bộ Giáo dục và Đào tạo',
        status: 'Mới cập nhật',
        summary: item.summary || 'Hướng dẫn quy chuẩn ra đề thi và xây dựng ma trận bản đặc tả.',
        keyDirectives: Array.isArray(item.keyDirectives) ? item.keyDirectives : [item.summary || ''],
        appliedInSystem: Array.isArray(item.appliedInSystem)
          ? item.appliedInSystem
          : ['Tự động kiểm định và chuẩn hóa theo quy định mới'],
        isCustom: true,
      }));

      // Persist newly fetched regulations into local custom database
      formattedDocs.forEach((doc) => saveCustomRegulation(doc));
      return getStoredRegulations();
    }
  } catch (err) {
    console.error('Failed to fetch live regulations:', err);
  }

  return getStoredRegulations();
}
