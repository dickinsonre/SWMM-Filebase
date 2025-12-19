export interface DiffLine {
  lineNumber1: number | null;
  lineNumber2: number | null;
  content: string;
  type: 'unchanged' | 'added' | 'removed';
}

export interface SectionDiff {
  name: string;
  lines: DiffLine[];
  hasChanges: boolean;
}

interface ParsedSection {
  name: string;
  headerLine: string;
  headerLineNum: number;
  lines: { content: string; lineNum: number }[];
}

function parseInpSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const allLines = content.split('\n');
  let currentSection: ParsedSection = {
    name: 'HEADER',
    headerLine: '',
    headerLineNum: 0,
    lines: []
  };

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;
    
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (currentSection.lines.length > 0 || currentSection.name === 'HEADER') {
        sections.push(currentSection);
      }
      const sectionName = trimmed.slice(1, -1).toUpperCase();
      currentSection = {
        name: sectionName,
        headerLine: line,
        headerLineNum: lineNum,
        lines: []
      };
    } else {
      currentSection.lines.push({ content: line, lineNum });
    }
  }
  
  if (currentSection.lines.length > 0 || currentSection.name !== 'HEADER') {
    sections.push(currentSection);
  }

  return sections;
}

function computeLineDiff(
  lines1: { content: string; lineNum: number }[],
  lines2: { content: string; lineNum: number }[]
): DiffLine[] {
  const m = lines1.length;
  const n = lines2.length;
  
  if (m === 0 && n === 0) return [];
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1].content === lines2[j - 1].content) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  let i = m, j = n;
  const temp: DiffLine[] = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1].content === lines2[j - 1].content) {
      temp.unshift({
        lineNumber1: lines1[i - 1].lineNum,
        lineNumber2: lines2[j - 1].lineNum,
        content: lines1[i - 1].content,
        type: 'unchanged'
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.unshift({
        lineNumber1: null,
        lineNumber2: lines2[j - 1].lineNum,
        content: lines2[j - 1].content,
        type: 'added'
      });
      j--;
    } else {
      temp.unshift({
        lineNumber1: lines1[i - 1].lineNum,
        lineNumber2: null,
        content: lines1[i - 1].content,
        type: 'removed'
      });
      i--;
    }
  }
  
  return temp;
}

export function compareInpFiles(content1: string, content2: string): SectionDiff[] {
  const sections1 = parseInpSections(content1);
  const sections2 = parseInpSections(content2);
  
  const sectionMap1 = new Map<string, ParsedSection>();
  const sectionMap2 = new Map<string, ParsedSection>();
  
  for (const s of sections1) sectionMap1.set(s.name, s);
  for (const s of sections2) sectionMap2.set(s.name, s);
  
  const allSectionNames = new Set([...Array.from(sectionMap1.keys()), ...Array.from(sectionMap2.keys())]);
  const result: SectionDiff[] = [];
  
  for (const sectionName of Array.from(allSectionNames)) {
    const sec1 = sectionMap1.get(sectionName);
    const sec2 = sectionMap2.get(sectionName);
    
    const diffLines: DiffLine[] = [];
    
    if (sec1 && sec2) {
      if (sec1.headerLine === sec2.headerLine) {
        if (sec1.headerLine) {
          diffLines.push({
            lineNumber1: sec1.headerLineNum,
            lineNumber2: sec2.headerLineNum,
            content: sec1.headerLine,
            type: 'unchanged'
          });
        }
      } else {
        if (sec1.headerLine) {
          diffLines.push({
            lineNumber1: sec1.headerLineNum,
            lineNumber2: null,
            content: sec1.headerLine,
            type: 'removed'
          });
        }
        if (sec2.headerLine) {
          diffLines.push({
            lineNumber1: null,
            lineNumber2: sec2.headerLineNum,
            content: sec2.headerLine,
            type: 'added'
          });
        }
      }
      diffLines.push(...computeLineDiff(sec1.lines, sec2.lines));
    } else if (sec1) {
      if (sec1.headerLine) {
        diffLines.push({
          lineNumber1: sec1.headerLineNum,
          lineNumber2: null,
          content: sec1.headerLine,
          type: 'removed'
        });
      }
      for (const line of sec1.lines) {
        diffLines.push({
          lineNumber1: line.lineNum,
          lineNumber2: null,
          content: line.content,
          type: 'removed'
        });
      }
    } else if (sec2) {
      if (sec2.headerLine) {
        diffLines.push({
          lineNumber1: null,
          lineNumber2: sec2.headerLineNum,
          content: sec2.headerLine,
          type: 'added'
        });
      }
      for (const line of sec2.lines) {
        diffLines.push({
          lineNumber1: null,
          lineNumber2: line.lineNum,
          content: line.content,
          type: 'added'
        });
      }
    }
    
    const hasChanges = diffLines.some(line => line.type !== 'unchanged');
    
    result.push({
      name: sectionName,
      lines: diffLines,
      hasChanges
    });
  }
  
  const sectionOrder = ['HEADER', 'TITLE', 'OPTIONS', 'EVAPORATION', 'RAINGAGES', 'SUBCATCHMENTS', 'SUBAREAS', 'INFILTRATION', 'JUNCTIONS', 'OUTFALLS', 'STORAGE', 'CONDUITS', 'PUMPS', 'ORIFICES', 'WEIRS', 'OUTLETS', 'XSECTIONS', 'TRANSECTS', 'LOSSES', 'CONTROLS', 'POLLUTANTS', 'LANDUSES', 'COVERAGES', 'LOADINGS', 'BUILDUP', 'WASHOFF', 'INFLOWS', 'DWF', 'PATTERNS', 'RDII', 'HYDROGRAPHS', 'CURVES', 'TIMESERIES', 'REPORT', 'TAGS', 'MAP', 'COORDINATES', 'VERTICES', 'POLYGONS', 'SYMBOLS', 'LABELS', 'BACKDROP', 'PROFILES'];
  
  result.sort((a, b) => {
    const indexA = sectionOrder.indexOf(a.name);
    const indexB = sectionOrder.indexOf(b.name);
    if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  
  return result;
}
