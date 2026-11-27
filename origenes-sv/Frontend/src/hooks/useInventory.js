import { useCallback, useEffect, useState } from 'react';
import * as apiModule from '../api/api.js';
 
/*
  Capa de datos de la pagina Inventario.
  Es lo UNICO que depende del backend: si tu API responde distinto,
  ajusta solo este archivo (ENDPOINT, obtenerCliente y normalizar).
 
  Supone que api.js exporta un cliente tipo axios (cualquier export
  con los metodos get() y delete()).
 
  Vista previa sin backend: abre la pagina con ?demo en la URL
  (por ejemplo http://127.0.0.1:5173/?demo). Se puede borrar cuando ya
  no haga falta (DATOS_EJEMPLO, esModoDemo y sus usos).
*/
 
const ENDPOINT = '/inventory';
 
const DATOS_EJEMPLO = [
  { id: 1, nombre: 'Harina de maíz', unidad: 'kg', existencia: 42, minimo: 15 },
  { id: 2, nombre: 'Frijol rojo', unidad: 'kg', existencia: 8, minimo: 10 },
  { id: 3, nombre: 'Queso duro', unidad: 'kg', existencia: 0, minimo: 5 },
  { id: 4, nombre: 'Aceite vegetal', unidad: 'L', existencia: 18.5, minimo: 6 },
  { id: 5, nombre: 'Café molido', unidad: 'kg', existencia: 3, minimo: 4 },
  { id: 6, nombre: 'Azúcar', unidad: 'kg', existencia: 25, minimo: 10 },
  { id: 7, nombre: 'Leche entera', unidad: 'L', existencia: 0, minimo: 12 },
];
 
const esModoDemo = () =>
  new URLSearchParams(window.location.search).has('demo');
 
function obtenerCliente() {
  // Toma el primer export de api.js que tenga get() y delete(), sin importar su nombre.
  const cliente = Object.values(apiModule).find(
    (exportado) =>
      exportado &&
      typeof exportado.get === 'function' &&
      typeof exportado.delete === 'function'
  );
  if (!cliente) {
    throw new Error(
      'api.js no exporta un cliente con get() y delete(). Ajusta obtenerCliente() en hooks/useInventory.js.'
    );
  }
  return cliente;
}
 
const primero = (objeto, claves, porDefecto) => {
  for (const clave of claves) {
    if (objeto?.[clave] !== undefined && objeto[clave] !== null) {
      return objeto[clave];
    }
  }
  return porDefecto;
};
 
/* Convierte un registro del backend al formato que usa la pagina. */
export function normalizar(registro) {
  return {
    id: primero(registro, ['id', 'inventory_id', 'ingredient_id', 'product_id']),
    nombre: String(
      primero(
        registro,
        ['name', 'nombre', 'item_name', 'ingredient_name', 'product_name', 'article'],
        'Sin nombre'
      )
    ),
    unidad: String(primero(registro, ['unit', 'unidad', 'unit_name', 'measure_unit'], '')),
    existencia: Number(
      primero(registro, ['stock', 'quantity', 'existencia', 'current_stock', 'qty'], 0)
    ),
    minimo: Number(
      primero(
        registro,
        ['min_stock', 'minimum', 'minimo', 'stock_minimo', 'minStock', 'reorder_level'],
        0
      )
    ),
  };
}
 
export function useInventory() {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
 
  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      if (esModoDemo()) {
        setItems(DATOS_EJEMPLO);
        return;
      }
      const { data } = await obtenerCliente().get(ENDPOINT);
      const lista = Array.isArray(data) ? data : data?.data ?? data?.items ?? [];
      setItems(lista.map(normalizar));
    } catch (e) {
      setItems([]);
      setError(
        e?.response?.data?.message ?? e?.message ?? 'No se pudo cargar el inventario.'
      );
    } finally {
      setCargando(false);
    }
  }, []);
 
  useEffect(() => {
    cargar();
  }, [cargar]);
 
  const eliminar = useCallback(async (id) => {
    if (!esModoDemo()) {
      await obtenerCliente().delete(`${ENDPOINT}/${id}`);
    }
    setItems((anteriores) => anteriores.filter((item) => item.id !== id));
  }, []);
 
  return { items, cargando, error, recargar: cargar, eliminar };
}
