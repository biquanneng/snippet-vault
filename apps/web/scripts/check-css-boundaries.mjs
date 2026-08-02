// SPDX-License-Identifier: MPL-2.0

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const globalCssPath = path.join(projectRoot, "app/globals.css");

async function collectTokenFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTokenFiles(entryPath)));
      continue;
    }

    if (entry.name === "tokens.css") {
      files.push(entryPath);
    }
  }

  return files;
}

function sourceLines(source) {
  return source.split(/\r?\n/).map((line, index) => ({
    number: index + 1,
    text: line.trim(),
  }));
}

const violations = [];
const globalCss = await readFile(globalCssPath, "utf8");

for (const line of sourceLines(globalCss)) {
  if (line.text.includes("@keyframes")) {
    violations.push({
      file: globalCssPath,
      ...line,
      reason: "global keyframes are not allowed",
    });
  }

  if (
    line.text.endsWith("{") &&
    !line.text.startsWith("@") &&
    ![":root {", "* {", "body {"].includes(line.text)
  ) {
    violations.push({
      file: globalCssPath,
      ...line,
      reason: "only shared root and base selectors are allowed",
    });
  }
}

const tokenFiles = await collectTokenFiles(path.join(projectRoot, "app"));

for (const tokenFile of tokenFiles) {
  const tokenCss = await readFile(tokenFile, "utf8");

  for (const line of sourceLines(tokenCss)) {
    if (line.text.includes("@keyframes")) {
      violations.push({
        file: tokenFile,
        ...line,
        reason: "product token files cannot define keyframes",
      });
    }

    if (
      line.text.endsWith("{") &&
      !line.text.startsWith("@") &&
      !/^\[data-product="[^"]+"\] \{$/.test(line.text)
    ) {
      violations.push({
        file: tokenFile,
        ...line,
        reason: "product token files may only use a data-product root selector",
      });
    }

    if (
      line.text.endsWith(";") &&
      !line.text.startsWith("--") &&
      !line.text.startsWith("@")
    ) {
      violations.push({
        file: tokenFile,
        ...line,
        reason: "product token files may only declare CSS custom properties",
      });
    }
  }
}

if (violations.length > 0) {
  console.error("CSS boundary check failed.");

  for (const violation of violations) {
    console.error(
      `- ${path.relative(projectRoot, violation.file)}:${violation.number} ${violation.reason}: ${violation.text}`
    );
  }

  process.exit(1);
}

console.log("CSS boundary check passed.");
