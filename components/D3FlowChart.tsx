
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { D3Node, D3Link } from '../types';

interface D3FlowChartProps {
  data: { nodes: D3Node[]; links: D3Link[] };
  onNodeClick: (node: D3Node) => void;
}

const D3FlowChart: React.FC<D3FlowChartProps> = ({ data, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll("*").remove();

    // Create copies to avoid mutating props directly which causes issues in React Strict Mode
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const svg = d3.select(svgRef.current)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // Container Group for Zoom
    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    // Simulation Setup
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius((d: any) => d.size + 10).iterations(2));

    // Links (Lines)
    const link = g.append("g")
        .attr("stroke", "#334155") // slate-700
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: any) => Math.sqrt(d.value));

    // Nodes (Groups with Circle + Text)
    const node = g.append("g")
        .attr("stroke", "#0f172a") // slate-900 stroke for contrast
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(d3.drag<SVGGElement, D3Node>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended) as any);

    // Colors: Neon Cyan for files, Neon Magenta/Violet for folders
    const colorScale = (group: number) => {
        if (group === 1) return "#facc15"; // Yellow (Root)
        if (group === 2) return "#bd00ff"; // Neon Violet (Folder)
        return "#00f3ff"; // Neon Cyan (File)
    };

    // Node Circle
    node.append("circle")
        .attr("r", (d: any) => d.size)
        .attr("fill", (d: any) => colorScale(d.group))
        .attr("class", "cursor-pointer transition-opacity hover:opacity-80")
        .on("click", (event, d) => {
            event.stopPropagation();
            onNodeClick(d);
        });

    // Node Glow Effect
    node.append("circle")
        .attr("r", (d: any) => d.size * 1.5)
        .attr("fill", (d: any) => colorScale(d.group))
        .attr("opacity", 0.15)
        .attr("class", "pointer-events-none animate-pulse-subtle");

    // Labels
    node.append("text")
        .text((d: any) => d.label)
        .attr("x", (d: any) => d.size + 4)
        .attr("y", 3)
        .attr("fill", "#e2e8f0") // slate-200
        .attr("stroke", "none")
        .style("font-family", "monospace")
        .style("font-size", "10px")
        .style("pointer-events", "none");

    // Title Tooltip
    node.append("title")
        .text((d: any) => d.path);

    simulation.on("tick", () => {
        link
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);

        node
            .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag Functions
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

    return () => {
        simulation.stop();
    };
  }, [data, onNodeClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#050508] relative overflow-hidden rounded-xl border border-white/5">
        <svg ref={svgRef} className="w-full h-full cursor-move"></svg>
        <div className="absolute bottom-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-xs text-gray-400 pointer-events-none">
            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-[#facc15]"></span> Root</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 rounded-full bg-[#bd00ff]"></span> Folder</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00f3ff]"></span> File</div>
        </div>
    </div>
  );
};

export default D3FlowChart;
