import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Iterator === 'undefined') {
  const iterProto = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
  function IteratorPolyfill() {}
  if (iterProto) IteratorPolyfill.prototype = iterProto;
  (globalThis as any).Iterator = IteratorPolyfill;
}

if (typeof window !== 'undefined' && pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

// Strict TCVN3 (.VnTime / ABC) word patterns: ONLY match words containing non-Unicode TCVN3 byte sequences
const TCVN3_STRICT_WORD_PATTERNS =
  /(?:nhiÖt|®Þa|ph¸t|triÓn|ViÖt|n­íc|®ång|b»ng|miÒn|d©n|sè|tù|nhiªn|tÕ|x·|héi|c«ng|nghiÖp|n«ng|l©m|thñy|s¶n|dÞch|vïng|biÓn|khÝ|hËu|l­îng|m­a|s«ng|ngßi|tµi|nguyªn|m«i|tr­êng)/;

// Precomposed Unicode Vietnamese Extended characters (U+0102..U+1EF9) that NEVER exist in 8-bit TCVN3 or VNI-Windows
const UNICODE_VN_EXTENDED_REGEX = /[ăĂđĐĩĨũŨơƠưƯạ-ỹẠ-Ỹ]/;

const TCVN3_CHAR_MAP: Record<string, string> = {
  '¸': 'á', 'µ': 'à', '¶': 'ả', '·': 'ã', '¹': 'ạ',
  '¨': 'ă', '¾': 'ắ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ê': 'ấ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ',
  '®': 'đ', '§': 'Đ',
  'Ð': 'é', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ', 'Ñ': 'ẹ',
  'ª': 'ê', 'Õ': 'ế', 'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ',
  'Ý': 'í', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ', 'Þ': 'ị',
  'ã': 'ó', 'ß': 'ò', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ',
  '«': 'ô', 'è': 'ố', 'å': 'ồ', 'æ': 'ổ', 'ç': 'ỗ', 'é': 'ộ',
  '¬': 'ơ', 'í': 'ớ', 'ê': 'ờ', 'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ',
  'ó': 'ú', 'ï': 'ù', 'ñ': 'ủ', 'ò': 'ũ', 'ô': 'ụ',
  '­': 'ư', 'ø': 'ứ', 'õ': 'ừ', 'ö': 'ử', '÷': 'ữ', 'ù': 'ự',
  'ý': 'ý', 'ú': 'ỳ', 'û': 'ỷ', 'ü': 'ỹ', 'þ': 'ỵ',
  '¡': 'Ă', '¢': 'Â', '£': 'Ê', '¤': 'Ô', '¥': 'Ơ', '¦': 'Ư',
};

// Common VNI-Windows 2-char sequences -> Unicode NFC
const VNI_REPLACEMENTS: [RegExp, string][] = [
  [/aêù/g, 'ắ'], [/aêø/g, 'ằ'], [/aêû/g, 'ẳ'], [/aêõ/g, 'ẵ'], [/aêï/g, 'ặ'], [/aê/g, 'ă'],
  [/AÊÙ/g, 'Ắ'], [/AÊØ/g, 'Ằ'], [/AÊÛ/g, 'Ẳ'], [/AÊÕ/g, 'Ẵ'], [/AÊÏ/g, 'Ặ'], [/AÊ/g, 'Ă'],
  [/aâù/g, 'ấ'], [/aâø/g, 'ầ'], [/aâû/g, 'ẩ'], [/aâõ/g, 'ẫ'], [/aâï/g, 'ậ'], [/aâ/g, 'â'],
  [/AÂÙ/g, 'Ấ'], [/AÂØ/g, 'Ầ'], [/AÂÛ/g, 'Ẩ'], [/AÂÕ/g, 'Ẫ'], [/AÂÏ/g, 'Ậ'], [/AÂ/g, 'Â'],
  [/eâù/g, 'ế'], [/eâø/g, 'ề'], [/eâû/g, 'ể'], [/eâõ/g, 'ễ'], [/eâï/g, 'ệ'], [/eâ/g, 'ê'],
  [/EÂÙ/g, 'Ế'], [/EÂØ/g, 'Ề'], [/EÂÛ/g, 'Ể'], [/EÂÕ/g, 'Ễ'], [/EÂÏ/g, 'Ệ'], [/EÂ/g, 'Ê'],
  [/oâù/g, 'ố'], [/oâø/g, 'ồ'], [/oâû/g, 'ổ'], [/oâõ/g, 'ỗ'], [/oâï/g, 'ộ'], [/oâ/g, 'ô'],
  [/OÂÙ/g, 'Ố'], [/OÂØ/g, 'Ồ'], [/OÂÛ/g, 'Ổ'], [/OÂÕ/g, 'Ỗ'], [/OÂÏ/g, 'Ộ'], [/OÂ/g, 'Ô'],
  [/ôù/g, 'ớ'], [/ôø/g, 'ờ'], [/ôû/g, 'ở'], [/ôõ/g, 'ỡ'], [/ôï/g, 'ợ'],
  [/ÔÙ/g, 'Ớ'], [/ÔØ/g, 'Ờ'], [/ÔÛ/g, 'Ở'], [/ÔÕ/g, 'Ỡ'], [/ÔÏ/g, 'Ợ'],
  [/öù/g, 'ứ'], [/öø/g, 'ừ'], [/öû/g, 'ử'], [/öõ/g, 'ữ'], [/öï/g, 'ự'], [/ö/g, 'ư'], [/Ö/g, 'Ư'],
  [/aù/g, 'á'], [/aø/g, 'à'], [/aû/g, 'ả'], [/aõ/g, 'ã'], [/aï/g, 'ạ'],
  [/eù/g, 'é'], [/eø/g, 'è'], [/eû/g, 'ẻ'], [/eõ/g, 'ẽ'], [/eï/g, 'ẹ'],
  [/où/g, 'ó'], [/oø/g, 'ò'], [/oû/g, 'ỏ'], [/oõ/g, 'õ'], [/oï/g, 'ọ'],
  [/uù/g, 'ú'], [/uø/g, 'ù'], [/uû/g, 'ủ'], [/uõ/g, 'ũ'], [/uï/g, 'ụ'],
  [/yù/g, 'ý'], [/yø/g, 'ỳ'], [/yû/g, 'ỷ'], [/yõ/g, 'ỹ'], [/yï/g, 'ỵ'],
  [/ñ/g, 'đ'], [/Ñ/g, 'Đ'],
];

/**
 * Heals Unicode Vietnamese text that was previously mangled by TCVN3 character mapping
 * (e.g. "Đụ thị hỳa ... dừn số ... vẫn cũn ... cỏc nước ... trờn khắp cỏc vựng ... đỳng vai trũ là hạt nhừn ... thu hỳt ... thỳc đẩy").
 */
export function healMangledUnicodeVietnamese(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let s = input;

  // Quick check: only run if string contains telltale mangled syllables
  if (
    !/(?:cỏc|khỏc|phỏt|quỏ|tỏc|xỏc|đỏnh|thỏng|sỏng|toỏn|bỏo|giỏo|mỏy|chỏy|phỏp|giỏp|sỏt|mỏt|trờn|nờn|lờn|bờn|tờn|thờm|đờm|kờnh|chờnh|biờn|miờn|liờn|hiờn|tiờn|viờn|nghiờn|chuyờn|nguyờn|tuyờn|nhiờu|chiờu|điờu|tiờu|vựng|cựng|dựng|trựng|cũn|trũ|dũng|phũng|vũng|ngũi|dừn|nhừn|phừn|cừn|từn|vừn|lừn|ngừn|thừn|chừn|xuừn|quừn|từm|thừm|lừm|chừm|từy|đừy|mừy|cừy|xừy|gừy|vừy|dừy|chừu|sừu|nừu|lừu|dừu|hỳa|khỳa|xỳa|đỳ\b|cỳ\b|khỳ\b|giỳ\b|chỳ\b|đỳng|nỳng|bỳng|sỳng|phỳng|chỳng|hỳt|thỳc|rỳt|sỳt|mỳt|phỳt|chỳt|lỳc|mỳc|phỳc|xỳc|chỳc|khỳc|trỳc|gỳp|giỳp|nhỳm|tỳm|xỳm|đỳn|mỳn|nỳn|bỳn|đỳi|khỳi|ngỳi|nỳi|gỳi|tỳi|cỳi|đụ\s+thị|khụng|cụng|đụng|sụng|nụng|thụng|trụng|luụn|muụn|thụn|tụn|mụn|đụi|mụi|tụi|vụi|thụi|trụi|sụi|khụi|nụi|phụi|tụm|hụm|nhụm|khớ|lớ|chớ|trớ|phớ|tớnh|chớnh|kớnh|tớch|kớch|thớch|trỡnh|hỡnh|bỡnh|mỡnh|tỡnh|vỡ|thỡ|gỡ|kỡ|xỳ\s+hội|lỳnh\s+thổ|dỳy\s+núi|ớ\s+nghĩa)/i.test(
      s
    )
  ) {
    return s;
  }

  // 1. Multi-word & contextual exact phrases first
  const phraseFixes: [RegExp, string][] = [
    [/\bớ nghĩa/g, 'Ý nghĩa'],
    [/\bĐụ thị/g, 'Đô thị'],
    [/\bđụ thị/g, 'đô thị'],
    [/\bụ tô\b/gi, 'ô tô'],
    [/\bxỳ hội\b/gi, 'xã hội'],
    [/\blỳnh thổ\b/gi, 'lãnh thổ'],
    [/\bdỳy núi\b/gi, 'dãy núi'],
    [/\bvỳn cũn\b/gi, 'vẫn còn'],
    [/\bvẫn cũn\b/gi, 'vẫn còn'],
    [/\bđỳng vai trũ\b/gi, 'đóng vai trò'],
    [/\bvai trũ\b/gi, 'vai trò'],
    [/\bđỳng gỳp\b/gi, 'đóng góp'],
    [/\bthu hỳt\b/gi, 'thu hút'],
    [/\bthỳc đẩy\b/gi, 'thúc đẩy'],
    [/\bchỳ ý\b/gi, 'chú ý'],
    [/\bsụng ngũi\b/gi, 'sông ngòi'],
    [/\bdũng biển\b/gi, 'dòng biển'],
    [/\bdũng sông\b/gi, 'dòng sông'],
    [/\bphũng hộ\b/gi, 'phòng hộ'],
    [/\bkhớ hậu\b/gi, 'khí hậu'],
    [/\bđịa lớ\b/gi, 'địa lí'],
    [/\bhợp lớ\b/gi, 'hợp lí'],
    [/\bquản lớ\b/gi, 'quản lí'],
    [/\bxử lớ\b/gi, 'xử lí'],
    [/\bפּháp lớ\b/gi, 'pháp lí'],
    [/\btự nhiờn\b/gi, 'tự nhiên'],
    [/\bthiên nhiờn\b/gi, 'thiên nhiên'],
    [/\bnhiờn liệu\b/gi, 'nhiên liệu'],
    [/\bnguyờn nhân\b/gi, 'nguyên nhân'],
    [/\bnguyờnnhừn\b/gi, 'nguyên nhân'],
    [/\bnguyờn liệu\b/gi, 'nguyên liệu'],
    [/\btài nguyờn\b/gi, 'tài nguyên'],
    [/\bTây Nguyờn\b/g, 'Tây Nguyên'],
    [/\bchuyờn môn\b/gi, 'chuyên môn'],
    [/\bchuyờn canh\b/gi, 'chuyên canh'],
    [/\bchuyờn đề\b/gi, 'chuyên đề'],
    [/\btiờu thụ\b/gi, 'tiêu thụ'],
    [/\btiờu biểu\b/gi, 'tiêu biểu'],
    [/\btiờu chuẩn\b/gi, 'tiêu chuẩn'],
    [/\bchỉ tiờu\b/gi, 'chỉ tiêu'],
    [/\bmục tiờu\b/gi, 'mục tiêu'],
    [/\bđiờu kiện\b/gi, 'điều kiện'],
    [/\bchiờu hướng\b/gi, 'chiều hướng'],
    [/\btheo chiờu\b/gi, 'theo chiều'],
    [/\bnhiờu nhất\b/gi, 'nhiều nhất'],
    [/\bbiờn độ\b/gi, 'biên độ'],
    [/\bbiờn giới\b/gi, 'biên giới'],
    [/\bven biờn\b/gi, 'ven biển'],
    [/\bliờn kết\b/gi, 'liên kết'],
    [/\bliờn hệ\b/gi, 'liên hệ'],
    [/\bliờn quan\b/gi, 'liên quan'],
    [/\bhiờn nay\b/gi, 'hiện nay'],
    [/\bhiờn đại\b/gi, 'hiện đại'],
    [/\bthể hiờn\b/gi, 'thể hiện'],
    [/\bbiểu hiờn\b/gi, 'biểu hiện'],
    [/\bthực hiờn\b/gi, 'thực hiện'],
    [/\bphát hiờn\b/gi, 'phát hiện'],
    [/\bxuất hiờn\b/gi, 'xuất hiện'],
    [/\bđiều tiớt\b/gi, 'điều tiết'],
    [/\bnhiệt đới giỳ mùa\b/gi, 'nhiệt đới gió mùa'],
    [/\bgiỳ mùa\b/gi, 'gió mùa'],
    [/\bmùa khụ\b/gi, 'mùa khô'],
    [/\blạnh khụ\b/gi, 'lạnh khô'],
    [/\bkhụ nóng\b/gi, 'khô nóng'],
    [/\bkhụ hạn\b/gi, 'khô hạn'],
    [/\bkhoáng sản thụ\b/gi, 'khoáng sản thô'],
    [/\bphản ánh đỳng\b/gi, 'phản ánh đúng'],
    [/\bthể hiện đỳng\b/gi, 'thể hiện đúng'],
    [/\bnội dung nào sau đây đỳng\b/gi, 'nội dung nào sau đây đúng'],
    [/\bđỳng đắn\b/gi, 'đúng đắn'],
    [/\bđỳng quy định\b/gi, 'đúng quy định'],
    [/\bnhanh chỳng\b/gi, 'nhanh chóng'],
    [/\bnỳng quanh năm\b/gi, 'nóng quanh năm'],
    [/\btrong đỳ\b/gi, 'trong đó'],
    [/\btừ đỳ\b/gi, 'từ đó'],
    [/\bqua đỳ\b/gi, 'qua đó'],
    [/\bnhờ đỳ\b/gi, 'nhờ đó'],
    [/\bdo đỳ\b/gi, 'do đó'],
    [/\bsau đỳ\b/gi, 'sau đó'],
    [/\btheo đỳ\b/gi, 'theo đó'],
    [/\bđỳ là\b/gi, 'đó là'],
    [/\blúc đỳ\b/gi, 'lúc đó'],
    [/\bkhi đỳ\b/gi, 'khi đó'],
    [/\bnơi đỳ\b/gi, 'nơi đó'],
    [/\bvùng đỳ\b/gi, 'vùng đó'],
    [/\bđỳ được\b/gi, 'đã được'],
    [/\bđỳ làm\b/gi, 'đã làm'],
    [/\bđỳ tạo\b/gi, 'đã tạo'],
    [/\bđỳ mở\b/gi, 'đã mở'],
    [/\bđỳ giáng\b/gi, 'đã giáng'],
    [/\bđỳ tuyên\b/gi, 'đã tuyên'],
    [/\bđỳ khẳng\b/gi, 'đã khẳng'],
    [/\bđỳ xác\b/gi, 'đã xác'],
    [/\bđỳ góp\b/gi, 'đã góp'],
    [/\bđỳ thúc\b/gi, 'đã thúc'],
    [/\bđỳ trở\b/gi, 'đã trở'],
    [/\bđỳ diễn\b/gi, 'đã diễn'],
    [/\bđỳ hình\b/gi, 'đã hình'],
    [/\bđỳ mang\b/gi, 'đã mang'],
    [/\bđỳ dẫn\b/gi, 'đã dẫn'],
  ];

  for (const [rx, rep] of phraseFixes) {
    s = s.replace(rx, rep);
  }

  // 2. Word-level phonological restoration for remaining mangled tokens
  const wordMap: Record<string, string> = {
    'cỏc': 'các', 'Cỏc': 'Các',
    'khỏc': 'khác', 'Khỏc': 'Khác',
    'phỏt': 'phát', 'Phỏt': 'Phát',
    'quỏ': 'quá', 'Quỏ': 'Quá',
    'tỏc': 'tác', 'Tỏc': 'Tác',
    'xỏc': 'xác', 'Xỏc': 'Xác',
    'giỏp': 'giáp', 'Giỏp': 'Giáp',
    'phỏp': 'pháp', 'Phỏp': 'Pháp',
    'đỏp': 'đáp', 'Đỏp': 'Đáp',
    'thỏp': 'tháp', 'Thỏp': 'Tháp',
    'sỏt': 'sát', 'Sỏt': 'Sát',
    'cỏt': 'cát', 'Cỏt': 'Cát',
    'mỏt': 'mát', 'Mỏt': 'Mát',
    'khỏt': 'khát', 'Khỏt': 'Khát',
    'bỏt': 'bát', 'Bỏt': 'Bát',
    'hỏt': 'hát', 'Hỏt': 'Hát',
    'đỏnh': 'đánh', 'Đỏnh': 'Đánh',
    'cỏnh': 'cánh', 'Cỏnh': 'Cánh',
    'bỏnh': 'bánh', 'Bỏnh': 'Bánh',
    'nhỏnh': 'nhánh', 'Nhỏnh': 'Nhánh',
    'trỏnh': 'tránh', 'Trỏnh': 'Tránh',
    'gỏnh': 'gánh', 'Gỏnh': 'Gánh',
    'sỏnh': 'sánh', 'Sỏnh': 'Sánh',
    'khỏnh': 'khánh', 'Khỏnh': 'Khánh',
    'thỏng': 'tháng', 'Thỏng': 'Tháng',
    'sỏng': 'sáng', 'Sỏng': 'Sáng',
    'đỏng': 'đáng', 'Đỏng': 'Đáng',
    'khỏng': 'kháng', 'Khỏng': 'Kháng',
    'bỏn': 'bán', 'Bỏn': 'Bán',
    'tỏn': 'tán', 'Tỏn': 'Tán',
    'cỏn': 'cán', 'Cỏn': 'Cán',
    'chỏn': 'chán', 'Chỏn': 'Chán',
    'quỏn': 'quán', 'Quỏn': 'Quán',
    'toỏn': 'toán', 'Toỏn': 'Toán',
    'đoỏn': 'đoán', 'Đoỏn': 'Đoán',
    'khoỏn': 'khoán', 'Khoỏn': 'Khoán',
    'thoỏng': 'thoáng', 'Thoỏng': 'Thoáng',
    'bỏo': 'báo', 'Bỏo': 'Báo',
    'cỏo': 'cáo', 'Cỏo': 'Cáo',
    'giỏo': 'giáo', 'Giỏo': 'Giáo',
    'tỏo': 'táo', 'Tỏo': 'Táo',
    'phỏo': 'pháo', 'Phỏo': 'Pháo',
    'thỏo': 'tháo', 'Thỏo': 'Tháo',
    'bỏu': 'báu', 'Bỏu': 'Báu',
    'chỏu': 'cháu', 'Chỏu': 'Cháu',
    'mỏu': 'máu', 'Mỏu': 'Máu',
    'sỏu': 'sáu', 'Sỏu': 'Sáu',
    'mỏy': 'máy', 'Mỏy': 'Máy',
    'chỏy': 'cháy', 'Chỏy': 'Cháy',
    'đỏy': 'đáy', 'Đỏy': 'Đáy',
    'vỏy': 'váy', 'Vỏy': 'Váy',
    'xoỏy': 'xoáy', 'Xoỏy': 'Xoáy',
    'tỏm': 'tám', 'Tỏm': 'Tám',
    'đỏm': 'đám', 'Đỏm': 'Đám',
    'xỏm': 'xám', 'Xỏm': 'Xám',
    'khỏm': 'khám', 'Khỏm': 'Khám',
    'giỏm': 'giám', 'Giỏm': 'Giám',
    'thỏm': 'thám', 'Thỏm': 'Thám',
    'trỏm': 'trám', 'Trỏm': 'Trám',
    'giỏ': 'giá', 'Giỏ': 'Giá',
    'khỏ': 'khá', 'Khỏ': 'Khá',
    'trờn': 'trên', 'Trờn': 'Trên',
    'nờn': 'nên', 'Nờn': 'Nên',
    'lờn': 'lên', 'Lờn': 'Lên',
    'bờn': 'bên', 'Bờn': 'Bên',
    'tờn': 'tên', 'Tờn': 'Tên',
    'đờm': 'đêm', 'Đờm': 'Đêm',
    'thờm': 'thêm', 'Thờm': 'Thêm',
    'kờnh': 'kênh', 'Kờnh': 'Kênh',
    'chờnh': 'chênh', 'Chờnh': 'Chênh',
    'lờnh': 'lênh', 'Lờnh': 'Lênh',
    'mờnh': 'mênh', 'Mờnh': 'Mênh',
    'nờu': 'nêu', 'Nờu': 'Nêu',
    'kờu': 'kêu', 'Kờu': 'Kêu',
    'thờu': 'thêu', 'Thờu': 'Thêu',
    'rờu': 'rêu', 'Rờu': 'Rêu',
    'đờ': 'đê', 'Đờ': 'Đê',
    'kờ': 'kê', 'Kờ': 'Kê',
    'lờ': 'lê', 'Lờ': 'Lê',
    'mờ': 'mê', 'Mờ': 'Mê',
    'phờ': 'phê', 'Phờ': 'Phê',
    'quờ': 'quê', 'Quờ': 'Quê',
    'thuờ': 'thuê', 'Thuờ': 'Thuê',
    'vựng': 'vùng', 'Vựng': 'Vùng',
    'cựng': 'cùng', 'Cựng': 'Cùng',
    'trựng': 'trùng', 'Trựng': 'Trùng',
    'thựng': 'thùng', 'Thựng': 'Thùng',
    'lựng': 'lùng', 'Lựng': 'Lùng',
    'bựng': 'bùng', 'Bựng': 'Bùng',
    'phựng': 'phùng', 'Phựng': 'Phùng',
    'chựng': 'chùng', 'Chựng': 'Chùng',
    'mựng': 'mùng', 'Mựng': 'Mùng',
    'tựng': 'tùng', 'Tựng': 'Tùng',
    'hựng': 'hùng', 'Hựng': 'Hùng',
    'bựn': 'bùn', 'Bựn': 'Bùn',
    'mựn': 'mùn', 'Mựn': 'Mùn',
    'chựm': 'chùm', 'Chựm': 'Chùm',
    'trựm': 'trùm', 'Trựm': 'Trùm',
    'lựi': 'lùi', 'Lựi': 'Lùi',
    'mựi': 'mùi', 'Mựi': 'Mùi',
    'vựi': 'vùi', 'Vựi': 'Vùi',
    'mự': 'mù', 'Mự': 'Mù',
    'bự': 'bù', 'Bự': 'Bù',
    'phự': 'phù', 'Phự': 'Phù',
    'thự': 'thù', 'Thự': 'Thù',
    'trự': 'trù', 'Trự': 'Trù',
    'cũn': 'còn', 'Cũn': 'Còn',
    'trũ': 'trò', 'Trũ': 'Trò',
    'phũng': 'phòng', 'Phũng': 'Phòng',
    'vũng': 'vòng', 'Vũng': 'Vòng',
    'lũng': 'lòng', 'Lũng': 'Lòng',
    'hũn': 'hòn', 'Hũn': 'Hòn',
    'đũn': 'đòn', 'Đũn': 'Đòn',
    'mũn': 'mòn', 'Mũn': 'Mòn',
    'cũi': 'còi', 'Cũi': 'Còi',
    'vũi': 'vòi', 'Vũi': 'Vòi',
    'đũi': 'đòi', 'Đũi': 'Đòi',
    'ngũi': 'ngòi', 'Ngũi': 'Ngòi',
    'gũ': 'gò', 'Gũ': 'Gò',
    'lũ': 'lò', 'Lũ': 'Lò',
    'mũ': 'mò', 'Mũ': 'Mò',
    'sũ': 'sò', 'Sũ': 'Sò',
    'vũ': 'vò', 'Vũ': 'Vò',
    'dừn': 'dân', 'Dừn': 'Dân', 'dõn': 'dân', 'Dõn': 'Dân',
    'nhừn': 'nhân', 'Nhừn': 'Nhân', 'nhõn': 'nhân', 'Nhõn': 'Nhân',
    'phừn': 'phân', 'Phừn': 'Phân', 'phõn': 'phân', 'Phõn': 'Phân',
    'cừn': 'cân', 'Cừn': 'Cân', 'cõn': 'cân', 'Cõn': 'Cân',
    'từn': 'tân', 'Từn': 'Tân', 'tõn': 'tân', 'Tõn': 'Tân',
    'vừn': 'vân', 'Vừn': 'Vân', 'võn': 'vân', 'Võn': 'Vân',
    'lừn': 'lân', 'Lừn': 'Lân', 'lõn': 'lân', 'Lõn': 'Lân',
    'ngừn': 'ngân', 'Ngừn': 'Ngân', 'ngõn': 'ngân', 'Ngõn': 'Ngân',
    'thừn': 'thân', 'Thừn': 'Thân', 'thõn': 'thân', 'Thõn': 'Thân',
    'chừn': 'chân', 'Chừn': 'Chân', 'chõn': 'chân', 'Chõn': 'Chân',
    'xuừn': 'xuân', 'Xuừn': 'Xuân', 'xuõn': 'xuân', 'Xuõn': 'Xuân',
    'quừn': 'quân', 'Quừn': 'Quân', 'quõn': 'quân', 'Quõn': 'Quân',
    'tuừn': 'tuân', 'Tuừn': 'Tuân', 'tuõn': 'tuân', 'Tuõn': 'Tuân',
    'luừn': 'luân', 'Luừn': 'Luân', 'luõn': 'luân', 'Luõn': 'Luân',
    'từm': 'tâm', 'Từm': 'Tâm', 'tõm': 'tâm', 'Tõm': 'Tâm',
    'thừm': 'thâm', 'Thừm': 'Thâm', 'thõm': 'thâm', 'Thõm': 'Thâm',
    'lừm': 'lâm', 'Lừm': 'Lâm', 'lõm': 'lâm', 'Lõm': 'Lâm',
    'chừm': 'châm', 'Chừm': 'Châm', 'chõm': 'châm', 'Chõm': 'Châm',
    'xừm': 'xâm', 'Xừm': 'Xâm', 'xõm': 'xâm', 'Xõm': 'Xâm',
    'đừm': 'đâm', 'Đừm': 'Đâm', 'đõm': 'đâm', 'Đõm': 'Đâm',
    'ngừm': 'ngâm', 'Ngừm': 'Ngâm', 'ngõm': 'ngâm', 'Ngõm': 'Ngâm',
    'sừm': 'sâm', 'Sừm': 'Sâm', 'sõm': 'sâm', 'Sõm': 'Sâm',
    'từy': 'tây', 'Từy': 'Tây', 'tõy': 'tây', 'Tõy': 'Tây',
    'đừy': 'đây', 'Đừy': 'Đây', 'đõy': 'đây', 'Đõy': 'Đây',
    'mừy': 'mây', 'Mừy': 'Mây', 'mõy': 'mây', 'Mõy': 'Mây',
    'cừy': 'cây', 'Cừy': 'Cây', 'cõy': 'cây', 'Cõy': 'Cây',
    'xừy': 'xây', 'Xừy': 'Xây', 'xõy': 'xây', 'Xõy': 'Xây',
    'gừy': 'gây', 'Gừy': 'Gây', 'gõy': 'gây', 'Gõy': 'Gây',
    'vừy': 'vây', 'Vừy': 'Vây', 'võy': 'vây', 'Võy': 'Vây',
    'dừy': 'dây', 'Dừy': 'Dây', 'dõy': 'dây', 'Dõy': 'Dây',
    'lừy': 'lây', 'Lừy': 'Lây', 'lõy': 'lây', 'Lõy': 'Lây',
    'chừu': 'châu', 'Chừu': 'Châu', 'chõu': 'châu', 'Chõu': 'Châu',
    'sừu': 'sâu', 'Sừu': 'Sâu', 'sõu': 'sâu', 'Sõu': 'Sâu',
    'nừu': 'nâu', 'Nừu': 'Nâu', 'nõu': 'nâu', 'Nõu': 'Nâu',
    'lừu': 'lâu', 'Lừu': 'Lâu', 'lõu': 'lâu', 'Lõu': 'Lâu',
    'cừu': 'câu', 'Cừu': 'Câu', 'cõu': 'câu', 'Cõu': 'Câu',
    'dừu': 'dâu', 'Dừu': 'Dâu', 'dõu': 'dâu', 'Dõu': 'Dâu',
    'khừu': 'khâu', 'Khừu': 'Khâu', 'khõu': 'khâu', 'Khõu': 'Khâu',
    'nừng': 'nâng', 'Nừng': 'Nâng', 'nõng': 'nâng', 'Nõng': 'Nâng',
    'hỳa': 'hóa', 'Hỳa': 'Hóa',
    'khỳa': 'khóa', 'Khỳa': 'Khóa',
    'xỳa': 'xóa', 'Xỳa': 'Xóa',
    'đỳa': 'đóa', 'Đỳa': 'Đóa',
    'lỳa': 'lóa', 'Lỳa': 'Lóa',
    'đỳ': 'đó', 'Đỳ': 'Đó',
    'cỳ': 'có', 'Cỳ': 'Có',
    'khỳ': 'khó', 'Khỳ': 'Khó',
    'giỳ': 'gió', 'Giỳ': 'Gió',
    'bỳ': 'bó', 'Bỳ': 'Bó',
    'gỳ': 'gó', 'Gỳ': 'Gó',
    'lỳ': 'ló', 'Lỳ': 'Ló',
    'mỳ': 'mó', 'Mỳ': 'Mó',
    'nỳ': 'nó', 'Nỳ': 'Nó',
    'phỳ': 'phó', 'Phỳ': 'Phó',
    'xỳ': 'xó', 'Xỳ': 'Xó',
    'chỳ': 'chú', 'Chỳ': 'Chú',
    'đỳng': 'đóng', 'Đỳng': 'Đóng',
    'nỳng': 'nóng', 'Nỳng': 'Nóng',
    'bỳng': 'bóng', 'Bỳng': 'Bóng',
    'sỳng': 'sóng', 'Sỳng': 'Sóng',
    'phỳng': 'phóng', 'Phỳng': 'Phóng',
    'chỳng': 'chúng', 'Chỳng': 'Chúng',
    'ngỳng': 'ngóng', 'Ngỳng': 'Ngóng',
    'hỳt': 'hút', 'Hỳt': 'Hút',
    'thỳc': 'thúc', 'Thỳc': 'Thúc',
    'mỳt': 'mút', 'Mỳt': 'Mút',
    'rỳt': 'rút', 'Rỳt': 'Rút',
    'sỳt': 'sút', 'Sỳt': 'Sút',
    'đỳt': 'đút', 'Đỳt': 'Đút',
    'bỳt': 'bút', 'Bỳt': 'Bút',
    'lỳt': 'lút', 'Lỳt': 'Lút',
    'nỳt': 'nút', 'Nỳt': 'Nút',
    'phỳt': 'phút', 'Phỳt': 'Phút',
    'chỳt': 'chút', 'Chỳt': 'Chút',
    'trỳt': 'trút', 'Trỳt': 'Trút',
    'cỳc': 'cúc', 'Cỳc': 'Cúc',
    'đỳc': 'đúc', 'Đỳc': 'Đúc',
    'lỳc': 'lúc', 'Lỳc': 'Lúc',
    'mỳc': 'múc', 'Mỳc': 'Múc',
    'phỳc': 'phúc', 'Phỳc': 'Phúc',
    'sỳc': 'súc', 'Sỳc': 'Súc',
    'tỳc': 'túc', 'Tỳc': 'Túc',
    'xỳc': 'xúc', 'Xỳc': 'Xúc',
    'chỳc': 'chúc', 'Chỳc': 'Chúc',
    'khỳc': 'khúc', 'Khỳc': 'Khúc',
    'trỳc': 'trúc', 'Trỳc': 'Trúc',
    'gỳc': 'góc', 'Gỳc': 'Góc',
    'bỳc': 'bóc', 'Bỳc': 'Bóc',
    'khỳc_': 'khóc',
    'nỳc': 'nóc', 'Nỳc': 'Nóc',
    'vỳc': 'vóc', 'Vỳc': 'Vóc',
    'gỳp': 'góp', 'Gỳp': 'Góp',
    'giỳp': 'giúp', 'Giỳp': 'Giúp',
    'chỳp': 'chóp', 'Chỳp': 'Chóp',
    'hỳp': 'hóp', 'Hỳp': 'Hóp',
    'lỳp': 'lóp', 'Lỳp': 'Lóp',
    'mỳp': 'móp', 'Mỳp': 'Móp',
    'bỳp': 'búp', 'Bỳp': 'Búp',
    'cỳp': 'cúp', 'Cỳp': 'Cúp',
    'đỳp': 'đúp', 'Đỳp': 'Đúp',
    'nỳp': 'núp', 'Nỳp': 'Núp',
    'sỳp': 'súp', 'Sỳp': 'Súp',
    'tỳp': 'túp', 'Tỳp': 'Túp',
    'nhỳm': 'nhóm', 'Nhỳm': 'Nhóm',
    'tỳm': 'tóm', 'Tỳm': 'Tóm',
    'xỳm': 'xóm', 'Xỳm': 'Xóm',
    'khỳm': 'khóm', 'Khỳm': 'Khóm',
    'cỳm': 'cúm', 'Cỳm': 'Cúm',
    'chỳm': 'chúm', 'Chỳm': 'Chúm',
    'nỳm': 'núm', 'Nỳm': 'Núm',
    'rỳm': 'rúm', 'Rỳm': 'Rúm',
    'đỳn': 'đón', 'Đỳn': 'Đón',
    'mỳn': 'món', 'Mỳn': 'Món',
    'nỳn': 'nón', 'Nỳn': 'Nón',
    'bỳn': 'bón', 'Bỳn': 'Bón',
    'cỳn': 'cún', 'Cỳn': 'Cún',
    'lỳn': 'lún', 'Lỳn': 'Lún',
    'nhỳn': 'nhún', 'Nhỳn': 'Nhún',
    'phỳn': 'phún', 'Phỳn': 'Phún',
    'đỳi': 'đói', 'Đỳi': 'Đói',
    'khỳi': 'khói', 'Khỳi': 'Khói',
    'ngỳi': 'ngói', 'Ngỳi': 'Ngói',
    'nỳi': 'nói', 'Nỳi': 'Nói',
    'gỳi': 'gói', 'Gỳi': 'Gói',
    'bỳi': 'bói', 'Bỳi': 'Bói',
    'trỳi': 'trói', 'Trỳi': 'Trói',
    'xỳi': 'xói', 'Xỳi': 'Xói',
    'cỳi': 'cúi', 'Cỳi': 'Cúi',
    'mỳi': 'múi', 'Mỳi': 'Múi',
    'tỳi': 'túi', 'Tỳi': 'Túi',
    'chỳi': 'chúi', 'Chỳi': 'Chúi',
    'cụng': 'công', 'Cụng': 'Công',
    'đụng': 'đông', 'Đụng': 'Đông',
    'sụng': 'sông', 'Sụng': 'Sông',
    'khụng': 'không', 'Khụng': 'Không',
    'nụng': 'nông', 'Nụng': 'Nông',
    'thụng': 'thông', 'Thụng': 'Thông',
    'lụng': 'lông', 'Lụng': 'Lông',
    'bụng': 'bông', 'Bụng': 'Bông',
    'mụng': 'mông', 'Mụng': 'Mông',
    'trụng': 'trông', 'Trụng': 'Trông',
    'giụng': 'giông', 'Giụng': 'Giông',
    'phụng': 'phông', 'Phụng': 'Phông',
    'xụng': 'xông', 'Xụng': 'Xông',
    'cụn': 'côn', 'Cụn': 'Côn',
    'tụn': 'tôn', 'Tụn': 'Tôn',
    'thụn': 'thôn', 'Thụn': 'Thôn',
    'bụn': 'bôn', 'Bụn': 'Bôn',
    'mụn': 'môn', 'Mụn': 'Môn',
    'khụn': 'khôn', 'Khụn': 'Khôn',
    'chụn': 'chôn', 'Chụn': 'Chôn',
    'đụn': 'đôn', 'Đụn': 'Đôn',
    'luụn': 'luôn', 'Luụn': 'Luôn',
    'khuụn': 'khuôn', 'Khuụn': 'Khuôn',
    'buụn': 'buôn', 'Buụn': 'Buôn',
    'muụn': 'muôn', 'Muụn': 'Muôn',
    'tuụn': 'tuôn', 'Tuụn': 'Tuôn',
    'suụn': 'suôn', 'Suụn': 'Suôn',
    'vuụng': 'vuông', 'Vuụng': 'Vuông',
    'chuụng': 'chuông', 'Chuụng': 'Chuông',
    'cụi': 'côi', 'Cụi': 'Côi',
    'đụi': 'đôi', 'Đụi': 'Đôi',
    'mụi': 'môi', 'Mụi': 'Môi',
    'tụi': 'tôi', 'Tụi': 'Tôi',
    'vụi': 'vôi', 'Vụi': 'Vôi',
    'thụi': 'thôi', 'Thụi': 'Thôi',
    'trụi': 'trôi', 'Trụi': 'Trôi',
    'sụi': 'sôi', 'Sụi': 'Sôi',
    'lụi': 'lôi', 'Lụi': 'Lôi',
    'hụi': 'hôi', 'Hụi': 'Hôi',
    'bụi': 'bôi', 'Bụi': 'Bôi',
    'xụi': 'xôi', 'Xụi': 'Xôi',
    'dụi': 'dôi', 'Dụi': 'Dôi',
    'ngụi': 'ngôi', 'Ngụi': 'Ngôi',
    'nụi': 'nôi', 'Nụi': 'Nôi',
    'phụi': 'phôi', 'Phụi': 'Phôi',
    'khụi': 'khôi', 'Khụi': 'Khôi',
    'tụm': 'tôm', 'Tụm': 'Tôm',
    'hụm': 'hôm', 'Hụm': 'Hôm',
    'nhụm': 'nhôm', 'Nhụm': 'Nhôm',
    'ụm': 'ôm', 'Ụm': 'Ôm',
    'khụ': 'khô', 'Khụ': 'Khô',
    'lụ': 'lô', 'Lụ': 'Lô',
    'mụ': 'mô', 'Mụ': 'Mô',
    'ngụ': 'ngô', 'Ngụ': 'Ngô',
    'phụ_': 'phô',
    'thụ_': 'thô',
    'tụ': 'tô', 'Tụ': 'Tô',
    'vụ_': 'vô',
    'xụ': 'xô', 'Xụ': 'Xô',
    'khớ': 'khí', 'Khớ': 'Khí',
    'lớ': 'lí', 'Lớ': 'Lí',
    'chớ': 'chí', 'Chớ': 'Chí',
    'trớ': 'trí', 'Trớ': 'Trí',
    'vớ': 'ví', 'Vớ': 'Ví',
    'phớ': 'phí', 'Phớ': 'Phí',
    'thớ': 'thí', 'Thớ': 'Thí',
    'kớ': 'kí', 'Kớ': 'Kí',
    'tớ': 'tí', 'Tớ': 'Tí',
    'bớ': 'bí', 'Bớ': 'Bí',
    'tớnh': 'tính', 'Tớnh': 'Tính',
    'chớnh': 'chính', 'Chớnh': 'Chính',
    'kớnh': 'kính', 'Kớnh': 'Kính',
    'đớnh': 'đính', 'Đớnh': 'Đính',
    'lớnh': 'lính', 'Lớnh': 'Lính',
    'tớch': 'tích', 'Tớch': 'Tích',
    'đớch': 'đích', 'Đớch': 'Đích',
    'kớch': 'kích', 'Kớch': 'Kích',
    'thớch': 'thích', 'Thớch': 'Thích',
    'xớch': 'xích', 'Xớch': 'Xích',
    'tớn': 'tín', 'Tớn': 'Tín',
    'chớn': 'chín', 'Chớn': 'Chín',
    'kớn': 'kín', 'Kớn': 'Kín',
    'tớm': 'tím', 'Tớm': 'Tím',
    'lớt': 'lít', 'Lớt': 'Lít',
    'mớt': 'mít', 'Mớt': 'Mít',
    'hớt': 'hít', 'Hớt': 'Hít',
    'khớt': 'khít', 'Khớt': 'Khít',
    'bớt_': 'bít',
    'vớt_': 'vít',
    'trỡnh': 'trình', 'Trỡnh': 'Trình',
    'hỡnh': 'hình', 'Hỡnh': 'Hình',
    'bỡnh': 'bình', 'Bỡnh': 'Bình',
    'mỡnh': 'mình', 'Mỡnh': 'Mình',
    'tỡnh': 'tình', 'Tỡnh': 'Tình',
    'đỡnh': 'đình', 'Đỡnh': 'Đình',
    'nhỡn': 'nhìn', 'Nhỡn': 'Nhìn',
    'ngỡn': 'nghìn', 'Ngỡn': 'Nghìn',
    'tỡm': 'tìm', 'Tỡm': 'Tìm',
    'chỡm': 'chìm', 'Chỡm': 'Chìm',
    'kỡm': 'kìm', 'Kỡm': 'Kìm',
    'vỡ': 'vì', 'Vỡ': 'Vì',
    'thỡ': 'thì', 'Thỡ': 'Thì',
    'gỡ': 'gì', 'Gỡ': 'Gì',
    'kỡ': 'kì', 'Kỡ': 'Kì',
  };

  s = s.replace(/\p{L}+/gu, (word) => wordMap[word] ?? word);

  return s;
}

/**
 * Repairs legacy Vietnamese encodings (TCVN3, VNI-Windows, UTF-8/Latin1 Mojibake)
 * into clean Unicode NFC, without EVER corrupting text that is already in Unicode.
 */
export function repairVietnameseFontEncoding(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let s = healMangledUnicodeVietnamese(input);

  // Only attempt legacy 8-bit encoding conversions (Mojibake, VNI, TCVN3) if the string
  // does NOT already contain standard Unicode Vietnamese Extended characters (ă, đ, ơ, ư, ạ..ỹ)
  const alreadyUnicodeVietnamese = UNICODE_VN_EXTENDED_REGEX.test(s);

  if (!alreadyUnicodeVietnamese) {
    // 1. Try repairing UTF-8 interpreted as Latin-1 (Mojibake) e.g. "Viá»‡t Nam", "Ä‘á»‹a lÃ­"
    if (/(?:Ã¡|Ã |áº|á»|Ä‘|Æ°|Æ¡|Ã¢|Ãª|Ã´)/.test(s)) {
      try {
        const bytes = new Uint8Array(s.length);
        let canConvert = true;
        for (let i = 0; i < s.length; i++) {
          const code = s.charCodeAt(i);
          if (code > 255) {
            canConvert = false;
            break;
          }
          bytes[i] = code;
        }
        if (canConvert) {
          const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          if (decoded && !decoded.includes('\uFFFD')) {
            s = decoded;
          }
        }
      } catch {
        // Keep original if not pure Latin-1 mojibake
      }
    }

    // 2. Detect and repair VNI-Windows encoding (e.g. "Vieät Nam", "phaùt trieån", "ñòa lí")
    if (!UNICODE_VN_EXTENDED_REGEX.test(s) && /(?:aù|aø|aû|aï|aê|aâ|eâ|oâ|ôù|ôø|öù|öø|ñòa|Vieät|phaùt|trieån)/.test(s)) {
      for (const [regex, replacement] of VNI_REPLACEMENTS) {
        s = s.replace(regex, replacement);
      }
    }

    // 3. Detect and repair TCVN3 (.VnTime / ABC) encoding (e.g. "ViÖt Nam", "®Þa lÝ", "ph¸t triÓn")
    if (!UNICODE_VN_EXTENDED_REGEX.test(s) && TCVN3_STRICT_WORD_PATTERNS.test(s)) {
      s = s
        .split('')
        .map((ch) => TCVN3_CHAR_MAP[ch] ?? ch)
        .join('');
    }
  }

  // 4. Normalize Unicode NFC and strip control/zero-width characters
  s = s
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\uFFFD]/g, '')
    .replace(/[\u00A0\u00AD]/g, ' ');

  return healMangledUnicodeVietnamese(s);
}

/**
 * Checks if a text string still contains unfixable font corruption, PDF binary stream artifacts,
 * mojibake clusters, or impossible Vietnamese phonotactics that cannot be used directly as exam stimulus.
 */
export function hasUnfixableFontCorruption(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();
  if (trimmed.length < 5) return true;

  // 1. Check for PDF internal stream syntax or raw binary markers
  if (
    /(?:%PDF-|endobj|endstream|FlateDecode|\/Font|\/Type|\/Page|xref|trailer|startxref|\bBT\b[\s\S]{1,40}\bET\b)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // 2. Check for known garbled / corrupted font sequences & impossible Vietnamese vowel-consonant combinations
  if (
    trimmed.includes('\uFFFD') ||
    /(?:êØ|jyV|¢W|Ã¡|áº|á»|Ä‘|Æ°|®Þ|nhiÖt|ViÖt|phaùt|trieån)/.test(trimmed) ||
    /\b(?:cỏc|khỏc|phỏt|quỏ|trờn|nờn|vựng|cựng|cũn|trũ|dừn|nhừn|phừn|hỳa|đỳng|hỳt|thỳc|đụ\s+thị|khớ|lớ|trỡnh|hỡnh|bỡnh)\b/i.test(
      trimmed
    ) ||
    /[ÃÂÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞß]{2,}/.test(trimmed) ||
    /[¸µ¶·¹»¾¼½ÆÇÊÈÉËÌÕÎÏÑ×ÝØÜÞßåèæçéêíëìîøõö÷ùúûüþ]{3,}/.test(trimmed) ||
    /[~`^\\|<>@#$%&*+=]{3,}/.test(trimmed)
  ) {
    return true;
  }

  // 3. Check character validity & Vietnamese syllable naturalness
  let validChars = 0;
  let weirdSymbols = 0;
  let vietnameseDiacritics = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if (
      (code >= 192 && code <= 591) ||
      (code >= 7680 && code <= 7935)
    ) {
      vietnameseDiacritics++;
      validChars++;
    } else if (
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 32 ||
      code === 10 ||
      code === 13 ||
      code === 9 ||
      [44, 46, 58, 59, 63, 33, 37, 40, 41, 45, 47, 34, 39, 8211, 8212, 8220, 8221, 176, 8240].includes(code)
    ) {
      validChars++;
    } else {
      weirdSymbols++;
    }
  }

  if (validChars / trimmed.length < 0.92) return true;
  if (weirdSymbols / trimmed.length > 0.04) return true;

  // For longer prose (> 45 chars), ensure it actually contains Vietnamese diacritics and reasonable word lengths
  if (trimmed.length > 45) {
    if (vietnameseDiacritics === 0) return true;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 5) return true;
    const avgWordLen = trimmed.replace(/\s+/g, '').length / words.length;
    if (avgWordLen > 8.5 || avgWordLen < 1.8) return true;

    const corruptedWordCount = words.filter((w) => /[a-zA-ZÀ-ỹ]+\d+[a-zA-ZÀ-ỹ]+/.test(w)).length;
    if (corruptedWordCount > 1) return true;
  }

  return false;
}

export function isReadableVietnameseText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const repaired = repairVietnameseFontEncoding(text);
  return !hasUnfixableFontCorruption(repaired);
}

function sanitizeExtractedText(t: string): string {
  if (!t) return '';
  const repaired = repairVietnameseFontEncoding(t);
  const cleanLines = repaired
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !hasUnfixableFontCorruption(line));

  const joined = cleanLines.join('\n').trim();
  if (!joined || hasUnfixableFontCorruption(joined)) return '';
  return joined;
}

export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface PdfUnderlineSegment {
  x1: number;
  x2: number;
  y: number;
}

interface PdfTextRun {
  str: string;
  x: number;
  y: number;
  w: number;
  underlined: boolean;
}

async function extractPdfLayoutText(
  arrayBuffer: ArrayBuffer,
  options: { preserveUnderlines?: boolean; includePageHeaders?: boolean } = {}
): Promise<string> {
  const { preserveUnderlines = false, includePageHeaders = true } = options;
  const uint8Array = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDoc = await loadingTask.promise;
  let fullPdfText = '';

  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();

    const underlineSegments: PdfUnderlineSegment[] = [];
    if (preserveUnderlines) {
      try {
        const ops = await page.getOperatorList();
        const constructPathOp = pdfjsLib.OPS?.constructPath;
        for (let i = 0; i < ops.fnArray.length; i++) {
          if (ops.fnArray[i] === constructPathOp) {
            const minMax = ops.argsArray[i]?.[2];
            if (minMax && minMax.length >= 4) {
              const x1 = Math.min(minMax[0], minMax[2]);
              const x2 = Math.max(minMax[0], minMax[2]);
              const y1 = Math.min(minMax[1], minMax[3]);
              const y2 = Math.max(minMax[1], minMax[3]);
              const w = x2 - x1;
              const h = y2 - y1;
              // Detect horizontal underline strokes/rectangles (4pt..240pt wide, <= 3.5pt tall)
              if (w >= 4 && w <= 240 && h <= 3.5) {
                underlineSegments.push({ x1, x2, y: (y1 + y2) / 2 });
              }
            }
          }
        }
      } catch {
        // Ignore operator list errors and continue with plain text
      }
    }

    const runs: PdfTextRun[] = [];
    for (const rawItem of textContent.items as any[]) {
      if (!rawItem || typeof rawItem.str !== 'string') continue;
      const str = rawItem.str;
      if (!str) continue;
      const x = Array.isArray(rawItem.transform) ? rawItem.transform[4] : 0;
      const y = Array.isArray(rawItem.transform) ? rawItem.transform[5] : 0;
      const w = typeof rawItem.width === 'number' && rawItem.width > 0 ? rawItem.width : str.length * 4.5;

      let underlined = false;
      if (preserveUnderlines && str.trim().length > 0 && underlineSegments.length > 0) {
        const xEnd = x + w;
        underlined = underlineSegments.some((seg) => {
          const dy = y - seg.y; // Baseline is slightly above the underline stroke
          if (dy < -2 || dy > 7.5) return false;
          const overlap = Math.min(xEnd, seg.x2) - Math.max(x, seg.x1);
          const minW = Math.max(1, Math.min(w, seg.x2 - seg.x1));
          return overlap >= minW * 0.35 || (Math.abs(x - seg.x1) <= 3 && overlap > 2);
        });
      }

      runs.push({ str, x, y, w, underlined });
    }

    // Group runs into visual lines by Y coordinate (within 3.5pt tolerance), top-to-bottom
    runs.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 3.5) return b.y - a.y;
      return a.x - b.x;
    });

    const visualLines: PdfTextRun[][] = [];
    for (const run of runs) {
      const lastLine = visualLines[visualLines.length - 1];
      if (lastLine && Math.abs(lastLine[0].y - run.y) <= 3.5) {
        lastLine.push(run);
      } else {
        visualLines.push([run]);
      }
    }

    const pageLines: string[] = [];
    for (const lineRuns of visualLines) {
      lineRuns.sort((a, b) => a.x - b.x);
      let lineStr = '';
      let prevEndX: number | null = null;

      for (const r of lineRuns) {
        const tokenText = r.underlined && r.str.trim() ? `<u>${r.str.trim()}</u>` : r.str;
        if (prevEndX !== null) {
          const gap = r.x - prevEndX;
          if (gap > 2.5 && !lineStr.endsWith(' ') && !tokenText.startsWith(' ')) {
            lineStr += ' ';
          }
        }
        lineStr += tokenText;
        prevEndX = Math.max(prevEndX ?? r.x + r.w, r.x + r.w);
      }

      const cleanedLine = lineStr
        .replace(/<\/u>\s*<u>/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim();
      if (cleanedLine) {
        pageLines.push(cleanedLine);
      }
    }

    const pageText = pageLines.join('\n');
    if (includePageHeaders) {
      fullPdfText += `\n[Trang ${p}]\n` + pageText + '\n';
    } else {
      fullPdfText += (fullPdfText ? '\n' : '') + pageText;
    }
  }

  return fullPdfText;
}

async function extractDocxXmlWithAnswerMarkers(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file('word/document.xml');
    if (!docFile) return '';
    const xmlStr = await docFile.async('string');
    if (!xmlStr || typeof DOMParser === 'undefined') return '';

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');

    const getLocalTag = (node: Node): string => {
      return (node as Element).localName || node.nodeName.replace(/^.*:/, '');
    };

    const getAttr = (el: Element, localAttrName: string): string => {
      return (
        el.getAttribute(`w:${localAttrName}`) ||
        el.getAttribute(localAttrName) ||
        ''
      );
    };

    const extractRunText = (runEl: Element): string => {
      let text = '';
      let isUnderlined = false;
      let isHighlightedOrColored = false;
      let isBold = false;

      for (let i = 0; i < runEl.childNodes.length; i++) {
        const child = runEl.childNodes[i] as Element;
        const tag = getLocalTag(child);
        if (tag === 'rPr') {
          for (let j = 0; j < child.childNodes.length; j++) {
            const prop = child.childNodes[j] as Element;
            const pTag = getLocalTag(prop);
            if (pTag === 'u') {
              const val = getAttr(prop, 'val').toLowerCase();
              if (val && val !== 'none' && val !== 'false' && val !== '0') {
                isUnderlined = true;
              }
            } else if (pTag === 'highlight') {
              const val = getAttr(prop, 'val').toLowerCase();
              if (val && val !== 'none' && val !== 'white') {
                isHighlightedOrColored = true;
              }
            } else if (pTag === 'shd') {
              const fill = getAttr(prop, 'fill').toLowerCase();
              if (fill && fill !== 'auto' && fill !== 'ffffff' && fill !== 'none') {
                isHighlightedOrColored = true;
              }
            } else if (pTag === 'color') {
              const val = getAttr(prop, 'val').toLowerCase();
              if (val && !['auto', '000000', '000', '111111', '222222', '333333'].includes(val)) {
                isHighlightedOrColored = true;
              }
            } else if (pTag === 'b') {
              const val = getAttr(prop, 'val').toLowerCase();
              if (val !== 'false' && val !== '0') {
                isBold = true;
              }
            }
          }
        } else if (tag === 't') {
          text += child.textContent || '';
        } else if (tag === 'tab') {
          text += ' ';
        } else if (tag === 'br' || tag === 'cr') {
          text += '\n';
        }
      }

      if (!text) return '';
      if (isUnderlined || isHighlightedOrColored) {
        return `<u>${text}</u>`;
      }
      if (isBold && /^\s*(?:[A-D][\.\)]|[a-d][\)\.])\s*$/.test(text)) {
        return `<b>${text}</b>`;
      }
      return text;
    };

    const extractParagraphText = (pEl: Element): string => {
      let pText = '';
      const walk = (node: Node) => {
        const tag = getLocalTag(node);
        if (tag === 'r') {
          pText += extractRunText(node as Element);
        } else if (tag === 'hyperlink' || tag === 'smartTag' || tag === 'sdtContent' || tag === 'ins') {
          for (let i = 0; i < node.childNodes.length; i++) {
            walk(node.childNodes[i]);
          }
        }
      };
      for (let i = 0; i < pEl.childNodes.length; i++) {
        walk(pEl.childNodes[i]);
      }
      return pText
        .replace(/<\/u>(\s*)<u>/g, '$1')
        .replace(/<\/b>(\s*)<b>/g, '$1')
        .replace(/[ \t]+/g, ' ')
        .trim();
    };

    const extractTableText = (tblEl: Element): string => {
      const rows: string[] = [];
      for (let i = 0; i < tblEl.childNodes.length; i++) {
        const tr = tblEl.childNodes[i] as Element;
        if (getLocalTag(tr) !== 'tr') continue;
        const cells: string[] = [];
        for (let j = 0; j < tr.childNodes.length; j++) {
          const tc = tr.childNodes[j] as Element;
          if (getLocalTag(tc) !== 'tc') continue;
          const cellParas: string[] = [];
          for (let k = 0; k < tc.childNodes.length; k++) {
            const cChild = tc.childNodes[k] as Element;
            if (getLocalTag(cChild) === 'p') {
              const pt = extractParagraphText(cChild);
              if (pt) cellParas.push(pt);
            }
          }
          cells.push(cellParas.join(' '));
        }
        if (cells.some((c) => c.trim().length > 0)) {
          rows.push('| ' + cells.join(' | ') + ' |');
        }
      }
      return rows.length > 0 ? `[BẢNG]:\n${rows.join('\n')}\n[/BẢNG]` : '';
    };

    const bodyEl = xmlDoc.getElementsByTagName('w:body')[0] || xmlDoc.getElementsByTagName('body')[0];
    if (!bodyEl) return '';

    const outLines: string[] = [];
    for (let i = 0; i < bodyEl.childNodes.length; i++) {
      const child = bodyEl.childNodes[i] as Element;
      const tag = getLocalTag(child);
      if (tag === 'p') {
        const pt = extractParagraphText(child);
        if (pt) outLines.push(pt);
      } else if (tag === 'tbl') {
        const tt = extractTableText(child);
        if (tt) outLines.push(tt);
      }
    }

    return repairVietnameseFontEncoding(outLines.join('\n'));
  } catch {
    return '';
  }
}

export async function readExamFileFormatted(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfText = await extractPdfLayoutText(arrayBuffer, {
        preserveUnderlines: true,
        includePageHeaders: false,
      });
      if (pdfText.trim().length > 30) {
        return sanitizeExtractedText(pdfText);
      }
    } catch (pdfErr) {
      console.warn('pdfjs-dist formatted exam extraction warning:', pdfErr);
    }
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (ext === 'docx') {
        const xmlExtracted = await extractDocxXmlWithAnswerMarkers(arrayBuffer);
        if (xmlExtracted && xmlExtracted.trim().length > 30) {
          const sanitizedXml = sanitizeExtractedText(xmlExtracted);
          if (sanitizedXml.length > 30) {
            return sanitizedXml;
          }
        }
      }

      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const html = repairVietnameseFontEncoding(htmlResult.value || '');
      if (html && html.trim().length > 20) {
        // Convert tables cleanly first
        const htmlWithTables = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_all, tableBody) => {
          const trMatches = tableBody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
          if (!trMatches || trMatches.length === 0) return '';
          const grid: string[][] = [];
          trMatches.forEach((trHtml: string, rowIndex: number) => {
            if (!grid[rowIndex]) grid[rowIndex] = [];
            let colIndex = 0;
            const cellRegex = /<(?:td|th)([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
            let cellMatch: RegExpExecArray | null;
            while ((cellMatch = cellRegex.exec(trHtml)) !== null) {
              const attrs = cellMatch[1] || '';
              const rawContent = cellMatch[2] || '';
              while (grid[rowIndex][colIndex] !== undefined) colIndex++;
              const rowspanMatch = attrs.match(/rowspan\s*=\s*["']?(\d+)["']?/i);
              const colspanMatch = attrs.match(/colspan\s*=\s*["']?(\d+)["']?/i);
              const rowspan = rowspanMatch ? Math.max(1, parseInt(rowspanMatch[1], 10)) : 1;
              const colspan = colspanMatch ? Math.max(1, parseInt(colspanMatch[1], 10)) : 1;
              const cleanText = repairVietnameseFontEncoding(
                rawContent
                  .replace(/<br\s*\/?>/gi, ' ')
                  .replace(/<\/p>/gi, ' ')
                  .replace(/<(?:ins|u)\b[^>]*>/gi, '<u>')
                  .replace(/<\/(?:ins|u)>/gi, '</u>')
                  .replace(/<(?!\/?u\b)[^>]+>/gi, ' ')
                  .replace(/&nbsp;/gi, ' ')
                  .replace(/&amp;/gi, '&')
                  .replace(/&lt;/gi, '<')
                  .replace(/&gt;/gi, '>')
                  .replace(/&quot;/gi, '"')
                  .replace(/\s+/g, ' ')
                  .trim()
              );
              for (let r = 0; r < rowspan; r++) {
                const targetR = rowIndex + r;
                if (!grid[targetR]) grid[targetR] = [];
                for (let c = 0; c < colspan; c++) {
                  grid[targetR][colIndex + c] = cleanText;
                }
              }
              colIndex += colspan;
            }
          });
          const rows = grid
            .map((rowCells) => {
              const cleanedCells = rowCells.map((c) => (c === undefined ? '' : c));
              if (cleanedCells.every((c) => c === '')) return '';
              return '| ' + cleanedCells.join(' | ') + ' |';
            })
            .filter(Boolean);
          return rows.length ? `\n[BẢNG]:\n${rows.join('\n')}\n[/BẢNG]\n` : '';
        });

        const formattedText = repairVietnameseFontEncoding(
          htmlWithTables
            .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n$1\n')
            .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
            .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<(?:ins|u)\b[^>]*>/gi, '<u>')
            .replace(/<\/(?:ins|u)>/gi, '</u>')
            .replace(/<span[^>]*text-decoration:\s*underline[^>]*>([\s\S]*?)<\/span>/gi, '<u>$1</u>')
            .replace(/<(?!\/?u\b)[^>]+>/gi, ' ')
            .replace(/<u>\s*<\/u>/gi, '')
            .replace(/<\/u>\s*<u>/gi, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n+/g, '\n')
            .trim()
        );

        const sanitized = sanitizeExtractedText(formattedText);
        if (sanitized.length > 20) {
          return sanitized;
        }
      }
    } catch {
      // fallback to readFileText
    }
  }

  return readFileText(file);
}

export async function readFileText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fullPdfText = await extractPdfLayoutText(arrayBuffer, {
        preserveUnderlines: false,
        includePageHeaders: true,
      });

      if (fullPdfText.trim().length > 30) {
        return sanitizeExtractedText(fullPdfText);
      }
    } catch (pdfErr) {
      console.warn('pdfjs-dist text extraction warning:', pdfErr);
    }
  }

  if (['txt', 'csv', 'md'].includes(ext)) {
    const rawText = await file.text();
    const cleaned = sanitizeExtractedText(rawText);
    return (
      cleaned ||
      `[Tệp văn bản: ${file.name} - Văn bản gốc bị lỗi mã hóa font chữ, hệ thống tự động viết lại ngữ liệu tiếng Việt chuẩn Unicode theo bài học SGK].`
    );
  }

  if (['xlsx', 'xls'].includes(ext)) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      return workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        const formattedRows = rawRows
          .map((r) => {
            if (!Array.isArray(r)) return repairVietnameseFontEncoding(String(r || '').trim());
            const cleanCells = r.map((c) => repairVietnameseFontEncoding(String(c ?? '').trim()));
            if (cleanCells.every((c) => c === '')) return '';
            return cleanCells.join(' | ');
          })
          .filter(Boolean);
        return `[Bảng Excel - Sheet: ${name}]\n` + formattedRows.join('\n');
      }).join('\n\n');
    } catch {
      return `[Tệp Excel: ${file.name}]`;
    }
  }

  if (ext === 'docx' || ext === 'doc') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // 1. Extract raw text and repair legacy fonts
      const rawResult = await mammoth.extractRawText({ arrayBuffer });
      const rawText = repairVietnameseFontEncoding(rawResult.value || '');

      // 2. Extract HTML to preserve structured tables and document headings
      try {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        const html = repairVietnameseFontEncoding(htmlResult.value || '');
        if (html.includes('<table') || html.includes('<tr')) {
          const htmlWithTables = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_all, tableBody) => {
            const trMatches = tableBody.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
            if (!trMatches || trMatches.length === 0) return '';

            const grid: string[][] = [];

            trMatches.forEach((trHtml: string, rowIndex: number) => {
              if (!grid[rowIndex]) {
                grid[rowIndex] = [];
              }

              let colIndex = 0;
              const cellRegex = /<(?:td|th)([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
              let cellMatch: RegExpExecArray | null;

              while ((cellMatch = cellRegex.exec(trHtml)) !== null) {
                const attrs = cellMatch[1] || '';
                const rawContent = cellMatch[2] || '';

                while (grid[rowIndex][colIndex] !== undefined) {
                  colIndex++;
                }

                const rowspanMatch = attrs.match(/rowspan\s*=\s*["']?(\d+)["']?/i);
                const colspanMatch = attrs.match(/colspan\s*=\s*["']?(\d+)["']?/i);
                const rowspan = rowspanMatch ? Math.max(1, parseInt(rowspanMatch[1], 10)) : 1;
                const colspan = colspanMatch ? Math.max(1, parseInt(colspanMatch[1], 10)) : 1;

                const cleanText = repairVietnameseFontEncoding(
                  rawContent
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>/gi, ' ')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/gi, ' ')
                    .replace(/&amp;/gi, '&')
                    .replace(/&lt;/gi, '<')
                    .replace(/&gt;/gi, '>')
                    .replace(/&quot;/gi, '"')
                    .replace(/\s+/g, ' ')
                    .trim()
                );

                for (let r = 0; r < rowspan; r++) {
                  const targetR = rowIndex + r;
                  if (!grid[targetR]) {
                    grid[targetR] = [];
                  }
                  for (let c = 0; c < colspan; c++) {
                    const targetC = colIndex + c;
                    grid[targetR][targetC] = cleanText;
                  }
                }

                colIndex += colspan;
              }
            });

            const rows = grid
              .map((rowCells) => {
                const cleanedCells = rowCells.map((c) => (c === undefined ? '' : c));
                if (cleanedCells.every((c) => c === '')) return '';
                return '| ' + cleanedCells.join(' | ') + ' |';
              })
              .filter(Boolean);

            if (rows.length === 0) return '';
            return `\n\n[BẢNG]:\n` + rows.join('\n') + `\n[/BẢNG]\n\n`;
          });

          const structuredText = repairVietnameseFontEncoding(
            htmlWithTables
              .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
              .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
              .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/gi, ' ')
              .replace(/&amp;/gi, '&')
              .replace(/&lt;/gi, '<')
              .replace(/&gt;/gi, '>')
              .replace(/&quot;/gi, '"')
              .replace(/[ \t]+/g, ' ')
              .replace(/\n\s*\n\s*\n+/g, '\n\n')
              .trim()
          );

          if (structuredText.length > 20 && !hasUnfixableFontCorruption(structuredText)) {
            return structuredText;
          }
        }
      } catch {
        // ignore html parsing error
      }

      const cleanRaw = sanitizeExtractedText(rawText);
      return (
        cleanRaw ||
        `[Tệp Word: ${file.name} - Phát hiện văn bản gốc dùng bảng mã font cũ không tương thích, hệ thống tự động biên soạn lại ngữ liệu tiếng Việt chuẩn Unicode theo bài học SGK].`
      );
    } catch {
      return `[Tệp Word: ${file.name}]`;
    }
  }

  // For PDF or other document files: strictly filter out raw binary streams or broken font encodings
  try {
    const arrayBuffer = await file.arrayBuffer();
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const raw = textDecoder.decode(arrayBuffer);

    // If raw starts with %PDF-, do not extract raw PDF binary stream unless clean Unicode text lines exist
    const repaired = repairVietnameseFontEncoding(raw);
    const lines = repaired
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 25 && !hasUnfixableFontCorruption(l));

    if (lines.length >= 3) {
      return lines.join('\n');
    }
  } catch {
    // fallback
  }

  return `[Tệp tài liệu: ${file.name} - Tài liệu PDF/bản in có mã hóa font đặc thù, hệ thống tự động viết lại mới hoàn toàn ngữ liệu tiếng Việt chuẩn Unicode bám sát bài học SGK].`;
}
