# Checkout recovery and receipts

This increment groups wallet work for AD-224 (unlock resume), AD-225 (interrupted checkout) and AD-227 (receipt recovery), coordinated with portal/POS AD-212, AD-215, AD-216, AD-217 and AD-220. OTP onboarding, activation and refund execution are not changed.

Prepared POS checkout uses `CheckoutController`, `CheckoutScreen` and a versioned secure-storage record. The record preserves request/QR reference, original idempotency key, integer-cent terms, submission phase and the opaque authenticated payment account ID. It is written before transmitting approval. Another account cannot resume a submitted checkout. Repeated taps are blocked and lifecycle events only query UNIFY.

Screens distinguish review, submitting, unknown outcome, confirmed, cancelled, expired and another payer's already-paid sale. Foreground, reconnect, process recreation and payment login trigger authoritative recovery before enabling another submission. `NOT_RECORDED` means no completed receipt is currently visible; it does not prove that an in-flight submission failed. Explicit retry always uses the same key/terms. Unknown outcomes block replacement checkout and leaving the saved checkout.

Completed receipts are payer-only server records. Confirmed payment clears pending state and refreshes balance/activity. Completed spend rows in the activity feed reopen receipts from `/api/wallet/v1/payments/{transactionId}/receipt`. Route parameters contain a transaction locator; they cannot manufacture a receipt. Explicit sign-out continues clearing pending local state.

Migration preserves every old POS request ID and key. Old submitted records lack an account binding: they can recover an existing payer receipt or terminal sale outcome, but an unrecorded legacy submission cannot safely be assigned to a new account and resubmitted. No new key is generated to work around that uncertainty.

Deploy additive portal APIs/migration before this APK. Automated lint, typecheck, tests and Expo builds run in CI, including both flows, process recreation, account switching, foreground/reconnect, expired authentication, failed secure writes and cancelled/expired/other-payer sales. Build the signed phone-only release on Windows using the existing keystore, verify its certificate against portal asset links, and preserve native signing/CreDo/Askar patches. EC2 hosts only the agent backend.

Phone acceptance remains pending: scan while locked → unlock → review → approve → compare wallet/POS/portal receipts; repeat interrupted-response recovery with one debit for POS checkout, reopen receipts from activity and demonstrate cancellation/expiry. The coordinated merchant callback demo and full API contract are in [portal documentation](https://github.com/AdvanceUCT/unify-admin-portal/blob/feature/checkout-reliability/docs/checkout-reliability.md).

## POS-only continuation — 30 September 2026

Static payment scanning, amount entry and submission are retired. Old static deep links show guidance to request a POS sale QR. Submitted legacy references remain read-only receipt recovery; they cannot be retried. Verification QR codes and transaction history are retained.

Physical tests passed on the prior reliability APK: locked scan/login/review/receipt reopening; interrupted response recovery with one debit; insufficient funds rejected with the sale pending and balance unchanged. The POS confirms cancellation. Second-account phone checks remain pending by user instruction. Repeat core acceptance on the new release after installation.
