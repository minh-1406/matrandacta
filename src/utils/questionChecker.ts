import { GeneratedQuestion } from '../types';

export const ABSOLUTE_WORDS = [
  'luôn luôn',
  'hoàn toàn',
  'tuyệt đối',
  'tất cả',
  'duy nhất',
  'chủ yếu',
  'nguyên nhân chính',
  'rất lớn',
  'cân đối',
  'thường',
  'có thể',
  'phần lớn',
  'đa số',
  'đôi khi',
];

const NUMBER_REGEX = /^[-+−]?\s*\d+(?:[.,]\d+)?/;

export const parseNumberVal = (opt: string): number | null => {
  const match = String(opt).trim().match(NUMBER_REGEX);
  if (!match) return null;
  return parseFloat(match[0].replace('−', '-').replace(/\s/g, '').replace(',', '.'));
};

export const endWithPeriod = (t: string): string => {
  let s = String(t || '')
    .trim()
    .replace(/^[A-Da-d][.)]\s+/, '')
    .replace(/[;,:\s]+$/, '');
  return /[.?!…]$/.test(s) ? s : s + '.';
};

export const capitalizeFirst = (t: string): string =>
  t.replace(/^(\P{L}*)(\p{L})/u, (_, a, b) => a + b.toUpperCase());

export const lowerFirst = (t: string): string => {
  const words = t.split(/\s+/);
  const first = words[0];
  if (
    words.length < 2 ||
    /\d/.test(first) ||
    (first.length > 1 && first === first.toUpperCase()) ||
    words.slice(1).some((w) => /^\p{Lu}/u.test(w))
  ) {
    return t;
  }
  return t.replace(/^(\P{L}*)(\p{L})/u, (_, a, b) => a + b.toLowerCase());
};

export function normalizeQuestion(q: GeneratedQuestion): GeneratedQuestion {
  if (q.d === 'NLC' && Array.isArray(q.opts)) {
    let st = String(q.stem || '').trim();
    if (!/\?$/.test(st)) {
      st = st.replace(/[\s:;,.…]+$/, '');
    }
    q.stem = st;
    const isQuestion = /\?$/.test(st);
    let opts = q.opts.slice(0, 4).map(endWithPeriod).map((x) => (isQuestion ? capitalizeFirst(x) : lowerFirst(x)));

    const numValues = opts.map(parseNumberVal);
    if (
      opts.length === 4 &&
      numValues.every((v) => v !== null) &&
      opts.every((x) => x.replace(NUMBER_REGEX, '').length <= 18)
    ) {
      const correctIdx = 'ABCD'.indexOf(String(q.ans || '').trim().charAt(0));
      const correctVal = opts[correctIdx];
      const sortedIndices = [0, 1, 2, 3].sort((a, b) => numValues[a]! - numValues[b]!);
      opts = sortedIndices.map((i) => opts[i]);
      if (correctIdx >= 0) {
        q.ans = 'ABCD'[opts.indexOf(correctVal)];
      }
      q._num = 1;
    }
    q.opts = opts;
  }

  if (q.d === 'DS' && Array.isArray(q.items)) {
    q.items.forEach((item) => {
      item.t = capitalizeFirst(endWithPeriod(item.t));
    });
  }

  const shortSrc = (t: string) =>
    String(t || '')
      .replace(/\((Kết nối tri thức( với cuộc sống)?|KNTT)\)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+,/g, ',')
      .replace(/^\s*Ngữ liệu tự biên soạn dựa trên/i, 'Tự biên soạn dựa trên')
      .replace(/số liệu giả định minh họa/i, 'số liệu giả định')
      .replace(/[\s.]+$/, '')
      .trim();

  const ensureEndPunc = (t: string) => {
    const s = String(t || '').trim().replace(/[;,:\s]+$/, '');
    return s && !/[.?!…]["”’')\]]*$/.test(s) ? s + '.' : s;
  };

  if (q.d === 'DS') {
    const st = String(q.stem || '').trim();
    q.stem = /[:.?!…]["”’')\]]*$/.test(st) || !st ? st : st + '.';
  }

  if (Array.isArray(q.srcs)) {
    q.srcs.forEach((srcItem) => {
      if (srcItem.text) srcItem.text = ensureEndPunc(srcItem.text);
      if (srcItem.src) srcItem.src = ensureEndPunc(shortSrc(srcItem.src));
      if (srcItem.table && Array.isArray(srcItem.table.rows)) {
        srcItem.table.rows = srcItem.table.rows.map((r) =>
          r.map((cell) => String(cell).replace(/(?<=\d)\.(?=\d)/g, ','))
        );
      }
    });
  }

  if (q.d === 'TLN' && q.ans) {
    q.ans = String(q.ans).replace(/(?<=\d)\.(?=\d)/g, ',');
  }

  if (q.d === 'TL') {
    const combined = (String(q.stem || '') + ' ' + String(q.ans || '')).toLowerCase();
    if (
      /vai trò.*địa lí|ngành nghề.*địa lí|nghề nghiệp.*địa lí|kiến thức địa lí/i.test(combined) &&
      /đánh giá thuận lợi và thách thức/i.test(String(q.ans || ''))
    ) {
      q.ans = `1. Vai trò của môn Địa lí đối với đời sống, khoa học và định hướng nghề nghiệp:\n` +
        `- Cung cấp hệ thống tri thức khoa học toàn diện về môi trường tự nhiên, dân cư và kinh tế - xã hội; hình thành thế giới quan khoa học và tư duy không gian đa chiều.\n` +
        `- Rèn luyện các kĩ năng thực hành thiết yếu: sử dụng bản đồ, Atlat, biểu đồ, tranh ảnh, công nghệ định vị GPS, bản đồ số và Hệ thống thông tin địa lí (GIS) phục vụ trực tiếp học tập và đời sống.\n` +
        `2. Các ngành nghề liên quan và thuận lợi đối với phát triển kinh tế - xã hội:\n` +
        `- Tạo ra nguồn lao động chất lượng cho nhiều ngành nghề thiết yếu: quy hoạch không gian lãnh thổ, quản lí đô thị, quản lí tài nguyên thiên nhiên và môi trường, trắc địa bản đồ, khí tượng thủy văn, giao thông vận tải, logistics, du lịch lữ hành, an ninh quốc phòng.\n` +
        `- Giúp người học định hướng nghề nghiệp đúng đắn, thích ứng linh hoạt với thị trường lao động; bố trí sản xuất hợp lí và ứng phó hiệu quả với biến đổi khí hậu.`;

      q.rubric = [
        { y: 'Trình bày đầy đủ vai trò của môn Địa lí: cung cấp tri thức tự nhiên - kinh tế - xã hội, tư duy không gian và các kĩ năng thực hành (bản đồ, GPS, GIS)', d: 0.5 },
        { y: 'Nêu rõ các ngành nghề liên quan và thuận lợi cụ thể: tạo nguồn lao động chất lượng cho quy hoạch đô thị, tài nguyên môi trường, du lịch, logistics; định hướng nghề nghiệp và thích ứng biến đổi khí hậu', d: 0.5 },
      ];
    } else if (q.ans && typeof q.ans === 'string') {
      q.ans = q.ans.replace(
        /[-•*]?\s*Đánh giá thuận lợi và thách thức của ([^;\n\r]+) đối với sự phát triển kinh tế và đời sống cư dân[.]?/gi,
        '- Nêu rõ các thế mạnh cụ thể (tài nguyên, nguồn lao động, vị trí địa lí), đóng góp cho tăng trưởng kinh tế ngành/vùng và các giải pháp khai thác hợp lí, bảo vệ môi trường bền vững.'
      );
      q.ans = q.ans.replace(
        /[-•*]?\s*Xác định vị trí địa lí, phạm vi phân bố, các nhân tố tự nhiên cấu thành và quy luật địa lí chi phối ([^;\n\r]+) trong hệ thống tự nhiên[.]?/gi,
        '- Trình bày rõ ràng đặc điểm vị trí địa lí, phạm vi phân bố và các nhân tố cấu thành chi phối sự hình thành, phát triển trong thực tiễn.'
      );
    }
  }

  return q;
}

export function balanceMultipleChoice(questions: GeneratedQuestion[]): void {
  const eligible = questions.filter(
    (q) =>
      q.d === 'NLC' &&
      Array.isArray(q.opts) &&
      q.opts.length === 4 &&
      'ABCD'.includes(String(q.ans || '').trim().charAt(0)) &&
      !q._num &&
      !q.opts.some((o) => /tất cả|cả hai|đều đúng|đều sai|\b[A-D]\s*(và|,)\s*[A-D]\b/i.test(o))
  );

  let targetDistribution: string[] = [];
  while (targetDistribution.length < eligible.length) {
    targetDistribution.push('A', 'B', 'C', 'D');
  }
  targetDistribution = targetDistribution.slice(0, eligible.length);

  for (let i = targetDistribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [targetDistribution[i], targetDistribution[j]] = [targetDistribution[j], targetDistribution[i]];
  }

  eligible.forEach((q, n) => {
    const currentCorrectIdx = 'ABCD'.indexOf(String(q.ans).trim().charAt(0));
    const targetIdx = 'ABCD'.indexOf(targetDistribution[n]);
    const correctOption = q.opts![currentCorrectIdx];
    const otherOptions = q.opts!.filter((_, i) => i !== currentCorrectIdx);

    const reordered: string[] = [];
    for (let i = 0; i < 4; i++) {
      reordered.push(i === targetIdx ? correctOption : otherOptions.shift()!);
    }
    q.opts = reordered;
    q.ans = 'ABCD'[targetIdx];
  });
}

export interface ValidationResult {
  warnings: string[];
  infos: string[];
}

export function checkQuestionsCompliance(
  questions: GeneratedQuestion[],
  mon: string,
  geoPct: number = 50,
  geoDivide: boolean = true
): ValidationResult {
  const warnings: string[] = [];
  const infos: string[] = [];

  const groups: Record<string, GeneratedQuestion[]> = {
    NLC: [],
    DS: [],
    TLN: [],
    TL: [],
  };

  questions.forEach((q) => {
    if (groups[q.d]) groups[q.d].push(q);
  });

  const findAbsolute = (text: string) =>
    ABSOLUTE_WORDS.filter((w) => text.toLowerCase().includes(w));

  groups.NLC.forEach((q, i) => {
    const prefix = `Phần I, câu ${i + 1}: `;
    const opts = q.opts || [];

    if (/[:;,.…]$/.test(String(q.stem || '').trim())) {
      warnings.push(
        `${prefix}phần dẫn kết thúc bằng kí hiệu (dấu hai chấm, phẩy, chấm…): câu dẫn nối trực tiếp với phương án phải kết thúc không có kí hiệu nào, hoặc là câu hỏi kết thúc bằng dấu ?`
      );
    }
    if (opts.length !== 4) {
      warnings.push(`${prefix}không đủ 4 phương án.`);
    }

    const correctIdx = 'ABCD'.indexOf(String(q.ans || '').trim().charAt(0));
    if (correctIdx < 0) {
      warnings.push(`${prefix}đáp án không thuộc A, B, C, D.`);
    } else {
      const restLengths = opts.filter((_, j) => j !== correctIdx).map((x) => String(x).length);
      const avgRest = restLengths.reduce((a, b) => a + b, 0) / (restLengths.length || 1);
      if (String(opts[correctIdx]).length > 1.5 * avgRest + 10) {
        warnings.push(`${prefix}đáp án đúng dài vượt trội so với các phương án nhiễu.`);
      }
    }

    if (new Set(opts.map((x) => String(x).trim().toLowerCase())).size < opts.length) {
      warnings.push(`${prefix}có phương án bị trùng lặp.`);
    }

    if (
      opts.some((x) =>
        /tất cả (các )?(đều )?(đúng|sai)|đều đúng|đều sai|không có đáp án nào|cả [A-D] và [A-D]/i.test(x)
      )
    ) {
      warnings.push(`${prefix}có phương án kiểu "tất cả đều đúng/sai".`);
    }

    const absFound = findAbsolute((q.stem || '') + ' ' + opts.join(' '));
    if (absFound.length) {
      warnings.push(`${prefix}có từ tuyệt đối hoặc mơ hồ: ${absFound.join(', ')}.`);
    }
    if (/(^|\s)(không|chưa|sai)(\s|$|[?.,:])/i.test(q.stem || '') && !/KHÔNG|CHƯA|SAI/.test(q.stem || '')) {
      warnings.push(`${prefix}có từ phủ định: khuyến nghị VIẾT HOA và in đậm để học sinh lưu ý.`);
    }
  });

  if (groups.NLC.length >= 6) {
    const counts: Record<string, number> = {};
    groups.NLC.forEach((q) => {
      const k = String(q.ans).trim().charAt(0);
      counts[k] = (counts[k] || 0) + 1;
    });
    if (Math.max(...Object.values(counts)) > Math.ceil(groups.NLC.length * 0.4)) {
      warnings.push(
        `Phần I: vị trí đáp án đúng phân bố chưa đều giữa A, B, C, D (${Object.entries(counts)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}).`
      );
    }
    const letters = groups.NLC.map((q) => String(q.ans).trim().charAt(0)).join('');
    if (/(.)\1\1/.test(letters)) {
      warnings.push(`Phần I: có 3 câu liên tiếp cùng chung một đáp án.`);
    }
  }

  let dataCount = 0;
  let textCount = 0;
  groups.DS.forEach((q, i) => {
    const prefix = `Phần II, câu ${i + 1}: `;
    const items = q.items || [];
    const srcs = q.srcs || [];

    if (items.length !== 4) {
      warnings.push(`${prefix}không đủ 4 ý a, b, c, d.`);
    }
    const trueCount = items.filter((x) => x.a).length;
    if (trueCount === 0 || trueCount === items.length) {
      warnings.push(`${prefix}4 ý đều đúng hoặc đều sai; cần có cả ý đúng và ý sai.`);
    }
    const pattern = items.map((x) => (x.a ? 'Đ' : 'S')).join('');
    if (pattern === 'ĐSĐS' || pattern === 'SĐSĐ') {
      warnings.push(`${prefix}đúng/sai xen kẽ theo quy luật dễ đoán (${pattern}).`);
    }

    items.forEach((item, j) => {
      const absFound = findAbsolute(item.t);
      if (absFound.length) {
        warnings.push(`${prefix}ý ${'abcd'[j]}) có từ tuyệt đối hoặc mơ hồ: ${absFound.join(', ')}.`);
      }
      if ((j < 2 && item.m === 'V') || (j >= 2 && item.m === 'B')) {
        warnings.push(
          `${prefix}ý ${'abcd'[j]}) chưa xếp theo cấp độ tư duy tăng dần (ý a, b mức Biết–Hiểu; ý c, d mức Vận dụng).`
        );
      }
    });

    if (!srcs.length) {
      warnings.push(`${prefix}thiếu ngữ liệu hoặc trích dẫn nguồn.`);
    }
    srcs.forEach((s, k) => {
      if (!String(s.src || '').trim()) {
        warnings.push(`${prefix}nguồn ${k + 1} thiếu trích dẫn.`);
      }
    });

    if (srcs.some((s) => s.table || s.chart || s.fig)) {
      dataCount++;
    } else {
      textCount++;
    }
  });

  if (mon === 'Địa lí' && groups.DS.length) {
    infos.push(
      `Địa lí, Phần II: ${dataCount} câu dùng bảng số liệu/biểu đồ/hình vẽ; ${textCount} câu dùng ngữ liệu văn bản.`
    );
    if (geoDivide && Math.abs(dataCount - Math.round((groups.DS.length * geoPct) / 100)) > 1) {
      warnings.push(
        `Địa lí, Phần II: số câu dùng bảng/biểu đồ/hình (${dataCount}/${groups.DS.length}) lệch tỉ lệ đã chọn (${geoPct}%).`
      );
    }
  }

  groups.TLN.forEach((q, i) => {
    const prefix = `Phần III, câu ${i + 1}: `;
    const ans = String(q.ans || '').trim();
    const stem = String(q.stem || '');

    if (!/^[-+−]?\s*\d+(?:[.,]\d+)?$/.test(ans)) {
      warnings.push(`${prefix}phần III chỉ gồm câu hỏi tính toán: đáp án bắt buộc là một giá trị số.`);
    }
    if (/\d[.,]\d/.test(ans) && !/làm tròn|phần (mười|trăm|nghìn|chục)|nguyên gần nhất/i.test(stem)) {
      warnings.push(`${prefix}đáp án là số thập phân nhưng lời dẫn chưa nêu quy ước làm tròn.`);
    }
    if (/^[-+]?\d/.test(ans) && !/(theo|tính bằng|đơn vị|đo bằng|phần số)/i.test(stem)) {
      warnings.push(`${prefix}chưa nêu rõ đơn vị đo hoặc yêu cầu "chỉ điền phần số".`);
    }
  });

  const checkNeeds = questions.filter((q) => q.chk).length;
  if (checkNeeds) {
    infos.push(`${checkNeeds} câu được AI đánh dấu cần đối chiếu sách giáo khoa.`);
  }

  return { warnings, infos };
}
