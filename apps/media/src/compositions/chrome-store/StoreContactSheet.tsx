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
      backgroundColor: mediaTheme.colors.canvas,
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
      <div style={{ fontSize: 34, fontWeight: 760, letterSpacing: -1 }}>
        Chrome Web Store screenshots
      </div>
      <div style={{ color: mediaTheme.colors.muted, fontSize: 20 }}>
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
            borderRadius: 12,
            boxShadow: "0 12px 34px rgba(25, 32, 29, 0.12)",
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
