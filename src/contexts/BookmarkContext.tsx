"use client";

import { Restaurant } from "@/types/restaurant";
import React, { createContext, useContext, useEffect, useState } from "react";
import data from "../../public/coffee_mapdata.json";

interface BookmarkContextType {
  bookmarks: string[];
  addBookmark: (restaurantId: string) => void;
  removeBookmark: (restaurantId: string) => void;
  isBookmarked: (restaurantId: string) => boolean;
  toggleBookmark: (restaurantId: string) => void;
  getBookmarkedRestaurants: () => Restaurant[];
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined
);

const BOOKMARK_STORAGE_KEY = "rozo_restaurant_bookmarks";

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);

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

  const addBookmark = (restaurantId: string) => {
    setBookmarks((prev) => {
      if (!prev.includes(restaurantId)) {
        return [...prev, restaurantId];
      }
      return prev;
    });
  };

  const removeBookmark = (restaurantId: string) => {
    setBookmarks((prev) => prev.filter((id) => id !== restaurantId));
  };

  const isBookmarked = (restaurantId: string) => {
    return bookmarks.includes(restaurantId);
  };

  const toggleBookmark = (restaurantId: string) => {
    if (isBookmarked(restaurantId)) {
      removeBookmark(restaurantId);
    } else {
      addBookmark(restaurantId);
    }
  };

  const getBookmarkedRestaurants = (): Restaurant[] => {
    if (bookmarks.length === 0) return [];

    return (data.locations as Restaurant[]).filter((restaurant: Restaurant) =>
      bookmarks.includes(restaurant._id)
    );
  };

  const value: BookmarkContextType = {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
    getBookmarkedRestaurants,
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
