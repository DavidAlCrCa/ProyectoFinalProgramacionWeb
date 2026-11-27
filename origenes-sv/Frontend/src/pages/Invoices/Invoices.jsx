import { useEffect, useMemo, useState } from "react";
import {
  Alert, Badge, Button, Card, CardBody, Col, Form, FormGroup, Input, Label,
  Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner, Table
} from "reactstrap";
import { api, formatDateTime, formatMoney } from "../../api/api.js";
import { useWorkspace } from "../../context/WorkspaceContext.js";

const documentLabels = { CONSUMER_FINAL: "Consumidor final", CCF: "CCF" };
const paymentLabels = { CASH: "Efectivo", CARD: "Tarjeta", BITCOIN: "Bitcoin", CHIVO: "Chivo Wallet" };
const emptyFilters = { documentType: "", from: "", to: "", search: "" };

export default function Invoices() {
  const { branchId } = useWorkspace();
  const [invoices, setInvoices] = useState([]);
  const [draft, setDraft] = useState(emptyFilters);     // lo que el usuario escribe
  const [filters, setFilters] = useState(emptyFilters); // lo que se envía a la API al pulsar "Filtrar"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  // Carga el listado cada vez que cambia la sucursal o se aplican filtros.
  useEffect(() => {
    let cancelled = false; // evita pintar una respuesta vieja si el usuario ya cambió de filtro
    const params = new URLSearchParams({ branchId });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    setLoading(true);
    setError("");
    api(`/invoices?${params}`)
      .then((rows) => { if (!cancelled) setInvoices(rows); })
      .catch((requestError) => { if (!cancelled) setError(requestError.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [branchId, filters]);

  // Resumen del listado filtrado.
  const summary = useMemo(() => invoices.reduce(
    (acc, invoice) => ({
      count: acc.count + 1,
      tax: acc.tax + Number(invoice.tax),
      total: acc.total + Number(invoice.total)
    }),
    { count: 0, tax: 0, total: 0 }
  ), [invoices]);

  function applyFilters(event) {
    event.preventDefault();
    setFilters(draft);
  }

  function clearFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
  }

  async function openInvoice(invoiceId) {
    setError("");
    try {
      setSelected(await api(`/invoices/${invoiceId}`));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div>
      <div className="page-heading"><div><p className="eyebrow">VENTAS</p><h1>Facturas emitidas</h1>
        <p>Consulta, busca e imprime los comprobantes generados en el punto de venta.</p></div></div>
      {error && <Alert color="danger" toggle={() => setError("")}>{error}</Alert>}

      <Card className="surface-card mb-3"><CardBody>
        <Form onSubmit={applyFilters}>
          <Row className="g-2 align-items-end">
            <Col md="3"><FormGroup className="mb-0"><Label for="filterSearch">Buscar</Label>
              <Input id="filterSearch" value={draft.search} placeholder="N.º, cliente, NIT o NRC" maxLength="100"
                onChange={(event) => setDraft({ ...draft, search: event.target.value })} /></FormGroup></Col>
            <Col md="3"><FormGroup className="mb-0"><Label for="filterType">Tipo</Label>
              <Input id="filterType" type="select" value={draft.documentType}
                onChange={(event) => setDraft({ ...draft, documentType: event.target.value })}>
                <option value="">Todos</option>
                <option value="CONSUMER_FINAL">Consumidor final</option>
                <option value="CCF">Crédito fiscal (CCF)</option>
              </Input></FormGroup></Col>
            <Col md="2"><FormGroup className="mb-0"><Label for="filterFrom">Desde</Label>
              <Input id="filterFrom" type="date" value={draft.from}
                onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></FormGroup></Col>
            <Col md="2"><FormGroup className="mb-0"><Label for="filterTo">Hasta</Label>
              <Input id="filterTo" type="date" value={draft.to}
                onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></FormGroup></Col>
            <Col md="2" className="d-flex gap-2">
              <Button color="success" className="flex-fill">Filtrar</Button>
              <Button type="button" color="light" onClick={clearFilters}>Limpiar</Button>
            </Col>
          </Row>
        </Form>
      </CardBody></Card>

      <Card className="surface-card"><CardBody>
        <div className="invoice-summary">
          <span><strong>{summary.count}</strong> comprobantes</span>
          <span>IVA <strong>{formatMoney(summary.tax)}</strong></span>
          <span>Total <strong>{formatMoney(summary.total)}</strong></span>
          {summary.count === 200 && <span>Se muestran los 200 más recientes; use los filtros para acotar.</span>}
        </div>
        {loading ? <Spinner color="success" /> : (
          <div className="table-responsive"><Table hover className="data-table align-middle mb-0">
            <thead><tr><th>N.º comprobante</th><th>Fecha</th><th>Tipo</th><th>Cliente</th>
              <th>Pago</th><th>Cajero</th><th className="text-end">Total</th><th></th></tr></thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="table-primary">{invoice.invoiceNumber}</td>
                  <td>{formatDateTime(invoice.createdAt)}</td>
                  <td><Badge color={invoice.documentType === "CCF" ? "success" : "secondary"}>
                    {documentLabels[invoice.documentType]}</Badge></td>
                  <td>{invoice.customerName
                    ? <>{invoice.customerName}<br /><small className="muted">NIT {invoice.customerNit}</small></>
                    : <span className="muted">Consumidor final</span>}</td>
                  <td>{paymentLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</td>
                  <td>{invoice.cashier}</td>
                  <td className="text-end"><strong>{formatMoney(invoice.total)}</strong></td>
                  <td className="text-end"><Button size="sm" color="success" outline
                    onClick={() => openInvoice(invoice.id)}>Ver</Button></td>
                </tr>
              ))}
              {!invoices.length && <tr><td colSpan="8" className="text-center muted py-3">
                No hay facturas con esos filtros.</td></tr>}
            </tbody>
          </Table></div>
        )}
      </CardBody></Card>

      <Modal isOpen={Boolean(selected)} toggle={() => setSelected(null)} size="lg" scrollable>
        <ModalHeader toggle={() => setSelected(null)}>Comprobante {selected?.invoiceNumber}</ModalHeader>
        {selected && (
          <>
            <ModalBody>
              <div className="invoice-print">
                <h2 className="section-title">Restaurante Orígenes SV</h2>
                <p className="muted mb-2">{selected.branch} · {formatDateTime(selected.createdAt)}</p>
                <p><Badge color={selected.documentType === "CCF" ? "success" : "secondary"}>
                  {documentLabels[selected.documentType]}</Badge> <strong>{selected.invoiceNumber}</strong>
                  <span className="muted"> · {paymentLabels[selected.paymentMethod]} · Cajero: {selected.cashier}</span></p>
                {selected.customerName && (
                  <div className="invoice-customer">
                    <strong>{selected.customerName}</strong><br />
                    NIT {selected.customerNit} · NRC {selected.customerNrc}
                  </div>
                )}
                <Table className="data-table align-middle">
                  <thead><tr><th>Producto</th><th className="text-end">Cant.</th>
                    <th className="text-end">P. unitario</th><th className="text-end">Total</th></tr></thead>
                  <tbody>{selected.items.map((item, index) => (
                    <tr key={index}><td>{item.productName}</td><td className="text-end">{item.quantity}</td>
                      <td className="text-end">{formatMoney(item.unitPrice)}</td>
                      <td className="text-end">{formatMoney(item.lineTotal)}</td></tr>
                  ))}</tbody>
                </Table>
                <div className="invoice-totals">
                  <div><span>Subtotal</span><span>{formatMoney(selected.subtotal)}</span></div>
                  <div><span>IVA (13%)</span><span>{formatMoney(selected.tax)}</span></div>
                  <div><strong>Total</strong><strong>{formatMoney(selected.total)}</strong></div>
                </div>
                <small className="muted d-block mt-3">Comprobante interno del prototipo; no es un Documento Tributario Electrónico autorizado.</small>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="success" outline onClick={() => window.print()}>Imprimir</Button>
              <Button color="secondary" onClick={() => setSelected(null)}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
