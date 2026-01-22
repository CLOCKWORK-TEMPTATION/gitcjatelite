
import { FileContent, KnowledgeGraph, GraphNode, GraphEdge, AiModelId } from '../types';
import { GoogleGenAI } from "@google/genai";
import { ONTOLOGY_SYSTEM_INSTRUCTION } from '../constants';

// Initialize a separate AI client instance for graph operations to avoid conflict with chat state
let aiClient: GoogleGenAI | null = null;

export const initSemanticService = (apiKey: string) => {
    aiClient = new GoogleGenAI({ apiKey });
};

// Helper to clean Markdown code blocks from JSON strings
const cleanJson = (text: string) => {
    return text.replace(/```json\n?|\n?```/g, '').trim();
};

export const buildKnowledgeGraph = async (
    files: FileContent[], 
    repoName: string,
    modelId: AiModelId
): Promise<KnowledgeGraph> => {
    if (!aiClient) throw new Error("AI Client not initialized");

    const graph: KnowledgeGraph = {
        nodes: [],
        edges: [],
        lastUpdated: Date.now()
    };

    // 1. Base Layer: Create Nodes for Files (Deterministically)
    files.forEach(file => {
        graph.nodes.push({
            id: file.path,
            label: file.path.split('/').pop() || file.path,
            type: 'FILE',
            source: 'CODEBASE',
            metadata: {
                description: `Source file`,
                riskLevel: 'LOW'
            }
        });
    });

    // 2. Semantic Layer: AI Analysis for Relationships & Concepts
    // We take a sample of important files (e.g., top 15 by size or priority) to keep context small
    // In a real app, this would be chunked or run via a separate indexer
    const sampleContext = files.slice(0, 15).map(f => `File: ${f.path}\nContent Snippet:\n${f.content.slice(0, 500)}...`).join('\n\n');

    try {
        const response = await aiClient.models.generateContent({
            model: modelId,
            config: {
                systemInstruction: ONTOLOGY_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
            },
            contents: {
                parts: [{ text: `Analyze this repository: ${repoName}\n\n${sampleContext}` }]
            }
        });

        const rawData = JSON.parse(cleanJson(response.text || "{}"));
        
        // Merge AI nodes/edges
        if (rawData.nodes && Array.isArray(rawData.nodes)) {
            rawData.nodes.forEach((n: any) => {
                // Avoid duplicating existing file nodes, but merge metadata if needed
                const existing = graph.nodes.find(gn => gn.id === n.id);
                if (!existing) {
                    graph.nodes.push({
                        id: n.id,
                        label: n.label,
                        type: n.type,
                        source: 'CODEBASE',
                        metadata: {
                            description: n.description,
                            riskLevel: n.riskLevel || 'LOW'
                        }
                    });
                }
            });
        }

        if (rawData.edges && Array.isArray(rawData.edges)) {
            rawData.edges.forEach((e: any) => {
                // Validate node existence
                const sourceExists = graph.nodes.find(n => n.id === e.source);
                const targetExists = graph.nodes.find(n => n.id === e.target);
                
                if (sourceExists && targetExists) {
                    graph.edges.push({
                        source: e.source,
                        target: e.target,
                        relation: e.relation
                    });
                }
            });
        }

    } catch (e) {
        console.error("Failed to generate semantic graph layer", e);
        // Continue with basic graph
    }

    // 3. External Layer: Mock Ingestion (Jira/Docs/Slack)
    // In a real app, this would fetch from APIs. Here we simulate "Private Workspace" data.
    injectMockExternalData(graph);

    return graph;
};

// Simulation of "Private Data Ingestion"
const injectMockExternalData = (graph: KnowledgeGraph) => {
    // 1. Simulate a Jira Issue blocking a file
    const criticalFile = graph.nodes.find(n => n.type === 'FILE' && (n.label.includes('Auth') || n.label.includes('Service') || n.label.includes('App')));
    
    if (criticalFile) {
        const issueNode: GraphNode = {
            id: 'JIRA-1234',
            label: 'AUTH-FAIL: Token Leak',
            type: 'ISSUE',
            source: 'JIRA',
            metadata: {
                riskLevel: 'CRITICAL',
                description: 'Security team reported potential token logging in production.',
                externalUrl: 'https://jira.company.com/browse/SEC-1234',
                author: 'Security Bot'
            }
        };
        graph.nodes.push(issueNode);
        graph.edges.push({
            source: issueNode.id,
            target: criticalFile.id,
            relation: 'BLOCKS'
        });
    }

    // 2. Simulate Confluence Doc
    const docNode: GraphNode = {
        id: 'DOC-99',
        label: 'Architecture V2 Specs',
        type: 'DOC',
        source: 'CONFLUENCE',
        metadata: {
            riskLevel: 'LOW',
            description: 'The definitive guide to the new microservices structure.',
            externalUrl: 'https://confluence.company.com/pages/viewpage.action?pageId=999',
            author: 'Chief Architect'
        }
    };
    graph.nodes.push(docNode);
    
    // Link Doc to random Component or Concept
    const concept = graph.nodes.find(n => n.type === 'CONCEPT' || n.type === 'COMPONENT');
    if (concept) {
        graph.edges.push({
            source: docNode.id,
            target: concept.id,
            relation: 'DOCUMENTS'
        });
    } else if (graph.nodes.length > 0) {
         graph.edges.push({
            source: docNode.id,
            target: graph.nodes[0].id,
            relation: 'DOCUMENTS'
        });
    }
};

// Delta Processing Stub
export const updateGraphDelta = (graph: KnowledgeGraph, changes: any[]): KnowledgeGraph => {
    // In a real implementation, this would only re-analyze changed files.
    // For now, we return the graph as is or trigger full rebuild.
    return graph;
}
