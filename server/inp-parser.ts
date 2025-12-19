/**
 * Parser for SWMM5 .inp files to extract metadata and coordinates
 */

export interface InpMetadata {
  nodeCount: number;
  linkCount: number;
  subcatchmentCount: number;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface NodeCoordinate {
  id: string;
  x: number;
  y: number;
}

export interface LinkVertices {
  id: string;
  vertices: Coordinate[];
}

export interface PolygonCoordinates {
  id: string;
  vertices: Coordinate[];
}

export interface LinkDefinition {
  id: string;
  fromNode: string;
  toNode: string;
}

export interface CoordinateData {
  nodes: NodeCoordinate[];
  vertices: LinkVertices[];
  polygons: PolygonCoordinates[];
  links: LinkDefinition[];
}

export function parseInpFile(content: string): InpMetadata {
  const lines = content.split('\n');
  
  let nodeCount = 0;
  let linkCount = 0;
  let subcatchmentCount = 0;
  
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith(';')) {
      continue;
    }
    
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toUpperCase();
      continue;
    }
    
    switch (currentSection) {
      case 'JUNCTIONS':
      case 'OUTFALLS':
      case 'STORAGE':
      case 'DIVIDERS':
        nodeCount++;
        break;
      case 'CONDUITS':
      case 'PUMPS':
      case 'ORIFICES':
      case 'WEIRS':
      case 'OUTLETS':
        linkCount++;
        break;
      case 'SUBCATCHMENTS':
        subcatchmentCount++;
        break;
    }
  }
  
  return {
    nodeCount,
    linkCount,
    subcatchmentCount
  };
}

export function parseCoordinates(content: string): CoordinateData {
  const lines = content.split('\n');
  
  const nodes: NodeCoordinate[] = [];
  const verticesMap = new Map<string, Coordinate[]>();
  const polygonsMap = new Map<string, Coordinate[]>();
  const links: LinkDefinition[] = [];
  
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith(';')) {
      continue;
    }
    
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toUpperCase();
      continue;
    }
    
    const parts = trimmed.split(/\s+/);
    
    switch (currentSection) {
      case 'COORDINATES':
        if (parts.length >= 3) {
          const id = parts[0];
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          if (!isNaN(x) && !isNaN(y)) {
            nodes.push({ id, x, y });
          }
        }
        break;
        
      case 'VERTICES':
        if (parts.length >= 3) {
          const id = parts[0];
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          if (!isNaN(x) && !isNaN(y)) {
            if (!verticesMap.has(id)) {
              verticesMap.set(id, []);
            }
            verticesMap.get(id)!.push({ x, y });
          }
        }
        break;
        
      case 'POLYGONS':
        if (parts.length >= 3) {
          const id = parts[0];
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          if (!isNaN(x) && !isNaN(y)) {
            if (!polygonsMap.has(id)) {
              polygonsMap.set(id, []);
            }
            polygonsMap.get(id)!.push({ x, y });
          }
        }
        break;
        
      case 'CONDUITS':
      case 'PUMPS':
      case 'ORIFICES':
      case 'WEIRS':
      case 'OUTLETS':
        if (parts.length >= 3) {
          links.push({
            id: parts[0],
            fromNode: parts[1],
            toNode: parts[2]
          });
        }
        break;
    }
  }
  
  const vertices: LinkVertices[] = Array.from(verticesMap.entries()).map(([id, verts]) => ({
    id,
    vertices: verts
  }));
  
  const polygons: PolygonCoordinates[] = Array.from(polygonsMap.entries()).map(([id, verts]) => ({
    id,
    vertices: verts
  }));
  
  return {
    nodes,
    vertices,
    polygons,
    links
  };
}
