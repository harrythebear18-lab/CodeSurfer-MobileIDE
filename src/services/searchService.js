export class SearchService {
  static async search(query, options = {}) {
    return [];
  }

  static async searchInFiles(query, path, options = {}) {
    return [];
  }

  static async searchAndReplace(query, replacement, path, options = {}) {
    return { replaced: 0 };
  }
}
