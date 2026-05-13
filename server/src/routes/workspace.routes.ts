import { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();

const promptSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional().nullable(),
  content: z.string().min(1),
  variables: z.any().optional(),
  isSystem: z.boolean().optional(),
});

const genreSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  settings: z.any().optional(),
});

const goalPeriodEnum = z.enum(["DAILY", "WEEKLY", "MONTHLY"]);

const goalSchema = z.object({
  title: z.string().min(1),
  period: goalPeriodEnum,
  targetWords: z.number().int().positive(),
  currentWords: z.number().int().nonnegative().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.string().optional(),
  metadata: z.any().optional(),
});

const providerSchema = z.object({
  provider: z.enum(["OPENAI", "CUSTOM"]).default("OPENAI"),
  name: z.string().min(1),
  baseUrl: z.string().optional().nullable(),
  apiKey: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
});

router.get(
  "/settings",
  async (request: AuthenticatedRequest, response: Response) => {
    const settings = await prisma.userSetting.findUnique({
      where: {
        userId: request.auth!.userId,
      },
    });

    response.json(settings ?? { data: {} });
  },
);

router.put(
  "/settings",
  async (request: AuthenticatedRequest, response: Response) => {
    const settings = await prisma.userSetting.upsert({
      where: {
        userId: request.auth!.userId,
      },
      update: {
        data: request.body,
      },
      create: {
        userId: request.auth!.userId,
        data: request.body,
      },
    });

    response.json(settings);
  },
);

router.get(
  "/prompts",
  async (request: AuthenticatedRequest, response: Response) => {
    const prompts = await prisma.promptTemplate.findMany({
      where: {
        userId: request.auth!.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    response.json(prompts);
  },
);

router.post(
  "/prompts",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const input = promptSchema.parse(request.body);
      const prompt = await prisma.promptTemplate.create({
        data: {
          userId: request.auth!.userId,
          ...input,
        },
      });

      response.status(201).json(prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建提示词失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/prompts/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const id = request.params.id as string;

      // 验证所有权
      const existing = await prisma.promptTemplate.findUnique({ where: { id } });
      if (!existing || existing.userId !== request.auth!.userId) {
        return response.status(404).json({ message: "提示词不存在" });
      }

      const input = promptSchema.partial().parse(request.body);
      const prompt = await prisma.promptTemplate.update({
        where: { id },
        data: input,
      });

      response.json(prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新提示词失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/prompts/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    const id = request.params.id as string;

    const existing = await prisma.promptTemplate.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.auth!.userId) {
      return response.status(404).json({ message: "提示词不存在" });
    }

    await prisma.promptTemplate.delete({ where: { id } });
    response.status(204).send();
  },
);

router.get(
  "/genres",
  async (request: AuthenticatedRequest, response: Response) => {
    const genres = await prisma.genrePreset.findMany({
      where: {
        userId: request.auth!.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    response.json(genres);
  },
);

router.post(
  "/genres",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const input = genreSchema.parse(request.body);
      const genre = await prisma.genrePreset.create({
        data: {
          userId: request.auth!.userId,
          ...input,
        },
      });

      response.status(201).json(genre);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建类型配置失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/genres/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const id = request.params.id as string;

      const existing = await prisma.genrePreset.findUnique({ where: { id } });
      if (!existing || existing.userId !== request.auth!.userId) {
        return response.status(404).json({ message: "类型配置不存在" });
      }

      const input = genreSchema.partial().parse(request.body);
      const genre = await prisma.genrePreset.update({
        where: { id },
        data: input,
      });

      response.json(genre);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "更新类型配置失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/genres/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    const id = request.params.id as string;

    const existing = await prisma.genrePreset.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.auth!.userId) {
      return response.status(404).json({ message: "类型配置不存在" });
    }

    await prisma.genrePreset.delete({ where: { id } });
    response.status(204).send();
  },
);

router.get(
  "/goals",
  async (request: AuthenticatedRequest, response: Response) => {
    const goals = await prisma.writingGoal.findMany({
      where: {
        userId: request.auth!.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.json(goals);
  },
);

router.post(
  "/goals",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const input = goalSchema.parse(request.body);
      const goal = await prisma.writingGoal.create({
        data: {
          userId: request.auth!.userId,
          title: input.title,
          period: input.period,
          targetWords: input.targetWords,
          currentWords: input.currentWords ?? 0,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status ?? "ACTIVE",
        },
      });

      response.status(201).json(goal);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建写作目标失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/goals/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const id = request.params.id as string;

      const existing = await prisma.writingGoal.findUnique({ where: { id } });
      if (!existing || existing.userId !== request.auth!.userId) {
        return response.status(404).json({ message: "写作目标不存在" });
      }

      const input = goalSchema.partial().parse(request.body);
      const goal = await prisma.writingGoal.update({
        where: { id },
        data: input,
      });

      response.json(goal);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "更新写作目标失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/goals/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    const id = request.params.id as string;

    const existing = await prisma.writingGoal.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.auth!.userId) {
      return response.status(404).json({ message: "写作目标不存在" });
    }

    await prisma.writingGoal.delete({ where: { id } });
    response.status(204).send();
  },
);

router.get(
  "/providers",
  async (request: AuthenticatedRequest, response: Response) => {
    const providers = await prisma.aiProviderConfig.findMany({
      where: {
        userId: request.auth!.userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    response.json(providers);
  },
);

router.post(
  "/providers",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const input = providerSchema.parse(request.body);

      if (input.isDefault) {
        await prisma.aiProviderConfig.updateMany({
          where: {
            userId: request.auth!.userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const provider = await prisma.aiProviderConfig.create({
        data: {
          userId: request.auth!.userId,
          provider: input.provider as any,
          name: input.name,
          baseUrl: input.baseUrl,
          apiKey: input.apiKey,
          model: input.model,
          isDefault: input.isDefault ?? false,
          isEnabled: input.isEnabled ?? true,
        },
      });

      response.status(201).json(provider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存模型配置失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/providers/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const id = request.params.id as string;

      const existing = await prisma.aiProviderConfig.findUnique({ where: { id } });
      if (!existing || existing.userId !== request.auth!.userId) {
        return response.status(404).json({ message: "模型配置不存在" });
      }

      const input = providerSchema.partial().parse(request.body);

      if (input.isDefault) {
        await prisma.aiProviderConfig.updateMany({
          where: {
            userId: request.auth!.userId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const provider = await prisma.aiProviderConfig.update({
        where: { id },
        data: input,
      });

      response.json(provider);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "更新模型配置失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/providers/:id",
  async (request: AuthenticatedRequest, response: Response) => {
    const id = request.params.id as string;

    const existing = await prisma.aiProviderConfig.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.auth!.userId) {
      return response.status(404).json({ message: "模型配置不存在" });
    }

    await prisma.aiProviderConfig.delete({ where: { id } });
    response.status(204).send();
  },
);

router.get(
  "/token-usage",
  async (request: AuthenticatedRequest, response: Response) => {
    const records = await prisma.tokenUsage.findMany({
      where: {
        userId: request.auth!.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    response.json(records);
  },
);

export default router;
