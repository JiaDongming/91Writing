import { Request, Response, Router } from 'express'
import { z } from 'zod'
import {
  changePassword,
  loginUser,
  logoutUser,
  refreshUserToken,
  registerUser,
  updateProfile
} from '../services/auth.service'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nickname: z.string().min(2).max(50)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const refreshSchema = z.object({
  refreshToken: z.string().min(20)
})

router.post('/register', async (request: Request, response: Response) => {
  try {
    const input = registerSchema.parse(request.body)
    const result = await registerUser(input)
    response.status(201).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '注册失败'
    response.status(400).json({ message })
  }
})

router.post('/login', async (request: Request, response: Response) => {
  try {
    const input = loginSchema.parse(request.body)
    const result = await loginUser(input)
    response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '登录失败'
    response.status(400).json({ message })
  }
})

router.post('/refresh', async (request: Request, response: Response) => {
  try {
    const input = refreshSchema.parse(request.body)
    const result = await refreshUserToken(input.refreshToken)
    response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '刷新令牌失败'
    response.status(400).json({ message })
  }
})

router.post('/logout', async (request: Request, response: Response) => {
  try {
    const input = refreshSchema.parse(request.body)
    await logoutUser(input.refreshToken)
    response.status(204).send()
  } catch (error) {
    const message = error instanceof Error ? error.message : '退出登录失败'
    response.status(400).json({ message })
  }
})

router.get('/me', requireAuth, async (request: AuthenticatedRequest, response: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: { id: true, email: true, nickname: true, role: true }
  })
  if (!user) {
    return response.status(404).json({ message: '用户不存在' })
  }
  response.json(user)
})

const updateProfileSchema = z.object({
  nickname: z.string().min(2).max(50).optional(),
  email: z.string().email().optional()
})

router.put('/profile', requireAuth, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const input = updateProfileSchema.parse(request.body)
    const user = await updateProfile(request.auth!.userId, input)
    response.json(user)
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败'
    response.status(400).json({ message })
  }
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(8, '新密码至少8位')
})

router.put('/password', requireAuth, async (request: AuthenticatedRequest, response: Response) => {
  try {
    const input = changePasswordSchema.parse(request.body)
    await changePassword(request.auth!.userId, input)
    response.status(204).send()
  } catch (error) {
    const message = error instanceof Error ? error.message : '密码修改失败'
    response.status(400).json({ message })
  }
})

export default router
