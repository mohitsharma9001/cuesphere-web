import { getRegistrationWithPayment } from "@/services/registration-service";
import type { Payment } from "@/types/registration";

/** Payments are recorded by the API as part of registering (see
 * registerForTournamentAction); here they are only read back. */
export async function getPaymentForRegistration(registrationId: string): Promise<Payment | undefined> {
  const doc = await getRegistrationWithPayment(registrationId);
  const payment = doc?.payment as (Omit<Payment, "paymentDate"> & { paymentDate: string | null }) | null | undefined;
  if (!payment) return undefined;
  return {
    id: payment.id,
    registrationId: payment.registrationId,
    clubId: payment.clubId,
    method: payment.method,
    status: payment.status,
    amount: payment.amount,
    paymentId: payment.paymentId ?? null,
    transactionId: payment.transactionId ?? null,
    paymentDate: payment.paymentDate ?? null,
  };
}
