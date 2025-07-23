// Test utility to verify Electron integration
export async function testElectronAPI() {
  // Check if we're in Electron environment
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const electronAPI = (window as any).electronAPI;
    
    console.log('🔌 Electron API detected');
    console.log('Platform:', electronAPI.platform);
    console.log('Is Electron:', electronAPI.isElectron);
    
    try {
      // Test basic IPC communication
      const response = await electronAPI.ping();
      console.log('✅ IPC Test successful - ping response:', response);
      return true;
    } catch (error) {
      console.error('❌ IPC Test failed:', error);
      return false;
    }
  } else {
    console.log('🌐 Running in browser environment');
    return false;
  }
}