"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface Bookmark {
  id: string;
  title: string;
  logo_url: string;
  url: string;
}

interface BookmarkContextType {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Bookmark) => void;
  removeBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  toggleBookmark: (bookmark: Bookmark) => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined
);

const BOOKMARK_STORAGE_KEY = "rozo_rewards_bookmarks";

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(BOOKMARK_STORAGE_KEY);
        if (stored) {
          setBookmarks(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading bookmarks:", error);
      }
    }
  }, []);

  // Save bookmarks to localStorage whenever bookmarks change
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
      } catch (error) {
        console.error("Error saving bookmarks:", error);
      }
    }
  }, [bookmarks]);

  const addBookmark = (bookmark: Bookmark) => {
    setBookmarks((prev) => {
      if (
        !prev.some((existingBookmark) => existingBookmark.id === bookmark.id)
      ) {
        return [...prev, bookmark];
      }
      return prev;
    });
  };

  const removeBookmark = (id: string) => {
    setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
  };

  const isBookmarked = (id: string) => {
    return bookmarks.some((bookmark) => bookmark.id === id);
  };

  const toggleBookmark = (bookmark: Bookmark) => {
    console.log("toggleBookmark", bookmark, isBookmarked(bookmark.id));

    if (isBookmarked(bookmark.id)) {
      removeBookmark(bookmark.id);
    } else {
      addBookmark(bookmark);
    }
  };

  const value: BookmarkContextType = {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };

  return (
    <BookmarkContext.Provider value={value}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error("useBookmarks must be used within a BookmarkProvider");
  }
  return context;
}
