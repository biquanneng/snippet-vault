/* SPDX-License-Identifier: MPL-2.0 */

import { Img, staticFile } from "remotion";
import { mediaTheme } from "../brand/theme";

type ProductScreenshotProps = {
  readonly dark?: boolean;
  readonly expectedPath: string;
  readonly height: number;
  readonly screenshotPath: string | null;
  readonly width: number;
};

export const ProductScreenshot = ({
  dark = false,
  expectedPath,
  height,
  screenshotPath,
  width,
}: ProductScreenshotProps) => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      height,
      justifyContent: "center",
      width,
    }}
  >
    {screenshotPath ? (
      <Img
        src={staticFile(screenshotPath)}
        style={{
          borderRadius: mediaTheme.radius.frame,
          boxShadow: dark ? mediaTheme.darkShadow : mediaTheme.shadow,
          display: "block",
          maxHeight: "100%",
          maxWidth: "100%",
          objectFit: "contain",
        }}
      />
    ) : (
      <div
        style={{
          alignItems: "center",
          backgroundColor: mediaTheme.colors.surface,
          borderRadius: mediaTheme.radius.frame,
          color: mediaTheme.colors.muted,
          display: "flex",
          flexDirection: "column",
          fontFamily: mediaTheme.fontFamily,
          fontSize: 16,
          gap: 12,
          height: "100%",
          justifyContent: "center",
          padding: 32,
          textAlign: "center",
          width: "100%",
        }}
      >
        <strong style={{ color: mediaTheme.colors.ink, fontSize: 22 }}>
          Awaiting sanitized screenshot
        </strong>
        {expectedPath}
      </div>
    )}
  </div>
);
