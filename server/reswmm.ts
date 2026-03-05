export type DiscretizationMethod = 'none' | 'fixed_interval' | 'dx_d_ratio';

export interface ReswmmConfig {
  enabled: boolean;
  method: DiscretizationMethod;
  fixedMinLength: number;
  fixedMaxLength: number;
  dxDRatio: number;
  mnsa: number;
}

export const DEFAULT_RESWMM: ReswmmConfig = {
  enabled: false,
  method: 'fixed_interval',
  fixedMinLength: 50,
  fixedMaxLength: 200,
  dxDRatio: 5,
  mnsa: 12.566,
};

interface ConduitData {
  name: string;
  from: string;
  to: string;
  len: number;
  rough: number;
  inOff: number;
  outOff: number;
  diam: number;
  shape: string;
  barrels: number;
  geom2: number;
  geom3: number;
  geom4: number;
}

interface JunctionData {
  name: string;
  elev: number;
  maxD: number;
  ponded: number;
  x: number;
  y: number;
}

interface NodeInfo {
  elev: number;
  maxD: number;
  x: number;
  y: number;
}

interface LossData {
  name: string;
  entry: number;
  exit: number;
  avg: number;
  flapGate: string;
}

export interface ReswmmResult {
  originalContent: string;
  discretizedContent: string;
  stats: {
    reswmmEnabled: boolean;
    reswmmMethod: string;
    reswmmOrigConduits: number;
    reswmmNewConduits: number;
    reswmmNewJunctions: number;
    reswmmSplitLinks: number;
    reswmmMNSA: number;
  };
  changed: boolean;
}

function parseSections(content: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  const lines = content.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.includes(']')) {
      currentSection = trimmed.split(']')[0] + ']';
      currentSection = currentSection.toUpperCase();
      if (!sections.has(currentSection)) {
        sections.set(currentSection, []);
      }
      continue;
    }
    if (currentSection) {
      sections.get(currentSection)!.push(line);
    }
  }
  return sections;
}

function parseConduits(lines: string[]): ConduitData[] {
  const conduits: ConduitData[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 7) {
      conduits.push({
        name: parts[0],
        from: parts[1],
        to: parts[2],
        len: parseFloat(parts[3]) || 0,
        rough: parseFloat(parts[4]) || 0.013,
        inOff: parseFloat(parts[5]) || 0,
        outOff: parseFloat(parts[6]) || 0,
        diam: 0,
        shape: 'CIRCULAR',
        barrels: 1,
        geom2: 0,
        geom3: 0,
        geom4: 0,
      });
    }
  }
  return conduits;
}

function parseXsections(lines: string[]): Map<string, { shape: string; geom1: number; geom2: number; geom3: number; geom4: number; barrels: number }> {
  const xsections = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      xsections.set(parts[0], {
        shape: parts[1],
        geom1: parseFloat(parts[2]) || 0,
        geom2: parseFloat(parts[3]) || 0,
        geom3: parseFloat(parts[4]) || 0,
        geom4: parseFloat(parts[5]) || 0,
        barrels: parseInt(parts[6]) || 1,
      });
    }
  }
  return xsections;
}

function parseJunctions(lines: string[]): Map<string, NodeInfo> {
  const nodes = new Map<string, NodeInfo>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      nodes.set(parts[0], {
        elev: parseFloat(parts[1]) || 0,
        maxD: parseFloat(parts[2]) || 0,
        x: 0,
        y: 0,
      });
    }
  }
  return nodes;
}

function parseOutfalls(lines: string[]): Map<string, NodeInfo> {
  const nodes = new Map<string, NodeInfo>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      nodes.set(parts[0], {
        elev: parseFloat(parts[1]) || 0,
        maxD: 0,
        x: 0,
        y: 0,
      });
    }
  }
  return nodes;
}

function parseStorageNodes(lines: string[]): Map<string, NodeInfo> {
  const nodes = new Map<string, NodeInfo>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      nodes.set(parts[0], {
        elev: parseFloat(parts[1]) || 0,
        maxD: parseFloat(parts[2]) || 0,
        x: 0,
        y: 0,
      });
    }
  }
  return nodes;
}

function parseCoords(lines: string[]): Map<string, { x: number; y: number }> {
  const coords = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      coords.set(parts[0], {
        x: parseFloat(parts[1]) || 0,
        y: parseFloat(parts[2]) || 0,
      });
    }
  }
  return coords;
}

function parseLosses(lines: string[]): Map<string, LossData> {
  const losses = new Map<string, LossData>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 4) {
      losses.set(parts[0], {
        name: parts[0],
        entry: parseFloat(parts[1]) || 0,
        exit: parseFloat(parts[2]) || 0,
        avg: parseFloat(parts[3]) || 0,
        flapGate: parts[4] || 'NO',
      });
    }
  }
  return losses;
}

export function applyReswmm(content: string, config: ReswmmConfig): ReswmmResult {
  if (!config.enabled || config.method === 'none') {
    return {
      originalContent: content,
      discretizedContent: content,
      stats: {
        reswmmEnabled: false,
        reswmmMethod: config.method,
        reswmmOrigConduits: 0,
        reswmmNewConduits: 0,
        reswmmNewJunctions: 0,
        reswmmSplitLinks: 0,
        reswmmMNSA: config.mnsa,
      },
      changed: false,
    };
  }

  const sections = parseSections(content);

  const conduits = parseConduits(sections.get('[CONDUITS]') || []);
  const xsections = parseXsections(sections.get('[XSECTIONS]') || []);
  const losses = parseLosses(sections.get('[LOSSES]') || []);

  const nodeLookup = new Map<string, NodeInfo>();

  const junctionNodes = parseJunctions(sections.get('[JUNCTIONS]') || []);
  for (const [k, v] of junctionNodes) nodeLookup.set(k, v);

  const outfallNodes = parseOutfalls(sections.get('[OUTFALLS]') || []);
  for (const [k, v] of outfallNodes) nodeLookup.set(k, v);

  const storageNodes = parseStorageNodes(sections.get('[STORAGE]') || []);
  for (const [k, v] of storageNodes) nodeLookup.set(k, v);

  const coords = parseCoords(sections.get('[COORDINATES]') || []);
  for (const [name, coord] of coords) {
    const node = nodeLookup.get(name);
    if (node) {
      node.x = coord.x;
      node.y = coord.y;
    }
  }

  for (const c of conduits) {
    const xs = xsections.get(c.name);
    if (xs) {
      c.diam = xs.geom1;
      c.shape = xs.shape;
      c.barrels = xs.barrels;
      c.geom2 = xs.geom2;
      c.geom3 = xs.geom3;
      c.geom4 = xs.geom4;
    }
  }

  const origConduitCount = conduits.length;
  if (origConduitCount === 0) {
    return {
      originalContent: content,
      discretizedContent: content,
      stats: {
        reswmmEnabled: true,
        reswmmMethod: config.method,
        reswmmOrigConduits: 0,
        reswmmNewConduits: 0,
        reswmmNewJunctions: 0,
        reswmmSplitLinks: 0,
        reswmmMNSA: config.mnsa,
      },
      changed: false,
    };
  }

  const newJunctions: JunctionData[] = [];
  const newConduits: ConduitData[] = [];
  const newXsections: { name: string; shape: string; geom1: number; geom2: number; geom3: number; geom4: number; barrels: number }[] = [];
  const newLosses: LossData[] = [];
  const newCoords: { name: string; x: number; y: number }[] = [];
  let splitLinks = 0;

  for (const c of conduits) {
    let targetLen: number;
    if (config.method === 'fixed_interval') {
      targetLen = Math.min(
        config.fixedMaxLength,
        Math.max(config.fixedMinLength, c.len)
      );
    } else {
      if (c.diam <= 0) {
        targetLen = Math.min(200, Math.max(50, c.len));
      } else {
        targetLen = Math.max(1, c.diam * config.dxDRatio);
      }
    }

    const nSeg = Math.max(1, Math.ceil(c.len / targetLen));

    if (nSeg <= 1) {
      newConduits.push(c);
      const xs = xsections.get(c.name);
      if (xs) {
        newXsections.push({ name: c.name, ...xs });
      }
      const loss = losses.get(c.name);
      if (loss) {
        newLosses.push(loss);
      }
      continue;
    }

    splitLinks++;
    const segLen = +(c.len / nSeg).toFixed(2);
    const fromNode = nodeLookup.get(c.from);
    const toNode = nodeLookup.get(c.to);

    if (!fromNode || !toNode) {
      newConduits.push(c);
      const xs = xsections.get(c.name);
      if (xs) newXsections.push({ name: c.name, ...xs });
      const loss = losses.get(c.name);
      if (loss) newLosses.push(loss);
      continue;
    }

    const fromElev = fromNode.elev || 0;
    const toElev = toNode.elev || 0;
    let prevNodeName = c.from;

    const loss = losses.get(c.name);

    for (let s = 0; s < nSeg; s++) {
      const isFirst = s === 0;
      const isLast = s === nSeg - 1;
      let nextNodeName: string;

      if (isLast) {
        nextNodeName = c.to;
      } else {
        const frac = (s + 1) / nSeg;
        nextNodeName = `${c.name}_N${s + 1}`;

        const interpElev = +(fromElev + (toElev - fromElev) * frac).toFixed(3);
        const interpX = fromNode.x + (toNode.x - fromNode.x) * frac;
        const interpY = fromNode.y + (toNode.y - fromNode.y) * frac;
        const maxD = fromNode.maxD || 6;
        const mnsaPonded = config.mnsa;

        newJunctions.push({
          name: nextNodeName,
          elev: interpElev,
          maxD: +maxD.toFixed(2),
          ponded: mnsaPonded,
          x: interpX,
          y: interpY,
        });

        nodeLookup.set(nextNodeName, {
          elev: interpElev,
          maxD,
          x: interpX,
          y: interpY,
        });

        newCoords.push({
          name: nextNodeName,
          x: interpX,
          y: interpY,
        });
      }

      const segName = `${c.name}_${s + 1}`;
      newConduits.push({
        name: segName,
        from: prevNodeName,
        to: nextNodeName,
        len: segLen,
        rough: c.rough,
        inOff: isFirst ? c.inOff : 0,
        outOff: isLast ? c.outOff : 0,
        diam: c.diam,
        shape: c.shape,
        barrels: c.barrels,
        geom2: c.geom2,
        geom3: c.geom3,
        geom4: c.geom4,
      });

      newXsections.push({
        name: segName,
        shape: c.shape,
        geom1: c.diam,
        geom2: c.geom2,
        geom3: c.geom3,
        geom4: c.geom4,
        barrels: c.barrels,
      });

      if (loss) {
        newLosses.push({
          name: segName,
          entry: isFirst ? loss.entry : 0,
          exit: isLast ? loss.exit : 0,
          avg: +(loss.avg / nSeg).toFixed(4),
          flapGate: loss.flapGate,
        });
      }

      prevNodeName = nextNodeName;
    }
  }

  if (splitLinks === 0) {
    return {
      originalContent: content,
      discretizedContent: content,
      stats: {
        reswmmEnabled: true,
        reswmmMethod: config.method,
        reswmmOrigConduits: origConduitCount,
        reswmmNewConduits: origConduitCount,
        reswmmNewJunctions: 0,
        reswmmSplitLinks: 0,
        reswmmMNSA: config.mnsa,
      },
      changed: false,
    };
  }

  const outputLines: string[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  let skipSection = false;
  const modifiedSections = new Set(['[CONDUITS]', '[XSECTIONS]', '[LOSSES]', '[JUNCTIONS]', '[COORDINATES]']);

  let titleDone = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('[') && trimmed.includes(']')) {
      const sectionName = (trimmed.split(']')[0] + ']').toUpperCase();

      if (skipSection) {
        skipSection = false;
      }

      if (currentSection === '[TITLE]' && !titleDone) {
        const methodDesc = config.method === 'fixed_interval'
          ? `Fixed Interval (${config.fixedMinLength}-${config.fixedMaxLength})`
          : `Dx/D Ratio (${config.dxDRatio})`;
        outputLines.push(`;;ReSWMM Discretization: ${methodDesc}, MNSA=${config.mnsa}`);
        titleDone = true;
      }

      if (modifiedSections.has(sectionName)) {
        outputLines.push(lines[i]);
        currentSection = sectionName;

        if (sectionName === '[JUNCTIONS]') {
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed.startsWith('[')) break;
            outputLines.push(lines[j]);
            i = j;
          }
          for (const jn of newJunctions) {
            outputLines.push(`${jn.name.padEnd(20)} ${jn.elev.toFixed(3).padStart(10)} ${jn.maxD.toFixed(2).padStart(10)} 0          ${jn.ponded.toFixed(3)}`);
          }
        } else if (sectionName === '[CONDUITS]') {
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed.startsWith('[')) break;
            if (nextTrimmed.startsWith(';') || !nextTrimmed) {
              outputLines.push(lines[j]);
            }
            i = j;
          }
          for (const nc of newConduits) {
            outputLines.push(
              `${nc.name.padEnd(20)} ${nc.from.padEnd(20)} ${nc.to.padEnd(20)} ${nc.len.toFixed(2).padStart(12)} ${nc.rough.toFixed(4).padStart(10)} ${nc.inOff.toFixed(2).padStart(10)} ${nc.outOff.toFixed(2).padStart(10)}`
            );
          }
        } else if (sectionName === '[XSECTIONS]') {
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed.startsWith('[')) break;
            if (nextTrimmed.startsWith(';') || !nextTrimmed) {
              outputLines.push(lines[j]);
            }
            i = j;
          }
          for (const xs of newXsections) {
            outputLines.push(
              `${xs.name.padEnd(20)} ${xs.shape.padEnd(14)} ${xs.geom1.toFixed(4).padStart(10)} ${xs.geom2.toFixed(4).padStart(10)} ${xs.geom3.toFixed(4).padStart(10)} ${xs.geom4.toFixed(4).padStart(10)} ${String(xs.barrels).padStart(3)}`
            );
          }
        } else if (sectionName === '[LOSSES]') {
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed.startsWith('[')) break;
            if (nextTrimmed.startsWith(';') || !nextTrimmed) {
              outputLines.push(lines[j]);
            }
            i = j;
          }
          for (const l of newLosses) {
            outputLines.push(
              `${l.name.padEnd(20)} ${l.entry.toFixed(4).padStart(10)} ${l.exit.toFixed(4).padStart(10)} ${l.avg.toFixed(4).padStart(10)} ${l.flapGate.padStart(6)}`
            );
          }
        } else if (sectionName === '[COORDINATES]') {
          for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed.startsWith('[')) break;
            outputLines.push(lines[j]);
            i = j;
          }
          for (const nc of newCoords) {
            outputLines.push(
              `${nc.name.padEnd(20)} ${nc.x.toFixed(3).padStart(18)} ${nc.y.toFixed(3).padStart(18)}`
            );
          }
        }

        continue;
      }

      currentSection = sectionName;
      outputLines.push(lines[i]);
      continue;
    }

    if (trimmed.startsWith('[')) {
      currentSection = trimmed.toUpperCase();
    }

    outputLines.push(lines[i]);
  }

  if (!titleDone) {
    const titleIdx = outputLines.findIndex(l => l.trim().toUpperCase().startsWith('[TITLE]'));
    if (titleIdx >= 0) {
      const methodDesc = config.method === 'fixed_interval'
        ? `Fixed Interval (${config.fixedMinLength}-${config.fixedMaxLength})`
        : `Dx/D Ratio (${config.dxDRatio})`;
      outputLines.splice(titleIdx + 1, 0, `;;ReSWMM Discretization: ${methodDesc}, MNSA=${config.mnsa}`);
    }
  }

  return {
    originalContent: content,
    discretizedContent: outputLines.join('\n'),
    stats: {
      reswmmEnabled: true,
      reswmmMethod: config.method,
      reswmmOrigConduits: origConduitCount,
      reswmmNewConduits: newConduits.length,
      reswmmNewJunctions: newJunctions.length,
      reswmmSplitLinks: splitLinks,
      reswmmMNSA: config.mnsa,
    },
    changed: true,
  };
}
