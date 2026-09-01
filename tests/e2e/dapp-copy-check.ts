import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DappList } from "../../src/components/dapp/dapp-list";
import { DAPPS } from "../../src/lib/dapps";

const html = renderToStaticMarkup(
  React.createElement(DappList, { dapps: DAPPS }),
);

for (const os of ["ios", "android"] as const) {
  assert.equal(
    DAPPS.some((dapp) => dapp.id === "rozo-checkout"),
    true,
    `${os}: checkout dapp missing`,
  );
  assert.equal(
    DAPPS.some((dapp) => "visibleOs" in dapp),
    false,
    `${os}: platform gate still present`,
  );
  assert.equal(
    html.includes("OpenRouter"),
    false,
    `${os}: provider name leaked`,
  );
  assert.equal(html.includes("POS Scan"), true, `${os}: POS Scan missing`);
  assert.equal(
    html.includes("ROZO Checkout"),
    true,
    `${os}: ROZO Checkout missing`,
  );
}

console.log("dapp copy check ok");
