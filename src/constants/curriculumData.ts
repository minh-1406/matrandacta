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
  Toán: {
    '10': [
      ['Mệnh đề và tập hợp', 1],
      ['Bất phương trình và hệ bất phương trình bậc nhất hai ẩn', 1],
      ['Hệ thức lượng trong tam giác', 1],
      ['Vectơ', 1],
      ['Các số đặc trưng của mẫu số liệu không ghép nhóm', 1],
      ['Hàm số, đồ thị và ứng dụng', 2],
      ['Phương pháp tọa độ trong mặt phẳng', 2],
      ['Đại số tổ hợp', 2],
      ['Tính xác suất theo định nghĩa cổ điển', 2],
    ],
    '11': [
      ['Hàm số lượng giác và phương trình lượng giác', 1],
      ['Dãy số, cấp số cộng và cấp số nhân', 1],
      ['Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm', 1],
      ['Quan hệ song song trong không gian', 1],
      ['Giới hạn, hàm số liên tục', 1],
      ['Hàm số mũ và hàm số lôgarit', 2],
      ['Quan hệ vuông góc trong không gian', 2],
      ['Các quy tắc tính xác suất', 2],
      ['Đạo hàm', 2],
    ],
    '12': [
      ['Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số', 1],
      ['Vectơ và hệ trục tọa độ trong không gian', 1],
      ['Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm', 1],
      ['Nguyên hàm và tích phân', 2],
      ['Phương pháp tọa độ trong không gian', 2],
      ['Xác suất có điều kiện', 2],
    ],
  },
  'Vật lí': {
    '10': [
      ['Mở đầu', 1],
      ['Động học', 1],
      ['Động lực học', 1],
      ['Công, năng lượng, công suất', 2],
      ['Động lượng', 2],
      ['Chuyển động tròn', 2],
      ['Biến dạng của vật rắn', 2],
    ],
    '11': [
      ['Dao động', 1],
      ['Sóng', 1],
      ['Trường điện', 2],
      ['Dòng điện, mạch điện', 2],
    ],
    '12': [
      ['Vật lí nhiệt', 1],
      ['Khí lí tưởng', 1],
      ['Từ trường', 2],
      ['Vật lí hạt nhân và phóng xạ', 2],
    ],
  },
  'Hóa học': {
    '10': [
      ['Cấu tạo nguyên tử', 1],
      ['Bảng tuần hoàn các nguyên tố hóa học', 1],
      ['Liên kết hóa học', 1],
      ['Phản ứng oxi hóa - khử', 1],
      ['Năng lượng hóa học', 2],
      ['Tốc độ phản ứng', 2],
      ['Nguyên tố nhóm halogen', 2],
    ],
    '11': [
      ['Cân bằng hóa học', 1],
      ['Nitrogen và sulfur', 1],
      ['Đại cương về hóa học hữu cơ', 1],
      ['Hydrocarbon', 2],
      ['Dẫn xuất halogen - alcohol - phenol', 2],
      ['Hợp chất carbonyl - carboxylic acid', 2],
    ],
    '12': [
      ['Ester - lipid', 1],
      ['Carbohydrate', 1],
      ['Hợp chất chứa nitrogen', 1],
      ['Polymer', 1],
      ['Pin điện và điện phân', 2],
      ['Đại cương về kim loại', 2],
      ['Nguyên tố nhóm IA và IIA', 2],
      ['Sơ lược kim loại chuyển tiếp dãy thứ nhất và phức chất', 2],
    ],
  },
  'Địa lí': mk({
    '10': [
      [
        'Môn Địa lí với định hướng nghề nghiệp',
        'Phương pháp biểu hiện các đối tượng địa lí trên bản đồ',
        'Trái Đất, thạch quyển và các quy luật',
        'Khí quyển',
        'Thủy quyển',
        'Sinh quyển, lớp vỏ địa lí',
      ],
      [
        'Dân cư và phân bố dân cư thế giới',
        'Nông nghiệp, lâm nghiệp, thủy sản',
        'Công nghiệp',
        'Dịch vụ',
        'Môi trường và phát triển bền vững',
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
        'Vị trí địa lí và phạm vi lãnh thổ Việt Nam',
        'Thiên nhiên nhiệt đới ẩm gió mùa',
        'Sử dụng hợp lí tài nguyên thiên nhiên và bảo vệ môi trường',
        'Dân số, lao động và việc làm; đô thị hóa',
        'Nông nghiệp, lâm nghiệp, thủy sản',
        'Công nghiệp',
      ],
      [
        'Dịch vụ (giao thông, thương mại, du lịch)',
        'Vùng Trung du và miền núi Bắc Bộ; Đồng bằng sông Hồng',
        'Vùng Bắc Trung Bộ; Duyên hải Nam Trung Bộ; Tây Nguyên',
        'Vùng Đông Nam Bộ; Đồng bằng sông Cửu Long',
        'Phát triển kinh tế biển đảo, bảo vệ chủ quyền',
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
        'Lịch sử và Sử học',
        'Một số nền văn minh thế giới thời kì cổ - trung đại',
      ],
      [
        'Một số nền văn minh trên đất Việt Nam',
        'Văn minh Đông Nam Á',
        'Cách mạng công nghiệp và toàn cầu hóa',
      ],
    ],
    '11': [
      [
        'Một số vấn đề chung về cách mạng tư sản',
        'Chủ nghĩa xã hội từ năm 1917 đến nay',
        'Quá trình giành độc lập dân tộc của các quốc gia Đông Nam Á',
      ],
      [
        'Chiến tranh bảo vệ Tổ quốc trong lịch sử Việt Nam',
        'Một số cuộc cải cách trong lịch sử Việt Nam',
        'Lịch sử bảo vệ chủ quyền biển đảo Việt Nam',
      ],
    ],
    '12': [
      [
        'Thế giới trong và sau Chiến tranh lạnh',
        'Cộng đồng ASEAN',
        'Cách mạng tháng Tám năm 1945 và kháng chiến chống thực dân Pháp',
      ],
      [
        'Kháng chiến chống Mỹ, cứu nước (1954-1975)',
        'Công cuộc Đổi mới ở Việt Nam từ năm 1986',
        'Lịch sử đối ngoại Việt Nam; Hồ Chí Minh trong lịch sử dân tộc',
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
        'Vai trò của môn Địa lí; các ngành nghề có liên quan đến kiến thức địa lí',
        'Nêu được vai trò của môn Địa lí và một số ngành nghề liên quan.',
        'Phân tích được mối quan hệ giữa kiến thức địa lí với các ngành nghề trong thực tiễn.',
        'Liên hệ định hướng nghề nghiệp của bản thân với kiến thức, kĩ năng địa lí.',
      ],
      [
        'Các phương pháp biểu hiện đối tượng địa lí trên bản đồ; sử dụng bản đồ trong học tập và đời sống',
        'Kể tên được các phương pháp biểu hiện đối tượng địa lí trên bản đồ; nhận biết kí hiệu bản đồ.',
        'Phân biệt được đặc điểm, đối tượng biểu hiện của từng phương pháp; đọc được bản đồ.',
        'Sử dụng bản đồ để xác định vị trí, tìm đường và giải quyết tình huống thực tế.',
      ],
      [
        'Trái Đất trong hệ Mặt Trời; hệ quả chuyển động của Trái Đất; cấu trúc Trái Đất, thạch quyển; nội lực, ngoại lực',
        'Trình bày được các chuyển động của Trái Đất, cấu trúc Trái Đất, các lớp vỏ và mảng kiến tạo.',
        'Giải thích được các hệ quả địa lí của chuyển động Trái Đất; phân biệt tác động nội lực và ngoại lực.',
        'Giải thích hiện tượng ngày đêm, mùa, động đất, núi lửa ở một địa phương; phân tích bản đồ, số liệu.',
      ],
      [
        'Cấu trúc khí quyển; nhiệt độ, khí áp, gió, mưa; các đới và kiểu khí hậu; biến đổi khí hậu',
        'Nêu được cấu trúc khí quyển, các nhân tố ảnh hưởng đến nhiệt độ, khí áp, gió, mưa.',
        'Giải thích được sự phân bố nhiệt độ, khí áp, gió, lượng mưa trên Trái Đất.',
        'Phân tích biểu đồ khí hậu, bản đồ khí áp và gió; đề xuất ứng phó với biến đổi khí hậu.',
      ],
      [
        'Nước trên Trái Đất; sông, hồ, nước ngầm; biển và đại dương',
        'Trình bày được vòng tuần hoàn của nước, các nhân tố ảnh hưởng đến chế độ nước sông, sóng, thủy triều, dòng biển.',
        'Giải thích được chế độ nước sông, hiện tượng sóng, thủy triều, dòng biển.',
        'Phân tích bản đồ, số liệu thủy văn; đề xuất sử dụng hợp lí và bảo vệ nguồn nước.',
      ],
      [
        'Đất và sinh quyển; lớp vỏ địa lí; quy luật thống nhất và hoàn chỉnh, địa đới, phi địa đới',
        'Nêu được các nhân tố hình thành đất, sự phân bố sinh vật; khái niệm lớp vỏ địa lí và các quy luật.',
        'Giải thích được ảnh hưởng của các nhân tố đến đất, sinh vật; phân biệt quy luật địa đới và phi địa đới.',
        'Vận dụng quy luật địa lí để giải thích sự phân bố thiên nhiên và đề xuất sử dụng hợp lí tự nhiên.',
      ],
      [
        'Dân số và gia tăng dân số; cơ cấu dân số; phân bố dân cư; đô thị hóa',
        'Trình bày được các khái niệm, nhân tố ảnh hưởng đến gia tăng dân số, cơ cấu và phân bố dân cư.',
        'Giải thích được sự khác biệt về gia tăng dân số, cơ cấu dân số, đô thị hóa giữa các nhóm nước.',
        'Phân tích biểu đồ, số liệu dân cư; đề xuất giải pháp cho vấn đề dân số ở địa phương.',
      ],
      [
        'Vai trò, đặc điểm, nhân tố ảnh hưởng; các ngành nông nghiệp, lâm nghiệp, thủy sản',
        'Nêu được vai trò, đặc điểm và các nhân tố ảnh hưởng đến sự phát triển, phân bố nông nghiệp, lâm nghiệp, thủy sản.',
        'Giải thích được sự phân bố của các ngành, các mô hình nông nghiệp.',
        'Phân tích bảng số liệu, biểu đồ; liên hệ phát triển nông nghiệp bền vững ở địa phương.',
      ],
      [
        'Vai trò, đặc điểm, nhân tố ảnh hưởng đến công nghiệp; các ngành công nghiệp chủ yếu',
        'Trình bày được vai trò, đặc điểm và các nhân tố ảnh hưởng đến phát triển, phân bố công nghiệp.',
        'Giải thích được sự phân bố của một số ngành công nghiệp; nhận xét xu hướng phát triển.',
        'Phân tích số liệu, biểu đồ công nghiệp; đánh giá ảnh hưởng của công nghiệp đến môi trường.',
      ],
      [
        'Vai trò, đặc điểm, nhân tố ảnh hưởng đến dịch vụ; giao thông vận tải, thương mại, tài chính - ngân hàng, du lịch',
        'Nêu được vai trò, đặc điểm và các nhân tố ảnh hưởng đến phát triển, phân bố dịch vụ.',
        'Giải thích được sự phát triển, phân bố của giao thông vận tải, thương mại, du lịch.',
        'Phân tích số liệu dịch vụ; đề xuất phát triển dịch vụ phù hợp với địa phương.',
      ],
      [
        'Môi trường và tài nguyên thiên nhiên; phát triển bền vững; tăng trưởng xanh',
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
        'Vị trí địa lí và phạm vi lãnh thổ Việt Nam; ảnh hưởng đến tự nhiên, kinh tế - xã hội, quốc phòng',
        'Xác định được vị trí địa lí, phạm vi lãnh thổ (đất liền, vùng biển, vùng trời).',
        'Phân tích được ảnh hưởng của vị trí địa lí và phạm vi lãnh thổ đến tự nhiên, kinh tế - xã hội.',
        'Vận dụng kiến thức để lập luận về chủ quyền biển đảo và phát triển kinh tế.',
      ],
      [
        'Thiên nhiên nhiệt đới ẩm gió mùa; địa hình, khí hậu, sông ngòi, đất, sinh vật; sự phân hóa thiên nhiên',
        'Trình bày được đặc điểm địa hình, khí hậu, sông ngòi, đất, sinh vật Việt Nam.',
        'Giải thích được tính nhiệt đới ẩm gió mùa và sự phân hóa đa dạng của thiên nhiên.',
        'Phân tích bản đồ, biểu đồ, bảng số liệu về khí hậu, thủy văn; liên hệ thiên nhiên địa phương.',
      ],
      [
        'Sử dụng hợp lí tài nguyên thiên nhiên; bảo vệ môi trường; phòng chống thiên tai; ứng phó biến đổi khí hậu',
        'Nêu được hiện trạng sử dụng tài nguyên, các vấn đề môi trường, các loại thiên tai ở Việt Nam.',
        'Giải thích nguyên nhân, hậu quả của suy thoái tài nguyên, thiên tai; vai trò của bảo vệ môi trường.',
        'Đề xuất và vận dụng giải pháp bảo vệ tài nguyên, môi trường, ứng phó biến đổi khí hậu ở địa phương.',
      ],
      [
        'Dân số, lao động và việc làm; đô thị hóa; vấn đề dân cư ở Việt Nam',
        'Trình bày được đặc điểm dân số, nguồn lao động, việc làm và đô thị hóa.',
        'Giải thích được ảnh hưởng của dân số, lao động, đô thị hóa đến kinh tế - xã hội.',
        'Phân tích số liệu, biểu đồ; đề xuất giải pháp giải quyết việc làm, nâng cao chất lượng dân số.',
      ],
      [
        'Nông nghiệp, lâm nghiệp, thủy sản: nhân tố ảnh hưởng, ngành trồng trọt, chăn nuôi, lâm nghiệp, thủy sản',
        'Nêu được các nhân tố, đặc điểm phát triển, phân bố nông nghiệp, lâm nghiệp, thủy sản.',
        'Giải thích được sự phát triển, phân bố và xu hướng của từng ngành; ý nghĩa của nông nghiệp công nghệ cao.',
        'Phân tích bảng số liệu, biểu đồ; đề xuất giải pháp phát triển nông nghiệp bền vững.',
      ],
      [
        'Công nghiệp: cơ cấu ngành, các ngành công nghiệp chủ yếu, tổ chức lãnh thổ công nghiệp',
        'Nêu được đặc điểm, cơ cấu và phân bố công nghiệp; các ngành chủ yếu.',
        'Giải thích được sự phát triển, phân bố của các ngành, trung tâm công nghiệp.',
        'Phân tích số liệu, biểu đồ công nghiệp; đánh giá tác động của công nghiệp hóa đến môi trường.',
      ],
      [
        'Dịch vụ: giao thông vận tải, bưu chính viễn thông, thương mại, du lịch',
        'Trình bày được đặc điểm, phân bố của giao thông vận tải, viễn thông, thương mại, du lịch.',
        'Giải thích được sự phát triển, phân bố các ngành dịch vụ; tiềm năng du lịch.',
        'Phân tích số liệu dịch vụ; đề xuất giải pháp phát triển du lịch, thương mại ở địa phương.',
      ],
      [
        'Vùng Trung du và miền núi Bắc Bộ; Đồng bằng sông Hồng: thế mạnh, hạn chế, các ngành kinh tế',
        'Xác định được vị trí, nêu được thế mạnh, hạn chế và các ngành kinh tế nổi bật của hai vùng.',
        'Giải thích được sự phát triển, phân bố các ngành kinh tế; ý nghĩa của vùng kinh tế trọng điểm.',
        'Phân tích bản đồ, số liệu; đề xuất hướng phát triển kinh tế bền vững của mỗi vùng.',
      ],
      [
        'Vùng Bắc Trung Bộ; Duyên hải Nam Trung Bộ; Tây Nguyên: thế mạnh, hạn chế, các ngành kinh tế',
        'Xác định được vị trí, nêu được thế mạnh, hạn chế và các ngành kinh tế nổi bật của ba vùng.',
        'Giải thích được sự phát triển, phân bố các ngành kinh tế, vai trò của kinh tế biển, cây công nghiệp.',
        'Phân tích bản đồ, số liệu; đề xuất giải pháp phát triển kinh tế - xã hội bền vững.',
      ],
      [
        'Vùng Đông Nam Bộ; Đồng bằng sông Cửu Long: thế mạnh, hạn chế, các ngành kinh tế',
        'Xác định được vị trí, nêu được thế mạnh, hạn chế và các ngành kinh tế nổi bật của hai vùng.',
        'Giải thích được sự phát triển, phân bố các ngành; vai trò của vùng kinh tế trọng điểm phía Nam.',
        'Phân tích bản đồ, số liệu; đề xuất giải pháp thích ứng biến đổi khí hậu, phát triển bền vững.',
      ],
      [
        'Phát triển kinh tế biển đảo; bảo vệ chủ quyền biển đảo Việt Nam',
        'Nêu được tiềm năng, các ngành kinh tế biển và vấn đề chủ quyền biển đảo.',
        'Giải thích được ý nghĩa của phát triển kinh tế biển gắn với bảo vệ chủ quyền, an ninh quốc phòng.',
        'Vận dụng kiến thức lập luận về phát triển kinh tế biển bền vững và bảo vệ chủ quyền biển đảo.',
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
    'tính toán số liệu địa lí đặc thù từ bảng số liệu (mật độ dân số, tỉ suất gia tăng dân số tự nhiên, tỉ trọng cơ cấu, tốc độ tăng trưởng, cán cân xuất nhập khẩu, bình quân theo đầu người, năng suất, sản lượng, biên độ nhiệt, múi giờ…) ra một số',
  'Giáo dục kinh tế và pháp luật':
    'tính toán kinh tế đặc thù (lãi suất, thuế, lợi nhuận, tăng trưởng, lạm phát, tỉ lệ thất nghiệp…) ra một số',
  'Tin học': 'tính toán đặc thù tin học (dung lượng, đổi cơ số, số lần lặp…) ra một số',
  'Công nghệ': 'tính toán kĩ thuật đặc thù (công suất, tỉ số truyền, điện năng, hệ số…) ra một số',
};

export const QUESTION_RULES_TEXT = `I. NGUYÊN TẮC CHUNG (trắc nghiệm khách quan): phù hợp mục tiêu dạy học, kiến thức, kĩ năng cần kiểm tra; ngôn ngữ rõ ràng, chính xác, không nhiều cách hiểu; khách quan, chấm nhất quán; có tính phân biệt học sinh giỏi và yếu; bám chuẩn kiến thức, kĩ năng và yêu cầu cần đạt trong SGK và chương trình; mỗi câu (mỗi ý) chỉ kiểm tra một đơn vị kiến thức; không đưa ý kiến chủ quan hoặc kiến thức ngoài chương trình; tránh từ tuyệt đối hoặc mơ hồ (hoàn toàn, tuyệt đối, tất cả, duy nhất, luôn luôn, chủ yếu, nguyên nhân chính, rất lớn, cân đối, thường, có thể, phần lớn, đa số, đôi khi) nếu không thật cần; thuật ngữ khoa học chính xác, thống nhất, không dùng từ địa phương, viết tắt, từ nói miệng; chính tả, dấu câu chuẩn; các câu độc lập, câu sau không gợi ý đáp án cho câu trước; câu dễ không lộ đáp án, câu khó không đánh đố bằng mẹo chữ; định hướng năng lực, phần dẫn đủ bối cảnh.
II. NHIỀU LỰA CHỌN (4 phương án A, B, C, D, chỉ 1 đáp án đúng; mục tiêu nhận biết, thông hiểu): phần dẫn có thể là câu hỏi (kết thúc bằng dấu hỏi chấm) hoặc câu dẫn chưa hoàn chỉnh mà phương án điền vào tạo thành MỘT CÂU HOÀN CHỈNH (không nhất thiết phải có dấu hỏi chấm); câu dẫn loại này KHÔNG kết thúc bằng bất kỳ kí hiệu nào (không dấu hai chấm, dấu phẩy, dấu chấm, dấu ba chấm), phương án nối trực tiếp vào từ cuối của câu dẫn để thành một câu hoặc mệnh đề hoàn chỉnh; ngắn gọn, đủ thông tin, chỉ một ý chính; không để từ khóa quyết định lặp lại nguyên văn trong đáp án đúng; nếu dùng phủ định (không, chưa, sai) phải VIẾT HOA hoặc in đậm; phương án nhiễu hợp lí, giống đáp án đúng nhưng sai về bản chất, xây từ lỗi sai phổ biến; 4 phương án tương đương độ dài, đồng nhất hình thức (từ loại, cấu trúc), cùng phạm vi khái niệm; tránh đáp án đúng dài vượt trội, phương án chồng chéo, "tất cả đều đúng/sai".
III. ĐÚNG/SAI (Phần II - theo đúng chuẩn cấu trúc của Bộ GD&ĐT): Mỗi câu gồm phần dẫn, 1 ngữ liệu chuẩn chính thống (đoạn trích văn bản, bảng số liệu, biểu đồ thực tế từ Sách giáo khoa hoặc các cơ quan uy tín như Tổng cục Thống kê, Bộ Giáo dục và Đào tạo,...) với nguồn trích dẫn ĐẦY ĐỦ, RÕ RÀNG, HẠN CHẾ TỐI ĐA VIẾT TẮT (ví dụ: 'Nguồn: Sách giáo khoa Địa lí 12, Nhà xuất bản Giáo dục Việt Nam', 'Nguồn: Tổng cục Thống kê', 'Nguồn: Bộ Giáo dục và Đào tạo') và 4 ý a, b, c, d (mỗi ý là một khẳng định độc lập, đúng hoặc sai hoàn toàn; kết hợp hợp lý các mức độ Nhận biết, Thông hiểu, Vận dụng; không đều đúng hoặc đều sai).
IV. TRẢ LỜI NGẮN (Phần III chỉ có MỘT dạng câu hỏi là TÍNH TOÁN): mỗi câu là một bài toán yêu cầu thực hiện chuỗi suy luận và tính ra một giá trị số, thí sinh điền kết quả (số nguyên hoặc số thập phân); không hỏi nhớ lại khái niệm, không điền từ hay cụm từ; lời dẫn rõ ràng, tránh lấy nguyên văn sách giáo khoa; đáp án ngắn gọn, duy nhất, nêu đơn vị đo hoặc “chỉ điền phần số”; nêu quy ước làm tròn; loại bỏ may rủi.
V. MỨC ĐỘ NHẬN THỨC: Biết: nhắc lại, mô tả hoặc nhận diện trực tiếp khái niệm, công thức. Hiểu: kết nối, giải thích hoặc áp dụng trực tiếp kiến thức vào tình huống quen thuộc. Vận dụng: giải quyết vấn đề thực tiễn mới, tổng hợp kiến thức.
VI. BỔ SUNG KĨ THUẬT: phần dẫn nêu một ý niệm hoàn chỉnh, học sinh đọc là hình dung được yêu cầu; hạn chế phủ định, nếu bắt buộc (không đúng, ngoại trừ) thì từ phủ định VIẾT HOA, in đậm và in nghiêng; không phủ định kép; phương án nhiễu hợp lí, hấp dẫn tương đương, không ngô nghê, không sai kiến thức cơ bản lộ liễu; không để đáp án đúng có cấu trúc ngữ pháp đặc biệt hoặc từ khóa lặp lại từ phần dẫn mà phương án nhiễu không có; phương án chứa chữ số, mốc thời gian, dữ liệu định lượng sắp xếp tăng dần hoặc giảm dần; không dùng "Tất cả các đáp án trên đều đúng", "Cả A và B đều đúng", "Không có đáp án nào đúng". Câu Đúng/Sai: Ngữ liệu chuẩn xác theo đúng cách ra đề của Bộ GDĐT; 4 ý a, b, c, d sắp xếp theo cấp độ tư duy từ dễ đến khó, ý a, b ở mức Biết hoặc Hiểu, ý c, d ở mức Vận dụng (ghi mức của từng ý ở trường "m"); ngữ liệu chung đủ sâu để khai thác 4 phán đoán độc lập. Câu trả lời ngắn: kết quả là một số (nguyên hoặc thập phân), chỉ gồm câu hỏi tính toán; nếu kết quả thập phân dài thì phần dẫn bắt buộc quy ước làm tròn (ví dụ làm tròn đến hàng phần trăm); nêu rõ đơn vị đo (ví dụ theo cm3) hoặc "chỉ điền phần số".
VII. QUY ĐỊNH HÌNH THỨC BẮT BUỘC: mỗi phương án phần I và mỗi ý phần II đều kết thúc bằng dấu chấm; ngữ liệu phần II và dòng trích dẫn nguồn cũng kết thúc bằng dấu chấm; phần I: nếu phần dẫn kết thúc bằng dấu hỏi chấm (?) thì chữ cái đầu của mỗi phương án viết hoa, nếu không thì viết thường (trừ tên riêng, từ viết tắt); câu dẫn chưa hoàn chỉnh (kết thúc không có kí hiệu nào) kết hợp với phương án thành một câu hoặc mệnh đề hoàn chỉnh thì phương án viết thường và kết thúc bằng dấu chấm; phần II: chữ cái đầu của mỗi ý a), b), c), d) đều viết hoa. Không ghi nhãn A., B. trong nội dung phương án.`;

export const FOOTNOTES_TEXT: Record<number, string> = {
  2: 'Mỗi câu hỏi bao gồm 4 ý nhỏ, mỗi ý học sinh phải chọn đúng hoặc sai. Một số tài liệu xếp loại câu hỏi này vào loại Nhiều lựa chọn phức hợp hoặc Nhiều lựa chọn có nhiều phương án đúng.',
  3: 'Đối với môn học không sử dụng dạng này thì chuyển toàn bộ số điểm cho dạng “Đúng – Sai”.',
  4: 'Có ở trong một số ô của ma trận, thể hiện số câu hỏi hoặc câu hỏi số bao nhiêu.',
  5: 'Lựa chọn sao cho được khoảng 3,0 điểm, tương ứng với tỉ lệ khoảng 30%; tương tự như thế đối với các dạng khác.',
  6: 'Có ở trong một số ô của bản đặc tả, ghi tắt tên của năng lực (đã được quy định trong chương trình môn học/hoạt động giáo dục).',
};
