import React, { useEffect, useRef } from 'react';
import { Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface LineageNode {
  id: string;
  label: string;
  type: 'table' | 'view' | 'procedure';
  schema: string;
  level?: number;
}

interface LineageEdge {
  id: string;
  from: string;
  to: string;
  type: 'foreign_key' | 'view_dependency' | 'derived_from';
  label?: string;
}

interface LineageData {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

interface SimpleLineageVisualizationProps {
  data: LineageData;
  centerTable?: string;
  onNodeClick?: (nodeId: string) => void;
  height?: string;
}

const SimpleLineageVisualization: React.FC<SimpleLineageVisualizationProps> = ({
  data,
  centerTable,
  onNodeClick,
  height = '600px'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Simple layout: arrange nodes in levels
    const nodePositions = new Map<string, { x: number; y: number }>();
    const levels = new Map<number, LineageNode[]>();

    // Group nodes by level
    data.nodes.forEach(node => {
      const level = node.level || 0;
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(node);
    });

    // Position nodes
    const levelKeys = Array.from(levels.keys()).sort((a, b) => a - b);
    const levelWidth = rect.width / (levelKeys.length + 1);
    
    levelKeys.forEach((level, levelIndex) => {
      const nodesInLevel = levels.get(level)!;
      const nodeHeight = rect.height / (nodesInLevel.length + 1);
      
      nodesInLevel.forEach((node, nodeIndex) => {
        nodePositions.set(node.id, {
          x: (levelIndex + 1) * levelWidth,
          y: (nodeIndex + 1) * nodeHeight
        });
      });
    });

    // Draw edges
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    data.edges.forEach(edge => {
      const fromPos = nodePositions.get(edge.from);
      const toPos = nodePositions.get(edge.to);
      
      if (fromPos && toPos) {
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(toPos.x, toPos.y);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        const arrowLength = 10;
        ctx.beginPath();
        ctx.moveTo(toPos.x, toPos.y);
        ctx.lineTo(
          toPos.x - arrowLength * Math.cos(angle - Math.PI / 6),
          toPos.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(toPos.x, toPos.y);
        ctx.lineTo(
          toPos.x - arrowLength * Math.cos(angle + Math.PI / 6),
          toPos.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    data.nodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isCenter = node.id === centerTable;
      const nodeWidth = 120;
      const nodeHeight = 40;

      // Node background
      ctx.fillStyle = isCenter ? '#3B82F6' : getNodeColor(node.type);
      ctx.fillRect(pos.x - nodeWidth/2, pos.y - nodeHeight/2, nodeWidth, nodeHeight);

      // Node border
      ctx.strokeStyle = isCenter ? '#1E40AF' : '#374151';
      ctx.lineWidth = isCenter ? 3 : 1;
      ctx.strokeRect(pos.x - nodeWidth/2, pos.y - nodeHeight/2, nodeWidth, nodeHeight);

      // Node text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${isCenter ? 14 : 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, pos.x, pos.y);
    });

  }, [data, centerTable]);

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'view': return '#10B981';
      case 'procedure': return '#F59E0B';
      default: return '#60A5FA';
    }
  };

  const handleExport = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `lineage-${centerTable || 'graph'}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const handleNodeClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick || !data) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Simple hit detection - check if click is near any node
    // This is a simplified version, in a real implementation you'd want more precise hit detection
    data.nodes.forEach(node => {
      // For now, just trigger click on center table
      if (node.id === centerTable) {
        onNodeClick(node.id);
      }
    });
  };

  return (
    <div className="relative bg-white rounded-lg border border-gray-200">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleExport}
          className="p-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
          title="Export as PNG"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white border border-gray-300 rounded-md shadow-sm p-3">
        <h3 className="text-xs font-medium text-gray-900 mb-2">Legend</h3>
        <div className="space-y-1">
          <div className="flex items-center text-xs">
            <div className="w-4 h-3 bg-blue-400 border border-gray-400 mr-2"></div>
            <span>Table</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-4 h-3 bg-green-400 border border-gray-400 mr-2"></div>
            <span>View</span>
          </div>
          <div className="flex items-center text-xs">
            <div className="w-4 h-3 bg-yellow-400 border border-gray-400 mr-2"></div>
            <span>Procedure</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <canvas 
        ref={canvasRef} 
        style={{ height, width: '100%' }}
        className="rounded-lg cursor-pointer"
        onClick={handleNodeClick}
      />
    </div>
  );
};

export default SimpleLineageVisualization;
