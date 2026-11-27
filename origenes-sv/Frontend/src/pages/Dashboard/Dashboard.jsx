import { useEffect, useState } from "react";
import { Alert, Spinner } from "reactstrap";
import { api, formatMoney } from "../api.js";
import { useWorkspace } from "../App.jsx";
import "./Dashboard.css";

const metrics = [
  { key: "todayRevenue", label: "Ventas de hoy", format: formatMoney },
  { key: "todayOrders", label: "Pedidos completados", format: (value) => value },
  { key: "lowStockCount", label: "Alertas inventario", format: (value) => value },
  { key: "outstandingPayables", label: "Cuentas por pagar", format: formatMoney }
];

export default function Dashboard() {
  const { branchId } = useWorkspace();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSummary(null);
    setError("");
    api(`/dashboard?branchId=${branchId}`)
      .then(setSummary)
      .catch((requestError) => setError(requestError.message));
  }, [branchId]);

  const isCashOpen = Boolean(summary?.cashShift);

  return (
    <div className="dash-page">
      <header className="dash-header">
        <h1 className="dash-title">Panel de control</h1>
        <div className="dash-divider" />
      </header>

      {error && <Alert color="danger">{error}</Alert>}

      {!summary && !error && (
        <div className="dash-loading">
          <Spinner style={{ color: "#287271" }} />
        </div>
      )}

      {summary && (
        <>
          <div className="dash-status-pill-wrap">
            <div className={`dash-pill-outer ${isCashOpen ? "is-open" : "is-closed"}`}>
              <span className="dash-pill-inner">
                {isCashOpen ? "CAJA ABIERTA" : "CAJA CERRADA"}
              </span>
            </div>
          </div>

          <section className="dash-metrics-grid">
            {metrics.map((metric) => (
              <div className="dash-metric-card" key={metric.key}>
                <div className="dash-metric-heading">{metric.label}</div>
                <div className="dash-metric-divider" />
                <div className="dash-metric-box">
                  <span>{metric.format(summary[metric.key])}</span>
                </div>
              </div>
            ))}
          </section>

          <section className="dash-bottom-grid">
            <div className="dash-shift-card">
              <div className="dash-shift-heading">Inicio de turno</div>
              <div className="dash-shift-divider" />
              <div className="dash-shift-box">
                {isCashOpen ? (
                  <>
                    <p className="dash-shift-lead">LA CAJA ESTÁ ABIERTA</p>
                    <p className="dash-shift-copy">
                      EL EQUIPO PUEDE REGISTRAR PEDIDOS Y PAGOS EN LA SUCURSAL ACTIVA.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="dash-shift-lead">LA CAJA ESTA CERRADA</p>
                    <p className="dash-shift-copy">
                      ABRE UN TURNO DESDE “CAJA Y TURNOS” ANTES DE REALIZAR VENTAS.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}