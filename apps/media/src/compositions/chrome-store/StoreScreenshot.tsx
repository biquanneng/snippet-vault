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
      backgroundColor: mediaTheme.colors.canvas,
      color: mediaTheme.colors.ink,
      fontFamily: mediaTheme.fontFamily,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        backgroundColor: mediaTheme.colors.accent,
        height: 7,
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
      }}
    />
    {children}
  </AbsoluteFill>
);

const Headline = ({
  children,
  fontSize = 56,
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
      fontWeight: 780,
      letterSpacing: "-0.03em",
      lineHeight: 1.02,
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
      fontSize: 21,
      fontWeight: 500,
      lineHeight: 1.42,
      margin: 0,
      maxWidth: width,
      textWrap: "pretty",
    }}
  >
    {children}
  </p>
);

const AccentRule = () => (
  <div
    style={{
      backgroundColor: mediaTheme.colors.accent,
      height: 6,
      width: 72,
    }}
  />
);

const SearchLayout = ({ locale, screenshotPath }: LayoutProps) => {
  const copy = storeCopy[locale].search;

  return (
    <Canvas>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          left: 56,
          padding: "42px 0 58px",
          position: "absolute",
          width: 430,
        }}
      >
        <BrandLockup size="large" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Headline fontSize={64} width={420}>
            {copy.headline}
          </Headline>
          <Description width={390}>{copy.description}</Description>
          <AccentRule />
        </div>
      </div>
      <div style={{ position: "absolute", right: 46, top: 38 }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(locale, "search")}
          height={718}
          screenshotPath={screenshotPath}
          width={622}
        />
      </div>
    </Canvas>
  );
};

const TopLayout = ({
  locale,
  screenshotHeight,
  screenshotPath,
  screenshotTop,
  slideId,
}: LayoutProps & {
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
          left: 56,
          position: "absolute",
          right: 56,
          top: 38,
        }}
      >
        <BrandLockup />
        <span
          style={{
            color: mediaTheme.colors.muted,
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          Chrome extension
        </span>
      </div>
      <div
        style={{
          alignItems: "flex-end",
          display: "flex",
          justifyContent: "space-between",
          left: 56,
          position: "absolute",
          right: 56,
          top: 92,
        }}
      >
        <Headline fontSize={52} width={730}>
          {copy.headline}
        </Headline>
        <Description width={390}>{copy.description}</Description>
      </div>
      <div style={{ left: 56, position: "absolute", top: screenshotTop }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(locale, slideId)}
          height={screenshotHeight}
          screenshotPath={screenshotPath}
          width={1168}
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
      <div style={{ left: 46, position: "absolute", top: 68 }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(
            locale,
            "temporary-workspace",
          )}
          height={650}
          screenshotPath={screenshotPath}
          width={718}
        />
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "48px 0 62px",
          position: "absolute",
          right: 48,
          width: 408,
        }}
      >
        <BrandLockup />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Headline fontSize={58} width={398}>
            {copy.headline}
          </Headline>
          <Description width={375}>{copy.description}</Description>
          <AccentRule />
        </div>
      </div>
    </Canvas>
  );
};

const LocalBackupLayout = ({ locale, screenshotPath }: LayoutProps) => {
  const copy = storeCopy[locale]["local-backup"];

  return (
    <Canvas>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          left: 56,
          padding: "46px 0 62px",
          position: "absolute",
          width: 390,
        }}
      >
        <BrandLockup />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Headline fontSize={58} width={380}>
            {copy.headline}
          </Headline>
          <Description width={350}>{copy.description}</Description>
          <AccentRule />
        </div>
      </div>
      <div style={{ position: "absolute", right: 44, top: 118 }}>
        <ProductScreenshot
          expectedPath={getExpectedScreenshotPath(locale, "local-backup")}
          height={562}
          screenshotPath={screenshotPath}
          width={762}
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
        locale={locale}
        screenshotHeight={570}
        screenshotPath={screenshotPath}
        screenshotTop={190}
        slideId="capture"
      />
    );
  }
  if (slideId === "in-page-search") {
    return (
      <TopLayout
        locale={locale}
        screenshotHeight={510}
        screenshotPath={screenshotPath}
        screenshotTop={220}
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
