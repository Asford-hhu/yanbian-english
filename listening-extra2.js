/* ============================================================
   砚边 · 听说训练扩展包 II（l24–l60，共 37 篇）
   场景覆盖：职场面试、医疗健康、科技学术、心理认知、生活出行、
             文化社会、经济商业、新闻播报。每篇 3 道听写填空。
   在既有 23 篇基础上累加，总计 60 篇；原有数据与渲染逻辑不变。
   ============================================================ */

window.YANBIAN_LISTENING_EXTRA2 = [
  {
    id: 'l24', title: 'Job Interview Follow-up', level: '职场 · 面试追问',
    text: "Interviewer: Thank you for coming in today. Could you tell us a little about your experience with data analysis?\nApplicant: Certainly. I worked on a sales dashboard at my previous company, and I used Excel and Python to clean the data.\nInterviewer: That sounds useful. How did you handle a situation where the data was incomplete?\nApplicant: I checked the source with the Sales team and left a clear note in the report, so nobody treated missing values as zero.\nInterviewer: Good. This role also involves weekly presentations. Are you comfortable speaking to a large group?\nApplicant: Yes. I presented to thirty colleagues every Monday, and I always prepared one slide with one clear message.\nInterviewer: Impressive. We will be in touch by Friday.",
    notes: '面试高频追问：先讲做法，再讲结果。handle a situation、be comfortable doing、be in touch 都是职场表达；数字与星期是听写考点。',
    blanks: [
      { sent: 'The applicant used Excel and ______ to clean the data.', answer: 'Python' },
      { sent: 'Missing values were not treated as ______.', answer: 'zero' },
      { sent: 'The interviewer said they would be in touch by ______.', answer: 'Friday' }
    ]
  },
  {
    id: 'l25', title: 'At the Pharmacy', level: '生活 · 药店买药',
    text: "Pharmacist: Good evening. How can I help you?\nCustomer: I have a sore throat and a mild headache. Do you have anything I can take?\nPharmacist: Are you allergic to any medication?\nCustomer: Not that I know of.\nPharmacist: Then this spray should help. Use it twice a day, and drink plenty of water.\nCustomer: How long before I feel better?\nPharmacist: Usually two or three days. If the pain gets worse, see a doctor.",
    notes: '就医场景核心句型：How can I help you / Are you allergic to / Use it twice a day。剂量与频次是四级听力细节题常考点。',
    blanks: [
      { sent: 'Use the spray twice a ______.', answer: 'day' },
      { sent: 'If the pain gets worse, see a ______.', answer: 'doctor' },
      { sent: 'The customer has a sore ______.', answer: 'throat' }
    ]
  },
  {
    id: 'l26', title: 'Booking a Hotel Room', level: '出行 · 酒店预订',
    text: "Receptionist: Hello, Hillview Hotel. How may I help you?\nGuest: I would like to book a double room for two nights, starting on the twelfth.\nReceptionist: Do you need a quiet room away from the elevator?\nGuest: Yes, that would be great. Is breakfast included?\nReceptionist: Yes, it is served from seven to nine thirty. Could I have your name, please?\nGuest: Sarah Miller. And could I check in late? My flight arrives around ten p.m.\nReceptionist: Certainly. We will keep the room for you.",
    notes: '预订场景注意 double room、be included、check in late。日期、时间和姓名拼写要听准，属于典型细节题。',
    blanks: [
      { sent: 'The guest wants a room for two ______.', answer: 'nights' },
      { sent: 'Breakfast is served from seven to nine ______.', answer: 'thirty' },
      { sent: "The guest's name is Sarah ______.", answer: 'Miller' }
    ]
  },
  {
    id: 'l27', title: 'Train Delay Announcement', level: '出行 · 车站广播',
    text: "Attention passengers. The train to Shanghai, scheduled to depart at eight fifteen, has been delayed by twenty minutes due to a signalling fault. We are sorry for the inconvenience. Passengers waiting for this service may use the lounge on the second floor, where hot drinks are available. Trains to Nanjing and Hangzhou are running on time. We will announce the new departure time as soon as we receive confirmation. Thank you for your patience.",
    notes: '广播体独白：抓原因（due to）、时长（twenty minutes）、地点（second floor）与对比信息（on time）。',
    blanks: [
      { sent: 'The train to Shanghai was delayed by ______ minutes.', answer: 'twenty' },
      { sent: 'The lounge is on the ______ floor.', answer: 'second' },
      { sent: 'Trains to Nanjing and Hangzhou are running on ______.', answer: 'time' }
    ]
  },
  {
    id: 'l28', title: 'Discussing a Group Project', level: '校园 · 小组协作',
    text: "Student A: Have you finished the literature review for our group project?\nStudent B: Almost. I found six sources, but two of them are from websites rather than journals.\nStudent A: We should use journal articles for the theory section. Could you look for two more?\nStudent B: Sure. I can do that tonight. What about the survey results?\nStudent A: I will put them into charts. We need to explain why the sample was small.\nStudent B: Good idea. Let's meet on Thursday and put everything together.",
    notes: '学术协作常用表达：literature review、peer-reviewed、rather than、put everything together。听清谁负责什么。',
    blanks: [
      { sent: 'Two of the sources are from ______ rather than journals.', answer: 'websites' },
      { sent: 'Student A will put the survey results into ______.', answer: 'charts' },
      { sent: 'They plan to meet on ______.', answer: 'Thursday' }
    ]
  },
  {
    id: 'l29', title: 'Sleep and Memory', level: '心理 · 睡眠与记忆',
    text: "Host: Today we are talking about sleep and memory. Dr. Lin, why is sleep important for learning?\nGuest: During deep sleep, the brain replays what we learned during the day and strengthens the useful connections.\nHost: So pulling an all-nighter before an exam is not a good idea?\nGuest: Exactly. Students who sleep after studying usually remember more than those who stay awake.\nHost: How many hours do adults need?\nGuest: Most adults need seven to nine hours, and regular timing matters as much as duration.\nHost: That is a useful reminder. Thank you for joining us.",
    notes: '科普访谈：抓结论句与数字。replay、strengthen、duration 为学术高频词；pull an all-nighter 是地道口语。',
    blanks: [
      { sent: 'During deep sleep, the brain ______ what we learned.', answer: 'replays' },
      { sent: 'Most adults need seven to ______ hours.', answer: 'nine' },
      { sent: 'Regular timing matters as much as ______.', answer: 'duration' }
    ]
  },
  {
    id: 'l30', title: 'Talking to the Landlord', level: '生活 · 租房报修',
    text: "Tenant: Hello, Mr. Brown. This is Lisa from apartment 4B.\nLandlord: Hi, Lisa. Is everything all right?\nTenant: The shower has been leaking since Monday, and the bathroom floor is wet every morning.\nLandlord: I am sorry to hear that. I will send a plumber tomorrow afternoon.\nTenant: Thank you. Will someone need to enter the apartment when I am out?\nLandlord: Only if you agree. I will text you first.\nTenant: That works for me. Thanks for being so quick.",
    notes: '租房场景高频：leak、plumber、enter the apartment。注意现在完成时 has been leaking 表示持续状态。',
    blanks: [
      { sent: 'The shower has been leaking since ______.', answer: 'Monday' },
      { sent: 'The landlord will send a ______ tomorrow.', answer: 'plumber' },
      { sent: 'The tenant lives in apartment ______.', answer: '4B' }
    ]
  },
  {
    id: 'l31', title: 'A Museum Audio Guide', level: '文化 · 博物馆导览',
    text: "Welcome to the City Museum. You are now standing in the East Hall, where the collection of everyday objects from the nineteenth century is displayed. Look at the small wooden box in front of you. It was used by teachers to carry chalk and notebooks between classrooms. In the next room, you will find a collection of handwritten letters written by students who studied abroad. Please allow twenty minutes for this section, and mind the step at the entrance.",
    notes: '导览独白常考方位与年代。props：the East Hall、nineteenth century、twenty minutes、mind the step。',
    blanks: [
      { sent: 'The East Hall shows objects from the ______ century.', answer: 'nineteenth' },
      { sent: 'The wooden box was used by ______.', answer: 'teachers' },
      { sent: 'Please allow ______ minutes for this section.', answer: 'twenty' }
    ]
  },
  {
    id: 'l32', title: 'Ordering at a Restaurant', level: '生活 · 餐厅点餐',
    text: "Waiter: Good evening. Are you ready to order?\nCustomer: Not quite. What is the soup of the day?\nWaiter: It is tomato and basil. Would you like a small bowl or a large one?\nCustomer: A small bowl, please. And I will have the grilled fish with vegetables.\nWaiter: Would you like anything to drink?\nCustomer: Just water, thank you. Could you bring the bill when you bring the main course?\nWaiter: Of course. I will be back in a few minutes.",
    notes: '点餐礼貌表达：Would you like...、I will have...、Could you bring...。注意小份与大份、主食与账单。',
    blanks: [
      { sent: 'The soup of the day is tomato and ______.', answer: 'basil' },
      { sent: 'The customer orders grilled ______ with vegetables.', answer: 'fish' },
      { sent: 'The customer asks for the ______ with the main course.', answer: 'bill' }
    ]
  },
  {
    id: 'l33', title: 'Job Performance Review', level: '职场 · 绩效面谈',
    text: "Manager: Let's talk about your work this quarter. Overall, your report quality has improved a lot.\nEmployee: Thank you. I have been checking my figures twice before sending them.\nManager: That shows. One area to work on is meeting deadlines. Two reports were late in September.\nEmployee: I see. The delay was caused by waiting for data from another team. I will ask earlier next time.\nManager: Good. What support do you need from me?\nEmployee: Perhaps a short meeting at the start of each month to confirm priorities.\nManager: That is reasonable. Let's try it in October.",
    notes: '绩效面谈：先肯定再提改进。deadline、priority、reasonable 是职场高频；月份与数字需听准。',
    blanks: [
      { sent: 'Two reports were late in ______.', answer: 'September' },
      { sent: 'The delay was caused by waiting for ______.', answer: 'data' },
      { sent: 'They will try the new plan in ______.', answer: 'October' }
    ]
  },
  {
    id: 'l34', title: 'Urban Trees and Heat', level: '环境 · 科研新闻',
    text: "A new study released this week shows that urban trees can lower street temperatures by up to two degrees Celsius. Researchers compared satellite images with ground measurements in twelve cities and found that neighbourhoods with more shade had fewer heat-related emergency calls. The team recommends planting trees along busy roads and school playgrounds. City planners say the next step is to choose species that need little water and can survive hotter summers.",
    notes: '环境类新闻：抓研究对象、方法与结论。urban、satellite、ground measurements、species 属学术高频词。',
    blanks: [
      { sent: 'Urban trees can lower street temperatures by up to two degrees ______.', answer: 'Celsius' },
      { sent: 'The study compared satellite images with ground ______.', answer: 'measurements' },
      { sent: 'The team recommends planting trees along busy roads and school ______.', answer: 'playgrounds' }
    ]
  },
  {
    id: 'l35', title: 'Rescheduling a Dental Visit', level: '生活 · 电话改约',
    text: "Receptionist: Good morning, Bright Dental Clinic. How can I help you?\nCaller: Hello. I have an appointment with Dr. Chen on Wednesday, but I have to reschedule.\nReceptionist: Certainly. What day would suit you?\nCaller: Could I come on Thursday afternoon, preferably after three?\nReceptionist: Let me check. Thursday at three thirty is available.\nCaller: That is perfect. Could you confirm the address again?\nReceptionist: It is twenty-two King Street, opposite the post office.",
    notes: '电话改约关键：reschedule、what day would suit you、available、confirm。时间与门牌号是必考点。',
    blanks: [
      { sent: 'The caller wants to come on ______ afternoon.', answer: 'Thursday' },
      { sent: 'The new appointment is at three ______.', answer: 'thirty' },
      { sent: 'The clinic is opposite the ______.', answer: 'post office' }
    ]
  },
  {
    id: 'l36', title: 'Library Reference Desk', level: '校园 · 图书馆咨询',
    text: "Librarian: Hello. How can I help you today?\nStudent: I am looking for articles about online learning, but I am not sure where to start.\nLibrarian: Have you tried the academic database on the library website?\nStudent: Yes, but I got too many results. How can I narrow them down?\nLibrarian: Try limiting the search to peer-reviewed journals published after 2020. You can also choose the subject education technology.\nStudent: That is helpful. Can I borrow the books on the second shelf?\nLibrarian: Yes, but they are due back in seven days.",
    notes: '学术检索表达：academic database、narrow down、peer-reviewed、due back。适合六级/大英赛学术场景。',
    blanks: [
      { sent: 'The student is looking for articles about ______ learning.', answer: 'online' },
      { sent: 'Limit the search to journals published after ______.', answer: '2020' },
      { sent: 'The books are due back in ______ days.', answer: 'seven' }
    ]
  },
  {
    id: 'l37', title: 'Campus Orientation Talk', level: '校园 · 新生讲座',
    text: "Welcome to Maple University. During the next four years, three places will become familiar to you: the library, the language lab, and the student centre. The library is open until midnight during exam weeks. The language lab requires a booking, which you can make through the campus app. The student centre runs a writing clinic every Tuesday and a career workshop on the first Friday of each month. Please keep your student card with you at all times.",
    notes: '讲座独白：先总后分。三个地点与对应规则要一一对应；first Friday、every Tuesday 是细节高频。',
    blanks: [
      { sent: 'The library is open until ______ during exam weeks.', answer: 'midnight' },
      { sent: 'The language lab requires a ______.', answer: 'booking' },
      { sent: 'The career workshop is on the first ______ of each month.', answer: 'Friday' }
    ]
  },
  {
    id: 'l38', title: 'At the Dentist', level: '健康 · 牙科就诊',
    text: "Dentist: Please sit back. When did you last see a dentist?\nPatient: About two years ago, I think.\nDentist: Do you feel any pain when you drink something cold?\nPatient: Only in this tooth, on the left side.\nDentist: I can see a small cavity. We can fill it today. It will take about thirty minutes.\nPatient: Will it hurt?\nDentist: You will feel pressure, but the area will be numb. Please raise your hand if you need a break.",
    notes: '就诊对话：症状定位（left side）、处置（fill a cavity）、时长（thirty minutes）。numb、pressure 为高频词。',
    blanks: [
      { sent: 'The patient last saw a dentist about ______ years ago.', answer: 'two' },
      { sent: 'The cavity is in a tooth on the ______ side.', answer: 'left' },
      { sent: 'The filling will take about ______ minutes.', answer: 'thirty' }
    ]
  },
  {
    id: 'l39', title: 'Preparing for a Presentation', level: '学术 · 演讲辅导',
    text: "Tutor: How is your presentation coming along?\nStudent: I have ten slides, but my tutor said the topic is too broad.\nTutor: What is your main argument?\nStudent: That social media affects students' attention, but the evidence is mixed.\nTutor: Then make that your question. Cut the history section and keep three strong studies.\nStudent: Should I include a survey of my own?\nTutor: Only if you can explain the sample clearly. Remember, ten minutes means about eight slides.",
    notes: '学术指导：main argument、evidence is mixed、sample。建议类表达 Cut... / keep... / Only if... 要抓住。',
    blanks: [
      { sent: 'The student has ______ slides at the moment.', answer: 'ten' },
      { sent: 'The tutor suggests cutting the ______ section.', answer: 'history' },
      { sent: 'Ten minutes means about eight ______.', answer: 'slides' }
    ]
  },
  {
    id: 'l40', title: 'Why We Check Our Phones', level: '心理 · 手机与注意力',
    text: "Host: Why do people check their phones so often, even when they are with friends?\nGuest: Because each notification gives a small reward. The brain learns to expect it, so checking becomes a habit.\nHost: Does that mean we should delete social media?\nGuest: Not necessarily. A better approach is to turn off non-essential notifications and set fixed times for checking.\nHost: What about the fear of missing out?\nGuest: That feeling usually passes in a few minutes. You can train yourself to wait before reaching for the phone.\nHost: So the goal is awareness, not perfection.\nGuest: Exactly.",
    notes: '社会心理学话题：reward、habit、fear of missing out、awareness。适合大英赛思辨类听力。',
    blanks: [
      { sent: 'Each notification gives a small ______.', answer: 'reward' },
      { sent: 'Turn off non-essential ______.', answer: 'notifications' },
      { sent: 'The feeling usually passes in a few ______.', answer: 'minutes' }
    ]
  },
  {
    id: 'l41', title: 'Buying a Used Bike', level: '生活 · 二手交易',
    text: "Customer: Hi, is this bike still available?\nOwner: Yes, it is. It is three years old, but I replaced the tyres last spring.\nCustomer: How much are you asking?\nOwner: Four hundred and twenty yuan. I can include the lock and the helmet.\nCustomer: Would you take three hundred and fifty?\nOwner: I could do three hundred and eighty if you pay in cash.\nCustomer: Deal. Could I test it first?\nOwner: Sure. The brake on the right is a little tight, but otherwise it rides well.",
    notes: '议价场景：How much are you asking、Would you take、in cash、Deal。数字听写要区分二十/三十/八十。',
    blanks: [
      { sent: 'The owner replaced the ______ last spring.', answer: 'tyres' },
      { sent: 'The asking price is four hundred and ______ yuan.', answer: 'twenty' },
      { sent: 'The brake on the ______ is a little tight.', answer: 'right' }
    ]
  },
  {
    id: 'l42', title: 'Airport Security Check', level: '出行 · 机场安检',
    text: "Officer: Please place your laptop and your belt in the tray.\nTraveler: Do I need to take off my shoes?\nOfficer: No, not today. Put your bag on the belt, please.\nTraveler: I have a bottle of water. Is that allowed?\nOfficer: I am afraid not. You can empty it at the sink over there.\nTraveler: All right. What about this small bottle of perfume?\nOfficer: If it is under one hundred millilitres, it is fine.\nTraveler: It is fifty. Thank you.",
    notes: '安检指令：place、take off、put、empty。容量限制 one hundred millilitres 是典型数字考点。',
    blanks: [
      { sent: 'Place your laptop and your ______ in the tray.', answer: 'belt' },
      { sent: 'The water bottle is not ______.', answer: 'allowed' },
      { sent: 'Perfume under one hundred ______ is fine.', answer: 'millilitres' }
    ]
  },
  {
    id: 'l43', title: 'How Language Models Work', level: '科技 · AI 讲座',
    text: "Artificial intelligence systems learn patterns from large amounts of data. In language tasks, a model predicts the next word based on what it has seen before. This makes the output feel natural, but it does not mean the system understands the world in the way people do. Researchers therefore ask two questions: how accurate is the answer, and how can we check it? For students, the practical rule is simple: use these tools to draft and to question, not to replace your own judgement.",
    notes: 'AI 科普独白：pattern、predict、accurate、judgement。观点句是听力主旨题关键：use to draft, not to replace。',
    blanks: [
      { sent: 'A language model predicts the next ______.', answer: 'word' },
      { sent: 'Researchers ask how ______ the answer is.', answer: 'accurate' },
      { sent: 'Use these tools to draft and to ______, not to replace your judgement.', answer: 'question' }
    ]
  },
  {
    id: 'l44', title: 'Renting a Car', level: '出行 · 租车',
    text: "Clerk: Good morning. Do you have a reservation?\nCustomer: Yes, I booked a small car for three days under the name Wang.\nClerk: Let me check. I have you down for a compact car with automatic transmission.\nCustomer: That is right. Is insurance included?\nClerk: Basic insurance is included. You can add full cover for fifty yuan a day.\nCustomer: I will take the basic one. What time should I return it?\nClerk: By five p.m. on Friday, with a full tank of petrol.",
    notes: '租车场景：reservation、compact、automatic transmission、insurance。注意 basic 与 full cover 的差别。',
    blanks: [
      { sent: 'The customer booked the car for ______ days.', answer: 'three' },
      { sent: 'Full cover costs ______ yuan a day.', answer: 'fifty' },
      { sent: 'Return the car with a full tank of ______.', answer: 'petrol' }
    ]
  },
  {
    id: 'l45', title: 'Negotiating a Job Offer', level: '职场 · 薪资谈判',
    text: "Manager: We would like to offer you the position. The starting salary is eight thousand yuan a month.\nApplicant: Thank you. I am excited about the role. Could you tell me about the review schedule?\nManager: Salaries are reviewed once a year, usually in March.\nApplicant: I see. Would it be possible to have a six-month review instead?\nManager: That is unusual, but I can ask the HR team.\nApplicant: I would also like to confirm the training budget.\nManager: There is an annual allowance of two thousand yuan for courses. I will send the full offer by email.",
    notes: '谈判礼貌句式：Would it be possible to...、I would also like to...。薪资、周期、补贴三项需分别记。',
    blanks: [
      { sent: 'The starting salary is eight ______ yuan a month.', answer: 'thousand' },
      { sent: 'Salaries are reviewed once a ______.', answer: 'year' },
      { sent: 'The training allowance is two thousand yuan for ______.', answer: 'courses' }
    ]
  },
  {
    id: 'l46', title: 'A Book Club Discussion', level: '文化 · 读书会',
    text: "Host: Welcome back. Today we are discussing a novel about a young teacher in a small town.\nGuest: What struck me was the way she kept a notebook of small kindnesses.\nHost: I noticed that too. It changes how she sees her students.\nGuest: Some readers found the ending too quiet, but I thought it was honest.\nHost: Do you think the author wanted us to feel hopeful?\nGuest: Yes, but not in an easy way. The last page says change begins with attention, not with a speech.\nHost: That line alone is worth the whole book.",
    notes: '文学讨论常用：What struck me was...、I noticed that too、I thought it was...。观点与态度是考点。',
    blanks: [
      { sent: 'The teacher kept a notebook of small ______.', answer: 'kindnesses' },
      { sent: 'Some readers found the ending too ______.', answer: 'quiet' },
      { sent: 'Change begins with attention, not with a ______.', answer: 'speech' }
    ]
  },
  {
    id: 'l47', title: 'Severe Weather Warning', level: '社会 · 天气预警',
    text: "This is an urgent weather update. Heavy rain is expected between four and eight this evening. The city has issued a yellow warning, and public buses on the riverside route will be suspended after six. Residents are advised to avoid underpasses and to keep away from tall trees. Schools will dismiss students thirty minutes early. The meteorological office says the rain should stop by midnight, and normal service will resume tomorrow morning.",
    notes: '预警广播：issued、suspended、advised to、resume。多级时间信息（四到八点、六点后、提前半小时）需分辨。',
    blanks: [
      { sent: 'Heavy rain is expected between four and ______ this evening.', answer: 'eight' },
      { sent: 'Buses on the riverside route will be suspended after ______.', answer: 'six' },
      { sent: 'Schools will dismiss students thirty minutes ______.', answer: 'early' }
    ]
  },
  {
    id: 'l48', title: 'At the Post Office', level: '生活 · 寄包裹',
    text: "Clerk: Next, please. How can I help you?\nCustomer: I would like to send this package to Chengdu. How long will it take?\nClerk: By standard post, three to five days. Express is faster, but it costs twice as much.\nCustomer: Standard is fine. Does the price include insurance?\nClerk: It includes basic cover up to fifty yuan. Would you like to add more?\nCustomer: No, thank you. The contents are only books.\nClerk: Please fill in this form with the address and phone number.",
    notes: '寄件场景：standard post、express、insurance、fill in the form。价格倍数 twice as much 容易听漏。',
    blanks: [
      { sent: 'Standard post to Chengdu takes three to ______ days.', answer: 'five' },
      { sent: 'Express costs ______ as much.', answer: 'twice' },
      { sent: 'The contents are only ______.', answer: 'books' }
    ]
  },
  {
    id: 'l49', title: 'Solar Power Debate', level: '环境 · 能源辩论',
    text: "Host: Today's question: should cities invest more in solar power?\nGuest A: Yes. The cost of panels has fallen sharply, and a roof can generate electricity for twenty years.\nGuest B: I agree about the cost, but solar is weak on cloudy days. Cities still need a stable base supply.\nGuest A: That is why batteries matter. A small battery can store power for evening use.\nGuest B: Batteries are expensive, though. I would put the money into wind first, where our coast has a clear advantage.\nHost: So both of you want cleaner energy, but you disagree about where to start.",
    notes: '辩论体：先立场再让步（I agree... but...）。solar、battery、base supply、advantage 属环境与经济交叉词。',
    blanks: [
      { sent: 'A roof can generate electricity for twenty ______.', answer: 'years' },
      { sent: 'Solar is weak on ______ days.', answer: 'cloudy' },
      { sent: 'Guest B would invest in ______ first.', answer: 'wind' }
    ]
  },
  {
    id: 'l50', title: 'Managing Exam Stress', level: '心理 · 考试焦虑',
    text: "Counsellor: You mentioned that you feel stressed before exams. What happens in your body?\nStudent: My heart beats fast, and I cannot sleep the night before.\nCounsellor: Let's try something simple. Before bed, write down three things you need to do tomorrow, then close the notebook.\nStudent: Will that really help?\nCounsellor: It tells your brain that the plan is safe to leave until morning. Many students sleep better after doing it for a week.\nStudent: I can try that tonight.\nCounsellor: And remember, feeling nervous is not the same as being unprepared.",
    notes: '心理咨询对话：先描述症状再给建议。beat fast、write down、leave until morning 是关键动作。',
    blanks: [
      { sent: "The student's heart beats ______ before exams.", answer: 'fast' },
      { sent: 'Write down three things before ______.', answer: 'bed' },
      { sent: 'Feeling nervous is not the same as being ______.', answer: 'unprepared' }
    ]
  },
  {
    id: 'l51', title: 'Food and Culture', level: '文化 · 饮食交流',
    text: "Host: Our guest today grew up in Chengdu and now studies in London. What food do you miss most?\nGuest: Hotpot, honestly. But I have learned to cook it with ingredients I can find here.\nHost: Do your friends like it?\nGuest: At first they found the pepper too strong. Now they ask for extra.\nHost: What surprised you about British food?\nGuest: The variety of cheese, and the fact that a Sunday roast takes hours. Cooking is a way to understand a place.",
    notes: '文化访谈：miss、ingredients、at first、variety。观点句 Cooking is a way to understand a place 适合作主旨题。',
    blanks: [
      { sent: 'The guest grew up in ______.', answer: 'Chengdu' },
      { sent: 'Friends first found the pepper too ______.', answer: 'strong' },
      { sent: 'A Sunday roast takes ______.', answer: 'hours' }
    ]
  },
  {
    id: 'l52', title: 'A Video Call with a Friend', level: '生活 · 视频通话',
    text: "A: Can you hear me? The connection was breaking up.\nB: I can hear you now. You are moving a little.\nA: Sorry, I am walking to the library. Is your exam tomorrow?\nB: Yes, in the morning. I have been revising since seven.\nA: Have you taken a break today?\nB: Only for lunch. I keep forgetting to drink water.\nA: Promise me you will stop at ten tonight. Sleep will help you remember more.\nB: All right. I will see you after the exam.",
    notes: '日常电话：Can you hear me、breaking up、Promise me。现在完成时 have been revising 表持续，时间细节多。',
    blanks: [
      { sent: 'B has been revising since ______.', answer: 'seven' },
      { sent: 'B keeps forgetting to drink ______.', answer: 'water' },
      { sent: 'A asks B to stop at ______ tonight.', answer: 'ten' }
    ]
  },
  {
    id: 'l53', title: 'Visiting a Doctor', level: '健康 · 内科就诊',
    text: "Doctor: Good morning. What seems to be the problem?\nPatient: I have had a cough for almost two weeks, and it gets worse at night.\nDoctor: Any fever or difficulty breathing?\nPatient: No fever. I feel tired, though.\nDoctor: Let me listen to your chest. Take a deep breath. It sounds clear. I think it is post-viral.\nPatient: Do I need medicine?\nDoctor: Not really. Rest and warm drinks are enough. Come back if the cough lasts another week.",
    notes: '问诊标准流程：症状持续时间、伴随症状、检查、建议。post-viral 属六级以上词汇。',
    blanks: [
      { sent: 'The patient has had a cough for almost two ______.', answer: 'weeks' },
      { sent: 'The cough gets worse at ______.', answer: 'night' },
      { sent: 'Rest and warm ______ are enough.', answer: 'drinks' }
    ]
  },
  {
    id: 'l54', title: 'Asking for Directions', level: '出行 · 公交问路',
    text: "Tourist: Excuse me, is this the right bus for the railway station?\nLocal: No, this one goes to the museum. You need the number twelve from the stop across the road.\nTourist: How often does it come?\nLocal: About every ten minutes. It takes twenty minutes, and you want the fifth stop.\nTourist: Could you tell me the name of that stop?\nLocal: Green Square. Ask the driver to let you know.\nTourist: Thank you. That is very clear.",
    notes: '问路关键：the right bus、across the road、how often、the fifth stop。序号与站点名是高频考点。',
    blanks: [
      { sent: 'The tourist needs the number ______ bus.', answer: 'twelve' },
      { sent: 'Buses come about every ______ minutes.', answer: 'ten' },
      { sent: 'Get off at Green ______.', answer: 'Square' }
    ]
  },
  {
    id: 'l55', title: 'A Business Meeting', level: '职场 · 项目会议',
    text: "Chair: Let's begin. Three items today: the budget, the launch date, and the website.\nColleague: On the budget, we have ten percent left for advertising.\nChair: Good. What about the launch date?\nColleague: The design team needs one more week, so I suggest the fifteenth.\nChair: Does everyone agree? Then we will move the launch to the fifteenth.\nColleague: For the website, we still need someone to check the mobile version.\nChair: I will ask the technical team to handle it this afternoon.",
    notes: '会议结构清晰：三项议题逐一推进。budget、launch、agree、handle 为职场核心动词与名词。',
    blanks: [
      { sent: 'Ten percent is left for ______.', answer: 'advertising' },
      { sent: 'The new launch date is the ______.', answer: 'fifteenth' },
      { sent: 'The technical team will check the ______ version.', answer: 'mobile' }
    ]
  },
  {
    id: 'l56', title: 'A Lunar Rover Test', level: '科技 · 航天新闻',
    text: "A research team has successfully tested a small lunar rover this week. The rover, which weighs about thirty kilograms, travelled two kilometres over rough ground in a simulated environment. Its cameras sent images back to a control room in Beijing, where engineers checked the data in real time. The next test will focus on the rover's ability to charge its battery using solar power during a long lunar night. If all goes well, the design could support future missions.",
    notes: '科技新闻：weighs、travelled、simulated environment、in real time。多选细节需按主题归类记忆。',
    blanks: [
      { sent: 'The rover weighs about thirty ______.', answer: 'kilograms' },
      { sent: 'It travelled two kilometres over rough ______.', answer: 'ground' },
      { sent: 'The next test focuses on charging the ______.', answer: 'battery' }
    ]
  },
  {
    id: 'l57', title: 'How to Remember More', level: '心理 · 记忆策略',
    text: "Host: Many students reread their notes for hours. Is that the best way to remember?\nGuest: Not really. Rereading feels productive, but testing yourself works better.\nHost: So close the book and answer questions from memory?\nGuest: Yes. Try to explain a concept without looking, then check what you missed.\nHost: How often should you review?\nGuest: Review once after one day, then after a week. This is called spaced repetition.\nHost: It sounds simple, but most students skip it.\nGuest: Because it feels harder. That difficulty is exactly what makes it work.",
    notes: '认知心理：rereading、testing effect、spaced repetition。适合大英赛思辨听力，注意转折 but 后是重点。',
    blanks: [
      { sent: 'Testing yourself works better than ______.', answer: 'rereading' },
      { sent: 'Review once after one day, then after a ______.', answer: 'week' },
      { sent: 'The method is called spaced ______.', answer: 'repetition' }
    ]
  },
  {
    id: 'l58', title: 'Volunteering at an Event', level: '社会 · 志愿服务',
    text: "Coordinator: Welcome. Your job today is at the information desk.\nVolunteer: What should I tell visitors?\nCoordinator: Give them the map, and point out the two entrances. If someone asks about the talk, check the schedule before answering.\nVolunteer: What if I do not know the answer?\nCoordinator: Write the question down and send a message to the office. Never guess.\nVolunteer: How long is the shift?\nCoordinator: Three hours, with a fifteen-minute break. You can have lunch after the next group arrives.",
    notes: '任务说明：point out、check、write down、never guess。时长与休息安排是典型细节题。',
    blanks: [
      { sent: 'Give visitors the ______ and point out two entrances.', answer: 'map' },
      { sent: 'Never ______ if you do not know.', answer: 'guess' },
      { sent: 'The shift is three hours with a fifteen-minute ______.', answer: 'break' }
    ]
  },
  {
    id: 'l59', title: 'A Taxi Ride', level: '生活 · 打车出行',
    text: "Driver: Where to?\nPassenger: The training centre on Rose Street, near the city library.\nDriver: Is that the one on the north side? The traffic there is heavy at this hour.\nPassenger: Yes. Could we take the ring road instead?\nDriver: It is a little longer, but faster. Do you need a receipt?\nPassenger: Yes, please. I can pay by card.\nDriver: No problem. It should take about twenty minutes.\nPassenger: Thank you. I have a meeting at four.",
    notes: '打车对话：目的地、路线选择、支付方式、到达时间。heavy traffic、receipt、ring road 属实用词。',
    blanks: [
      { sent: 'The passenger is going to the ______ centre.', answer: 'training' },
      { sent: 'They take the ______ road instead.', answer: 'ring' },
      { sent: 'The meeting is at ______.', answer: 'four' }
    ]
  },
  {
    id: 'l60', title: 'A Graduation Speech', level: '演讲 · 毕业致辞',
    text: "Four years ago, you arrived with questions. Today you leave with better ones. Along the way, you learned more than the content of your courses. You learned how to disagree politely, how to start again after a failed experiment, and how to ask for help. The world will not always reward the fastest answer. It will reward the person who listens carefully and keeps learning. Wherever you go next, take your curiosity with you. Congratulations, graduates.",
    notes: '演讲体：排比结构 how to... / how to... / how to...，主旨句在结尾。适合练习抓主旨与态度。',
    blanks: [
      { sent: 'Four years ago, you arrived with ______.', answer: 'questions' },
      { sent: 'You learned how to disagree ______.', answer: 'politely' },
      { sent: 'The world will reward the person who listens carefully and keeps ______.', answer: 'learning' }
    ]
  }
];

// 与既有扩展包同样的合并方式：不改任何渲染与交互逻辑
if (typeof DATA !== 'undefined' && DATA.listening) {
  DATA.listening = DATA.listening.concat(window.YANBIAN_LISTENING_EXTRA2);
}
