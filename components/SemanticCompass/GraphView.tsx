
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraph, GraphNode, GraphEdge, NodeType } from '../../types';

interface GraphViewProps {
  data: KnowledgeGraph;
}

const GraphView: React.FC<GraphViewProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Colors based on Dark Elite Theme Spec
  const getNodeColor = (type: NodeType) => {
    switch (type) {
      case 'FILE': return '#5A5296'; // Primary
      case 'COMPONENT': return '#3DB89A'; // Secondary
      case 'CONCEPT': return '#9A8EB3'; // Tertiary
      case 'ISSUE': return '#C75D5D'; // Error
      case 'DOC': return '#D4A853'; // Warning
      case 'SLACK_THREAD': return '#ec4899';
      default: return '#64748b';
    }
  };

  const getNodeIcon = (type: NodeType) => {
     switch (type) {
        case 'FILE': return '📄';
        case 'COMPONENT': return '🧩';
        case 'CONCEPT': return '💡';
        case 'ISSUE': return '🐞';
        case 'DOC': return '📚';
        default: return '⚪';
     }
  };

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .call(d3.zoom().on("zoom", (event) => {
         g.attr("transform", event.transform);
      }) as any);

    const g = svg.append("g");

    // Force Simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.edges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(30));

    // Draw Lines (Links)
    const link = g.append("g")
      .attr("stroke", "#2D3039")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.edges)
      .join("line")
      .attr("stroke-width", 1.5);

    // Draw Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(drag(simulation));

    // Node Circles
    node.append("circle")
      .attr("r", (d) => d.type === 'ISSUE' ? 12 : 8)
      .attr("fill", (d) => getNodeColor(d.type))
      .attr("stroke", "#0A0A0F")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      });

    // Node Labels
    node.append("text")
      .text((d) => d.label)
      .attr("x", 12)
      .attr("y", 4)
      .style("font-size", "10px")
      .style("fill", "#94A3B8")
      .style("pointer-events", "none")
      .style("font-family", "Inter, sans-serif");
      
    // Simulation Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Reset selection on background click
    svg.on("click", () => setSelectedNode(null));

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data]);

  // Drag Helper
  const drag = (simulation: any) => {
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Using generic types to ensure compatibility with SVGGElement selection
    return d3.drag<any, any>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  return (
    <div className="flex h-full w-full bg-[#050508] relative overflow-hidden">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-elevated-2/80 backdrop-blur-md p-3 rounded-xl border border-border-subtle text-xs">
          <h4 className="font-bold text-white mb-2">Compass Map</h4>
          <div className="space-y-1.5">
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#5A5296]"></span><span className="text-text-secondary">Files</span></div>
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3DB89A]"></span><span className="text-text-secondary">Components</span></div>
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#9A8EB3]"></span><span className="text-text-secondary">Concepts</span></div>
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#C75D5D] animate-pulse"></span><span className="text-text-secondary">Risk/Issues</span></div>
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#D4A853]"></span><span className="text-text-secondary">Docs (Wiki)</span></div>
          </div>
      </div>

      <svg ref={svgRef} className="w-full h-full cursor-move"></svg>

      {/* Proactive Reasoning Panel */}
      <div className={`absolute top-0 right-0 h-full w-80 bg-elevated-2/95 backdrop-blur-xl border-l border-border-subtle shadow-2xl transform transition-transform duration-300 ease-in-out ${selectedNode ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
         {selectedNode && (
             <div className="p-6 space-y-6">
                 {/* Header */}
                 <div className="pb-4 border-b border-border-subtle">
                     <div className="flex items-center justify-between mb-2">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                             selectedNode.type === 'ISSUE' ? 'bg-error/20 text-error' : 
                             selectedNode.type === 'DOC' ? 'bg-warning/20 text-warning' :
                             'bg-primary/20 text-tertiary'
                         }`}>
                             {selectedNode.type}
                         </span>
                         {selectedNode.metadata.riskLevel && selectedNode.metadata.riskLevel !== 'LOW' && (
                             <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                         )}
                     </div>
                     <h2 className="text-xl font-bold text-white leading-tight">{getNodeIcon(selectedNode.type)} {selectedNode.label}</h2>
                     <p className="text-xs text-text-secondary mt-1 font-mono">{selectedNode.id}</p>
                 </div>

                 {/* Description */}
                 <div className="space-y-2">
                     <h3 className="text-sm font-semibold text-white">Analysis</h3>
                     <p className="text-sm text-text-secondary leading-relaxed">
                         {selectedNode.metadata.description || "No specific AI analysis available for this node."}
                     </p>
                 </div>

                 {/* Source */}
                 <div className="p-3 bg-base rounded-lg border border-border-subtle">
                     <div className="flex items-center gap-2 mb-1">
                         <span className="text-xs text-slate-500">Source:</span>
                         <span className="text-xs font-bold text-white">{selectedNode.source}</span>
                     </div>
                     {selectedNode.metadata.author && (
                         <div className="text-xs text-text-secondary">Author: {selectedNode.metadata.author}</div>
                     )}
                 </div>

                 {/* Proactive Alerts (Reasoning) */}
                 {selectedNode.metadata.riskLevel && selectedNode.metadata.riskLevel !== 'LOW' && (
                     <div className="p-4 bg-error/10 border border-error/30 rounded-lg space-y-2">
                         <h3 className="text-sm font-bold text-error flex items-center gap-2">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                             Risk Detected
                         </h3>
                         <p className="text-xs text-red-300">
                             This entity has been flagged with <strong>{selectedNode.metadata.riskLevel}</strong> severity. Review dependencies immediately.
                         </p>
                     </div>
                 )}

                 {/* External Links */}
                 {selectedNode.metadata.externalUrl && (
                     <a 
                        href={selectedNode.metadata.externalUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors"
                     >
                         <span>Open in {selectedNode.source}</span>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     </a>
                 )}
                 
                 <button 
                    onClick={() => setSelectedNode(null)}
                    className="w-full py-2 bg-base text-text-secondary hover:text-white rounded-lg text-sm"
                 >
                    Close Panel
                 </button>
             </div>
         )}
      </div>
    </div>
  );
};

export default GraphView;
