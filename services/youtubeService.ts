import { YoutubeInfo } from '../types';

const PROXY_URL = 'https://corsproxy.io/?';

export const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export const fetchYoutubeTranscript = async (videoId: string, signal?: AbortSignal): Promise<{ info: YoutubeInfo; transcript: string }> => {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(`${PROXY_URL}${encodeURIComponent(videoUrl)}`, { signal });
    
    if (!response.ok) throw new Error("Failed to fetch video page");
    
    const html = await response.text();

    // 1. Extract Video Title
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'Unknown Video';
    
    // 2. Extract Channel Name (Basic attempt)
    const authorMatch = html.match(/"author":"(.*?)"/);
    const channel = authorMatch ? authorMatch[1] : 'Unknown Channel';

    // 3. Extract Captions JSON
    // YouTube embeds captions in the "captions" property inside the player response
    const captionsRegex = /"captionTracks":(\[.*?\])/;
    const match = html.match(captionsRegex);

    if (!match) {
      throw new Error("لم يتم العثور على نص مفرغ (Captions) لهذا الفيديو. قد يكون الفيديو غير مترجم أو خاص.");
    }

    const captionTracks = JSON.parse(match[1]);
    
    // Try to find Arabic first, then English, then the first available (often auto-generated)
    let selectedTrack = captionTracks.find((t: any) => t.languageCode === 'ar');
    if (!selectedTrack) {
        selectedTrack = captionTracks.find((t: any) => t.languageCode === 'en');
    }
    if (!selectedTrack) {
        selectedTrack = captionTracks[0];
    }

    const transcriptUrl = selectedTrack.baseUrl;

    // 4. Fetch the XML Transcript
    const transcriptResponse = await fetch(`${PROXY_URL}${encodeURIComponent(transcriptUrl)}`, { signal });
    if (!transcriptResponse.ok) throw new Error("Failed to fetch transcript xml");
    
    const transcriptXml = await transcriptResponse.text();
    
    // 5. Parse XML to Text with Timestamps
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
    const textNodes = xmlDoc.getElementsByTagName("text");
    
    let fullTranscript = "";
    for (let i = 0; i < textNodes.length; i++) {
        const textNode = textNodes[i];
        const start = textNode.getAttribute("start");
        const text = textNode.textContent;
        
        // Decode HTML entities
        const decodedText = text?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        
        if (decodedText && decodedText.trim()) {
           const startTime = parseFloat(start || "0");
           const minutes = Math.floor(startTime / 60);
           const seconds = Math.floor(startTime % 60);
           const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
           
           // Format: [MM:SS] Text
           fullTranscript += `[${timeString}] ${decodedText} \n`;
        }
    }

    return {
      info: {
        videoId,
        title,
        channel
      },
      transcript: fullTranscript.trim()
    };

  } catch (error: any) {
    if (error.name === 'AbortError') throw error;
    console.error("Youtube fetch error", error);
    throw new Error(error.message || "حدث خطأ أثناء جلب بيانات الفيديو.");
  }
};