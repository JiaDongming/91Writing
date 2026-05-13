import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'
import { env } from '../lib/env'

export type AuthTokenPayload = {
  userId: string
  email: string
  role: string
}

export function signAccessToken(payload: AuthTokenPayload) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  }

  return jwt.sign(payload, env.JWT_SECRET, options)
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

export function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
