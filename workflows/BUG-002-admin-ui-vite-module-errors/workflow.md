# BUG-002: Admin UI Vite Module Loading Errors

## Description
Admin UI pages fail to load with "Failed to fetch dynamically imported module" errors. The error shows Vite attempting to load modules from filesystem paths (`@fs/home/simon/...`) instead of relative URLs. This likely occurred after regex find/replace of `localhost:9000` to `sharewear.local:9000`.

## Source
- **Requested by:** User
- **Date:** 2025-10-04
- **Priority:** High (blocks Admin UI functionality)

## Objectives
1. Identify what configuration was incorrectly changed by the hostname regex replacement
2. Restore correct Vite/dev server configuration
3. Ensure Admin UI pages load without module errors
4. Verify all admin pages work correctly (Orders, Products, etc.)

## Success Criteria
- [ ] Admin UI pages load without Vite module errors
- [ ] Orders page displays correctly
- [ ] All key admin pages functional (Products, Orders, Customers, etc.)
- [ ] No filesystem path references in browser console
- [ ] Vite HMR and module loading works correctly

## Agents Required
- project-orchestrator: Workflow coordination
- medusa-backend-developer: Configuration investigation and fix
- backend-qa-testing-specialist: Admin UI validation

## Related Workflows
- BUG-001: Admin Export File Not Found (may have contributed to hostname changes)

---
**Created:** 2025-10-04T20:10:00Z
