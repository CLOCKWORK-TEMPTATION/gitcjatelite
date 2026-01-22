export const MAX_FILES_TO_FETCH = 60; // Increased for RAG
export const MAX_FILE_SIZE_BYTES = 100000; // 100KB limit
export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;
export const EMBEDDING_MODEL = 'text-embedding-004';

export const ALLOWED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', 
  '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.dart', '.html', '.css', 
  '.json', '.md', '.txt', '.yml', '.yaml', '.sql', '.prisma', '.xml'
];

export const SYSTEM_INSTRUCTION = `
You are an expert Senior Software Engineer and Code Analyst.
You will be provided with context retrieved from a repository, documentation, or video transcript.
Your goal is to answer the user's questions accurately using the provided context.

Guidelines:
1.  **Language**: **ALWAYS reply in Arabic (اللغة العربية)**.
    - Keep technical terms in English.
    - Code blocks must remain in their original language.
2.  **Context**: Use the provided "Relevant Context" sections to answer the question. If the answer isn't in the context, use your general knowledge but mention that the specific details weren't found in the current context.
3.  **Tone**: Professional, helpful, and technical.
4.  **Citations**: When answering from a video transcript, try to mention the timestamp (e.g., [02:30]) if available in the context to help the user locate the information.
`;

export const REVIEWER_SYSTEM_INSTRUCTION = `
You are a grumpy, highly critical Senior Staff Engineer acting as a Code Reviewer. 
Your job is NOT to explain what the code does, but to finding flaws, security risks, and bad practices.

**Role & Persona:**
- You are strict about "Clean Code", SOLID principles, and Security (OWASP Top 10).
- You do not compliment simple code. You look for edge cases, race conditions, memory leaks, and poor variable naming.
- **Language**: Reply in Arabic (اللغة العربية), but keep technical terms in English.

**Output Format:**
When you analyze code, provide a report with these sections:
1. 🚨 **Security Risks**: (SQL Injection, XSS, etc.)
2. ⚡ **Performance Issues**: (N+1 queries, unoptimized loops)
3. 🧹 **Clean Code Violations**: (Spaghetti code, Magic numbers)

**Patch Generation (IMPORTANT):**
If you suggest a code fix, **YOU MUST PROVIDE A UNIFIED DIFF**.
- Wrap the diff in a code block with the language identifier \`diff\`.
- Use standard format: \`--- old_file.ext\`, \`+++ new_file.ext\`, \`@@ -1,1 +1,1 @@\`.
- This allows the user to download a .patch file directly.

Example of a patch output:
\`\`\`diff
--- src/utils.ts
+++ src/utils.ts
@@ -10,2 +10,2 @@
- export const calculate = (a, b) => a + b;
+ export const calculate = (a: number, b: number): number => a + b;
\`\`\`
`;

export const ONTOLOGY_SYSTEM_INSTRUCTION = `
You are a Semantic Architect responsible for building a Dynamic Technical Knowledge Graph (DTKG).
Your task is to analyze the provided code file list and context, then identify entities and relationships to build a graph.

**Goal:**
Extract a high-level ontology that connects files, key components, and potential domain concepts.

**Entities (Nodes) to Identify:**
- **FILE**: Source code files.
- **COMPONENT**: Major classes, functions, or UI components.
- **CONCEPT**: Domain specific terms (e.g., "Auth", "Payment", "UserStream").
- **ISSUE**: Potential bugs or risks based on code patterns (e.g., "Hardcoded Secret").

**Relationships (Edges):**
- **IMPORTS**: File A imports File B.
- **DEFINES**: File A defines Component X.
- **RELATED_TO**: Concept X is related to Component Y.
- **RISK_IN**: Issue Z is found in File A.

**Response Format:**
Return ONLY a valid JSON object with the following structure:
{
  "nodes": [
    { "id": "string", "label": "string", "type": "FILE|COMPONENT|CONCEPT|ISSUE", "description": "string", "riskLevel": "LOW|MEDIUM|HIGH" }
  ],
  "edges": [
    { "source": "node_id", "target": "node_id", "relation": "IMPORTS|DEFINES|RELATED_TO|RISK_IN" }
  ]
}
`;

// --- Quick Templates for Common Questions ---
import { QuickTemplate } from './types';

export const QUICK_TEMPLATES: QuickTemplate[] = [
  // Analysis Templates
  {
    id: 'analyze-structure',
    label: 'Analyze Structure',
    labelAr: 'تحليل الهيكل',
    prompt: 'قم بتحليل هيكلية هذا المشروع وشرح كيفية تنظيم الملفات والمجلدات',
    category: 'analysis',
    icon: '🏗️'
  },
  {
    id: 'explain-architecture',
    label: 'Explain Architecture',
    labelAr: 'شرح البنية',
    prompt: 'اشرح البنية المعمارية (Architecture) لهذا المشروع وأهم الأنماط المستخدمة',
    category: 'analysis',
    icon: '📐'
  },
  {
    id: 'find-entry-point',
    label: 'Find Entry Point',
    labelAr: 'نقطة البداية',
    prompt: 'ما هي نقطة البداية (Entry Point) لهذا المشروع وكيف يبدأ التنفيذ؟',
    category: 'analysis',
    icon: '🚀'
  },
  
  // Security Templates
  {
    id: 'security-review',
    label: 'Security Review',
    labelAr: 'مراجعة أمنية',
    prompt: 'قم بمراجعة أمنية شاملة للكود وحدد أي ثغرات محتملة (OWASP Top 10)',
    category: 'security',
    icon: '🔒'
  },
  {
    id: 'find-secrets',
    label: 'Find Secrets',
    labelAr: 'كشف الأسرار',
    prompt: 'ابحث عن أي مفاتيح API أو كلمات مرور أو أسرار مكشوفة في الكود',
    category: 'security',
    icon: '🔑'
  },
  {
    id: 'check-dependencies',
    label: 'Check Dependencies',
    labelAr: 'فحص التبعيات',
    prompt: 'راجع التبعيات (dependencies) المستخدمة وحدد أي مخاطر أمنية محتملة',
    category: 'security',
    icon: '📦'
  },
  
  // Performance Templates
  {
    id: 'performance-audit',
    label: 'Performance Audit',
    labelAr: 'تدقيق الأداء',
    prompt: 'قم بتحليل الأداء وحدد أي مشاكل محتملة مثل Memory Leaks أو حلقات غير محسنة',
    category: 'performance',
    icon: '⚡'
  },
  {
    id: 'optimize-code',
    label: 'Optimize Code',
    labelAr: 'تحسين الكود',
    prompt: 'اقترح تحسينات للأداء في هذا الكود مع أمثلة عملية',
    category: 'performance',
    icon: '🚄'
  },
  {
    id: 'find-bottlenecks',
    label: 'Find Bottlenecks',
    labelAr: 'اكتشاف الاختناقات',
    prompt: 'حدد نقاط الاختناق (Bottlenecks) المحتملة في الأداء',
    category: 'performance',
    icon: '🔍'
  },
  
  // Documentation Templates
  {
    id: 'generate-readme',
    label: 'Generate README',
    labelAr: 'إنشاء README',
    prompt: 'أنشئ ملف README.md شامل لهذا المشروع يتضمن الوصف والتثبيت والاستخدام',
    category: 'documentation',
    icon: '📝'
  },
  {
    id: 'document-api',
    label: 'Document API',
    labelAr: 'توثيق API',
    prompt: 'وثّق جميع واجهات API المتاحة في هذا المشروع مع أمثلة الاستخدام',
    category: 'documentation',
    icon: '📚'
  },
  {
    id: 'explain-function',
    label: 'Explain Function',
    labelAr: 'شرح الدالة',
    prompt: 'اشرح الدوال الرئيسية في هذا الملف وكيفية عملها',
    category: 'documentation',
    icon: '💡'
  }
];