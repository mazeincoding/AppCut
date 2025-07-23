/**
 * Storage functionality test for Electron environment
 */

import { storageService } from "./storage-service";

export async function testStorage() {
  console.log("🧪 Starting storage functionality test...");
  
  const results = {
    indexedDB: false,
    opfs: false,
    fullSupport: false,
    error: null as string | null,
    testPassed: false
  };

  try {
    // Check basic support
    results.indexedDB = storageService.isIndexedDBSupported();
    results.opfs = storageService.isOPFSSupported();
    results.fullSupport = storageService.isFullySupported();

    console.log("🔍 Storage support check:", {
      indexedDB: results.indexedDB,
      opfs: results.opfs,
      fullSupport: results.fullSupport
    });

    // Test actual storage operations
    if (results.fullSupport) {
      try {
        // Test project storage
        const testProject = {
          id: "test-project",
          name: "Test Project",
          thumbnail: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          backgroundColor: "#000000",
          backgroundType: "color" as const,
          blurIntensity: 0
        };

        await storageService.saveProject(testProject);
        const loadedProject = await storageService.loadProject("test-project");
        
        if (loadedProject && loadedProject.id === "test-project") {
          results.testPassed = true;
          console.log("✅ Project storage test passed");
          
          // Clean up
          await storageService.deleteProject("test-project");
        } else {
          throw new Error("Project not loaded correctly");
        }
      } catch (error) {
        results.error = error instanceof Error ? error.message : String(error);
        console.error("❌ Storage test failed:", error);
      }
    }

  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    console.error("❌ Storage initialization failed:", error);
  }

  console.log("📊 Storage test results:", results);
  return results;
}

// Run test if in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Auto-run test after a short delay to allow initialization
  setTimeout(() => {
    testStorage().catch(console.error);
  }, 1000);
}
