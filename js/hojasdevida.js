const body = document.getElementById('hojasVidaBody');
const search = document.querySelector('.filter-bar input');
const filter = document.querySelector('.filter-bar select');
let postulaciones = [];
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const estadoClase = (estado = '') => { const value = estado.toLowerCase(); return value.includes('aprob') ? 'badge-aprobado' : value.includes('entrevista') ? 'badge-entrevista' : 'badge-pendiente'; };
const fecha = (value) => value ? new Date(value).toLocaleDateString('es-CO') : '—';
function render() {
    const needle = (search.value || '').toLowerCase(); const cargo = filter.value.toLowerCase();
    const rows = postulaciones.filter((item) => `${item.nombre_completo} ${item.numero_documento} ${item.cargo}`.toLowerCase().includes(needle) && (!cargo || item.cargo.toLowerCase().includes(cargo)));
    body.innerHTML = rows.length ? rows.map((item) => `<tr><td><strong>${esc(item.nombre_completo)}</strong><br><small>${esc(item.correo || '')}</small></td><td>${esc(item.cargo || '—')}</td><td>${fecha(item.fecha_postulacion)}</td><td><span style="font-size:.82rem;color:var(--azul-claro);">📎 ${item.documentos_count || 0} anexos</span></td><td><span class="badge ${estadoClase(item.estado)}">${esc(String(item.estado || 'EN_REVISION').replace(/_/g, ' '))}</span></td><td style="display:flex;gap:.4rem"><a href="hdv.html?id=${encodeURIComponent(item.id_postulacion)}" class="btn-xs btn-xs-blue">Ver hoja de vida</a></td></tr>`).join('') : '<tr><td colspan="6">No hay hojas de vida que coincidan con la búsqueda.</td></tr>';
}
async function cargar() {
    try { const response = await fetch('/api/postulaciones'); if (!response.ok) throw new Error('No fue posible cargar las postulaciones.'); postulaciones = await response.json(); postulaciones.forEach((item) => { item.documentos_count = item.documentos_count || '—'; }); render(); }
    catch (error) { body.innerHTML = `<tr><td colspan="6">⚠️ ${esc(error.message)}</td></tr>`; }
}
search?.addEventListener('input', render); filter?.addEventListener('change', render); cargar();
