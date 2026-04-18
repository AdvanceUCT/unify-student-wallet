import type { PaymentRecord, StudentCredential, StudentProfile, WalletSummary } from "@/src/lib/api/types";

export const mockStudentProfile: StudentProfile = {
  id: "student-demo-001",
  name: "Demo Student",
  institution: "University of Cape Town",
};

export const mockStudentCredential: StudentCredential = {
  id: "credential-demo-001",
  holderName: mockStudentProfile.name,
  issuer: mockStudentProfile.institution,
  programme: "Bachelor of Business Science",
  status: "Active",
  studentNumber: "VSKCAL001",
  expiresAt: "31 Dec 2026",
};

export const mockWalletSummary: WalletSummary = {
  availableBalance: "R 320.00",
  lastVerification: "Library Cafe",
};

export const mockPaymentHistory: PaymentRecord[] = [
  {
    id: "payment-001",
    amount: "R 42.50",
    status: "Approved",
    vendor: "Library Cafe",
  },
  {
    id: "payment-002",
    amount: "R 18.00",
    status: "Approved",
    vendor: "Campus Shuttle",
  },
  {
    id: "payment-003",
    amount: "R 65.00",
    status: "Pending",
    vendor: "Bookshop",
  },
];
