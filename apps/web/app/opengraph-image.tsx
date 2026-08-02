// SPDX-License-Identifier: MPL-2.0

import { ImageResponse } from "next/og";

export const alt =
  "SnippetVault — Local-first developer snippet manager for Chrome";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        background: "#f6f4ee",
        color: "#191a17",
        display: "flex",
        fontFamily: "sans-serif",
        height: "100%",
        padding: 60,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "58%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            gap: 14,
          }}
        >
          <div
            style={{
              background: "#84cc16",
              height: 18,
              width: 18,
            }}
          />
          SnippetVault
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#4d7c0f",
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Open source · Chrome MV3
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
              maxWidth: 660,
            }}
          >
            Developer Snippet Manager
          </div>
          <div
            style={{
              color: "#64645d",
              display: "flex",
              fontSize: 24,
              lineHeight: 1.4,
              maxWidth: 630,
            }}
          >
            Capture selected text, keep temporary work, and retrieve reusable
            snippets without leaving the page.
          </div>
        </div>

        <div style={{ color: "#77766e", display: "flex", fontSize: 20 }}>
          biqn.dev/snippetvault
        </div>
      </div>

      <div
        style={{
          alignSelf: "center",
          background: "#ffffff",
          border: "2px solid #d8d4c8",
          display: "flex",
          flexDirection: "column",
          height: 500,
          marginLeft: 40,
          padding: 24,
          width: "38%",
        }}
      >
        <div
          style={{
            color: "#4d7c0f",
            display: "flex",
            fontSize: 17,
            fontWeight: 700,
            justifyContent: "space-between",
            textTransform: "uppercase",
          }}
        >
          Quick find
          <span style={{ color: "#77766e" }}>Local-first</span>
        </div>
        <div
          style={{
            border: "2px solid #d8d4c8",
            color: "#77766e",
            display: "flex",
            fontSize: 18,
            marginTop: 24,
            padding: 16,
          }}
        >
          Search snippets...
        </div>
        {[
          ["Sandbox billing key", "sk_test_••••••1D4f"],
          ["Deploy preview", "pnpm deploy:preview"],
          ["Webhook test URL", "https://example.test/••••"],
        ].map(([title, value]) => (
          <div
            key={title}
            style={{
              border: "2px solid #e8e4da",
              display: "flex",
              flexDirection: "column",
              fontSize: 17,
              gap: 10,
              marginTop: 14,
              padding: 15,
            }}
          >
            <span style={{ fontWeight: 700 }}>{title}</span>
            <span style={{ color: "#77766e", fontFamily: "monospace" }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
