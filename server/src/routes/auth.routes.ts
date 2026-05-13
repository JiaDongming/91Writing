import { Request, Response, Router } from 'express'
import { z } from 'zod'
import {
  loginUser,
  logoutUser,
  refreshUserToken,
  registerUser
} from '../services/auth.service'
import { AuthenticatedRequest, requireAuth } from '../middleware/auth'

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
  response.json({
    user: request.auth
  })
})

export default router
