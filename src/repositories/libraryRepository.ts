import { BookItem } from '../types';
import { getStoredBooks, saveStoredBooks } from '../utils/libraryStorage';
import { remoteDataSource } from '../data/remote/remoteDataSource';

class LibraryRepository {
  async getBooks(): Promise<BookItem[]> {
    try {
      const response = await remoteDataSource.fetchLibraryBooks();
      if (response && response.success && Array.isArray(response.data)) {
        saveStoredBooks(response.data);
        return response.data;
      }
    } catch (error) {
      console.warn('[LibraryRepository] Remote fetch failed, falling back to local storage:', error);
    }
    return getStoredBooks();
  }

  async saveBook(book: BookItem): Promise<BookItem[]> {
    const current = getStoredBooks();
    const existingIndex = current.findIndex((b) => b.id === book.id);
    let updated: BookItem[];

    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = book;
    } else {
      updated = [book, ...current];
    }
    saveStoredBooks(updated);

    // Sync with remote database
    try {
      if (existingIndex >= 0) {
        await remoteDataSource.updateLibraryBook(book.id, book);
      } else {
        await remoteDataSource.createLibraryBook(book);
      }
    } catch (error) {
      console.warn('[LibraryRepository] Remote save failed, preserved locally:', error);
    }

    return updated;
  }

  async deleteBook(id: string): Promise<BookItem[]> {
    const current = getStoredBooks();
    const updated = current.filter((b) => b.id !== id);
    saveStoredBooks(updated);

    // Sync with remote database
    try {
      await remoteDataSource.deleteLibraryBook(id);
    } catch (error) {
      console.warn('[LibraryRepository] Remote delete failed, removed locally:', error);
    }

    return updated;
  }
}

export const libraryRepository = new LibraryRepository();

