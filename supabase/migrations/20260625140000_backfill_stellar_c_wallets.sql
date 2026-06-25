-- Backfill Stellar C-wallets (Soroban smart-contract addresses) into stellar_address.
--
-- The previous migration (20260625132000) only moved Classic 'G...' addresses out
-- of evm_address. Stellar smart wallets use Soroban contract addresses that start
-- with 'C' and are also 56 chars (StrKey contract encoding). 14 balances and ~140
-- transactions had their C-addresses mislabeled in evm_address, so users paying
-- from a C-wallet could not see their points via ?stellar_address=.
--
-- EVM addresses are '0x...' (42 chars), so a 56-char 'C...' value is unambiguously
-- a Soroban contract address.

BEGIN;

UPDATE points_userbalance
SET    stellar_address = evm_address,
       evm_address     = NULL,
       updated_at      = NOW()
WHERE  evm_address LIKE 'C%'
  AND  length(evm_address) = 56
  AND  stellar_address IS NULL;

UPDATE points_transactions
SET    stellar_address = evm_address,
       evm_address     = NULL
WHERE  evm_address LIKE 'C%'
  AND  length(evm_address) = 56
  AND  stellar_address IS NULL;

COMMIT;
