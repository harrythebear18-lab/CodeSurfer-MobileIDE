import { FileSystemService } from './fileSystemService';

export class GitHubService {
  static API_BASE = 'https://api.github.com';
  
  static async authenticate(token) {
    try {
      const response = await fetch(`${this.API_BASE}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeSurfer-MobileIDE',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const userData = await response.json();
      return {
        success: true,
        user: userData,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async createRepository(name, description, isPrivate = false, token) {
    try {
      const response = await fetch(`${this.API_BASE}/user/repos`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeSurfer-MobileIDE',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase(),
          description: description || `CodeSurfer MobileIDE project: ${name}`,
          private: isPrivate,
          auto_init: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create repository: ${response.status}`);
      }

      const repoData = await response.json();
      return {
        success: true,
        repository: repoData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async uploadFile(repoOwner, repoName, filePath, content, token, branch = 'main') {
    try {
      // First, get file SHA if it exists
      let sha = null;
      try {
        const existingFileResponse = await fetch(
          `${this.API_BASE}/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(filePath)}?ref=${branch}`,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'CodeSurfer-MobileIDE',
            },
          }
        );
        
        if (existingFileResponse.ok) {
          const existingFile = await existingFileResponse.json();
          sha = existingFile.sha;
        }
      } catch (error) {
        // File doesn't exist, that's fine
      }

      // Upload file
      const response = await fetch(
        `${this.API_BASE}/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(filePath)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeSurfer-MobileIDE',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Upload ${filePath}`,
            content: btoa(unescape(encodeURIComponent(content))),
            sha: sha,
            branch: branch,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to upload file: ${response.status}`);
      }

      const fileData = await response.json();
      return {
        success: true,
        file: fileData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async downloadFile(repoOwner, repoName, filePath, token, branch = 'main') {
    try {
      const response = await fetch(
        `${this.API_BASE}/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(filePath)}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeSurfer-MobileIDE',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`File not found: ${response.status}`);
      }

      const fileData = await response.json();
      
      if (fileData.type !== 'file') {
        throw new Error('Path is not a file');
      }

      const content = decodeURIComponent(escape(atob(fileData.content)));
      
      return {
        success: true,
        content,
        file: fileData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getRepositoryContents(repoOwner, repoName, path = '', token, branch = 'main') {
    try {
      const url = path 
        ? `${this.API_BASE}/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(path)}?ref=${branch}`
        : `${this.API_BASE}/repos/${repoOwner}/${repoName}/contents?ref=${branch}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeSurfer-MobileIDE',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get contents: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        return {
          success: true,
          contents: data,
          type: 'directory',
        };
      } else {
        return {
          success: true,
          contents: [data],
          type: 'file',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getUserRepositories(token, type = 'all') {
    try {
      let url = `${this.API_BASE}/user/repos`;
      
      if (type === 'owner') {
        url += '?type=owner';
      } else if (type === 'member') {
        url += '?type=member';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeSurfer-MobileIDE',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get repositories: ${response.status}`);
      }

      const repos = await response.json();
      
      return {
        success: true,
        repositories: repos,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async createBranch(repoOwner, repoName, branchName, fromBranch = 'main', token) {
    try {
      // Get the latest commit from the source branch
      const sourceBranchResponse = await fetch(
        `${this.API_BASE}/repos/${repoOwner}/${repoName}/git/refs/heads/${fromBranch}`,
        {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeSurfer-MobileIDE',
          },
        }
      );

      if (!sourceBranchResponse.ok) {
        throw new Error(`Source branch not found: ${fromBranch}`);
      }

      const sourceBranch = await sourceBranchResponse.json();

      // Create new branch
      const response = await fetch(
        `${this.API_BASE}/repos/${repoOwner}/${repoName}/git/refs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeSurfer-MobileIDE',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: sourceBranch.object.sha,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create branch: ${response.status}`);
      }

      const branchData = await response.json();
      return {
        success: true,
        branch: branchData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async createPullRequest(repoOwner, repoName, title, description, headBranch, baseBranch = 'main', token) {
    try {
      const response = await fetch(
        `${this.API_BASE}/repos/${repoOwner}/${repoName}/pulls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CodeSurfer-MobileIDE',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title,
            body: description,
            head: headBranch,
            base: baseBranch,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create pull request: ${response.status}`);
      }

      const prData = await response.json();
      return {
        success: true,
        pullRequest: prData,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async getCommitHistory(repoOwner, repoName, path = '', token, branch = 'main', limit = 10) {
    try {
      let url = `${this.API_BASE}/repos/${repoOwner}/${repoName}/commits`;
      
      if (path) {
        url += `?path=${encodeURIComponent(path)}&sha=${branch}&per_page=${limit}`;
      } else {
        url += `?sha=${branch}&per_page=${limit}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CodeSurfer-MobileIDE',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get commit history: ${response.status}`);
      }

      const commits = await response.json();
      
      return {
        success: true,
        commits: commits,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async syncProjectToGitHub(projectPath, repoOwner, repoName, token) {
    try {
      const projectFiles = await FileSystemService.getDirectoryContents(projectPath);
      const uploadResults = [];

      // Upload each file
      for (const file of projectFiles) {
        if (file.isDirectory) {
          // Recursively upload directory contents
          const subDirPath = file.relativePath || file.name;
          const subDirResults = await this.syncDirectoryToGitHub(
            projectPath, subDirPath, repoOwner, repoName, token
          );
          uploadResults.push(...subDirResults);
        } else {
          const content = await FileSystemService.readFile(file.path);
          const relativePath = file.relativePath || file.name;
          
          const result = await this.uploadFile(repoOwner, repoName, relativePath, content, token);
          uploadResults.push({
            ...result,
            path: relativePath,
          });
        }
      }

      // Create sync metadata
      const syncMetadata = {
        projectPath,
        repoOwner,
        repoName,
        syncedAt: new Date().toISOString(),
        files: uploadResults.filter(r => r.success).length,
        totalFiles: uploadResults.length,
      };

      await this.uploadFile(
        repoOwner, 
        repoName, 
        '.codesurfer-sync.json', 
        JSON.stringify(syncMetadata, null, 2), 
        token
      );

      return {
        success: true,
        uploadResults,
        metadata: syncMetadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async syncDirectoryToGitHub(projectPath, dirPath, repoOwner, repoName, token) {
    try {
      const fullPath = dirPath ? `${projectPath}${dirPath}/` : projectPath;
      const files = await FileSystemService.getDirectoryContents(fullPath);
      const results = [];

      for (const file of files) {
        const relativePath = dirPath ? `${dirPath}/${file.name}` : file.name;
        
        if (file.isDirectory) {
          const subResults = await this.syncDirectoryToGitHub(
            projectPath, relativePath, repoOwner, repoName, token
          );
          results.push(...subResults);
        } else {
          const content = await FileSystemService.readFile(file.path);
          const result = await this.uploadFile(repoOwner, repoName, relativePath, content, token);
          results.push({
            ...result,
            path: relativePath,
          });
        }
      }

      return results;
    } catch (error) {
      return [{
        success: false,
        error: error.message,
        path: dirPath,
      }];
    }
  }

  static async syncFromGitHub(repoOwner, repoName, localPath, token, branch = 'main') {
    try {
      const results = [];
      
      // Get repository contents
      const contentsResponse = await this.getRepositoryContents(repoOwner, repoName, '', token, branch);
      
      if (!contentsResponse.success) {
        throw new Error(contentsResponse.error);
      }

      // Download each file recursively
      const downloadResults = await this.downloadDirectoryFromGitHub(
        repoOwner, repoName, '', localPath, token, branch, results
      );

      return {
        success: true,
        downloadResults,
        totalFiles: downloadResults.filter(r => r.success).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  static async downloadDirectoryFromGitHub(repoOwner, repoName, remotePath, localPath, token, branch, results = []) {
    try {
      const contentsResponse = await this.getRepositoryContents(repoOwner, repoName, remotePath, token, branch);
      
      if (!contentsResponse.success) {
        results.push({
          success: false,
          path: remotePath,
          error: contentsResponse.error,
        });
        return results;
      }

      for (const item of contentsResponse.contents) {
        if (item.type === 'dir') {
          // Create local directory
          const localDirPath = remotePath ? `${localPath}/${item.name}` : `${localPath}/${item.name}`;
          await FileSystemService.createDirectory(localDirPath);
          
          // Recursively download directory contents
          await this.downloadDirectoryFromGitHub(
            repoOwner, repoName, item.path, localPath, token, branch, results
          );
        } else if (item.type === 'file' && item.name !== '.codesurfer-sync.json') {
          // Download file
          const downloadResponse = await this.downloadFile(repoOwner, repoName, item.path, token, branch);
          
          if (downloadResponse.success) {
            const localFilePath = remotePath ? `${localPath}/${item.name}` : `${localPath}/${item.name}`;
            await FileSystemService.createFile(localFilePath, downloadResponse.content);
            
            results.push({
              success: true,
              path: item.path,
              localPath: localFilePath,
            });
          } else {
            results.push({
              success: false,
              path: item.path,
              error: downloadResponse.error,
            });
          }
        }
      }

      return results;
    } catch (error) {
      results.push({
        success: false,
        path: remotePath,
        error: error.message,
      });
      return results;
    }
  }
}
