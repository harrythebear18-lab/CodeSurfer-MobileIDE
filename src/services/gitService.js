import * as FileSystem from 'expo-file-system';

export class GitService {
  static async getStatus(projectPath) {
    try {
      const gitDir = `${projectPath}.git/`;
      const info = await FileSystem.getInfoAsync(gitDir);

      if (!info.exists) {
        return null;
      }

      const headPath = `${gitDir}HEAD`;
      let currentBranch = 'unknown';
      try {
        const headContent = await FileSystem.readAsStringAsync(headPath);
        if (headContent.startsWith('ref:')) {
          currentBranch = headContent.trim().split('/').pop();
        } else {
          currentBranch = headContent.substring(0, 7);
        }
      } catch (e) {
        // HEAD not readable
      }

      let lastCommit = '';
      try {
        const refPath = headContent && headContent.startsWith('ref:')
          ? `${gitDir}${headContent.trim().substring(5)}`
          : null;
        if (refPath) {
          lastCommit = await FileSystem.readAsStringAsync(refPath);
        }
      } catch (e) {
        // ref not readable
      }

      return {
        isRepository: true,
        currentBranch,
        lastCommit: lastCommit.trim(),
        message: 'Repository ready',
      };
    } catch (error) {
      return null;
    }
  }

  static async initRepository(projectPath) {
    try {
      const gitDir = `${projectPath}.git/`;
      await FileSystem.makeDirectoryAsync(`${gitDir}objects`, { intermediates: true });
      await FileSystem.makeDirectoryAsync(`${gitDir}refs/heads`, { intermediates: true });
      await FileSystem.makeDirectoryAsync(`${gitDir}refs/tags`, { intermediates: true });

      await FileSystem.writeAsStringAsync(`${gitDir}HEAD`, 'ref: refs/heads/main\n');
      await FileSystem.writeAsStringAsync(`${gitDir}config`, '[core]\n\trepositoryformatversion = 0\n\tfilemode = false\n\tbare = false\n');
      await FileSystem.writeAsStringAsync(`${gitDir}description`, 'Unnamed repository\n');

      return {
        success: true,
        message: 'Git repository initialized (main branch)',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getLog(projectPath, limit = 20) {
    try {
      const gitDir = `${projectPath}.git/`;
      const headPath = `${gitDir}HEAD`;
      const headContent = await FileSystem.readAsStringAsync(headPath);

      let refPath;
      if (headContent.startsWith('ref:')) {
        refPath = `${gitDir}${headContent.trim().substring(5)}`;
      } else {
        refPath = `${gitDir}refs/heads/main`;
      }

      const commits = [];
      let currentHash = null;

      try {
        currentHash = (await FileSystem.readAsStringAsync(refPath)).trim();
      } catch (e) {
        return [];
      }

      let count = 0;
      while (currentHash && count < limit) {
        const commitDir = `${gitDir}objects/${currentHash.substring(0, 2)}/`;
        const commitFile = `${commitDir}${currentHash.substring(2)}`;

        try {
          const info = await FileSystem.getInfoAsync(commitFile);
          if (!info.exists) break;

          commits.push({
            hash: currentHash,
            message: `Commit ${currentHash.substring(0, 7)}`,
            author: 'Unknown',
            date: new Date().toISOString(),
          });
          count++;
        } catch (e) {
          break;
        }

        break; // Simplified — full commit graph traversal would need zlib decompression
      }

      return commits;
    } catch (error) {
      return [];
    }
  }

  static async getBranches(projectPath) {
    try {
      const gitDir = `${projectPath}.git/`;
      const headsDir = `${gitDir}refs/heads/`;
      const info = await FileSystem.getInfoAsync(headsDir);

      if (!info.exists) {
        return [];
      }

      const branchNames = await FileSystem.readDirectoryAsync(headsDir);
      const branches = [];

      const headPath = `${gitDir}HEAD`;
      let currentBranchName = '';
      try {
        const headContent = await FileSystem.readAsStringAsync(headPath);
        if (headContent.startsWith('ref:')) {
          currentBranchName = headContent.trim().split('/').pop();
        }
      } catch (e) {
        // ignore
      }

      for (const name of branchNames) {
        let commit = '';
        try {
          commit = (await FileSystem.readAsStringAsync(`${headsDir}${name}`)).trim();
        } catch (e) {
          // ignore
        }

        branches.push({
          name,
          commit,
          current: name === currentBranchName,
        });
      }

      return branches;
    } catch (error) {
      return [];
    }
  }

  static async createBranch(projectPath, branchName) {
    try {
      const gitDir = `${projectPath}.git/`;
      const headPath = `${gitDir}HEAD`;
      const headContent = await FileSystem.readAsStringAsync(headPath);

      let currentRef;
      if (headContent.startsWith('ref:')) {
        currentRef = headContent.trim().substring(5);
      } else {
        currentRef = 'refs/heads/main';
      }

      const currentCommit = await FileSystem.readAsStringAsync(`${gitDir}${currentRef}`);
      const branchPath = `${gitDir}refs/heads/${branchName}`;

      await FileSystem.writeAsStringAsync(branchPath, currentCommit);

      return {
        success: true,
        message: `Branch '${branchName}' created`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async commit(projectPath, message) {
    try {
      const gitDir = `${projectPath}.git/`;
      const headPath = `${gitDir}HEAD`;
      const headContent = await FileSystem.readAsStringAsync(headPath);

      let refPath;
      if (headContent.startsWith('ref:')) {
        refPath = `${gitDir}${headContent.trim().substring(5)}`;
      } else {
        refPath = `${gitDir}refs/heads/main`;
      }

      const fakeHash = Date.now().toString(16) + Math.random().toString(16).substring(2, 10);
      const commitDir = `${gitDir}objects/${fakeHash.substring(0, 2)}/`;
      await FileSystem.makeDirectoryAsync(commitDir, { intermediates: true });

      const commitContent = `tree ${fakeHash}\nauthor CodeSurfer <user@codesurfer.local> ${Date.now()} +0000\ncommitter CodeSurfer <user@codesurfer.local> ${Date.now()} +0000\n\n${message}\n`;
      await FileSystem.writeAsStringAsync(`${commitDir}${fakeHash.substring(2)}`, commitContent);

      await FileSystem.writeAsStringAsync(refPath, fakeHash);

      return {
        success: true,
        message: `Committed: ${message}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async checkoutBranch(projectPath, branchName) {
    try {
      const gitDir = `${projectPath}.git/`;
      await FileSystem.writeAsStringAsync(`${gitDir}HEAD`, `ref: refs/heads/${branchName}\n`);

      return {
        success: true,
        message: `Switched to branch '${branchName}'`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
