import { QuestionPointConfig, SubjectName } from '../types';

export const MON: SubjectName[] = [
  'Toán',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lí',
  'Giáo dục kinh tế và pháp luật',
  'Tin học',
  'Công nghệ',
  'Tiếng Anh',
  'Ngữ văn',
  'Giáo dục quốc phòng và an ninh',
  'Giáo dục thể chất',
  'Âm nhạc',
  'Mĩ thuật',
  'Hoạt động trải nghiệm, hướng nghiệp',
];

export const PRACT: SubjectName[] = [
  'Giáo dục thể chất',
  'Âm nhạc',
  'Mĩ thuật',
  'Hoạt động trải nghiệm, hướng nghiệp',
];

export const NOCALC: SubjectName[] = [
  'Lịch sử',
  'Giáo dục quốc phòng và an ninh',
];

const mk = (o: Record<string, [string[], string[]]>) => {
  const r: Record<string, [string, number][]> = {};
  for (const g in o) {
    r[g] = [
      ...o[g][0].map((n): [string, number] => [n, 1]),
      ...o[g][1].map((n): [string, number] => [n, 2]),
    ];
  }
  return r;
};

const sm = (a: string[], b: string[]) =>
  mk({
    '10': [a, b],
    '11': [a, b],
    '12': [a, b],
  });

export const CURRICULUM_DATA: Record<string, Record<string, [string, number][] | number>> = {
  Toán: mk({
    '10': [
      ['Mệnh đề và tập hợp', 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn', 'Hệ thức lượng trong tam giác', 'Vectơ', 'Các số đặc trưng của mẫu số liệu không ghép nhóm'],
      ['Hàm số, đồ thị và ứng dụng', 'Phương pháp tọa độ trong mặt phẳng', 'Đại số tổ hợp', 'Tính xác suất theo định nghĩa cổ điển'],
    ],
    '11': [
      ['Hàm số lượng giác và phương trình lượng giác', 'Dãy số, cấp số cộng và cấp số nhân', 'Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm', 'Quan hệ song song trong không gian', 'Giới hạn, hàm số liên tục'],
      ['Hàm số mũ và hàm số lôgarit', 'Quan hệ vuông góc trong không gian', 'Các quy tắc tính xác suất', 'Đạo hàm'],
    ],
    '12': [
      ['Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số', 'Vectơ và hệ trục tọa độ trong không gian', 'Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm'],
      ['Nguyên hàm và tích phân', 'Phương pháp tọa độ trong không gian', 'Xác suất có điều kiện'],
    ],
  }),
  'Vật lí': mk({
    '10': [
      ['Mở đầu', 'Động học', 'Động lực học'],
      ['Công, năng lượng, công suất', 'Động lượng', 'Chuyển động tròn', 'Biến dạng của vật rắn'],
    ],
    '11': [
      ['Dao động', 'Sóng'],
      ['Trường điện', 'Dòng điện, mạch điện'],
    ],
    '12': [
      ['Vật lí nhiệt', 'Khí lí tưởng'],
      ['Từ trường', 'Vật lí hạt nhân và phóng xạ'],
    ],
  }),
  'Hóa học': mk({
    '10': [
      ['Cấu tạo nguyên tử', 'Bảng tuần hoàn các nguyên tố hóa học', 'Liên kết hóa học', 'Phản ứng oxi hóa - khử'],
      ['Năng lượng hóa học', 'Tốc độ phản ứng', 'Nguyên tố nhóm halogen'],
    ],
    '11': [
      ['Cân bằng hóa học', 'Nitrogen và sulfur', 'Đại cương về hóa học hữu cơ'],
      ['Hydrocarbon', 'Dẫn xuất halogen - alcohol - phenol', 'Hợp chất carbonyl - carboxylic acid'],
    ],
    '12': [
      ['Ester - lipid', 'Carbohydrate', 'Hợp chất chứa nitrogen', 'Polymer'],
      ['Pin điện và điện phân', 'Đại cương về kim loại', 'Nguyên tố nhóm IA và IIA', 'Sơ lược kim loại chuyển tiếp dãy thứ nhất và phức chất'],
    ],
  }),
  'Địa lí': mk({
    '10': [
      [
        'Chương 1. Sử dụng bản đồ',
        'Chương 2. Trái Đất',
        'Chương 3. Thạch quyển',
        'Chương 4. Khí quyển',
        'Chương 5. Thủy quyển',
        'Chương 6. Sinh quyển',
        'Chương 7. Một số quy luật của vỏ địa lí',
      ],
      [
        'Chương 8. Địa lí dân cư',
        'Chương 9. Các nguồn lực, một số tiêu chí đánh giá sự phát triển kinh tế',
        'Chương 10. Địa lí ngành nông nghiệp, lâm nghiệp, thủy sản',
        'Chương 11. Địa lí ngành công nghiệp',
        'Chương 12. Địa lí ngành dịch vụ',
        'Chương 13. Phát triển bền vững và tăng trưởng xanh',
      ],
    ],
    '11': [
      [
        'Sự khác biệt về trình độ phát triển kinh tế - xã hội giữa các nhóm nước',
        'Toàn cầu hóa, khu vực hóa kinh tế',
        'Một số tổ chức quốc tế và an ninh toàn cầu',
        'Khu vực Mỹ Latinh',
        'Liên minh châu Âu (EU)',
        'Khu vực Đông Nam Á',
      ],
      [
        'Khu vực Tây Nam Á',
        'Hợp chúng quốc Hoa Kì',
        'Liên bang Nga',
        'Nhật Bản',
        'Trung Quốc',
        'Ô-xtrây-li-a',
      ],
    ],
    '12': [
      [
        'Phần 1. Địa lí tự nhiên',
        'Phần 2. Địa lí dân cư',
        'Phần 3. Địa lí các ngành kinh tế',
      ],
      [
        'Phần 4. Địa lí các vùng kinh tế – xã hội',
        'Phần 5. Địa lí địa phương',
      ],
    ],
  }),
  'Sinh học': mk({
    '10': [
      [
        'Giới thiệu chung về sinh học',
        'Thành phần hóa học của tế bào',
        'Cấu trúc tế bào',
        'Trao đổi chất và chuyển hóa năng lượng ở tế bào',
      ],
      [
        'Thông tin ở tế bào: chu kì tế bào, nguyên phân, giảm phân',
        'Vi sinh vật và virus',
      ],
    ],
    '11': [
      [
        'Trao đổi chất và chuyển hóa năng lượng ở sinh vật',
        'Cảm ứng ở sinh vật',
        'Cân bằng nội môi và miễn dịch',
      ],
      [
        'Sinh trưởng và phát triển ở sinh vật',
        'Sinh sản ở sinh vật',
      ],
    ],
    '12': [
      [
        'Gene và cơ chế truyền thông tin di truyền',
        'Di truyền nhiễm sắc thể',
        'Di truyền học quần thể',
      ],
      [
        'Di truyền học người và ứng dụng di truyền',
        'Tiến hóa',
        'Sinh thái học và bảo vệ môi trường',
      ],
    ],
  }),
  'Lịch sử': mk({
    '10': [
      [
        'Chủ đề 1. Lịch sử và Sử học',
        'Chủ đề 2. Một số nền văn minh thế giới thời kì cổ - trung đại',
        'Chủ đề 3. Các cuộc cách mạng công nghiệp trong lịch sử thế giới',
      ],
      [
        'Chủ đề 4. Văn minh Đông Nam Á cổ - trung đại',
        'Chủ đề 5. Một số nền văn minh trên đất nước Việt Nam',
        'Chủ đề 6. Cộng đồng các dân tộc Việt Nam',
      ],
    ],
    '11': [
      [
        'Chủ đề 1. Một số vấn đề chung về cách mạng tư sản',
        'Chủ đề 2. Chủ nghĩa xã hội từ năm 1917 đến nay',
        'Chủ đề 3. Quá trình giành độc lập dân tộc của các quốc gia Đông Nam Á',
      ],
      [
        'Chủ đề 4. Chiến tranh bảo vệ Tổ quốc trong lịch sử Việt Nam',
        'Chủ đề 5. Một số cuộc cải cách lớn trong lịch sử Việt Nam',
        'Chủ đề 6. Lịch sử bảo vệ chủ quyền, các quyền và lợi ích hợp pháp của Việt Nam ở Biển Đông',
      ],
    ],
    '12': [
      [
        'Chủ đề 1. Thế giới trong và sau Chiến tranh lạnh',
        'Chủ đề 2. ASEAN: Những chặng đường lịch sử',
        'Chủ đề 3. Cách mạng tháng Tám năm 1945 và chiến tranh giải phóng dân tộc, bảo vệ Tổ quốc trong lịch sử Việt Nam',
      ],
      [
        'Chủ đề 4. Kháng chiến chống Mỹ, cứu nước (1954 - 1975) và chiến tranh bảo vệ Tổ quốc (từ 1975 đến nay)',
        'Chủ đề 5. Công cuộc Đổi mới ở Việt Nam từ năm 1986 đến nay',
        'Chủ đề 6. Lịch sử đối ngoại Việt Nam thời kì hiện đại; Hồ Chí Minh trong lịch sử dân tộc',
      ],
    ],
  }),
  'Tiếng Anh': mk({
    '10': [
      [
        'Unit 1: Family life',
        'Unit 2: Humans and the environment',
        'Unit 3: Music',
        'Unit 4: For a better community',
        'Unit 5: Inventions',
      ],
      [
        'Unit 6: Gender equality',
        'Unit 7: Viet Nam and international organisations',
        'Unit 8: New ways to learn',
        'Unit 9: Protecting the environment',
        'Unit 10: Ecotourism',
      ],
    ],
    '11': [
      [
        'Unit 1: A long and healthy life',
        'Unit 2: The generation gap',
        'Unit 3: Cities of the future',
        'Unit 4: ASEAN and Viet Nam',
        'Unit 5: Global warming',
      ],
      [
        'Unit 6: Preserving our heritage',
        'Unit 7: Education options for school-leavers',
        'Unit 8: Becoming independent',
        'Unit 9: Social issues',
        'Unit 10: The ecosystem',
      ],
    ],
    '12': [
      [
        'Unit 1: Life stories we admire',
        'Unit 2: A multicultural world',
        'Unit 3: Green living',
        'Unit 4: Urbanisation',
        'Unit 5: The world of work',
      ],
      [
        'Unit 6: Artificial intelligence',
        'Unit 7: The world of mass media',
        'Unit 8: Wildlife conservation',
        'Unit 9: Career paths',
        'Unit 10: Lifelong learning',
      ],
    ],
  }),
  'Giáo dục kinh tế và pháp luật': mk({
    '10': [
      [
        'Nền kinh tế và các chủ thể của nền kinh tế',
        'Cơ chế thị trường',
        'Ngân sách nhà nước và thuế',
      ],
      [
        'Sản xuất kinh doanh và dịch vụ tín dụng',
        'Hiến pháp và hệ thống chính trị',
        'Bộ máy nhà nước và quyền, nghĩa vụ công dân',
      ],
    ],
    '11': [
      [
        'Cạnh tranh trong nền kinh tế thị trường',
        'Lạm phát, thất nghiệp',
        'Thị trường lao động, việc làm',
      ],
      [
        'Quyền bình đẳng của công dân',
        'Quyền tự do cơ bản của công dân',
        'Pháp luật về bảo vệ quyền và nghĩa vụ công dân',
      ],
    ],
    '12': [
      [
        'Tăng trưởng và phát triển kinh tế',
        'Hội nhập kinh tế quốc tế',
        'Pháp luật về lao động',
      ],
      [
        'Pháp luật về hôn nhân và gia đình',
        'Quyền và nghĩa vụ cơ bản của công dân',
        'Pháp luật quốc tế',
      ],
    ],
  }),
  'Tin học': mk({
    '10': [
      [
        'Máy tính và xã hội tri thức',
        'Mạng máy tính và Internet',
        'Đạo đức, pháp luật và văn hóa trong môi trường số',
      ],
      [
        'Ứng dụng tin học',
        'Giải quyết vấn đề với sự trợ giúp của máy tính (lập trình)',
      ],
    ],
    '11': [
      [
        'Hệ điều hành và phần mềm ứng dụng',
        'Mạng máy tính và Internet',
        'Đạo đức, pháp luật và văn hóa trong môi trường số',
      ],
      [
        'Ứng dụng tin học',
        'Giải quyết vấn đề với sự trợ giúp của máy tính',
      ],
    ],
    '12': [
      [
        'Trí tuệ nhân tạo và học máy',
        'Mạng máy tính và Internet vạn vật',
        'Đạo đức, pháp luật trong môi trường số',
      ],
      [
        'Hướng nghiệp với tin học',
        'Giải quyết vấn đề với sự trợ giúp của máy tính',
      ],
    ],
  }),
  'Công nghệ': mk({
    '10': [
      ['Khái quát về công nghệ', 'Thiết kế kĩ thuật'],
      ['Vẽ kĩ thuật', 'Công nghệ trong sản xuất và đời sống'],
    ],
    '11': [
      ['Vật liệu và công nghệ chế tạo cơ khí', 'Cơ khí động lực'],
      ['Động cơ đốt trong', 'Ô tô và công nghệ'],
    ],
    '12': [
      ['Linh kiện điện tử', 'Mạch điện tử cơ bản'],
      ['Hệ thống điện quốc gia', 'Mạng điện trong gia đình'],
    ],
  }),
  'Giáo dục quốc phòng và an ninh': mk({
    '10': [
      [
        'Truyền thống chống giặc ngoại xâm của dân tộc',
        'Xây dựng nền quốc phòng toàn dân, an ninh nhân dân',
      ],
      ['Đội ngũ đơn vị', 'Kĩ thuật cứu thương và phòng tránh thiên tai'],
    ],
    '11': [
      [
        'Bảo vệ an ninh quốc gia, trật tự an toàn xã hội',
        'Phòng chống vi phạm pháp luật',
      ],
      ['Quân sự chung: điều lệnh, bắn súng', 'Kĩ thuật chiến đấu bộ binh'],
    ],
    '12': [
      [
        'Chiến tranh nhân dân bảo vệ Tổ quốc',
        'Phòng chống chiến lược diễn biến hòa bình',
      ],
      ['Kĩ thuật chiến đấu', 'Vũ khí công nghệ cao và biện pháp phòng tránh'],
    ],
  }),
  'Giáo dục thể chất': sm(
    ['Chạy cự li ngắn và chạy bền', 'Thể thao tự chọn: kĩ thuật cơ bản'],
    ['Nhảy xa hoặc nhảy cao', 'Thể thao tự chọn: vận dụng thi đấu']
  ),
  'Âm nhạc': sm(['Hát', 'Nhạc cụ'], ['Lí thuyết âm nhạc', 'Thường thức âm nhạc']),
  'Mĩ thuật': sm(['Lí luận và lịch sử mĩ thuật', 'Thực hành vẽ, trang trí'], ['Thiết kế sản phẩm', 'Dự án mĩ thuật']),
  'Hoạt động trải nghiệm, hướng nghiệp': sm(
    ['Hoạt động hướng vào bản thân', 'Hoạt động hướng đến nhà trường'],
    ['Hoạt động hướng đến xã hội, cộng đồng', 'Hướng nghiệp']
  ),
  'Ngữ văn': { '10': 1, '11': 1, '12': 1 },
};

export const DETAILED_SPECS: Record<string, Record<string, [string, string, string, string][]>> = {
  'Địa lí': {
    '10': [
      [
        'Bài 1. Môn Địa lí với định hướng nghề nghiệp\nBài 2. Một số phương pháp biểu hiện các đối tượng địa lí trên bản đồ\nBài 3. Sử dụng bản đồ trong học tập và đời sống, một số ứng dụng của GPS và bản đồ số trong đời sống',
        'Nêu được vai trò của môn Địa lí và một số ngành nghề liên quan; kể tên được các phương pháp biểu hiện đối tượng địa lí trên bản đồ, ứng dụng của GPS và bản đồ số.',
        'Phân tích được mối quan hệ giữa kiến thức địa lí với các ngành nghề; phân biệt được đặc điểm các phương pháp biểu hiện trên bản đồ; giải thích vai trò của GPS.',
        'Sử dụng bản đồ và các ứng dụng GPS/bản đồ số để xác định vị trí, chỉ đường và giải quyết tình huống thực tế; liên hệ định hướng nghề nghiệp bản thân.',
      ],
      [
        'Bài 4. Hệ quả địa lí các chuyển động của Trái Đất',
        'Trình bày được các chuyển động chính của Trái Đất và cấu trúc của Trái Đất.',
        'Giải thích được các hệ quả địa lí của chuyển động tự quay quanh trục và quay quanh Mặt Trời của Trái Đất.',
        'Giải thích hiện tượng ngày đêm chênh lệch theo mùa, theo vĩ độ và giờ trên Trái Đất ở địa phương.',
      ],
      [
        'Bài 5. Thạch quyển. Nội lực và tác động của nội lực đến địa hình bề mặt Trái Đất\nBài 6. Ngoại lực và tác động của ngoại lực đến địa hình bề mặt Trái Đất',
        'Trình bày được khái niệm thạch quyển, các nhân tố nội lực và ngoại lực.',
        'Phân biệt được tác động của nội lực và ngoại lực trong việc hình thành địa hình bề mặt Trái Đất.',
        'Giải thích nguyên nhân hình thành các dạng địa hình thực tế (động đất, núi lửa, địa hình karst, phong hóa).',
      ],
      [
        'Bài 7. Cấu trúc khí quyển. Các đới khí hậu trên Trái Đất\nBài 8. Khí áp, gió và lượng mưa',
        'Nêu được cấu trúc khí quyển, các nhân tố ảnh hưởng đến nhiệt độ, khí áp, gió và mưa.',
        'Giải thích được sự phân bố nhiệt độ, khí áp, các đới gió chính và lượng mưa trên Trái Đất.',
        'Phân tích biểu đồ khí hậu, bản đồ khí áp và gió; đề xuất ứng phó với biến đổi khí hậu.',
      ],
      [
        'Bài 9. Thủy quyển. Vòng tuần hoàn của nước. Nước ngầm và băng hà\nBài 10. Sông, hồ. Biển và đại dương',
        'Trình bày được khái niệm thủy quyển, vòng tuần hoàn của nước, chế độ nước sông, sóng, thủy triều.',
        'Giải thích được các nhân tố ảnh hưởng đến chế độ nước sông, hiện tượng sóng, thủy triều, dòng biển.',
        'Phân tích bản đồ, số liệu thủy văn; đề xuất giải pháp sử dụng hợp lí và bảo vệ nguồn nước.',
      ],
      [
        'Bài 11. Đất và sinh quyển\nBài 12. Lớp vỏ địa lí. Quy luật địa đới và phi địa đới',
        'Nêu được các nhân tố hình thành đất, sự phân bố sinh vật; khái niệm lớp vỏ địa lí và các quy luật.',
        'Giải thích được ảnh hưởng của các nhân tố đến đất, sinh vật; phân biệt quy luật địa đới và phi địa đới.',
        'Vận dụng quy luật địa lí để giải thích sự phân bố thiên nhiên và đề xuất sử dụng hợp lí tự nhiên.',
      ],
      [
        'Bài 13. Dân số và gia tăng dân số. Cơ cấu dân số\nBài 14. Phân bố dân cư và đô thị hóa',
        'Trình bày được các khái niệm, nhân tố ảnh hưởng đến gia tăng dân số, cơ cấu và phân bố dân cư.',
        'Giải thích được sự khác biệt về gia tăng dân số, cơ cấu dân số, đô thị hóa giữa các nhóm nước.',
        'Phân tích biểu đồ, số liệu dân cư; đề xuất giải pháp cho vấn đề dân số ở địa phương.',
      ],
      [
        'Bài 15. Địa lí các ngành nông nghiệp, lâm nghiệp, thủy sản',
        'Nêu được vai trò, đặc điểm và các nhân tố ảnh hưởng đến sự phát triển, phân bố nông nghiệp, lâm nghiệp, thủy sản.',
        'Giải thích được sự phân bố của các ngành, các mô hình nông nghiệp.',
        'Phân tích bảng số liệu, biểu đồ; liên hệ phát triển nông nghiệp bền vững ở địa phương.',
      ],
      [
        'Bài 16. Địa lí ngành công nghiệp và các ngành công nghiệp chủ yếu',
        'Trình bày được vai trò, đặc điểm và các nhân tố ảnh hưởng đến phát triển, phân bố công nghiệp.',
        'Giải thích được sự phân bố của một số ngành công nghiệp; nhận xét xu hướng phát triển.',
        'Phân tích số liệu, biểu đồ công nghiệp; đánh giá ảnh hưởng của công nghiệp đến môi trường.',
      ],
      [
        'Bài 17. Địa lí ngành dịch vụ (giao thông vận tải, thương mại, du lịch)',
        'Nêu được vai trò, đặc điểm và các nhân tố ảnh hưởng đến phát triển, phân bố dịch vụ.',
        'Giải thích được sự phát triển, phân bố của giao thông vận tải, thương mại, du lịch.',
        'Phân tích số liệu dịch vụ; đề xuất phát triển dịch vụ phù hợp với địa phương.',
      ],
      [
        'Bài 18. Môi trường và tài nguyên thiên nhiên. Phát triển bền vững',
        'Nêu được khái niệm môi trường, tài nguyên thiên nhiên, phát triển bền vững, tăng trưởng xanh.',
        'Phân tích được mối quan hệ giữa phát triển kinh tế, tài nguyên và môi trường.',
        'Đề xuất và vận dụng giải pháp bảo vệ môi trường, sử dụng bền vững tài nguyên ở địa phương.',
      ],
    ],
    '11': [
      [
        'Sự khác biệt về trình độ phát triển kinh tế - xã hội giữa các nhóm nước; cách mạng công nghiệp 4.0',
        'Nêu được tiêu chí phân loại nhóm nước, đặc điểm kinh tế - xã hội của các nhóm nước.',
        'Giải thích được sự khác biệt về trình độ phát triển; tác động của cách mạng công nghiệp 4.0.',
        'Phân tích bảng số liệu (GDP, HDI...) để so sánh các nhóm nước.',
      ],
      [
        'Toàn cầu hóa, khu vực hóa kinh tế',
        'Trình bày được biểu hiện, hệ quả của toàn cầu hóa và khu vực hóa kinh tế.',
        'Phân tích được tác động tích cực, tiêu cực của toàn cầu hóa, khu vực hóa.',
        'Liên hệ tác động của toàn cầu hóa với Việt Nam; đánh giá cơ hội, thách thức.',
      ],
      [
        'Một số tổ chức quốc tế và khu vực; một số vấn đề an ninh toàn cầu',
        'Kể tên, nêu mục tiêu của một số tổ chức quốc tế, khu vực; nhận biết các vấn đề an ninh toàn cầu.',
        'Giải thích vai trò của các tổ chức; phân tích nguyên nhân, hậu quả các vấn đề an ninh.',
        'Đề xuất hành động của cá nhân, quốc gia đối với các vấn đề an ninh toàn cầu.',
      ],
      [
        'Khu vực Mỹ Latinh: tự nhiên, dân cư, xã hội, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư, xã hội và kinh tế của Mỹ Latinh.',
        'Giải thích được ảnh hưởng của tự nhiên, dân cư đến phát triển kinh tế; vấn đề đô thị hóa tự phát.',
        'Phân tích số liệu, bản đồ để nhận xét tình hình kinh tế khu vực.',
      ],
      [
        'Liên minh châu Âu (EU): vị trí, mục tiêu; hợp tác; vai trò trong kinh tế thế giới',
        'Trình bày được quá trình hình thành, mục tiêu, thể chế và vai trò của EU.',
        'Phân tích được ý nghĩa của liên kết khu vực; ảnh hưởng của Brexit và hợp tác nội khối.',
        'Phân tích số liệu để đánh giá vị thế kinh tế của EU; liên hệ quan hệ EU - Việt Nam.',
      ],
      [
        'Khu vực Đông Nam Á: tự nhiên, dân cư, kinh tế; ASEAN',
        'Nêu được đặc điểm tự nhiên, dân cư, xã hội, kinh tế Đông Nam Á; mục tiêu, vai trò của ASEAN.',
        'Giải thích ảnh hưởng của tự nhiên, dân cư đến phát triển kinh tế; ý nghĩa của hợp tác ASEAN.',
        'Phân tích số liệu; liên hệ vai trò của Việt Nam trong ASEAN; đánh giá cơ hội, thách thức.',
      ],
      [
        'Khu vực Tây Nam Á: tự nhiên, dân cư, xã hội, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư, xã hội, kinh tế Tây Nam Á.',
        'Giải thích tầm quan trọng của dầu mỏ, vị trí chiến lược và các vấn đề xung đột.',
        'Phân tích bản đồ, số liệu để nhận xét kinh tế và vấn đề chính trị - xã hội khu vực.',
      ],
      [
        'Hợp chúng quốc Hoa Kì: tự nhiên, dân cư, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư và các ngành kinh tế chính của Hoa Kì.',
        'Giải thích ảnh hưởng của tự nhiên, dân cư đến kinh tế; sự phân bố các ngành.',
        'Phân tích số liệu, biểu đồ kinh tế Hoa Kì; liên hệ quan hệ kinh tế Hoa Kì - Việt Nam.',
      ],
      [
        'Liên bang Nga: tự nhiên, dân cư, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư, các ngành kinh tế chính của Liên bang Nga.',
        'Giải thích ảnh hưởng của tự nhiên, tài nguyên đến phát triển kinh tế; sự phân bố các ngành.',
        'Phân tích số liệu, bản đồ; liên hệ quan hệ kinh tế Nga - Việt Nam.',
      ],
      [
        'Nhật Bản: tự nhiên, dân cư, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư, các ngành kinh tế chính của Nhật Bản.',
        'Giải thích tác động của tự nhiên, già hóa dân số đến phát triển kinh tế.',
        'Phân tích số liệu, biểu đồ; liên hệ quan hệ kinh tế Nhật Bản - Việt Nam.',
      ],
      [
        'Trung Quốc: tự nhiên, dân cư, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư, các ngành kinh tế chính của Trung Quốc.',
        'Giải thích ảnh hưởng của tự nhiên, dân cư đến kinh tế; sự phân bố các ngành.',
        'Phân tích số liệu, biểu đồ; liên hệ quan hệ kinh tế Trung Quốc - Việt Nam.',
      ],
      [
        'Ô-xtrây-li-a: tự nhiên, dân cư, kinh tế',
        'Nêu được vị trí, đặc điểm tự nhiên, dân cư, các ngành kinh tế chính của Ô-xtrây-li-a.',
        'Giải thích ảnh hưởng của tự nhiên, tài nguyên đến phát triển kinh tế.',
        'Phân tích số liệu, bản đồ; liên hệ quan hệ kinh tế Ô-xtrây-li-a - Việt Nam.',
      ],
    ],
    '12': [
      [
        'Bài 1. Vị trí địa lí và phạm vi lãnh thổ\nBài 2. Thiên nhiên nhiệt đới ẩm gió mùa\nBài 3. Sự phân hoá đa dạng của thiên nhiên\nBài 4. Thực hành: Viết báo cáo về sự phân hoá tự nhiên Việt Nam\nBài 5. Vấn đề sử dụng hợp lí tài nguyên thiên nhiên và bảo vệ môi trường\nBài 6. Thực hành: Tuyên truyền sử dụng hợp lí tài nguyên thiên nhiên hoặc bảo vệ môi trường ở địa phương',
        'Xác định được vị trí địa lí, phạm vi lãnh thổ và các đặc điểm tự nhiên cốt lõi của Việt Nam.',
        'Phân tích tính chất nhiệt đới ẩm gió mùa, sự phân hóa đa dạng của thiên nhiên và nguyên nhân suy thoái tài nguyên.',
        'Viết báo cáo sự phân hóa tự nhiên; đề xuất giải pháp tuyên truyền sử dụng hợp lí tài nguyên và bảo vệ môi trường.',
      ],
      [
        'Bài 7. Dân số Việt Nam\nBài 8. Lao động và việc làm\nBài 9. Đô thị hoá\nBài 10. Thực hành: Viết báo cáo về một chủ đề dân cư ở Việt Nam',
        'Trình bày đặc điểm dân số, nguồn lao động, tình hình việc làm và quá trình đô thị hóa ở Việt Nam.',
        'Phân tích ảnh hưởng của dân số, lao động và đô thị hóa đến phát triển kinh tế - xã hội.',
        'Viết báo cáo về một chủ đề dân cư; đề xuất giải pháp giải quyết việc làm và đô thị hóa bền vững.',
      ],
      [
        'Bài 11. Chuyển dịch cơ cấu kinh tế\nBài 12. Vấn đề phát triển ngành nông nghiệp\nBài 13. Vấn đề phát triển ngành lâm nghiệp và thuỷ sản\nBài 14. Tổ chức lãnh thổ nông nghiệp\nBài 15. Thực hành: Tìm hiểu vai trò, tình hình phát triển...\nBài 16. Chuyển dịch cơ cấu ngành công nghiệp\nBài 17. Một số ngành công nghiệp\nBài 18. Một số hình thức tổ chức lãnh thổ công nghiệp\nBài 19. Thực hành: Vẽ biểu đồ...\nBài 20. Vai trò, các nhân tố ảnh hưởng...\nBài 21. Giao thông vận tải và bưu chính viễn thông\nBài 22. Thương mại và du lịch\nBài 23. Thực hành: Tìm hiểu sự phát triển một số ngành dịch vụ',
        'Nêu đặc điểm, xu hướng chuyển dịch cơ cấu kinh tế, tình hình phát triển các ngành nông - lâm - thủy sản, công nghiệp, dịch vụ.',
        'Giải thích sự phát triển, phân bố và các hình thức tổ chức lãnh thổ của nông nghiệp, công nghiệp, dịch vụ.',
        'Vẽ và phân tích biểu đồ cơ cấu kinh tế; viết báo cáo tìm hiểu sự phát triển ngành dịch vụ ở địa phương.',
      ],
      [
        'Bài 24. Khai thác thế mạnh ở Trung du và miền núi phía Bắc\nBài 25. Phát triển kinh tế – xã hội ở Đồng bằng sông Hồng\nBài 26. Thực hành: Tìm hiểu vấn đề phát triển kinh tế biển ở Đồng bằng sông Hồng\nBài 27. Phát triển kinh tế – xã hội ở Bắc Trung Bộ\nBài 28. Phát triển kinh tế – xã hội ở Duyên hải Nam Trung Bộ và Tây Nguyên\nBài 29. Thực hành: Phân tích ý nghĩa đối với quốc phòng, an ninh ở Duyên hải Nam Trung Bộ và Tây Nguyên\nBài 30. Phát triển kinh tế – xã hội ở Đông Nam Bộ\nBài 31. Sử dụng hợp lí tự nhiên để phát triển kinh tế ở Đồng bằng sông Cửu Long\nBài 32. Thực hành: Viết báo cáo về biến đổi khí hậu ở Đồng bằng sông Cửu Long\nBài 33. Phát triển kinh tế và đảm bảo quốc phòng, an ninh ở Biển Đông và các đảo\nBài 34. Thực hành: Viết báo cáo tuyên truyền về bảo vệ chủ quyền biển, đảo của Việt Nam',
        'Trình bày thế mạnh, hạn chế, tình hình phát triển kinh tế - xã hội của các vùng kinh tế và vị trí chiến lược của Biển Đông.',
        'Giải thích sự phát triển, phân bố kinh tế ở từng vùng và ý nghĩa của việc đảm bảo quốc phòng, an ninh trên Biển Đông.',
        'Viết báo cáo về biến đổi khí hậu ĐBSCL; xây dựng bài tuyên truyền bảo vệ chủ quyền biển, đảo của Việt Nam.',
      ],
      [
        'Bài 35. Thực hành: Tìm hiểu Địa lí địa phương',
        'Nêu các nội dung chính về vị trí, tự nhiên, dân cư, kinh tế - xã hội của địa phương.',
        'Phân tích được các đặc điểm tự nhiên, kinh tế - xã hội và tiềm năng phát triển của tỉnh/thành phố.',
        'Viết và trình bày báo cáo tìm hiểu địa lí tỉnh/thành phố nơi em sinh sống.',
      ],
    ],
  },
  Toán: {
    '10': [
      [
        'Mệnh đề; Tập hợp, các phép toán trên tập hợp (giao, hợp, hiệu, phần bù)',
        'Nhận biết mệnh đề, mệnh đề phủ định, kéo theo; kí hiệu tập hợp, tập con.',
        'Thực hiện các phép toán trên tập hợp (giao, hợp, hiệu, phần bù); xác định mệnh đề đúng/sai.',
        'Vận dụng mệnh đề và lý thuyết tập hợp giải bài toán thực tiễn và chứng minh toán học.',
      ],
      [
        'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn; Biểu diễn miền nghiệm',
        'Nhận biết nghiệm và miền nghiệm của BPT, hệ BPT bậc nhất hai ẩn.',
        'Xác định, biểu diễn miền nghiệm của BPT và hệ BPT bậc nhất hai ẩn trên mặt phẳng tọa độ.',
        'Vận dụng hệ BPT bậc nhất hai ẩn giải bài toán quy hoạch tuyến tính (tìm cực trị lợi nhuận, chi phí).',
      ],
      [
        'Giá trị lượng giác từ 0° đến 180°; Định lí côsin, định lí sin, công thức diện tích tam giác',
        'Nhận biết giá trị lượng giác của các góc đặc biệt; công thức định lí sin, côsin, diện tích.',
        'Tính giá trị lượng giác, các cạnh, các góc và diện tích tam giác.',
        'Vận dụng giải tam giác vào bài toán đo đạc thực tế (đo chiều cao, khoảng cách không tới được).',
      ],
      [
        'Vectơ, tổng hiệu vectơ, tích vectơ với một số, tích vô hướng của hai vectơ',
        'Nhận biết vectơ cùng phương, cùng hướng, góc giữa hai vectơ, tích vô hướng.',
        'Tính độ dài vectơ, thực hiện phép toán vectơ; tính tích vô hướng hai vectơ.',
        'Vận dụng vectơ chứng minh ba điểm thẳng hàng, vuông góc, bài toán tổng hợp lực trong Vật lí.',
      ],
      [
        'Số trung bình, trung vị, mốt, khoảng biến thiên, khoảng tứ phân vị, độ lệch chuẩn',
        'Nhận biết các đại lượng đo xu thế trung tâm và độ đo độ phân tán của mẫu số liệu không ghép nhóm.',
        'Tính số trung bình, trung vị, mốt, tứ phân vị, phương sai, độ lệch chuẩn.',
        'Nhận xét, so sánh và đánh giá mức độ rủi ro, biến động của các tập dữ liệu thực tế.',
      ],
      [
        'Hàm số, đồ thị hàm số; Hàm số bậc hai, tam thức bậc hai và phương trình quy về bậc hai',
        'Nhận biết tập xác định, tính biến thiên của hàm số; đỉnh, trục đối xứng của parabol.',
        'Xét dấu tam thức bậc hai, giải BPT bậc hai; lập bảng biến thiên và vẽ đồ thị hàm số bậc hai.',
        'Vận dụng hàm số bậc hai giải bài toán quỹ đạo chuyển động, tối ưu hóa lợi nhuận.',
      ],
      [
        'Đường thẳng, đường tròn và ba đường conic (elip, parabol, hyperbol) trong mặt phẳng Oxy',
        'Nhận biết phương trình đường thẳng, đường tròn, elip, parabol, hyperbol.',
        'Lập phương trình đường thẳng, đường tròn; tính góc và khoảng cách từ điểm đến đường thẳng.',
        'Vận dụng phương pháp tọa độ giải bài toán thực tế gương phản xạ, thiết kế và vị trí vệ tinh.',
      ],
      [
        'Quy tắc cộng, quy tắc nhân; Hoán vị, chỉnh hợp, tổ hợp; Nhị thức Newton',
        'Nhận biết quy tắc đếm, công thức Pn, An^k, Cn^k và khai triển Nhị thức Newton.',
        'Tính số cách chọn, sắp xếp; tìm hệ số trong khai triển Nhị thức Newton.',
        'Vận dụng đại số tổ hợp giải bài toán đếm mã số, mật khẩu, xác suất thực tế.',
      ],
      [
        'Không gian mẫu, biến cố; Tính xác suất của biến cố theo định nghĩa cổ điển',
        'Nhận biết không gian mẫu, biến cố xung khắc, biến cố đối; công thức xác suất cổ điển.',
        'Xác định không gian mẫu và tính xác suất của các biến cố.',
        'Vận dụng xác suất đánh giá khả năng xảy ra của các sự kiện trong thực tế.',
      ],
    ],
    '11': [
      [
        'Góc lượng giác, giá trị lượng giác; Công thức lượng giác; Hàm số và phương trình lượng giác',
        'Nhận biết góc lượng giác, công thức cộng, nhân đôi, biến đổi; đồ thị hàm số lượng giác.',
        'Tính giá trị lượng giác, biến đổi biểu thức; giải phương trình lượng giác cơ bản.',
        'Vận dụng hàm số lượng giác mô phỏng hiện tượng dao động, sóng, thủy triều.',
      ],
      [
        'Dãy số, cấp số cộng, cấp số nhân',
        'Nhận biết dãy số, số hạng tổng quát, công sai, công bội, tổng n số hạng đầu của CSC, CSN.',
        'Tính số hạng, công sai, công bội, tổng n số hạng đầu tiên của cấp số cộng, cấp số nhân.',
        'Vận dụng CSC, CSN giải bài toán tài chính, lãi suất ngân hàng, bài toán tăng trưởng.',
      ],
      [
        'Số trung bình, nhóm chứa trung vị, nhóm chứa mốt của mẫu số liệu ghép nhóm',
        'Nhận biết nhóm chứa trung vị, mốt của mẫu số liệu ghép nhóm.',
        'Tính số trung bình, trung vị, mốt cho mẫu số liệu ghép nhóm.',
        'Phân tích, đánh giá xu hướng trung tâm của các tập dữ liệu lớn trong kinh tế - xã hội.',
      ],
      [
        'Đường thẳng và mặt phẳng trong không gian; Quan hệ song song trong không gian',
        'Nhận biết điểm, đường thẳng, mặt phẳng; các vị trí tương đối song song trong không gian.',
        'Chứng minh hai đường thẳng, đường với mặt, hai mặt phẳng song song; tìm giao tuyến, thiết diện.',
        'Vận dụng quan hệ song song biểu diễn hình không gian và giải bài toán kiến trúc.',
      ],
      [
        'Giới hạn của dãy số; Giới hạn của hàm số; Hàm số liên tục',
        'Nhận biết giới hạn cơ bản, khái niệm hàm số liên tục tại một điểm và trên một khoảng.',
        'Tính giới hạn của dãy số, hàm số; xét tính liên tục của hàm số.',
        'Vận dụng tính liên tục chứng minh phương trình có nghiệm trong khoảng cho trước.',
      ],
      [
        'Hàm số mũ và hàm số lôgarit; Phương trình, bất phương trình mũ và lôgarit',
        'Nhận biết tính chất lũy thừa, lôgarit; đồ thị hàm số mũ và lôgarit.',
        'Biến đổi biểu thức lũy thừa, lôgarit; giải phương trình, BPT mũ và lôgarit.',
        'Vận dụng hàm số mũ, lôgarit giải bài toán lãi đôi, tăng trưởng dân số, độ pH, độ chấn động.',
      ],
      [
        'Đường thẳng và mặt phẳng vuông góc; Khoảng cách và góc trong không gian',
        'Nhận biết hai đường thẳng vuông góc, đường thẳng vuông góc mặt phẳng, hai mặt phẳng vuông góc.',
        'Chứng minh quan hệ vuông góc; tính góc và khoảng cách trong không gian.',
        'Vận dụng khoảng cách và góc trong không gian giải bài toán đo đạc, xây dựng.',
      ],
      [
        'Biến cố độc lập; Quy tắc cộng và quy tắc nhân xác suất',
        'Nhận biết biến cố hợp, biến cố giao, hai biến cố độc lập.',
        'Tính xác suất bằng quy tắc cộng và quy tắc nhân xác suất.',
        'Vận dụng quy tắc xác suất đánh giá độ an toàn, xác suất thành công của hệ thống.',
      ],
      [
        'Đạo hàm, các quy tắc tính đạo hàm; Ý nghĩa hình học và vật lí của đạo hàm',
        'Nhận biết định nghĩa đạo hàm, quy tắc tính đạo hàm của hàm sơ cấp; ý nghĩa đạo hàm.',
        'Tính đạo hàm hàm số đa thức, lượng giác, mũ, lôgarit; lập phương trình tiếp tuyến.',
        'Vận dụng đạo hàm tính vận tốc, gia tốc tức thời trong chuyển động cơ học.',
      ],
    ],
    '12': [
      [
        'Khảo sát sự biến thiên và vẽ đồ thị hàm số (đơn điệu, cực trị, GTLN-GTNN, tiệm cận)',
        'Nhận biết khoảng đơn điệu, cực trị, tiệm cận đứng, tiệm cận ngang, tiệm cận xiên.',
        'Tìm cực trị, GTLN-GTNN, vẽ đồ thị hàm số bậc ba, nhất biến, hữu tỉ.',
        'Vận dụng đạo hàm và đồ thị giải bài toán tối ưu hóa diện tích, thể tích, chi phí sản xuất.',
      ],
      [
        'Vectơ và hệ trục tọa độ Oxyz trong không gian; Tích vô hướng, tích có hướng',
        'Nhận biết tọa độ điểm, vectơ, các phép toán vectơ, tích vô hướng, tích có hướng trong Oxyz.',
        'Tính tọa độ vectơ, độ dài, góc, tích có hướng của hai vectơ.',
        'Vận dụng vectơ Oxyz tính diện tích tam giác, thể tích khối tứ diện, kiểm tra đồng phẳng.',
      ],
      [
        'Phương sai, độ lệch chuẩn của mẫu số liệu ghép nhóm',
        'Nhận biết công thức phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.',
        'Tính phương sai, độ lệch chuẩn cho mẫu số liệu ghép nhóm.',
        'So sánh độ phân tán, độ ổn định của các tập dữ liệu trong nghiên cứu thực nghiệm.',
      ],
      [
        'Nguyên hàm, tích phân và ứng dụng tính diện tích hình phẳng, thể tích khối tròn xoay',
        'Nhận biết định nghĩa nguyên hàm, tích phân, tính chất và bảng nguyên hàm cơ bản.',
        'Tính tích phân bằng phương pháp đổi biến, tích phân từng phần; tính diện tích, thể tích.',
        'Vận dụng tích phân giải bài toán diện tích mặt cắt, thể tích vật thể, quãng đường chuyển động.',
      ],
      [
        'Phương pháp tọa độ trong không gian: Phương trình mặt phẳng, đường thẳng, mặt cầu',
        'Nhận biết véc tơ pháp tuyến, chỉ phương; phương trình mặt phẳng, đường thẳng, mặt cầu.',
        'Viết phương trình mặt phẳng, đường thẳng, mặt cầu; tính góc và khoảng cách.',
        'Vận dụng tọa độ Oxyz giải bài toán xác định vị trí công trình, vệ tinh, đường bay.',
      ],
      [
        'Công thức xác suất toàn phần và công thức Bayes',
        'Nhận biết công thức xác suất toàn phần và công thức Bayes.',
        'Tính xác suất điều kiện, xác suất toàn phần, áp dụng công thức Bayes.',
        'Vận dụng công thức Bayes trong chẩn đoán y học, đánh giá rủi ro tài chính, kiểm định chất lượng.',
      ],
    ],
  },
  'Vật lí': {
    '10': [
      [
        'Mở đầu: Đối tượng nghiên cứu Vật lí; An toàn phòng thí nghiệm; Sai số phép đo',
        'Nhận biết đối tượng, phương pháp nghiên cứu Vật lí, quy tắc an toàn thí nghiệm.',
        'Phân biệt sai số hệ thống và ngẫu nhiên; tính sai số tuyệt đối và tương đối.',
        'Vận dụng xử lí kết quả đo lường và sai số trong các bài thực hành Vật lí.',
      ],
      [
        'Động học: Độ dịch chuyển, vận tốc, gia tốc; Chuyển động thẳng biến đổi đều, rơi tự do, ném',
        'Nhận biết độ dịch chuyển, vận tốc, gia tốc, đặc điểm rơi tự do, chuyển động ném.',
        'Lập phương trình chuyển động, vẽ đồ thị d-t, v-t; tính vận tốc, gia tốc, quãng đường.',
        'Vận dụng công thức chuyển động biến đổi đều và chuyển động ném giải bài toán thực tế.',
      ],
      [
        'Động lực học: Ba định luật Newton; Các lực cơ bản; Khối lượng riêng, áp suất',
        'Nhận biết ba định luật Newton, khái niệm lực, khối lượng riêng, áp suất fluid.',
        'Phân tích và biểu diễn các lực; tính hợp lực, gia tốc, lực ma sát, áp suất.',
        'Vận dụng định luật Newton giải bài toán chuyển động của vật trên mặt phẳng ngang, nghiêng.',
      ],
      [
        'Công, công suất, năng lượng; Động năng, thế năng, định luật bảo toàn cơ năng',
        'Nhận biết khái niệm công, công suất, động năng, thế năng, cơ năng.',
        'Tính công của lực, công suất, động năng, thế năng; giải bài toán biến thiên năng lượng.',
        'Vận dụng định luật bảo toàn cơ năng giải bài toán chuyển động của vật, con lắc, trò chơi.',
      ],
      [
        'Động lượng, xung lượng của lực; Định luật bảo toàn động lượng, va chạm',
        'Nhận biết động lượng, xung lượng của lực, định luật bảo toàn động lượng.',
        'Tính động lượng, vận tốc các vật sau va chạm mềm, va chạm đàn hồi.',
        'Vận dụng định luật bảo toàn động lượng giải bài toán chuyển động bằng phản lực (tên lửa, súng).',
      ],
      [
        'Chuyển động tròn đều: Tốc độ góc, gia tốc hướng tâm, lực hướng tâm',
        'Nhận biết chu kì, tần số, tốc độ góc, gia tốc hướng tâm, lực hướng tâm.',
        'Tính tốc độ góc, gia tốc hướng tâm, lực hướng tâm cho vật chuyển động tròn.',
        'Vận dụng lực hướng tâm giải thích hiện tượng xe qua đường cong, chuyển động của vệ tinh.',
      ],
      [
        'Biến dạng của vật rắn, định luật Hooke; Momen lực, điều kiện cân bằng của vật rắn',
        'Nhận biết biến dạng kéo, nén, định luật Hooke, momen lực, quy tắc momen lực.',
        'Tính lực đàn hồi, độ biến dạng, momen lực; xác định điều kiện cân bằng của vật.',
        'Vận dụng quy tắc momen lực giải bài toán đòn đòn, cầu treo, cần cẩu cân bằng.',
      ],
    ],
    '11': [
      [
        'Dao động điều hòa: Mô tả dao động, các đại lượng (A, T, f, omega); Năng lượng dao động; Dao động tắt dần, cưỡng bức',
        'Nhận biết li độ, biên độ, chu kì, tần số, pha ban đầu, đồ thị dao động điều hòa.',
        'Viết phương trình dao động; tính động năng, thế năng, cơ năng; phân biệt dao động tắt dần, cưỡng bức.',
        'Vận dụng công thức dao động điều hòa giải bài toán con lắc đơn, con lắc lò xo, cộng hưởng.',
      ],
      [
        'Mô tả sóng, đặc trưng sóng; Sóng điện từ; Sóng dừng, giao thoa sóng',
        'Nhận biết sóng ngang, sóng dọc, bước sóng, tốc độ truyền sóng; sóng dừng, giao thoa.',
        'Tính bước sóng, tốc độ truyền sóng, vị trí cực đại cực tiểu giao thoa, nút sóng dừng.',
        'Vận dụng lý thuyết sóng giải bài toán đo tốc độ truyền âm, sóng dừng trên dây đàn.',
      ],
      [
        'Điện trường, cường độ điện trường; Thế năng điện, điện thế, hiệu điện thế; Tụ điện',
        'Nhận biết định luật Coulomb, điện trường, cường độ điện trường, điện thế, tụ điện.',
        'Tính lực tương tác Coulomb, cường độ điện trường, công lực điện, điện dung.',
        'Vận dụng lý thuyết điện trường giải bài toán hạt mang điện chuyển động trong điện trường.',
      ],
      [
        'Dòng điện, điện trở, định luật Ohm; Suất điện động; Mạch điện một chiều, công suất điện',
        'Nhận biết dòng điện, điện trở, định luật Ohm, suất điện động của nguồn.',
        'Tính điện trở tương đương, cường độ dòng điện trong mạch hỗn hợp, điện năng tiêu thụ.',
        'Vận dụng định luật Ohm cho toàn mạch tính toán, thiết kế mạch điện an toàn.',
      ],
    ],
    '12': [
      [
        'Mô hình động học phân tử chất khí; Phương trình trạng thái khí lí tưởng; Nội năng, định luật 1 nhiệt động lực học',
        'Nhận biết các trạng thái chất, định luật Boyle, Charles, phương trình trạng thái khí lí tưởng.',
        'Giải phương trình trạng thái khí lí tưởng; tính công, nhiệt lượng, độ biến thiên nội năng.',
        'Vận dụng định luật nhiệt động lực học giải thích nguyên lí hoạt động động cơ nhiệt, máy lạnh.',
      ],
      [
        'Nhiệt độ, thang nhiệt độ; Nhiệt dung riêng, nhiệt nóng chảy riêng, nhiệt hóa hơi riêng',
        'Nhận biết thang Kelvin, Celsius; khái niệm nhiệt dung riêng, nhiệt nóng chảy, nhiệt hóa hơi.',
        'Tính nhiệt lượng thu vào, tỏa ra trong quá trình truyền nhiệt và chuyển thể.',
        'Vận dụng công thức tính nhiệt lượng giải bài toán cân bằng nhiệt trong thực nghiệm.',
      ],
      [
        'Từ trường, lực từ, cảm ứng từ; Hiện tượng cảm ứng điện từ, định luật Faraday, định luật Lenz',
        'Nhận biết từ trường, cảm ứng từ, quy tắc bàn tay trái, bàn tay phải; từ thông, suất điện động cảm ứng.',
        'Tính lực từ, từ thông, suất điện động cảm ứng xuất hiện trong khung dây.',
        'Vận dụng hiện tượng cảm ứng điện từ giải thích nguyên lí máy phát điện, máy biến áp, bếp từ.',
      ],
      [
        'Cấu tạo hạt nhân, năng lượng liên kết; Hiện tượng phóng xạ, định luật phóng xạ; Phản ứng phân hạch, nhiệt hạch',
        'Nhận biết cấu tạo hạt nhân, kí hiệu, độ hụt khối, năng lượng liên kết, chu kì bán rã.',
        'Tính độ hụt khối, năng lượng liên kết, khối lượng còn lại sau thời gian t phóng xạ.',
        'Vận dụng định luật phóng xạ định tuổi cổ vật, ứng dụng y học hạt nhân và năng lượng nguyên tử.',
      ],
    ],
  },
  'Hóa học': {
    '10': [
      [
        'Cấu tạo nguyên tử: Thành phần nguyên tử, hạt nhân, nguyên tố hóa học, đồng vị, cấu hình electron',
        'Nhận biết số p, n, e, số hiệu nguyên tử, khái niệm đồng vị, obitan nguyên tử.',
        'Viết cấu hình electron nguyên tử, ion; tính khối lượng nguyên tử trung bình.',
        'Vận dụng cấu hình electron dự đoán tính chất hóa học cơ bản của nguyên tố.',
      ],
      [
        'Bảng tuần hoàn các nguyên tố hóa học: Cấu trúc bảng tuần hoàn, quy luật biến đổi tính chất',
        'Nhận biết ô, chu kì, nhóm A, nhóm B; quy luật biến đổi bán kính, độ âm điện.',
        'Giải thích sự biến đổi tính kim loại, phi kim, tính acid-base của oxide, hydroxide.',
        'Vận dụng vị trí nguyên tố suy ra cấu hình electron và so sánh tính chất với nguyên tố khác.',
      ],
      [
        'Liên kết hóa học: Liên kết ionic, liên kết covalent, liên kết hydrogen và tương tác van der Waals',
        'Nhận biết sự hình thành ion, liên kết ion, liên kết cộng hóa trị, liên kết hydrogen.',
        'Biểu diễn công thức electron, công thức Lewis, công thức cấu tạo của phân tử.',
        'Giải thích nhiệt độ sôi, nhiệt độ nóng chảy, độ tan dựa trên loại liên kết hóa học.',
      ],
      [
        'Phản ứng oxi hóa - khử: Số oxi hóa, cân bằng phản ứng bằng phương pháp thăng bằng electron',
        'Nhận biết chất khử, chất oxi hóa, quá trình khử, quá trình oxi hóa, số oxi hóa.',
        'Cân bằng phản ứng oxi hóa - khử bằng phương pháp thăng bằng electron.',
        'Vận dụng phản ứng oxi hóa - khử giải thích sự ăn mòn kim loại, quá trình cháy, sản xuất.',
      ],
      [
        'Năng lượng hóa học: Phản ứng tỏa nhiệt, thu nhiệt; Biến thiên enthalpy chuẩn của phản ứng',
        'Nhận biết phản ứng tỏa nhiệt, thu nhiệt, biến thiên enthalpy chuẩn.',
        'Tính biến thiên enthalpy của phản ứng dựa trên nhiệt tạo thành chuẩn hoặc năng lượng liên kết.',
        'Vận dụng biến thiên enthalpy đánh giá hiệu quả nhiên liệu và độ an toàn của phản ứng.',
      ],
      [
        'Tốc độ phản ứng hóa học: Khái niệm, các yếu tố ảnh hưởng đến tốc độ phản ứng',
        'Nhận biết khái niệm tốc độ phản ứng, các yếu tố ảnh hưởng (nồng độ, nhiệt độ, áp suất, diện tích tiếp xúc, xúc tác).',
        'Tính tốc độ trung bình của phản ứng; tính hệ số nhiệt độ van t Hoff.',
        'Vận dụng các yếu tố ảnh hưởng tốc độ phản ứng vào bảo quản thực phẩm, sản xuất công nghiệp.',
      ],
      [
        'Nguyên tố nhóm VIIA (Halogen): Đơn chất halogen, hydrogen halide và hydrohalic acid',
        'Nhận biết vị trí, cấu hình electron, tính chất vật lí, hóa học của các halogen.',
        'Viết phương trình hóa học chứng minh tính oxi hóa giảm dần từ F2 đến I2; tính chất của HCl.',
        'Vận dụng phản ứng phân biệt các ion halide (F-, Cl-, Br-, I-) và bài toán tính toán.',
      ],
    ],
    '11': [
      [
        'Cân bằng hóa học: Khái niệm, hằng số cân bằng Kc, các yếu tố chuyển dịch cân bằng',
        'Nhận biết phản ứng thuận nghịch, trạng thái cân bằng hóa học, hằng số Kc.',
        'Giải thích sự chuyển dịch cân bằng theo nguyên lí Le Chatelier; tính Kc, nồng độ cân bằng.',
        'Vận dụng nguyên lí chuyển dịch cân bằng tối ưu hóa hiệu suất tổng hợp NH3, SO3 trong công nghiệp.',
      ],
      [
        'Nitrogen và sulfur: N2, NH3, muối ammonium, HNO3; S, H2S, SO2, H2SO4',
        'Nhận biết tính chất vật lí, hóa học của nitrogen, ammonia, nitric acid, sulfur, sulfuric acid.',
        'Viết phương trình phản ứng thể hiện tính oxi hóa của HNO3, H2SO4 đặc; tính khử của NH3, SO2.',
        'Vận dụng kiến thức nitric acid, sulfuric acid giải bài toán hóa học và biện pháp giảm mưa acid.',
      ],
      [
        'Đại cương về hóa học hữu cơ: Công thức phân tử, công thức cấu tạo, đồng đẳng, đồng phân',
        'Nhận biết đặc điểm hợp chất hữu cơ, nhóm chức, khái niệm đồng đẳng, đồng phân.',
        'Xác định CTPT từ kết quả phân tích nguyên tố, phổ MS; viết các đồng phân cấu tạo.',
        'Vận dụng các phương pháp tách tinh chế (chưng cất, chiết, kết tinh) trong thực tiễn.',
      ],
      [
        'Hydrocarbon: Alkane, alkene, alkyne, arene (benzene, toluene)',
        'Nhận biết danh pháp, tính chất vật lí, hóa học cơ bản của alkane, alkene, alkyne, arene.',
        'Viết phản ứng thế, cộng, trùng hợp, oxi hóa của các hydrocarbon.',
        'Vận dụng hydrocarbon làm nhiên liệu, nguyên liệu tổng hợp polymer, xử lí ô nhiễm xăng dầu.',
      ],
      [
        'Dẫn xuất halogen - alcohol - phenol: Cấu trúc, tính chất hóa học và ứng dụng',
        'Nhận biết công thức, nhóm chức, tính chất vật lí, hóa học của alcohol, phenol, dẫn xuất halogen.',
        'Viết phương trình phản ứng thế, tách nước của alcohol; tính acid của phenol.',
        'Vận dụng alcohol, phenol trong y tế, sản xuất chất dẻo, dược phẩm và tác hại của cồn.',
      ],
      [
        'Hợp chất carbonyl (aldehyde, ketone) - carboxylic acid',
        'Nhận biết nhóm carbonyl, nhóm carboxyl; danh pháp, tính chất của aldehyde, ketone, acid.',
        'Viết phương trình phản ứng tráng bạc của aldehyde, phản ứng ester hóa của carboxylic acid.',
        'Vận dụng aldehyde, carboxylic acid trong bảo quản mẫu vật, sản xuất giấm ăn, mỹ phẩm.',
      ],
    ],
    '12': [
      [
        'Ester - lipid: Cấu tạo, tính chất hóa học (thủy phân acid, xà phòng hóa), ứng dụng, xà phòng và chất giặt rửa',
        'Nhận biết khái niệm ester, chất béo, xà phòng, chất giặt rửa tổng hợp.',
        'Viết phương trình phản ứng thủy phân ester trong môi trường acid và kiềm (xà phòng hóa).',
        'Vận dụng tính toán chỉ số xà phòng hóa, chuyển hóa chất béo và sử dụng xà phòng an toàn.',
      ],
      [
        'Carbohydrate: Monosaccharide (glucose, fructose), disaccharide (saccharose), polysaccharide (tinh bột, cellulose)',
        'Nhận biết cấu tạo dạng mạch hở, mạch vòng, tính chất vật lí, trạng thái tự nhiên của các carbohydrate.',
        'Viết phương trình phản ứng tráng bạc, lên men glucose, thủy phân tinh bột, cellulose.',
        'Vận dụng carbohydrate trong dinh dưỡng, sản xuất ethanol sinh học, tơ nhân tạo.',
      ],
      [
        'Hợp chất chứa nitrogen: Amine, amino acid, peptide và protein',
        'Nhận biết nhóm chức amine, amino acid, liên kết peptide, cấu trúc protein.',
        'Viết phương trình tính base của amine, tính lưỡng tính của amino acid, phản ứng màu biuret.',
        'Vận dụng amino acid, protein trong chế độ dinh dưỡng, sản xuất mì chính, tơ tằm.',
      ],
      [
        'Polymer: Khái niệm, phân loại, chất dẻo, tơ, cao su, keo dán tổng hợp',
        'Nhận biết khái niệm monomer, polymer, hệ số trùng hợp; phân loại polymer.',
        'Viết phản ứng trùng hợp, trùng ngưng tạo tơ nilon, PE, PVC, cao su buna.',
        'Vận dụng hiểu biết về polymer trong sử dụng đồ nhựa an toàn và tái chế rác thải nhựa.',
      ],
      [
        'Pin điện và điện phân: Cặp thế điện cực chuẩn, suất điện động của pin; Điện phân dung dịch, nóng chảy',
        'Nhận biết thế điện cực chuẩn, cấu tạo pin điện hóa, hiện tượng điện phân.',
        'Tính suất điện động của pin; viết phương trình phản ứng xảy ra tại cathode, anode khi điện phân.',
        'Vận dụng định luật Faraday giải bài toán điện phân và ứng dụng mạ điện, tinh chế kim loại.',
      ],
      [
        'Đại cương về kim loại: Tính chất vật lí, hóa học; Dãy điện hóa; Ăn mòn kim loại và phương pháp điều chế',
        'Nhận biết liên kết kim loại, tính chất vật lí chung, vị trí kim loại trong dãy điện hóa.',
        'Viết phản ứng của kim loại với phi kim, acid, dung dịch muối; phân biệt ăn mòn hóa học và điện hóa.',
        'Vận dụng các phương pháp bảo vệ kim loại khỏi ăn mòn và các phương pháp điều chế kim loại.',
      ],
      [
        'Nguyên tố nhóm IA và nhóm IIA: Đơn chất và hợp chất quan trọng (Na, K, Ca, Mg)',
        'Nhận biết vị trí, cấu hình electron, tính chất của kim loại kiềm, kiềm thổ và hợp chất.',
        'Viết phương trình phản ứng của Na, K, Ca với H2O, acid; tính chất nước cứng và phương pháp làm mềm.',
        'Vận dụng kiến thức làm mềm nước cứng trong sinh hoạt và sản xuất công nghiệp.',
      ],
      [
        'Sơ lược kim loại chuyển tiếp dãy thứ nhất (Fe, Cu, Cr) và phức chất cơ bản',
        'Nhận biết vị trí, cấu hình electron của Fe, Cu, Cr; khái niệm phức chất và phối tử.',
        'Viết phương trình phản ứng của Fe, Cu với acid, muối; phản ứng tạo phức chất đặc trưng.',
        'Vận dụng hợp kim của sắt (gang, thép) trong xây dựng, cơ khí và nhận biết ion kim loại.',
      ],
    ],
  },
  'Sinh học': {
    '10': [
      [
        'Giới thiệu chung về Sinh học: Các cấp tổ chức của thế giới sống; Phương pháp nghiên cứu Sinh học',
        'Nhận biết các cấp tổ chức sống, các đặc tính chung của thế giới sống.',
        'Phân biệt các cấp tổ chức sống; nêu được các phương pháp nghiên cứu và thực nghiệm sinh học.',
        'Vận dụng kiến thức sinh học giải thích hiện tượng sống thực tế và định hướng nghề nghiệp.',
      ],
      [
        'Thành phần hóa học của tế bào: Các nguyên tố hóa học, nước và các đại phân tử sinh học (carbohydrate, lipid, protein, nucleic acid)',
        'Nhận biết vai trò của nguyên tố đại lượng, vi lượng, nước và các đại phân tử sinh học.',
        'Trình bày cấu trúc và chức năng của carbohydrate, lipid, protein, ADN, ARN.',
        'Vận dụng hiểu biết về đại phân tử sinh học vào chế độ dinh dưỡng, bảo quản thực phẩm.',
      ],
      [
        'Cấu trúc tế bào: Tế bào nhân sơ và tế bào nhân thực (nhân, các bào quan, màng sinh chất, thành tế bào)',
        'Nhận biết cấu tạo tế bào nhân sơ, nhân thực; tên gọi và hình dạng các bào quan.',
        'Phân biệt tế bào nhân sơ và nhân thực, tế bào thực vật và động vật; chức năng các bào quan.',
        'Giải thích cơ chế vận chuyển chất qua màng sinh chất (thẩm thấu, biến hình, chủ động).',
      ],
      [
        'Trao đổi chất và chuyển hóa năng lượng ở tế bào: Vận chuyển các chất; ATP và enzyme; Quang hợp và hô hấp tế bào',
        'Nhận biết khái niệm ATP, enzyme, quang hợp, hô hấp tế bào.',
        'Giải thích cơ chế tác dụng của enzyme, các giai đoạn hô hấp tế bào và quang hợp.',
        'Vận dụng yếu tố ảnh hưởng đến enzyme, quang hợp để bảo quản nông sản, tăng năng suất cây trồng.',
      ],
      [
        'Thông tin ở tế bào; Chu kì tế bào, nguyên phân và giảm phân; Bệnh ung thư',
        'Nhận biết các giai đoạn truyền thông tin tế bào, các kì của nguyên phân, giảm phân.',
        'Phân biệt nguyên phân và giảm phân; giải thích ý nghĩa di truyền của nguyên phân, giảm phân, thụ tinh.',
        'Vận dụng hiểu biết chu kì tế bào giải thích cơ chế phát sinh ung thư và biện pháp phòng tránh.',
      ],
      [
        'Vi sinh vật và virus: Dinh dưỡng, sinh trưởng ở vi sinh vật; Cấu tạo, quá trình nhân lên của virus và ứng dụng',
        'Nhận biết các kiểu dinh dưỡng, các hình thức sinh sản của vi sinh vật; cấu tạo virus.',
        'Giải thích các giai đoạn nhân lên của virus trong tế bào chủ, cơ chế gây bệnh vi sinh vật.',
        'Vận dụng vi sinh vật làm men, muối chua, sản xuất kháng sinh; phòng chống dịch bệnh do virus.',
      ],
    ],
    '11': [
      [
        'Trao đổi chất và chuyển hóa năng lượng ở sinh vật: Quang hợp, hô hấp ở thực vật; Dinh dưỡng, tiêu hóa, tuần hoàn, hô hấp ở động vật',
        'Nhận biết các cơ quan trao đổi chất ở thực vật và động vật; khái niệm quang hợp, hô hấp, tuần hoàn.',
        'Giải thích cơ chế hấp thụ nước, khoáng, quang hợp C3, C4, CAM; cơ chế tiêu hóa, hô hấp, tuần hoàn.',
        'Vận dụng kiến thức trao đổi chất thiết kế chế độ ăn uống, tập luyện, tưới nước bón phân hợp lí.',
      ],
      [
        'Cảm ứng ở sinh vật: Cảm ứng ở thực vật (hướng động, ứng động); Cảm ứng ở động vật (hệ thần kinh, tập tính)',
        'Nhận biết các dạng hướng động, ứng động ở thực vật; các dạng hệ thần kinh, tập tính động vật.',
        'Giải thích cơ chế cảm ứng ở thực vật, lan truyền xung thần kinh, phản xạ và tập tính động vật.',
        'Vận dụng cảm ứng thực vật trong trồng trọt; ứng dụng tập tính động vật trong chăn nuôi, huấn luyện.',
      ],
      [
        'Cân bằng nội môi và hệ miễn dịch ở động vật',
        'Nhận biết khái niệm nội môi, cân bằng nội môi, các cơ quan tham gia duy trì cân bằng.',
        'Giải thích cơ chế duy trì huyết áp, đường huyết, pH máu; cơ chế miễn dịch dịch thể và tế bào.',
        'Vận dụng kiến thức cân bằng nội môi phòng ngừa bệnh tiểu đường, cao huyết áp, tiêm vắc xin.',
      ],
      [
        'Sinh trưởng và phát triển ở sinh vật: Sinh trưởng ở thực vật; Sinh trưởng, phát triển và biến thái ở động vật',
        'Nhận biết mô phân sinh, sinh trưởng sơ cấp, thứ cấp; các giai đoạn phát triển, biến thái ở động vật.',
        'Phân biệt sinh trưởng sơ cấp và thứ cấp; phát triển không qua biến thái và qua biến thái.',
        'Vận dụng hormone sinh trưởng điều khiển ra hoa, đậu quả, tiêu diệt sâu hại bằng biện pháp sinh học.',
      ],
      [
        'Sinh sản ở sinh vật: Sinh sản vô tính, sinh sản hữu tính ở thực vật và động vật; Điều khiển sinh sản',
        'Nhận biết các hình thức sinh sản vô tính, hữu tính ở thực vật, động vật; thụ tinh đôi.',
        'Giải thích bản chất di truyền của sinh sản vô tính, hữu tính; cơ chế điều hòa sinh sản.',
        'Vận dụng các phương pháp nhân giống vô tính (giâm, chiết, ghép, nuôi cấy mô), sinh sản có kế hoạch.',
      ],
    ],
    '12': [
      [
        'Gene, mã di truyền, quá trình nhân đôi ADN, phiên mã, dịch mã; Điều hòa hoạt động gene; Đột biến gene',
        'Nhận biết cấu trúc gene, đặc điểm mã di truyền, các giai đoạn nhân đôi ADN, phiên mã, dịch mã, đột biến gene.',
        'Giải thích cơ chế nhân đôi, phiên mã, dịch mã, mô hình operon Lac, nguyên nhân đột biến gene.',
        'Vận dụng giải bài toán di truyền molecular (tính số nu, amino acid, số liên kết hydrogen).',
      ],
      [
        'Nhiễm sắc thể, đột biến cấu trúc và số lượng nhiễm sắc thể; Di truyền Mendelian, tương tác gene, di truyền liên kết, hoán vị gene, di truyền liên kết giới tính',
        'Nhận biết cấu trúc NST, các dạng đột biến NST, quy luật di truyền Mendelian, liên kết, hoán vị gene.',
        'Giải thích cơ chế hình thành đột biến NST; phân tích kết quả phép lai di truyền.',
        'Vận dụng quy luật di truyền xác định kiểu gen, kiểu hình, xác suất trong phép lai.',
      ],
      [
        'Di truyền học quần thể: Cấu trúc di truyền của quần thể tự phối, ngẫu phối; Định luật Hardy-Weinberg',
        'Nhận biết tần số allele, tần số kiểu gen, đặc điểm quần thể tự phối, ngẫu phối, định luật Hardy-Weinberg.',
        'Tính tần số allele và cấu trúc di truyền của quần thể qua các thế hệ.',
        'Vận dụng định luật Hardy-Weinberg đánh giá trạng thái cân bằng di truyền của quần thể.',
      ],
      [
        'Di truyền học người, di truyền y học, ứng dụng di truyền học trong chọn giống và công nghệ sinh học',
        'Nhận biết phương pháp nghiên cứu di truyền người, một số bệnh di truyền phân tử, hội chứng NST.',
        'Phân tích sơ đồ phả hệ để xác định quy luật di truyền bệnh ở người.',
        'Vận dụng tư vấn di truyền, liệu pháp gene, tạo giống cây trồng, vật nuôi bằng công nghệ gene.',
      ],
      [
        'Tiến hóa: Bằng chứng tiến hóa; Các thuyết tiến hóa; Nhân tố tiến hóa; Quá trình hình thành loài và nguồn gốc loài người',
        'Nhận biết bằng chứng giải phẫu so sánh, di truyền; các nhân tố tiến hóa (đột biến, di-nhập gene, chọn lọc tự nhiên...).',
        'Giải thích vai trò của các nhân tố tiến hóa trong việc làm thay đổi tần số allele và cấu trúc di truyền.',
        'Vận dụng lý thuyết tiến hóa giải thích sự thích nghi của sinh vật và đa dạng sinh học.',
      ],
      [
        'Sinh thái học: Môi trường và các nhân tố sinh thái; Quần thể sinh thái; Quần xã sinh thái; Hệ sinh thái, chuỗi thức ăn và bảo vệ môi trường',
        'Nhận biết khái niệm nhân tố sinh thái, giới hạn sinh thái, đặc trưng quần thể, quần xã, hệ sinh thái.',
        'Giải thích quan hệ giữa các cá thể, diễn thế sinh thái, dòng năng lượng và chu trình vật chất.',
        'Vận dụng kiến thức sinh thái học vào quản lí tài nguyên, nông nghiệp sinh thái, bảo vệ môi trường.',
      ],
    ],
  },
  'Lịch sử': {
    '10': [
      [
        'Bài 1. Hiện thực lịch sử và nhận thức lịch sử\nBài 2. Tri thức lịch sử và cuộc sống\nBài 3. Sử học với các lĩnh vực khoa học khác\nBài 4. Sử học với một số lĩnh vực, ngành nghề hiện đại',
        'Nhận biết đối tượng, chức năng, nhiệm vụ của Sử học; các nguồn sử liệu; vai trò của tri thức lịch sử và di sản.',
        'Giải thích mối quan hệ giữa Lịch sử và Sử học; phân tích vai trò của Sử học đối với các ngành khoa học và đời sống.',
        'Vận dụng kiến thức lịch sử giải thích hiện tượng xã hội, liên hệ thực tế và đề xuất giải pháp bảo tồn di sản văn hóa.',
      ],
      [
        'Bài 5. Khái niệm văn minh. Văn minh phương Đông thời kì cổ - trung đại\nBài 6. Một số nền văn minh phương Tây thời kì cổ - trung đại',
        'Nhận biết cơ sở hình thành, các thành tựu chủ yếu của các nền văn minh Ai Cập, Ấn Độ, Trung Hoa, Hy Lạp - La Mã.',
        'Phân tích ý nghĩa và đóng góp của các thành tựu văn minh cổ - trung đại đối với nhân loại.',
        'Vận dụng liên hệ ảnh hưởng của văn minh Trung Hoa, Ấn Độ đến văn hóa Việt Nam.',
      ],
      [
        'Bài 7. Các cuộc cách mạng công nghiệp thời kì hiện đại\nBài 8. Tác động của các cuộc cách mạng công nghiệp',
        'Nhận biết bối cảnh lịch sử, những thành tựu cơ bản của các cuộc cách mạng công nghiệp.',
        'Phân tích tác động của các cuộc cách mạng công nghiệp đối với kinh tế, xã hội, văn hóa thế giới.',
        'Liên hệ bối cảnh cuộc Cách mạng công nghiệp 4.0 đối với học tập và đời sống hiện nay.',
      ],
      [
        'Bài 9. Hành trình phát triển và thành tựu của văn minh Đông Nam Á',
        'Nhận biết vị trí địa lí, cơ sở hình thành và các giai đoạn phát triển của văn minh Đông Nam Á.',
        'Giải thích các thành tựu tiêu biểu về kiến trúc, điêu khắc, tín ngưỡng, chữ viết của Đông Nam Á.',
        'Đánh giá giá trị di sản văn hóa Đông Nam Á và sự giao lưu văn hóa với Việt Nam.',
      ],
      [
        'Bài 10. Văn minh Văn Lang - Âu Lạc\nBài 11. Văn minh Chăm-pa và Phù Nam\nBài 12. Văn minh Đại Việt',
        'Nhận biết cơ sở hình thành, thành tựu đời sống vật chất, tinh thần của văn minh Văn Lang - Âu Lạc, Chăm-pa, Phù Nam, Đại Việt.',
        'Phân tích sự kế thừa, phát triển và đặc trưng nổi bật của văn minh Đại Việt qua các thời kì.',
        'Vận dụng kiến thức lịch sử đánh giá giá trị di sản văn hóa dân tộc và trách nhiệm bảo tồn.',
      ],
      [
        'Bài 13. Cộng đồng các dân tộc Việt Nam',
        'Nhận biết các thành phần dân tộc, họ ngôn ngữ, đặc điểm văn hóa truyền thống các dân tộc.',
        'Giải thích mối quan hệ đoàn kết, gắn bó giữa các dân tộc trong lịch sử dựng nước và giữ nước.',
        'Vận dụng tinh thần đại đoàn kết dân tộc trong xây dựng và bảo vệ Tổ quốc hiện nay.',
      ],
    ],
    '11': [
      [
        'Bài 1. Một số vấn đề chung về cách mạng tư sản\nBài 2. Sự phát triển của chủ nghĩa tư bản',
        'Nhận biết tiền đề kinh tế, chính trị, tư tưởng của các cuộc cách mạng tư sản bối cảnh thế giới.',
        'Phân tích mục tiêu, nhiệm vụ, động lực, giai cấp lãnh đạo và ý nghĩa của các cuộc cách mạng tư sản.',
        'Rút ra đặc điểm chung và bài học lịch sử từ các cuộc cách mạng tư sản.',
      ],
      [
        'Bài 3. Sự hình thành và phát triển của chủ nghĩa xã hội\nBài 4. Chủ nghĩa xã hội từ năm 1991 đến nay',
        'Nhận biết sự ra đời của Liên Xô, sự mở rộng chủ nghĩa xã hội sau Chiến tranh thế giới thứ hai.',
        'Giải thích nguyên nhân khủng hoảng, sụp đổ của mô hình CNXH ở Liên Xô và Đông Âu; thành tựu đổi mới ở Trung Quốc, Việt Nam.',
        'Đánh giá sức sống và triển vọng của chủ nghĩa xã hội trong thời đại ngày nay.',
      ],
      [
        'Bài 5. Quá trình xâm lược và đô hộ của chủ nghĩa thực dân ở Đông Nam Á\nBài 6. Hành trình giành độc lập dân tộc ở Đông Nam Á',
        'Nhận biết các giai đoạn xâm lược của chủ nghĩa thực dân và phong trào đấu tranh giành độc lập ở Đông Nam Á.',
        'Phân tích hình thức, đặc điểm, nguyên nhân thắng lợi của phong trào giải phóng dân tộc ở Đông Nam Á.',
        'Liên hệ phong trào giải phóng dân tộc ở Đông Nam Á với cách mạng Việt Nam.',
      ],
      [
        'Bài 7. Khái quát về chiến tranh bảo vệ Tổ quốc trong lịch sử Việt Nam\nBài 8. Một số cuộc kháng chiến thắng lợi tiêu biểu\nBài 9. Một số cuộc kháng chiến không thành công',
        'Nhận biết các cuộc kháng chiến chống ngoại xâm tiêu biểu trong lịch sử dựng nước và giữ nước của dân tộc Việt Nam.',
        'Phân tích nguyên nhân thắng lợi, nguyên nhân không thành công và bài học kinh nghiệm của các cuộc chiến tranh bảo vệ Tổ quốc.',
        'Vận dụng bài học lịch sử dựng nước và giữ nước vào công cuộc bảo vệ chủ quyền quốc gia hiện nay.',
      ],
      [
        'Bài 10. Cuộc cải cách của Hồ Quý Ly và triều Hồ\nBài 11. Cuộc cải cách của Lê Thánh Tông\nBài 12. Cuộc cải cách của Minh Mạng',
        'Nhận biết bối cảnh, nội dung cốt lõi của các cuộc cải cách của Hồ Quý Ly, Lê Thánh Tông, Minh Mạng.',
        'Phân tích kết quả, ý nghĩa và bài học kinh nghiệm của các cuộc cải cách trong lịch sử phong kiến Việt Nam.',
        'Đánh giá giá trị của các cuộc cải cách lịch sử đối với công cuộc đổi mới, cải cách hành chính hiện nay.',
      ],
      [
        'Bài 13. Vị trí chiến lược và lịch sử bảo vệ chủ quyền ở Biển Đông',
        'Nhận biết vị trí chiến lược của Biển Đông và quần đảo Hoàng Sa, Trường Sa; quá trình xác lập chủ quyền của Việt Nam.',
        'Giải thích tầm quan trọng của Biển Đông về kinh tế, quốc phòng, an ninh và cơ sở pháp lí khẳng định chủ quyền của Việt Nam.',
        'Thể hiện trách nhiệm của học sinh trong việc tham gia bảo vệ chủ quyền biển đảo thiêng liêng của Tổ quốc.',
      ],
    ],
    '12': [
      [
        'Bài 1. Liên Hợp Quốc\nBài 2. Trật tự thế giới trong và sau Chiến tranh lạnh',
        'Nhận biết sự hình thành trật tự hai cực Ianta, vai trò của Liên Hợp Quốc, các giai đoạn Chiến tranh lạnh.',
        'Phân tích nguyên nhân chấm dứt Chiến tranh lạnh và xu thế phát triển của thế giới đa cực hiện nay.',
        'Đánh giá thời cơ, thách thức đối với Việt Nam trong bối cảnh thế giới đa cực, hội nhập quốc tế.',
      ],
      [
        'Bài 3. Sự thành lập và phát triển của ASEAN\nBài 4. Cộng đồng ASEAN: Từ ý tưởng đến hiện thực',
        'Nhận biết bối cảnh thành lập, mục tiêu, các mốc phát triển chính của ASEAN và sự ra đời của Cộng đồng ASEAN.',
        'Phân tích vai trò của ASEAN đối với khu vực Đông Nam Á và mối quan hệ hợp tác giữa Việt Nam với ASEAN.',
        'Đánh giá vị thế của Việt Nam trong Cộng đồng ASEAN và trách nhiệm công dân ASEAN.',
      ],
      [
        'Bài 5. Cách mạng tháng Tám năm 1945\nBài 6. Cuộc kháng chiến chống thực dân Pháp (1945 - 1954)',
        'Nhận biết diễn biến Cách mạng tháng Tám 1945, các chiến dịch Việt Bắc, Biên giới, Điện Biên Phủ.',
        'Phân tích nguyên nhân thắng lợi, ý nghĩa lịch sử của Cách mạng tháng Tám và cuộc kháng chiến chống Pháp.',
        'Rút ra bài học kinh nghiệm về chớp thời cơ, đường lối kháng chiến toàn dân, toàn diện.',
      ],
      [
        'Bài 7. Cuộc kháng chiến chống Mỹ, cứu nước (1954 - 1975)\nBài 8. Đấu tranh bảo vệ Tổ quốc từ sau năm 1975',
        'Nhận biết các chiến lược chiến tranh của Mỹ và các chiến công tiêu biểu (Mậu Thân 1968, Điện Biên Phủ trên không, Tổng tiến công Mùa Xuân 1975).',
        'Phân tích nguyên nhân thắng lợi, ý nghĩa lịch sử của cuộc kháng chiến chống Mỹ, cứu nước và bảo vệ biên giới.',
        'Đánh giá tầm vóc thời đại và bài học kinh nghiệm về kết hợp sức mạnh dân tộc với sức mạnh thời đại.',
      ],
      [
        'Bài 9. Đổi mới ở Việt Nam từ năm 1986 đến nay\nBài 10. Thành tựu của công cuộc Đổi mới',
        'Nhận biết đường lối Đổi mới của Đảng, các thành tựu kinh tế, xã hội, văn hóa nổi bật từ năm 1986 đến nay.',
        'Phân tích nguyên nhân thành công, ý nghĩa lịch sử của công cuộc Đổi mới đất nước.',
        'Vận dụng bài học công cuộc Đổi mới vào công cuộc công nghiệp hóa, hiện đại hóa đất nước hiện nay.',
      ],
      [
        'Bài 11. Lịch sử đối ngoại Việt Nam thời kì hiện đại\nBài 12. Thành tựu đối ngoại và vai trò của Chủ tịch Hồ Chí Minh',
        'Nhận biết các giai đoạn phát triển của đối ngoại Việt Nam thời kì hiện đại và vai trò của Chủ tịch Hồ Chí Minh.',
        'Phân tích đường lối ngoại giao cây tre Việt Nam, đóng góp của ngoại giao vào sự nghiệp giải phóng dân tộc và phát triển đất nước.',
        'Đánh giá di sản tư tưởng ngoại giao Hồ Chí Minh và đường lối đối ngoại độc lập, tự chủ hiện nay.',
      ],
    ],
  },
  'Giáo dục kinh tế và pháp luật': {
    '10': [
      [
        'Nền kinh tế và các chủ thể của nền kinh tế; Cơ chế thị trường; Ngân sách nhà nước và thuế',
        'Nhận biết các hoạt động kinh tế cơ bản, vai trò các chủ thể; khái niệm cơ chế thị trường, thuế.',
        'Giải thích ưu điểm, hạn chế của cơ chế thị trường; vai trò của ngân sách nhà nước và nghĩa vụ nộp thuế.',
        'Vận dụng kiến thức tham gia hoạt động kinh tế phù hợp và thực hiện nghiêm túc nghĩa vụ nộp thuế.',
      ],
      [
        'Sản xuất kinh doanh và các hình thức doanh nghiệp; Dịch vụ tín dụng và kế hoạch tài chính cá nhân',
        'Nhận biết các mô hình sản xuất kinh doanh, các loại hình doanh nghiệp, các dịch vụ tín dụng.',
        'Phân biệt ưu nhược điểm các loại hình doanh nghiệp; phân tích lập kế hoạch tài chính cá nhân.',
        'Vận dụng lập kế hoạch tài chính cá nhân và lựa chọn dịch vụ tín dụng an toàn, hiệu quả.',
      ],
      [
        'Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam; Hệ thống chính trị và bộ máy nhà nước',
        'Nhận biết vị trí, vai trò Hiến pháp; cơ cấu tổ chức bộ máy nhà nước Việt Nam.',
        'Phân tích nguyên tắc tổ chức, hoạt động của bộ máy nhà nước; quyền và nghĩa vụ công dân theo Hiến pháp.',
        'Tự giác chấp hành Hiến pháp, pháp luật và phê phán các hành vi vi phạm.',
      ],
    ],
    '11': [
      [
        'Cạnh tranh, cung - cầu trong nền kinh tế thị trường; Lạm phát, thất nghiệp',
        'Nhận biết khái niệm cạnh tranh, cung - cầu, lạm phát, thất nghiệp.',
        'Phân tích tác động của cạnh tranh, quan hệ cung - cầu, nguyên nhân lạm phát, thất nghiệp.',
        'Vận dụng kiến thức cung - cầu, cạnh tranh để lựa chọn mua sắm, định hướng nghề nghiệp.',
      ],
      [
        'Thị trường lao động, việc làm; Quyền bình đẳng của công dân trước pháp luật',
        'Nhận biết xu hướng thị trường lao động; quy định quyền bình đẳng giữa các dân tộc, tôn giáo, nam nữ.',
        'Giải thích vai trò của thị trường lao động; biểu hiện của quyền bình đẳng công dân.',
        'Thực hiện quyền bình đẳng trong học tập, cuộc sống và chủ động tìm kiếm cơ hội phát triển bản thân.',
      ],
      [
        'Quyền tự do cơ bản của công dân (thân thể, tính mạng, chỗ ở, thư tín, ngôn luận)',
        'Nhận biết các quyền tự do cơ bản của công dân được pháp luật bảo vệ.',
        'Phân tích nội dung, ý nghĩa của các quyền tự do cơ bản; hành vi vi phạm quyền tự do.',
        'Sử dụng đúng đắn các quyền tự do cơ bản và bảo vệ quyền tự do của bản thân, người khác.',
      ],
    ],
    '12': [
      [
        'Tăng trưởng và phát triển kinh tế; Hội nhập kinh tế quốc tế',
        'Nhận biết khái niệm tăng trưởng kinh tế, phát triển kinh tế, hội nhập kinh tế quốc tế.',
        'Phân tích mối quan hệ giữa tăng trưởng và phát triển bền vững; các hình thức hội nhập quốc tế.',
        'Đánh giá cơ hội, thách thức của công dân Việt Nam trong thời kì hội nhập kinh tế toàn cầu.',
      ],
      [
        'Pháp luật về lao động, hôn nhân và gia đình, kinh doanh',
        'Nhận biết quy định pháp luật về hợp đồng lao động, độ tuổi lao động, kết hôn, nghĩa vụ vợ chồng.',
        'Phân tích quyền, nghĩa vụ người lao động, người sử dụng lao động, thành viên gia đình, chủ doanh nghiệp.',
        'Vận dụng pháp luật giải quyết các tình huống lao động, gia đình, kinh doanh thực tế.',
      ],
      [
        'Quyền và nghĩa vụ cơ bản của công dân về phát triển kinh tế, văn hóa, xã hội; Pháp luật quốc tế',
        'Nhận biết các quyền nghĩa vụ về phát triển kinh tế, giáo dục, môi trường; vai trò pháp luật quốc tế.',
        'Phân tích trách nhiệm công dân trong bảo vệ môi trường, phát triển văn hóa, tuân thủ pháp luật.',
        'Chủ động tham gia các hoạt động cộng đồng, bảo vệ môi trường và tôn trọng pháp luật quốc tế.',
      ],
    ],
  },
  'Tin học': {
    '10': [
      [
        'Máy tính và xã hội tri thức: Thông tin và xử lí thông tin; Điện toán đám mây; IoT',
        'Nhận biết khái niệm thông tin, dữ liệu, hệ đếm, điện toán đám mây, Internet vạn vật (IoT).',
        'Phân biệt thông tin và dữ liệu; giải thích ưu điểm của lưu trữ mây và ứng dụng IoT.',
        'Vận dụng dịch vụ lưu trữ đám mây và công cụ trực tuyến trong học tập, làm việc nhóm.',
      ],
      [
        'Mạng máy tính và Internet; Đạo đức, pháp luật và văn hóa trong môi trường số',
        'Nhận biết các loại mạng, thiết bị mạng, quy định bản quyền, an toàn thông tin.',
        'Giải thích tác hại của vi phạm bản quyền, mạng xã hội tiêu cực; hành vi an toàn mạng.',
        'Ứng xử có văn hóa, tuân thủ pháp luật và quy định an toàn thông tin trên Internet.',
      ],
      [
        'Ứng dụng tin học: Phần mềm bảng tính nâng cao, phần mềm trình chiếu',
        'Nhận biết các hàm bảng tính (SUM, AVERAGE, IF, VLOOKUP...), công cụ tạo slide trình chiếu.',
        'Sử dụng thành thạo các hàm tính toán, vẽ biểu đồ, tạo hiệu ứng trình chiếu sinh động.',
        'Vận dụng phần mềm bảng tính xử lí số liệu thực tế và tạo bài thuyết trình báo cáo dự án.',
      ],
      [
        'Giải quyết vấn đề với sự trợ giúp của máy tính: Bảng mã, thuật toán, ngôn ngữ lập trình Python cơ bản',
        'Nhận biết cú pháp các câu lệnh trong Python (biến, kiểu dữ liệu, rẽ nhánh if, vòng lặp for/while).',
        'Viết chương trình Python thực hiện các thuật toán tính toán, duyệt danh sách, tìm kiếm.',
        'Vận dụng ngôn ngữ lập trình Python giải bài toán thực tế nhỏ.',
      ],
    ],
    '11': [
      [
        'Hệ điều hành và phần mềm ứng dụng; Mạng máy tính và Internet',
        'Nhận biết chức năng hệ điều hành, phần mềm ứng dụng, địa chỉ IP, tên miền, dịch vụ mạng.',
        'Phân biệt hệ điều hành cho máy tính và thiết bị di động; giải thích nguyên lí hoạt động mạng.',
        'Cấu hình mạng cơ bản, chia sẻ tài nguyên và xử lí sự cố mạng thông thường.',
      ],
      [
        'Đạo đức, pháp luật và văn hóa trong môi trường số: An toàn trên không gian mạng',
        'Nhận biết các nguy cơ mất an toàn thông tin (malware, phishing, ransomware).',
        'Phân tích biện pháp bảo vệ dữ liệu cá nhân, mật khẩu mạnh, xác thực hai lớp.',
        'Thực hành phòng chống mã độc, bảo vệ thông tin cá nhân và tài khoản trực tuyến.',
      ],
      [
        'Kiến tạo tương lai với cơ sở dữ liệu (CSDL) và hệ quản trị CSDL (Access/MySQL)',
        'Nhận biết khái niệm CSDL, bảng, khóa chính, khóa ngoại, hệ quản trị CSDL.',
        'Tạo lập bảng, thiết lập quan hệ giữa các bảng, truy vấn dữ liệu đơn giản bằng SQL/công cụ GUI.',
        'Vận dụng thiết kế CSDL quản lí học sinh, thư viện, bán hàng thực tế.',
      ],
    ],
    '12': [
      [
        'Giới thiệu Trí tuệ nhân tạo (AI), Học máy (Machine Learning) và Khoa học dữ liệu',
        'Nhận biết khái niệm AI, các ứng dụng AI nổi bật (ChatGPT, nhận dạng hình ảnh, giọng nói).',
        'Phân biệt AI hẹp và AI tổng quát; giải thích tác động của AI đối với công việc và xã hội.',
        'Vận dụng các công cụ AI hỗ trợ tìm kiếm, sáng tạo nội dung, học tập có trách nhiệm.',
      ],
      [
        'Mạng máy tính nâng cao, Internet vạn vật (IoT) và An ninh mạng',
        'Nhận biết kiến trúc mạng không dây, IoT, khái niệm tường lửa, mã hóa dữ liệu.',
        'Giải thích cơ chế mã hóa Symmetric/Asymmetric, chứng chỉ số, giao thức HTTPS.',
        'Vận dụng các biện pháp an ninh mạng bảo vệ hệ thống thông tin.',
      ],
      [
        'Thiết kế trang web HTML/CSS và Định hướng nghề nghiệp ngành Tin học',
        'Nhận biết các thẻ HTML cơ bản, thuộc tính CSS định dạng trang web; các nghề nghiệp CNTT.',
        'Tạo dựng trang web đơn giản có văn bản, hình ảnh, bảng, liên kết và định dạng CSS.',
        'Vận dụng thiết kế trang web giới thiệu bản thân, dự án học tập và định hướng nghề nghiệp.',
      ],
    ],
  },
  'Công nghệ': {
    '10': [
      [
        'Khái quát về công nghệ; Công nghệ và đời sống; Bản chất của kĩ thuật và công nghệ',
        'Nhận biết khái niệm công nghệ, kĩ thuật, mối quan hệ giữa khoa học, kĩ thuật và công nghệ.',
        'Phân tích tác động của công nghệ đối với con người, xã hội và môi trường.',
        'Đánh giá và lựa chọn sản phẩm công nghệ phù hợp trong sinh hoạt gia đình.',
      ],
      [
        'Thiết kế kĩ thuật: Quy trình thiết kế, các phương pháp và công cụ hỗ trợ thiết kế',
        'Nhận biết các bước trong quy trình thiết kế kĩ thuật, vai trò của bản vẽ kĩ thuật.',
        'Phân tích các yêu cầu sản phẩm, lập kế hoạch thiết kế kĩ thuật đơn giản.',
        'Vận dụng quy trình thiết kế kĩ thuật tạo ra sản phẩm dụng cụ học tập, sinh hoạt đơn giản.',
      ],
      [
        'Vẽ kĩ thuật: Tiêu chuẩn trình bày bản vẽ, hình chiếu vuông góc, hình chiếu khối đa diện, khối tròn xoay',
        'Nhận biết tiêu chuẩn bản vẽ, phương pháp chiếu góc thứ nhất, kí hiệu hình chiếu.',
        'Vẽ hình chiếu vuông góc, hình chiếu ba chiều của các vật thể hình học cơ bản.',
        'Đọc bản vẽ kĩ thuật đơn giản và dựng mô hình vật thể.',
      ],
    ],
    '11': [
      [
        'Vật liệu cơ khí: Kim loại, hợp kim, phi kim, vật liệu mới; Công nghệ chế tạo cơ khí',
        'Nhận biết tính chất vật lí, cơ học, hóa học của các vật liệu cơ khí phổ biến.',
        'Phân biệt phương pháp đúc, rèn, dập, hàn, tiện, phay trong chế tạo cơ khí.',
        'Lựa chọn vật liệu và phương pháp gia công cơ khí phù hợp cho sản phẩm thực tế.',
      ],
      [
        'Cơ khí động lực và Động cơ đốt trong: Cấu tạo, nguyên lí hoạt động của động cơ 4 kì, 2 kì',
        'Nhận biết các bộ phận chính của động cơ đốt trong (xilanh, piston, trục khuỷu...).',
        'Giải thích nguyên lí hoạt động nguyên lí làm việc của động cơ xăng, động cơ diesel 4 kì.',
        'Vận dụng quy trình bảo dưỡng, vận hành an toàn xe máy, ô tô trong thực tế.',
      ],
    ],
    '12': [
      [
        'Linh kiện điện tử (điện trở, tụ điện, cuộn cảm, diode, transistor, IC); Mạch điện tử cơ bản',
        'Nhận biết hình dáng, ký hiệu, công dụng của các linh kiện điện tử thụ động và tích cực.',
        'Giải thích nguyên lý hoạt động của mạch chỉnh lưu, mạch khuếch đại, mạch tạo xung.',
        'Đọc sơ đồ nguyên lý và lắp ráp mạch điện tử đơn giản (mạch báo sáng, báo động).',
      ],
      [
        'Hệ thống điện quốc gia; Mạng điện hạ áp trong gia đình và an toàn điện',
        'Nhận biết sơ đồ hệ thống điện quốc gia, cấu tạo mạng điện gia đình.',
        'Tính toán công suất tiêu thụ điện, lựa chọn dây dẫn, aptomat, cầu chì cho gia đình.',
        'Vận dụng quy tắc an toàn điện, xử lí sự cố điện và tiết kiệm điện năng.',
      ],
    ],
  },
  'Tiếng Anh': {
    '10': [
      [
        'Unit 1: Family life - Vocabulary & Grammar (Present Simple vs Present Continuous, Pronunciation)',
        'Identify vocabulary related to household chores and family roles; present simple and continuous forms.',
        'Understand main ideas and details in reading/listening about daily routines and family bonding.',
        'Apply grammar and vocabulary to write/speak about family roles and domestic responsibilities.',
      ],
      [
        'Unit 2: Humans and the environment - Green living, Eco-friendly lifestyle, Future with WILL vs BE GOING TO',
        'Identify eco-vocabulary, green habits; grammar structures with WILL and BE GOING TO.',
        'Comprehend texts and audio about environmental protection, carbon footprint reduction.',
        'Propose solutions and write articles about adopting a greener lifestyle.',
      ],
      [
        'Unit 3: Music - Music genres, Instruments, Passive Voice with Modals, Compound Sentences',
        'Identify music terminology, famous shows; compound sentences with FANBOYS, passives.',
        'Extract specific details from interviews and articles about musical shows and artists.',
        'Write a blog post or review describing a music event or favorite singer.',
      ],
      [
        'Unit 4: For a better community - Volunteer work, Past Simple vs Past Continuous with WHEN/WHILE',
        'Identify words related to volunteering, community service; past simple and past continuous.',
        'Understand narratives about youth volunteering, non-profit organizations.',
        'Write an application letter or essay for a community volunteer project.',
      ],
      [
        'Unit 5: Inventions - Technological devices, Infinitive of Purpose, Gerunds & Infinitives',
        'Identify vocabulary of modern inventions, AI tools; gerunds and to-infinitives.',
        'Analyze benefits and drawbacks of technological devices in education and daily life.',
        'Write a description or presentation introducing a new useful invention.',
      ],
      [
        'Unit 6: Gender equality - Equal opportunities, Job roles, Passive Voice in Present/Past',
        'Identify career vocabulary, gender bias terms; passive voice structures.',
        'Understand discussions about gender equality in education, workforce and leadership.',
        'Express opinions in essays/speeches supporting equal rights in choice of careers.',
      ],
      [
        'Unit 7: Viet Nam and international organisations - WTO, UNICEF, UNDP, Comparative and Superlative Adjectives',
        'Identify acronyms and terms of international bodies; comparison forms.',
        'Extract main arguments about Vietnam\'s economic and educational integration.',
        'Write an essay about the benefits of Vietnam joining global organizations.',
      ],
      [
        'Unit 8: New ways to learn - Blended learning, E-learning, Relative Clauses (DEFINING & NON-DEFINING)',
        'Identify vocabulary of digital learning tools; relative pronouns (who, which, that, whose).',
        'Comprehend texts discussing online education vs traditional classroom learning.',
        'Write an argumentative essay on the advantages of digital learning platforms.',
      ],
      [
        'Unit 9: Protecting the environment - Wildlife, Climate Change, Reported Speech',
        'Identify terms for endangered species, habitats; reported speech rules for statements/questions.',
        'Analyze causes and effects of environmental degradation in articles and podcasts.',
        'Write a report proposing local environmental preservation strategies.',
      ],
      [
        'Unit 10: Ecotourism - Sustainable travel, Local culture preservation, Conditional Sentences Type 1 & Type 2',
        'Identify ecotourism terms, responsible travel rules; conditionals type 1 and 2.',
        'Understand reading texts about national parks, eco-tours and cultural impact.',
        'Write a travel itinerary or essay promoting sustainable tourism practices.',
      ],
    ],
    '11': [
      [
        'Unit 1: A long and healthy life - Healthy diet, Fitness, Modal Verbs (MUST, SHOULD, HAVE TO)',
        'Recognize health, nutrition, workout terms; modal verbs for obligation and advice.',
        'Understand advice and articles on longevity, immune system and mental health.',
        'Write a guide or essay proposing daily habits for a healthier lifestyle.',
      ],
      [
        'Unit 2: The generation gap - Family values, Conflict resolution, Linking Verbs & Cleft Sentences',
        'Identify terms for family views, lifestyle choices; linking verbs (seem, become, taste).',
        'Comprehend discussions on bridging communication gaps between parents and teenagers.',
        'Write an opinion essay offering solutions to family generation conflicts.',
      ],
      [
        'Unit 3: Cities of the future - Smart technology, Urban planning, Stative Verbs in Continuous Forms',
        'Recognize smart city features, green transportation vocabulary.',
        'Analyze articles detailing future urban innovations, AI traffic control and green roofs.',
        'Design and write a proposal for a sustainable futuristic city project.',
      ],
      [
        'Unit 4: ASEAN and Viet Nam - Cultural exchange, Youth forums, Gerunds as Subjects/Objects',
        'Identify ASEAN member states, cultural heritage terms; gerund usage.',
        'Understand speeches and news report on ASEAN youth summits and regional cooperation.',
        'Write a brochure or essay highlighting Vietnam\'s active contributions in ASEAN.',
      ],
      [
        'Unit 5: Global warming - Greenhouse gas, Deforestation, Perfect Gerunds and Perfect Participles',
        'Recognize climate crisis terminology; perfect gerunds (having done) and participles.',
        'Extract key arguments regarding carbon emissions, extreme weather events.',
        'Write an essay analyzing causes of global warming and personal mitigation efforts.',
      ],
      [
        'Unit 6: Preserving our heritage - Historical monuments, Cultural conservation, To-infinitive Clauses',
        'Identify UNESCO world heritage sites in Vietnam, restoration terms.',
        'Comprehend audio and reading passages on preserving tangible and intangible heritage.',
        'Write a leaflet or speech raising awareness about protecting local historical sites.',
      ],
      [
        'Unit 7: Education options for school-leavers - Vocational training, University, Perfect Participles',
        'Identify post-secondary career paths, tertiary education vocabulary.',
        'Analyze career guidance articles, vocational skills vs academic degrees.',
        'Write a formal letter of application or career plan for life after high school.',
      ],
      [
        'Unit 8: Becoming independent - Life skills, Time management, Cleft Sentences with IT IS/WAS... THAT',
        'Identify self-reliance skills, financial literacy terms; cleft sentence structures.',
        'Understand guidance on stress management, living away from home.',
        'Write an essay explaining key steps teenagers should take to become independent.',
      ],
      [
        'Unit 9: Social issues - Cyberbullying, Peer pressure, Peer pressure, Reported Speech with To-infinitives',
        'Identify terminology for social problems, online harassment, peer influence.',
        'Examine case studies and reports on youth mental health and social media impact.',
        'Write an opinion article proposing anti-bullying campaigns in high schools.',
      ],
      [
        'Unit 10: The ecosystem - Biodiversity, Habitat restoration, Compound Nouns & Adjectives',
        'Recognize flora, fauna, nature reserve vocabulary; compound adjectives.',
        'Analyze texts detailing ecosystem preservation, coral reef protection.',
        'Write a project proposal to preserve local wildlife habitats and biodiversity.',
      ],
    ],
    '12': [
      [
        'Unit 1: Life stories we admire - Biographies, Inspirational figures, Past Simple vs Past Perfect',
        'Identify vocabulary for personal qualities, life milestones; past simple and past perfect.',
        'Extract key details from biographical articles of national heroes and famous scientists.',
        'Write a biographical essay honoring an inspirational figure.',
      ],
      [
        'Unit 2: A multicultural world - Cultural diversity, Customs, Traditions, Double Comparatives',
        'Recognize global cultural terms, traditions; double comparatives (the more... the more...).',
        'Comprehend passages detailing cultural assimilation, festivals around the world.',
        'Write an essay discussing the benefits and challenges of living in a multicultural society.',
      ],
      [
        'Unit 3: Green living - Zero waste, Renewable energy, Participle Clauses',
        'Identify eco-friendly terms, recycling systems; present and past participle clauses.',
        'Analyze articles on green building, renewable solar/wind energy adoption.',
        'Write an action plan or persuasive essay promoting zero-waste lifestyle in schools.',
      ],
      [
        'Unit 4: Urbanisation - Rural-to-urban migration, Slums, Infrastructure, Subjunctive Mood',
        'Recognize urban growth terms, mega-cities, infrastructure challenges; subjunctive mood.',
        'Understand causes and impacts of rapid urban expansion on living standards.',
        'Write an essay analyzing urbanisation trends and suggesting solutions for sustainable growth.',
      ],
      [
        'Unit 5: The world of work - Future jobs, Soft skills, AI automation, Inversion with Negative Adverbs',
        'Identify job market terms, remote work, automation; inversion structures (Hardly, Never...).',
        'Analyze reports on how artificial intelligence transforms future job markets.',
        'Write an argumentative essay on essential skills needed for jobs in the 21st century.',
      ],
      [
        'Unit 6: Artificial intelligence - AI applications, Robotics, Ethics of AI, Relative Clauses with Prepositions',
        'Identify AI terminology, machine learning, autonomous systems; preposition + relative pronoun.',
        'Examine ethical debates surrounding AI in healthcare, education and warfare.',
        'Write an essay expressing views on ethical guidelines for AI development.',
      ],
      [
        'Unit 7: The world of mass media - Digital journalism, Fake news, Social media influence, Adverbial Clauses',
        'Recognize media terms, broadcasting, misinformation; adverbial clauses of concession, result.',
        'Critically evaluate news credibility, algorithm bias in social media feeds.',
        'Write an essay on media literacy and responsible information consumption.',
      ],
      [
        'Unit 8: Wildlife conservation - Endangered species, Anti-poaching, Mixed Conditionals',
        'Identify wildlife protection terms, red list species; mixed conditional sentences.',
        'Comprehend documentaries and articles on anti-poaching operations and nature reserves.',
        'Write a proposal or letter advocating for stricter wildlife conservation laws.',
      ],
      [
        'Unit 9: Career paths - CV writing, Job interviews, Professional growth, Compound Sentences',
        'Identify resume terms, interview skills, professional certifications.',
        'Analyze advice articles on career planning, personal branding and interview preparation.',
        'Draft a professional CV and cover letter for a job application.',
      ],
      [
        'Unit 10: Lifelong learning - Distance learning, Skill upgrading, Self-directed learning',
        'Identify terms for continuous education, adult learning, skill acquisition.',
        'Understand the importance of lifelong learning in a rapidly changing economy.',
        'Write a personal development plan outlining goals for lifelong learning.',
      ],
    ],
  },
  'Giáo dục quốc phòng và an ninh': {
    '10': [
      [
        'Truyền thống chống giặc ngoại xâm của dân tộc; Xây dựng nền quốc phòng toàn dân, an ninh nhân dân',
        'Nhận biết lịch sử truyền thống đánh giặc giữ nước của dân tộc; khái niệm quốc phòng toàn dân.',
        'Giải thích các bài học lịch sử dựng nước gắn liền giữ nước; mục tiêu, nhiệm vụ quốc phòng toàn dân.',
        'Thể hiện lòng yêu nước, ý thức trách nhiệm công dân trong xây dựng và bảo vệ Tổ quốc.',
      ],
      [
        'Đội ngũ đơn vị; Kĩ thuật cứu thương và phòng tránh thiên tai',
        'Nhận biết các động tác điều lệnh đội ngũ, kĩ thuật băng bó vết thương, cấp cứu ban đầu.',
        'Thực hiện thành thạo các động tác điều lệnh; giải thích quy trình sơ cứu vết thương, tai nạn.',
        'Vận dụng kĩ năng sơ cấp cứu và phòng chống thiên tai, tai nạn trong cuộc sống hàng ngày.',
      ],
    ],
    '11': [
      [
        'Bảo vệ an ninh quốc gia, trật tự an toàn xã hội; Phòng chống vi phạm pháp luật trên không gian mạng',
        'Nhận biết các quy định pháp luật về bảo vệ an ninh quốc gia, an toàn giao thông, an ninh mạng.',
        'Phân tích nguy cơ, thủ đoạn xâm phạm an ninh quốc gia; tác hại của vi phạm pháp luật trên mạng.',
        'Tự giác chấp hành pháp luật, cảnh giác trước các thủ đoạn lôi kéo, kích động chống phá.',
      ],
      [
        'Quân sự chung: Điều lệnh đội ngũ, kĩ thuật bắn súng tiểu liên AK',
        'Nhận biết cấu tạo, tính năng kĩ kĩ thuật súng AK; quy tắc ngắm bắn và tháo lắp súng.',
        'Thực hiện đúng tư thế, động tác ngắm bắn, tháo lắp súng tiểu liên AK.',
        'Thực hành tập bắn mục tiêu cố định ban ngày bảo đảm an toàn tuyệt đối.',
      ],
    ],
    '12': [
      [
        'Chiến tranh nhân dân bảo vệ Tổ quốc; Phòng chống chiến lược "Diễn biến hòa bình", bạo loạn lật đổ',
        'Nhận biết mục đích, tính chất, nguyên tắc của chiến tranh nhân dân; bản chất "Diễn biến hòa bình".',
        'Phân tích âm mưu, thủ đoạn "Diễn biến hòa bình" của các thế lực thù địch.',
        'Nêu cao tinh thần cảnh giác cách mạng, bảo vệ nền tảng tư tưởng của Đảng.',
      ],
      [
        'Kĩ thuật chiến đấu bộ binh; Vũ khí công nghệ cao và biện pháp phòng tránh',
        'Nhận biết tác hại của vũ khí công nghệ cao; cách sử dụng địa hình, địa vật, lựu đạn.',
        'Thực hiện thành thạo tư thế vận động trên chiến trường và kĩ thuật ném lựu đạn trúng đích.',
        'Vận dụng các biện pháp phòng tránh vũ khí công nghệ cao, bảo vệ bản thân và đơn vị.',
      ],
    ],
  },
};

export const CALC_GUIDELINES: Record<string, string> = {
  Toán: 'bài toán tính ra một giá trị số',
  'Vật lí': 'bài tính vật lí (áp dụng công thức, định luật, đổi đơn vị) ra một số',
  'Hóa học': 'bài tính hóa học (mol, khối lượng, nồng độ, thể tích khí, hiệu suất, pH…) ra một số',
  'Sinh học':
    'bài tính sinh học đặc thù (số nuclêôtit, số NST, số tế bào, tỉ lệ kiểu gen, kiểu hình, xác suất, hiệu suất, năng lượng sinh thái…) ra một số',
  'Địa lí':
    'tính toán số liệu địa lí đặc thù từ bảng số liệu (biên độ nhiệt = Tmax - Tmin; cán cân thương mại = Xuất - Nhập; mật độ dân số = Số dân / Diện tích; tỉ trọng cơ cấu = Thành phần / Tổng * 100; tốc độ tăng trưởng; bình quân đầu người…) ra một số duy nhất có quy ước làm tròn rõ ràng.',
  'Giáo dục kinh tế và pháp luật':
    'tính toán kinh tế đặc thù (lãi suất, thuế, lợi nhuận, tăng trưởng, lạm phát, tỉ lệ thất nghiệp…) ra một số',
  'Tin học': 'tính toán đặc thù tin học (dung lượng, đổi cơ số, số lần lặp…) ra một số',
  'Công nghệ': 'tính toán kĩ thuật đặc thù (công suất, tỉ số truyền, điện năng, hệ số…) ra một số',
};

export const GENERAL_EXAM_STRUCTURE_RULES = `=== QUY CHUẨN ĐỀ THI VÀ KĨ THUẬT SOẠN CÂU HỎI THEO BỘ GD&ĐT (TỪ TÀI LIỆU CẤU TRÚC RA ĐỀ THI CHUNG) ===
1. CẤU TRÚC VÀ TỈ LỆ MA TRẬN ĐỀ THI:
   - Nhận biết (B): 30% - 40%
   - Thông hiểu (H): 30% - 40%
   - Vận dụng (V): 15% - 20%
   - Vận dụng cao (VDC): 5% - 10%
2. YÊU CẦU CÂU HỎI VÀ ĐÁP ÁN (BÁM SÁT CHUẨN SGK BỘ KẾT NỐI TRI THỨC VỚI CUỘC SỐNG 2026):
   - Câu hỏi độc lập hoàn toàn, thân câu hỏi không chứa thông tin gợi ý cho câu khác.
   - Thân câu hỏi ngắn gọn, chỉ nêu vấn đề trọng tâm, không chứa từ mơ hồ/chủ quan ("thường là", "phần lớn", "có thể", "thích hợp nhất").
   - Từ phủ định trong câu dẫn BẮT BUỘC in đậm, in nghiêng và viết hoa: ***KHÔNG***, ***NGOẠI TRỪ***, ***CHƯA***, ***SAI*** (không in đậm từ "không" trong danh từ như "không khí", "không gian").
   - CẤM SỬ DỤNG TỪ MÊ-TA "khẳng định", "nhận định", "quan điểm", "ý này", "mệnh đề" TRONG CÁC PHƯƠNG ÁN A,B,C,D VÀ CÁC Ý a,b,c,d.
   - Nội dung phương án và các ý BẮT BUỘC là 1 câu trần thuật về kiến thức/thực tế khách quan chuẩn 100% SGK (Ví dụ: "Năm 2023, tỉ lệ dân số đô thị nước ta đạt 42,6%.").
   - 4 phương án A, B, C, D đồng nhất 100% về độ dài, cấu trúc ngữ pháp, từ loại và số vế/ý.
   - Tuyệt đối không dùng "Tất cả các đáp án trên đều đúng/sai", "Cả A và B đều đúng".
   - Bắt buộc loại bỏ nhận xét meta, chú thích sai/đúng (như [sai], (sai), 'ý này sai vì...') khỏi phương án và câu khẳng định.
3. QUY CHUẨN CÁC PHẦN:
   - Phần I (NLC - 4 chọn 1): Câu hỏi hỏi trực tiếp kiến thức cốt lõi. Phương án viết hoa đầu câu nếu câu dẫn kết thúc bằng dấu ?, viết thường nếu câu dẫn chưa hoàn chỉnh nối tiếp.
   - Phần II (DS - Đúng/Sai 4 ý): Dựa trên 1 ngữ liệu trích dẫn chuẩn chính thống (có nguồn đầy đủ). 4 ý a,b,c,d độc lập là các câu kiến thức/thực tế khách quan. BẮT BUỘC có cả ý Đúng và ý Sai trong mỗi câu (TUYỆT ĐỐI CẤM 4 ý đều Đúng hoặc 4 ý đều Sai; ưu tiên phân bổ cân bằng 2 ý Đúng - 2 ý Sai hoặc 3-1, 1-3 đa dạng vị trí giữa các ý a, b, c, d). Điểm tăng dần: 1 ý đúng = 0.1đ, 2 ý = 0.25đ, 3 ý = 0.5đ, 4 ý = 1.0đ.
   - Phần III (TLN - Trả lời ngắn): Bài toán tính toán ra 1 giá trị số cụ thể. Đáp án tối đa 4 ký tự tô vừa 4 ô phiếu trả lời. Lời dẫn ghi rõ quy ước làm tròn.
   - Phần IV (TL - Tự luận): Đáp án & hướng dẫn chấm BẮT BUỘC cung cấp NỘI DUNG KIẾN THỨC CỤ THỂ, TRỰC TIẾP (từ khóa cốt lõi SGK Kết nối tri thức 2026), trình bày ngắn gọn bằng các gạch đầu dòng (-/+), chia barem điểm rành mạch giúp giám khảo dễ dàng đối chiếu và cho điểm chính xác.`;

export const GEOGRAPHY_EXAM_RULES = `=== QUY CHUẨN ĐẶC THÙ MÔN ĐỊA LÍ (TỪ TÀI LIỆU HƯỚNG DẪN RA ĐỀ MÔN ĐỊA LÍ BỘ GD&ĐT) ===
1. LOẠI BỎ TỪ MÊ-TA VÀ NỘI DUNG CHUẨN SGK ĐỊA LÍ 2026:
   - TUYỆT ĐỐI KHÔNG ghi các từ "khẳng định", "nhận định", "quan điểm", "ý này" trong câu hỏi hay đáp án.
   - Mọi phương án chọn và ý a,b,c,d BẮT BUỘC diễn đạt trực tiếp kiến thức địa lí SGK Kết nối tri thức 2026 (ví dụ: "Sự phân hóa thiên nhiên nước ta do vị trí địa lí và địa hình quy định.").
2. KHÔNG SỬ DỤNG CHỈ DẪN TRANG ATLAT TRỰC TIẾP:
   - TUYỆT ĐỐI KHÔNG xuất hiện các câu hỏi hoặc ý khẳng định có dạng: "Căn cứ vào Atlat Địa lí Việt Nam trang...", "Dựa vào Atlat trang...".
   - Chuyển đổi kĩ năng sử dụng Atlat thành các kĩ năng đọc bản đồ, nhận biết vị trí địa lí, phân bố không gian và liên hệ thực tế chung.
3. DỮ LIỆU THỐNG KÊ VÀ NGUỒN TRÍCH DẪN:
   - Số liệu thống kê trong bảng/biểu đồ phải cập nhật trong khoảng 3 - 5 năm gần đây từ Tổng cục Thống kê (TCTK), Niên giám Thống kê hoặc tài liệu chính thống của Bộ GD&ĐT.
4. CHUẨN HÓA TỪ KHÓA LỰA CHỌN BIỂU ĐỒ:
   - Từ khóa "Cơ cấu" hoặc "Chuyển dịch cơ cấu" -> Biểu đồ Tròn (dưới 3 năm) hoặc Miền (từ 4 năm trở lên).
   - Từ khóa "Tốc độ tăng trưởng" -> Biểu đồ Đường.
   - Từ khóa "Quy mô" hoặc "Khối lượng" hoặc "So sánh quy mô" -> Biểu đồ Cột.
   - Từ khóa "Quy mô và cơ cấu" -> Biểu đồ Cột kết hợp Đường hoặc Biểu đồ Tròn có bán kính khác nhau.
5. TÍNH TOÁN CỦA PHẦN III (TRẢ LỜI NGẮN ĐỊA LÍ):
   - Mật độ dân số = Số dân / Diện tích (người/km²).
   - Biên độ nhiệt = Nhiệt độ tháng cao nhất - Nhiệt độ tháng thấp nhất (°C).
   - Cán cân thương mại = Giá trị xuất khẩu - Giá trị nhập khẩu (USD hoặc nghìn tỉ đồng).
   - Tỷ trọng cơ cấu = (Giá trị thành phần / Tổng số) × 100 (%).
   - Tốc độ tăng trưởng = (Giá trị năm sau / Giá trị năm gốc) × 100 (%).
   - Bình quân đầu người = Tổng giá trị / Số dân.
   - Luôn kèm theo hướng dẫn làm tròn rõ ràng (hàng đơn vị hoặc hàng phần mười) sao cho kết quả ngắn gọn <= 4 ký tự.`;

export const QUESTION_RULES_TEXT = `${GENERAL_EXAM_STRUCTURE_RULES}\n\n${GEOGRAPHY_EXAM_RULES}`;

export const FOOTNOTES_TEXT: Record<number, string> = {
  2: 'Mỗi câu hỏi bao gồm 4 ý nhỏ, mỗi ý học sinh phải chọn đúng hoặc sai. Một số tài liệu xếp loại câu hỏi này vào loại Nhiều lựa chọn phức hợp hoặc Nhiều lựa chọn có nhiều phương án đúng.',
  3: 'Đối với môn học không sử dụng dạng này thì chuyển toàn bộ số điểm cho dạng “Đúng – Sai”.',
  4: 'Có ở trong một số ô của ma trận, thể hiện số câu hỏi hoặc câu hỏi số bao nhiêu.',
  5: 'Lựa chọn sao cho được khoảng 3,0 điểm, tương ứng với tỉ lệ khoảng 30%; tương tự như thế đối với các dạng khác.',
  6: 'Có ở trong một số ô của bản đặc tả, ghi tắt tên của năng lực (đã được quy định trong chương trình môn học/hoạt động giáo dục).',
};

