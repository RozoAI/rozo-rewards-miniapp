import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DappList } from "../../src/components/dapp/dapp-list";
import { DAPPS } from "../../src/lib/dapps";

export async function runDappCopyCheck() {
  const html = renderToStaticMarkup(
    React.createElement(DappList, { dapps: DAPPS }),
  );

  assert.equal(DAPPS.some((dapp) => dapp.id === "rozo-checkout"), true);
  assert.equal(DAPPS.some((dapp) => "visibleOs" in dapp), false);
  assert.equal(html.includes("OpenRouter"), false);
  assert.equal(html.includes("POS Scan"), true);
  assert.equal(html.includes("ROZO Agent"), true);

  console.log("dapp copy check ok");
}
