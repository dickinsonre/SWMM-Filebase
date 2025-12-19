import { useMemo, useState } from "react";
import { CoordinateData } from "@/lib/api";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MapVisualizationProps {
  coordinates: CoordinateData;
  width?: number;
  height?: number;
}

export function MapVisualization({ coordinates, width = 800, height = 500 }: MapVisualizationProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { bounds, nodeMap, transform } = useMemo(() => {
    if (!coordinates.nodes.length) {
      return { bounds: null, nodeMap: new Map(), transform: null };
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
      x: (x - minX) * scale + offsetX,
      y: height - ((y - minY) * scale + offsetY)
    });

    return { bounds: { minX, maxX, minY, maxY }, nodeMap, transform };
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
        <Button variant="outline" size="icon" onClick={handleZoomIn} className="h-8 w-8" data-testid="map-zoom-in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} className="h-8 w-8" data-testid="map-zoom-out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleReset} className="h-8 w-8" data-testid="map-reset">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <svg
        width={width}
        height={height}
        className="bg-background rounded-lg border border-border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="map-svg"
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {coordinates.polygons.map((polygon) => {
            if (polygon.vertices.length < 3) return null;
            const points = polygon.vertices
              .map(v => transform(v.x, v.y))
              .map(p => `${p.x},${p.y}`)
              .join(' ');
            return (
              <polygon
                key={`polygon-${polygon.id}`}
                points={points}
                fill="hsl(var(--primary) / 0.15)"
                stroke="hsl(var(--primary) / 0.4)"
                strokeWidth={1}
                data-testid={`polygon-${polygon.id}`}
              >
                <title>{polygon.id}</title>
              </polygon>
            );
          })}

          {coordinates.links.map((link) => {
            const fromNode = nodeMap.get(link.fromNode);
            const toNode = nodeMap.get(link.toNode);
            if (!fromNode || !toNode) return null;

            const linkVertices = coordinates.vertices.find(v => v.id === link.id);
            const from = transform(fromNode.x, fromNode.y);
            const to = transform(toNode.x, toNode.y);

            if (linkVertices && linkVertices.vertices.length > 0) {
              const pathPoints = [
                from,
                ...linkVertices.vertices.map(v => transform(v.x, v.y)),
                to
              ];
              const d = `M ${pathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;
              return (
                <path
                  key={`link-${link.id}`}
                  d={d}
                  fill="none"
                  stroke="hsl(var(--foreground) / 0.6)"
                  strokeWidth={2}
                  data-testid={`link-${link.id}`}
                >
                  <title>{link.id}</title>
                </path>
              );
            }

            return (
              <line
                key={`link-${link.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="hsl(var(--foreground) / 0.6)"
                strokeWidth={2}
                data-testid={`link-${link.id}`}
              >
                <title>{link.id}</title>
              </line>
            );
          })}

          {coordinates.nodes.map((node) => {
            const pos = transform(node.x, node.y);
            return (
              <g key={`node-${node.id}`} data-testid={`node-${node.id}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={6}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
                <title>{node.id}</title>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        {coordinates.nodes.length} nodes • {coordinates.links.length} links • {coordinates.polygons.length} subcatchments
      </div>
    </div>
  );
}
