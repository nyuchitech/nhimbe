# CLAUDE.md - AI Assistant Guide for nhimbe

## Project Overview

**nhimbe** is an events platform and hub developed by Mukoko (Nyuchi Web Services). It functions as:
- A standalone web application
- An integration module for the Mukoko Super App

## Tech Stack

Based on the project configuration, nhimbe uses:
- **Framework**: Next.js
- **Language**: TypeScript
- **Package Manager**: npm/yarn/pnpm (node_modules based)
- **Deployment**: Vercel-ready
- **License**: MIT

## Repository Structure

```
nhimbe/
├── .gitignore          # Git ignore rules (Next.js optimized)
├── LICENSE             # MIT License
├── README.md           # Project description
└── CLAUDE.md           # This file - AI assistant guidelines
```

> **Note**: This is a new repository. As the codebase grows, this structure section should be updated to reflect new directories like `src/`, `app/`, `components/`, `lib/`, etc.

## Development Commands

Once the project is initialized, common commands will include:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run tests
npm test
```

## Code Conventions

### File Naming
- Use kebab-case for file names: `event-card.tsx`, `user-profile.ts`
- Use PascalCase for React component files if preferred: `EventCard.tsx`
- Use camelCase for utility files: `formatDate.ts`

### TypeScript
- Enable strict mode
- Define explicit types for function parameters and return values
- Use interfaces for object shapes, types for unions/primitives
- Avoid `any` - use `unknown` when type is truly unknown

### React/Next.js
- Prefer functional components with hooks
- Use Next.js App Router conventions (if using Next.js 13+)
- Colocate components with their styles and tests
- Use server components by default, client components only when needed

### Styling
- Follow the styling approach chosen for the project (CSS Modules, Tailwind, etc.)
- Keep styles scoped to components

### State Management
- Use React hooks for local state
- Consider Zustand, Jotai, or React Context for global state
- Avoid prop drilling beyond 2-3 levels

## Git Workflow

### Branch Naming
- Features: `feature/description` or `claude/description-sessionId`
- Fixes: `fix/description`
- Hotfixes: `hotfix/description`

### Commit Messages
- Use present tense: "Add event creation form"
- Be descriptive but concise
- Reference issues when applicable: "Fix date picker bug (#123)"

### Pull Requests
- Provide clear description of changes
- Include testing instructions
- Link related issues

## Environment Variables

Environment files are gitignored. Expected variables may include:
```
# .env.local (example structure)
NEXT_PUBLIC_API_URL=
DATABASE_URL=
NEXTAUTH_SECRET=
```

Never commit sensitive credentials to the repository.

## Testing Guidelines

- Write unit tests for utility functions
- Write integration tests for API routes
- Write component tests for critical UI components
- Aim for meaningful coverage, not 100%

## Security Considerations

- Validate all user inputs
- Use parameterized queries for database operations
- Implement proper authentication and authorization
- Follow OWASP security best practices
- Never expose sensitive data in client-side code

## AI Assistant Guidelines

When working on this codebase:

1. **Read before modifying**: Always read existing files before making changes
2. **Follow existing patterns**: Match the code style already established in the project
3. **Minimal changes**: Make only the changes necessary to complete the task
4. **No over-engineering**: Avoid adding unnecessary abstractions or features
5. **Test awareness**: Consider test implications when modifying code
6. **Environment safety**: Never hardcode secrets or credentials

### Common Tasks

- **Adding a feature**: Check existing components for patterns, follow the established directory structure
- **Fixing a bug**: Understand the root cause before applying fixes
- **Refactoring**: Only refactor when explicitly requested or when it directly enables the requested change

## Integration with Mukoko Super App

This platform is designed to integrate with the Mukoko Super App ecosystem. When developing:
- Consider mobile-first design principles
- Ensure APIs are designed for cross-platform consumption
- Follow shared authentication patterns if applicable

## Future Updates

As the project evolves, update this document to reflect:
- New dependencies and their purposes
- Additional development commands
- API documentation references
- Deployment procedures
- Architecture decisions

---

*Last updated: December 2025*
