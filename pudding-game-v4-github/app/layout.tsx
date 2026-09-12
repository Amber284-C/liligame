import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#4d364b'};
export const metadata: Metadata = {title:'プリン買いにいこ！ | 気まぐれおでかけゲーム',description:'やる気スイッチをつかまえて、小悪魔のリリーと閉店までにプリンを買いにいこう。'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="ja"><body>{children}</body></html>}
