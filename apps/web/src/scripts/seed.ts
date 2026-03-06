import { seedDemoData } from "../lib/data";

async function main() {
  await seedDemoData();
  console.log("Seed data ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
