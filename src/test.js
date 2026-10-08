// Prueba rápida de la API (sin librerías extra). Usa Node 18+.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '..', 'data', 'db.json');
if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

const app = require('./app');
const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}/api`;
  const call = async (m, u, b) => {
    const r = await fetch(base + u, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    return { status: r.status, body: r.status === 204 ? null : await r.json() };
  };
  try {
    let r = await call('GET', '/productos');
    assert.equal(r.status, 200); assert.equal(r.body.length, 4);

    r = await call('POST', '/productos', { nombre: 'Taladro', precio: 450, stock: 3 });
    assert.equal(r.status, 201);
    const id = r.body.id;

    r = await call('POST', '/productos', { nombre: '', precio: -1 });
    assert.equal(r.status, 400);

    r = await call('POST', '/ventas', { items: [{ productoId: id, cantidad: 5 }] });
    assert.equal(r.status, 409); // stock insuficiente

    r = await call('POST', '/ventas', { items: [{ productoId: id, cantidad: 2 }, { productoId: 1, cantidad: 1 }] });
    assert.equal(r.status, 201); assert.equal(r.body.total, 450 * 2 + 85);

    r = await call('GET', '/productos?q=taladro');
    assert.equal(r.body[0].stock, 1); // 3 - 2

    r = await call('GET', '/productos/bajo-stock');
    assert.ok(r.body.some(p => p.nombre === 'Cemento 42.5kg'));

    r = await call('GET', '/reportes/resumen');
    assert.equal(r.body.totalVentas, 1);

    r = await call('DELETE', `/productos/${id}`);
    assert.equal(r.status, 204);
    console.log('✅ Todas las pruebas pasaron');
  } catch (e) { console.error('❌', e.message); process.exitCode = 1; }
  finally { server.close(); fs.existsSync(dbFile) && fs.unlinkSync(dbFile); }
});
