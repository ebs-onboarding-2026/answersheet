import { Config } from "@remotion/cli/config";

/**
 * The screenshots the README already uses are the footage for this video, so the
 * public directory points at them instead of keeping a second copy under video/.
 */
Config.setPublicDir("../docs");

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
