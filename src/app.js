const express = require('express');
const path = require('path');
const { cargar, guardar, siguienteId } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const error = (res, code, msg) => res.status(code).json({ error: msg });

// ---------- PRODUCTOS (CRUD) ----------
app.get('/api/productos', (req, res) => {
  const { q, categoria } = req.query;
  let lista = cargar().productos;
  if (q) lista = lista.filter(p => p.nombre.toLowerCase().includes(q.toLowerCase()));
  if (categoria) lista = lista.filter(p => p.categoria === categoria);
  res.json(lista);
});

app.get('/api/productos/bajo-stock', (req, res) => {
  res.json(cargar().productos.filter(p => p.stock <= p.stockMinimo));
});

app.post('/api/productos', (req, res) => {
  const { nombre, categoria, precio, stock, stockMinimo } = req.body;
  if (!nombre || !(precio > 0) || !(stock >= 0)) return error(res, 400, 'nombre, precio (>0) y stock (>=0) son obligatorios');
  const db = cargar();
  const p = { id: siguienteId(db, 'productos'), nombre, categoria: categoria || 'General', precio, stock, stockMinimo: stockMinimo ?? 5 };
  db.productos.push(p);
  guardar(db);
  res.status(201).json(p);
});

app.put('/api/productos/:id', (req, res) => {
  const db = cargar();
  const p = db.productos.find(x => x.id === +req.params.id);
  if (!p) return error(res, 404, 'Producto no encontrado');
  const { nombre, categoria, precio, stock, stockMinimo } = req.body;
  if (precio !== undefined && !(precio > 0)) return error(res, 400, 'precio inválido');
  if (stock !== undefined && !(stock >= 0)) return error(res, 400, 'stock inválido');
  Object.assign(p, Object.fromEntries(Object.entries({ nombre, categoria, precio, stock, stockMinimo }).filter(([, v]) => v !== undefined)));
  guardar(db);
  res.json(p);
});

app.delete('/api/productos/:id', (req, res) => {
  const db = cargar();
  const i = db.productos.findIndex(x => x.id === +req.params.id);
  if (i < 0) return error(res, 404, 'Producto no encontrado');
  db.productos.splice(i, 1);
  guardar(db);
  res.status(204).end();
});

// ---------- CLIENTES ----------
app.get('/api/clientes', (req, res) => res.json(cargar().clientes));

app.post('/api/clientes', (req, res) => {
  const { nombre, telefono } = req.body;
  if (!nombre) return error(res, 400, 'nombre es obligatorio');
  const db = cargar();
  const c = { id: siguienteId(db, 'clientes'), nombre, telefono: telefono || '' };
  db.clientes.push(c);
  guardar(db);
  res.status(201).json(c);
});

// ---------- VENTAS ----------
// Body: { clienteId, items: [{ productoId, cantidad }] }
app.post('/api/ventas', (req, res) => {
  const { clienteId = 1, items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return error(res, 400, 'La venta necesita al menos un item');
  const db = cargar();
  if (!db.clientes.find(c => c.id === clienteId)) return error(res, 404, 'Cliente no encontrado');

  // 1) Validar todo antes de modificar nada
  const detalle = [];
  for (const it of items) {
    const p = db.productos.find(x => x.id === it.productoId);
    if (!p) return error(res, 404, `Producto ${it.productoId} no existe`);
    if (!(it.cantidad > 0)) return error(res, 400, `Cantidad inválida para ${p.nombre}`);
    if (p.stock < it.cantidad) return error(res, 409, `Stock insuficiente de ${p.nombre} (disponible: ${p.stock})`);
    detalle.push({ producto: p, cantidad: it.cantidad });
  }

  // 2) Descontar stock y registrar
  const lineas = detalle.map(({ producto, cantidad }) => {
    producto.stock -= cantidad;
    return { productoId: producto.id, nombre: producto.nombre, cantidad, precio: producto.precio, subtotal: producto.precio * cantidad };
  });
  const total = lineas.reduce((s, l) => s + l.subtotal, 0);
  const venta = { id: siguienteId(db, 'ventas'), fecha: new Date().toISOString(), clienteId, items: lineas, total };
  db.ventas.push(venta);
  guardar(db);
  res.status(201).json(venta);
});

app.get('/api/ventas', (req, res) => res.json(cargar().ventas));

app.get('/api/reportes/resumen', (req, res) => {
  const db = cargar();
  const porProducto = {};
  db.ventas.forEach(v => v.items.forEach(i => { porProducto[i.nombre] = (porProducto[i.nombre] || 0) + i.cantidad; }));
  const masVendido = Object.entries(porProducto).sort((a, b) => b[1] - a[1])[0];
  res.json({
    totalVentas: db.ventas.length,
    ingresos: db.ventas.reduce((s, v) => s + v.total, 0),
    productoMasVendido: masVendido ? { nombre: masVendido[0], unidades: masVendido[1] } : null,
    productosBajoStock: db.productos.filter(p => p.stock <= p.stockMinimo).length
  });
});

module.exports = app;
