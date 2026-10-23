// Changed line ranges from a unified diff patch, as GitHub returns it per file.
//
// Ranges are line numbers in the NEW file. Added lines count as themselves.
// A deletion counts as the new-file line where it happened, so two branches
// that delete or rewrite the same spot still overlap. Context lines are ignored.

export function rangesFromPatch(patch: string | undefined): [number, number][] {
  if (!patch) return [];
  const lines: number[] = [];
  let newLine = 0;
  for (const row of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(row);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (row.startsWith("+")) {
      lines.push(newLine);
      newLine++;
    } else if (row.startsWith("-")) {
      lines.push(Math.max(1, newLine));
    } else if (row.startsWith("\\")) {
      // "\ No newline at end of file"
    } else {
      newLine++;
    }
  }
  return compress(lines);
}

/** [3,4,5,9,10] -> [[3,5],[9,10]] */
function compress(lines: number[]): [number, number][] {
  const sorted = [...new Set(lines)].sort((a, b) => a - b);
  const out: [number, number][] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && n <= last[1] + 1) last[1] = n;
    else out.push([n, n]);
  }
  return out;
}
