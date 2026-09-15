import { loadFont } from "@remotion/google-fonts/IBMPlexSansKR";

/** The app sets --font-plex-kr from next/font; the video loads the same family. */
export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["korean", "latin"],
});
