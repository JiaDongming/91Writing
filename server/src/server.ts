import app from "./app";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";

async function bootstrap() {
  await prisma.$connect();

  app.listen(env.PORT, () => {
    console.log(`灵溪写作后端已启动: http://localhost:${env.PORT}`);
  });
}

bootstrap().catch(async (error) => {
  console.error("服务启动失败", error);
  await prisma.$disconnect();
  process.exit(1);
});
