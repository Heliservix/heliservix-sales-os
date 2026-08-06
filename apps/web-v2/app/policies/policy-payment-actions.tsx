"use client";

import { markPaymentPaid, deletePolicyPayment } from "@/app/policies/actions";

export function PolicyPaymentActions({ paymentId, status }: { paymentId: string; status: string }) {
  const boundMarkPaid = markPaymentPaid.bind(null, paymentId);
  const boundDelete = deletePolicyPayment.bind(null, paymentId);

  return (
    <div className="flex items-center gap-1.5">
      {status !== "Paid" ? (
        <form action={boundMarkPaid}>
          <button className="hsv-ghost-button !px-2 !py-1 text-xs" type="submit">
            Marcar pagado
          </button>
        </form>
      ) : null}
      <form
        action={boundDelete}
        onSubmit={(event) => {
          if (!window.confirm("¿Eliminar este pago del calendario de la póliza?")) event.preventDefault();
        }}
      >
        <button className="hsv-danger-button !px-2 !py-1 text-xs" type="submit">
          Eliminar
        </button>
      </form>
    </div>
  );
}
