import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
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
