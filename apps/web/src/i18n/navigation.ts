import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// 为next-intl创建导航APIs的轻量级包装器
// 自动考虑路由配置的APIs
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
