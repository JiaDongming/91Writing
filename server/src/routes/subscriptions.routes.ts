import { Request, Response, Router } from "express";
import { SubscriptionStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest, requireAuth } from "../middleware/auth";
import { addDays } from "../utils/time";

const router = Router();

const selectPlanSchema = z.object({
  planCode: z.string().min(1),
});

router.get("/plans", async (_request: Request, response: Response) => {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: {
      priceMonthly: "asc",
    },
  });

  response.json(plans);
});

router.get(
  "/me",
  requireAuth,
  async (request: AuthenticatedRequest, response: Response) => {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: request.auth!.userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      include: {
        plan: true,
      },
      orderBy: {
        currentPeriodEnd: "desc",
      },
    });

    response.json(subscription);
  },
);

router.post(
  "/select-plan",
  requireAuth,
  async (request: AuthenticatedRequest, response: Response) => {
    try {
      const input = selectPlanSchema.parse(request.body);
      const plan = await prisma.subscriptionPlan.findUnique({
        where: {
          code: input.planCode,
        },
      });

      if (!plan) {
        return response.status(404).json({ message: "套餐不存在" });
      }

      await prisma.subscription.updateMany({
        where: {
          userId: request.auth!.userId,
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        data: {
          status: SubscriptionStatus.CANCELED,
          endedAt: new Date(),
        },
      });

      const subscription = await prisma.subscription.create({
        data: {
          userId: request.auth!.userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: addDays(new Date(), 30),
        },
        include: {
          plan: true,
        },
      });

      response.status(201).json(subscription);
    } catch (error) {
      const message = error instanceof Error ? error.message : "切换套餐失败";
      response.status(400).json({ message });
    }
  },
);

export default router;
