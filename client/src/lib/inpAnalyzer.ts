export interface AnalysisIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  section?: string;
}

export interface SectionCategory {
  name: string;
  sections: { name: string; found: boolean }[];
  completeness: number;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  issues: AnalysisIssue[];
  suggestions: string[];
  sectionCounts: Record<string, number>;
  sectionCategories: SectionCategory[];
  stats: {
    nodeCount: number;
    linkCount: number;
    subcatchmentCount: number;
    totalSections: number;
    missingSections: string[];
    foundSections: string[];
  };
}

const EXPECTED_SECTIONS = [
  'TITLE', 'OPTIONS', 'RAINGAGES', 'SUBCATCHMENTS', 'SUBAREAS',
  'INFILTRATION', 'JUNCTIONS', 'OUTFALLS', 'CONDUITS', 'XSECTIONS',
  'COORDINATES', 'REPORT', 'MAP'
];

const NODE_SECTIONS = ['JUNCTIONS', 'OUTFALLS', 'STORAGE', 'DIVIDERS'];
const LINK_SECTIONS = ['CONDUITS', 'PUMPS', 'ORIFICES', 'WEIRS', 'OUTLETS'];

export function analyzeInpFile(content: string): AnalysisResult {
  const lines = content.split('\n');
  const issues: AnalysisIssue[] = [];
  const suggestions: string[] = [];
  const sectionCounts: Record<string, number> = {};

  let currentSection = '';
  const foundSections = new Set<string>();
  const nodeIds = new Set<string>();
  const linkNodes = new Map<string, { from: string; to: string }>();
  const outfallIds = new Set<string>();
  const junctionInverts = new Map<string, number>();
  const conduitData: Array<{ id: string; from: string; to: string; length: number; roughness: number; slope?: number }> = [];
  const subcatchmentOutlets = new Set<string>();
  const xsections = new Map<string, { shape: string; geom1: number }>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toUpperCase();
      foundSections.add(currentSection);
      if (!sectionCounts[currentSection]) sectionCounts[currentSection] = 0;
      continue;
    }

    if (currentSection) {
      sectionCounts[currentSection] = (sectionCounts[currentSection] || 0) + 1;
    }

    const parts = trimmed.split(/\s+/);

    switch (currentSection) {
      case 'JUNCTIONS':
        if (parts.length >= 1) {
          nodeIds.add(parts[0]);
          if (parts.length >= 2) {
            const invert = parseFloat(parts[1]);
            if (!isNaN(invert)) junctionInverts.set(parts[0], invert);
          }
        }
        break;
      case 'OUTFALLS':
        if (parts.length >= 1) {
          nodeIds.add(parts[0]);
          outfallIds.add(parts[0]);
        }
        break;
      case 'STORAGE':
      case 'DIVIDERS':
        if (parts.length >= 1) nodeIds.add(parts[0]);
        break;
      case 'CONDUITS':
        if (parts.length >= 5) {
          const id = parts[0];
          const from = parts[1];
          const to = parts[2];
          const length = parseFloat(parts[3]);
          const roughness = parseFloat(parts[4]);
          linkNodes.set(id, { from, to });
          conduitData.push({ id, from, to, length, roughness });
        }
        break;
      case 'PUMPS':
      case 'ORIFICES':
      case 'WEIRS':
      case 'OUTLETS':
        if (parts.length >= 3) {
          linkNodes.set(parts[0], { from: parts[1], to: parts[2] });
        }
        break;
      case 'SUBCATCHMENTS':
        if (parts.length >= 3) {
          subcatchmentOutlets.add(parts[2]);
        }
        break;
      case 'XSECTIONS':
        if (parts.length >= 3) {
          const shape = parts[1];
          const geom1 = parseFloat(parts[2]);
          xsections.set(parts[0], { shape, geom1 });
        }
        break;
    }
  }

  const nodeCount = nodeIds.size;
  const linkCount = linkNodes.size;
  const subcatchmentCount = sectionCounts['SUBCATCHMENTS'] || 0;
  const totalSections = foundSections.size;
  const missingSections = EXPECTED_SECTIONS.filter(s => !foundSections.has(s));

  const SECTION_CATEGORIES = [
    { name: 'Core Network', sections: ['JUNCTIONS', 'OUTFALLS', 'STORAGE', 'DIVIDERS', 'CONDUITS', 'PUMPS', 'ORIFICES', 'WEIRS', 'OUTLETS'] },
    { name: 'Geometry', sections: ['XSECTIONS', 'TRANSECTS', 'COORDINATES', 'VERTICES', 'MAP', 'POLYGONS'] },
    { name: 'Hydrology', sections: ['RAINGAGES', 'SUBCATCHMENTS', 'SUBAREAS', 'INFILTRATION', 'AQUIFERS', 'GROUNDWATER'] },
    { name: 'Hydraulics', sections: ['OPTIONS', 'REPORT', 'LOSSES', 'CONTROLS', 'CURVES', 'TIMESERIES', 'PATTERNS', 'DWF', 'INFLOWS'] },
    { name: 'Water Quality', sections: ['POLLUTANTS', 'LANDUSES', 'BUILDUP', 'WASHOFF', 'COVERAGES', 'TREATMENT', 'LOADINGS'] },
    { name: 'Green Infrastructure', sections: ['LID_CONTROLS', 'LID_USAGE'] },
    { name: 'Snow & Climate', sections: ['SNOWPACKS', 'TEMPERATURE', 'EVAPORATION', 'ADJUSTMENTS'] },
  ];

  const sectionCategories: SectionCategory[] = SECTION_CATEGORIES.map(cat => {
    const secs = cat.sections.map(s => ({ name: s, found: foundSections.has(s) }));
    const foundCount = secs.filter(s => s.found).length;
    return {
      name: cat.name,
      sections: secs,
      completeness: secs.length > 0 ? Math.round((foundCount / secs.length) * 100) : 0,
    };
  });

  if (outfallIds.size === 0 && nodeCount > 0) {
    issues.push({ type: 'error', message: 'No outfall nodes defined — the model has no drainage outlet.', section: 'OUTFALLS' });
    suggestions.push('Add at least one outfall node to define where water exits the system.');
  }

  if (!foundSections.has('OPTIONS')) {
    issues.push({ type: 'warning', message: 'Missing [OPTIONS] section — simulation defaults may produce unexpected results.', section: 'OPTIONS' });
    suggestions.push('Add an [OPTIONS] section specifying flow units, routing method, and simulation dates.');
  }

  if (!foundSections.has('RAINGAGES') && subcatchmentCount > 0) {
    issues.push({ type: 'warning', message: 'Subcatchments defined but no rain gages found.', section: 'RAINGAGES' });
    suggestions.push('Define rain gages and associate them with subcatchments for hydrological simulation.');
  }

  if (subcatchmentCount > 0 && !foundSections.has('SUBAREAS')) {
    issues.push({ type: 'warning', message: 'Subcatchments present but [SUBAREAS] section is missing — default roughness values will be used.', section: 'SUBAREAS' });
  }

  if (subcatchmentCount > 0 && !foundSections.has('INFILTRATION')) {
    issues.push({ type: 'warning', message: 'Subcatchments present but [INFILTRATION] section is missing — infiltration parameters undefined.', section: 'INFILTRATION' });
  }

  Array.from(linkNodes.entries()).forEach(([linkId, { from, to }]) => {
    if (!nodeIds.has(from)) {
      issues.push({ type: 'error', message: `Link "${linkId}" references undefined upstream node "${from}".`, section: 'CONDUITS' });
    }
    if (!nodeIds.has(to)) {
      issues.push({ type: 'error', message: `Link "${linkId}" references undefined downstream node "${to}".`, section: 'CONDUITS' });
    }
  });

  const connectedNodes = new Set<string>();
  Array.from(linkNodes.values()).forEach(({ from, to }) => {
    connectedNodes.add(from);
    connectedNodes.add(to);
  });
  const disconnected = Array.from(nodeIds).filter(n => !connectedNodes.has(n) && !outfallIds.has(n));
  if (disconnected.length > 0 && disconnected.length <= 5) {
    for (const n of disconnected) {
      issues.push({ type: 'warning', message: `Node "${n}" is not connected to any link.`, section: 'JUNCTIONS' });
    }
    suggestions.push('Connect isolated nodes to conduits or remove them to simplify the model.');
  } else if (disconnected.length > 5) {
    issues.push({ type: 'warning', message: `${disconnected.length} nodes are not connected to any link.`, section: 'JUNCTIONS' });
    suggestions.push('Review and connect or remove the isolated nodes to improve model integrity.');
  }

  for (const c of conduitData) {
    if (c.roughness <= 0 || c.roughness > 0.5) {
      issues.push({ type: 'warning', message: `Conduit "${c.id}" has unusual Manning's n value (${c.roughness}). Typical range: 0.01–0.03.`, section: 'CONDUITS' });
    } else if (c.roughness > 0.05) {
      issues.push({ type: 'info', message: `Conduit "${c.id}" has relatively high Manning's n (${c.roughness}), indicating very rough surface.`, section: 'CONDUITS' });
    }

    if (c.length <= 0) {
      issues.push({ type: 'error', message: `Conduit "${c.id}" has zero or negative length (${c.length}).`, section: 'CONDUITS' });
    }

    const fromInvert = junctionInverts.get(c.from);
    const toInvert = junctionInverts.get(c.to);
    if (fromInvert !== undefined && toInvert !== undefined && c.length > 0) {
      const slope = (fromInvert - toInvert) / c.length;
      c.slope = slope;
      if (Math.abs(slope) < 0.0001 && slope >= 0) {
        issues.push({ type: 'warning', message: `Conduit "${c.id}" has near-zero slope (${slope.toFixed(6)}), which may cause instability.`, section: 'CONDUITS' });
      }
      if (slope < 0) {
        issues.push({ type: 'info', message: `Conduit "${c.id}" has adverse slope (${slope.toFixed(4)}), water flows against gravity based on invert elevations.`, section: 'CONDUITS' });
      }
    }
  }

  Array.from(xsections.entries()).forEach(([linkId, xs]) => {
    if (xs.geom1 <= 0) {
      issues.push({ type: 'error', message: `Cross-section for link "${linkId}" has zero or negative geometry (${xs.geom1}).`, section: 'XSECTIONS' });
    }
  });

  if (!foundSections.has('COORDINATES') && nodeCount > 0) {
    issues.push({ type: 'info', message: 'No [COORDINATES] section — the model cannot be visualized on a map.', section: 'COORDINATES' });
    suggestions.push('Add node coordinates to enable map visualization of the network.');
  }

  if (nodeCount > 0 && linkCount === 0) {
    issues.push({ type: 'error', message: 'Nodes are defined but no links/conduits exist — the network is not connected.' });
    suggestions.push('Add conduits or other links to connect the defined nodes.');
  }

  if (missingSections.length > 5) {
    suggestions.push(`The model is missing ${missingSections.length} common sections (${missingSections.slice(0, 4).join(', ')}, ...). Consider if any are needed.`);
  }

  const errorCount = issues.filter(i => i.type === 'error').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const infoCount = issues.filter(i => i.type === 'info').length;

  let score = 100;
  score -= errorCount * 15;
  score -= warningCount * 5;
  score -= infoCount * 1;

  if (missingSections.length > 3) score -= (missingSections.length - 3) * 2;
  if (outfallIds.size === 0 && nodeCount > 0) score -= 10;
  if (nodeCount === 0 && linkCount === 0) score -= 20;

  score = Math.max(0, Math.min(100, score));

  let summary = '';
  if (score >= 90) {
    summary = 'Excellent model structure with minimal issues detected.';
  } else if (score >= 75) {
    summary = 'Good model structure with some minor issues that should be reviewed.';
  } else if (score >= 50) {
    summary = 'Model has several issues that may affect simulation accuracy and stability.';
  } else if (score >= 25) {
    summary = 'Significant structural problems detected — review required before simulation.';
  } else {
    summary = 'Critical issues found — the model needs substantial corrections before running.';
  }

  if (issues.length === 0 && nodeCount === 0 && linkCount === 0) {
    summary = 'The file appears to be empty or does not contain standard SWMM5 model elements.';
    score = 0;
  }

  if (suggestions.length === 0 && issues.length > 0) {
    suggestions.push('Review all flagged issues and correct them before running a simulation.');
  }

  if (suggestions.length === 0 && issues.length === 0 && nodeCount > 0) {
    suggestions.push('Model looks good! Consider running a simulation to verify results.');
  }

  return {
    score,
    summary,
    issues,
    suggestions,
    sectionCounts,
    sectionCategories,
    stats: {
      nodeCount,
      linkCount,
      subcatchmentCount,
      totalSections,
      missingSections,
      foundSections: Array.from(foundSections),
    },
  };
}
