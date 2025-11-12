import { argv, parallel, series, task, tscTask } from "just-scripts";
import {
  BundleTaskParameters,
  CopyTaskParameters,
  bundleTask,
  cleanTask,
  cleanCollateralTask,
  copyTask,
  coreLint,
  mcaddonTask,
  setupEnvironment,
  ZipTaskParameters,
  STANDARD_CLEAN_PATHS,
  DEFAULT_CLEAN_DIRECTORIES,
  getOrThrowFromProcess,
  watchTask,
} from "@minecraft/core-build-tasks";
import path from "path";
import fs from "fs/promises";
import { DEST_SCRIPT_DIR, DEST_RP_DIR, DEST_BP_DIR } from "./tools/utils";

// Setup env variables
setupEnvironment(path.resolve(__dirname, ".env"));
const projectName = getOrThrowFromProcess("PROJECT_NAME");

const bundleTaskOptions: BundleTaskParameters = {
  entryPoint: path.join(__dirname, "./scripts/main.ts"),
  external: ["@minecraft/server", "@minecraft/server-ui"],
  outfile: path.resolve(__dirname, "./dist/scripts/main.js"),
  minifyWhitespace: false,
  sourcemap: true,
  outputSourcemapPath: path.resolve(__dirname, "./dist/debug"),
};

const copyTaskOptions: CopyTaskParameters = {
  copyToBehaviorPacks: [`./behavior_packs/${projectName}`],
  copyToScripts: ["./dist/scripts"],
  copyToResourcePacks: [`./resource_packs/${projectName}`],
};

const mcaddonTaskOptions: ZipTaskParameters = {
  ...copyTaskOptions,
  outputFile: `./dist/packages/${projectName}.mcaddon`,
};

// Lint
task("lint", coreLint(["scripts/**/*.ts"], argv().fix));

// Build
task("typescript", tscTask());
task("bundle", bundleTask(bundleTaskOptions));
task("build", series("typescript", "bundle"));

// Clean
task("clean-local", cleanTask(DEFAULT_CLEAN_DIRECTORIES));
task("clean-collateral", cleanCollateralTask(STANDARD_CLEAN_PATHS));
task("clean", parallel("clean-local", "clean-collateral"));

// Package
task("copyArtifacts", copyTask(copyTaskOptions));
task("package", series("clean-collateral", "copyArtifacts"));

// Local Deploy used for deploying local changes directly to output via the bundler. It does a full build and package first just in case.
task(
  "local-deploy",
  watchTask(
    ["scripts/**/*.ts", "behavior_packs/**/*.{json,lang,png}", "resource_packs/**/*.{json,lang,png}"],
    series("clean-local", "build", "package")
  )
);


// 通用增量部署函数
async function deployDirectoryIncremental(
  srcDir: string,
  destDir: string,
  relativePath = "",
  excludeDirs: string[] = [],
  excludeExtensions: string[] = []
) {
  let copiedCount = 0;
  let skippedCount = 0;

  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const currentRelativePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      // 跳过排除的目录
      if (relativePath === "" && excludeDirs.includes(entry.name)) {
        console.log(`  ⊘ 跳过目录: ${entry.name} (使用 local-deploy-script 部署)`);
        continue;
      }

      await fs.mkdir(destPath, { recursive: true });
      const result = await deployDirectoryIncremental(srcPath, destPath, currentRelativePath, excludeDirs, excludeExtensions);
      copiedCount += result.copied;
      skippedCount += result.skipped;
    } else if (entry.isFile()) {
      // 检查文件后缀是否在黑名单中
      const ext = path.extname(entry.name).toLowerCase();
      if (excludeExtensions.length > 0 && excludeExtensions.some(excludedExt => ext === excludedExt.toLowerCase())) {
        console.log(`  ⊘ 跳过文件: ${currentRelativePath} (后缀 ${ext} 在黑名单中)`);
        skippedCount++;
        continue;
      }

      let needsCopy = false;

      try {
        const srcStat = await fs.stat(srcPath);
        const destStat = await fs.stat(destPath);

        // 比较修改时间和文件大小
        if (srcStat.mtime > destStat.mtime || srcStat.size !== destStat.size) {
          needsCopy = true;
        }
      } catch (err) {
        // 目标文件不存在，需要复制
        needsCopy = true;
      }

      if (needsCopy) {
        await fs.copyFile(srcPath, destPath);
        copiedCount++;
        console.log(`  ✓ 已部署: ${currentRelativePath}`);
      } else {
        skippedCount++;
      }
    }
  }

  return { copied: copiedCount, skipped: skippedCount };
}

task(
  "local-deploy-script",
  series("build", async () => {
    const source = path.join(__dirname, "dist/scripts/main.js");
    const destinationFile = path.join(DEST_SCRIPT_DIR, "main.js");
    await fs.mkdir(DEST_SCRIPT_DIR, { recursive: true });
    await fs.copyFile(source, destinationFile);
    console.log(`Successfully deployed script to ${destinationFile}`);
  })
);

// 增量部署资源包文件
task("local-deploy-rp", async () => {
  const SOURCE_RP_DIR = path.join(__dirname, "resource_packs", projectName);
  // 后缀黑名单（不包含点号，例如: [".mp4", ".mov"]）
  const EXCLUDE_EXTENSIONS = [".mp4", ".mov", ".avi"];

  console.log("开始增量部署资源包...");
  console.log(`源目录: ${SOURCE_RP_DIR}`);
  console.log(`目标目录: ${DEST_RP_DIR}`);
  if (EXCLUDE_EXTENSIONS.length > 0) {
    console.log(`后缀黑名单: ${EXCLUDE_EXTENSIONS.join(", ")}`);
  }

  await fs.mkdir(DEST_RP_DIR, { recursive: true });

  const result = await deployDirectoryIncremental(SOURCE_RP_DIR, DEST_RP_DIR, "", [], EXCLUDE_EXTENSIONS);

  console.log("\n部署完成:");
  console.log(`  - 已复制文件: ${result.copied} 个`);
  console.log(`  - 跳过未修改: ${result.skipped} 个`);
  console.log(`  - 总计扫描: ${result.copied + result.skipped} 个文件`);
});

// 增量部署行为包文件（不包括scripts目录）
task("local-deploy-bp", async () => {
  const SOURCE_BP_DIR = path.join(__dirname, "behavior_packs", projectName);

  console.log("开始增量部署行为包...");
  console.log(`源目录: ${SOURCE_BP_DIR}`);
  console.log(`目标目录: ${DEST_BP_DIR}`);

  await fs.mkdir(DEST_BP_DIR, { recursive: true });

  const result = await deployDirectoryIncremental(SOURCE_BP_DIR, DEST_BP_DIR, "", ["scripts"]);

  console.log("\n部署完成:");
  console.log(`  - 已复制文件: ${result.copied} 个`);
  console.log(`  - 跳过未修改: ${result.skipped} 个`);
  console.log(`  - 总计扫描: ${result.copied + result.skipped} 个文件`);
});



// Mcaddon
task("createMcaddonFile", mcaddonTask(mcaddonTaskOptions));
task("mcaddon", series("clean-local", "build", "createMcaddonFile"));
