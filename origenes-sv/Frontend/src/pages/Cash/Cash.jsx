import { useEffect, useState } from "react";
import { Alert, Form, FormGroup, Input, Label, Spinner } from "reactstrap";
import { api, formatMoney, formatDate } from "../api.js";
import { useWorkspace } from "../App.jsx";
import "./Cash.css";

const paymentFields = [
  ["countedCash", "Efectivo contado"],
  ["countedCard", "Tarjetas"],
  ["countedBitcoin", "Bitcoin"],
  ["countedChivo", "Chivo Wallet"]
];

export default function Cash() {
  const { branchId } = useWorkspace();
  const [status, setStatus] = useState(null);
  const [openingAmount, setOpeningAmount] = useState("");
  const [counts, setCounts] = useState({
    countedCash: "0",
    countedCard: "0",
    countedBitcoin: "0",
    countedChivo: "0"
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function refresh() {
    const data = await api(`/cash/status?branchId=${branchId}`);
    setStatus(data);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    refresh()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [branchId]);

  async function openShift(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/cash/open", {
        method: "POST",
        body: { branchId, openingAmount: Number(openingAmount) }
      });
      setOpeningAmount("");
      setResult(null);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function closeShift(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const closeResult = await api("/cash/close", {
        method: "POST",
        body: {
          branchId,
          countedCash: Number(counts.countedCash),
          countedCard: Number(counts.countedCard),
          countedBitcoin: Number(counts.countedBitcoin),
          countedChivo: Number(counts.countedChivo)
        }
      });
      setResult(closeResult);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const shift = status?.shift;
  const totals = status?.totals || {};
  const expectedCash = Number(shift?.openingAmount || 0) + Number(totals.CASH || 0);
  const expected = {
    countedCash: expectedCash,
    countedCard: Number(totals.CARD || 0),
    countedBitcoin: Number(totals.BITCOIN || 0),
    countedChivo: Number(totals.CHIVO || 0)
  };

  return (
    <div className="cash-page">
      <header className="cash-header">
        <h1 className="cash-title">Caja y turnos</h1>
        <div className="cash-divider" />
      </header>

      {error && <Alert color="danger">{error}</Alert>}

      {result && (
        <Alert
          color={
            Object.values(result.differences).some((amount) => Math.abs(amount) > 0.009)
              ? "warning"
              : "success"
          }
          toggle={() => setResult(null)}
        >
          <div>
            Turno cerrado. Diferencia neta: <strong>{formatMoney(result.difference)}</strong>.
          </div>
          <small>
            Desglose — efectivo {formatMoney(result.differences.CASH)}, tarjeta{" "}
            {formatMoney(result.differences.CARD)}, Bitcoin{" "}
            {formatMoney(result.differences.BITCOIN)}, Chivo{" "}
            {formatMoney(result.differences.CHIVO)}.
          </small>
        </Alert>
      )}

      {loading ? (
        <div className="cash-loading">
          <Spinner style={{ color: "#287271" }} />
        </div>
      ) : (
        <>
          <div className="cash-status-wrap">
            <div className={`cash-pill-outer ${shift ? "is-open" : "is-closed"}`}>
              <span className="cash-pill-inner">
                {shift ? "CAJA ABIERTA" : "CAJA CERRADA"}
              </span>
            </div>
          </div>

          <section className="cash-grid">
            {/* COLUMNA IZQUIERDA: TURNO ACTUAL / ABRIR TURNO */}
            <div className="cash-card-sand">
              <div className="cash-card-heading">Turno actual</div>
              <div className="cash-card-divider" />

              {shift ? (
                <>
                  <div className="cash-meta-row">
                    <span>Abierta</span>
                    <strong>{formatDate(shift.openedAt)}</strong>
                  </div>
                  <div className="cash-meta-row">
                    <span>Fondo inicial</span>
                    <strong>{formatMoney(shift.openingAmount)}</strong>
                  </div>

                  <div className="cash-payments-list">
                    {[
                      ["Efectivo vendido", totals.CASH],
                      ["Tarjetas", totals.CARD],
                      ["Bitcoin", totals.BITCOIN],
                      ["Chivo Wallet", totals.CHIVO]
                    ].map(([label, amount]) => (
                      <div className="cash-payment-item" key={label}>
                        <span>{label}</span>
                        <div className="cash-value-box">{formatMoney(amount)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="cash-note-box">
                    Efectivo esperado: <strong>{formatMoney(expectedCash)}</strong>. Los demás
                    saldos se cuadran individualmente.
                  </div>
                </>
              ) : (
                <Form onSubmit={openShift} className="cash-open-form">
                  <FormGroup>
                    <Label for="openingAmount" className="cash-label">
                      Fondo inicial de efectivo
                    </Label>
                    <Input
                      id="openingAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="cash-input"
                      value={openingAmount}
                      onChange={(event) => setOpeningAmount(event.target.value)}
                      required
                    />
                  </FormGroup>
                  <button type="submit" className="cash-btn-primary" disabled={busy}>
                    {busy ? <Spinner size="sm" /> : "Abrir turno"}
                  </button>
                </Form>
              )}
            </div>

            {/* COLUMNA DERECHA: CIERRE DE TURNO / CUADRATURA */}
            {shift ? (
              <div className="cash-card-terracotta">
                <div className="cash-card-heading">Cierre de turno · Cuadratura</div>
                <div className="cash-card-divider" />

                <Form onSubmit={closeShift}>
                  <div className="cash-close-grid">
                    {paymentFields.map(([key, label]) => (
                      <FormGroup key={key} className="cash-close-field">
                        <Label for={key} className="cash-label">
                          {label}
                        </Label>
                        <Input
                          id={key}
                          type="number"
                          min="0"
                          step="0.01"
                          className="cash-input"
                          value={counts[key]}
                          onChange={(event) =>
                            setCounts((current) => ({ ...current, [key]: event.target.value }))
                          }
                          required
                        />
                        <small className="cash-expected">
                          Esperado: {formatMoney(expected[key])}
                        </small>
                      </FormGroup>
                    ))}
                  </div>

                  <button type="submit" className="cash-btn-dark" disabled={busy}>
                    {busy ? <Spinner size="sm" /> : "Cerrar turno y guardar diferencias"}
                  </button>
                </Form>
              </div>
            ) : (
              <div className="cash-card-terracotta">
                <div className="cash-card-heading">Cuadratura</div>
                <div className="cash-card-divider" />
                <div className="cash-info-box">
                  <p className="cash-info-lead">CADA MEDIO, POR SEPARADO.</p>
                  <p className="cash-info-copy">
                    EL CIERRE COMPARA EFECTIVO, TARJETA, BITCOIN Y CHIVO WALLET CON LOS PAGOS DE
                    LAS VENTAS REGISTRADAS DURANTE EL TURNO.
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}