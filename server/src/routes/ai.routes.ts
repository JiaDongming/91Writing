import { Response, Router } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { assertTokenQuota } from "../services/subscription.service";

const router = Router();

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const chatSchema = z.object({
  model: z.string().optional(),
  messages: z.array(messageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional().nullable(),
  stream: z.boolean().optional(),
  operationType: z.string().optional(),
  novelId: z.string().optional(),
  chapterId: z.string().optional(),
});

function getOpenAIClient() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 未配置");
  }

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
  });
}

function writeSseChunk(response: Response, payload: unknown) {
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

router.post(
  "/chat/completions",
  async (request: AuthenticatedRequest, response) => {
    try {
      const input = chatSchema.parse(request.body);
      const model = input.model || env.OPENAI_MODEL;
      const operationType = input.operationType || "chat_completion";

      await assertTokenQuota(request.auth!.userId, input.max_tokens ?? 4000);

      const client = getOpenAIClient();

      if (input.stream) {
        response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("Connection", "keep-alive");

        const stream = await client.chat.completions.create({
          model,
          messages: input.messages,
          temperature: input.temperature,
          max_tokens: input.max_tokens ?? undefined,
          stream: true,
          stream_options: { include_usage: true },
        });

        let promptTokens = 0;
        let completionTokens = 0;
        let totalTokens = 0;

        for await (const chunk of stream) {
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens ?? 0;
            completionTokens = chunk.usage.completion_tokens ?? 0;
            totalTokens =
              chunk.usage.total_tokens ?? promptTokens + completionTokens;
          }

          writeSseChunk(response, chunk);
        }

        await prisma.tokenUsage.create({
          data: {
            userId: request.auth!.userId,
            novelId: input.novelId,
            chapterId: input.chapterId,
            provider: "OPENAI",
            model,
            operationType,
            promptTokens,
            completionTokens,
            totalTokens,
            requestPayload: input,
          },
        });

        response.write("data: [DONE]\n\n");
        response.end();
        return;
      }

      const completion = await client.chat.completions.create({
        model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.max_tokens ?? undefined,
        stream: false,
      });

      const promptTokens = completion.usage?.prompt_tokens ?? 0;
      const completionTokens = completion.usage?.completion_tokens ?? 0;
      const totalTokens =
        completion.usage?.total_tokens ?? promptTokens + completionTokens;

      await prisma.tokenUsage.create({
        data: {
          userId: request.auth!.userId,
          novelId: input.novelId,
          chapterId: input.chapterId,
          provider: "OPENAI",
          model,
          operationType,
          promptTokens,
          completionTokens,
          totalTokens,
          requestPayload: input,
          responsePayload: JSON.parse(JSON.stringify(completion)),
        },
      });

      response.json(completion);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI 请求失败";
      response.status(400).json({ message });
    }
  },
);

export default router;
