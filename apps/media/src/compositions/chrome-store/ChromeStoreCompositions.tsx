/* SPDX-License-Identifier: MPL-2.0 */

import { Folder, Still } from "remotion";
import { StoreContactSheet } from "./StoreContactSheet";
import { StoreMarqueePromo, StoreSmallPromo } from "./StorePromoImages";
import { StoreScreenshot } from "./StoreScreenshot";

export const ChromeStoreCompositions = () => (
  <Folder name="Chrome-Store">
    <Folder name="Promotional-Images">
      <Still
        id="Store-SmallPromo"
        component={StoreSmallPromo}
        width={440}
        height={280}
      />
      <Still
        id="Store-MarqueePromo"
        component={StoreMarqueePromo}
        width={1400}
        height={560}
      />
    </Folder>
    <Folder name="English">
      <Still
        id="Store-EN-01-Search"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "en", slideId: "search", screenshotPath: null }}
      />
      <Still
        id="Store-EN-02-Capture"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "en", slideId: "capture", screenshotPath: null }}
      />
      <Still
        id="Store-EN-03-InPageSearch"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "en", slideId: "in-page-search", screenshotPath: null }}
      />
      <Still
        id="Store-EN-04-TemporaryWorkspace"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "en", slideId: "temporary-workspace", screenshotPath: null }}
      />
      <Still
        id="Store-EN-05-LocalBackup"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "en", slideId: "local-backup", screenshotPath: null }}
      />
      <Still
        id="Store-EN-ContactSheet"
        component={StoreContactSheet}
        width={1920}
        height={900}
        defaultProps={{
          locale: "en",
          screenshotPaths: {
            search: null,
            capture: null,
            "in-page-search": null,
            "temporary-workspace": null,
            "local-backup": null,
          },
        }}
      />
    </Folder>

    <Folder name="Simplified-Chinese">
      <Still
        id="Store-ZH-01-Search"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "zh-CN", slideId: "search", screenshotPath: null }}
      />
      <Still
        id="Store-ZH-02-Capture"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "zh-CN", slideId: "capture", screenshotPath: null }}
      />
      <Still
        id="Store-ZH-03-InPageSearch"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "zh-CN", slideId: "in-page-search", screenshotPath: null }}
      />
      <Still
        id="Store-ZH-04-TemporaryWorkspace"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "zh-CN", slideId: "temporary-workspace", screenshotPath: null }}
      />
      <Still
        id="Store-ZH-05-LocalBackup"
        component={StoreScreenshot}
        width={1280}
        height={800}
        defaultProps={{ locale: "zh-CN", slideId: "local-backup", screenshotPath: null }}
      />
      <Still
        id="Store-ZH-ContactSheet"
        component={StoreContactSheet}
        width={1920}
        height={900}
        defaultProps={{
          locale: "zh-CN",
          screenshotPaths: {
            search: null,
            capture: null,
            "in-page-search": null,
            "temporary-workspace": null,
            "local-backup": null,
          },
        }}
      />
    </Folder>
  </Folder>
);
