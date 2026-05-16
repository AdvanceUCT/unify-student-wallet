export type CredentialAttribute = {
  name: string;
  value: string;
};

export type StoredCredential = {
  id: string;
  state?: string;
  connectionId?: string;
  connectionLabel?: string;
  credentialAttributes?: CredentialAttribute[];
};

export type WalletSummary = {
  availableBalance: string;
  lastVerification: string;
} | null;

export type PaymentRecord = {
  id: string;
  amount: string;
  status: "Approved" | "Pending" | "Declined";
  vendor: string;
};
