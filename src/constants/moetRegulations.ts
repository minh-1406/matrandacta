export interface MoetRegulationDoc {
  id: string;
  codeNumber: string; // e.g., '7991/BGDĐT-GDTrH', '764/QĐ-BGDĐT'
  title: string;
  issuedDate: string; // '17/12/2024'
  issuer: string; // 'Bộ Giáo dục và Đào tạo'
  status: 'Đang áp dụng' | 'Mới cập nhật' | 'Dự thảo 2026';
  summary: string;
  keyDirectives: string[];
  appliedInSystem: string[];
  link?: string;
  isCustom?: boolean;
}

export const ACTIVE_MOET_REGULATIONS: MoetRegulationDoc[] = [
  {
    id: 'cv-7991',
    codeNumber: 'Công văn 7991/BGDĐT-GDTrH',
    title: 'Hướng dẫn thực hiện kiểm tra, đánh giá cấp THCS và THPT năm học 2024–2025 và các năm tiếp theo',
    issuedDate: '17/12/2024',
    issuer: 'Bộ Giáo dục và Đào tạo',
    status: 'Đang áp dụng',
    summary: 'Quy định chuẩn hóa cấu trúc Phụ lục Ma trận và Bản đặc tả 3 chiều (Chủ đề × Mức độ nhận thức × Dạng thức câu hỏi) áp dụng thống nhất cho toàn bộ các môn học đánh giá bằng điểm số.',
    keyDirectives: [
      'Ma trận thiết kế 3 chiều: Chủ đề/Bài học × 3 Mức nhận thức (Biết, Hiểu, Vận dụng) × 4 Dạng thức câu hỏi.',
      'Bản đặc tả bắt buộc mô tả Yêu cầu cần đạt (YCCĐ) theo đúng Chương trình GDPT 2018.',
      'Đề kiểm tra định kỳ (giữa kì, cuối kì) quy định tỷ lệ phân hóa hợp lý, không lạm dụng câu hỏi quá khó ngoài chuẩn.',
      'Phần trắc nghiệm Đúng/Sai mỗi câu lớn bắt buộc gồm 4 ý nhỏ độc lập (a, b, c, d).'
    ],
    appliedInSystem: [
      'Tự động đồng bộ Ma trận 3 chiều & Bản đặc tả theo đúng mẫu Phụ lục 7991',
      'Kiểm soát tổng điểm 10.0đ và chia hết cho 4 đối với các ý Đúng/Sai',
      'Kiểm định trùng lặp và liên kết YCCĐ bám sát bộ SGK GDPT 2018'
    ]
  },
  {
    id: 'qd-764',
    codeNumber: 'Quyết định 764/QĐ-BGDĐT',
    title: 'Quy định Cấu trúc định dạng đề thi Kỳ thi tốt nghiệp THPT từ năm 2025',
    issuedDate: '08/03/2024',
    issuer: 'Bộ Giáo dục và Đào tạo',
    status: 'Đang áp dụng',
    summary: 'Quy định 4 dạng thức câu hỏi chuẩn hóa toàn quốc áp dụng cho thi tốt nghiệp THPT và định hướng kiểm tra định kỳ tại các trường trung học.',
    keyDirectives: [
      'Dạng 1 (PHẦN I): Trắc nghiệm nhiều lựa chọn (1 phương án đúng trong 4 phương án A, B, C, D).',
      'Dạng 2 (PHẦN II): Trắc nghiệm Đúng - Sai (mỗi câu gồm 4 ý a, b, c, d; học sinh chọn Đúng hoặc Sai cho từng ý).',
      'Dạng 3 (PHẦN III): Trắc nghiệm trả lời ngắn (học sinh tự tính toán và tô kết quả tối đa 4 ký tự vào phiếu trả lời tự luận/trắc nghiệm).',
      'Dạng 4 (PHẦN IV): Tự luận (dành cho các môn Ngữ văn, Toán, Lịch sử... đánh giá lập luận & vận dụng cao).'
    ],
    appliedInSystem: [
      'Hỗ trợ trọn bộ 4 dạng thức chuẩn hóa QĐ 764',
      'Khống chế đáp số Phần III tối đa 4 ký tự theo đúng 4 ô tô phiếu khảo thí',
      'Tự động chèn quy ước làm tròn trong thân câu trả lời ngắn'
    ]
  },
  {
    id: 'tt-22',
    codeNumber: 'Thông tư 22/2021/TT-BGDĐT',
    title: 'Quy định về đánh giá học sinh trung học cơ sở và học sinh trung học phổ thông',
    issuedDate: '20/07/2021',
    issuer: 'Bộ Giáo dục và Đào tạo',
    status: 'Đang áp dụng',
    summary: 'Quy định hình thức đánh giá định kỳ, tỷ lệ số bài kiểm tra, cách tính điểm trung bình môn học và quản lý kết quả học tập.',
    keyDirectives: [
      'Đánh giá kết hợp nhận xét và điểm số trên thang điểm 10.',
      'Bài kiểm tra định kỳ giữa kì và cuối kì bắt buộc có ma trận, bản đặc tả và đề kiểm tra kèm hướng dẫn chấm.',
      'Đảm bảo tính công bằng, khách quan, phân hóa đúng trình độ nhận thức học sinh.'
    ],
    appliedInSystem: [
      'Tính toán chính xác tổng điểm 10.0 và tỷ lệ % phân hóa giữa các mức độ',
      'Bảo lưu ma trận và bản đặc tả kèm đề thi để lưu trữ hồ sơ tổ chuyên môn'
    ]
  },
  {
    id: 'hd-khaothi-2025-2026',
    codeNumber: 'Hướng dẫn Kỹ thuật Khảo thí 2025–2026',
    title: 'Quy chuẩn kỹ thuật ra đề thi trắc nghiệm khách quan của Cục Quản lý chất lượng',
    issuedDate: '15/01/2025',
    issuer: 'Cục Quản lý chất lượng - Bộ GD&ĐT',
    status: 'Đang áp dụng',
    summary: 'Hướng dẫn kỹ thuật chi tiết về xây dựng câu dẫn, phương án nhiễu, chống đoán mò bề mặt và kiểm soát tính độc lập ngữ liệu.',
    keyDirectives: [
      'Từ phủ định trong thân câu dẫn bắt buộc VIẾT HOA và IN ĐẬM (ví dụ: **KHÔNG**, **SAI**).',
      'Không dùng phương án "Tất cả các phương án trên đều đúng/sai".',
      'Phần II Đúng/Sai: Trong một câu 4 ý, không được để cả 4 ý cùng Đúng hoặc cả 4 ý cùng Sai.',
      'Phương án nhiễu phải có tính hấp dẫn lý trí (plausible) dựa trên các lỗi tư duy phổ biến của học sinh.'
    ],
    appliedInSystem: [
      'Tự động phát hiện và VIẾT HOA từ phủ định trong thân câu',
      'Đảm bảo mỗi câu Phần II luôn chứa cả mệnh đề Đúng và mệnh đề Sai',
      'Cân bằng độ dài A, B, C, D và loại bỏ các phương án nhiễu vô hiệu'
    ]
  }
];
