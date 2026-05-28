# CodeSurfer MobileIDE

A powerful mobile Integrated Development Environment (IDE) designed for developers who want to code on the go. Built with React Native and Expo, CodeSurfer MobileIDE brings desktop-class development tools to your mobile device.

## 🚀 Features

- **Code Editor**: Monaco-powered editor with syntax highlighting, IntelliSense, and code completion
- **File Management**: Full file system access with create, edit, delete, and organize capabilities
- **Multi-language Support**: Support for JavaScript, TypeScript, Python, Java, C++, HTML, CSS, and more
- **Git Integration**: Built-in Git version control with commit, push, pull, and branch management
- **Terminal**: Integrated terminal for running commands and scripts
- **Project Templates**: Quick start templates for various project types
- **Cloud Sync**: Sync your projects across devices
- **Dark/Light Theme**: Customizable themes for comfortable coding

## 📱 Screenshots

[Add screenshots here once the app is developed]

## 🛠️ Installation

### Prerequisites

- Node.js 16.0.0 or higher
- Expo CLI
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/harrythebear18-lab/CodeSurfer-MobileIDE.git
   cd CodeSurfer-MobileIDE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Use the Expo Go app on your mobile device
   - Or run on simulator: `npm run ios` or `npm run android`

## 🏗️ Project Structure

```
CodeSurfer-MobileIDE/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # App screens
│   ├── services/           # API and backend services
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   └── types/              # TypeScript type definitions
├── assets/                 # Images, fonts, and other assets
├── docs/                   # Documentation
├── __tests__/              # Test files
├── App.js                  # Main app entry point
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🚀 Getting Started

### Creating Your First Project

1. Open CodeSurfer MobileIDE
2. Tap "New Project"
3. Choose a template or start from scratch
4. Start coding!

### Using the Code Editor

- **Syntax Highlighting**: Automatic color coding for supported languages
- **Auto Completion**: Press Ctrl+Space for code suggestions
- **Error Detection**: Real-time syntax and error checking
- **Search & Replace**: Find and replace text across files

### Git Integration

1. Initialize a repository: `git init`
2. Add files: `git add .`
3. Commit changes: `git commit -m "Your message"`
4. Push to remote: `git push origin main`

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

- [ ] Web version support
- [ ] Collaborative coding features
- [ ] AI-powered code suggestions
- [ ] Plugin system
- [ ] Debugger integration
- [ ] Performance profiling tools

---

**Made with ❤️ by the CodeSurfer Team**
