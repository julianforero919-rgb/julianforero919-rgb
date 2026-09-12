const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const fecha = (value) => value ? new Date(value).toLocaleDateString('es-CO') : '—';
function docIcon(type = '') { return type.includes('image') ? '🖼️' : type.includes('pdf') ? '📄' : '📎'; }
async function cargar() {
    const loading = document.getElementById('hdvLoading');
    try {
        if (!id) throw new Error('No se indicó la postulación.');
        const response = await fetch(`/api/postulaciones/${encodeURIComponent(id)}`); const item = await response.json();
        if (!response.ok) throw new Error(item.error || 'No fue posible cargar la hoja de vida.');
        document.getElementById('nombreAspirante').textContent = item.nombre_completo || 'Aspirante';
        document.getElementById('cargoAspirante').textContent = `Aspirante · ${item.cargo || 'Cargo no definido'}`;
        const estado = document.getElementById('estadoAspirante'); estado.textContent = String(item.estado || 'EN_REVISION').replace(/_/g, ' '); estado.className = `badge ${String(item.estado).includes('APROB') ? 'badge-aprobado' : 'badge-pendiente'}`;
        const foto = item.documentos?.find((doc) => /^foto\s*-/i.test(doc.nombre_documento) || /foto/i.test(doc.nombre_documento));
        const fotoEl = document.getElementById('fotoAspirante'); if (foto?.archivo) fotoEl.src = foto.archivo; else { fotoEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="116" height="116"%3E%3Crect width="100%25" height="100%25" fill="%23dbe3ef"/%3E%3Ctext x="50%25" y="54%25" text-anchor="middle" font-size="42"%3E👤%3C/text%3E%3C/svg%3E'; }
        document.getElementById('datosAspirante').innerHTML = [['Cédula', item.numero_documento], ['Teléfono', item.telefono], ['Email', item.correo], ['Ciudad', item.ciudad || item.direccion], ['Nacimiento', fecha(item.fecha_nacimiento)], ['Postulación', fecha(item.fecha_postulacion)]].map(([label, value]) => `<li><strong>${label}:</strong> ${esc(value || '—')}</li>`).join('');
        document.getElementById('descripcionVacante').textContent = item.descripcion_vacante || 'Sin descripción registrada.';
        document.getElementById('experienciaAspirante').textContent = item.experiencia || 'No especificada';
        document.getElementById('descripcionExperiencia').textContent = item.descripcion_experiencia || '';
        document.getElementById('documentosAspirante').innerHTML = (item.documentos || []).map((doc) => `<div style="background:var(--gris-bg);border:1px solid var(--gris-borde);border-radius:var(--radius);padding:.85rem 1.25rem;font-size:.88rem;min-width:220px">${docIcon(doc.tipo_documento)} <strong>${esc(doc.nombre_documento)}</strong><br><span style="color:var(--gris-claro)">${esc(doc.tipo_documento || 'Archivo')}</span><br><a href="${esc(doc.archivo)}" target="_blank" rel="noopener">Ver archivo</a> · <a href="${esc(doc.archivo)}" download="${esc(doc.nombre_documento)}">Descargar</a></div>`).join('') || '<p>No hay documentos adjuntos.</p>';
        loading.hidden = true; document.getElementById('hdvContent').hidden = false;
    } catch (error) { loading.textContent = `⚠️ ${error.message}`; }
}
cargar();
