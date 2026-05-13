import OpenAI from 'openai'
import { env } from '../lib/env'
import { prisma } from '../lib/prisma'
import { assertTokenQuota } from './subscription.service'

type GenerateTextInput = {
  userId: string
  prompt: string
  model?: string
  novelId?: string
  chapterId?: string
  operationType: string
}

function createClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY 未配置')
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL
  })
}

export async function generateText(input: GenerateTextInput) {
  const client = createClient()
  await assertTokenQuota(input.userId, 4000)

  const model = input.model || env.OPENAI_MODEL

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: input.prompt
      }
    ],
    temperature: 0.7
  })

  const content = response.choices[0]?.message?.content ?? ''
  const promptTokens = response.usage?.prompt_tokens ?? 0
  const completionTokens = response.usage?.completion_tokens ?? 0
  const totalTokens = response.usage?.total_tokens ?? promptTokens + completionTokens

  await prisma.tokenUsage.create({
    data: {
      userId: input.userId,
      novelId: input.novelId,
      chapterId: input.chapterId,
      provider: 'OPENAI',
      model,
      operationType: input.operationType,
      promptTokens,
      completionTokens,
      totalTokens,
      requestPayload: {
        prompt: input.prompt
      },
      responsePayload: JSON.parse(JSON.stringify(response))
    }
  })

  return {
    content,
    usage: response.usage
  }
}
