/* SPDX-License-Identifier: MPL-2.0 */

import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { mediaTheme } from "../../brand/theme";
import { BrandLockup } from "../../components/BrandLockup";
import { ProductScreenshot } from "../../components/ProductScreenshot";
import {
  storeCopy,
  type StoreLocale,
  type StoreSlideId,
} from "../../content/store-copy";

export type StoreScreenshotProps = {
  readonly locale: StoreLocale;
  readonly slideId: StoreSlideId;
  readonly screenshotPath: string | null;
};

const expectedFileNames: Record<StoreSlideId, string> = {
  search: "01-search.png",
  capture: "02-capture.png",
  "in-page-search": "03-in-page-search.png",
  "temporary-workspace": "04-temporary-workspace.png",
  "local-backup": "05-local-backup.png",
};

export const getExpectedScreenshotPath = (
  locale: StoreLocale,
  slideId: StoreSlideId,
) => `screenshots/chrome-store/${locale}/${expectedFileNames[slideId]}`;

type LayoutProps = {
  readonly locale: StoreLocale;
  readonly screenshotPath: string | null;
};

const Canvas = ({ children }: { readonly children: ReactNode }) => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(120% 120% at 50% 0%, #FFFFFF 0%, #F8FAFC 50%, #F1F5F9 100%)",
      boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.08)",
      color: mediaTheme.colors.ink,
      fontFamily: mediaTheme.fontFamily,
      overflow: "hidden",
    }}
  >
    {children}
  </AbsoluteFill>
);

const FeatureBadge = ({ label }: { readonly label: string }) => (
  <div
    style={{
      alignItems: "center",
      backgroundColor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      borderRadius: 9999,
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      color: "#475569",
      display: "inline-flex",
      fontSize: 12,
      fontWeight: 650,
      gap: 7,
      letterSpacing: "0.05em",
      padding: "5px 12px",
      textTransform: "uppercase",
      width: "fit-content",
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
    <span>{label}</span>
  </div>
);

const Headline = ({
  children,
  fontSize = 52,
  width,
}: {
  readonly children: ReactNode;
  readonly fontSize?: number;
  readonly width?: number;
}) => (
  <h2
    style={{
      color: mediaTheme.colors.ink,
      fontSize,
      fontWeight: 740,
      letterSpacing: "-0.03em",
      lineHeight: 1.05,
      margin: 0,
      maxWidth: width,
      textWrap: "balance",
    }}
  >
    {children}
  </h2>
);

const Description = ({
  children,
  width,
}: {
  readonly children: ReactNode;
  readonly width?: number;
}) => (
  <p
    style={{
      color: mediaTheme.colors.muted,
      fontSize: 19.5,
      fontWeight: 480,
      lineHeight: 1.48,
      margin: 0,
      maxWidth: width,
      textWrap: "pretty",
    }}
  >
    {children}
  </p>
);

const SearchLayout = ({ locale, screenshotPath }: LayoutProps) => {
  const copy = storeCopy[locale].search;

  return (
    <Canvas>
      <div style={{ left: 64, position: "absolute", top: 48 }}>
        <BrandLockup size="large" />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          left: 64,
          position: "absolute",
          top: 250,
          width: 450,
        }}
      >
        <FeatureBadge label="Local search" />
        <Headline fontSize={54} width={440}>
          {copy.headline}
        </Headline>
        <Description width={420}>{copy.description}</Description>
      </div>
      <div style={{ position: "absolute", right: 54, top: 50 }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(locale, "search")}
          height={700}
          screenshotPath={screenshotPath}
          width={660}
        />
      </div>
    </Canvas>
  );
};

const TopLayout = ({
  badgeLabel,
  locale,
  screenshotHeight,
  screenshotPath,
  screenshotTop,
  slideId,
}: LayoutProps & {
  readonly badgeLabel: string;
  readonly screenshotHeight: number;
  readonly screenshotTop: number;
  readonly slideId: "capture" | "in-page-search";
}) => {
  const copy = storeCopy[locale][slideId];

  return (
    <Canvas>
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          left: 64,
          position: "absolute",
          right: 64,
          top: 32,
        }}
      >
        <BrandLockup />
        <FeatureBadge label={badgeLabel} />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          left: 64,
          position: "absolute",
          right: 64,
          top: 78,
        }}
      >
        <Headline fontSize={38} width={800}>
          {copy.headline}
        </Headline>
        <Description width={750}>{copy.description}</Description>
      </div>
      <div style={{ left: 64, position: "absolute", top: screenshotTop }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(locale, slideId)}
          height={screenshotHeight}
          screenshotPath={screenshotPath}
          width={1152}
        />
      </div>
    </Canvas>
  );
};

const TemporaryWorkspaceLayout = ({
  locale,
  screenshotPath,
}: LayoutProps) => {
  const copy = storeCopy[locale]["temporary-workspace"];

  return (
    <Canvas>
      <div style={{ left: 54, position: "absolute", top: 50 }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(
            locale,
            "temporary-workspace",
          )}
          height={700}
          screenshotPath={screenshotPath}
          width={660}
        />
      </div>
      <div style={{ position: "absolute", right: 64, top: 48 }}>
        <BrandLockup size="large" />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          position: "absolute",
          right: 64,
          top: 250,
          width: 450,
        }}
      >
        <FeatureBadge label="Expiring workspace" />
        <Headline fontSize={52} width={440}>
          {copy.headline}
        </Headline>
        <Description width={420}>{copy.description}</Description>
      </div>
    </Canvas>
  );
};

const LocalBackupLayout = ({ locale, screenshotPath }: LayoutProps) => {
  const copy = storeCopy[locale]["local-backup"];

  return (
    <Canvas>
      <div style={{ left: 64, position: "absolute", top: 48 }}>
        <BrandLockup size="large" />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          left: 64,
          position: "absolute",
          top: 250,
          width: 450,
        }}
      >
        <FeatureBadge label="Encrypted backup" />
        <Headline fontSize={50} width={440}>
          {copy.headline}
        </Headline>
        <Description width={410}>{copy.description}</Description>
      </div>
      <div style={{ position: "absolute", right: 54, top: 65 }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(locale, "local-backup")}
          height={670}
          screenshotPath={screenshotPath}
          width={660}
        />
      </div>
    </Canvas>
  );
};

export const StoreScreenshot = ({
  locale,
  slideId,
  screenshotPath,
}: StoreScreenshotProps) => {
  if (slideId === "search") {
    return <SearchLayout locale={locale} screenshotPath={screenshotPath} />;
  }
  if (slideId === "capture") {
    return (
      <TopLayout
        badgeLabel="Quick capture"
        locale={locale}
        screenshotHeight={575}
        screenshotPath={screenshotPath}
        screenshotTop={175}
        slideId="capture"
      />
    );
  }
  if (slideId === "in-page-search") {
    return (
      <TopLayout
        badgeLabel="In-page search"
        locale={locale}
        screenshotHeight={575}
        screenshotPath={screenshotPath}
        screenshotTop={175}
        slideId="in-page-search"
      />
    );
  }
  if (slideId === "temporary-workspace") {
    return (
      <TemporaryWorkspaceLayout
        locale={locale}
        screenshotPath={screenshotPath}
      />
    );
  }
  return <LocalBackupLayout locale={locale} screenshotPath={screenshotPath} />;
};
