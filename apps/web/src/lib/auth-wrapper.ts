/**
 * Auth Wrapper
 * Provides unified auth interface that switches between server auth and desktop auth
 */

import { useEffect, useState } from 'react';
import { isElectron } from './electron-detection';
import { createDesktopSession, getDesktopUser } from './desktop-auth';

/**
 * Unified useSession hook that works in both server and desktop modes
 */
export function useSession() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isElectron()) {
      // Desktop mode - create local session immediately
      console.log('🖥️ Desktop mode detected - using local authentication');
      const desktopSession = createDesktopSession();
      setSession(desktopSession);
      setIsLoading(false);
    } else {
      // Server mode - try to dynamically import auth
      import('@/lib/workspace-packages/auth/client')
        .then(({ useSession: useServerSession }) => {
          // Use the original auth hook
          const serverSession = useServerSession();
          setSession(serverSession);
          setIsLoading(serverSession.isPending || false);
        })
        .catch((error) => {
          console.warn('Failed to load server auth, using fallback:', error);
          setSession({ data: null, error: null, isPending: false });
          setIsLoading(false);
        });
    }
  }, []);

  return session || { data: null, error: null, isPending: isLoading };
}

/**
 * Sign in function - no-op in desktop mode
 * Note: Server mode functions not fully implemented - desktop mode is primary focus
 */
export async function signIn(provider?: string, options?: any) {
  if (isElectron()) {
    console.log('🖥️ Desktop mode - sign in not required');
    return { success: true, data: createDesktopSession().data };
  }
  
  // Server mode not implemented in wrapper - use original auth directly
  throw new Error('Server authentication not available in wrapper - use original auth client');
}

/**
 * Sign up function - no-op in desktop mode
 */
export async function signUp(data: any) {
  if (isElectron()) {
    console.log('🖥️ Desktop mode - sign up not required');
    return { success: true, data: createDesktopSession().data };
  }
  
  // Server mode not implemented in wrapper - use original auth directly
  throw new Error('Server authentication not available in wrapper - use original auth client');
}

/**
 * Sign out function
 */
export async function signOut() {
  if (isElectron()) {
    console.log('🖥️ Desktop mode - sign out not applicable');
    return { success: true };
  }
  
  // Server mode not implemented in wrapper - use original auth directly
  return { success: true };
}