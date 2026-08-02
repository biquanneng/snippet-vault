/* SPDX-License-Identifier: MPL-2.0 */

import { AbsoluteFill, Img, staticFile } from "remotion";
import { mediaTheme } from "../../brand/theme";
import { BrandLockup } from "../../components/BrandLockup";
import { ProductScreenshot } from "../../components/ProductScreenshot";

const promoFontFamily = mediaTheme.fontFamily;

export const StoreSmallPromo = () => (
  <AbsoluteFill
    style={{
      backgroundColor: mediaTheme.colors.accent,
      color: mediaTheme.colors.onAccent,
      fontFamily: promoFontFamily,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        backgroundColor: mediaTheme.colors.charcoal,
        bottom: 0,
        position: "absolute",
        right: 0,
        top: 0,
        width: 18,
      }}
    />
    <Img
      src={staticFile("brand/icon.png")}
      style={{
        height: 82,
        left: 30,
        position: "absolute",
        top: 28,
        width: 82,
      }}
    />
    <div
      style={{
        fontSize: 30,
        fontWeight: 760,
        left: 128,
        letterSpacing: "-0.03em",
        position: "absolute",
        top: 51,
      }}
    >
      SnippetVault
    </div>
    <div
      style={{
        bottom: 32,
        fontSize: 38,
        fontWeight: 790,
        left: 30,
        letterSpacing: "-0.035em",
        lineHeight: 1.02,
        position: "absolute",
      }}
    >
      Save. Find.
      <br />
      Keep moving.
    </div>
  </AbsoluteFill>
);

export const StoreMarqueePromo = () => (
  <AbsoluteFill
    style={{
      backgroundColor: mediaTheme.colors.charcoal,
      color: mediaTheme.colors.white,
      fontFamily: promoFontFamily,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        backgroundColor: mediaTheme.colors.accent,
        bottom: 0,
        position: "absolute",
        right: 0,
        top: 0,
        width: 500,
      }}
    />
    <div style={{ left: 62, position: "absolute", top: 50 }}>
      <BrandLockup size="large" tone="light" />
    </div>
    <div
      style={{
        fontSize: 70,
        fontWeight: 790,
        left: 62,
        letterSpacing: "-0.035em",
        lineHeight: 0.99,
        position: "absolute",
        top: 174,
        width: 740,
      }}
    >
      Your snippets.
      <br />
      Ready when you are.
    </div>
    <div
      style={{
        color: mediaTheme.colors.mutedOnDark,
        fontSize: 24,
        fontWeight: 520,
        left: 64,
        lineHeight: 1.4,
        position: "absolute",
        top: 370,
        width: 640,
      }}
    >
      Capture, organize, and search locally.
      <br />
      No account. No cloud service.
    </div>
    <div style={{ position: "absolute", right: 42, top: 30 }}>
      <ProductScreenshot
        expectedPath="screenshots/chrome-store/en/01-search.png"
        height={500}
        screenshotPath="screenshots/chrome-store/en/01-search.png"
        width={433}
      />
    </div>
  </AbsoluteFill>
);
