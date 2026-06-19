import { validateRepository } from "../src/lib/assets/registry";

const validation = await validateRepository(process.cwd());

if (validation.errors.length > 0) {
  console.error("AI asset validation failed:");
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${validation.assets.length} AI assets.`);
