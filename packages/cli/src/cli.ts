#!/usr/bin/env node
import { Command } from "commander";
import {
  runBuild,
  runGenerate,
  runInit,
  runTest,
  runVisual,
  startDevServer,
} from "./dev.js";

const program = new Command();

program
  .name("tide")
  .description("Tide — zero-boilerplate component explorer")
  .version("0.0.1");

program
  .command("init")
  .description("Initialize Tide in the current project")
  .action(async () => {
    await runInit();
  });

program
  .command("dev")
  .description("Start the Tide dev server")
  .action(async () => {
    await startDevServer();
  });

program
  .command("generate")
  .description("Scan components and generate artifacts")
  .action(async () => {
    await runGenerate();
  });

program
  .command("build")
  .description("Generate build artifacts")
  .action(async () => {
    await runBuild();
  });

program
  .command("visual")
  .description("Run visual regression tests")
  .option("--update", "Update baselines")
  .action(async (opts: { update?: boolean }) => {
    const code = await runVisual(undefined, opts.update);
    process.exit(code);
  });

program
  .command("test")
  .description("Run accessibility tests")
  .action(async () => {
    const code = await runTest();
    process.exit(code);
  });

program.parse();
