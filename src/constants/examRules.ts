export interface ExamRuleItem {
  id: string;
  groupId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
  groupTitle: string;
  content: string;
  sourceType: 'VB' | 'TH' | 'KT';
  sourceDetail: string;
  checkMethod?: string;
  isMandatory: boolean; // Bắt buộc tuân thủ khi ra đề
}

// 1. BỘ QUY TẮC RÀ SOÁT ĐỀ KIỂM TRA TRẮC NGHIỆM CHUNG (ÁP DỤNG CHO CÁC MÔN HỌC KHÁC ĐỊA LÍ)
export const GENERAL_EXAM_RULES: ExamRuleItem[] = [
  // Nhóm A: Đối chiếu ma trận, đặc tả và cấu trúc đề
  {
    id: 'A1',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Số câu, số điểm từng dạng, từng bài, từng mức độ khớp từng ô của ma trận.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991; VB 8773 (bước 6)',
    checkMethod: 'Lập bảng câu × (dạng, bài, mức độ, điểm) rồi cộng theo hàng và cột',
    isMandatory: true,
  },
  {
    id: 'A2',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Câu hỏi nằm đúng ô đặc tả: đúng bài, đúng dạng, đúng mức độ nêu ở cột Yêu cầu cần đạt.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991',
    checkMethod: 'Đọc từng câu cạnh dòng yêu cầu cần đạt tương ứng',
    isMandatory: true,
  },
  {
    id: 'A3',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Dạng thức: nhiều lựa chọn có 4 phương án, chọn 1 đáp án đúng; đúng/sai có 4 ý, mỗi ý chọn đúng hoặc sai; trả lời ngắn.',
    sourceType: 'VB',
    sourceDetail: 'VB 764',
    checkMethod: 'Đếm số phương án, số ý',
    isMandatory: true,
  },
  {
    id: 'A4',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Điểm đúng/sai theo số ý đúng: 1 ý 0,1; 2 ý 0,25; 3 ý 0,5; 4 ý 1,0. Điểm câu nhiều lựa chọn và trả lời ngắn theo ma trận của trường.',
    sourceType: 'VB',
    sourceDetail: 'VB 764',
    checkMethod: 'Đối chiếu thang điểm trong hướng dẫn chấm',
    isMandatory: true,
  },
  {
    id: 'A5',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Không có kiến thức ngoài phạm vi ma trận và đề cương (không đưa bài chưa có trong ma trận).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (câu hỏi kiểm tra nội dung quan trọng)',
    checkMethod: 'Mỗi câu ghi được tên bài trong ma trận',
    isMandatory: true,
  },
  {
    id: 'A6',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Mức độ khớp với động từ yêu cầu: Biết = nhận biết, nêu, trình bày; Hiểu = phân biệt, so sánh, giải thích; Vận dụng = tính toán, xác định trên tình huống, giải thích hiện tượng.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    checkMethod: 'Gạch động từ lệnh hỏi, so với mức độ ghi trong ma trận',
    isMandatory: true,
  },
  {
    id: 'A7',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Sau khi soạn phải có bước đối chiếu đáp án, đối chiếu ma trận và thử đề.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (bước 6)',
    checkMethod: 'Có chữ kí người rà soát trong phiếu',
    isMandatory: true,
  },
  {
    id: 'A8',
    groupId: 'A',
    groupTitle: 'A. Đối chiếu ma trận, đặc tả và cấu trúc đề',
    content: 'Tuân thủ duy nhất 1 bộ SGK mới nhất hiện hành (bộ Kết nối tri thức với cuộc sống) và tự cập nhật nội dung mới hiện hành: Để có câu hỏi và đáp án hoàn chỉnh, trọn vẹn và rõ nghĩa, bắt buộc chỉ tuân thủ đúng 1 bộ SGK mới nhất hiện hành làm chuẩn kiến thức duy nhất (SGK Kết nối tri thức với cuộc sống bản mới nhất của NXB Giáo dục Việt Nam); đồng thời hệ thống tự động cập nhật các nội dung mới hiện hành (số liệu Niên giám Thống kê mới nhất, địa danh hành chính mới, quy chuẩn kỹ thuật QCVN, văn bản quy phạm pháp luật đang có hiệu lực thi hành, không dùng dữ liệu/thuật ngữ cũ lỗi thời).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773; Chuẩn chương trình GDPT 2018',
    checkMethod: 'Đối chiếu nội dung câu hỏi và từng phương án với văn bản 1 bộ SGK mới nhất hiện hành và dữ liệu cập nhật mới nhất',
    isMandatory: true,
  },

  // Nhóm B: Quy tắc câu nhiều lựa chọn (Phần I)
  {
    id: 'B1',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Kiểm tra nội dung quan trọng của chương trình.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B2',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Phù hợp tiêu chí ra đề về trình bày và số điểm.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B3',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Câu dẫn nêu trực tiếp câu hỏi hoặc một vấn đề cụ thể.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B4',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Hạn chế trích nguyên văn câu có sẵn trong SGK.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B5',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Từ ngữ, cấu trúc câu rõ ràng, dễ hiểu với mọi học sinh.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B6',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Mỗi phương án nhiễu hợp lý với học sinh chưa nắm vững kiến thức.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B7',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Phương án sai dựa trên lỗi hoặc nhận thức sai lệch thường gặp của học sinh.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B8',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Đáp án câu này độc lập với đáp án các câu khác trong bài.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B9',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Đáp án cùng với nội dung câu hỏi phải hoàn chỉnh 1 câu, vẹn nghĩa: Nếu câu hỏi kết thúc bằng dấu ?, mỗi phương án là một câu/ngữ trọn vẹn bắt đầu bằng chữ hoa và kết thúc bằng dấu chấm (.); nếu câu dẫn lửng (không có dấu ?), câu dẫn nối tiếp với từng phương án phải tạo thành 1 câu hoàn chỉnh đúng ngữ pháp, chữ cái đầu phương án viết thường (trừ danh từ riêng) và kết thúc bằng dấu chấm (.). Tuyệt đối không được cắt bớt từ của đáp án làm câu cụt nghĩa.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773; Kĩ thuật khảo thí',
    checkMethod: 'Đọc ghép câu dẫn với từng phương án A, B, C, D xem có thành câu hoàn chỉnh và trọn vẹn ý nghĩa không',
    isMandatory: true,
  },
  {
    id: 'B10',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Chỉ có một đáp án đúng, chính xác nhất.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B11',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Cấm tuyệt đối dùng phương án "Tất cả đáp án trên đều đúng/sai", "Không có đáp án nào đúng" hoặc phương án trung lập, không xác định.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'B12',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Bốn phương án có độ dài và cấu trúc tương đương; đáp án ngắn gọn tự nhiên, tròn nghĩa và hoàn chỉnh (4 - 8 từ, 1 vế cốt lõi); đáp án đúng không dài hơn các phương án còn lại. Cấm tuyệt đối soạn phương án dài rồi cắt từ cơ học làm câu què cụt, mất trọn nghĩa.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'B13',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Phương án là số hoặc năm thì xếp theo thứ tự tăng dần.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'B14',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Đáp án đúng phân bố đều A, B, C, D trong cả đề (đề 12 câu: mỗi chữ khoảng 3 lần, không trùng 3 câu liên tiếp).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'B15',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Tránh câu dẫn phủ định; nếu bắt buộc thì in đậm và VIẾT HOA từ phủ định (KHÔNG, CHƯA), chỉ dùng một lần trong câu.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'B16',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Phần câu dẫn nối liền với phương án thành một câu đúng ngữ pháp; không có từ khoá chỉ xuất hiện ở đáp án đúng.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'B17',
    groupId: 'B',
    groupTitle: 'B. Quy tắc câu nhiều lựa chọn',
    content: 'Không dùng các từ "luôn luôn", "chỉ", "không bao giờ" riêng ở phương án sai (học sinh dễ đoán loại trừ).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm C: Quy tắc câu đúng/sai (Phần II)
  {
    id: 'C1',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'Mỗi câu có đúng 4 ý a, b, c, d; mỗi ý là một khẳng định đúng hoặc sai rõ ràng.',
    sourceType: 'VB',
    sourceDetail: 'VB 764',
    isMandatory: true,
  },
  {
    id: 'C2',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'Các ý độc lập với nhau thì được đảo thứ tự; các ý nối tiếp để dẫn đến một kết quả thì không được đảo.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'C3',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'Thứ tự mức độ trong mỗi câu theo ma trận của trường: ý a, b mức Biết; ý c mức Hiểu; ý d mức Vận dụng.',
    sourceType: 'VB',
    sourceDetail: 'Ma trận trường (VB 7991)',
    isMandatory: true,
  },
  {
    id: 'C4',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'Ý sai phải sai ở một điểm kiến thức xác định, không sai do câu chữ mơ hồ hay dùng từ tuyệt đối.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C5',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'CẤM TUYỆT ĐỐI không để cả 4 ý cùng đúng hoặc cùng sai; mỗi câu bắt buộc có từ 1 đến 3 ý sai (tỉ lệ 2Đ-2S hoặc 1Đ-3S / 3Đ-1S).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C6',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'Ngữ liệu hoặc bảng số liệu có nguồn, năm, đơn vị; ý nào dựa vào số liệu phải tính lại được từ bảng.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C7',
    groupId: 'C',
    groupTitle: 'C. Quy tắc câu đúng/sai',
    content: 'Ý của câu này không trùng nguyên nội dung với đáp án một câu nhiều lựa chọn khác trong đề.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (đáp án độc lập)',
    isMandatory: true,
  },

  // Nhóm D: Quy tắc câu trả lời ngắn (Phần III)
  {
    id: 'D1',
    groupId: 'D',
    groupTitle: 'D. Quy tắc câu trả lời ngắn',
    content: 'Đáp án là một số, ngắn (tối đa 4 kí tự kể cả dấu âm và dấu phẩy thập phân), học sinh chỉ điền kết quả số.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'D2',
    groupId: 'D',
    groupTitle: 'D. Quy tắc câu trả lời ngắn',
    content: 'Lệnh hỏi nêu rõ đơn vị cần điền; nếu yêu cầu làm tròn thì nêu rõ làm tròn đến hàng nào (hàng đơn vị hoặc hàng phần mười).',
    sourceType: 'TH',
    sourceDetail: 'TH; KT',
    isMandatory: true,
  },
  {
    id: 'D3',
    groupId: 'D',
    groupTitle: 'D. Quy tắc câu trả lời ngắn',
    content: 'Chỉ có một đáp số đúng: số liệu chọn sao cho không phát sinh tranh cãi về làm tròn ở bước trung gian.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'D4',
    groupId: 'D',
    groupTitle: 'D. Quy tắc câu trả lời ngắn',
    content: 'Có thể đổi đại lượng cần hỏi để đáp số là số nguyên hoặc gọn (dưới 4 kí tự).',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: false,
  },
  {
    id: 'D5',
    groupId: 'D',
    groupTitle: 'D. Quy tắc câu trả lời ngắn',
    content: 'Chỉ dùng ở mức Hiểu và Vận dụng, thường là bài toán tính toán ra giá trị duy nhất; không dùng cho câu chỉ cần nhớ lại một từ.',
    sourceType: 'KT',
    sourceDetail: 'KT; TH',
    isMandatory: true,
  },
  {
    id: 'D6',
    groupId: 'D',
    groupTitle: 'D. Quy tắc câu trả lời ngắn',
    content: 'Câu "đếm" chỉ hợp lệ khi danh sách đối tượng đã được liệt kê cố định trong câu và mỗi đối tượng thuộc một loại duy nhất.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm E: Tự luận và hướng dẫn chấm (Phần IV)
  {
    id: 'E1',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Đánh giá nội dung quan trọng của chương trình.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E2',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Phù hợp tiêu chí ra đề về trình bày và số điểm.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E3',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Thể hiện rõ nội dung và cấp độ tư duy cần đo (khớp động từ lệnh hỏi với mức độ trong ma trận).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E4',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Một yêu cầu kèm hướng dẫn cụ thể cách thực hiện.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E5',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Phù hợp trình độ và nhận thức của học sinh (đối với học sinh cần hỗ trợ: lệnh hỏi ngắn, chia ý nhỏ, có gợi ý cấu trúc).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E6',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Đòi hỏi hiểu nhiều hơn ghi nhớ ở các câu mang mức Hiểu trở lên.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E7',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Ngôn ngữ đủ rõ để học sinh hiểu đúng yêu cầu.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'E8',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Gợi ý độ dài bài làm, thời gian và tiêu chí cần đạt.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: false,
  },
  {
    id: 'E9',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Yêu cầu nêu và chứng minh quan điểm thì nói rõ bài được đánh giá theo lập luận logic.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: false,
  },
  {
    id: 'E10',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Hướng dẫn chấm chia điểm đến từng ý nhỏ, tổng khớp điểm câu; dùng rubric rõ ràng.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (bước 5)',
    isMandatory: true,
  },
  {
    id: 'E11',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Đáp án trắc nghiệm trong hướng dẫn chấm khớp 100% với đáp án đánh dấu trong đề.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (đối chiếu đáp án)',
    isMandatory: true,
  },
  {
    id: 'E12',
    groupId: 'E',
    groupTitle: 'E. Tự luận và hướng dẫn chấm',
    content: 'Có dòng lưu ý: "Chấp nhận các cách diễn đạt hoặc lập luận khác nếu đúng bản chất khoa học".',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm G: Câu chữ SGK và ngữ liệu
  {
    id: 'G1',
    groupId: 'G',
    groupTitle: 'G. Câu chữ SGK và ngữ liệu',
    content: 'Chỉ tuân thủ duy nhất 1 bộ SGK mới nhất hiện hành (bộ Kết nối tri thức với cuộc sống) và tự động cập nhật nội dung, số liệu thực tiễn mới hiện hành; mọi khái niệm và đáp án đúng được đối chiếu chuẩn xác 100%, ghi rõ bài và nguồn.',
    sourceType: 'KT',
    sourceDetail: 'KT; VB 8773 (bước 6)',
    isMandatory: true,
  },
  {
    id: 'G2',
    groupId: 'G',
    groupTitle: 'G. Câu chữ SGK và ngữ liệu',
    content: 'Hạn chế trích nguyên văn câu có sẵn trong SGK ở câu dẫn và đoạn ngữ liệu; diễn đạt lại hoặc đổi bối cảnh ví dụ thực tế.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G3',
    groupId: 'G',
    groupTitle: 'G. Câu chữ SGK và ngữ liệu',
    content: 'Với đề thi định kì, ngữ liệu thực tiễn đổi bối cảnh mới, không chép nguyên văn SGK nhưng bản chất kiến thức phải khớp chuẩn SGK.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'G4',
    groupId: 'G',
    groupTitle: 'G. Câu chữ SGK và ngữ liệu',
    content: 'Đoạn ngữ liệu tóm lược SGK phải ghi "Tóm lược theo SGK..." và không thêm ý sai lệch.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: false,
  },
  {
    id: 'G5',
    groupId: 'G',
    groupTitle: 'G. Câu chữ SGK và ngữ liệu',
    content: 'Không ghép nguyên các câu của đề cương khi đề cương chưa được đối chiếu với SGK.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm H: Chống lộ đáp án giữa các phần
  {
    id: 'H1',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Đáp án của câu tự luận không nằm trong đề bài, phương án hoặc ngữ liệu của phần trắc nghiệm.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'Với mỗi ý của đáp án tự luận, tìm từ khoá trong Phần I–III',
    isMandatory: true,
  },
  {
    id: 'H2',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Đáp án câu trả lời ngắn không được nêu trực tiếp trong đoạn ngữ liệu hay phương án của câu khác.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'Tìm con số và thuật ngữ đáp án trong toàn đề',
    isMandatory: true,
  },
  {
    id: 'H3',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Đoạn ngữ liệu đúng/sai không chứa nguyên đáp án của câu nhiều lựa chọn.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'Đối chiếu từng câu nhiều lựa chọn với ngữ liệu',
    isMandatory: true,
  },
  {
    id: 'H4',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Một ý đúng/sai không là bản lặp của một câu nhiều lựa chọn cùng bài (cùng mệnh đề, đổi cách hỏi).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'So sánh từng cặp cùng bài',
    isMandatory: true,
  },
  {
    id: 'H5',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Nếu cần giữ nội dung trùng giữa các phần, chỉ trùng ở mức chủ đề, không trùng điều mà câu kia đang hỏi.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    checkMethod: 'Đọc lệnh hỏi của câu kia để biết điều đang được đo',
    isMandatory: true,
  },
  {
    id: 'H6',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Gạch chân đáp án chỉ có ở bản dành cho giáo viên, không có trong bản in cho học sinh.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'H7',
    groupId: 'H',
    groupTitle: 'H. Chống lộ đáp án giữa các phần',
    content: 'Phụ lục đối chiếu ma trận không in kèm đề phát cho học sinh.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
];

// 2. BỘ QUY TẮC CỨNG RIÊNG CHO MÔN ĐỊA LÍ THPT (CÔNG VĂN 7991, 8773, QĐ 764 VÀ ĐỀ THAM KHẢO 2025)
export const GEOGRAPHY_EXAM_RULES: ExamRuleItem[] = [
  // Nhóm A: Khung đề theo Công văn 7991 áp dụng cho Địa lí
  {
    id: 'A1',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Cơ cấu điểm theo dạng: nhiều lựa chọn khoảng 3,0 điểm (30%), đúng–sai khoảng 2,0 điểm (20%), trả lời ngắn khoảng 2,0 điểm (20%), tự luận khoảng 3,0 điểm (30%).',
    sourceType: 'VB',
    sourceDetail: 'VB 7991',
    isMandatory: true,
  },
  {
    id: 'A2',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Cơ cấu điểm theo mức độ: 40% Biết (4,0đ), 30% Hiểu (3,0đ), 30% Vận dụng (3,0đ).',
    sourceType: 'VB',
    sourceDetail: 'VB 7991',
    isMandatory: true,
  },
  {
    id: 'A3',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Ma trận theo chủ đề hoặc chương; mỗi dòng có nội dung/đơn vị kiến thức và số câu ở từng dạng, từng mức; khớp số câu và số thứ tự.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991',
    isMandatory: true,
  },
  {
    id: 'A4',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Bản đặc tả có cột Yêu cầu cần đạt chia ba mức Biết, Hiểu, Vận dụng; ở ô Vận dụng có thể ghi tắt tên năng lực (NL) theo chương trình Địa lí.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991',
    isMandatory: true,
  },
  {
    id: 'A5',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Nếu trường không dùng dạng trả lời ngắn thì chuyển toàn bộ điểm của dạng đó sang dạng đúng–sai (tỉ lệ 3:4:0:3).',
    sourceType: 'VB',
    sourceDetail: 'VB 7991',
    isMandatory: true,
  },
  {
    id: 'A6',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Mỗi câu đúng–sai có 4 ý nhỏ (a, b, c, d); điểm theo số ý đúng: 1 ý 0,1đ; 2 ý 0,25đ; 3 ý 0,5đ; 4 ý 1,0đ.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991 (cấu trúc); VB 764 (điểm)',
    isMandatory: true,
  },
  {
    id: 'A7',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Mỗi câu trong đề đúng chủ đề, đúng dạng, đúng mức độ ghi trong đặc tả; tổng số câu và điểm khớp từng ô của ma trận.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991; VB 8773 (bước 6)',
    isMandatory: true,
  },
  {
    id: 'A8',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Sau khi soạn: đối chiếu đáp án, đối chiếu ma trận, thử đề và hoàn thiện.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (bước 6)',
    isMandatory: true,
  },
  {
    id: 'A9',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Nếu đề dành cho đối tượng cần điều chỉnh (học sinh khuyết tật), ghi rõ số liệu điều chỉnh trong ma trận/đặc tả được tổ duyệt.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: false,
  },
  {
    id: 'A10',
    groupId: 'A',
    groupTitle: 'A. Khung đề theo Công văn 7991 áp dụng cho Địa lí',
    content: 'Tuân thủ duy nhất 1 bộ SGK Địa lí GDPT 2018 mới nhất hiện hành (bộ Kết nối tri thức với cuộc sống) và tự cập nhật nội dung mới hiện hành: Để câu hỏi và đáp án hoàn chỉnh, trọn vẹn và rõ nghĩa, chỉ sử dụng đúng 1 bộ SGK chuẩn duy nhất; đồng thời tự động cập nhật số liệu Niên giám Thống kê mới nhất, địa danh hành chính mới nhất (sáp nhập, điều chỉnh đơn vị hành chính), quy chuẩn QCVN và thực tiễn phát triển kinh tế - xã hội hiện hành. Tuyệt đối không dùng dữ liệu, địa danh cũ lỗi thời.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773; Chuẩn chương trình Địa lí GDPT 2018',
    checkMethod: 'Đối chiếu trực tiếp nội dung câu hỏi và từng phương án với SGK Địa lí mới nhất (bộ Kết nối tri thức) và số liệu Niên giám thống kê, địa giới hành chính cập nhật mới nhất',
    isMandatory: true,
  },

  // Nhóm B: Mức độ nhận thức trong Địa lí
  {
    id: 'B1',
    groupId: 'B',
    groupTitle: 'B. Mức độ nhận thức trong Địa lí',
    content: 'Động từ lệnh hỏi khớp với mức độ ghi trong đặc tả: Biết = Nhận biết, nêu, trình bày khái niệm, địa danh, đọc trực tiếp số liệu bảng/biểu đồ; Hiểu = Phân biệt, so sánh, nêu tác động, tính đơn giản (số lần, tỉ lệ, tốc độ); Vận dụng = Giải thích nguyên nhân, mục đích, liên hệ thực tế, tính nhiều bước.',
    sourceType: 'KT',
    sourceDetail: 'KT; TH',
    isMandatory: true,
  },
  {
    id: 'B2',
    groupId: 'B',
    groupTitle: 'B. Mức độ nhận thức trong Địa lí',
    content: 'Mỗi ý đúng–sai và mỗi lệnh hỏi của câu tự luận có mức độ riêng, ghi được vào bản đặc tả.',
    sourceType: 'TH',
    sourceDetail: 'TH; VB 7991',
    isMandatory: true,
  },
  {
    id: 'B3',
    groupId: 'B',
    groupTitle: 'B. Mức độ nhận thức trong Địa lí',
    content: 'Câu Vận dụng phải dùng tình huống, bảng số liệu hoặc bối cảnh mới khác với ví dụ mẫu trong SGK.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (vận dụng tình huống mới)',
    isMandatory: true,
  },
  {
    id: 'B4',
    groupId: 'B',
    groupTitle: 'B. Mức độ nhận thức trong Địa lí',
    content: 'Nội dung nhận biết địa danh phải là địa danh trong chương trình SGK Địa lí THPT, không hỏi địa danh xa lạ ngoài phạm vi.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm C: Câu nhiều lựa chọn trong Địa lí (Phần I)
  {
    id: 'C1',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Kiểm tra nội dung cốt lõi của chương trình Địa lí THPT.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C2',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Phù hợp tiêu chí ra đề về trình bày và số điểm (mỗi câu 0,25 điểm).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C3',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Câu dẫn nêu trực tiếp câu hỏi hoặc một vấn đề địa lí cụ thể.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C4',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Hạn chế trích nguyên văn câu có sẵn trong SGK.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C5',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Từ ngữ, cấu trúc câu rõ ràng, thuật ngữ chuẩn khoa học Địa lí.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C6',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Mỗi phương án nhiễu hợp lý với học sinh chưa nắm vững kiến thức địa lí.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C7',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Phương án sai dựa trên lỗi nhận thức sai lệch thường gặp của học sinh.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C8',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Đáp án câu này độc lập với đáp án các câu khác trong bài.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C9',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Đáp án cùng với nội dung câu hỏi phải hoàn chỉnh 1 câu, vẹn nghĩa: Nếu câu hỏi có dấu ? thì mỗi đáp án là một câu/ngữ hoàn chỉnh, viết hoa chữ cái đầu và kết thúc bằng dấu chấm (.); nếu câu dẫn lửng (không có dấu ?), câu dẫn nối tiếp với đáp án phải tạo thành một câu hoàn chỉnh đúng ngữ pháp, chữ cái đầu đáp án viết thường (trừ danh từ riêng) và kết thúc bằng dấu chấm (.). Tuyệt đối không được cắt bớt từ của đáp án làm câu cụt nghĩa.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773; Kĩ thuật khảo thí',
    checkMethod: 'Đọc nối câu dẫn với từng phương án A, B, C, D để kiểm tra tính toàn vẹn ngữ pháp, không cắt cụt từ',
    isMandatory: true,
  },
  {
    id: 'C10',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Chỉ có một đáp án đúng, chính xác nhất.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C11',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Cấm tuyệt đối phương án "Tất cả các đáp án trên đều đúng/sai", "Không có đáp án nào đúng" hoặc trung lập.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'C12',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Phương án nhiễu lấy từ nhầm lẫn thường gặp trong Địa lí: lẫn nguyên nhân với hệ quả; lẫn đặc điểm nội lực - ngoại lực; lẫn quy luật theo vĩ độ, độ cao, lục địa - đại dương; lẫn đơn vị đo.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí Địa lí',
    isMandatory: true,
  },
  {
    id: 'C13',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Phương án nhiễu là khái niệm hoặc địa danh học sinh đã học, không dùng địa danh ngoài chương trình để đánh lừa vô căn cứ.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C14',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Câu về vị trí, phân bố, số liệu hiện trạng phải theo số liệu và đơn vị hành chính mới nhất trong SGK hoặc niên giám thống kê chính thức.',
    sourceType: 'TH',
    sourceDetail: 'TH; KT',
    isMandatory: true,
  },
  {
    id: 'C15',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Phương án là số thì cùng đơn vị đo, xếp theo thứ tự tăng dần, đơn vị nêu rõ trong câu dẫn hoặc sau từng số.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C16',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Bốn phương án có độ dài và cấu trúc tương đương; đáp án ngắn gọn tự nhiên, tròn nghĩa và hoàn chỉnh (4 - 8 từ, 1 vế cốt lõi); đáp án đúng không dài hơn các phương án còn lại. Cấm tuyệt đối soạn phương án dài rồi cắt từ cơ học làm câu què cụt, mất trọn nghĩa.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C17',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Đáp án đúng phân bố đều A, B, C, D trong cả phần (12 câu: mỗi chữ khoảng 3 lần, không trùng 3 lần liên tiếp).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C18',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Tránh câu dẫn phủ định; nếu bắt buộc thì in đậm và VIẾT HOA từ phủ định (KHÔNG, CHƯA), chỉ dùng một lần.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C19',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'Không dùng "luôn luôn", "chỉ", "không bao giờ" riêng ở phương án sai (học sinh dễ loại trừ).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'C20',
    groupId: 'C',
    groupTitle: 'C. Câu nhiều lựa chọn trong Địa lí',
    content: 'CẤM TUYỆT ĐỐI ra câu yêu cầu dùng Atlat Địa lí khi đề kiểm tra không cấp Atlat; theo chuẩn đề thi tốt nghiệp từ 2025 không còn câu hỏi Atlat.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT (chuẩn tốt nghiệp 2025)',
    isMandatory: true,
  },

  // Nhóm D: Câu đúng/sai trong Địa lí (Phần II)
  {
    id: 'D1',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Mỗi câu có đúng 4 ý a, b, c, d; mỗi ý là một khẳng định đúng hoặc sai rõ ràng.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991; VB 764',
    isMandatory: true,
  },
  {
    id: 'D2',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Ngữ liệu có hai kiểu: mô tả trực tiếp một đối tượng địa lí cụ thể, hoặc thông tin quy nạp không nêu rõ đối tượng; cả hai đều phải có đủ ý ở các mức từ Biết đến Vận dụng.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'D3',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Với bảng số liệu hoặc biểu đồ: đọc thông tin hiển thị hoặc so sánh độ lớn là Biết; tính đơn giản (số lần, tỉ lệ, tốc độ tăng trưởng) là Hiểu; giải thích nguyên nhân, lí giải tăng giảm là Vận dụng.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'D4',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Thứ tự mức độ trong mỗi câu theo ma trận của tổ: ý a, b mức Biết; ý c mức Hiểu; ý d mức Vận dụng.',
    sourceType: 'VB',
    sourceDetail: 'VB 7991; KT',
    isMandatory: true,
  },
  {
    id: 'D5',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Các ý độc lập với nhau thì được đảo thứ tự; các ý nối tiếp để dẫn đến một kết quả thì không được đảo.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'D6',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Ý sai phải sai ở một điểm kiến thức xác định, không sai do câu chữ mơ hồ hay từ tuyệt đối.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'D7',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'CẤM TUYỆT ĐỐI không để cả 4 ý cùng đúng hoặc cùng sai; mỗi câu có từ 1 đến 3 ý sai (tỉ lệ 2Đ-2S hoặc 1Đ-3S / 3Đ-1S).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'D8',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Ý dựa vào số liệu phải tính lại được từ bảng đã cho; không cần số liệu ngoài bảng.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'D9',
    groupId: 'D',
    groupTitle: 'D. Câu đúng/sai trong Địa lí',
    content: 'Ý không trùng nguyên mệnh đề với đáp án một câu nhiều lựa chọn khác của đề.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (đáp án độc lập)',
    isMandatory: true,
  },

  // Nhóm E: Câu trả lời ngắn trong Địa lí (Phần III)
  {
    id: 'E1',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Đáp án là một số ngắn (tối đa 4 kí tự kể cả dấu âm và dấu phẩy); học sinh chỉ điền kết quả, không trình bày lời giải.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'E2',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Chỉ dùng ở mức Hiểu và Vận dụng, thường có tính toán; không dùng cho câu chỉ cần nhớ lại một từ.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'E3',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Các dạng tính toán chuẩn Địa lí: tính tăng/giảm, tổng, hiệu; tỉ lệ %; tổng số lượng đối tượng; nhiệt độ theo độ cao (giảm 0,6°C/100m); biên độ nhiệt năm; cự li vận chuyển bình quân; năng suất cây trồng; mật độ dân số; độ che phủ rừng; đếm đối tượng theo tiêu chí xác định.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí Địa lí THPT',
    isMandatory: true,
  },
  {
    id: 'E4',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Công thức phải là công thức quen thuộc trong SGK Địa lí hoặc đề cương; không đưa công thức ngoài chương trình.',
    sourceType: 'TH',
    sourceDetail: 'TH; KT',
    isMandatory: true,
  },
  {
    id: 'E5',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Lệnh hỏi nêu rõ đơn vị cần điền; nếu yêu cầu làm tròn thì nêu rõ làm tròn đến hàng nào (hàng đơn vị hoặc hàng phần mười).',
    sourceType: 'TH',
    sourceDetail: 'TH; KT',
    isMandatory: true,
  },
  {
    id: 'E6',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Chọn số liệu để các bước trung gian không phát sinh tranh cãi về làm tròn; chỉ có một đáp số đúng duy nhất.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },
  {
    id: 'E7',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Có thể đổi đại lượng cần hỏi để đáp số là số nguyên hoặc số thập phân gọn dưới 4 kí tự.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: false,
  },
  {
    id: 'E8',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Câu đếm chỉ hợp lệ khi danh sách đối tượng được liệt kê cố định trong câu và mỗi đối tượng thuộc một loại duy nhất theo SGK.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'E9',
    groupId: 'E',
    groupTitle: 'E. Câu trả lời ngắn trong Địa lí',
    content: 'Hướng dẫn chấm ghi cách tính từng bước để người chấm kiểm tra được.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm F: Bảng số liệu, biểu đồ, bản đồ trong Địa lí
  {
    id: 'F1',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Bảng số liệu và biểu đồ bắt buộc có đầy đủ Tên, Đơn vị, Năm và Nguồn trích dẫn rõ ràng (ví dụ: Nguồn: Niên giám thống kê Việt Nam).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật biên soạn Địa lí',
    isMandatory: true,
  },
  {
    id: 'F2',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Số liệu có chỉnh sửa thì ghi rõ "Số liệu có điều chỉnh" hoặc "Số liệu giả định"; không ghi nguồn thật cho số liệu tự đặt.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'F3',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Số liệu gọn, dễ tính; tỉ lệ phần trăm của một cơ cấu các thành phần bắt buộc cộng lại đúng 100%.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'F4',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Đơn vị viết đúng chuẩn và thống nhất trong cả đề (°C, mm, km, triệu người, nghìn ha, m³/s, tỉ USD...).',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'F5',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Biểu đồ dùng loại phù hợp với nội dung (cột, đường, tròn, miền) khi câu hỏi yêu cầu nhận dạng hoặc nhận xét.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'F6',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Bản đồ, lược đồ có tên, chú giải và tỉ lệ khi cần; không dùng kí hiệu không có trong chú giải.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'F7',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Câu dùng bản đồ chấm điểm hoặc bản đồ biểu đồ phải nêu giá trị của mỗi chấm hoặc mỗi đơn vị biểu đồ trong câu hoặc chú giải.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'F8',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'Đề dành cho học sinh khuyết tật: bảng và hình gọn, chữ đủ lớn, ít đối tượng trên một hình; ghi chú số liệu bằng chữ nếu hình khó đọc.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: false,
  },
  {
    id: 'F9',
    groupId: 'F',
    groupTitle: 'F. Bảng số liệu, biểu đồ, bản đồ',
    content: 'CẤM TUYỆT ĐỐI không ra câu hỏi yêu cầu dùng Atlat khi đề không cho Atlat.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    isMandatory: true,
  },

  // Nhóm G: Tự luận và hướng dẫn chấm môn Địa lí (Phần IV)
  {
    id: 'G1',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Đánh giá nội dung quan trọng của chương trình Địa lí THPT.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G2',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Phù hợp tiêu chí ra đề về trình bày và số điểm.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G3',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Thể hiện rõ nội dung và cấp độ tư duy cần đo.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G4',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Một yêu cầu kèm hướng dẫn cụ thể cách thực hiện.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G5',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Phù hợp trình độ và nhận thức của học sinh.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G6',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Câu mức Hiểu trở lên đòi hỏi hiểu nhiều hơn ghi nhớ.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G7',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Ngôn ngữ đủ rõ để học sinh hiểu đúng yêu cầu.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: true,
  },
  {
    id: 'G8',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Gợi ý độ dài bài làm, thời gian và tiêu chí cần đạt.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: false,
  },
  {
    id: 'G9',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Yêu cầu nêu và chứng minh quan điểm thì nói rõ bài được đánh giá theo lập luận logic.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    isMandatory: false,
  },
  {
    id: 'G10',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Lệnh "trình bày, nêu" dùng cho mức Biết; "phân biệt, so sánh, giải thích" cho mức Hiểu; "giải thích trên tình huống mới" cho mức Vận dụng.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'G11',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Câu nhận xét bảng số liệu: nêu xu hướng chung, dẫn số liệu làm chứng, so sánh, kết luận; hướng dẫn chấm nêu từng bước.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'G12',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Câu giải thích phân rõ các nhóm yếu tố (tự nhiên, kinh tế – xã hội) và số ý cần nêu, không lặp lại nội dung.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },
  {
    id: 'G13',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Hướng dẫn chấm chia điểm đến từng ý nhỏ, tổng khớp điểm câu; khuyến khích dùng rubric.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (bước 5)',
    isMandatory: true,
  },
  {
    id: 'G14',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Đáp án trắc nghiệm trong hướng dẫn chấm khớp 100% với đáp án đánh dấu trong đề.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773 (đối chiếu đáp án)',
    isMandatory: true,
  },
  {
    id: 'G15',
    groupId: 'G',
    groupTitle: 'G. Tự luận và hướng dẫn chấm môn Địa lí',
    content: 'Có dòng lưu ý chấp nhận cách trình bày khác nhưng đúng bản chất khoa học địa lí; nêu từ khoá bắt buộc của từng ý.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    isMandatory: true,
  },

  // Nhóm H: Câu chữ SGK, ngữ liệu và chống lộ đáp án
  {
    id: 'H1',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Mọi khái niệm và đáp án đúng tuân thủ duy nhất 1 bộ SGK mới nhất hiện hành (bộ Kết nối tri thức với cuộc sống) và tự cập nhật nội dung, số liệu thực tiễn mới hiện hành, ghi rõ số bài và nguồn.',
    sourceType: 'KT',
    sourceDetail: 'KT; VB 8773 (đối chiếu đáp án)',
    checkMethod: 'Ghi số bài và số trang vào phiếu rà soát',
    isMandatory: true,
  },
  {
    id: 'H2',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Hạn chế trích nguyên văn câu có sẵn trong SGK ở câu dẫn và đoạn ngữ liệu; không chép trọn câu mà đổi bối cảnh thực tiễn.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'So sánh đoạn ngữ liệu với trang SGK, mỗi câu không trùng trọn câu',
    isMandatory: true,
  },
  {
    id: 'H3',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Đề thi tốt nghiệp & định kì: ngữ liệu phát triển theo hướng thực tiễn mới, không nằm nguyên văn trong SGK.',
    sourceType: 'TH',
    sourceDetail: 'Tập huấn Bộ GD&ĐT',
    checkMethod: 'Đổi bối cảnh, ví dụ hoặc số liệu so với SGK',
    isMandatory: true,
  },
  {
    id: 'H4',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Đoạn tóm lược SGK ghi "Tóm lược theo SGK..., Bài..." và không thêm ý SGK không có.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    checkMethod: 'Đối chiếu từng ý với bài đã ghi',
    isMandatory: false,
  },
  {
    id: 'H5',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Đáp án một câu độc lập với các câu khác: không nằm trong đề bài, phương án hay ngữ liệu của câu khác trong toàn bộ đề.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'Với mỗi ý của đáp án tự luận và mỗi đáp số trả lời ngắn, tìm từ khoá trong toàn đề',
    isMandatory: true,
  },
  {
    id: 'H6',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Ý đúng/sai không lặp lại mệnh đề của một câu nhiều lựa chọn cùng bài (cùng mệnh đề, đổi cách hỏi).',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'So sánh từng cặp cùng bài',
    isMandatory: true,
  },
  {
    id: 'H7',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Đoạn ngữ liệu không chứa nguyên đáp án của câu nhiều lựa chọn.',
    sourceType: 'VB',
    sourceDetail: 'VB 8773',
    checkMethod: 'Đối chiếu từng câu nhiều lựa chọn với ngữ liệu',
    isMandatory: true,
  },
  {
    id: 'H8',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Trùng chủ đề giữa các phần thì chỉ trùng ở mức chủ đề rộng, không trùng điều mà câu kia đang hỏi.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    checkMethod: 'Đọc lệnh hỏi của câu kia',
    isMandatory: true,
  },
  {
    id: 'H9',
    groupId: 'H',
    groupTitle: 'H. Câu chữ SGK, ngữ liệu và chống lộ đáp án',
    content: 'Gạch chân đáp án chỉ có ở bản dành cho giáo viên; phụ lục đối chiếu ma trận không in kèm đề phát cho học sinh.',
    sourceType: 'KT',
    sourceDetail: 'Kĩ thuật khảo thí',
    checkMethod: 'Xuất hai bản trước khi in',
    isMandatory: true,
  },
];

/**
 * Lấy danh sách quy tắc chuẩn hóa theo môn học:
 * - Nếu là môn 'Địa lí': lấy Bộ quy tắc đặc thù Địa lí (GEOGRAPHY_EXAM_RULES - 84 điều).
 * - Các môn học khác: lấy Bộ quy tắc rà soát trắc nghiệm chung (GENERAL_EXAM_RULES - 56 điều).
 */
export function getRulesForSubject(subject: string): ExamRuleItem[] {
  if (subject === 'Địa lí') {
    return GEOGRAPHY_EXAM_RULES;
  }
  return GENERAL_EXAM_RULES;
}

export interface HardRuleLockMetadata {
  subject: string;
  isGeography: boolean;
  rulebookTitle: string;
  totalRules: number;
  mandatoryRulesCount: number;
  groups: {
    groupId: string;
    groupTitle: string;
    ruleIds: string[];
    mandatoryCount: number;
  }[];
  criticalLocks: string[];
}

/**
 * Trích xuất thông tin khóa cứng bộ quy tắc khảo thí (Pre-Generation Hard-Rule Lock)
 * phục vụ bước 1 (Đọc kỹ & khóa cứng trước khi ra đề) và bước 3 (Đối chiếu hậu kiểm).
 */
export function getHardRuleLockSummary(subject: string): HardRuleLockMetadata {
  const isGeo = subject === 'Địa lí';
  const rules = getRulesForSubject(subject);
  const groupMap = new Map<string, { groupId: string; groupTitle: string; ruleIds: string[]; mandatoryCount: number }>();

  rules.forEach((r) => {
    const existing = groupMap.get(r.groupId);
    if (existing) {
      existing.ruleIds.push(r.id);
      if (r.isMandatory) existing.mandatoryCount++;
    } else {
      groupMap.set(r.groupId, {
        groupId: r.groupId,
        groupTitle: r.groupTitle,
        ruleIds: [r.id],
        mandatoryCount: r.isMandatory ? 1 : 0,
      });
    }
  });

  const criticalLocks = isGeo
    ? [
        '[A1-A10] Khớp 100% ma trận & bản đặc tả CV 7991; Tuân thủ duy nhất 1 bộ SGK mới nhất hiện hành (Kết nối tri thức) & tự cập nhật nội dung mới hiện hành (40% Biết - 30% Hiểu - 30% Vận dụng).',
        '[B1-B4] Động từ lệnh khớp đúng mức độ nhận thức; địa danh trong phạm vi SGK Địa lí THPT và địa giới hành chính cập nhật mới nhất.',
        '[C1-C20] Phần I (NLC): 4 phương án A, B, C, D đồng nhất 1 vế, độ dài tương đương (7-10 từ), phân bố đều A/B/C/D, từ phủ định IN HOA ĐẬM (**KHÔNG**, **SAI**), CẤM TUYỆT ĐỐI câu hỏi dùng Atlat.',
        '[D1-D9] Phần II (Đúng/Sai): 4 ý a, b, c, d theo thứ tự B-B-H-V; CẤM TUYỆT ĐỐI 4 ý cùng Đúng hoặc 4 ý cùng Sai (bắt buộc có 1-3 ý sai); đủ ngữ liệu/bảng số liệu kèm nguồn.',
        '[E1-E9] Phần III (Trả lời ngắn): 100% bài toán tính toán đặc thù Địa lí, đáp số ≤ 4 kí tự, nêu rõ đơn vị và quy ước làm tròn.',
        '[F1-F9] Bảng số liệu đủ Tên, Đơn vị, Năm, Nguồn chuẩn; cơ cấu thành phần cộng đúng 100%; cấm câu hỏi yêu cầu Atlat.',
        '[G1-G15] Phần IV (Tự luận): Đáp án tách ý gạch đầu dòng rõ từ khóa SGK Kết nối tri thức mới nhất, phân rõ nhân tố tự nhiên & kinh tế - xã hội, rubric chia điểm khớp tổng điểm câu.',
        '[H1-H9] Độc lập tuyệt đối giữa các câu: Chống lộ đáp án chéo giữa Phần I, II, III, IV và giữa các mã đề.',
      ]
    : [
        '[A1-A8] Khớp 100% ma trận & bản đặc tả CV 7991; Tuân thủ duy nhất 1 bộ SGK mới nhất hiện hành (Kết nối tri thức) & tự cập nhật nội dung mới hiện hành (40% Biết - 30% Hiểu - 30% Vận dụng).',
        '[B1-B18] Phần I (NLC): 4 phương án A, B, C, D đồng nhất 1 vế, độ dài tương đương (7-10 từ), cấm phương án trung lập/"Tất cả đều đúng/sai", từ phủ định IN HOA ĐẬM (**KHÔNG**, **SAI**).',
        '[C1-C9] Phần II (Đúng/Sai): 4 ý a, b, c, d theo thứ tự B-B-H-V; CẤM TUYỆT ĐỐI 4 ý cùng Đúng hoặc 4 ý cùng Sai (bắt buộc có 1-3 ý sai); đủ ngữ liệu kèm nguồn.',
        '[D1-D8] Phần III (Trả lời ngắn): 100% bài toán tính toán mức Hiểu/Vận dụng, đáp số ≤ 4 kí tự, nêu rõ đơn vị và quy ước làm tròn.',
        '[E1-E12] Phần IV (Tự luận): Đáp án tách ý gạch đầu dòng rõ từ khóa SGK Kết nối tri thức mới nhất, rubric chia điểm khớp tổng điểm câu.',
        '[G1-G5] Ngữ liệu gắn thực tiễn mới, chuẩn thuật ngữ SGK hiện hành duy nhất và tự động cập nhật số liệu mới nhất, không lỗi font chữ Unicode.',
        '[H1-H7] Độc lập tuyệt đối giữa các câu: Chống lộ đáp án chéo giữa Phần I, II, III, IV và giữa các mã đề.',
      ];

  return {
    subject,
    isGeography: isGeo,
    rulebookTitle: isGeo
      ? 'Bộ quy tắc ra đề và rà soát đề kiểm tra định kì môn Địa lí THPT (84 điều)'
      : `Bộ quy tắc rà soát đề kiểm tra trắc nghiệm định kì chuẩn Bộ GD&ĐT (56 điều)`,
    totalRules: rules.length,
    mandatoryRulesCount: rules.filter((r) => r.isMandatory).length,
    groups: Array.from(groupMap.values()),
    criticalLocks,
  };
}

/**
 * Tạo prompt chỉ dẫn quy tắc cứng (Pre-Generation Hard-Rule Lock + Self-Audit Mandate)
 * khi gọi AI tạo câu hỏi hoặc sửa câu hỏi
 */
export function getPromptRulesInstruction(subject: string): string {
  const isGeo = subject === 'Địa lí';
  const rules = getRulesForSubject(subject);
  const lockSummary = getHardRuleLockSummary(subject);
  const title = isGeo
    ? 'BỘ QUY TẮC CỨNG RA ĐỀ VÀ RÀ SOÁT ĐỀ KIỂM TRA ĐỊNH KÌ MÔN ĐỊA LÍ THPT (84 ĐIỀU KHOẢN - CÔNG VĂN 7991, 8773 & QĐ 764)'
    : 'BỘ QUY TẮC CỨNG RÀ SOÁT ĐỀ KIỂM TRA TRẮC NGHIỆM ĐỊNH KÌ (56 ĐIỀU KHOẢN - CÔNG VĂN 7991, 8773 & QĐ 764)';

  const mandatoryRules = rules
    .filter((r) => r.isMandatory)
    .map((r) => `[${r.id}] (${r.sourceType}): ${r.content}`)
    .join('\n');

  let specializedDirectives = '';
  if (isGeo) {
    specializedDirectives = `
ĐẶC THÙ KHÓA CỨNG BẮT BUỘC RIÊNG CHO MÔN ĐỊA LÍ (${lockSummary.totalRules} ĐIỀU):
- [A10/VB] TUÂN THỦ DUY NHẤT 1 BỘ SGK MỚI NHẤT HIỆN HÀNH (KẾT NỐI TRI THỨC VỚI CUỘC SỐNG) & TỰ CẬP NHẬT NỘI DUNG MỚI HIỆN HÀNH: Để có 1 câu hỏi và đáp án hoàn chỉnh, trọn vẹn và rõ nghĩa, bắt buộc chỉ tuân thủ đúng 1 bộ SGK mới nhất hiện hành làm chuẩn duy nhất (SGK Địa lí Kết nối tri thức); đồng thời hệ thống tự động cập nhật số liệu mới nhất (Niên giám Thống kê mới nhất), địa danh hành chính mới nhất (sáp nhập đơn vị hành chính), quy chuẩn kỹ thuật QCVN và thực tiễn phát triển kinh tế - xã hội hiện hành. Tuyệt đối không tự suy diễn số liệu hay dùng địa danh/dữ liệu cũ lỗi thời.
- [C20/F9] CẤM TUYỆT ĐỐI ra câu hỏi yêu cầu sử dụng Atlat Địa lí (đề tham khảo tốt nghiệp từ 2025 không còn câu hỏi Atlat).
- [C9/C16] Phần I (Nhiều lựa chọn): TẤT CẢ CÂU HỎI VÀ ĐÁP ÁN PHẢI RÕ NGHĨA, CHÍNH XÁC VỀ MẶT KIẾN THỨC, CÓ CHỦ NGỮ - VỊ NGỮ ĐẦY ĐỦ, KHÔNG MƠ HỒ. CÁC PHƯƠNG ÁN NHIỄU PHẢI HỢP LÝ, KHÔNG TẠO RA CÂU VÔ NGHĨA HOẶC HÀI HƯỚC VÔ TƯ LỰ. TUYỆT ĐỐI CẤM để đáp án bị cụt nghĩa theo văn phong tiếng Việt (ví dụ vô nghĩa như "Dâng toàn diện..."). ĐÁP ÁN NGẮN GỌN TỰ NHIÊN, TRÒN NGHĨA VÀ HOÀN CHỈNH (5 - 8 từ, 1 vế cốt lõi). TUYỆT ĐỐI CẤM soạn phương án dài dòng rồi cắt từ cơ học làm mất vị ngữ hoặc bổ ngữ. ĐÁP ÁN CÙNG VỚI NỘI DUNG CÂU HỎI PHẢI HOÀN CHỈNH 1 CÂU: Nếu câu hỏi có dấu ?, mỗi phương án là câu/ngữ hoàn chỉnh viết hoa chữ đầu kết thúc bằng dấu chấm (.); nếu câu dẫn lửng, câu dẫn ghép với đáp án phải tạo thành 1 câu trọn vẹn ngữ pháp (đủ chủ ngữ - vị ngữ), viết thường chữ đầu (trừ danh từ riêng), kết thúc dấu chấm (.). Cả 4 phương án A, B, C, D đồng nhất 1 vế câu súc tích, độ dài tương đương nhau, không để đáp án đúng dài hơn hoặc nhiều vế hơn phương án nhiễu.
- [C18] Câu dẫn phủ định bắt buộc VIẾT HOA VÀ IN ĐẬM từ phủ định (**KHÔNG**, **CHƯA**, **SAI**).
- [F1/F3] Bảng số liệu hoặc biểu đồ bắt buộc có đầy đủ Tên bảng, Đơn vị đo, Năm và Nguồn trích dẫn uy tín; tỉ lệ phần trăm của một cơ cấu các thành phần phải cộng đúng 100%.
- [C12/C14] Phương án nhiễu lấy từ nhầm lẫn thường gặp trong Địa lí; vị trí, phân bố, số liệu hiện trạng theo số liệu và đơn vị hành chính mới nhất trong SGK.
- [D1-D9] Phần II (Đúng/Sai): mỗi câu có 4 ý a, b, c, d với ý a, b mức Biết; ý c mức Hiểu; ý d mức Vận dụng. CẤM TUYỆT ĐỐI 4 ý cùng Đúng hoặc cùng Sai (phải có từ 1 đến 3 ý sai).
- [E1-E9] Phần III (Trả lời ngắn): 100% là bài toán tính toán ra một giá trị số duy nhất (tối đa 4 kí tự), nêu rõ đơn vị và quy ước làm tròn trong lời dẫn.
- [G11-G15] Phần IV (Tự luận): nhận xét bảng số liệu nêu xu hướng chung, dẫn số liệu làm chứng, so sánh; câu giải thích phân rõ yếu tố tự nhiên và kinh tế - xã hội, tách ý gạch đầu dòng kèm rubric điểm chi tiết.
- [H1-H9] Chống lộ đáp án chéo: đáp án của một câu không được xuất hiện trong ngữ liệu hoặc phương án của câu khác.
`;
  } else {
    specializedDirectives = `
ĐẶC THÙ KHÓA CỨNG BẮT BUỘC (${lockSummary.totalRules} ĐIỀU):
- [A8/VB] TUÂN THỦ DUY NHẤT 1 BỘ SGK MỚI NHẤT HIỆN HÀNH (KẾT NỐI TRI THỨC VỚI CUỘC SỐNG) & TỰ CẬP NHẬT NỘI DUNG MỚI HIỆN HÀNH: Để có 1 câu hỏi và đáp án hoàn chỉnh, trọn vẹn và rõ nghĩa, bắt buộc chỉ tuân thủ đúng 1 bộ SGK mới nhất hiện hành làm chuẩn duy nhất (Bộ Kết nối tri thức với cuộc sống của NXB Giáo dục Việt Nam); đồng thời hệ thống tự động cập nhật các nội dung mới hiện hành (số liệu thống kê mới nhất, quy chuẩn kỹ thuật QCVN, văn bản quy phạm pháp luật đang có hiệu lực thi hành, không dùng dữ liệu/thuật ngữ cũ lỗi thời).
- [B11] CẤM TUYỆT ĐỐI phương án "Tất cả đáp án trên đều đúng/sai", "Không có đáp án nào đúng" hoặc phương án trung lập, không xác định.
- [B9/B12] Phần I (Nhiều lựa chọn): TẤT CẢ CÂU HỎI VÀ ĐÁP ÁN PHẢI RÕ NGHĨA, CHÍNH XÁC VỀ MẶT KIẾN THỨC, CÓ CHỦ NGỮ - VỊ NGỮ ĐẦY ĐỦ, KHÔNG MƠ HỒ. CÁC PHƯƠNG ÁN NHIỄU PHẢI HỢP LÝ, KHÔNG TẠO RA CÂU VÔ NGHĨA HOẶC HÀI HƯỚC VÔ TƯ LỰ. TUYỆT ĐỐI CẤM để đáp án bị cụt nghĩa theo văn phong tiếng Việt (ví dụ vô nghĩa như "Dâng toàn diện..."). ĐÁP ÁN NGẮN GỌN TỰ NHIÊN, TRÒN NGHĨA VÀ HOÀN CHỈNH (5 - 8 từ, 1 vế cốt lõi). TUYỆT ĐỐI CẤM soạn phương án dài dòng rồi cắt từ cơ học làm mất vị ngữ hoặc bổ ngữ. ĐÁP ÁN CÙNG VỚI NỘI DUNG CÂU HỎI PHẢI HOÀN CHỈNH 1 CÂU: Nếu câu hỏi có dấu ?, mỗi phương án là câu/ngữ hoàn chỉnh viết hoa chữ đầu kết thúc bằng dấu chấm (.); nếu câu dẫn lửng, câu dẫn ghép với đáp án phải tạo thành 1 câu trọn vẹn ngữ pháp (đủ chủ ngữ - vị ngữ), viết thường chữ đầu (trừ danh từ riêng), kết thúc dấu chấm (.). Cả 4 phương án A, B, C, D đồng nhất 1 vế câu súc tích, độ dài tương đương nhau, không để đáp án đúng dài hơn hoặc nhiều vế hơn phương án nhiễu.
- [B13-B15] Phương án là số hoặc năm thì xếp theo thứ tự tăng dần; đáp án đúng phân bố đều A, B, C, D; từ phủ định trong câu dẫn VIẾT HOA VÀ IN ĐẬM (**KHÔNG**, **CHƯA**, **SAI**).
- [C1-C9] Phần II (Đúng/Sai): 4 ý a, b, c, d xếp theo mức độ a, b (Biết) - c (Hiểu) - d (Vận dụng); CẤM TUYỆT ĐỐI 4 ý cùng Đúng hoặc cùng Sai (mỗi câu bắt buộc có từ 1 đến 3 ý sai).
- [D1-D8] Phần III (Trả lời ngắn): đáp án là một số ngắn tối đa 4 kí tự (kể cả dấu âm và dấu phẩy), chỉ hỏi mức Hiểu và Vận dụng, nêu rõ đơn vị và quy ước làm tròn.
- [E1-E12] Phần IV (Tự luận): Đáp án tách gạch đầu dòng rõ từ khóa SGK Kết nối tri thức mới nhất, kèm rubric chia điểm đến từng ý nhỏ.
- [H1-H7] Chống lộ đáp án chéo tuyệt đối giữa các phần (Tự luận, Trả lời ngắn, Đúng/Sai, Nhiều lựa chọn).
`;
  }

  return `
=== [BƯỚC 1: KHÓA CỨNG BỘ QUY TẮC KHẢO THÍ TRƯỚC KHI RA ĐỀ — ${title}] ===
BẮT BUỘC ĐỌC KỸ VÀ KHÓA CỨNG ${lockSummary.mandatoryRulesCount}/${lockSummary.totalRules} ĐIỀU KHOẢN BẮT BUỘC SAU ĐÂY LÀM TIÊU CHUẨN CỨNG TRƯỚC KHI SOẠN THẢO BẤT KỲ CÂU HỎI NÀO:
${mandatoryRules}

${specializedDirectives}
=== [BƯỚC 2: QUY TRÌNH TỰ ĐỐI CHIẾU & TỰ SỬA TRƯỚC KHI XUẤT KẾT QUẢ] ===
Trước khi trả về JSON cuối cùng, bạn BẮT BUỘC tự đọc lại toàn bộ câu hỏi vừa soạn và đối chiếu từng điều khoản [A -> H] ở trên:
0. Kiểm tra tuân thủ duy nhất 1 bộ SGK mới nhất hiện hành và tự cập nhật nội dung mới hiện hành: Đã đối chiếu toàn bộ câu hỏi và đáp án theo chuẩn duy nhất 1 bộ SGK mới nhất (Kết nối tri thức với cuộc sống) và tự động cập nhật dữ liệu, địa danh, quy định mới nhất hiện hành chưa?
1. Kiểm tra từng câu Phần I: ĐÁP ÁN ĐÃ NGẮN GỌN TỰ NHIÊN (4 - 8 từ, 1 vế), VẪN TRÒN NGHĨA VÀ KHI GHÉP VỚI CÂU DẪN CÓ TẠO THÀNH 1 CÂU HOÀN CHỈNH 100% CHƯA? TUYỆT ĐỐI CẤM cắt bớt từ của đáp án một cách cơ học làm câu cụt nghĩa. Cả 4 phương án A, B, C, D đã có đúng 1 vế và cấu trúc tương đương chưa? Nếu có phương án bị cụt hoặc dài dòng, PHẢI TỰ VIẾT LẠI NGAY.
2. Kiểm tra từng câu Phần II: Đã đủ 4 ý a(B)-b(B)-c(H)-d(V), có cả Đúng và Sai (không bị 4/4 Đúng hay 4/4 Sai), và ngữ liệu không lỗi font chưa?
3. Kiểm tra từng câu Phần III: Đáp số đã ≤ 4 kí tự và lời dẫn đã ghi rõ đơn vị + quy ước làm tròn chưa?
4. Kiểm tra từng câu Phần IV: Hướng dẫn chấm đã tách gạch đầu dòng chứa từ khóa SGK cụ thể và tổng điểm rubric khớp thang điểm chưa?
5. Kiểm tra chéo toàn đề: Tuyệt đối không để ngữ liệu câu này làm lộ đáp án câu kia.
`;
}

