
import { RagChunk, FileContent } from '../types';
import { CHUNK_SIZE, CHUNK_OVERLAP } from '../constants';
import { embedTexts } from './geminiService';

class VectorStore {
  private chunks: RagChunk[] = [];

  // Reset store
  clear() {
    this.chunks = [];
  }

  // New: Load chunks directly (from DB)
  loadChunks(chunks: RagChunk[]) {
    this.chunks = chunks;
  }

  // New: Export chunks (to save to DB)
  getAllChunks(): RagChunk[] {
    return this.chunks;
  }

  // Simple recursive chunking strategy
  private chunkText(text: string, source: string): RagChunk[] {
    const chunks: RagChunk[] = [];
    let start = 0;
    
    // Normalize newlines
    const normalizedText = text.replace(/\r\n/g, '\n');

    while (start < normalizedText.length) {
      const end = Math.min(start + CHUNK_SIZE, normalizedText.length);
      let chunkText = normalizedText.slice(start, end);
      
      // Try to break at a newline or space if we are not at the end
      if (end < normalizedText.length) {
          const lastNewline = chunkText.lastIndexOf('\n');
          if (lastNewline > CHUNK_SIZE * 0.5) {
              chunkText = chunkText.slice(0, lastNewline);
          } else {
              const lastSpace = chunkText.lastIndexOf(' ');
              if (lastSpace > CHUNK_SIZE * 0.5) {
                  chunkText = chunkText.slice(0, lastSpace);
              }
          }
      }

      chunks.push({
        id: `${source}-${chunks.length}`,
        text: chunkText,
        source: source
      });

      start += chunkText.length - CHUNK_OVERLAP;
      // Prevent infinite loops if overlap >= chunk length (shouldn't happen with constants)
      if (start >= end) start = end; 
    }

    return chunks;
  }

  async addDocuments(documents: FileContent[], onProgress: (msg: string) => void) {
    onProgress("جاري تقسيم النصوص (Chunking)...");
    
    let allChunks: RagChunk[] = [];
    documents.forEach(doc => {
      allChunks = allChunks.concat(this.chunkText(doc.content, doc.path));
    });

    onProgress(`جاري إنشاء Embeddings لـ ${allChunks.length} جزء...`);
    
    // Process embeddings in batches inside embedTexts, but here we pass raw text
    const texts = allChunks.map(c => c.text);
    
    try {
        const embeddings = await embedTexts(texts);
        
        // Assign embeddings to chunks
        if (embeddings.length !== allChunks.length) {
            console.warn("Mismatch in embedding count", embeddings.length, allChunks.length);
        }

        allChunks.forEach((chunk, index) => {
            if (embeddings[index]) {
                chunk.embedding = embeddings[index];
                this.chunks.push(chunk);
            }
        });
        
    } catch (e) {
        console.error(e);
        throw e;
    }
  }

  async retrieve(query: string, topK: number = 5): Promise<RagChunk[]> {
    if (this.chunks.length === 0) return [];

    // Embed query
    const [queryEmbedding] = await embedTexts([query]);
    if (!queryEmbedding) return [];

    // Calculate Cosine Similarity
    const scored = this.chunks.map(chunk => ({
      chunk,
      score: this.cosineSimilarity(queryEmbedding, chunk.embedding!)
    }));

    // Sort descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map(s => s.chunk);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const ragService = new VectorStore();
