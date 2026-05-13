import { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../utils/jwt'

export type AuthenticatedRequest = Request & {
  auth?: {
    userId: string
    email: string
    role: string
  }
}

export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction
) {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return response.status(401).json({ message: '未提供有效的访问令牌' })
  }

  try {
    const token = authHeader.slice('Bearer '.length)
    request.auth = verifyAccessToken(token)
    next()
  } catch (error) {
    return response.status(401).json({ message: '访问令牌无效或已过期' })
  }
}
