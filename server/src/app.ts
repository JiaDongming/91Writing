import cors from 'cors'
import express from 'express'
import routes from './routes'
import { env } from './lib/env'

const app = express()

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
)
app.use(express.json({ limit: '4mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

export default app
