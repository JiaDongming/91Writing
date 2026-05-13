import { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();

const novelStatusEnum = z.enum([
  "DRAFT",
  "SERIALIZING",
  "COMPLETED",
  "ARCHIVED",
]);
const chapterStatusEnum = z.enum([
  "DRAFT",
  "GENERATED",
  "REVIEWED",
  "PUBLISHED",
]);

const novelSchema = z.object({
  title: z.string().min(1),
  cover: z.string().optional().nullable(),
  intro: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  theme: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: novelStatusEnum.optional(),
});

const chapterSchema = z.object({
  title: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  content: z.string().optional().nullable(),
  outlineContent: z.string().optional().nullable(),
  generatedText: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  wordCount: z.number().int().nonnegative().optional(),
  status: chapterStatusEnum.optional(),
});

const characterSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  traits: z.array(z.string()).optional(),
  profile: z.any().optional(),
});

const worldSettingSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  details: z.any().optional(),
});

const storyEventSchema = z.object({
  title: z.string().min(1),
  timePoint: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
  metadata: z.any().optional(),
});

async function findOwnedNovel(novelId: string, userId: string) {
  return prisma.novel.findFirst({
    where: {
      id: novelId,
      userId,
    },
  });
}

function routeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : (value ?? "");
}

router.get("/", async (request: AuthenticatedRequest, response: Response) => {
  const novels = await prisma.novel.findMany({
    where: {
      userId: request.auth!.userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      _count: {
        select: {
          chapters: true,
        },
      },
    },
  });

  response.json(novels);
});

router.post("/", async (request: AuthenticatedRequest, response: Response) => {
  try {
    const input = novelSchema.parse(request.body);
    const novel = await prisma.novel.create({
      data: {
        userId: request.auth!.userId,
        ...input,
      },
    });

    response.status(201).json(novel);
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建小说失败";
    response.status(400).json({ message });
  }
});

router.get(
  "/:novelId",
  async (request: AuthenticatedRequest, response: Response) => {
    const novelId = routeParam(request.params.novelId);
    const novel = await prisma.novel.findFirst({
      where: {
        id: novelId,
        userId: request.auth!.userId,
      },
      include: {
        chapters: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        characters: true,
        worldSettings: true,
        storyEvents: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!novel) {
      return response.status(404).json({ message: "小说不存在" });
    }

    response.json(novel);
  },
);

router.put(
  "/:novelId",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const novelId = routeParam(request.params.novelId);
      const input = novelSchema.partial().parse(request.body);
      const ownedNovel = await findOwnedNovel(novelId, request.auth!.userId);

      if (!ownedNovel) {
        return response.status(404).json({ message: "小说不存在" });
      }

      const novel = await prisma.novel.update({
        where: {
          id: ownedNovel.id,
        },
        data: input,
      });

      response.json(novel);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新小说失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/:novelId",
  async (request: AuthenticatedRequest, response: Response) => {
    const novelId = routeParam(request.params.novelId);
    await prisma.novel.deleteMany({
      where: {
        id: novelId,
        userId: request.auth!.userId,
      },
    });

    response.status(204).send();
  },
);

router.get(
  "/:novelId/chapters",
  async (request: AuthenticatedRequest, response: Response) => {
    const novelId = routeParam(request.params.novelId);
    const novel = await findOwnedNovel(novelId, request.auth!.userId);

    if (!novel) {
      return response.status(404).json({ message: "小说不存在" });
    }

    const chapters = await prisma.chapter.findMany({
      where: { novelId: novel.id },
      orderBy: { sortOrder: "asc" },
    });

    response.json(chapters);
  },
);

router.post(
  "/:novelId/chapters",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const novelId = routeParam(request.params.novelId);
      const input = chapterSchema.parse(request.body);
      const novel = await findOwnedNovel(novelId, request.auth!.userId);

      if (!novel) {
        return response.status(404).json({ message: "小说不存在" });
      }

      const chapter = await prisma.chapter.create({
        data: {
          novelId: novel.id,
          title: input.title,
          sortOrder: input.sortOrder,
          content: input.content,
          outlineContent: input.outlineContent,
          generatedText: input.generatedText,
          summary: input.summary,
          wordCount: input.wordCount ?? 0,
          status: input.status ?? "DRAFT",
        },
      });

      response.status(201).json(chapter);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建章节失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/chapters/:chapterId",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const chapterId = routeParam(request.params.chapterId);
      const input = chapterSchema.partial().parse(request.body);
      const existingChapter = await prisma.chapter.findFirst({
        where: {
          id: chapterId,
          novel: {
            userId: request.auth!.userId,
          },
        },
      });

      if (!existingChapter) {
        return response.status(404).json({ message: "章节不存在" });
      }

      const strippedContent =
        typeof input.content === "string"
          ? input.content.replace(/<[^>]*>/g, "")
          : null;

      const chapter = await prisma.chapter.update({
        where: {
          id: existingChapter.id,
        },
        data: {
          ...input,
          wordCount:
            input.wordCount ??
            strippedContent?.length ??
            existingChapter.wordCount,
        },
      });

      response.json(chapter);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新章节失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/chapters/:chapterId",
  async (request: AuthenticatedRequest, response: Response) => {
    const chapterId = routeParam(request.params.chapterId);
    await prisma.chapter.deleteMany({
      where: {
        id: chapterId,
        novel: {
          userId: request.auth!.userId,
        },
      },
    });

    response.status(204).send();
  },
);

router.post(
  "/:novelId/characters",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const novelId = routeParam(request.params.novelId);
      const input = characterSchema.parse(request.body);
      const novel = await findOwnedNovel(novelId, request.auth!.userId);

      if (!novel) {
        return response.status(404).json({ message: "小说不存在" });
      }

      const character = await prisma.character.create({
        data: {
          novelId: novel.id,
          ...input,
        },
      });

      response.status(201).json(character);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建人物失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/characters/:characterId",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const characterId = routeParam(request.params.characterId);
      const input = characterSchema.partial().parse(request.body);
      const character = await prisma.character.findFirst({
        where: {
          id: characterId,
          novel: {
            userId: request.auth!.userId,
          },
        },
      });

      if (!character) {
        return response.status(404).json({ message: "人物不存在" });
      }

      const updated = await prisma.character.update({
        where: {
          id: character.id,
        },
        data: input,
      });

      response.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新人物失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/characters/:characterId",
  async (request: AuthenticatedRequest, response: Response) => {
    const characterId = routeParam(request.params.characterId);
    await prisma.character.deleteMany({
      where: {
        id: characterId,
        novel: {
          userId: request.auth!.userId,
        },
      },
    });

    response.status(204).send();
  },
);

router.post(
  "/:novelId/world-settings",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const novelId = routeParam(request.params.novelId);
      const input = worldSettingSchema.parse(request.body);
      const novel = await findOwnedNovel(novelId, request.auth!.userId);

      if (!novel) {
        return response.status(404).json({ message: "小说不存在" });
      }

      const setting = await prisma.worldSetting.create({
        data: {
          novelId: novel.id,
          ...input,
        },
      });

      response.status(201).json(setting);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建世界观失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/world-settings/:settingId",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const settingId = routeParam(request.params.settingId);
      const input = worldSettingSchema.partial().parse(request.body);
      const setting = await prisma.worldSetting.findFirst({
        where: {
          id: settingId,
          novel: {
            userId: request.auth!.userId,
          },
        },
      });

      if (!setting) {
        return response.status(404).json({ message: "世界观设定不存在" });
      }

      const updated = await prisma.worldSetting.update({
        where: {
          id: setting.id,
        },
        data: input,
      });

      response.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新世界观失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/world-settings/:settingId",
  async (request: AuthenticatedRequest, response: Response) => {
    const settingId = routeParam(request.params.settingId);
    await prisma.worldSetting.deleteMany({
      where: {
        id: settingId,
        novel: {
          userId: request.auth!.userId,
        },
      },
    });

    response.status(204).send();
  },
);

router.post(
  "/:novelId/events",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const novelId = routeParam(request.params.novelId);
      const input = storyEventSchema.parse(request.body);
      const novel = await findOwnedNovel(novelId, request.auth!.userId);

      if (!novel) {
        return response.status(404).json({ message: "小说不存在" });
      }

      const event = await prisma.storyEvent.create({
        data: {
          novelId: novel.id,
          title: input.title,
          timePoint: input.timePoint,
          description: input.description,
          sortOrder: input.sortOrder ?? 0,
          metadata: input.metadata,
        },
      });

      response.status(201).json(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建事件失败";
      response.status(400).json({ message });
    }
  },
);

router.put(
  "/events/:eventId",
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const eventId = routeParam(request.params.eventId);
      const input = storyEventSchema.partial().parse(request.body);
      const event = await prisma.storyEvent.findFirst({
        where: {
          id: eventId,
          novel: {
            userId: request.auth!.userId,
          },
        },
      });

      if (!event) {
        return response.status(404).json({ message: "事件不存在" });
      }

      const updated = await prisma.storyEvent.update({
        where: {
          id: event.id,
        },
        data: input,
      });

      response.json(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新事件失败";
      response.status(400).json({ message });
    }
  },
);

router.delete(
  "/events/:eventId",
  async (request: AuthenticatedRequest, response: Response) => {
    const eventId = routeParam(request.params.eventId);
    await prisma.storyEvent.deleteMany({
      where: {
        id: eventId,
        novel: {
          userId: request.auth!.userId,
        },
      },
    });

    response.status(204).send();
  },
);

export default router;
