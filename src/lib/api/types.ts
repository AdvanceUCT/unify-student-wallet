export type StudentProfile = {
  id: string;
  name: string;
  institution: string;
};

export type CredentialLifecycleState =
  | "Pending"
  | "Issuing"
  | "Offered"
  | "Active"
  | "Suspended"
  | "Revoked"
  | "Expired"
  | "Renewed";

export type StudentCredential = {
  id: string;
  holderName: string;
  issuer: string;
  faculty: string;
  programme: string;
  enrolmentStatus: "Registered" | "Suspended" | "Withdrawn" | "Graduated";
  lifecycleState: CredentialLifecycleState;
  studentNumber: string;
  validFrom: string;
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
