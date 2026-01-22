
export const fetchUrlContent = async (url: string, signal?: AbortSignal): Promise<{ title: string; content: string }> => {
  try {
    // Using a public CORS proxy to bypass browser restrictions for the demo
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status})`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Clean up the DOM - Remove non-content elements
    const scripts = doc.querySelectorAll('script, style, link, nav, footer, iframe, svg, noscript, img, video, header, aside, .ad, .js-dismissable-hero');
    scripts.forEach(script => script.remove());

    const title = doc.title || url;
    let finalContent = "";

    // Special Handling for Stack Overflow
    if (url.includes('stackoverflow.com') || url.includes('stackexchange.com')) {
        const questionHeader = doc.querySelector('#question-header h1')?.textContent?.trim();
        const questionBody = doc.querySelector('.question .js-post-body')?.textContent?.trim();
        
        // Try to find accepted answer first, otherwise top answer
        let answerBody = doc.querySelector('.answer.accepted-answer .js-post-body')?.textContent?.trim();
        let isAccepted = true;

        if (!answerBody) {
             // Get the first answer that isn't the question itself
             const firstAnswer = doc.querySelector('.answer .js-post-body');
             if (firstAnswer) {
                 answerBody = firstAnswer.textContent?.trim();
                 isAccepted = false;
             }
        }

        finalContent = `Type: StackOverflow Discussion\n`;
        finalContent += `Title: ${questionHeader || title}\n\n`;
        finalContent += `=== QUESTION ===\n${questionBody || "Could not parse question body."}\n\n`;
        finalContent += `=== ${isAccepted ? 'ACCEPTED' : 'TOP'} ANSWER ===\n${answerBody || "No answers found."}`;
    } else {
        // Standard Generic Parsing
        const bodyText = doc.body ? (doc.body.textContent || "") : "";
        finalContent = bodyText.replace(/\s+/g, ' ').trim();
    }

    // Limit content length to prevent token overflow (~50KB approx)
    const truncatedContent = finalContent.slice(0, 50000);

    if (!truncatedContent) {
        throw new Error("Page content is empty or could not be parsed.");
    }

    return {
      title,
      content: truncatedContent
    };

  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Fetch URL Error:", error);
    throw new Error('فشل في جلب محتوى الرابط. قد يكون الموقع محميًا، كبيرًا جدًا، أو غير متاح عبر البروكسي.');
  }
};
