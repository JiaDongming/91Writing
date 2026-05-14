import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ========== 订阅套餐 ==========
  const plans = [
    {
      code: 'free',
      name: '免费版',
      description: '适合试用和轻量创作',
      priceMonthly: '0.00',
      tokenQuotaMonthly: 100000,
      maxNovels: 3,
      features: ['基础写作', '基础大纲', '有限 Token']
    },
    {
      code: 'pro',
      name: '专业版',
      description: '适合重度小说创作用户',
      priceMonthly: '39.00',
      tokenQuotaMonthly: 2000000,
      maxNovels: 50,
      features: ['高级写作', '章节润色', '更高额度']
    },
    {
      code: 'team',
      name: '旗舰版',
      description: '适合商业化和高频创作场景',
      priceMonthly: '99.00',
      tokenQuotaMonthly: 8000000,
      maxNovels: 999,
      features: ['优先模型', '更高并发', '团队扩展能力']
    }
  ]

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        tokenQuotaMonthly: plan.tokenQuotaMonthly,
        maxNovels: plan.maxNovels,
        features: plan.features
      },
      create: plan
    })
  }

  // ========== 系统提示词模板 ==========
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@91writing.local' },
    update: {},
    create: {
      email: 'system@91writing.local',
      passwordHash: '__SYSTEM__',
      nickname: '系统',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  })

  const prompts = [
    {
      userId: systemUser.id,
      title: '小说大纲生成器',
      category: 'outline',
      content: `你是一位资深小说大纲策划师。请根据以下信息，为小说生成一份详细的大纲。

【小说标题】{小说标题}
【小说类型】{小说类型}
【小说简介】{小说简介}
【关键词】{关键词}

请生成一份完整的小说大纲，包含以下内容：
1. 故事核心梗概（200字以内概括全书主线）
2. 分卷/分篇结构（每卷包含多少章，各卷的核心冲突和剧情走向）
3. 主要情节节点（开端、发展、转折、高潮、结局）
4. 人物关系网络（主角与主要配角的互动关系）

要求：逻辑清晰、情节有张力、节奏合理。`,
      variables: { description: '根据小说信息自动生成完整大纲', tags: ['大纲', '结构', '规划'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '基础正文写作',
      category: 'content',
      content: `你是一位专业的小说作家。请根据以下大纲和章节信息，撰写本章的正文内容。

【小说标题】{小说标题}
【小说类型】{小说类型}
【章节标题】{章节标题}
【章节大纲】{章节大纲}
【本章要点】{本章要点}

写作要求：
1. 字数控制在{目标字数}字左右
2. 语言流畅自然，符合{小说类型}的写作风格
3. 注重细节描写，让读者有身临其境之感
4. 人物对话要符合角色性格
5. 情节推进要有节奏感，张弛有度

请直接输出正文内容，不需要额外的说明文字。`,
      variables: { description: '根据大纲生成章节正文', tags: ['正文', '写作', '章节'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '对话生成器',
      category: 'content-dialogue',
      content: `你是一位对话写作专家。请为以下场景生成精彩的对话内容。

【小说标题】{小说标题}
【场景背景】{场景背景}
【参与人物】{参与人物}
【对话目的】{对话目的}

要求：
1. 对话要符合每个角色的性格特点和说话风格
2. 对话要有潜台词，展现人物内心和关系
3. 适当穿插动作和神态描写，增强画面感
4. 对话节奏要符合场景氛围（紧张/轻松/深情等）
5. 推动情节发展，不要冗余对话

请输出完整的对话场景描写，包含对话和必要的叙述穿插。`,
      variables: { description: '为特定场景生成人物对话', tags: ['对话', '人物', '场景'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '场景描写生成器',
      category: 'content-scene',
      content: `你是一位场景描写大师。请为以下场景创作生动细腻的描写。

【小说标题】{小说标题}
【场景名称】{场景名称}
【场景类型】{场景类型}
【场景氛围】{场景氛围}
【相关人物】{相关人物}

要求：
1. 运用五感描写（视觉、听觉、嗅觉、触觉、味觉）
2. 场景描写要服务于情节和人物心理
3. 详略得当，重点突出，不要面面俱到
4. 语言风格与小说整体基调一致
5. 字数300-800字

请直接输出场景描写内容。`,
      variables: { description: '生成细腻的场景描写', tags: ['场景', '描写', '环境'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '动作情节生成器',
      category: 'content-action',
      content: `你是一位动作场面写作专家。请为以下情节创作紧张刺激的动作场景。

【小说标题】{小说标题}
【情节背景】{情节背景}
【参与人员】{参与人员}
【动作类型】{动作类型}
【激烈程度】{激烈程度}

要求：
1. 动作描写要清晰流畅，读者能清楚想象每个动作
2. 节奏紧凑，短句为主，增强紧张感
3. 穿插人物心理和反应，让动作场面有情感深度
4. 合理运用武学/战斗术语（如适用）
5. 注意情节的逻辑性和连贯性

请输出完整的动作场景。`,
      variables: { description: '生成紧张刺激的动作场景', tags: ['动作', '战斗', '情节'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '心理描写生成器',
      category: 'content-psychology',
      content: `你是一位心理描写专家。请为以下情境创作细腻的人物心理描写。

【小说标题】{小说标题}
【人物名称】{人物名称}
【人物性格】{人物性格}
【当前情境】{当前情境}
【心理状态】{心理状态}

要求：
1. 深入人物内心，展现真实的情感波动
2. 运用内心独白、回忆闪现、感受描写等手法
3. 心理描写与外部行为相呼应
4. 符合人物的性格设定和成长背景
5. 情感真挚，能引起读者共鸣

请输出完整的心理描写内容。`,
      variables: { description: '生成细腻的人物心理描写', tags: ['心理', '人物', '情感'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '智能续写生成器',
      category: 'continue',
      content: `你是一位小说续写专家。请根据当前内容，延续接下来的情节。

【小说标题】{小说标题}
【小说类型】{小说类型}
【当前内容】{当前内容}
【续写方向】{续写方向}
【续写字数】{续写字数}

要求：
1. 严格延续前文的风格、情节和人物设定
2. 保持语言风格和叙事节奏的一致性
3. 人物言行要符合已有的性格设定
4. 情节发展要自然，不突兀
5. 适当埋下伏笔，增加故事的吸引力

请直接输出续写内容。`,
      variables: { description: '根据上文智能续写后续内容', tags: ['续写', '接续', '连贯'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '润色优化器',
      category: 'polish',
      content: `你是一位文字润色专家。请对以下文本进行润色优化。

【小说标题】{小说标题}
【原始文本】{原始文本}
【润色重点】{润色重点}

优化方向：
1. 修正语法错误和不通顺的句子
2. 丰富词汇表达，避免重复用词
3. 优化句式结构，长短句搭配
4. 增强文字的文学性和感染力
5. 保持原文风格和内容的完整性

请输出润色后的文本，并在必要处标注修改说明。`,
      variables: { description: '对文本进行润色和优化', tags: ['润色', '优化', '文字'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '人物角色生成器',
      category: 'character',
      content: `你是一位人物设定专家。请根据以下信息，创作一个立体的角色设定。

【小说标题】{小说标题}
【小说类型】{小说类型}
【角色定位】{角色定位}
【角色类型】{角色类型}
【性别】{性别}

请从以下维度生成完整的人物设定：
1. 基本信息：姓名、年龄、外貌特征
2. 性格特点：主要性格、优缺点、习惯动作
3. 背景故事：成长经历、重要转折点
4. 人际关系：与主要角色的关系和互动模式
5. 动机目标：角色追求的目标和深层动机
6. 能力特长：特殊技能或知识领域
7. 角色弧光：在故事中的成长和变化

要求：设定详细但不冗余，各项之间要有内在逻辑关联，让人物立体丰满。`,
      variables: { description: '生成完整的人物角色设定', tags: ['人物', '角色', '设定'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '内容扩写器',
      category: 'expand',
      content: `你是一位内容扩写专家。请对以下内容进行扩展和丰富。

【小说标题】{小说标题}
【原始内容】{原始内容}
【扩写方向】{扩写方向}
【目标字数】{目标字数}

要求：
1. 在保持原意的基础上丰富细节描写
2. 增加合理的环境、心理、对话等内容
3. 扩展后的内容逻辑连贯、节奏自然
4. 保持原有的写作风格和语气
5. 不要偏离原文的主题和情节走向

请输出扩写后的完整内容。`,
      variables: { description: '对简单内容进行扩展和丰富', tags: ['扩写', '扩展', '丰富'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '文本改写器',
      category: 'rewrite',
      content: `你是一位文本改写专家。请按照要求对以下文本进行改写。

【小说标题】{小说标题}
【原始文本】{原始文本}
【改写要求】{改写要求}

改写方向参考：
- 变换叙事视角（第一人称/第三人称切换）
- 调整语言风格（更文艺/更简洁/更口语化）
- 改变节奏（加快/放缓叙事节奏）
- 强化特定元素（情感/悬念/氛围）

要求：保持原文的核心内容和情节，在指定方向上优化表达。请输出改写后的文本。`,
      variables: { description: '按指定要求改写文本', tags: ['改写', '重构', '风格'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '标题生成器',
      category: 'title',
      content: `你是一位标题创意专家。请为以下小说/章节生成吸引人的标题。

【小说类型】{小说类型}
【内容简介】{内容简介}
【目标读者】{目标读者}
【标题风格】{标题风格}

请生成5个候选标题，并简要说明每个标题的亮点：

要求：
1. 标题简洁有力，最好在4-10个字以内
2. 能准确反映内容的核心主题
3. 有记忆点，能吸引目标读者
4. 符合{小说类型}的命名习惯
5. 避免过于俗套的表达`,
      variables: { description: '生成小说或章节的标题', tags: ['标题', '命名', '创意'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '金手指设计器',
      category: 'cheat',
      content: `你是一位网文金手指设计专家。请为以下小说设计独特的金手指/外挂系统。

【小说标题】{小说标题}
【小说类型】{小说类型}
【主角背景】{主角背景}
【故事基调】{故事基调}

请设计一个完整的金手指系统，包含：
1. 金手指名称和来源（系统/奇遇/重生/穿越/天赋等）
2. 核心功能（主要能力是什么，有什么独特性）
3. 成长体系（如何升级进化，有哪些阶段）
4. 限制条件（有什么使用限制或代价，避免过于无敌）
5. 与剧情的结合点（金手指如何推动主线发展）
6. 爽点设计（金手指带来的高光时刻）

要求：金手指要有新意，避免烂大街的设定；要有合理的限制，保持故事的张力。`,
      variables: { description: '设计独特的金手指系统', tags: ['金手指', '系统', '设定'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '黄金开篇生成器',
      category: 'opening',
      content: `你是一位小说开篇写作大师。请为以下小说创作一个吸引人的开篇。

【小说标题】{小说标题}
【小说类型】{小说类型}
【小说简介】{小说简介}
【开篇风格】{开篇风格}

开篇写作要求：
1. 黄金三章原则：第一章必须抓住读者
2. 前300字要抛出钩子（冲突/悬念/独特设定）
3. 快速建立主角形象，让读者产生代入感
4. 自然引入世界观，避免大段说明
5. 节奏紧凑，每段都要推动情节或塑造人物

请写出第一章的开篇内容（约1500-3000字）。`,
      variables: { description: '创作黄金三章级别的开篇内容', tags: ['开篇', '黄金三章', '引入'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '灵感激发器',
      category: 'inspiration',
      content: `你是一位创意写作导师。请根据以下种子信息，激发写作灵感。

【创作方向】{创作方向}
【已有元素】{已有元素}
【灵感类型】{灵感类型}

请提供以下内容：
1. 3-5个有趣的剧情创意/脑洞
2. 每个创意包含：核心概念、主要冲突、人物关系、预期看点
3. 说明每个创意适合的读者群体和卖点
4. 给出进一步发展的建议

要求：创意要新颖独特，不是市面上常见的套路。`,
      variables: { description: '激发写作灵感和创意', tags: ['灵感', '创意', '脑洞'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '世界观构建器',
      category: 'worldview',
      content: `你是一位世界观设定专家。请为以下小说构建一个完整的世界观体系。

【小说标题】{小说标题}
【小说类型】{小说类型}
【世界观类型】{世界观类型}
【核心设定】{核心设定}

请从以下维度构建世界观：
1. 基础设定：时代背景、地理环境、社会结构
2. 力量体系：修炼/魔法/科技体系（如适用）
3. 种族/势力：主要派系及其关系
4. 历史与传说：重大历史事件和神话背景
5. 规则与法则：世界运行的基本法则
6. 文化与习俗：独特的风俗习惯、节日仪式
7. 冲突源：世界观中的核心矛盾和冲突来源

要求：世界观设定要自洽，各部分之间有逻辑关联。细节丰富但不要过于冗长。`,
      variables: { description: '构建完整的世界观体系', tags: ['世界观', '设定', '体系'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '脑洞生成器',
      category: 'brainstorm',
      content: `你是一位创意脑洞达人。请根据以下线索，进行创意发散。

【基础主题】{基础主题}
【创意维度】{创意维度}
【脑洞风格】{脑洞风格}

请进行以下发散：
1. 核心脑洞：一个颠覆性的创意设定
2. 反转设计：3个情理之中意料之外的反转
3. 元素混搭：将看似不相关的元素巧妙结合
4. 延伸展开：脑洞背后的世界观和规则
5. 故事可能性：脑洞能衍生出的3种不同故事方向

要求：脑洞要大但要能自圆其说，有趣且有深度。`,
      variables: { description: '进行创意脑洞发散', tags: ['脑洞', '创意', '发散'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '短篇小说生成器',
      category: 'short-story',
      content: `你是一位短篇小说作家。请根据以下要求创作一篇完整的短篇小说。

【故事主题】{故事主题}
【核心情感】{核心情感}
【目标字数】{目标字数}
【故事风格】{故事风格}

创作要求：
1. 起承转合完整，有清晰的故事弧线
2. 人物鲜明，即使篇幅有限也要让人记住
3. 结尾有余味，给读者回味的空间
4. 语言精炼，每一段都有其作用
5. 情感真挚，能打动人心

请直接输出完整的短篇小说。`,
      variables: { description: '创作完整的短篇小说', tags: ['短篇', '完整故事', '精炼'] },
      isSystem: true
    },
    {
      userId: systemUser.id,
      title: '拆书分析器',
      category: 'book-analysis',
      content: `你是一位专业的小说分析师。请对以下小说进行深度拆解分析。

【小说名称】{小说名称}
【分析重点】{分析重点}
【分析目的】{分析目的}

请从以下维度进行分析：
1. 故事结构：起承转合的设计，章节节奏
2. 人物塑造：主角弧光、配角功能、人物关系网
3. 爽点设计：爽点的类型、频率和安排
4. 世界观构建：设定的独特性和完整性
5. 写作技巧：值得学习的叙事手法和语言特点
6. 商业化要素：吸引读者的关键要素
7. 可借鉴之处：对自身创作的具体启发

要求：分析深入但不学术化，要有具体的实例支撑，结论要有实操价值。`,
      variables: { description: '深度拆解分析小说结构和技巧', tags: ['拆书', '分析', '学习'] },
      isSystem: true
    }
  ]

  // 使用 upsert 确保幂等（按 userId + title 去重）
  for (const prompt of prompts) {
    await prisma.promptTemplate.upsert({
      where: {
        userId_title: {
          userId: prompt.userId,
          title: prompt.title
        }
      },
      update: {
        category: prompt.category,
        content: prompt.content,
        variables: prompt.variables,
        isSystem: prompt.isSystem
      },
      create: prompt
    })
  }

  console.log(`✓ 已写入 ${prompts.length} 条系统提示词模板`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
