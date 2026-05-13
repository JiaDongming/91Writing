import { Request, Response, Router } from "express";
import authRoutes from "./auth.routes";
import aiRoutes from "./ai.routes";
import novelsRoutes from "./novels.routes";
import subscriptionsRoutes from "./subscriptions.routes";
import workspaceRoutes from "./workspace.routes";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
  });
});

router.use("/auth", authRoutes);
router.use("/subscriptions", subscriptionsRoutes);
router.use("/novels", requireAuth, novelsRoutes);
router.use("/workspace", requireAuth, workspaceRoutes);
router.use("/ai", requireAuth, aiRoutes);

export default router;
