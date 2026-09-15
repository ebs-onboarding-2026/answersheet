import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const plexKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "답안지 — AI 퀴즈 출제와 응시",
  description:
    "주제만 입력하면 객관식 문항을 만들어 주고, 학생은 공유된 퀴즈를 한 문항씩 풀어 바로 점수를 확인합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={plexKr.variable}>
      <body>
        <div className="timing-rail" aria-hidden="true" />
        <div className="pl-[26px] max-[720px]:pl-[14px]">{children}</div>
      </body>
    </html>
  );
}
