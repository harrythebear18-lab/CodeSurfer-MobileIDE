// File system types
export const FileType = {
  FILE: 'file',
  FOLDER: 'folder',
};

export const Language = {
  JAVASCRIPT: 'javascript',
  TYPESCRIPT: 'typescript',
  PYTHON: 'python',
  JAVA: 'java',
  CPP: 'cpp',
  HTML: 'html',
  CSS: 'css',
  JSON: 'json',
  MARKDOWN: 'markdown',
};

// Project types
export const ProjectType = {
  REACT_NATIVE: 'react-native',
  REACT_WEB: 'react-web',
  NODE_JS: 'node-js',
  PYTHON: 'python',
  JAVA: 'java',
  CPP: 'cpp',
  STATIC: 'static',
};

// Git operation types
export const GitOperation = {
  INIT: 'init',
  ADD: 'add',
  COMMIT: 'commit',
  PUSH: 'push',
  PULL: 'pull',
  CLONE: 'clone',
  BRANCH: 'branch',
  MERGE: 'merge',
  STATUS: 'status',
};

// Editor settings
export const EditorSettings = {
  FONT_SIZE: {
    MIN: 10,
    MAX: 24,
    DEFAULT: 14,
  },
  TAB_SIZE: {
    MIN: 2,
    MAX: 8,
    DEFAULT: 4,
  },
  THEMES: {
    DARK: 'vs-dark',
    LIGHT: 'vs',
  },
};
