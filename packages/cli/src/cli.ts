#!/usr/bin/env node
import { Command } from "commander";
import { runBuild, runGenerate, runInit, runTest, runVisual, startDevServer } from "./dev.js";
import { runDoctor } from "./doctor.js";

const program = new Command();

program.name("tidex").description("Tidex — zero-boilerplate component explorer").version("0.0.1");

program
  .command("init")
  .description("Initialize Tidex in the current project")
  .action(async () => {
    await runInit();
  });

program
  .command("dev")
  .description("Start the Tidex dev server")
  .action(async () => {
    await startDevServer();
  });

program
  .command("generate")
  .description("Scan components and generate artifacts")
  .option("--verbose", "Print scan diagnostics")
  .action(async (opts: { verbose?: boolean }) => {
    await runGenerate(undefined, opts.verbose);
  });

program
  .command("doctor")
  .description("Validate Tidex setup and scan health")
  .action(async () => {
    const result = await runDoctor();
    for (const message of result.messages) {
      console.log(message);
    }
    process.exit(result.ok ? 0 : 1);
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
  .description("Run accessibility and interaction tests")
  .option("--skip-generate", "Skip scanning; use existing .tidex/ artifacts")
  .option("--workers <n>", "Parallel component workers", (v) => parseInt(v, 10))
  .action(async (opts: { skipGenerate?: boolean; workers?: number }) => {
    const code = await runTest(undefined, {
      skipGenerate: opts.skipGenerate,
      workers: opts.workers,
    });
    process.exit(code);
  });

program.parse();
