"use client";

import { useEffect, useState } from "react";
import { storageService } from "@/lib/storage/storage-service";
import { IndexedDBAdapter } from "@/lib/storage/indexeddb-adapter";

export function StorageDebug() {
  const [storageInfo, setStorageInfo] = useState<{
    isIndexedDBSupported: boolean;
    isOPFSSupported: boolean;
    isFullySupported: boolean;
    error: string | null;
  }>({
    isIndexedDBSupported: false,
    isOPFSSupported: false,
    isFullySupported: false,
    error: null,
  });

  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const checkStorage = async () => {
      try {
        const isIndexedDBSupported = storageService.isIndexedDBSupported();
        const isOPFSSupported = storageService.isOPFSSupported();
        const isFullySupported = storageService.isFullySupported();

        setStorageInfo({
          isIndexedDBSupported,
          isOPFSSupported,
          isFullySupported,
          error: null,
        });

        console.log("🔍 Storage Debug - Support Check:", {
          isIndexedDBSupported,
          isOPFSSupported,
          isFullySupported,
        });

        // Test actual storage operations
        try {
          const testAdapter = new IndexedDBAdapter("debug-db", "test-store", 1);
          const testKey = "storage-test";
          const testData = { id: testKey, test: true, timestamp: Date.now() };
          
          await testAdapter.set(testKey, testData);
          const retrieved = await testAdapter.get(testKey);
          await testAdapter.remove(testKey);
          
          setTestResult(`✅ Storage test passed: ${JSON.stringify(retrieved)}`);
          console.log("✅ Storage test passed");
        } catch (error) {
          const errorMessage = `❌ Storage test failed: ${error instanceof Error ? error.message : String(error)}`;
          setTestResult(errorMessage);
          console.error("❌ Storage test failed:", error);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setStorageInfo((prev) => ({
          ...prev,
          error: errorMessage,
        }));
      }
    };

    checkStorage();
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-background border border-border rounded-lg p-4 max-w-sm z-50">
      <h3 className="text-sm font-semibold mb-2">Storage Debug</h3>
      <div className="text-xs space-y-1">
        <div>IndexedDB: {storageInfo.isIndexedDBSupported ? "✅" : "❌"}</div>
        <div>OPFS: {storageInfo.isOPFSSupported ? "✅" : "❌"}</div>
        <div>Full Support: {storageInfo.isFullySupported ? "✅" : "❌"}</div>
        {storageInfo.error && (
          <div className="text-destructive">Error: {storageInfo.error}</div>
        )}
        {testResult && (
          <div className="mt-2 p-2 bg-muted rounded">
            <div className="font-semibold">Test Result:</div>
            <div className="text-xs">{testResult}</div>
          </div>
        )}
      </div>
    </div>
  );
}
