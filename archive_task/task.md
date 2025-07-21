# Task: Fix TransactionInactiveError in Video Upload

## Problem Description
After uploading a video, the application throws a `TransactionInactiveError` when trying to store the file in IndexedDB. The transaction becomes inactive before the `put` operation completes.

**Error Message:**
```
TransactionInactiveError: Failed to execute 'put' on 'IDBObjectStore': The transaction has finished.
```

## Error Location
**File:** `src\lib\storage\electron-opfs-adapter.ts`  
**Line:** 96:27  
**Method:** `ElectronOPFSAdapter.setToIndexedDB`

## Call Stack
1. `ElectronOPFSAdapter.setToIndexedDB` (line 96)
2. `ElectronOPFSAdapter.set` (line 28)
3. `StorageService.saveMediaItem` (line 159)
4. `addMediaItem` (media-store.ts line 176)
5. `processFiles` (media-panel/views/media.tsx line 53)

## Relevant Code Files

### Primary Issue File
**File:** `src/lib/storage/electron-opfs-adapter.ts` (lines 78-101)
```typescript
private async setToIndexedDB(key: string, file: File): Promise<void> {
  const dbName = `electron-media-${this.directoryName}`;
  const db = await this.openDB(dbName);
  const transaction = db.transaction(['files'], 'readwrite');
  const store = transaction.objectStore('files');
  
  // Convert File to ArrayBuffer for storage
  const arrayBuffer = await file.arrayBuffer();
  const fileData = {
    key,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    fileData: arrayBuffer,
    lastModified: file.lastModified
  };
  
  // Use direct promise to avoid transaction timeout
  const request = store.put(fileData);  // ← ERROR HERE (line 96)
  await new Promise<void>((resolve, reject) => {
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
```

### Storage Service
**File:** `src/lib/storage/storage-service.ts` (line 159)
- Calls `adapter.set(key, file)` which triggers the error

### Media Store
**File:** `src/stores/media-store.ts` (line 176)
- Calls `storageService.saveMediaItem()` during video upload processing

### Upload Component
**File:** `src/components/editor/media-panel/views/media.tsx` (line 53)
- Triggers the upload process via `addMediaItem()`

## Root Cause Analysis
The IndexedDB transaction becomes inactive because:
1. The `file.arrayBuffer()` operation is async and takes time for large video files
2. By the time the operation completes, the transaction has timed out
3. The `store.put()` call fails because the transaction is no longer active

## Solution Approach
Need to either:
1. **Keep transaction alive** during async operations
2. **Create transaction after** async file processing
3. **Use transaction completion events** properly
4. **Implement transaction retry logic**

## Previous Fix Attempt
The code comment mentions "Use direct promise to avoid transaction timeout" but the issue persists, indicating the current approach is insufficient for large video files.

## Files to Modify
1. `src/lib/storage/electron-opfs-adapter.ts` - Fix transaction handling
2. Potentially `src/lib/storage/storage-service.ts` - Adjust storage strategy
3. Test with `src/components/editor/media-panel/views/media.tsx` - Verify upload flow

## Success Criteria
- ✅ Video files upload without TransactionInactiveError
- ✅ Files are properly stored in IndexedDB
- ✅ Large video files (>10MB) work reliably
- ✅ No transaction timeout issues