/* SPDX-License-Identifier: MPL-2.0 */

import { Img, staticFile } from "remotion";
import { mediaTheme } from "../brand/theme";

type BrandLockupProps = {
  readonly tone?: "dark" | "light";
  readonly size?: "default" | "large";
};

export const BrandLockup = ({
  tone = "dark",
  size = "default",
}: BrandLockupProps) => (
  <div
    style={{
      alignItems: "center",
      color:
        tone === "light"
          ? mediaTheme.colors.white
          : mediaTheme.colors.ink,
      display: "flex",
      fontFamily: mediaTheme.fontFamily,
      fontSize: size === "large" ? 26 : 21,
      fontWeight: 700,
      gap: size === "large" ? 13 : 10,
      letterSpacing: -0.5,
    }}
  >
    <Img
      src={staticFile("brand/icon.png")}
      style={{
        height: size === "large" ? 48 : 38,
        width: size === "large" ? 48 : 38,
      }}
    />
    SnippetVault
  </div>
);
