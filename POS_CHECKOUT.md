# POS wallet checkout

The wallet handles `unifywallet://pay-request/{id}` separately from static payment and verification links. It saves the opaque request reference and submission key in payment-specific secure storage, resumes through wallet unlock/payment activation, fetches fixed terms from UNIFY and requires explicit approval.

Before another submission, the wallet resolves authoritative state. Unknown network outcomes retain the original key. Completed receipts are recovered through a payer-only endpoint; balance/activity refresh only after confirmation. Static QR checkout remains supported.

Release validation runs on EC2, not the local workstation. The release script builds phone ARM architectures only and preserves existing native patches/signing. Use configured public production endpoints and the existing release certificate. Never commit signing values or keystores.

Physical acceptance still requires: scan a prepared POS sale; unlock/activate; review total and order reference; approve; match POS and portal transaction; recover an interrupted response without a second debit. Also verify cancelled/expired requests, insufficient funds/topup and the existing static QR flow. These changes support AD-218/219; they do not complete the broader AD-224/225/227 stories.
