import { useEffect, useMemo, useRef, useState } from 'react';
import { useInventory } from '../../hooks/useInventory.js';
import './Inventory.css';
 
const ESTADOS = {
  disponible: { etiqueta: 'Disponible', clase: 'ok' },
  bajo: { etiqueta: 'Stock bajo', clase: 'bajo' },
  agotado: { etiqueta: 'Sin stock', clase: 'agotado' },
};
 
const ORDENES = {
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
  existenciaAsc: (a, b) => a.existencia - b.existencia,
  existenciaDesc: (a, b) => b.existencia - a.existencia,
};
 
const formatoNumero = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 2 });
 
function calcularEstado({ existencia, minimo }) {
  if (existencia <= 0) return 'agotado';
  if (existencia <= minimo) return 'bajo';
  return 'disponible';
}
 
const normalizarTexto = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 
export default function Inventory() {
  const { items, cargando, error, recargar, eliminar } = useInventory();
 
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [avisoEliminar, setAvisoEliminar] = useState('');
 
  const buscadorRef = useRef(null);
  const filtroRef = useRef(null);
 
  // Cierra el panel de filtros con Escape o al hacer clic fuera de el.
  useEffect(() => {
    if (!panelAbierto) return undefined;
    const alPresionar = (evento) => {
      if (evento.key === 'Escape') setPanelAbierto(false);
    };
    const alHacerClic = (evento) => {
      if (filtroRef.current && !filtroRef.current.contains(evento.target)) {
        setPanelAbierto(false);
      }
    };
    document.addEventListener('keydown', alPresionar);
    document.addEventListener('mousedown', alHacerClic);
    return () => {
      document.removeEventListener('keydown', alPresionar);
      document.removeEventListener('mousedown', alHacerClic);
    };
  }, [panelAbierto]);
 
  const conEstado = useMemo(
    () => items.map((item) => ({ ...item, estado: calcularEstado(item) })),
    [items]
  );
 
  const resumen = useMemo(
    () => ({
      total: conEstado.length,
      bajo: conEstado.filter((item) => item.estado === 'bajo').length,
      agotado: conEstado.filter((item) => item.estado === 'agotado').length,
    }),
    [conEstado]
  );
 
  const visibles = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim());
    return conEstado
      .filter(
        (item) =>
          (filtroEstado === 'todos' || item.estado === filtroEstado) &&
          normalizarTexto(item.nombre).includes(texto)
      )
      .sort(ORDENES[orden]);
  }, [conEstado, busqueda, filtroEstado, orden]);
 
  const hayFiltros = busqueda.trim() !== '' || filtroEstado !== 'todos';
 
  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('todos');
    setOrden('nombre');
  };
 
  const manejarEliminar = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" del inventario?`)) return;
    setAvisoEliminar('');
    try {
      await eliminar(item.id);
    } catch (e) {
      setAvisoEliminar(
        e?.response?.data?.message ?? `No se pudo eliminar "${item.nombre}". Inténtalo de nuevo.`
      );
    }
  };
 
  return (
    <section className="inv">
      <header className="inv__encabezado">
        <h1 className="inv__titulo">Inventario</h1>
      </header>
 
      <div className="inv__barra">
        <button
          type="button"
          className="inv__boton-imagen"
          aria-label="Buscar artículo"
          onClick={() => buscadorRef.current?.focus()}
        >
          <img className="inv__icono-buscar" src="/img/BotonBuscador.png" alt="" />
        </button>
 
        <input
          ref={buscadorRef}
          className="inv__buscador"
          type="search"
          placeholder="Buscar artículo"
          aria-label="Buscar artículo"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
 
        <div className="inv__filtro" ref={filtroRef}>
          <button
            type="button"
            className="inv__boton-imagen"
            aria-label="Filtrar y ordenar"
            aria-expanded={panelAbierto}
            aria-controls="inv-panel-filtros"
            onClick={() => setPanelAbierto((abierto) => !abierto)}
          >
            <img className="inv__icono-filtro" src="/img/Filtro.png" alt="" />
          </button>
 
          {panelAbierto && (
            <div className="inv__panel" id="inv-panel-filtros">
              <fieldset className="inv__grupo">
                <legend>Estado</legend>
                {[
                  ['todos', 'Todos'],
                  ['disponible', ESTADOS.disponible.etiqueta],
                  ['bajo', ESTADOS.bajo.etiqueta],
                  ['agotado', ESTADOS.agotado.etiqueta],
                ].map(([valor, etiqueta]) => (
                  <label key={valor} className="inv__opcion">
                    <input
                      type="radio"
                      name="inv-estado"
                      value={valor}
                      checked={filtroEstado === valor}
                      onChange={() => setFiltroEstado(valor)}
                    />
                    {etiqueta}
                  </label>
                ))}
              </fieldset>
 
              <label className="inv__grupo inv__grupo--orden">
                <span>Ordenar por</span>
                <select value={orden} onChange={(evento) => setOrden(evento.target.value)}>
                  <option value="nombre">Nombre (A–Z)</option>
                  <option value="existenciaAsc">Existencia: de menor a mayor</option>
                  <option value="existenciaDesc">Existencia: de mayor a menor</option>
                </select>
              </label>
 
              <button type="button" className="inv__limpiar" onClick={limpiarFiltros}>
                Quitar filtros
              </button>
            </div>
          )}
        </div>
      </div>
 
      <ul className="inv__resumen">
        <li className="inv__dato">
          <img src="/img/TotalProducto.png" alt="" />
          <span>
            Total de productos: <strong>{resumen.total}</strong>
          </span>
        </li>
        <li className="inv__dato">
          <img src="/img/StockBajo.png" alt="" />
          <span>
            Stock bajo: <strong>{resumen.bajo}</strong>
          </span>
        </li>
        <li className="inv__dato">
          <img src="/img/SinStock.png" alt="" />
          <span>
            Sin stock: <strong>{resumen.agotado}</strong>
          </span>
        </li>
      </ul>
 
      {avisoEliminar && (
        <p className="inv__aviso" role="alert">
          {avisoEliminar}
        </p>
      )}
 
      <div className="inv__contenedor-tabla">
        <table className="inv__tabla">
          <colgroup>
            <col style={{ width: '34%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '4%' }} />
          </colgroup>
 
          <thead>
            <tr>
              <th scope="col">Artículo</th>
              <th scope="col">Unidad</th>
              <th scope="col">Existencia</th>
              <th scope="col">Mínimo</th>
              <th scope="col">Estado</th>
              <th scope="col" className="inv__accion">
                <span className="inv__solo-lector">Eliminar</span>
              </th>
            </tr>
          </thead>
 
          <tbody>
            {cargando && (
              <tr>
                <td colSpan={6} className="inv__mensaje" role="status">
                  Cargando inventario…
                </td>
              </tr>
            )}
 
            {!cargando && error && (
              <tr>
                <td colSpan={6} className="inv__mensaje" role="alert">
                  <span>{error}</span>
                  <button type="button" className="inv__reintentar" onClick={recargar}>
                    Reintentar
                  </button>
                </td>
              </tr>
            )}
 
            {!cargando && !error && visibles.length === 0 && (
              <tr>
                <td colSpan={6} className="inv__mensaje">
                  {hayFiltros
                    ? 'Ningún artículo coincide con la búsqueda o los filtros.'
                    : 'Todavía no hay artículos en el inventario.'}
                </td>
              </tr>
            )}
 
            {!cargando &&
              !error &&
              visibles.map((item) => {
                const estado = ESTADOS[item.estado];
                return (
                  <tr key={item.id}>
                    <td className="inv__celda inv__celda--nombre" title={item.nombre}>
                      {item.nombre}
                    </td>
                    <td className="inv__celda">{item.unidad}</td>
                    <td className="inv__celda inv__celda--numero">
                      {formatoNumero.format(item.existencia)}
                    </td>
                    <td className="inv__celda inv__celda--numero">
                      {formatoNumero.format(item.minimo)}
                    </td>
                    <td className="inv__celda">
                      <span className={`inv__estado inv__estado--${estado.clase}`}>
                        {estado.etiqueta}
                      </span>
                    </td>
                    <td className="inv__accion">
                      <button
                        type="button"
                        className="inv__boton-imagen inv__eliminar"
                        aria-label={`Eliminar ${item.nombre}`}
                        onClick={() => manejarEliminar(item)}
                      >
                        <img src="/img/EliminarProducto.png" alt="" />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
 