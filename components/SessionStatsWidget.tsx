
import React, { useMemo } from 'react';
import { Message, SessionStats } from '../types';

interface SessionStatsWidgetProps {
  messages: Message[];
  sessionStartTime: number;
}

const SessionStatsWidget: React.FC<SessionStatsWidgetProps> = ({ messages, sessionStartTime }) => {
  const stats = useMemo((): SessionStats => {
    const userMessages = messages.filter(m => m.role === 'user');
    const aiMessages = messages.filter(m => m.role === 'model');
    
    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 0; i < messages.length - 1; i++) {
      if (messages[i].role === 'user' && messages[i + 1]?.role === 'model') {
        totalResponseTime += messages[i + 1].timestamp - messages[i].timestamp;
        responseCount++;
      }
    }
    
    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    
    return {
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      aiMessageCount: aiMessages.length,
      sessionStartTime,
      averageResponseTime
    };
  }, [messages, sessionStartTime]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}س ${minutes % 60}د`;
    } else if (minutes > 0) {
      return `${minutes}د ${seconds % 60}ث`;
    }
    return `${seconds}ث`;
  };

  const sessionDuration = Date.now() - sessionStartTime;

  if (messages.length === 0) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {/* Message Count */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded-full" title="عدد الرسائل">
        <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>{stats.messageCount}</span>
      </div>

      {/* Session Duration */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded-full" title="مدة الجلسة">
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{formatDuration(sessionDuration)}</span>
      </div>

      {/* Average Response Time */}
      {stats.averageResponseTime > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded-full" title="متوسط وقت الاستجابة">
          <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>~{formatDuration(stats.averageResponseTime)}</span>
        </div>
      )}

      {/* User vs AI breakdown */}
      <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded-full" title="المستخدم / الذكاء الاصطناعي">
        <span className="text-blue-400">👤 {stats.userMessageCount}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-purple-400">🤖 {stats.aiMessageCount}</span>
      </div>
    </div>
  );
};

export default SessionStatsWidget;
