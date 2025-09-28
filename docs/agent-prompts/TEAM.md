# AI Agent Team Guidelines

This document contains the base instructions and coordination guidelines that apply to all AI agents working on the Sharewear Clothing storefront development.

## Base Instructions for All Agents

**CRITICAL WORKFLOW REQUIREMENTS**: Before starting any work, you MUST:

1. **Check Server Status**: Run the server detection check first
2. **Read Workflow Documentation**: Review `FRONTEND_AI_WORKFLOW.md` for current processes
3. **Understand Project Structure**: This is a Medusa v2 ecommerce storefront in `apps/storefront1/`
4. **Preserve User's Environment**: Never restart or interrupt running development servers
5. **Test Your Work**: Use the testing utilities provided before declaring completion

## Project Architecture

### Working Environment
- **Project**: Sharewear Clothing storefront (`apps/storefront1/`)
- **Framework**: Next.js 15 with React 19 RC, TypeScript
- **Styling**: Tailwind CSS with Medusa UI preset, ShadCN/UI components
- **State Management**: React hooks, context when needed
- **Development Server**: Runs on port 8201 (preserve if running)
- **Backend**: Medusa v2 server (`apps/server/`) typically on port 9000

### Before Starting Any Work
1. Import and run the server check: `import { validateServerForTesting } from './tests/utils/server-check'`
2. Review existing component patterns in relevant directories
3. Check configuration files and existing type definitions
4. Understand the component's role in the overall application

## Code Quality Standards

### TypeScript Requirements
- **Strict typing**: No `any` types, proper interfaces/types
- **Type Safety**: Use proper generics and utility types
- **Import Organization**: Clean, organized imports

### React Best Practices
- **Functional components**: Use modern React patterns
- **Hook Usage**: Proper hook implementation and dependencies
- **Performance**: Implement React.memo, useMemo, useCallback where beneficial
- **Error Handling**: Proper error boundaries, graceful failure states

### Styling Standards
- **Tailwind CSS**: Use utility classes, avoid custom CSS unless necessary
- **Design System**: Follow established design tokens and component patterns
- **Responsive**: Mobile-first approach, test all major breakpoints
- **Accessibility**: WCAG compliance, semantic HTML, ARIA attributes

### Security & Performance
- **Security**: Never expose secrets, proper data validation
- **Performance**: Optimize for Core Web Vitals, efficient loading
- **SEO**: Proper meta tags and semantic structure

## Testing Requirements

### Validation Steps
- Validate components render without errors
- Test responsive behavior across viewports
- Verify TypeScript compilation passes: `bunx tsc --noEmit`
- Use visual testing utilities for screenshot validation
- Test interactive elements and state changes

### Quality Checks
- Run `bun run lint` and fix any linting issues
- Test accessibility with keyboard navigation
- Verify color contrast meets WCAG AA standards
- Test in multiple browsers when applicable

## Agent Coordination Guidelines

### When to Use Multiple Agents
- **Complex Features**: Break down into frontend, visual, and integration aspects
- **Full Components**: Use all agents for comprehensive implementation
- **Performance Issues**: Testing agent identifies, others implement solutions
- **Design System Updates**: Visual agent leads, others implement consistently

### Handoff Procedures
1. **Clear Documentation**: Each agent documents what they completed
2. **Test Results**: Include screenshots, performance metrics, test reports
3. **File Changes**: List all modified files with brief explanations
4. **Next Steps**: Suggest follow-up work or improvements
5. **Integration Points**: Highlight any areas needing cross-agent collaboration

### Communication Between Agents
- Reference work done by previous agents
- Build upon established patterns and decisions
- Maintain consistency in implementation approaches
- Flag any conflicts or inconsistencies for resolution

## Development Workflow

### Implementation Process
1. **Analysis**: Study existing code patterns and architecture
2. **Planning**: Break down requirements into manageable steps
3. **Implementation**: Write clean, typed, performant code
4. **Testing**: Use provided testing utilities to validate functionality
5. **Documentation**: Explain implementation decisions when needed

### When You Complete Work
1. Run all required quality checks (lint, typecheck, tests)
2. Take component screenshots using visual testing utilities
3. Provide clear testing instructions for manual verification
4. Document any new patterns or architectural decisions
5. Suggest improvements or follow-up work if applicable

## Communication Style

### General Guidelines
- Be precise and technical in explanations
- Focus on "why" behind implementation decisions
- Provide code examples and specific file paths
- Suggest performance optimizations when relevant
- Offer alternatives when trade-offs exist

### Reporting Standards
- Clear pass/fail status for each test category
- Screenshots for visual validation
- Performance metrics with benchmarks
- Accessibility compliance reports
- Browser compatibility information when relevant

## Resources

### Key Documentation
- **Project Instructions**: `/localdev/sigreer/sharewear.clothing/CLAUDE.md`
- **Medusa v2 Docs**: `docs/medusa-docs/MEDUSA_DOCS.md`
- **Workflow Guide**: `FRONTEND_AI_WORKFLOW.md`
- **Component Testing**: `COMPONENT_TESTING_GUIDE.md`

### Configuration Files
- **Tailwind Config**: `apps/storefront1/tailwind.config.js`
- **TypeScript Config**: `apps/storefront1/tsconfig.json`
- **Medusa Config**: `apps/server/medusa-config.ts`

Remember: You are working within an existing codebase with established patterns. Your job is to extend and enhance while maintaining consistency, quality, and user experience.