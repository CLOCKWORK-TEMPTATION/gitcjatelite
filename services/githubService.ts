
import { RepoInfo, FileNode, FileContent } from '../types';
import { MAX_FILES_TO_FETCH, MAX_FILE_SIZE_BYTES, ALLOWED_EXTENSIONS } from '../constants';

const GITHUB_API_BASE = 'https://api.github.com/repos';

export const parseGithubUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname !== 'github.com') return null;
    const parts = urlObj.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch (e) {
    return null;
  }
};

const getHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
};

const handleApiError = (response: Response, context: string) => {
  if (response.status === 404) {
    throw new Error(`${context}: المستودع غير موجود أو خاص (404). تأكد من إضافة Token في الإعدادات.`);
  }
  if (response.status === 403) {
    throw new Error(`${context}: تم تجاوز حد طلبات GitHub API (Rate Limit). يرجى إضافة Token في الإعدادات.`);
  }
  if (response.status === 401) {
    throw new Error(`${context}: رمز الوصول (Token) غير صالح.`);
  }
  throw new Error(`${context}: حدث خطأ غير متوقع (${response.status}).`);
};

export const fetchRepoDetails = async (owner: string, repo: string, token?: string, signal?: AbortSignal): Promise<RepoInfo> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/${owner}/${repo}`, { 
      headers: getHeaders(token),
      signal 
    });
    
    if (!response.ok) {
      handleApiError(response, 'جلب تفاصيل المستودع');
    }
    const data = await response.json();
    return {
      owner,
      repo,
      defaultBranch: data.default_branch,
      description: data.description,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    throw new Error(error.message || 'فشل في الاتصال بـ GitHub');
  }
};

export const fetchRepoTree = async (owner: string, repo: string, branch: string, token?: string, signal?: AbortSignal): Promise<FileNode[]> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/${owner}/${repo}/git/trees/${branch}?recursive=1`, { 
      headers: getHeaders(token),
      signal 
    });
    
    if (!response.ok) {
      handleApiError(response, 'جلب هيكل الملفات');
    }
    const data = await response.json();
    return data.tree;
  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    throw error;
  }
};

export const fetchFileContent = async (url: string, token?: string, signal?: AbortSignal): Promise<string> => {
  try {
    const response = await fetch(url, { 
      headers: getHeaders(token),
      signal 
    });
    
    if (!response.ok) {
       // Allow silent failure for batch fetching, but log it
       console.warn(`Failed to fetch file: ${response.status}`);
       return '';
    }
    const data = await response.json();
    if (data.encoding === 'base64' && data.content) {
      try {
        return atob(data.content.replace(/\n/g, ''));
      } catch (e) {
        return '';
      }
    }
    return '';
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return '';
  }
};

// New function for RAG: Fetch files and return Content Objects
export const fetchRepoFiles = async (
  repoInfo: RepoInfo,
  tree: FileNode[],
  token: string | undefined,
  onProgress: (msg: string) => void,
  signal?: AbortSignal
): Promise<FileContent[]> => {
  
  // Filter relevant files
  const relevantFiles = tree.filter(node => {
    if (node.type !== 'blob') return false;
    const ext = node.path.substring(node.path.lastIndexOf('.')).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  });

  // Prioritize
  const priorityFiles = relevantFiles.sort((a, b) => {
    const scoreA = getFilePriority(a.path);
    const scoreB = getFilePriority(b.path);
    return scoreB - scoreA;
  }).slice(0, MAX_FILES_TO_FETCH);

  const results: FileContent[] = [];
  let processedCount = 0;

  for (const file of priorityFiles) {
    if (signal?.aborted) throw new Error('Aborted');
    if (file.size && file.size > MAX_FILE_SIZE_BYTES) continue;

    onProgress(`جلب الملفات: ${processedCount + 1}/${priorityFiles.length}`);
    
    const content = await fetchFileContent(file.url, token, signal);
    if (content) {
      results.push({ path: file.path, content });
    }
    processedCount++;
  }

  return results;
};

const getFilePriority = (path: string): number => {
  const lower = path.toLowerCase();
  if (lower.endsWith('readme.md')) return 100;
  if (lower.endsWith('package.json') || lower.endsWith('requirements.txt')) return 90;
  if (lower.includes('main') || lower.includes('index') || lower.includes('app')) return 80;
  if (!path.includes('/')) return 70;
  if (path.startsWith('src/') || path.startsWith('lib/')) return 60;
  return 10;
};

// --- Visualization Helpers ---

export const fetchRelevantFilePaths = async (
    owner: string, 
    repo: string, 
    token?: string
): Promise<string[]> => {
    // 1. Get Repo Info to determine default branch
    const details = await fetchRepoDetails(owner, repo, token);
    
    // 2. Fetch Tree
    let tree: FileNode[] = [];
    try {
        tree = await fetchRepoTree(owner, repo, details.defaultBranch, token);
    } catch (e) {
        // Fallback to 'master' if main fails (though details.defaultBranch should handle this)
        if (details.defaultBranch !== 'master') {
             tree = await fetchRepoTree(owner, repo, 'master', token);
        } else {
            throw e;
        }
    }

    // 3. Filter Strictly
    const relevantExtensions = [
       '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.cs',
       '.php', '.rb', '.swift', '.kt', '.dart', '.html', '.css', '.scss', '.less',
       '.json', '.yml', '.yaml', '.xml', '.toml', '.md', '.sql', '.prisma', '.graphql'
    ];

    const forbiddenDirs = ['node_modules', 'dist', 'build', 'coverage', 'vendor', 'target', '__tests__'];

    const filteredPaths = tree
        .filter(node => {
            if (node.type !== 'blob') return false;
            const path = node.path;
            
            // Exclude dotfiles/folders
            if (path.split('/').some(part => part.startsWith('.'))) return false;

            // Exclude forbidden dirs
            if (forbiddenDirs.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) return false;

            // Check extension or specific filenames
            const lowerPath = path.toLowerCase();
            const hasExt = relevantExtensions.some(ext => lowerPath.endsWith(ext));
            const isSpecificConfig = lowerPath.endsWith('dockerfile') || lowerPath.endsWith('makefile') || lowerPath.endsWith('gemfile');

            return hasExt || isSpecificConfig;
        })
        .map(node => node.path);

    // Limit to top 150 to fit in context window and focus on high-level architecture
    return filteredPaths.slice(0, 150);
};
