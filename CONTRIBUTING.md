# Contributing to YARN Fair Scheduler Configuration Manager

Thank you for your interest in contributing to the YARN Fair Scheduler Configuration Manager! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:
- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors

## How to Contribute

### Reporting Issues

1. **Search existing issues** to avoid duplicates
2. **Use the issue template** when creating new issues
3. **Provide detailed information**:
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, Hadoop version)
   - Screenshots or logs if applicable

### Suggesting Enhancements

1. **Check existing feature requests** first
2. **Describe the enhancement** in detail
3. **Explain the use case** and benefits
4. **Consider implementation complexity**

### Contributing Code

#### Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Git
- Basic knowledge of React, TypeScript, and Express.js

#### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/yarn-fair-scheduler-manager.git
   cd yarn-fair-scheduler-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Guidelines

##### Code Style

- **TypeScript**: Use strict TypeScript configuration
- **Formatting**: Follow the existing code style
- **Linting**: Fix all ESLint warnings and errors
- **Components**: Use functional components with hooks
- **API**: Follow RESTful conventions

##### Architecture

- **Frontend**: React components in `client/src/components/`
- **Backend**: Express routes in `server/routes.ts`
- **Shared**: Types and schemas in `shared/schema.ts`
- **Storage**: Data layer abstraction in `server/storage.ts`

##### Testing

- Write unit tests for new functionality
- Test both frontend components and backend APIs
- Ensure XML validation works correctly
- Test file upload/download functionality

##### Documentation

- Update README.md if adding new features
- Add JSDoc comments for complex functions
- Document new API endpoints
- Update configuration examples if needed

#### Pull Request Process

1. **Create meaningful commits**
   ```bash
   git commit -m "feat: add queue validation for memory limits"
   git commit -m "fix: resolve XML parsing error for nested queues"
   git commit -m "docs: update deployment instructions"
   ```

2. **Follow commit message conventions**:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `refactor:` for code refactoring
   - `test:` for test additions
   - `chore:` for maintenance tasks

3. **Update documentation** as needed

4. **Test your changes**
   ```bash
   npm run build
   npm run check
   ```

5. **Submit pull request**
   - Use the pull request template
   - Reference any related issues
   - Provide clear description of changes
   - Include screenshots for UI changes

#### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** on different environments
4. **Documentation review** if applicable
5. **Merge** after approval

## Development Areas

### High Priority

- **Performance optimization** for large queue configurations
- **Enhanced XML validation** with detailed error reporting
- **Database integration** improvements
- **Security enhancements** for file operations

### Medium Priority

- **UI/UX improvements** for better usability
- **Additional queue policies** support
- **Import/export** functionality enhancement
- **Monitoring and logging** features

### Future Enhancements

- **Multi-cluster support** for managing multiple Hadoop clusters
- **REST API documentation** with OpenAPI specification
- **Plugin system** for custom queue policies
- **Integration** with Hadoop management tools

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Utilities and configuration
│   │   └── hooks/          # Custom React hooks
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data storage abstraction
│   └── vite.ts             # Vite development integration
├── shared/                 # Shared TypeScript definitions
│   └── schema.ts           # Database schema and validation
├── docs/                   # Additional documentation
├── README.md               # Project documentation
├── CONTRIBUTING.md         # This file
└── LICENSE                 # MIT License
```

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **TanStack Query** for state management
- **React Hook Form** with Zod validation
- **Radix UI** with Tailwind CSS
- **Wouter** for routing

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **xml2js** for XML processing
- **multer** for file uploads
- **Zod** for data validation

### Development Tools
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for code formatting
- **Drizzle Kit** for database migrations

## Getting Help

- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Documentation**: Check README.md for setup and usage instructions
- **Code**: Review existing code for patterns and examples

## Recognition

Contributors will be recognized in:
- Project documentation
- Release notes for significant contributions
- GitHub contributors list

Thank you for contributing to the YARN Fair Scheduler Configuration Manager!