/* SPDX-License-Identifier: MPL-2.0 */

import { AbsoluteFill } from "remotion";
import { mediaTheme } from "../../brand/theme";
import {
  storeSlides,
  type StoreLocale,
  type StoreSlideId,
} from "../../content/store-copy";
import { StoreScreenshot } from "./StoreScreenshot";

export type StoreContactSheetProps = {
  readonly locale: StoreLocale;
  readonly screenshotPaths: Record<StoreSlideId, string | null>;
};

const previewScale = 0.40625;

export const StoreContactSheet = ({
  locale,
  screenshotPaths,
}: StoreContactSheetProps) => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(120% 120% at 50% 0%, #FFFFFF 0%, #F8FAFC 50%, #F1F5F9 100%)",
      color: mediaTheme.colors.ink,
      fontFamily: mediaTheme.fontFamily,
      padding: "42px 72px",
    }}
  >
    <div
      style={{
        alignItems: "baseline",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 760, letterSpacing: -0.8 }}>
        Chrome Web Store Screenshots
      </div>
      <div
        style={{
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 9999,
          color: mediaTheme.colors.muted,
          display: "inline-flex",
          fontSize: 13,
          fontWeight: 600,
          gap: 6,
          padding: "4px 12px",
          textTransform: "uppercase",
        }}
      >
        <div
          style={{
            backgroundColor: mediaTheme.colors.accent,
            borderRadius: "50%",
            height: 6,
            width: 6,
          }}
        />
        {locale}
      </div>
    </div>

    <div
      style={{
        alignContent: "center",
        display: "flex",
        flex: 1,
        flexWrap: "wrap",
        gap: 24,
        justifyContent: "center",
        marginTop: 28,
      }}
    >
      {storeSlides.map((slideId) => (
        <div
          key={slideId}
          style={{
            borderRadius: 14,
            boxShadow:
              "0 16px 32px -8px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.08)",
            height: 325,
            overflow: "hidden",
            position: "relative",
            width: 520,
          }}
        >
          <div
            style={{
              height: 800,
              left: 0,
              position: "absolute",
              scale: previewScale,
              top: 0,
              transformOrigin: "top left",
              width: 1280,
            }}
          >
            <StoreScreenshot
              locale={locale}
              screenshotPath={screenshotPaths[slideId]}
              slideId={slideId}
            />
          </div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);
