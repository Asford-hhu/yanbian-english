/* ============================================================
   砚边 · 内置精选学习内容
   内容为依据四六级/大英赛常见考点人工整理的精选样例，
   覆盖阅读、写作高级表达、语境词汇、听说、模考、资源导航。
   ============================================================ */

const DATA = {

  /* ---------- 写作高级表达库（按功能分类，非模板套路） ---------- */
  writing: [
    // 开头 / 引入
    { cat: '开头引入', en: 'In an era when the boundary between the virtual and the real is increasingly blurred, the issue has assumed a new urgency.', zh: '在虚拟与现实的界限日渐模糊的时代，这一议题获得了新的紧迫性。', tip: '用时代背景引入，比 Nowadays 更有质感' },
    { cat: '开头引入', en: 'Few would dispute that the advent of the smartphone has fundamentally reshaped the way we communicate.', zh: '几乎无人否认，智能手机的出现从根本上重塑了我们的交流方式。', tip: 'Few would dispute that… 是个稳妥又有力的判断句' },
    { cat: '开头引入', en: 'The question of whether… is one that has long divided public opinion.', zh: '是否……这一问题长期使舆论分歧。', tip: '适合引出有争议的话题' },

    // 论证 / 因果
    { cat: '论证说理', en: 'A closer examination reveals that the causal link is far from straightforward.', zh: '更仔细的审视表明，其因果关系远非简单直接。', tip: '用于转折、深化论证' },
    { cat: '论证说理', en: 'This phenomenon can be attributed to a confluence of factors, of which convenience is but the most visible.', zh: '这一现象可归因于多重因素的汇聚，其中便利只是最显性的一个。', tip: 'a confluence of factors 比 many reasons 高级' },
    { cat: '论证说理', en: 'To be sure, the benefits are considerable; yet they are not without their costs.', zh: '诚然，益处可观，但并非没有代价。', tip: '先让步再转折，逻辑更严密' },
    { cat: '论证说理', en: 'Nowhere is this more evident than in the realm of education.', zh: '这一点在教育领域体现得最为明显。', tip: 'Nowhere is this more evident than… 强调句型' },

    // 举例 / 数据
    { cat: '举例佐证', en: 'A case in point is the rapid proliferation of online learning platforms over the past decade.', zh: '一个典型的例子是过去十年在线学习平台的迅速扩散。', tip: 'A case in point is… 引出例子' },
    { cat: '举例佐证', en: 'Statistics released by the ministry paint a rather telling picture.', zh: '该部门发布的数据描绘出一幅相当说明问题的图景。', tip: 'telling = 很有说服力的，替换 important' },

    // 转折 / 对比
    { cat: '转折对比', en: 'Yet this rosy picture overlooks a more unsettling reality lurking beneath the surface.', zh: '然而这幅乐观图景忽视了我表面之下潜藏的更令人不安的现实。', tip: 'lurk beneath the surface 极具画面感' },
    { cat: '转折对比', en: 'Whereas the old model privileged efficiency, the new one places a premium on adaptability.', zh: '旧模式重效率，而新模式看重适应力。', tip: 'place a premium on = 高度重视' },
    { cat: '转折对比', en: 'The trade-off, then, is not between right and wrong, but between two competing goods.', zh: '因此，权衡并非对与错之间，而是两种相互竞争的价值之间。', tip: 'trade-off 是六级/大英赛高频词' },

    // 结尾 / 升华
    { cat: '结尾升华', en: 'Ultimately, the question is not whether we can afford to act, but whether we can afford not to.', zh: '归根结底，问题不在于我们是否承担得起行动的成本，而在于我们是否承担得起不行动的代价。', tip: '经典结尾修辞，强烈推荐背诵' },
    { cat: '结尾升华', en: 'Only by striking a delicate balance between the two can we hope to reap the long-term rewards.', zh: '唯有在两者之间取得微妙平衡，我们才有望收获长远回报。', tip: 'Only by… can we 倒装句，阅卷加分' },
    { cat: '结尾升华', en: 'The path ahead remains fraught with uncertainty, yet a measured optimism is warranted.', zh: '前路仍充满不确定，但审慎的乐观是必要的。', tip: 'fraught with = 充满（负面），warranted = 有理由的' },

    // 高级替换词
    { cat: '高级替换', en: 'increasingly → progressively / ever more', zh: '越来越…… 的升级表达', tip: '避免全篇 increasingly' },
    { cat: '高级替换', en: 'important → pivotal / indispensable / paramount', zh: '重要的（pivotal 关键的；indispensable 不可或缺的；paramount 首要的）', tip: '按语气强弱选择' },
    { cat: '高级替换', en: 'show → demonstrate / illustrate / underscore', zh: '显示（underscore 强调，语气最强）', tip: 'underscore 常配 evidence/data' },
    { cat: '高级替换', en: 'many people → a multitude of / a wide spectrum of', zh: '许多人（a spectrum of 强调范围广）', tip: 'a wide spectrum of opinion 常用' },
    { cat: '高级替换', en: 'because → in that / by virtue of / given that', zh: '因为（更书面）', tip: 'in that 后接完整句，写作高分' },
    { cat: '高级替换', en: 'solve → address / tackle / mitigate', zh: '解决（mitigate 侧重缓解）', tip: 'tackle a problem 搭配地道' },
    { cat: '高级替换', en: 'good → beneficial / favourable / salutary', zh: '好的（salutary 益处的，较高级）', tip: 'salutary effect 是高分表达' }
  ],

  /* ---------- 语境化词汇（句子中学，非孤立词表） ---------- */
  vocab: [
    { word: 'resilient', pos: 'adj.', sentence: 'Children who are raised to be resilient tend to bounce back from setbacks with remarkable speed.', meaning: '有韧性的，能迅速恢复的', tip: 'bounce back 是它的最佳搭档' },
    { word: 'nuance', pos: 'n.', sentence: 'The report fails to capture the subtle nuances of the debate, reducing it to a simple binary.', meaning: '细微差别', tip: 'capture the nuances 是写作常用搭配' },
    { word: 'mitigate', pos: 'v.', sentence: 'Planting trees can mitigate, though not entirely reverse, the effects of urban heat.', meaning: '减轻，缓解', tip: 'mitigate 后面常接负面效应' },
    { word: 'ubiquitous', pos: 'adj.', sentence: 'Smartphones have become so ubiquitous that it is hard to imagine life without them.', meaning: '无处不在的', tip: '比 everywhere 高级很多' },
    { word: 'scrutiny', pos: 'n.', sentence: 'The policy came under intense public scrutiny after the scandal broke.', meaning: '仔细审查，密切关注', tip: 'under scrutiny 固定搭配' },
    { word: 'paradigm', pos: 'n.', sentence: 'The discovery triggered a paradigm shift in the way scientists approach the problem.', meaning: '范式，典范', tip: 'paradigm shift 是高频词组' },
    { word: 'catalyst', pos: 'n.', sentence: 'The incident acted as a catalyst for sweeping reforms across the industry.', meaning: '催化剂，促进因素', tip: 'act as a catalyst for 推动……' },
    { word: 'pragmatic', pos: 'adj.', sentence: 'Rather than clinging to ideals, she took a pragmatic approach to the budget.', meaning: '务实的', tip: '与 idealistic 相对' },
    { word: 'deteriorate', pos: 'v.', sentence: 'Air quality in the city has deteriorated markedly over the past decade.', meaning: '恶化', tip: '反义词 improve，阅读高频' },
    { word: 'inevitable', pos: 'adj.', sentence: 'Some degree of failure is inevitable in any meaningful endeavour.', meaning: '不可避免的', tip: '写作里 Inevitably, … 可放句首' },
    { word: 'coherent', pos: 'adj.', sentence: 'A coherent argument is worth far more than a collection of impressive but disjointed facts.', meaning: '连贯的，条理清晰的', tip: 'disjointed 是其反义，可一起记' },
    { word: 'exacerbate', pos: 'v.', sentence: 'Poor urban planning has only exacerbated the traffic congestion.', meaning: '使恶化，加剧', tip: '与 mitigate 是一对反义词' },
    { word: 'prevalent', pos: 'adj.', sentence: 'The belief that money buys happiness is particularly prevalent among young adults.', meaning: '普遍的，流行的', tip: '比 common 更书面' },
    { word: 'ambiguous', pos: 'adj.', sentence: 'The wording of the contract was deliberately ambiguous, leaving room for interpretation.', meaning: '模棱两可的', tip: '名词形式 ambiguity 也常考' },
    { word: 'threshold', pos: 'n.', sentence: 'Sales have finally crossed the threshold of one million copies.', meaning: '门槛，临界点', tip: 'cross the threshold 跨过门槛' },
    { word: 'contemplate', pos: 'v.', sentence: 'Before making such a decision, one must contemplate the long-term consequences.', meaning: '深思，仔细考虑', tip: '比 think about 正式' }
  ],

  /* ---------- 阅读文章 + 题目 ---------- */
  reading: [
    {
      id: 'r1',
      level: '六级',
      title: 'The Quiet Power of Deep Work',
      meta: '约 320 词 · 建议用时 8 分钟',
      body: [
        'In an office culture that glorifies busyness, the ability to focus without distraction has become a rare and valuable commodity. Cal Newport, who popularised the term "deep work", defines it as professional activity performed in a state of distraction-free concentration that pushes your cognitive capabilities to their limit.',
        'The case for deep work is not merely philosophical. Neuroscientists have long understood that the brain consolidates learning and forges new neural connections most effectively during periods of sustained attention. When we switch constantly between emails, messages and documents, we do not accomplish several things at once; we merely switch rapidly between half-finished tasks, leaving a residue of attention behind at each stop.',
        'This residue has a name: attention residue. Research suggests that after an interruption, it can take the brain a considerable amount of time to return to full focus on the original task. A worker who checks their phone every few minutes may believe they are being productive, when in fact they are operating at a fraction of their cognitive capacity.',
        'Cultivating deep work is therefore less about working longer hours and more about working with deliberate intention. Practical strategies include scheduling fixed blocks of uninterrupted time, setting clear goals for each session, and treating distraction not as an inconvenience but as a genuine threat to the quality of one\'s output.',
        'Perhaps the most striking thing about deep work is that it is becoming a competitive advantage precisely because so few people are willing to do it. In an economy that rewards shallow multitasking, the person who can think deeply and consistently may find themselves in unexpectedly high demand.'
      ],
      questions: [
        { q: 'According to the passage, what is "deep work"?', opts: ['A. Work done in a busy office environment', 'B. Professional activity with full concentration', 'C. A popular management technique', 'D. Work that requires multiple cognitive skills'], answer: 1, why: '第一段明确定义：distraction-free concentration，即全神贯注的专业活动。' },
        { q: 'What does "attention residue" (Para. 3) most probably mean?', opts: ['A. The leftover focus after an interruption', 'B. A reward for efficient multitasking', 'C. A memory technique', 'D. The total time spent on a task'], answer: 0, why: '第三段解释：切换任务后大脑需要时间恢复，残留的注意力即 attention residue。' },
        { q: 'Which strategy does the author recommend for deep work?', opts: ['A. Checking emails frequently', 'B. Working longer hours', 'C. Scheduling uninterrupted time blocks', 'D. Avoiding all forms of technology'], answer: 2, why: '第四段列举策略，首条即 scheduling fixed blocks of uninterrupted time。' },
        { q: 'What is the author\'s attitude towards deep work?', opts: ['A. Doubtful', 'B. Favourable', 'C. Indifferent', 'D. Critical'], answer: 1, why: '全文强调其价值，末段称其为 competitive advantage，态度显然是支持的（favourable）。' }
      ]
    },
    {
      id: 'r2',
      level: '四级',
      title: 'Why We Forget (and Why It Matters)',
      meta: '约 280 词 · 建议用时 7 分钟',
      body: [
        'Forgetting is usually treated as a failure of memory, something to be prevented through revision and repetition. Yet forgetting is not simply the decay of information; it is an active process that shapes what we know.',
        'Psychologists distinguish between two kinds of forgetting. The first is passive decay, in which memories fade simply because they are not used. The second, more interesting kind, is interference: newer information competes with older information, and the two become entangled. This is why studying two similar subjects back to back can be so ineffective.',
        'Far from being a defect, forgetting serves a useful purpose. By discarding details that are no longer relevant, the brain makes room for new learning and highlights what truly matters. Some researchers even argue that a certain amount of forgetting is essential for creativity, since it allows us to rethink problems unburdened by previous assumptions.',
        'The practical lesson is subtle. Rather than simply repeating information more often, students may benefit from spacing their study sessions and mixing different topics. This "desirable difficulty" feels harder in the moment but produces more durable learning in the long run.',
        'Forgetting, then, is not the enemy of learning. Understood properly, it is one of its most important tools.'
      ],
      questions: [
        { q: 'How does the author view forgetting?', opts: ['A. As a total failure of memory', 'B. As a useful and active process', 'C. As something that cannot be studied', 'D. As a recent discovery'], answer: 1, why: '首段末句及第三段：forgetting is an active process that shapes what we know，并 serves a useful purpose。' },
        { q: 'What is the difference between the two kinds of forgetting?', opts: ['A. One is fast, the other is slow', 'B. One is passive decay, the other is interference', 'C. One happens to students, the other to teachers', 'D. One is permanent, the other is temporary'], answer: 1, why: '第二段明确区分 passive decay 与 interference。' },
        { q: 'What does "desirable difficulty" refer to?', opts: ['A. A study method that feels hard but works', 'B. Difficulty that should be avoided', 'C. A problem in memory research', 'D. Forgetting that cannot be prevented'], answer: 0, why: '第四段：feels harder in the moment but produces more durable learning。' },
        { q: 'Which study approach would the author most likely support?', opts: ['A. Cramming the night before', 'B. Studying similar subjects together', 'C. Spacing sessions and mixing topics', 'D. Repeating without thinking'], answer: 2, why: '第四段直接建议 spacing study sessions and mixing different topics。' }
      ]
    },
    {
      id: 'r3',
      level: '大英赛',
      title: 'The City as an Organism',
      meta: '约 300 词 · 大英赛风格 · 建议用时 8 分钟',
      body: [
        'A city is often described as a machine: a system of parts designed to perform specific functions. Yet this metaphor is increasingly inadequate. A city is better understood as an organism, a living entity that grows, adapts and, on occasion, falls ill.',
        'Like a living body, a city has a circulatory system. Roads and railways carry people and goods as blood carries oxygen. When this circulation is blocked — by congestion, by poor planning — the whole system suffers. And like a body, a city has an immune system: the hospitals, the emergency services, the social networks that help it recover from shocks.',
        'The metaphor has a further implication. An organism cannot be understood by examining its parts in isolation. A heart removed from a body is merely a pump; a neighbourhood studied apart from the city that contains it tells only half the story. This is why the most successful urban policies are those that consider the city as a whole.',
        'Yet metaphors can mislead as well as illuminate. If we think of a city as an organism, we may be tempted to believe it grows according to natural laws that we cannot alter. In fact, cities are shaped by countless human decisions, each of which can be examined and changed.',
        'To see a city as an organism, then, is not to surrender to fate. It is to recognise the intricate interdependence of its parts — and to accept the responsibility that comes with understanding it.'
      ],
      questions: [
        { q: 'Why does the author find the "machine" metaphor inadequate?', opts: ['A. Machines are too simple', 'B. It ignores that a city grows and adapts like a living thing', 'C. Machines cannot be built by people', 'D. It is too difficult for students'], answer: 1, why: '首段：city is better understood as an organism that grows, adapts and falls ill，机械隐喻无法体现这些。' },
        { q: 'What does the "immune system" of a city refer to?', opts: ['A. Its roads and railways', 'B. Its hospitals and emergency services', 'C. Its natural environment', 'D. Its government buildings'], answer: 1, why: '第二段末：hospitals, emergency services, social networks that help it recover from shocks。' },
        { q: 'What warning does the author give about metaphors?', opts: ['A. They are always useless', 'B. They can mislead as well as illuminate', 'C. They should be avoided in writing', 'D. They only apply to biology'], answer: 1, why: '第四段首句直接指出：metaphors can mislead as well as illuminate。' },
        { q: 'What is the main idea of the passage?', opts: ['A. Cities should be planned as machines', 'B. Understanding a city as a living organism reveals its interdependence', 'C. Urban problems are impossible to solve', 'D. Metaphors should never be used'], answer: 1, why: '全文围绕"城市作为有机体"展开，末段点明 recognize the intricate interdependence。' }
      ]
    }
  ],

  /* ---------- 听说训练文本（配合 TTS） ---------- */
  listening: [
    {
      id: 'l1',
      title: 'A Conversation at the Café',
      level: '日常 · 语速适中',
      text: 'Waitress: Good afternoon! What can I get for you today?\nCustomer: Hi, could I have a medium latte, please? And could you make it with oat milk?\nWaitress: Of course. Anything to eat with that? Our cinnamon rolls are fresh out of the oven.\nCustomer: Oh, they smell amazing. I\'ll take one. Could you heat it up?\nWaitress: Sure thing. That\'ll be eight fifty. Can I get your name for the order?\nCustomer: It\'s Sarah. S-A-R-A-H.\nWaitress: Perfect, Sarah. It\'ll be ready in about five minutes.',
      notes: '注意 could I… / would you… 的委婉请求句式；fresh out of the oven 是地道表达。',
      blanks: [
        { sent: 'Could I have a medium ______, please?', answer: 'latte' },
        { sent: 'Could you make it with ______ milk?', answer: 'oat' },
        { sent: 'That\'ll be eight ______.', answer: 'fifty' }
      ]
    },
    {
      id: 'l2',
      title: 'Campus Announcement',
      level: '校园 · 四六级常见场景',
      text: 'Attention, students. This is a reminder that the library will be closing early this Friday at five p.m. for annual maintenance. All books must be returned by Thursday evening. If you need to study late, the reading room in the Student Centre will remain open until eleven. Also, the writing workshop led by Professor Chen has been moved to Room 302. Thank you for your attention, and have a productive week.',
      notes: '校园广播是四级听力高频场景。注意时间、地点、变更信息——考试常考细节。',
      blanks: [
        { sent: 'The library closes early this ______ at five p.m.', answer: 'Friday' },
        { sent: 'The reading room stays open until ______.', answer: 'eleven' },
        { sent: 'The writing workshop moved to Room ______.', answer: '302' }
      ]
    },
    {
      id: 'l3',
      title: 'The Weather and Weekend Plans',
      level: '日常对话 · 连读练习',
      text: 'A: So, what are you up to this weekend?\nB: Not much. Maybe I\'ll go for a hike if the weather holds. What about you?\nA: I was thinking of catching a movie. They\'re showing that new thriller everyone\'s talking about.\nB: I heard it was a bit of a let-down, honestly. The review said the ending was predictable.\nA: Really? Well, in that case, maybe we could just grab coffee and catch up instead.\nB: That sounds like a much better plan.',
      notes: '留意口语弱读：going to→gonna，a bit of a 连读。a let-down 意为"令人失望的事"。',
      blanks: [
        { sent: 'Maybe I\'ll go for a hike if the weather ______.', answer: 'holds' },
        { sent: 'They\'re showing that new ______ everyone\'s talking about.', answer: 'thriller' },
        { sent: 'I heard it was a bit of a ______.', answer: 'let-down' }
      ]
    }
  ],

  /* ---------- 模考卷（精简计时） ---------- */
  mock: {
    title: '四级模拟小测 · 精编版',
    sections: [
      {
        name: '阅读理解',
        minutes: 10,
        questions: [
          { q: 'The word "resilient" in the passage is closest in meaning to ______.', opts: ['A. flexible', 'B. fragile', 'C. adaptable', 'D. stubborn'], answer: 2, why: 'resilient 意为"有韧性的、能恢复的"，与 adaptable（适应力强的）最接近。' },
          { q: 'The author mentions deep work mainly to ______.', opts: ['A. criticise modern offices', 'B. illustrate the value of focus', 'C. introduce a new technology', 'D. compare different jobs'], answer: 1, why: '提到 deep work 是为了说明专注的价值。' },
          { q: 'According to the passage, forgetting can be ______.', opts: ['A. harmful', 'B. beneficial', 'C. avoidable', 'D. meaningless'], answer: 1, why: '文章论证遗忘是有用的主动过程。' }
        ]
      },
      {
        name: '词汇语法',
        minutes: 8,
        questions: [
          { q: 'The new policy has ______ a heated debate among students.', opts: ['A. sparked', 'B. settled', 'C. calmed', 'D. ended'], answer: 0, why: 'spark a debate 意为"引发争论"，搭配地道。' },
          { q: 'Hardly ______ the exam begun when the lights went out.', opts: ['A. had', 'B. did', 'C. has', 'D. was'], answer: 0, why: 'Hardly had…when… 是固定倒装结构，表示"一……就……"。' },
          { q: 'The report is ______ worth reading twice.', opts: ['A. very', 'B. well', 'C. much', 'D. quite'], answer: 1, why: 'well worth doing 是固定搭配，意为"很值得做"。' }
        ]
      }
    ]
  },

  /* ---------- 资源导航（A+B 混合中的 B：链接到实时平台） ---------- */
  resources: [
    {
      group: '写作与词汇 · 名师方法',
      items: [
        { icon: '刘', title: '刘晓燕 · 写作 / 语法（B站）', desc: '语法与写作讲解通俗，适合建立语感与表达库', url: 'https://search.bilibili.com/all?keyword=%E5%88%98%E6%99%93%E7%87%95%20%E5%86%99%E4%BD%9C' },
        { icon: 'B', title: 'B站 · 四六级备考精选', desc: '按最新播放与好评筛选的公开课与经验分享', url: 'https://search.bilibili.com/all?keyword=%E5%9B%9B%E5%85%AD%E7%BA%A7%E5%A4%87%E8%80%83' },
        { icon: '赛', title: 'B站 · 大英赛真题讲解', desc: '大英赛题型解析与真题串讲', url: 'https://search.bilibili.com/all?keyword=%E5%A4%A7%E8%8B%B1%E8%B5%9B%20%E7%9C%9F%E9%A2%98' }
      ]
    },
    {
      group: '真题与权威资料',
      items: [
        { icon: '官', title: '全国大学英语四六级考试官网', desc: '官方报名、成绩查询与考试动态', url: 'http://cet-bm.neea.edu.cn/' },
        { icon: '赛', title: '全国大学生英语竞赛（大英赛）', desc: '竞赛官网，了解赛程、题型与奖项', url: 'https://www.chinacollegestudent.com/' },
        { icon: '词', title: '中国大学MOOC · 英语写作', desc: '高校公开课，系统提升写作能力', url: 'https://www.icourse163.org/search.htm?search=%E8%8B%B1%E8%AF%AD%E5%86%99%E4%BD%9C' }
      ]
    },
    {
      group: '词典与语料工具',
      items: [
        { icon: '有', title: '网易有道词典 · 在线版', desc: '国内访问稳定，英汉释义、真人发音与双语例句一站查', url: 'https://dict.youdao.com/' },
        { icon: '金', title: '金山词霸 · 在线词典', desc: '权威释义、搭配与海量双语例句，查词造句都方便', url: 'https://www.iciba.com/' },
        { icon: '语', title: '中国日报 · 英语点津', desc: '官方双语语料与词汇用法栏目，学地道表达与时事措辞', url: 'https://language.chinadaily.com.cn/' },
        { icon: '批', title: '批改网 · 作文自动批改', desc: '国内高校常用英文写作批改平台，提交即得分数与逐句建议', url: 'https://www.pigai.org/' }
      ]
    }
  ],

  /* ---------- 研究路径（研习页） ---------- */
  studyPath: [
    { no: 'I', title: '打底 · 语感与词汇', desc: '每天语境化记 8–10 词，配合 TTS 朗读；不孤立背单词。', target: '词汇模块 · 每日打卡' },
    { no: 'II', title: '输入 · 阅读与听力', desc: '精读范文与真题文章，积累高级表达；听力用听写+跟读练辨音。', target: '阅读 / 听说模块' },
    { no: 'III', title: '输出 · 写作表达库', desc: '按功能分类积累高级句式与替换词，收藏高频表达并定期复习。', target: '写作模块 · 收藏夹' },
    { no: 'IV', title: '巩固 · 错题与模考', desc: '错题归因、定期重练；用模考计时训练节奏，追踪正确率曲线。', target: '错题本 / 模考 / 进度' }
  ],

  /* 页脚引言轮换 */
  quotes: [
    'Language is the armory of the human mind. — Samuel Johnson',
    'A different language is a different vision of life. — Federico Fellini',
    'The limits of my language mean the limits of my world. — Wittgenstein',
    'To learn a language is to have one more window from which to look at the world. — Chinese proverb'
  ]
};
