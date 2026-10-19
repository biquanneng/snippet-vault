/* SPDX-License-Identifier: MPL-2.0 */

import { AbsoluteFill, Img, staticFile } from "remotion";
import { mediaTheme } from "../../brand/theme";
import { BrandLockup } from "../../components/BrandLockup";
import { ProductScreenshot } from "../../components/ProductScreenshot";

const promoFontFamily = mediaTheme.fontFamily;

export const StoreSmallPromo = () => (
  <AbsoluteFill
    style={{
      backgroundColor: mediaTheme.colors.darkCanvas,
      backgroundImage:
        "radial-gradient(120% 120% at 15% 15%, #1E293B 0%, #0F172A 50%, #0B0F17 100%)",
      boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
      color: mediaTheme.colors.white,
      fontFamily: promoFontFamily,
      overflow: "hidden",
      padding: "28px 30px",
    }}
  >
    {/* Subtle top brand row */}
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 12,
      }}
    >
      <Img
        src={staticFile("brand/icon.png")}
        style={{
          borderRadius: 10,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.35)",
          height: 40,
          width: 40,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            color: mediaTheme.colors.white,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: -0.3,
          }}
        >
          SnippetVault
        </span>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 5,
          }}
        >
          <div
            style={{
              backgroundColor: mediaTheme.colors.accent,
              borderRadius: "50%",
              height: 5,
              width: 5,
            }}
          />
          <span
            style={{
              color: mediaTheme.colors.mutedOnDark,
              fontSize: 11,
              fontWeight: 550,
              letterSpacing: "0.02em",
            }}
          >
            Local-first Vault
          </span>
        </div>
      </div>
    </div>

    {/* Center punchy headline */}
    <div
      style={{
        bottom: 58,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        left: 30,
        position: "absolute",
        right: 30,
      }}
    >
      <h2
        style={{
          color: mediaTheme.colors.white,
          fontSize: 34,
          fontWeight: 760,
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
          margin: 0,
        }}
      >
        Save. Find.
        <br />
        Keep moving.
      </h2>
    </div>

    {/* Bottom subline */}
    <div
      style={{
        bottom: 24,
        color: mediaTheme.colors.mutedOnDark,
        fontSize: 12.5,
        fontWeight: 500,
        left: 30,
        letterSpacing: "-0.01em",
        position: "absolute",
      }}
    >
      Zero cloud • Double-Shift anywhere
    </div>
  </AbsoluteFill>
);

export const StoreMarqueePromo = () => (
  <AbsoluteFill
    style={{
      backgroundColor: mediaTheme.colors.darkCanvas,
      backgroundImage:
        "radial-gradient(100% 100% at 30% 20%, #1E293B 0%, #0F172A 50%, #0B0F17 100%)",
      boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
      color: mediaTheme.colors.white,
      fontFamily: promoFontFamily,
      overflow: "hidden",
    }}
  >
    {/* Soft spotlight behind the product screenshot */}
    <div
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(132, 204, 22, 0.06) 0%, rgba(15, 23, 42, 0) 70%)",
        height: 600,
        pointerEvents: "none",
        position: "absolute",
        right: 40,
        top: -20,
        width: 700,
      }}
    />

    {/* Left hero narrative */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        left: 72,
        padding: "48px 0 54px",
        position: "absolute",
        width: 660,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ alignItems: "center", display: "flex", gap: 14 }}>
          <BrandLockup size="large" tone="light" />
          <div
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 9999,
              color: "#CBD5E1",
              display: "inline-flex",
              fontSize: 12,
              fontWeight: 600,
              gap: 6,
              letterSpacing: "0.04em",
              padding: "4px 10px",
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
            Local-first Extension
          </div>
        </div>

        <h1
          style={{
            color: mediaTheme.colors.white,
            fontSize: 58,
            fontWeight: 780,
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            margin: 0,
            maxWidth: 620,
          }}
        >
          Your snippets.
          <br />
          Ready when you are.
        </h1>

        <p
          style={{
            color: mediaTheme.colors.mutedOnDark,
            fontSize: 20,
            fontWeight: 480,
            lineHeight: 1.45,
            margin: 0,
            maxWidth: 580,
          }}
        >
          Capture, organize, and search locally.
          <br />
          No account. No cloud service.
        </p>
      </div>

      {/* Feature chips */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { icon: "⚡", text: "Instant search" },
          { icon: "⌨", text: "Double-Shift anywhere" },
          { icon: "🔒", text: "100% offline vault" },
        ].map((feat) => (
          <div
            key={feat.text}
            style={{
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 8,
              color: "#CBD5E1",
              display: "flex",
              fontSize: 13,
              fontWeight: 520,
              gap: 8,
              padding: "7px 13px",
            }}
          >
            <span>{feat.icon}</span>
            <span>{feat.text}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Right screenshot showcase */}
    <div style={{ position: "absolute", right: 60, top: 40 }}>
      <ProductScreenshot
        dark
        expectedPath="screenshots/chrome-store/en/01-search.png"
        height={480}
        screenshotPath="screenshots/chrome-store/en/01-search.png"
        width={560}
      />
    </div>
  </AbsoluteFill>
);
