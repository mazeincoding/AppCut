import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Handle fuckcapcut.com domain redirect
  if (request.headers.get("host") === "fuckcapcut.com") {
    return NextResponse.redirect("https://opencut.app/why-not-capcut", 301);
  }

  const path = request.nextUrl.pathname;

  // 跳过 next-intl 处理的特定路径
  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.startsWith('/_vercel') ||
    path.includes('.')
  ) {
    if (path === "/editor" && process.env.NODE_ENV === "production") {
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("redirect", request.url);
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  // 应用 next-intl 路由处理
  const response = handleI18nRouting(request);

  // 对编辑器路径进行额外检查（在本地化之后）
  if (response.status === 200) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // 检查是否是编辑器路径（可能有语言前缀）
    if (pathname.endsWith('/editor') && process.env.NODE_ENV === "production") {
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("redirect", request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  // 匹配所有路径名，除了以下开头的：
  // - api (API 路由)
  // - _next/static (静态文件)
  // - _next/image (图像优化文件)
  // - _vercel (Vercel 内部文件)
  // - favicon.ico 等包含点的文件
  matcher: [
    '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)'
  ],
};
