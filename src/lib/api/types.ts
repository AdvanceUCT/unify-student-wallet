export type StudentProfile = {
  id: string;
  name: string;
  institution: string;
};

export type StudentCredential = {
  id: string;
  holderName: string;
  issuer: string;
  programme: string;
  status: "Active" | "Suspended" | "Expired";
  studentNumber: string;
  expiresAt: string;
};

export type WalletSummary = {
  availableBalance: string;
  lastVerification: string;
};

export type PaymentRecord = {
  id: string;
  amount: string;
  status: "Approved" | "Pending" | "Declined";
  vendor: string;
};
