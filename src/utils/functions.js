export const getObjectPaths = (obj, parentKey = "", paths = []) => {
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      getObjectPaths(obj[key], `${parentKey}${key}.`, paths);
    } else {
      paths.push(`${parentKey}${key}`);
    }
  }
  return paths;
};

export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => 0)
  );

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

export function soundex(s) {
  const code =
    s.charAt(0).toUpperCase() +
    s
      .slice(1)
      .replace(/[^A-Z]/g, "")
      .replace(/[AEIOUYHW]/g, "0")
      .replace(/[BFPV]/g, "1")
      .replace(/[CGJKQSXZ]/g, "2")
      .replace(/[DT]/g, "3")
      .replace(/[L]/g, "4")
      .replace(/[MN]/g, "5")
      .replace(/[R]/g, "6");
  return (
    code.charAt(0) + code.slice(1).replace(/0/g, "").slice(0, 3).padEnd(3, "0")
  );
}

export function computeSegmentScore(segment, segments) {
  const segmentScores = segments.map((s) => computeSubstringScore(segment, s));
  return Math.max(...segmentScores);
}

export function computeSubstringScore(substring, string) {
  if (string.startsWith(substring)) {
    return substring.length / string.length;
  }

  const distance = levenshteinDistance(substring, string);
  return (substring.length - distance) / substring.length;
}
