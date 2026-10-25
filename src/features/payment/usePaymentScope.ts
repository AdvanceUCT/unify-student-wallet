import { useSyncExternalStore } from "react";
import { getPaymentScope, subscribePaymentScope } from "./paymentScope";
export function usePaymentScope() { return useSyncExternalStore(subscribePaymentScope, getPaymentScope, getPaymentScope); }
