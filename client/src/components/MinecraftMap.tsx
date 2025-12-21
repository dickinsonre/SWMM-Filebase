import { useMemo, useState, useEffect } from "react";
import { CoordinateData } from "@/lib/api";
import { ZoomIn, ZoomOut, RotateCcw, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MinecraftMapProps {
  coordinates: CoordinateData;
  width?: number;
  height?: number;
}

const BLOCK_SIZE = 8;

const MINECRAFT_COLORS = {
  // Grass variants
  grass1: "#5D8C3E",
  grass2: "#4A7033",
  grass3: "#6B9E4A",
  grassDark: "#3D5C2A",
  // Nature
  dirt: "#8B5E3C",
  stone: "#7F7F7F",
  stoneDark: "#6B6B6B",
  water: "#3F76E4",
  waterLight: "#5B8FEA",
  waterDark: "#2D5CBF",
  sand: "#DBD3A0",
  // Nodes as different ore types
  diamond: "#4AEDD9",
  diamondDark: "#2DBCAF",
  emerald: "#17DD62",
  emeraldDark: "#0FA84A",
  gold: "#FCEE4B",
  goldDark: "#DBA213",
  redstone: "#FF0000",
  redstoneDark: "#AA0000",
  iron: "#D8D8D8",
  ironDark: "#A8A8A8",
  coal: "#363636",
  // Pipes
  pipe: "#607D8B",
  pipeDark: "#455A64",
  pipeFlow: "#81D4FA",
  // Trees
  oakLog: "#6B5030",
  oakLogDark: "#4A3520",
  leaves: "#4AA52E",
  leavesDark: "#3A8A22",
  // Decorations
  flowerRed: "#E53935",
  flowerYellow: "#FFEB3B",
  flowerBlue: "#2196F3",
  flowerPink: "#E91E63",
  mushroom: "#F5F5DC",
  mushroomRed: "#B71C1C",
  torchFlame: "#FFAB40",
  torchHandle: "#8D6E63",
  // Sky
  skyDay: "#87CEEB",
  skyNight: "#1a1a2e",
  cloudWhite: "#FFFFFF",
  star: "#FFFACD",
  moonYellow: "#FFFACD",
};

// Seeded random for consistent decoration placement
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function MinecraftMap({ coordinates, width = 800, height = 500 }: MinecraftMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isNight, setIsNight] = useState(false);
  const [waterFrame, setWaterFrame] = useState(0);

  // Animate water
  useEffect(() => {
    const interval = setInterval(() => {
      setWaterFrame(f => (f + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const { bounds, nodeMap, transform, decorations, trees, flowers, torches } = useMemo(() => {
    if (!coordinates.nodes.length) {
      return { bounds: null, nodeMap: new Map(), transform: null, decorations: [], trees: [], flowers: [], torches: [] };
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

    const padding = 50;
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

    // Generate random decorations around the map
    const decorations: { x: number; y: number; type: 'dirt' | 'stone' | 'gravel' }[] = [];
    const trees: { x: number; y: number }[] = [];
    const flowers: { x: number; y: number; color: string }[] = [];
    const torches: { x: number; y: number }[] = [];
    
    const flowerColors = [MINECRAFT_COLORS.flowerRed, MINECRAFT_COLORS.flowerYellow, MINECRAFT_COLORS.flowerBlue, MINECRAFT_COLORS.flowerPink];
    
    // Add decorations around edges
    for (let i = 0; i < 40; i++) {
      const seed = i * 7919;
      const r1 = seededRandom(seed);
      const r2 = seededRandom(seed + 1);
      const edge = Math.floor(r1 * 4);
      
      let x, y;
      if (edge === 0) { x = r2 * width; y = r1 * 30; }
      else if (edge === 1) { x = r2 * width; y = height - r1 * 30; }
      else if (edge === 2) { x = r1 * 30; y = r2 * height; }
      else { x = width - r1 * 30; y = r2 * height; }

      const type = seededRandom(seed + 2);
      if (type < 0.15) {
        trees.push({ x, y });
      } else if (type < 0.4) {
        flowers.push({ x, y, color: flowerColors[Math.floor(seededRandom(seed + 3) * 4)] });
      } else if (type < 0.5) {
        decorations.push({ x, y, type: 'stone' });
      } else if (type < 0.6) {
        decorations.push({ x, y, type: 'dirt' });
      }
    }
    
    // Add torches near nodes
    coordinates.nodes.forEach((node, i) => {
      if (i % 5 === 0) {
        const pos = transform(node.x, node.y);
        torches.push({ x: pos.x + BLOCK_SIZE * 2, y: pos.y - BLOCK_SIZE });
      }
    });

    return { bounds: { minX, maxX, minY, maxY }, nodeMap, transform, decorations, trees, flowers, torches };
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

  // Get ore color based on node index for variety
  const getNodeColors = (index: number) => {
    const ores = [
      { main: MINECRAFT_COLORS.diamond, dark: MINECRAFT_COLORS.diamondDark },
      { main: MINECRAFT_COLORS.emerald, dark: MINECRAFT_COLORS.emeraldDark },
      { main: MINECRAFT_COLORS.gold, dark: MINECRAFT_COLORS.goldDark },
      { main: MINECRAFT_COLORS.iron, dark: MINECRAFT_COLORS.ironDark },
      { main: MINECRAFT_COLORS.redstone, dark: MINECRAFT_COLORS.redstoneDark },
    ];
    return ores[index % ores.length];
  };

  const renderBlockyLine = (x1: number, y1: number, x2: number, y2: number, key: string, title: string, linkIndex: number) => {
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
        {uniqueBlocks.map((block, idx) => {
          const isFlowing = (idx + waterFrame + linkIndex) % 4 === 0;
          return (
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
              {/* Animated water flow inside pipe */}
              {isFlowing && (
                <rect
                  x={block.x - 2}
                  y={block.y - 2}
                  width={4}
                  height={4}
                  fill={MINECRAFT_COLORS.pipeFlow}
                  opacity={0.8}
                />
              )}
            </g>
          );
        })}
        <title>{title}</title>
      </g>
    );
  };

  const renderTree = (x: number, y: number, index: number) => (
    <g key={`tree-${index}`} data-testid={`mc-tree-${index}`}>
      {/* Trunk */}
      <rect x={x - 4} y={y - 8} width={8} height={16} fill={MINECRAFT_COLORS.oakLogDark} />
      <rect x={x - 3} y={y - 7} width={6} height={14} fill={MINECRAFT_COLORS.oakLog} />
      {/* Leaves - blocky style */}
      <rect x={x - 12} y={y - 24} width={24} height={8} fill={MINECRAFT_COLORS.leavesDark} />
      <rect x={x - 11} y={y - 23} width={22} height={6} fill={MINECRAFT_COLORS.leaves} />
      <rect x={x - 8} y={y - 32} width={16} height={8} fill={MINECRAFT_COLORS.leavesDark} />
      <rect x={x - 7} y={y - 31} width={14} height={6} fill={MINECRAFT_COLORS.leaves} />
      <rect x={x - 4} y={y - 38} width={8} height={6} fill={MINECRAFT_COLORS.leavesDark} />
      <rect x={x - 3} y={y - 37} width={6} height={4} fill={MINECRAFT_COLORS.leaves} />
    </g>
  );

  const renderFlower = (x: number, y: number, color: string, index: number) => (
    <g key={`flower-${index}`} data-testid={`mc-flower-${index}`}>
      {/* Stem */}
      <rect x={x - 1} y={y - 6} width={2} height={6} fill="#228B22" />
      {/* Petals */}
      <rect x={x - 3} y={y - 10} width={6} height={4} fill={color} />
      <rect x={x - 1} y={y - 12} width={2} height={2} fill="#FFEB3B" />
    </g>
  );

  const renderTorch = (x: number, y: number, index: number) => (
    <g key={`torch-${index}`} data-testid={`mc-torch-${index}`}>
      {/* Handle */}
      <rect x={x - 2} y={y - 8} width={4} height={12} fill={MINECRAFT_COLORS.torchHandle} />
      {/* Flame - animated glow */}
      <rect x={x - 3} y={y - 14} width={6} height={6} fill={MINECRAFT_COLORS.torchFlame} opacity={0.9 + Math.sin(waterFrame * 0.5) * 0.1} />
      <rect x={x - 2} y={y - 16} width={4} height={4} fill="#FFD54F" opacity={0.8} />
      {/* Glow effect */}
      {isNight && (
        <circle cx={x} cy={y - 12} r={20} fill={MINECRAFT_COLORS.torchFlame} opacity={0.15} />
      )}
    </g>
  );

  const renderCloud = (x: number, y: number, index: number) => (
    <g key={`cloud-${index}`} opacity={0.85}>
      <rect x={x} y={y} width={40} height={12} fill={MINECRAFT_COLORS.cloudWhite} />
      <rect x={x - 8} y={y + 4} width={16} height={12} fill={MINECRAFT_COLORS.cloudWhite} />
      <rect x={x + 32} y={y + 4} width={16} height={12} fill={MINECRAFT_COLORS.cloudWhite} />
      <rect x={x + 8} y={y - 6} width={24} height={10} fill={MINECRAFT_COLORS.cloudWhite} />
    </g>
  );

  const renderStar = (x: number, y: number, index: number) => (
    <rect 
      key={`star-${index}`} 
      x={x} 
      y={y} 
      width={2} 
      height={2} 
      fill={MINECRAFT_COLORS.star} 
      opacity={0.6 + Math.sin(waterFrame + index) * 0.4}
    />
  );

  if (!bounds || !transform) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>No coordinate data available in this file</p>
      </div>
    );
  }

  // Generate clouds and stars
  const clouds = Array.from({ length: 5 }, (_, i) => ({ 
    x: seededRandom(i * 123) * (width - 60) + 20, 
    y: seededRandom(i * 456) * 40 + 10 
  }));
  
  const stars = Array.from({ length: 30 }, (_, i) => ({ 
    x: seededRandom(i * 789) * width, 
    y: seededRandom(i * 321) * (height / 3) 
  }));

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setIsNight(!isNight)} 
          className="h-8 w-8" 
          data-testid="mc-map-daynight"
          title={isNight ? "Switch to Day" : "Switch to Night"}
        >
          {isNight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
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
        className="rounded-lg cursor-grab active:cursor-grabbing"
        style={{ 
          imageRendering: "pixelated",
          border: `4px solid ${isNight ? '#3E2723' : '#5D4037'}`,
          boxShadow: isNight ? '0 0 20px rgba(255, 171, 64, 0.3)' : 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        data-testid="minecraft-map-svg"
      >
        <defs>
          {/* Day grass pattern */}
          <pattern id="minecraft-grass-day" patternUnits="userSpaceOnUse" width={BLOCK_SIZE * 2} height={BLOCK_SIZE * 2}>
            <rect width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.grass1} />
            <rect x={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.grass2} />
            <rect y={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.grass2} />
            <rect x={BLOCK_SIZE} y={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill={MINECRAFT_COLORS.grass1} />
          </pattern>
          {/* Night grass pattern - darker */}
          <pattern id="minecraft-grass-night" patternUnits="userSpaceOnUse" width={BLOCK_SIZE * 2} height={BLOCK_SIZE * 2}>
            <rect width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#2D4D1E" />
            <rect x={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#234016" />
            <rect y={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#234016" />
            <rect x={BLOCK_SIZE} y={BLOCK_SIZE} width={BLOCK_SIZE} height={BLOCK_SIZE} fill="#2D4D1E" />
          </pattern>
          {/* Water animation pattern */}
          <pattern id="minecraft-water" patternUnits="userSpaceOnUse" width={BLOCK_SIZE * 2} height={BLOCK_SIZE * 2}>
            <rect width={BLOCK_SIZE * 2} height={BLOCK_SIZE * 2} fill={MINECRAFT_COLORS.water} />
            <rect 
              x={(waterFrame % 2) * BLOCK_SIZE} 
              y={Math.floor(waterFrame / 2) * BLOCK_SIZE} 
              width={BLOCK_SIZE} 
              height={BLOCK_SIZE} 
              fill={MINECRAFT_COLORS.waterLight} 
              opacity={0.5}
            />
          </pattern>
        </defs>

        {/* Sky background for night mode */}
        {isNight && (
          <rect width={width} height={height} fill={MINECRAFT_COLORS.skyNight} />
        )}
        
        {/* Stars (night only) */}
        {isNight && stars.map((star, i) => renderStar(star.x, star.y, i))}
        
        {/* Moon (night only) */}
        {isNight && (
          <g>
            <rect x={width - 60} y={20} width={32} height={32} fill={MINECRAFT_COLORS.moonYellow} />
            <rect x={width - 58} y={22} width={28} height={28} fill="#FFFDE7" />
            {/* Moon craters */}
            <rect x={width - 52} y={28} width={6} height={6} fill="#E0E0E0" opacity={0.5} />
            <rect x={width - 40} y={36} width={4} height={4} fill="#E0E0E0" opacity={0.5} />
          </g>
        )}
        
        {/* Clouds (day only) */}
        {!isNight && clouds.map((cloud, i) => renderCloud(cloud.x, cloud.y, i))}

        {/* Ground */}
        <rect 
          width={width} 
          height={height} 
          fill={isNight ? "url(#minecraft-grass-night)" : "url(#minecraft-grass-day)"} 
        />

        {/* Decorative stones and dirt */}
        {decorations.map((dec, i) => (
          <g key={`dec-${i}`}>
            <rect
              x={dec.x - BLOCK_SIZE / 2}
              y={dec.y - BLOCK_SIZE / 2}
              width={BLOCK_SIZE}
              height={BLOCK_SIZE}
              fill={dec.type === 'stone' ? MINECRAFT_COLORS.stoneDark : MINECRAFT_COLORS.dirt}
            />
            <rect
              x={dec.x - BLOCK_SIZE / 2 + 1}
              y={dec.y - BLOCK_SIZE / 2 + 1}
              width={BLOCK_SIZE - 2}
              height={BLOCK_SIZE - 2}
              fill={dec.type === 'stone' ? MINECRAFT_COLORS.stone : '#9E7049'}
            />
          </g>
        ))}

        {/* Flowers */}
        {flowers.map((flower, i) => renderFlower(flower.x, flower.y, flower.color, i))}

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Subcatchment polygons with animated water */}
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
                  fill="url(#minecraft-water)"
                  stroke={MINECRAFT_COLORS.waterDark}
                  strokeWidth={BLOCK_SIZE / 2}
                  strokeLinejoin="miter"
                  opacity={0.85}
                />
                {/* Water surface reflection */}
                <polygon
                  points={points}
                  fill="none"
                  stroke={MINECRAFT_COLORS.waterLight}
                  strokeWidth={2}
                  strokeLinejoin="miter"
                  strokeDasharray={`${BLOCK_SIZE * 2} ${BLOCK_SIZE * 3}`}
                  strokeDashoffset={waterFrame * BLOCK_SIZE}
                  opacity={0.6}
                />
                <title>{polygon.id}</title>
              </g>
            );
          })}

          {/* Pipe links with animated flow */}
          {coordinates.links.map((link, index) => {
            const fromNode = nodeMap.get(link.fromNode);
            const toNode = nodeMap.get(link.toNode);
            if (!fromNode || !toNode) return null;

            const from = transform(fromNode.x, fromNode.y);
            const to = transform(toNode.x, toNode.y);

            return renderBlockyLine(from.x, from.y, to.x, to.y, `mc-link-${link.id}`, link.id, index);
          })}

          {/* Nodes as different ore blocks */}
          {coordinates.nodes.map((node, index) => {
            const pos = transform(node.x, node.y);
            const blockX = snapToGrid(pos.x);
            const blockY = snapToGrid(pos.y);
            const nodeSize = BLOCK_SIZE * 2;
            const colors = getNodeColors(index);
            
            return (
              <g key={`mc-node-${node.id}`} data-testid={`mc-node-${node.id}`}>
                {/* Stone base */}
                <rect
                  x={blockX - nodeSize / 2 - 2}
                  y={blockY - nodeSize / 2 - 2}
                  width={nodeSize + 4}
                  height={nodeSize + 4}
                  fill={MINECRAFT_COLORS.stoneDark}
                />
                <rect
                  x={blockX - nodeSize / 2 - 1}
                  y={blockY - nodeSize / 2 - 1}
                  width={nodeSize + 2}
                  height={nodeSize + 2}
                  fill={MINECRAFT_COLORS.stone}
                />
                {/* Ore block */}
                <rect
                  x={blockX - nodeSize / 2}
                  y={blockY - nodeSize / 2}
                  width={nodeSize}
                  height={nodeSize}
                  fill={colors.dark}
                />
                <rect
                  x={blockX - nodeSize / 2 + 2}
                  y={blockY - nodeSize / 2 + 2}
                  width={nodeSize - 4}
                  height={nodeSize - 4}
                  fill={colors.main}
                />
                {/* Sparkle effect */}
                <rect
                  x={blockX - 3}
                  y={blockY - 3}
                  width={3}
                  height={3}
                  fill="#FFFFFF"
                  opacity={0.6 + Math.sin(waterFrame + index) * 0.3}
                />
                <rect
                  x={blockX + 1}
                  y={blockY + 1}
                  width={2}
                  height={2}
                  fill="#FFFFFF"
                  opacity={0.4}
                />
                <title>{node.id}</title>
              </g>
            );
          })}

          {/* Torches near nodes */}
          {torches.map((torch, i) => renderTorch(torch.x, torch.y, i))}
        </g>

        {/* Trees in foreground */}
        {trees.map((tree, i) => renderTree(tree.x, tree.y, i))}
      </svg>

      {/* Stats panel - styled like Minecraft inventory */}
      <div 
        className="absolute bottom-2 left-2 text-xs text-white px-3 py-2 rounded font-mono"
        style={{ 
          fontFamily: "'Courier New', monospace",
          background: 'linear-gradient(180deg, #555555 0%, #3a3a3a 100%)',
          border: '3px solid #1a1a1a',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.5)'
        }}
      >
        <div className="flex gap-4">
          <span><span style={{color: MINECRAFT_COLORS.diamond}}>◆</span> {coordinates.nodes.length} nodes</span>
          <span><span style={{color: MINECRAFT_COLORS.pipe}}>━</span> {coordinates.links.length} pipes</span>
          <span><span style={{color: MINECRAFT_COLORS.water}}>≈</span> {coordinates.polygons.length} water</span>
        </div>
      </div>

      {/* Title bar - styled like Minecraft sign */}
      <div 
        className="absolute top-2 left-2 text-xs text-amber-100 px-3 py-1.5 rounded font-bold"
        style={{ 
          fontFamily: "'Courier New', monospace", 
          letterSpacing: "1px",
          background: '#8B6914',
          border: '2px solid #5D4037',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)'
        }}
      >
        ⛏ MINECRAFT VIEW {isNight ? '🌙' : '☀️'}
      </div>

      {/* Legend */}
      <div 
        className="absolute bottom-2 right-2 text-[10px] text-white/80 px-2 py-1.5 rounded font-mono"
        style={{ 
          fontFamily: "'Courier New', monospace",
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <div className="flex gap-2 items-center">
          <span style={{color: MINECRAFT_COLORS.diamond}}>◆</span><span>Diamond</span>
          <span style={{color: MINECRAFT_COLORS.emerald}}>◆</span><span>Emerald</span>
          <span style={{color: MINECRAFT_COLORS.gold}}>◆</span><span>Gold</span>
          <span style={{color: MINECRAFT_COLORS.iron}}>◆</span><span>Iron</span>
          <span style={{color: MINECRAFT_COLORS.redstone}}>◆</span><span>Redstone</span>
        </div>
      </div>
    </div>
  );
}
