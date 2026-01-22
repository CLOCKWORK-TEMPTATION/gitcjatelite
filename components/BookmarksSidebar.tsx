
import React, { useMemo, useCallback } from 'react';
import { Bookmark } from '../types';

interface BookmarksSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  onRemoveBookmark: (bookmarkId: string) => void;
  onNavigateToMessage: (messageId: string) => void;
}

const formatBookmarkDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ar-SA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const BookmarksSidebar: React.FC<BookmarksSidebarProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onNavigateToMessage
}) => {

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-80 bg-card border-r border-border z-50 flex flex-col animate-slide-in-left shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          الإشارات المرجعية
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-sm">لا توجد إشارات مرجعية بعد</p>
            <p className="text-xs mt-1 opacity-70">اضغط على أيقونة الإشارة في أي رسالة لحفظها</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="group p-3 bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                onClick={() => onNavigateToMessage(bookmark.messageId)}
              >
                {/* Content Preview */}
                <p className="text-sm text-foreground line-clamp-3 mb-2">
                  {bookmark.content}
                </p>
                
                {/* Note (if exists) */}
                {bookmark.note && (
                  <p className="text-xs text-muted-foreground italic mb-2 line-clamp-1">
                    📝 {bookmark.note}
                  </p>
                )}
                
                {/* Footer */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatBookmarkDate(bookmark.timestamp)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBookmark(bookmark.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive rounded transition-all"
                    title="حذف الإشارة"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {bookmarks.length > 0 && (
        <div className="p-3 border-t border-border bg-secondary/20">
          <p className="text-xs text-muted-foreground text-center">
            {bookmarks.length} إشارة مرجعية محفوظة
          </p>
        </div>
      )}
    </div>
  );
};

export default BookmarksSidebar;
