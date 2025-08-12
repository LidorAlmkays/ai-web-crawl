# Job 1: Clean Slate Preparation

## Overview

**Status**: ✅ **COMPLETED**  
**Dependency Level**: 0 (No dependencies - must be done first)  
**Duration**: 1-2 hours  
**Description**: Remove existing broken logger implementation and prepare clean project structure for new OTEL logger system.

## Prerequisites

- ✅ Backup current implementation (optional)
- ✅ Ensure no active development on logger components
- ✅ Understanding of current file structure

## Objectives

1. Remove all existing logger files and Winston dependencies
2. Create clean folder structure for new logging system
3. Provide temporary logger to prevent build failures
4. Clean package.json dependencies

## Detailed Tasks

### Task 1.1: Remove Existing Logger Files

**Estimated Time**: 15 minutes

```bash
# Remove current logger implementation
rm -rf apps/task-manager/src/common/utils/loggers/
rm apps/task-manager/src/common/utils/logger.ts
```

**Files to Remove**:

- `apps/task-manager/src/common/utils/loggers/` (entire folder)
- `apps/task-manager/src/common/utils/logger.ts`
- Any test files related to old logger

### Task 1.2: Clean Dependencies

**Estimated Time**: 10 minutes

Remove Winston from package.json:

```json
// Remove from package.json dependencies:
{
  "winston": "^3.x.x" // Remove this line
}
```

**Action Required**:

1. Open `apps/task-manager/package.json`
2. Remove the `winston` dependency entry
3. Run `npm install` to update node_modules

### Task 1.3: Create New Folder Structure

**Estimated Time**: 5 minutes

```bash
# Create new logging folder structure
mkdir -p apps/task-manager/src/common/utils/logging/__tests__
```

**Expected Structure**:

```
src/common/utils/logging/
├── __tests__/           # Test files (empty for now)
└── (ready for new implementation)
```

### Task 1.4: Create Temporary Logger

**Estimated Time**: 20 minutes

Create a temporary logger to prevent build failures:

```typescript
// apps/task-manager/src/common/utils/logger.ts
/**
 * Temporary logger implementation
 * This is a placeholder to prevent build failures during logger redesign.
 * Will be replaced with proper OTEL logger implementation.
 */

interface TempLogger {
  info(message: string, metadata?: any): void;
  warn(message: string, metadata?: any): void;
  error(message: string, metadata?: any): void;
  debug(message: string, metadata?: any): void;
}

class TempLoggerImpl implements TempLogger {
  info(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[level:info,service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) {
      console.log(JSON.stringify(metadata, null, 2));
    }
  }

  warn(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[level:warn,service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) {
      console.warn(JSON.stringify(metadata, null, 2));
    }
  }

  error(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[level:error,service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) {
      console.error(JSON.stringify(metadata, null, 2));
    }
  }

  debug(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    console.debug(`[level:debug,service:task-manager,timestamp:${timestamp}]:${message}`);
    if (metadata) {
      console.debug(JSON.stringify(metadata, null, 2));
    }
  }
}

export const logger = new TempLoggerImpl();
```

### Task 1.5: Verify Build and Basic Functionality

**Estimated Time**: 15 minutes

```bash
# Test build
cd apps/task-manager
npm run build

# Test basic application startup
npm run serve

# Should see temporary logger output in correct format
```

## Validation Criteria

### ✅ Technical Validation

1. **Build Success**: `npm run build` completes without errors
2. **No Winston Dependencies**: `package.json` contains no Winston references
3. **Clean Structure**: New `logging/` folder exists and is empty
4. **Temporary Logger Works**: Application starts and logs appear in console
5. **Console Format**: Logs match format `[level:X,service:task-manager,timestamp:Y]:message`

### ✅ Functional Validation

1. **Application Starts**: Server boots without logger-related errors
2. **Existing Code Works**: All current `logger.info()` calls continue working
3. **No Runtime Errors**: No undefined or missing logger errors

## Expected Output

### Console Log Example

```
[level:info,service:task-manager,timestamp:2024-01-01T12:00:00.000Z]:Task Manager application started successfully
```

### File Structure After Completion

```
apps/task-manager/src/common/utils/
├── logging/
│   └── __tests__/
├── logger.ts (temporary implementation)
└── (other utility files...)
```

## Deliverables

- [ ] **Removed Files**: All old logger implementation files deleted
- [ ] **Clean Dependencies**: Winston removed from package.json
- [ ] **New Structure**: Empty logging folder created with test directory
- [ ] **Temporary Logger**: Working placeholder that matches output format
- [ ] **Verified Build**: Application builds and starts successfully

## Dependencies for Next Jobs

**Blocks**: All subsequent jobs (2-6) depend on this clean foundation

**Enables**:

- Job 2: Core Interface and Factory Design
- Clean slate for implementing proper OTEL integration

## Troubleshooting

### Common Issues

1. **Build Errors After Removal**

   - Solution: Ensure temporary logger exports correct interface
   - Check all import statements point to correct file

2. **Missing Logger Methods**

   - Solution: Verify temporary logger implements all required methods
   - Add any missing methods used by existing code

3. **TypeScript Errors**
   - Solution: Ensure temporary logger types match existing usage
   - Add proper type definitions if needed

### Rollback Plan

If issues arise:

1. Restore deleted files from backup
2. Reinstall Winston dependency
3. Revert package.json changes

## Notes

- ⚠️ **Important**: This job removes working code - ensure you have backups
- 🎯 **Goal**: Clean foundation for new implementation
- ⏱️ **Critical Path**: This job blocks all others - complete first
- 🧪 **Test Strategy**: Verify temporary logger before proceeding

## Ready for Next Job

Upon completion, Job 2 (Core Interface and Factory Design) can begin immediately.
