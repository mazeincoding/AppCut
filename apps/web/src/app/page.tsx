import { redirect } from 'next/navigation';

// 这个页面只在用户访问根路径时运行
// 用户将被重定向到默认语言的页面
export default function RootPage() {
  redirect('/en');
}
