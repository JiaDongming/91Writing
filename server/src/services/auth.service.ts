import { SubscriptionStatus, UserRole, UserStatus } from '@prisma/client'
import { addDays } from '../utils/time'
import { prisma } from '../lib/prisma'
import { comparePassword, hashPassword } from '../utils/password'
import {
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken
} from '../utils/jwt'
import { env } from '../lib/env'

type RegisterInput = {
  email: string
  password: string
  nickname: string
}

type LoginInput = {
  email: string
  password: string
}

async function issueAuthTokens(user: {
  id: string
  email: string
  role: UserRole
}) {
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  })

  const refreshToken = generateRefreshToken()
  const refreshTokenHash = hashRefreshToken(refreshToken)
  const expiresAt = addDays(new Date(), env.REFRESH_TOKEN_EXPIRES_DAYS)

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt
    }
  })

  return {
    accessToken,
    refreshToken
  }
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email }
  })

  if (existingUser) {
    throw new Error('该邮箱已注册')
  }

  const freePlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'free' }
  })

  if (!freePlan) {
    throw new Error('系统套餐未初始化，请先执行 Prisma seed')
  }

  const passwordHash = await hashPassword(input.password)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      nickname: input.nickname,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      subscriptions: {
        create: {
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: addDays(new Date(), 30)
        }
      },
      userSettings: {
        create: {
          data: {}
        }
      }
    }
  })

  const tokens = await issueAuthTokens(user)

  return {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role
    },
    ...tokens
  }
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  })

  if (!user) {
    throw new Error('用户不存在')
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new Error('当前账号不可用')
  }

  const valid = await comparePassword(input.password, user.passwordHash)

  if (!valid) {
    throw new Error('密码错误')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date()
    }
  })

  const tokens = await issueAuthTokens(user)

  return {
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role
    },
    ...tokens
  }
}

export async function refreshUserToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken)

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('刷新令牌无效')
  }

  const accessToken = signAccessToken({
    userId: stored.user.id,
    email: stored.user.email,
    role: stored.user.role
  })

  return {
    accessToken
  }
}

type UpdateProfileInput = {
  nickname?: string
  email?: string
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const data: Record<string, string> = {}
  if (input.nickname !== undefined) data.nickname = input.nickname

  if (input.email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing && existing.id !== userId) {
      throw new Error('该邮箱已被其他账号使用')
    }
    data.email = input.email
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, nickname: true, role: true }
  })

  return user
}

type ChangePasswordInput = {
  oldPassword: string
  newPassword: string
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('用户不存在')

  const valid = await comparePassword(input.oldPassword, user.passwordHash)
  if (!valid) throw new Error('原密码错误')

  const passwordHash = await hashPassword(input.newPassword)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  })
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken)

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  })
}
