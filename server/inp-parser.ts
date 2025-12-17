/**
 * Parser for SWMM5 .inp files to extract metadata
 */

interface InpMetadata {
  nodeCount: number;
  linkCount: number;
  subcatchmentCount: number;
}

export function parseInpFile(content: string): InpMetadata {
  const lines = content.split('\n');
  
  let nodeCount = 0;
  let linkCount = 0;
  let subcatchmentCount = 0;
  
  let currentSection = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith(';')) {
      continue;
    }
    
    // Check if this is a section header
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1).toUpperCase();
      continue;
    }
    
    // Count items based on section
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
