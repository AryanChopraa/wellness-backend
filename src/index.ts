import app from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

async function main(): Promise<void> {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`Server running at http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
