import { FileSystemService } from './fileSystemService';
import * as FileSystem from 'expo-file-system';

export class ProjectService {
  static projectTemplates = {
    'react-native': {
      name: 'React Native App',
      description: 'Expo React Native application',
      files: {
        'App.js': `import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});`,
        'package.json': JSON.stringify({
          name: 'my-react-native-app',
          version: '1.0.0',
          main: 'App.js',
          scripts: {
            start: 'expo start',
            android: 'expo start --android',
            ios: 'expo start --ios',
            web: 'expo start --web',
          },
          dependencies: {
            expo: '~49.0.0',
            react: '18.2.0',
            'react-native': '0.72.6',
          },
        }, null, 2),
        'README.md': `# My React Native App

A new React Native application created with CodeSurfer MobileIDE.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\``,
      },
    },
    'react-web': {
      name: 'React Web App',
      description: 'React web application',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React App</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" src="App.js"></script>
</body>
</html>`,
        'App.js': `const { useState } = React;

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Hello React!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));`,
        'package.json': JSON.stringify({
          name: 'my-react-web-app',
          version: '1.0.0',
          scripts: {
            start: 'python -m http.server 3000',
          },
        }, null, 2),
      },
    },
    'node-js': {
      name: 'Node.js Project',
      description: 'Node.js backend application',
      files: {
        'index.js': `const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(port, () => {
  console.log('Server running at http://localhost:' + port);
});`,
        'package.json': JSON.stringify({
          name: 'my-node-app',
          version: '1.0.0',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            dev: 'nodemon index.js',
          },
          dependencies: {
            express: '^4.18.2',
          },
          devDependencies: {
            nodemon: '^3.0.1',
          },
        }, null, 2),
        'README.md': `# Node.js App

A simple Node.js web server.

## Installation

\`\`\`bash
npm install
npm start
\`\`\``,
      },
    },
    'python': {
      name: 'Python Project',
      description: 'Python application',
      files: {
        'main.py': `#!/usr/bin/env python3

def main():
    print("Hello, World!")
    
    # Example function
    def greet(name):
        return f"Hello, {name}!"
    
    if __name__ == "__main__":
        name = input("Enter your name: ")
        print(greet(name))

if __name__ == "__main__":
    main()`,
        'requirements.txt': `# Add your Python dependencies here
# requests==2.28.0
# flask==2.3.0
# numpy==1.24.0`,
        'README.md': `# Python Project

A Python application.

## Installation

\`\`\`bash
pip install -r requirements.txt
python main.py
\`\`\``,
      },
    },
    'static': {
      name: 'Static Website',
      description: 'HTML/CSS/JavaScript website',
      files: {
        'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <main>
        <p>This is a static website.</p>
    </main>
    <script src="script.js"></script>
</body>
</html>`,
        'style.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
}

header {
    background: #333;
    color: white;
    padding: 1rem;
    text-align: center;
}

main {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
}`,
        'script.js': `document.addEventListener('DOMContentLoaded', function() {
    console.log('Website loaded!');
    
    // Add interactivity here
    const header = document.querySelector('h1');
    header.addEventListener('click', function() {
        this.style.color = '#' + Math.floor(Math.random()*16777215).toString(16);
    });
});`,
      },
    },
  };

  static async createProject(name, template, basePath) {
    try {
      const projectPath = `${basePath}${name}/`;
      
      // Create project directory
      await FileSystemService.createDirectory(projectPath);
      
      const templateData = this.projectTemplates[template];
      if (!templateData) {
        throw new Error('Invalid template selected');
      }
      
      // Create template files
      for (const [fileName, content] of Object.entries(templateData.files)) {
        const filePath = `${projectPath}${fileName}`;
        await FileSystemService.createFile(filePath, content);
      }
      
      // Create project metadata
      const project = {
        name,
        type: template,
        path: projectPath,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        template: templateData.name,
      };
      
      // Save to recent projects
      await FileSystemService.saveRecentProject(project);
      
      return {
        success: true,
        project,
        message: `Project "${name}" created successfully`,
      };
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  static async openProject(projectPath) {
    try {
      const projectInfo = await FileSystemService.getFileInfo(projectPath);
      
      if (!projectInfo.exists || !projectInfo.isDirectory) {
        throw new Error('Project directory does not exist');
      }
      
      // Try to read package.json for project info
      let projectData = {
        name: projectPath.split('/').slice(-2, -1)[0] || 'Untitled Project',
        path: projectPath,
        type: 'unknown',
        lastModified: projectInfo.modified,
      };
      
      try {
        const packageJsonPath = `${projectPath}package.json`;
        const packageContent = await FileSystemService.readFile(packageJsonPath);
        const packageData = JSON.parse(packageContent);
        
        projectData.name = packageData.name || projectData.name;
        projectData.type = this.detectProjectType(packageData);
        projectData.version = packageData.version;
        projectData.dependencies = packageData.dependencies;
      } catch (error) {
        // No package.json, try other detection methods
        projectData.type = await this.detectProjectTypeFromFiles(projectPath);
      }
      
      // Save to recent projects
      await FileSystemService.saveRecentProject(projectData);
      
      return projectData;
    } catch (error) {
      console.error('Error opening project:', error);
      throw error;
    }
  }

  static detectProjectType(packageData) {
    const deps = { ...packageData.dependencies, ...packageData.devDependencies };
    
    if (deps.expo || deps['react-native']) {
      return 'react-native';
    }
    if (deps.react && !deps.expo) {
      return 'react-web';
    }
    if (deps.express || deps.fastify) {
      return 'node-js';
    }
    
    return 'unknown';
  }

  static async detectProjectTypeFromFiles(projectPath) {
    try {
      const files = await FileSystemService.getDirectoryContents(projectPath);
      const fileNames = files.map(f => f.name.toLowerCase());
      
      if (fileNames.includes('package.json')) {
        return 'node-js';
      }
      if (fileNames.includes('requirements.txt') || fileNames.includes('setup.py')) {
        return 'python';
      }
      if (fileNames.includes('index.html') || fileNames.includes('style.css')) {
        return 'static';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  static async getProjectFiles(projectPath, extensions = null) {
    try {
      const allFiles = [];
      
      const traverseDirectory = async (dirPath, relativePath = '') => {
        const files = await FileSystemService.getDirectoryContents(dirPath);
        
        for (const file of files) {
          const relativeFilePath = relativePath ? `${relativePath}/${file.name}` : file.name;
          
          if (file.isDirectory) {
            await traverseDirectory(file.path, relativeFilePath);
          } else {
            // Filter by extension if specified
            if (!extensions) {
              allFiles.push({
                ...file,
                relativePath: relativeFilePath,
              });
            } else {
              const extension = FileSystemService.getFileExtension(file.name);
              if (extensions.includes(extension)) {
                allFiles.push({
                  ...file,
                  relativePath: relativeFilePath,
                });
              }
            }
          }
        }
      };
      
      await traverseDirectory(projectPath);
      
      return allFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    } catch (error) {
      console.error('Error getting project files:', error);
      throw error;
    }
  }

  static async searchInProject(projectPath, query, fileExtensions = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp']) {
    try {
      const results = [];
      const files = await this.getProjectFiles(projectPath, fileExtensions);
      
      for (const file of files) {
        try {
          const content = await FileSystemService.readFile(file.path);
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query.toLowerCase())) {
              results.push({
                file: file.relativePath,
                line: i + 1,
                content: lines[i].trim(),
                filePath: file.path,
              });
            }
          }
        } catch (error) {
          console.error(`Error searching in file ${file.name}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching in project:', error);
      throw error;
    }
  }

  static getAvailableTemplates() {
    return Object.keys(this.projectTemplates).map(key => ({
      key,
      ...this.projectTemplates[key],
    }));
  }
}
