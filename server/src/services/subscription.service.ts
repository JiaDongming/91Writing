import { SubscriptionStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]
      },
      currentPeriodEnd: {
        gte: new Date()
      }
    },
    include: {
      plan: true
    },
    orderBy: {
      currentPeriodEnd: 'desc'
    }
  })
}

export async function assertTokenQuota(userId: string, requestedTokens = 0) {
  const subscription = await getActiveSubscription(userId)

  if (!subscription) {
    throw new Error('当前账号没有可用订阅')
  }

  const usage = await prisma.tokenUsage.aggregate({
    where: {
      userId,
      createdAt: {
        gte: subscription.currentPeriodStart,
        lte: subscription.currentPeriodEnd
      }
    },
    _sum: {
      totalTokens: true
    }
  })

  const usedTokens = usage._sum.totalTokens ?? 0
  const quota = subscription.plan.tokenQuotaMonthly

  if (usedTokens + requestedTokens > quota) {
    throw new Error('本月 Token 配额已不足，请升级订阅套餐')
  }

  return {
    subscription,
    usedTokens,
    remainingTokens: quota - usedTokens
  }
}
