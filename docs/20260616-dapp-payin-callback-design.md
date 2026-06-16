# dApp /payin 回调 —— 让 Stellar 合约支付秒级确认(设计文档)

**日期**: 2026-06-16
**仓库**: rozo-rewards-miniapp(前端 dApp)
**分支**: `feat/dapp-payin-callback`
**状态**: 设计完成,待 codex review → 待实施
**关联后端**: rozo-intents-api 已上线合约 `/payin` 即时快路径(commit `133b51b`);
本文是让该快路径**真正被触发**的前端一环。

---

## 0. 一句话目标

用户在 dApp 里用 Rozo Wallet 付一笔 Stellar 合约支付(`pay()`),拿到 txHash 后,
**前端立刻 `POST /payments/{id}/payin` 把 txHash 告诉后端** → 后端当场解析链上
`payment_event` 并秒级结算,不再等每分钟 cron(实测从 ~32s → 秒级)。

---

## 1. 背景:为什么现在慢

- 合约支付(`pay()` via Soroban)目前**只靠后端 `monitor-stellar` 每分钟 cron 轮询**
  `getEvents` 发现 → 检测耗时 17–42s,最坏 ~60s(抖动,不是固定慢)。
- 后端**已经上线了即时快路径**:只要有人 `POST /payments/{id}/payin` 带 txHash,
  后端就用 Soroban RPC 点查这笔 tx 的 `payment_event`、验证、秒级结算。
- **但当前没有任何客户端调 `/payin`**(后端实测 `immediate_verification` 全 0)→
  快路径能力闲置,所有合约单仍走 cron 慢路径。
- **本仓 dApp 就是真正的支付发起方**,在这里加回调是让快路径生效的最小改动。

> 实证(2026-06-16):真实 ZEN 单 `1d982dc5` 第一次走 cron = 32.3s;同一笔 txHash
> 手动调 /payin → 8.8s 且走快路径(`immediate_verification=true`)。

---

## 2. 现状代码(已查证,带行号)

### 2.1 钱包桥:`window.rozo`
`src/types/window.d.ts` —— native wallet 注入的 provider:
```ts
window.rozo.signAuthEntry(authEntryXdr, { func, submit, message })
  : Promise<{ signedAuthEntry: string; hash: string; status: string; error?: string }>
//                                       ^^^^ ← Stellar txHash 在这里
```

### 2.2 支付链路
| 步骤 | 位置 | 关键 |
|---|---|---|
| 创建 intent | `restaurant-dapp-payment.tsx:108` `createPayment(...)` | 返回 `PaymentResponse`,**含 `id: string`(rozo paymentId UUID)** + `source.{receiverAddress, receiverMemo, amount, receiverAddressContract, receiverMemoContract}` |
| 构建 + 提交 pay() | `useRozoWallet.ts:167-281` `transferUSDC()` | `window.rozo.signAuthEntry(..., {submit:true})` → 返回 `{ hash }` |
| 拿到 txHash | `restaurant-dapp-payment.tsx` `handlePayWithRozoWallet` 的 `if (result.hash) {...}` | **回调插入点** |
| AI 服务同款 | `ai-service-dapp-payment.tsx`(~157-201) | 同样的 `if (result.hash)` 块 |

### 2.3 🔴 关键缺口(本设计的核心改动点)
`generateBridgeAddress()`(`restaurant-dapp-payment.tsx:100-137`)拿到 `payment` 后
**只 return 了 5 个字段,把 `payment.id` 丢弃了**:
```ts
const payment = await createPayment({...});   // payment.id 是 rozo paymentId
return {
  amount: payment.source.amount,
  bridgeAddress: payment.source.receiverAddress,
  memo: payment.source.receiverMemo,
  receiverAddressContract: payment.source.receiverAddressContract,
  receiverMemoContract: payment.source.receiverMemoContract,
  // ❌ payment.id 没透传出来
};
```
=> 要调 `/payments/{id}/payin`,**必须先把 `payment.id` 从 `generateBridgeAddress`
透传到 `handlePayWithRozoWallet`**。这是改动的第一块。

### 2.4 后端接口(rozo-intents-api,已上线)
| | |
|---|---|
| Method/Path | `POST /payments/{paymentId}/payin` |
| Base URL | `https://aozudqtlykbhzbuzalzz.supabase.co/functions/v1/payment-api` |
| Auth | **无需任何 header**(函数 `--no-verify-jwt`) |
| Body | `{ "txHash": "<stellar_tx_hash>", "fromAddress": "<可选>" }` |
| 合约单成功响应 | `{ "message": "Payin registered (contract fast-path)", ... }` |

---

## 3. 设计

### 3.1 数据流(改后)
```
handlePayWithRozoWallet
  ├─ generateBridgeAddress()  → 现在额外返回 paymentId (= payment.id)
  ├─ transferUSDC()           → result.hash (txHash)
  └─ if (result.hash):
       ├─ notifyPayin(paymentId, result.hash)   ← 新增:POST /payin(fire-and-forget,不阻塞 UI)
       ├─ savePaymentReceipt(...)               ← 原有
       ├─ capture(PAYMENT_COMPLETED)            ← 原有
       └─ router.push(/receipt...)              ← 原有
```

### 3.2 新增一个薄 helper:`src/lib/notify-payin.ts`
```ts
// 把 txHash 报给后端,触发合约即时快路径。fire-and-forget:绝不阻塞/打断支付 UI。
const PAYMENT_API_BASE =
  process.env.NEXT_PUBLIC_ROZO_PAYMENT_API ??
  "https://aozudqtlykbhzbuzalzz.supabase.co/functions/v1/payment-api";

export async function notifyPayin(
  paymentId: string,
  txHash: string,
  fromAddress?: string,
): Promise<void> {
  if (!paymentId || !txHash) return;
  try {
    await fetch(`${PAYMENT_API_BASE}/payments/${paymentId}/payin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, fromAddress }),
      keepalive: true, // 让请求在页面跳转(router.push)后仍能完成
    });
  } catch {
    // 后端 cron 是兜底,这里失败不影响支付成功;静默吞掉(不打断用户)
  }
}
```

### 3.3 调用时机(关键 —— 决定能不能命中快路径)

#### 🔴 前端能区分"签完名/已提交" vs "已上链确认"吗?——目前**不能**(实测)
- `transferUSDC` 返回 `TransferResult { hash, status, signedAuthEntry }`(`useRozoWallet.ts:54`)。
- `result.status` 是 native wallet relayer 返回的**裸字符串**(`window.d.ts:48` `status: string`,
  无枚举约束)。`submit:true` 是 **relayer 异步提交**,所以这个 status 通常只代表
  "已提交到 relayer / PENDING",**不可靠地代表链上已确认**。
- **全仓搜索:前端没有任何 `getTransaction` / Soroban RPC 轮询确认上链的代码**;拿到
  `result.hash` 后直接 `router.push` 到 receipt 页。
- => **要真正知道"已上链",前端必须自己加 `getTransaction(hash)` 轮询**(目前没有)。
  - 好消息:`useRozoWallet` 里已经构造了 `server`(Soroban RPC,`getNetworkDetails().sorobanRpcUrl`),
    轮询 `getTransaction` 不需要新依赖。

| 状态 | 前端现在能判断? | 怎么拿 |
|---|---|---|
| 签完名 + 已提交 relayer | ✅ | `result.hash` 有了 |
| 链上已确认(payment_event 已 emit) | ❌ 目前不能 | 需新增 `getTransaction(hash)` 轮询到 SUCCESS |

**`submit:true` 是 gasless relayer 提交,`result.hash` 拿到时交易"已提交"但
**可能还没上链确认**(Soroban 合约 invoke 上链实测 14–37s)。** 两种调法:

- **方案 A(推荐,先做):拿到 hash 立即 fire-and-forget 调一次 /payin。**
  后端对"还没上链"已有兜底:Soroban RPC 点查返回 `NOT_FOUND` → 后端自动排一次 5s
  重试 → 仍不中 → 落 cron。**最小改动,且即使没命中也不会更差**(cron 照常兜底)。
  代价:若上链 >5s(合约常见),这一次 /payin 多半 NOT_FOUND,5s 重试也可能没到,
  实际仍落 cron —— 即"方案 A 单独不够稳"。

- **方案 B(治本,推荐叠加):等链上确认再调 /payin。**
  `signAuthEntry({submit:true})` 后,前端**已经能拿到 hash**,可用 Soroban RPC
  `getTransaction(hash)` 轮询到 `SUCCESS` 再调 /payin → 后端一次命中,稳定秒级。
  - dApp 本就该给用户显示"支付中→已确认",所以这个轮询是顺带的。
  - 但当前代码 `result.hash` 之后**直接 router.push 到 receipt 页**,没有等确认。
    所以方案 B 要么在 receipt 页轮询确认后调,要么在 `if(result.hash)` 里先轮询。

**本设计采用 A 立即调 + (可选)B 增强**:
- v1:先做方案 A(立即 fire-and-forget),零阻塞、零风险地把能力接上。
- v1.1(可选增强):在 `notifyPayin` 内部做"轮询 getTransaction 到 SUCCESS 再 POST,
  最多等 ~40s,带超时",命中率更高。但要确保是后台任务(`keepalive`/不阻塞跳转)。

> ⚠️ 即使方案 A 多数情况落 cron,接上它也是**净收益**:① 部分快交易能命中;
> ② 给后端 immediate_verification 真实流量便于观测;③ 为 v1.1 打底。不接 = 永远 0 命中。

### 3.4 两处插入点对称改
- `restaurant-dapp-payment.tsx`(餐厅返现)
- `ai-service-dapp-payment.tsx`(AI 服务)
两处都:`generateBridgeAddress` 透传 `paymentId` + `if(result.hash)` 里调 `notifyPayin`。

---

## 4. 改动清单(最小)

1. **新增** `src/lib/notify-payin.ts`(§3.2 的 helper)。
2. **改** `restaurant-dapp-payment.tsx`:
   - `generateBridgeAddress` 返回值加 `paymentId: payment.id`。
   - `handlePayWithRozoWallet` 从 `generateBridgeAddress` 解构出 `paymentId`,在
     `if (result.hash)` 块内 `notifyPayin(paymentId, result.hash, rozoWalletAddress)`。
3. **改** `ai-service-dapp-payment.tsx`:同 #2 对称。
4. **(可选)** `.env` 加 `NEXT_PUBLIC_ROZO_PAYMENT_API`(不加则用 helper 里的默认 URL)。

**不改**:`useRozoWallet.transferUSDC`(它只管签名提交,职责单一,不该塞网络回调)。

---

## 5. 风险 / 取舍

| # | 风险 | 处理 |
|---|---|---|
| 1 | /payin 失败/超时**阻塞支付 UI** | fire-and-forget + try/catch 静默 + `keepalive`。支付成功与否**不依赖** /payin;cron 永远兜底 |
| 2 | `result.hash` 时交易未上链 → /payin NOT_FOUND | 后端已有 5s 重试 + cron 兜底(§3.3)。v1.1 加"等确认再调"提命中率 |
| 3 | 跳转 receipt 页打断 fetch | `fetch({keepalive:true})` 让请求在导航后完成 |
| 4 | paymentId 透传漏了某条支路 | 两处插入点都改;`notifyPayin` 对空 paymentId 直接 return,不报错 |
| 5 | 安全:/payin 是公开端点,前端不带 secret | 设计上**就是**无 header(后端 `--no-verify-jwt`);txHash 是公开链上数据;后端按 memo 一对一 + 链上校验,前端只是"提示后端去查",伪造无收益 |
| 6 | CORS | 后端是 public Edge Function(已被各端调用),CORS 允许;实施时验证浏览器直连不被拦 |

> **资金安全**:前端不做任何金额/校验判断,只把 txHash 转给后端。后端 `settleContractPayin`
> 做全部资金校验(contractId allowlist + topic + 官方 USDC + memo 一对一 + 金额闸门 + CAS)。
> 前端报错 txHash 顶多让后端查一笔不匹配的 tx → 后端拒绝 → 无副作用。

---

## 6. 验证计划

1. **本地编译**:`npm run build`(或 `tsc --noEmit`)通过,类型不破坏。
2. **本地 dApp 流程**:dApp 走一笔(或 mock `window.rozo`),断言 `notifyPayin` 被调、
   URL/body 正确(`/payments/{真实 paymentId}/payin` + `{txHash}`)。
3. **端到端(碰链)**:真实付一笔 → 用后端 check 脚本确认走快路径:
   ```bash
   node <rozo-intents-api>/scripts/check-contract-payin.mjs <paymentId>
   # 期望:✅ FAST-PATH(immediate_verification=true),而不是 🐢 CRON
   ```
4. **对比**:接入前后同类单的检测耗时(cron ~17-42s vs 快路径秒级)。

---

## 7. 待 codex review 的点

- 调用时机:方案 A(立即)vs A+B(等确认)——v1 先做哪个?
- `notifyPayin` 放 `src/lib/` 还是 `src/hooks/`?是否该用现有 api client 封装(若有)?
- `keepalive` + router.push 的竞态:fetch 会不会被导航 abort?是否要在 push 前 await 一个极短 flush?
- 两个支付组件是否还有第三处合约支付入口(全仓再确认有没有遗漏的 `result.hash` 点)?
- paymentId 透传:除了 return 值,是否有更稳的方式(比如 generateBridgeAddress 返回整个 payment 对象)?

---

## 附:相关
- 后端设计:`rozo-intents-api/internaldocs/20260615-stellar-contract-payin-instant-fastpath.md`
- 后端 commit:`133b51b feat(stellar-contract): instant /payin fast-path`
- 前端对接示例:`rozo-intents-api/scripts/payin-callback-example.md`
- know-how 汇总:`~/workspace/rozo/todos/20260616-ROZO-slowwallet-todo.md`
