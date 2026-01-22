
export const resolvePackageToRepo = async (query: string): Promise<string | null> => {
  const cleanQuery = query.trim().toLowerCase();

  // 1. Try NPM
  try {
    const npmRes = await fetch(`https://registry.npmjs.org/${cleanQuery}`);
    if (npmRes.ok) {
      const data = await npmRes.json();
      const repoUrl = data.repository?.url;
      if (repoUrl) {
        // Clean git+https://github.com/... or git://github.com/...
        return repoUrl.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/\.git$/, '');
      }
    }
  } catch (e) {
    console.warn("NPM lookup failed", e);
  }

  // 2. Try PyPI
  try {
    const pypiRes = await fetch(`https://pypi.org/pypi/${cleanQuery}/json`);
    if (pypiRes.ok) {
      const data = await pypiRes.json();
      const info = data.info;
      
      // Check specific project_urls keys usually used for source
      if (info.project_urls) {
        const sourceKeys = ['Source', 'Code', 'Repository', 'GitHub', 'Homepage'];
        for (const key of sourceKeys) {
            const url = info.project_urls[key];
            if (url && url.includes('github.com')) {
                return url;
            }
        }
      }
      
      // Fallback to home_page
      if (info.home_page && info.home_page.includes('github.com')) {
        return info.home_page;
      }
    }
  } catch (e) {
    console.warn("PyPI lookup failed", e);
  }

  return null;
};
