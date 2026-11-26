const fs = require("fs");

for (const file of ["src/index.html", "index.html"]) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    // 1. Corregir regex con paréntesis desbalanceado tipo /([(][^)]+)]/ -> /\[([^\]]+)\]/
    if (lines[i].includes("([(][^)]+)]")) {
      lines[i] = lines[i].replace(/\/\(\[\^)]+\]\)\//g, "/\\[([^\\]]+)\\]/");
      lines[i] = lines[i].replace(/\(\[\^)]+\]\)/g, "\\[([^\\]]+)\\]");
    }

    // 2. Si una línea alrededor de 2793 quedó suelta empezando con 'font' o "font" sin concatenar bien
    const trimmed = lines[i].trim();
    if (/^['"]font[-a-zA-Z0-9:;\s]*['"]\s*\+?\s*$/.test(trimmed)) {
      const indent = lines[i].match(/^\s*/)[0];
      const hasPlus = trimmed.endsWith("+");
      lines[i] = indent + (hasPlus ? "" : "// ") + lines[i].trimStart();
    }
  }

  fs.writeFileSync(file, lines.join("\n"), "utf8");
  console.log("Revisado y limpiado:", file);
}
