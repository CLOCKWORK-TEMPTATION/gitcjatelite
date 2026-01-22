import { FileNode, FileContent } from '../types';
import { ALLOWED_EXTENSIONS, MAX_FILES_TO_FETCH, MAX_FILE_SIZE_BYTES } from '../constants';

const isAllowed = (name: string) => {
    const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
};

// Priority logic (similar to githubService)
const getFilePriority = (path: string): number => {
  const lower = path.toLowerCase();
  if (lower.endsWith('readme.md')) return 100;
  if (lower.endsWith('package.json') || lower.endsWith('requirements.txt')) return 90;
  if (lower.includes('main') || lower.includes('index') || lower.includes('app')) return 80;
  if (!path.includes('/')) return 70;
  if (path.startsWith('src/') || path.startsWith('lib/')) return 60;
  return 10;
};

export const selectLocalDirectory = async (): Promise<{ name: string, tree: FileNode[] }> => {
    if (!('showDirectoryPicker' in window)) {
        throw new Error("Your browser does not support the File System Access API. Please use Chrome, Edge, or Opera.");
    }

    // @ts-ignore
    const dirHandle = await window.showDirectoryPicker();
    const tree: FileNode[] = [];
    
    const processHandle = async (handle: any, path: string) => {
        if (handle.kind === 'file') {
            if (isAllowed(handle.name)) {
                const file = await handle.getFile();
                tree.push({
                    path: path,
                    mode: '100644',
                    type: 'blob',
                    sha: 'local',
                    size: file.size,
                    url: '',
                    handle: handle
                });
            }
        } else if (handle.kind === 'directory') {
            if (['node_modules', '.git', 'dist', 'build', '.next', '.vscode'].includes(handle.name)) return;

            tree.push({
                path: path,
                mode: '040000',
                type: 'tree',
                sha: 'local',
                url: '',
                handle: handle
            });

            for await (const entry of handle.values()) {
                await processHandle(entry, path ? `${path}/${entry.name}` : entry.name);
            }
        }
    };

    await processHandle(dirHandle, '');
    return { name: dirHandle.name, tree };
};

export const readLocalFileContent = async (handle: any): Promise<string> => {
    const file = await handle.getFile();
    return await file.text();
}

export const processLocalFilesForRag = async (tree: FileNode[], onProgress: (msg: string) => void): Promise<FileContent[]> => {
    const blobs = tree.filter(n => n.type === 'blob');
    
    // Sort by priority
    const priorityFiles = blobs.sort((a, b) => {
        return getFilePriority(b.path) - getFilePriority(a.path);
    }).slice(0, MAX_FILES_TO_FETCH);

    const results: FileContent[] = [];
    let count = 0;

    for (const node of priorityFiles) {
        if (node.size && node.size > MAX_FILE_SIZE_BYTES) continue;
        if (!node.handle) continue;

        onProgress(`Reading local file: ${count + 1}/${priorityFiles.length}`);
        try {
            const content = await readLocalFileContent(node.handle);
            if (content) {
                results.push({ path: node.path, content });
            }
        } catch (e) {
            console.error(`Failed to read ${node.path}`, e);
        }
        count++;
    }
    return results;
}