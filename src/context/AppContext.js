import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { FileSystemService } from '../services/fileSystemService';
import { ProjectService } from '../services/projectService';
import { RealAuthService } from '../services/realAuthService';

// Initial state
const initialState = {
  // File system state
  currentPath: null,
  files: [],
  loading: false,
  error: null,
  
  // Editor state
  currentFile: null,
  currentFilePath: null,
  editorContent: '',
  language: 'javascript',
  hasUnsavedChanges: false,
  
  // Project state
  currentProject: null,
  recentProjects: [],
  projectFiles: [],
  
  // Authentication state
  user: null,
  isAuthenticated: false,
  authLoading: false,
  
  // Settings state
  settings: {
    fontSize: 14,
    tabSize: 4,
    wordWrap: true,
    minimap: false,
    autoComplete: true,
    linting: true,
    darkMode: true,
    autoSave: true,
  },
  
  // UI state
  sidebarOpen: false,
  terminalOpen: false,
  searchOpen: false,
};

// Action types
const ActionTypes = {
  // File system actions
  SET_CURRENT_PATH: 'SET_CURRENT_PATH',
  SET_FILES: 'SET_FILES',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Editor actions
  SET_CURRENT_FILE: 'SET_CURRENT_FILE',
  SET_CURRENT_FILE_PATH: 'SET_CURRENT_FILE_PATH',
  SET_EDITOR_CONTENT: 'SET_EDITOR_CONTENT',
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_UNSAVED_CHANGES: 'SET_UNSAVED_CHANGES',
  SAVE_FILE: 'SAVE_FILE',
  
  // Project actions
  SET_CURRENT_PROJECT: 'SET_CURRENT_PROJECT',
  SET_RECENT_PROJECTS: 'SET_RECENT_PROJECTS',
  SET_PROJECT_FILES: 'SET_PROJECT_FILES',
  ADD_RECENT_PROJECT: 'ADD_RECENT_PROJECT',
  
  // Authentication actions
  SET_USER: 'SET_USER',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  SET_AUTH_LOADING: 'SET_AUTH_LOADING',
  SIGN_OUT: 'SIGN_OUT',
  
  // Settings actions
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SET_SETTING: 'SET_SETTING',
  
  // UI actions
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  TOGGLE_TERMINAL: 'TOGGLE_TERMINAL',
  TOGGLE_SEARCH: 'TOGGLE_SEARCH',
};

// Reducer function
const appReducer = (state, action) => {
  switch (action.type) {
    // File system actions
    case ActionTypes.SET_CURRENT_PATH:
      return {
        ...state,
        currentPath: action.payload,
      };
      
    case ActionTypes.SET_FILES:
      return {
        ...state,
        files: action.payload,
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
      
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    // Editor actions
    case ActionTypes.SET_CURRENT_FILE:
      return {
        ...state,
        currentFile: action.payload,
      };
      
    case ActionTypes.SET_CURRENT_FILE_PATH:
      return {
        ...state,
        currentFilePath: action.payload,
      };
      
    case ActionTypes.SET_EDITOR_CONTENT:
      return {
        ...state,
        editorContent: action.payload,
        hasUnsavedChanges: true,
      };
      
    case ActionTypes.SET_LANGUAGE:
      return {
        ...state,
        language: action.payload,
      };
      
    case ActionTypes.SET_UNSAVED_CHANGES:
      return {
        ...state,
        hasUnsavedChanges: action.payload,
      };
      
    // Project actions
    case ActionTypes.SET_CURRENT_PROJECT:
      return {
        ...state,
        currentProject: action.payload,
      };
      
    case ActionTypes.SET_RECENT_PROJECTS:
      return {
        ...state,
        recentProjects: action.payload,
      };
      
    case ActionTypes.SET_PROJECT_FILES:
      return {
        ...state,
        projectFiles: action.payload,
      };
      
    case ActionTypes.ADD_RECENT_PROJECT:
      return {
        ...state,
        recentProjects: [action.payload, ...state.recentProjects.slice(0, 9)],
      };
      
    // Settings actions
    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
      
    case ActionTypes.SET_SETTING:
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.key]: action.payload.value,
        },
      };
      
    // UI actions
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
      
    case ActionTypes.TOGGLE_TERMINAL:
      return {
        ...state,
        terminalOpen: !state.terminalOpen,
      };
      
    case ActionTypes.TOGGLE_SEARCH:
      return {
        ...state,
        searchOpen: !state.searchOpen,
      };
      
    default:
      return state;
  }
};

// Action creators
export const actions = {
  // File system actions
  setCurrentPath: (path) => ({ type: ActionTypes.SET_CURRENT_PATH, payload: path }),
  setFiles: (files) => ({ type: ActionTypes.SET_FILES, payload: files }),
  setLoading: (loading) => ({ type: ActionTypes.SET_LOADING, payload: loading }),
  setError: (error) => ({ type: ActionTypes.SET_ERROR, payload: error }),
  clearError: () => ({ type: ActionTypes.CLEAR_ERROR }),
  
  // Editor actions
  setCurrentFile: (file) => ({ type: ActionTypes.SET_CURRENT_FILE, payload: file }),
  setCurrentFilePath: (path) => ({ type: ActionTypes.SET_CURRENT_FILE_PATH, payload: path }),
  setEditorContent: (content) => ({ type: ActionTypes.SET_EDITOR_CONTENT, payload: content }),
  setLanguage: (language) => ({ type: ActionTypes.SET_LANGUAGE, payload: language }),
  setUnsavedChanges: (hasChanges) => ({ type: ActionTypes.SET_UNSAVED_CHANGES, payload: hasChanges }),
  
  // Project actions
  setCurrentProject: (project) => ({ type: ActionTypes.SET_CURRENT_PROJECT, payload: project }),
  setRecentProjects: (projects) => ({ type: ActionTypes.SET_RECENT_PROJECTS, payload: projects }),
  setProjectFiles: (files) => ({ type: ActionTypes.SET_PROJECT_FILES, payload: files }),
  addRecentProject: (project) => ({ type: ActionTypes.ADD_RECENT_PROJECT, payload: project }),
  
  // Authentication actions
  setUser: (user) => ({ type: ActionTypes.SET_USER, payload: user }),
  setAuthenticated: (isAuthenticated) => ({ type: ActionTypes.SET_AUTHENTICATED, payload: isAuthenticated }),
  setAuthLoading: (loading) => ({ type: ActionTypes.SET_AUTH_LOADING, payload: loading }),
  signOut: () => ({ type: ActionTypes.SIGN_OUT }),
  
  // Settings actions
  updateSettings: (settings) => ({ type: ActionTypes.UPDATE_SETTINGS, payload: settings }),
  setSetting: (key, value) => ({ type: ActionTypes.SET_SETTING, payload: { key, value } }),
  
  // UI actions
  toggleSidebar: () => ({ type: ActionTypes.TOGGLE_SIDEBAR }),
  toggleTerminal: () => ({ type: ActionTypes.TOGGLE_TERMINAL }),
  toggleSearch: () => ({ type: ActionTypes.TOGGLE_SEARCH }),
};

// Context provider
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Load recent projects and check authentication on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user is already authenticated
        dispatch(actions.setAuthLoading(true));
        const user = await RealAuthService.getCurrentUser();
        if (user) {
          dispatch(actions.setUser(user));
          dispatch(actions.setAuthenticated(true));
        }
        
        // Load recent projects
        const projects = await FileSystemService.getRecentProjects();
        dispatch(actions.setRecentProjects(projects));
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        dispatch(actions.setAuthLoading(false));
      }
    };
    
    initializeApp();
  }, []);
  
  // Thunk actions (async operations)
  const thunks = {
    // Authentication thunks
    signIn: async (email, password) => {
      try {
        dispatch(actions.setAuthLoading(true));
        dispatch(actions.clearError());
        
        const result = await RealAuthService.signIn(email, password);
        if (result.success) {
          dispatch(actions.setUser(result.user));
          dispatch(actions.setAuthenticated(true));
        } else {
          dispatch(actions.setError(result.error));
        }
        return result;
      } catch (error) {
        dispatch(actions.setError(error.message));
        throw error;
      } finally {
        dispatch(actions.setAuthLoading(false));
      }
    },
    
    signUp: async (email, password, name) => {
      try {
        dispatch(actions.setAuthLoading(true));
        dispatch(actions.clearError());
        
        const result = await RealAuthService.signUp(email, password, name);
        if (result.success) {
          dispatch(actions.setUser(result.user));
          dispatch(actions.setAuthenticated(true));
        } else {
          dispatch(actions.setError(result.error));
        }
        return result;
      } catch (error) {
        dispatch(actions.setError(error.message));
        throw error;
      } finally {
        dispatch(actions.setAuthLoading(false));
      }
    },
    
    signOut: async () => {
      try {
        await RealAuthService.signOut();
        dispatch(actions.setUser(null));
        dispatch(actions.setAuthenticated(false));
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    
    // File system thunks
    loadFiles: async (path) => {
      try {
        dispatch(actions.setLoading(true));
        dispatch(actions.clearError());
        
        const files = await FileSystemService.getDirectoryContents(path);
        dispatch(actions.setFiles(files));
        dispatch(actions.setCurrentPath(path));
      } catch (error) {
        dispatch(actions.setError(error.message));
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    createFile: async (path, content = '') => {
      try {
        dispatch(actions.setLoading(true));
        await FileSystemService.createFile(path, content);
        // Reload files after creation
        await thunks.loadFiles(state.currentPath);
      } catch (error) {
        dispatch(actions.setError(error.message));
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    createDirectory: async (path) => {
      try {
        dispatch(actions.setLoading(true));
        await FileSystemService.createDirectory(path);
        await thunks.loadFiles(state.currentPath);
      } catch (error) {
        dispatch(actions.setError(error.message));
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    deleteFileOrDirectory: async (path) => {
      try {
        dispatch(actions.setLoading(true));
        await FileSystemService.deleteFileOrDirectory(path);
        await thunks.loadFiles(state.currentPath);
      } catch (error) {
        dispatch(actions.setError(error.message));
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    // Editor thunks
    loadFile: async (filePath) => {
      try {
        dispatch(actions.setLoading(true));
        dispatch(actions.clearError());
        
        const content = await FileSystemService.readFile(filePath);
        dispatch(actions.setEditorContent(content));
        dispatch(actions.setCurrentFilePath(filePath));
        dispatch(actions.setUnsavedChanges(false));
        
        // Detect language from file extension
        const fileName = filePath.split('/').pop();
        const extension = FileSystemService.getFileExtension(fileName);
        const language = FileSystemService.getLanguageFromExtension(extension);
        dispatch(actions.setLanguage(language));
      } catch (error) {
        dispatch(actions.setError(error.message));
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    saveFile: async () => {
      try {
        if (!state.currentFilePath) {
          throw new Error('No file path specified');
        }
        
        dispatch(actions.setLoading(true));
        await FileSystemService.writeFile(state.currentFilePath, state.editorContent);
        dispatch(actions.setUnsavedChanges(false));
      } catch (error) {
        dispatch(actions.setError(error.message));
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    // Project thunks
    createProject: async (name, template, basePath) => {
      try {
        dispatch(actions.setLoading(true));
        const result = await ProjectService.createProject(name, template, basePath);
        dispatch(actions.addRecentProject(result.project));
        return result;
      } catch (error) {
        dispatch(actions.setError(error.message));
        throw error;
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
    
    openProject: async (projectPath) => {
      try {
        dispatch(actions.setLoading(true));
        const project = await ProjectService.openProject(projectPath);
        dispatch(actions.setCurrentProject(project));
        dispatch(actions.addRecentProject(project));
        
        // Load project files
        const files = await ProjectService.getProjectFiles(projectPath);
        dispatch(actions.setProjectFiles(files));
        
        return project;
      } catch (error) {
        dispatch(actions.setError(error.message));
        throw error;
      } finally {
        dispatch(actions.setLoading(false));
      }
    },
  };
  
  const value = {
    ...state,
    dispatch,
    thunks,
  };
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export { ActionTypes };
