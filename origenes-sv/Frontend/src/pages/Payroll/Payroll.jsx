import { useEffect, useState } from "react";
import {
  Alert, Button, Card, CardBody, Col, Form, FormGroup, Input, Label, Row, Spinner, Table
} from "reactstrap";
import { api, formatDate, formatMoney } from "../../api/api.js";
import { useWorkspace } from "../../context/WorkspaceContext.js";

function dateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currentFortnight() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (now.getDate() <= 15) {
    return { start: dateInput(new Date(year, month, 1)), end: dateInput(new Date(year, month, 15)) };
  }
  return { start: dateInput(new Date(year, month, 16)), end: dateInput(new Date(year, month + 1, 0)) };
}

export default function Payroll() {
  const { branchId, user } = useWorkspace();
  const canEdit = ["ADMIN", "MANAGER"].includes(user?.role); // el API también lo exige (requireManager)
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [editingId, setEditingId] = useState(null); // null = formulario en modo "nuevo empleado"
  const [period, setPeriod] = useState(currentFortnight);
  const [employee, setEmployee] = useState({ fullName: "", position: "", monthlySalary: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [generated, setGenerated] = useState(null);

  async function loadData() {
    const [employeeList, payrollList] = await Promise.all([
      api(`/employees?branchId=${branchId}`),
      canEdit ? api("/payroll") : Promise.resolve([])
    ]);
    setEmployees(employeeList);
    setRuns(payrollList);
  }

  useEffect(() => {
    setLoading(true);
    setError("");
    loadData()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [branchId]);

  function resetForm() {
    setEditingId(null);
    setEmployee({ fullName: "", position: "", monthlySalary: "" });
  }

  // Carga al empleado en el formulario para editarlo.
  function startEdit(item) {
    setEditingId(item.id);
    setEmployee({ fullName: item.fullName, position: item.position, monthlySalary: String(item.monthlySalary) });
    setError("");
    setMessage("");
  }

  // Un mismo formulario sirve para crear (POST) y para editar (PUT).
  async function saveEmployee(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const body = { ...employee, monthlySalary: Number(employee.monthlySalary) };
      if (editingId) {
        await api(`/employees/${editingId}`, { method: "PUT", body });
      } else {
        await api("/employees", { method: "POST", body: { ...body, branchId } });
      }
      setMessage(editingId ? "Empleado actualizado correctamente." : "Empleado registrado correctamente.");
      resetForm();
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  // Desactiva (no borra): conserva el historial de planillas.
  async function deactivateEmployee(item) {
    const confirmed = window.confirm(
      `¿Desactivar a "${item.fullName}"? Dejará de aparecer y no se incluirá en nuevas planillas. Las planillas anteriores se conservan.`
    );
    if (!confirmed) return;
    setError("");
    setMessage("");
    try {
      await api(`/employees/${item.id}`, { method: "DELETE" });
      if (editingId === item.id) resetForm();
      setMessage("Empleado desactivado.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function generatePayroll(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setGenerated(null);
    try {
      const payroll = await api("/payroll", {
        method: "POST",
        body: { branchId, periodStart: period.start, periodEnd: period.end }
      });
      setGenerated(payroll);
      setMessage(`Planilla quincenal generada para ${payroll.lines.length} colaboradores.`);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-heading"><div><p className="eyebrow">EQUIPO</p><h1>Personal y nómina</h1>
        <p>Administra el equipo y calcula planillas quincenales.</p></div></div>
      {error && <Alert color="danger">{error}</Alert>}
      {message && <Alert color="success" toggle={() => setMessage("")}>{message}</Alert>}
      <Row className="g-3 align-items-start">
        <Col xl="5">
          {canEdit && <Card className="surface-card mb-3"><CardBody>
            <p className="eyebrow">{editingId ? "EDITAR COLABORADOR" : "NUEVO COLABORADOR"}</p>
            <h2 className="section-title">{editingId ? "Actualizar empleado" : "Registrar empleado"}</h2>
            <Form onSubmit={saveEmployee}>
              <FormGroup><Label for="fullName">Nombre completo</Label>
                <Input id="fullName" value={employee.fullName} onChange={(event) => setEmployee({ ...employee, fullName: event.target.value })} required minLength="2" maxLength="160" /></FormGroup>
              <FormGroup><Label for="position">Puesto</Label>
                <Input id="position" value={employee.position} onChange={(event) => setEmployee({ ...employee, position: event.target.value })} required minLength="2" maxLength="100" placeholder="Barista, cajero, gerente…" /></FormGroup>
              <FormGroup><Label for="salary">Salario mensual (USD)</Label>
                <Input id="salary" type="number" min="0.01" step="0.01" value={employee.monthlySalary} onChange={(event) => setEmployee({ ...employee, monthlySalary: event.target.value })} required /></FormGroup>
              <Button color="success" className="w-100" disabled={busy}>
                {busy ? <Spinner size="sm" /> : (editingId ? "Guardar cambios" : "Guardar empleado")}</Button>
              {editingId && <Button type="button" color="light" className="w-100 mt-2" onClick={resetForm}>Cancelar edición</Button>}
            </Form>
          </CardBody></Card>}
          {canEdit && <Card className="surface-card"><CardBody>
            <p className="eyebrow">NÓMINA</p><h2 className="section-title">Generar quincena</h2>
            <Form onSubmit={generatePayroll}>
              <Row className="g-2">
                <Col xs="6"><FormGroup><Label for="periodStart">Desde</Label>
                  <Input id="periodStart" type="date" value={period.start} onChange={(event) => setPeriod({ ...period, start: event.target.value })} required /></FormGroup></Col>
                <Col xs="6"><FormGroup><Label for="periodEnd">Hasta</Label>
                  <Input id="periodEnd" type="date" value={period.end} onChange={(event) => setPeriod({ ...period, end: event.target.value })} required /></FormGroup></Col>
              </Row>
              <Button color="dark" className="w-100" disabled={busy || !employees.length}>
                {busy ? <Spinner size="sm" /> : "Calcular planilla"}
              </Button>
              {!employees.length && <small className="muted d-block mt-2">Primero registra al menos un empleado activo.</small>}
            </Form>
          </CardBody></Card>}
        </Col>
        <Col xl="7">
          <Card className="surface-card mb-3"><CardBody>
            <p className="eyebrow">PERSONAL ACTIVO</p><h2 className="section-title">{employees.length} colaboradores</h2>
            {loading ? <Spinner color="success" /> : (
              <div className="table-responsive"><Table hover className="data-table align-middle mb-0">
                <thead><tr><th>Nombre</th><th>Puesto</th><th>Salario mensual</th>{canEdit && <th></th>}</tr></thead>
                <tbody>{employees.map((item) => <tr key={item.id}><td className="table-primary">{item.fullName}</td>
                  <td>{item.position}</td><td>{formatMoney(item.monthlySalary)}</td>
                  {canEdit && <td className="text-end text-nowrap">
                    <Button size="sm" color="success" outline className="me-1" onClick={() => startEdit(item)}>Editar</Button>
                    <Button size="sm" color="danger" outline onClick={() => deactivateEmployee(item)}>Desactivar</Button>
                  </td>}</tr>)}
                  {!employees.length && <tr><td colSpan={canEdit ? 4 : 3} className="text-center muted py-3">Sin empleados registrados.</td></tr>}
                </tbody>
              </Table></div>
            )}
          </CardBody></Card>
          {canEdit && generated && <Card className="surface-card mb-3"><CardBody>
            <p className="eyebrow">RESULTADO DE PLANILLA</p>
            <h2 className="section-title">{formatDate(generated.periodStart)} — {formatDate(generated.periodEnd)}</h2>
            <div className="table-responsive"><Table className="data-table align-middle mb-0">
              <thead><tr><th>Colaborador</th><th>Bruto</th><th>ISSS 3%</th><th>AFP 7.25%</th><th>ISR</th><th>Neto</th></tr></thead>
              <tbody>{generated.lines.map((line) => <tr key={line.employee}>
                <td className="table-primary">{line.employee}</td><td>{formatMoney(line.gross)}</td>
                <td>{formatMoney(line.isss)}</td><td>{formatMoney(line.afp)}</td>
                <td>{formatMoney(line.incomeTax)}</td><td><strong>{formatMoney(line.net)}</strong></td>
              </tr>)}</tbody>
            </Table></div>
          </CardBody></Card>}
          {canEdit && <Card className="surface-card"><CardBody>
            <p className="eyebrow">HISTORIAL</p><h2 className="section-title">Planillas generadas</h2>
            {loading ? <Spinner color="success" /> : (
              <div className="table-responsive"><Table hover className="data-table align-middle mb-0">
                <thead><tr><th>Período</th><th>Empleados</th><th>Total bruto</th><th>Total neto</th></tr></thead>
                <tbody>{runs.map((run) => <tr key={run.id}><td>{formatDate(run.periodStart)} — {formatDate(run.periodEnd)}</td>
                  <td>{run.employees}</td><td>{formatMoney(run.gross)}</td><td>{formatMoney(run.net)}</td></tr>)}
                  {!runs.length && <tr><td colSpan="4" className="text-center muted py-3">Aún no hay planillas.</td></tr>}
                </tbody>
              </Table></div>
            )}
          </CardBody></Card>}
        </Col>
      </Row>
      <div className="info-note mt-3">Configuración base: ISSS 3%, AFP 7.25% y tabla quincenal ISR. Verifica los límites vigentes y la base imponible con la normativa y asesoría contable local antes de usarla para pago real.</div>
    </div>
  );
}
