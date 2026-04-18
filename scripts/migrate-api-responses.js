#!/usr/bin/env node
// Migrates all NextResponse.json({ success, data, error }) calls to ok()/fail() helpers.
// Usage: node scripts/migrate-api-responses.js [--dry-run]

const fs = require("fs")
const path = require("path")

const DRY_RUN = process.argv.includes("--dry-run")

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function findTsFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) results.push(...findTsFiles(full))
    else if (entry.name.endsWith(".ts")) results.push(full)
  }
  return results
}

/** Extract the balanced (...), [...], or {...} segment starting at `pos`. */
function extractBalanced(s, pos, open, close) {
  if (s[pos] !== open) return null
  let depth = 0
  let inStr = false
  let strChar = null
  let escaped = false
  for (let i = pos; i < s.length; i++) {
    const c = s[i]
    if (escaped) { escaped = false; continue }
    if (c === "\\" && inStr) { escaped = true; continue }
    if (inStr) { if (c === strChar) inStr = false; continue }
    if (c === '"' || c === "'" || c === "`") { inStr = true; strChar = c; continue }
    if (c === open) depth++
    else if (c === close) { depth--; if (depth === 0) return { content: s.slice(pos, i + 1), end: i + 1 } }
  }
  return null
}

/**
 * Extract a JS value from the start of string `s`, stopping at an unmatched
 * comma or closing bracket/brace/paren at depth 0.
 */
function extractValue(s) {
  s = s.trim()
  let depth = 0
  let inStr = false
  let strChar = null
  let escaped = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escaped) { escaped = false; continue }
    if (c === "\\" && inStr) { escaped = true; continue }
    if (inStr) { if (c === strChar) inStr = false; continue }
    if (c === '"' || c === "'" || c === "`") { inStr = true; strChar = c; continue }
    if (c === "(" || c === "[" || c === "{") depth++
    else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) return s.slice(0, i).trim()
      depth--
    } else if (c === "," && depth === 0) return s.slice(0, i).trim()
  }
  return s.trim()
}

// ---------------------------------------------------------------------------
// Transformation logic
// ---------------------------------------------------------------------------

/**
 * Given the raw inner text of NextResponse.json(...), return the replacement
 * expression or null if the call cannot be automatically transformed.
 */
function transform(inner) {
  const norm = inner.replace(/\s+/g, " ").trim()

  // Must start with the body object
  if (!norm.startsWith("{")) return null
  const bodyRes = extractBalanced(norm, 0, "{", "}")
  if (!bodyRes) return null
  const bodyStr = bodyRes.content

  let isSuccess = /\bsuccess\s*:\s*true\b/.test(bodyStr)
  let isFailure = /\bsuccess\s*:\s*false\b/.test(bodyStr)

  // Infer success/failure from error value when `success:` key is missing
  if (!isSuccess && !isFailure) {
    const hasError = /\berror\s*:/.test(bodyStr)
    if (!hasError) return null
    const errKeyIdx = bodyStr.search(/\berror\s*:/)
    const afterErrKey = bodyStr.slice(bodyStr.indexOf(":", errKeyIdx) + 1).trim()
    const errVal = extractValue(afterErrKey)
    // error: null  → treat as success
    if (errVal === "null") isSuccess = true
    else isFailure = true
  }

  // Parse optional second argument { status: N, headers: {...} }
  let status = null
  const afterBody = norm.slice(bodyRes.end).trim()
  if (afterBody.startsWith(",")) {
    const optStr = afterBody.slice(1).trim()
    if (optStr.startsWith("{")) {
      const optRes = extractBalanced(optStr, 0, "{", "}")
      if (optRes) {
        const m = optRes.content.match(/\bstatus\s*:\s*(\d+)/)
        if (m) status = parseInt(m[1], 10)
      }
    }
  }

  if (isSuccess) {
    // Check for shorthand `data` property first (no colon): { success: true, data, error: null }
    const shorthandMatch = bodyStr.match(/[{,]\s*(data)\s*[,}]/)
    if (shorthandMatch) {
      const statusArg = status !== null && status !== 200 ? `, ${status}` : ""
      return `ok(data${statusArg})`
    }

    // Extract data value after "data:"
    const dataKeyIdx = bodyStr.search(/\bdata\s*:/)
    if (dataKeyIdx === -1) return null
    const afterDataKey = bodyStr.slice(bodyStr.indexOf(":", dataKeyIdx) + 1).trim()
    const dataVal = extractValue(afterDataKey)

    const statusArg = status !== null && status !== 200 ? `, ${status}` : ""
    return `ok(${dataVal}${statusArg})`
  } else {
    // Extract error value after "error:"
    const errKeyIdx = bodyStr.search(/\berror\s*:/)
    if (errKeyIdx === -1) return null
    const afterErrKey = bodyStr.slice(bodyStr.indexOf(":", errKeyIdx) + 1).trim()
    const errVal = extractValue(afterErrKey)

    // Default status for fail() is 400; omit if 400 or unknown
    const statusArg = status !== null && status !== 400 ? `, ${status}` : ""
    return `fail(${errVal}${statusArg})`
  }
}

// ---------------------------------------------------------------------------
// Import management
// ---------------------------------------------------------------------------

function addImport(content, importLine) {
  const lines = content.split("\n")
  let lastImport = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) lastImport = i
  }
  if (lastImport === -1) return importLine + "\n" + content
  lines.splice(lastImport + 1, 0, importLine)
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Per-file processing
// ---------------------------------------------------------------------------

function processFile(file) {
  let content = fs.readFileSync(file, "utf8")
  const marker = "NextResponse.json("
  let newContent = ""
  let i = 0
  let replaced = 0
  const failures = []

  while (i < content.length) {
    const idx = content.indexOf(marker, i)
    if (idx === -1) { newContent += content.slice(i); break }

    newContent += content.slice(i, idx)
    const parenStart = idx + marker.length - 1
    const parenRes = extractBalanced(content, parenStart, "(", ")")

    if (!parenRes) {
      newContent += marker
      i = idx + marker.length
      continue
    }

    const inner = parenRes.content.slice(1, -1)
    const replacement = transform(inner)

    if (replacement !== null) {
      newContent += replacement
      replaced++
    } else {
      newContent += content.slice(idx, parenRes.end)
      failures.push(inner.slice(0, 80).replace(/\s+/g, " "))
    }

    i = parenRes.end
  }

  if (replaced === 0) return { replaced: 0, failures }

  // Add import if not already present
  const importLine = 'import { ok, fail } from "@/lib/api/response"'
  if (!newContent.includes('from "@/lib/api/response"')) {
    newContent = addImport(newContent, importLine)
  } else if (!newContent.includes("{ ok") && !newContent.includes("ok,")) {
    // Already imports from response but may not include ok/fail — update it
    newContent = newContent.replace(
      /import\s+\{([^}]+)\}\s+from\s+"@\/lib\/api\/response"/,
      (_, named) => {
        const existing = named.split(",").map((s) => s.trim()).filter(Boolean)
        for (const fn of ["ok", "fail"]) {
          if (!existing.includes(fn)) existing.push(fn)
        }
        return `import { ${existing.join(", ")} } from "@/lib/api/response"`
      }
    )
  }

  if (!DRY_RUN) fs.writeFileSync(file, newContent, "utf8")

  return { replaced, failures }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const apiDir = path.join(process.cwd(), "src/app/api")
const files = findTsFiles(apiDir)

let totalReplaced = 0
let filesModified = 0
const allFailures = []

for (const file of files) {
  const rel = path.relative(process.cwd(), file)
  const { replaced, failures } = processFile(file)
  if (replaced > 0) {
    totalReplaced += replaced
    filesModified++
    console.log(`${DRY_RUN ? "[dry] " : ""}✓ ${rel}: ${replaced} replacement${replaced > 1 ? "s" : ""}`)
  }
  for (const f of failures) allFailures.push({ file: rel, snippet: f })
}

console.log(`\n✅ ${DRY_RUN ? "[DRY RUN] " : ""}${totalReplaced} replacements in ${filesModified} files`)

if (allFailures.length) {
  console.log(`\n⚠️  ${allFailures.length} call(s) could NOT be auto-transformed (manual fix needed):`)
  for (const { file, snippet } of allFailures) {
    console.log(`  ${file}\n    NextResponse.json(${snippet}...)`)
  }
}
