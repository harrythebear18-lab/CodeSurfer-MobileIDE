# Contributing to CodeSurfer MobileIDE

Thank you for your interest in contributing to CodeSurfer MobileIDE! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Bugs

- Use the [GitHub Issues](https://github.com/harrythebear18-lab/CodeSurfer-MobileIDE/issues) page to report bugs
- Provide detailed information about the bug including:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Device and OS information
  - App version

### Suggesting Features

- Open an issue with the "enhancement" label
- Describe the feature and why it would be useful
- Consider if it fits the project's goals and mobile constraints

### Code Contributions

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/CodeSurfer-MobileIDE.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide a clear description of your changes
   - Link any relevant issues
   - Ensure all checks pass

## 📝 Code Style Guidelines

### JavaScript/React Native

- Use ES6+ features
- Follow Airbnb JavaScript Style Guide
- Use functional components with hooks
- Use TypeScript for type safety when possible

```javascript
// Good
import React, { useState } from 'react';
import { View, Text } from 'react-native';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);

  return (
    <View>
      <Text>Hello World</Text>
    </View>
  );
};

export default MyComponent;
```

### File Naming

- Use PascalCase for components: `MyComponent.js`
- Use camelCase for utilities: `fileUtils.js`
- Use kebab-case for documentation: `contributing-guide.md`

### Import Order

1. React and React Native imports
2. Third-party library imports
3. Local component imports
4. Utility imports
5. Type imports

```javascript
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';
import MyComponent from '../components/MyComponent';
import { formatDate } from '../utils/dateUtils';
import type { User } from '../types';
```

## 🧪 Testing

### Unit Tests

- Write tests for all new features
- Use Jest as the testing framework
- Aim for high code coverage

```javascript
import { render, fireEvent } from '@testing-library/react-native';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('handles button press', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<MyComponent onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Integration Tests

- Test user flows and interactions
- Use React Native Testing Library
- Mock external dependencies

## 📋 Development Setup

1. **Clone and setup**
   ```bash
   git clone https://github.com/harrythebear18-lab/CodeSurfer-MobileIDE.git
   cd CodeSurfer-MobileIDE
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Lint code**
   ```bash
   npm run lint
   ```

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # App screens
├── services/       # API and backend services
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
└── styles/         # Styling and themes
```

## 🎯 Areas for Contribution

### High Priority

- [ ] Code editor performance optimization
- [ ] File system operations
- [ ] Git integration
- [ ] Terminal implementation

### Medium Priority

- [ ] UI/UX improvements
- [ ] Additional language support
- [ ] Plugin system
- [ ] Cloud sync features

### Low Priority

- [ ] Documentation improvements
- [ ] Bug fixes and optimizations
- [ ] Accessibility improvements

## 📱 Mobile-Specific Considerations

### Performance

- Minimize re-renders
- Use `FlatList` for long lists
- Optimize images and assets
- Use `useMemo` and `useCallback` hooks

### User Experience

- Design for touch interfaces
- Consider screen sizes and orientations
- Implement proper loading states
- Handle network connectivity issues

### Platform Differences

- Test on both iOS and Android
- Handle platform-specific APIs
- Consider platform design guidelines
- Test on various device sizes

## 🔧 Development Tools

### Recommended VS Code Extensions

- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Auto Rename Tag
- Bracket Pair Colorizer

### Debugging

- Use React Native Debugger
- Enable remote debugging in development
- Use Flipper for advanced debugging
- Monitor performance with React DevTools

## 📝 Commit Message Guidelines

Use conventional commits:

```
feat: add new feature
fix: resolve bug issue
docs: update documentation
style: code formatting changes
refactor: code refactoring
test: add or update tests
chore: build process or auxiliary tool changes
```

## 🚀 Release Process

1. Update version in `package.json`
2. Update changelog
3. Create release tag
4. Deploy to app stores
5. Update documentation

## 📞 Getting Help

- Join our [Discord community](https://discord.gg/codesurfer)
- Ask questions in GitHub discussions
- Check existing issues and documentation
- Reach out to maintainers

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- App about page
- Annual contributor highlights

Thank you for contributing to CodeSurfer MobileIDE! 🎉
