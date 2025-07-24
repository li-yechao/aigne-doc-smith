# Tests

This directory contains test files for AIGNE DocSmith.

## Test Files

### test-save-docs.mjs

Tests the file cleanup functionality of the `saveDocs` method.

**Test Content:**
- Verify the generation of `_sidebar.md` file
- Verify cleanup of invalid .md files (including main files and translation files)
- Verify retention of valid files

**Run Method:**
```bash
node tests/test-save-docs.mjs
```

**Test Scenarios:**
1. Create test directory containing valid and invalid files
2. Run the `saveDocs` method
3. Verify that only files in the structure plan are retained
4. Verify that `_sidebar.md` file is correctly generated
5. Verify that invalid files are deleted

**Expected Results:**
- Main files in the structure plan are retained
- Translation files in the structure plan are retained
- Files not in the structure plan are deleted
- `_sidebar.md` file is generated

### load-sources.test.mjs

Tests the file loading and filtering functionality of the `loadSources` method.

**Test Content:**
- Verify the operation of default include/exclude patterns
- Verify handling of custom patterns
- Verify processing of .gitignore files
- Verify handling of multi-level directory structures
- Verify filtering of multiple file types
- Verify handling of path patterns

**Run Method:**
```bash
node tests/load-sources.test.mjs
```

**Test Scenarios:**
1. Create complex test directory structure
2. Test different include/exclude pattern combinations
3. Verify accuracy of file filtering
4. Verify robustness of error handling

**Expected Results:**
- Correctly include specified file types
- Correctly exclude unwanted files and directories
- Correctly process .gitignore rules
- Correctly handle multi-level directory structures
- Correctly handle non-existent directories 