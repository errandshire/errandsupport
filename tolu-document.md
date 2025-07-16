# Tolu Development Guidelines & Warnings

## Project Context
This is a fullstack applicaton with next js and appwrite. Don't code, think to understand the issue then ask me if you should proceed or not. All code changes must be professional, well-reasoned, and follow established patterns to maintain team standards and avoid PR complications.

## Core Development Principles

### 1. Code Quality Standards
- **Industry Standard Code**: Follow established NestJS and TypeScript best practices
- **Simple & Clean**: Write readable, maintainable code - NO over-engineering
- **Scalable**: Consider future growth but don't premature optimize
- **Security First**: Always consider security implications in implementations
- **Pattern Consistency**: Follow existing naming conventions, logging patterns, and code structure
- **Reusable First**: Always prefer reusable approaches when writing code. Use interface extension, composition, utility functions, or shared modules to avoid repetition and ensure consistency across the codebase. Only implement reusability where it is necessary and justified, not blindly.
- **Code Formatting**: Always format your code according to project or industry standards before committing. Use automated tools (like Prettier or ESLint) where available.
- **Ask Before Acting**: Always ask for clarification or confirmation before making changes, especially if you are unsure whether a change is necessary or if it might impact other areas.

### 2. Implementation Approach
- **Ask Before Acting**: If not 100% certain about a task, ask clarifying questions and confirm with the team or requester before proceeding
- **Stay On Task**: Focus only on the specific requirement - don't fix unrelated code
- **Team Awareness**: Remember multiple developers work on this codebase
- **Reasoning Required**: Always explain WHY you implemented something a certain way

### 3. Pre-Implementation Checklist
Before writing any code, verify:
- [ ] Task requirements are 100% clear
- [ ] Existing patterns have been identified and will be followed
- [ ] Security implications have been considered
- [ ] Implementation approach is simple and clean
- [ ] No unnecessary changes to unrelated code
- [ ] Reusability has been prioritized to avoid repetition in logic, types, and structures (where necessary)
- [ ] Code will be formatted according to project standards

### 4. Code Analysis Requirements
Before implementing, analyze:
- Existing naming conventions in the 
- 
- Opportunities for code reuse in all areas (not just responses)
- Code formatting and linting requirements

### 5. Implementation Documentation
For every implementation, provide:
- **What**: Clear description of what was implemented
- **Why**: Reasoning behind the implementation approach
- **How**: Brief explanation of the technical approach
- **Security Considerations**: Any security measures included
- **Patterns Followed**: Which existing patterns were maintained
- **Reusability**: How the solution promotes code reuse and avoids repetition
- **Formatting**: Note any formatting tools or standards used

### 6. Final Review Process
After implementation, conduct:
- **Flow Review**: Ensure logical flow from request to response
- **Pattern Consistency**: Verify adherence to existing patterns
- **Security Check**: Confirm no vulnerabilities introduced
- **Clean Code Verification**: Ensure code is readable and maintainable
- **Linkage Check**: Verify no broken dependencies or circular references
- **Reusability Check**: Confirm that reusable approaches were used to avoid repetition (where necessary)
- **Formatting Check**: Ensure code is properly formatted and linted

## Current Project Patterns to Follow

### File Structure Patterns

- Interfaces: Type definitions

### Naming Conventions
- Use descriptive, clear names
- Follow camelCase for variables/methods
- Use PascalCase for classes/interfaces
- Use kebab-case for file names
- Prefix interfaces with 'I' if needed

### Error Handling
- Implement proper exception filters
- Provide meaningful error messages
- Log errors appropriately

## Warning Flags - Ask Questions When:
- Task requirements are ambiguous
- Multiple implementation approaches exist
- Existing code patterns are unclear
- Security implications are uncertain
- Changes might affect other team members' work
- Database schema changes are involved
- Authentication/authorization changes needed

## Forbidden Actions
- Making changes to unrelated code without permission
- Over-engineering simple solutions
- Breaking existing patterns without discussion
- Implementing without understanding the full context
- Proceeding when uncertain about requirements

## Communication Protocol
- Always ask for clarification before implementing
- Explain reasoning behind implementation choices
- Highlight any security considerations
- Document any pattern deviations and reasons
- Provide final summary of changes and their implications

---

**Remember**: Quality over speed. Better to ask questions and implement correctly than to create PR complications that affect team reputation.