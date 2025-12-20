import { useMemo, useState } from "react";
import { CoordinateData } from "@/lib/api";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MinecraftMapProps {
  coordinates: CoordinateData;
  width?: number;
  height?: number;
}

const BLOCK_SIZE = 8;

const MINECRAFT_COLORS = {
  grass: "#5D8C3E",
  dirt: "#8B5E3C",
  stone: "#7F7F7F",
  water: "#3F76E4",
  sand: "#DBD3A0",
  node: "#4CAF50",
  nodeBorder: "#2E7D32",
  pipe: "#607D8B",
  pipeDark: "#455A64",
  subcatchment: "#81C784",
  subcatchmentBorder: "#4CAF50",
  grid: "#4A7033",
  gridDark: "#3D5C2A",
};

export function MinecraftMap({ coordinates, width = 800, height = 500 }: MinecraftMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { bounds, nodeMap, transform, gridCells } = useMemo(() => {
    if (!coordinates.nodes.length) {
      return { bounds: null, nodeMap: new Map(), transform: null, gridCells: [] };
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const nodeMap = new Map<string, { x: number; y: number }>();

    for (const node of coordinates.nodes) {
      nodeMap.set(node.id, { x: node.x, y: node.y });
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    }

    for (const polygon of coordinates.polygons) {
      for (const v of polygon.vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
    }

    for (const linkVert of coordinates.vertices) {
      for (const v of linkVert.vertices) {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
      }
    }

    const dataWidth = maxX - minX || 1;
    const dataHeight = maxY - minY || 1;

    const padding = 40;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scaleX = availableWidth / dataWidth;
    const scaleY = availableHeight / dataHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = padding + (availableWidth - dataWidth * scale) / 2;
    const offsetY = padding + (availableHeight - dataHeight * scale) / 2;

    const transform = (x: number, y: number) => ({
      x: Math.round((x - minX) * scale + offsetX),
      y: Math.round(height - ((y - minY) * scale + offsetY))
    });

    const gridCells: { x: number; y: number; dark: boolean }[] = [];
    const cols = Math.ceil(width / BLOCK_SIZE);
    const rows = Math.ceil(height / BLOCK_SIZE);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        gridCells.push({
          x: col * BLOCK_SIZE,
          y: row * BLOCK_SIZE,
          dark: (row + col) % 2 === 0
        });
      }
    }

    return { bounds: { minX, maxX, minY, maxY }, nodeMap, transform, gridCells };
  }, [coordinates, width, height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.3, 0.5));
  const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const snapToGrid = (value: number) => Math.round(value / BLOCK_SIZE) * BLOCK_SIZE;

  const renderBlockyLine = (x1: number, y1: number, x2: number, y2: number, key: string, title: string) => {
    const blocks: { x: number; y: number }[] = [];
    
    const startX = snapToGrid(x1);
    const startY = snapToGrid(y1);
    const endX = snapToGrid(x2);
    const endY = snapToGrid(y2);
    
    const dx = endX - startX;
    const dy = endY - startY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) / BLOCK_SIZE;
    
    if (steps === 0) {
      blocks.push({ x: startX, y: startY });
    } else {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        blocks.push({
          x: snapToGrid(startX + dx * t),
          y: snapToGrid(startY + dy * t)
        });
      }
    }

    const uniqueBlocks = blocks.filter((block, index, self) => 
      index === self.findIndex(b => b.x === block.x && b.y === block.y)
    );

    return (
      <g key={key} data-testid={key}>
        {uniqueBlocks.map((block, idx) => (
          <g key={idx}>
            <rect
              x={block.x - BLOCK_SIZE / 2}
              y={block.y - BLOCK_SIZE / 2}
              width={BLOCK_SIZE}
              height={BLOCK_SIZE}
              fill={MINECRAFT_COLORS.pipeDark}
            />
            <rect
              x={block.x - BLOCK_SIZE / 2 + 1}
              y={block.y - BLOCK_SIZE / 2 + 1}
              width={BLOCK_SIZE - 2}
              height={BLOCK_SIZE - 2}
              fill={MINECRAFT_COLORS.pipe}
            />
          </g>
        ))}
        <title>{title}</title>
      </g>
    );
  };

  if (!bounds || !transform) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No coordinate data available in this file</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-8 w-8" data-testid="mc-map-zoom-in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-8 w-8" data-testid="mc-map-zoom-out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleReset} className="h-8 w-8" data-testid="mc-map-reset">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <svg
        width={width}
        height={height}
        className="rounded-lg border-4 border-[#5D4037] cursor-grab active:cursor-grabbing"
        style={{ imageRendering: "pixelated" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="minecraft-map-svg"
      >
        <defs>
          <pattern id="minecraft-grass" patternUnits="userSpaceOnUse" width={BLOCK_SIZE * 2} height={BLOCK_SIZE * 2}>
            <rect width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.grass} />
            <rect x={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.gridDark} />
            <rect y={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.gridDark} />
            <rect x={BLOCK_SIZE} y={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.grass} />
          </pattern>
        </defs>

        <rect width={width} height={height} fill="url(#minecraft-grass)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {coordinates.polygons.map((polygon) => {
            if (polygon.vertices.length < 3) return null;
            const points = polygon.vertices
              .map(v => transform(v.x, v.y))
              .map(p => `${snapToGrid(p.x)},${snapToGrid(p.y)}`)
              .join(' ');
            return (
              <g key={`mc-polygon-${polygon.id}`} data-testid={`mc-polygon-${polygon.id}`}>
                <polygon
                  points={points}
                  fill={MINECRAFT_COLORS.water}
                  stroke={MINECRAFT_COLORS.water}
                  strokeWidth={BLOCK_SIZE}
                  strokeLinejoin="miter"
                  opacity={0.6}
                />
                <polygon
                  points={points}
                  fill="none"
                  stroke="#1565C0"
                  strokeWidth={BLOCK_SIZE / 2}
                  strokeLinejoin="miter"
                />
                <title>{polygon.id}</title>
              </g>
            );
          })}

          {coordinates.links.map((link) => {
            const fromNode = nodeMap.get(link.fromNode);
            const toNode = nodeMap.get(link.toNode);
            if (!fromNode || !toNode) return null;

            const from = transform(fromNode.x, fromNode.y);
            const to = transform(toNode.x, toNode.y);

            return renderBlockyLine(from.x, from.y, to.x, to.y, `mc-link-${link.id}`, link.id);
          })}

          {coordinates.nodes.map((node) => {
            const pos = transform(node.x, node.y);
            const blockX = snapToGrid(pos.x);
            const blockY = snapToGrid(pos.y);
            const nodeSize = BLOCK_SIZE * 2;
            
            return (
              <g key={`mc-node-${node.id}`} data-testid={`mc-node-${node.id}`}>
                <rect
                  x={blockX - nodeSize / 2}
                  y={blockY - nodeSize / 2}
                  width={nodeSize}
                  height={nodeSize}
                  fill={MINECRAFT_COLORS.nodeBorder}
                />
                <rect
                  x={blockX - nodeSize / 2 + 2}
                  y={blockY - nodeSize / 2 + 2}
                  width={nodeSize - 4}
                  height={nodeSize - 4}
                  fill={MINECRAFT_COLORS.node}
                />
                <rect
                  x={blockX - 2}
                  y={blockY - 2}
                  width={4}
                  height={4}
                  fill="#81C784"
                  opacity={0.8}
                />
                <title>{node.id}</title>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-2 left-2 text-xs text-white bg-[#5D4037]/90 px-3 py-1.5 rounded font-mono border-2 border-[#3E2723]" style={{ fontFamily: "'Courier New', monospace" }}>
        {coordinates.nodes.length} blocks | {coordinates.links.length} pipes | {coordinates.polygons.length} water
      </div>

      <div className="absolute top-2 left-2 text-xs text-white bg-[#5D4037]/90 px-3 py-1.5 rounded font-bold border-2 border-[#3E2723]" style={{ fontFamily: "'Courier New', monospace", letterSpacing: "1px" }}>
        MINECRAFT VIEW
      </div>
    </div>
  );
}
