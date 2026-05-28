# CodeSurfer MobileIDE

A powerful mobile Integrated Development Environment (IDE) designed for developers who want to code on the go. Built with React Native and Expo, CodeSurfer MobileIDE brings desktop-class development tools to your mobile device.

## 🚀 Features

### Core Development Tools
- **Monaco Code Editor**: Full-featured editor with syntax highlighting, IntelliSense, and code completion
- **File Management**: Complete file system access with create, edit, delete, and organize capabilities
- **Multi-language Support**: JavaScript, TypeScript, Python, Java, HTML, CSS, and more
- **Project Templates**: Quick start templates for React Native, Android, Web, and more

### Advanced Features
- **AI-Powered Debugging**: Intelligent code analysis, error detection, and debugging assistance
- **Real Terminal**: Integrated terminal with command execution and shell access
- **Git Version Control**: Complete Git integration with commit, push, pull, and branch management
- **Search & Replace**: Advanced search across files with regex support and batch replacement
- **Plugin System**: Extensible architecture for custom plugins and integrations

### Cloud & Authentication
- **Cloud Sync**: Real project synchronization with GitHub integration
- **User Authentication**: Secure Firebase-based authentication system
- **GitHub Integration**: Direct GitHub repository management and file operations
- **Real Compiler Support**: Actual Python, Node.js, and Java compilation and execution

### User Experience
- **Dark/Light Theme**: Customizable themes for comfortable coding
- **State Management**: Complete app state management with React Context
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Responsive Design**: Optimized for mobile devices and tablets

## 📱 App Screens

### Navigation Flow
1. **Login/Register** - User authentication with Firebase
2. **Home Screen** - Quick actions and recent projects
3. **File Manager** - Complete file system navigation
4. **Code Editor** - Monaco-powered editing experience
5. **Terminal** - Real command execution
6. **Git Screen** - Version control operations
7. **Search Screen** - Advanced search and replace
8. **AI Debugger** - Intelligent debugging assistance
9. **Compiler** - Android compilation tools
10. **Settings** - App configuration

## 🛠️ Installation

### Prerequisites

- Node.js 16.0.0 or higher
- Expo CLI
- Git
- Expo Go app (for mobile testing)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/harrythebear18-lab/CodeSurfer-MobileIDE.git
   cd CodeSurfer-MobileIDE
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Scan QR code with Expo Go app
   - Or run on simulator: `npm run ios` or `npm run android`

### Environment Setup

Create a `.env` file for API keys:
```env
# Firebase Configuration (optional for development)
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id

# GitHub Integration (optional)
GITHUB_TOKEN=your_github_token
```

## 🏗️ Project Structure

```
CodeSurfer-MobileIDE/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── ErrorBoundary.js # Global error handling
│   ├── context/             # React Context for state management
│   │   └── AppContext.js    # Global app state and thunks
│   ├── screens/            # App screens (11 total)
│   │   ├── LoginScreen.js   # User authentication
│   │   ├── RegisterScreen.js # User registration
│   │   ├── HomeScreen.js    # Main dashboard
│   │   ├── EditorScreen.js  # Code editor
│   │   ├── FileManagerScreen.js # File system
│   │   ├── GitScreen.js     # Git operations
│   │   ├── TerminalScreen.js # Terminal interface
│   │   ├── SearchScreen.js  # Search & replace
│   │   ├── AIDebuggerScreen.js # AI debugging
│   │   ├── CompilerScreen.js # Android compiler
│   │   └── SettingsScreen.js # App settings
│   ├── services/           # API and backend services
│   │   ├── fileSystemService.js # File operations
│   │   ├── projectService.js # Project management
│   │   ├── realAuthService.js # Firebase authentication
│   │   ├── githubService.js # GitHub API integration
│   │   ├── cloudSyncService.js # Cloud synchronization
│   │   ├── realCompilerService.js # Code compilation
│   │   ├── realTerminalService.js # Terminal execution
│   │   ├── aiDebuggerService.js # AI debugging
│   │   ├── pluginService.js # Plugin system
│   │   └── searchService.js # Search functionality
│   ├── styles/              # Styling and themes
│   │   └── theme.js         # App theme configuration
│   └── types/              # TypeScript type definitions
├── assets/                 # Images, fonts, and other assets
├── docs/                   # Documentation
├── __tests__/              # Test files
├── App.js                  # Main app entry point
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🚀 Getting Started

### Authentication

1. **Login**: Use your email and password to sign in
2. **Register**: Create a new account with Firebase authentication
3. **Auto-login**: The app remembers your session

### Creating Your First Project

1. Open CodeSurfer MobileIDE
2. Tap "New Project" on the Home screen
3. Choose a template:
   - React Native
   - Android Native
   - Web Application
   - Empty Project
4. Enter project name and create
5. Start coding!

### Using the Code Editor

- **Monaco Editor**: Full desktop-class editing experience
- **Syntax Highlighting**: Automatic color coding for 20+ languages
- **IntelliSense**: Smart code completion and suggestions
- **Error Detection**: Real-time syntax and error checking
- **Multi-file Editing**: Work with multiple files simultaneously

### Git Version Control

1. Navigate to the **Git Screen**
2. Initialize repository: `git init`
3. Add files: `git add .` (or individual files)
4. Commit changes: `git commit -m "Your message"`
5. Create branches: `git branch feature-name`
6. Push to remote: `git push origin main`

### Terminal Commands

- **Real Shell**: Execute actual commands on your device
- **Command History**: Navigate through previous commands
- **Multi-platform**: Works on Android, iOS, and Web
- **File Operations**: `ls`, `cd`, `mkdir`, `rm`, etc.

### AI Debugging

1. Open the **AI Debugger** screen
2. AI analyzes your code for potential issues
3. Get intelligent breakpoint suggestions
4. Receive error analysis and fix recommendations
5. Generate debugging reports

### Search & Replace

- **Advanced Search**: Search across entire project
- **Regex Support**: Regular expression patterns
- **Batch Replace**: Replace text in multiple files
- **Case Sensitive**: Toggle case sensitivity
- **Whole Word**: Match whole words only

## 🔧 Configuration

### Settings

Customize your development experience in the Settings screen:

- **Editor Settings**: Font size, tab size, theme selection
- **Git Settings**: Default branch, commit message template
- **Build Settings**: Default build commands for different languages

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Keys (if needed)
API_KEY=your_api_key_here

# Development settings
DEV_MODE=true
LOG_LEVEL=debug
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📦 Building

### Development Build

```bash
npm run build:dev
```

### Production Build

```bash
npm run build:prod
```

### Publishing to App Stores

1. Build the app for production
2. Follow Expo's deployment guide for App Store and Google Play

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use ESLint and Prettier for code formatting
- Follow React Native best practices
- Write tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Expo](https://expo.dev/) - React Native development platform
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor engine
- [React Native](https://reactnative.dev/) - Mobile app framework
- [React Navigation](https://reactnavigation.org/) - Navigation library

## 📞 Support

- 📧 Email: support@codesurfer.dev
- 💬 Discord: [Join our community](https://discord.gg/codesurfer)
- 🐛 Issues: [Report bugs on GitHub](https://github.com/harrythebear18-lab/CodeSurfer-MobileIDE/issues)
- 📖 Wiki: [Documentation](https://github.com/harrythebear18-lab/CodeSurfer-MobileIDE/wiki)

## 🗺️ Roadmap

### ✅ Completed Features
- [x] AI-powered debugging system
- [x] Real terminal command execution
- [x] Plugin system architecture
- [x] GitHub integration
- [x] User authentication
- [x] Cloud synchronization
- [x] Advanced search & replace
- [x] Multi-language compilation

### 🚧 In Progress
- [ ] Web version support
- [ ] Performance optimization
- [ ] Accessibility features
- [ ] Comprehensive testing suite

### 📋 Planned Features
- [ ] Collaborative coding features
- [ ] Real-time code sharing
- [ ] Advanced AI code suggestions
- [ ] Performance profiling tools
- [ ] Custom theme editor
- [ ] Plugin marketplace

## 🎯 Current Status

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: May 28, 2026  
**Total Features**: 40+ implemented  
**Screens**: 11 fully functional  
**Services**: 10 integrated services  

### What's Working Now
- ✅ Complete authentication system
- ✅ Full file system operations
- ✅ Real code compilation (Python, Node.js, Java)
- ✅ AI-powered debugging assistance
- ✅ Git version control
- ✅ Terminal command execution
- ✅ Advanced search & replace
- ✅ GitHub integration
- ✅ Cloud synchronization
- ✅ Plugin architecture
- ✅ Error handling and state management

---

**Made with ❤️ by the CodeSurfer Team**  
**A complete mobile development environment in your pocket**
