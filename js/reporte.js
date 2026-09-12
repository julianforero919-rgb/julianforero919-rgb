// reporte.js — Reporte de evaluación con estrellas
document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.nav-list').classList.toggle('open');
});

const scores = {};

document.querySelectorAll('.stars').forEach(group => {
  const crit  = group.dataset.criterion;
  scores[crit] = 0;

  group.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      scores[crit] = parseInt(star.dataset.val);
      group.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.val) <= scores[crit]);
      });
      updateScore();
    });
  });
});

function updateScore() {
  const vals = Object.values(scores).filter(v => v > 0);
  const avg  = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  document.getElementById('scoreDisplay').textContent = avg.toFixed(1);
}

document.getElementById('btnGuardarReporte').addEventListener('click', () => {
  const rec = document.getElementById('rp-recomendacion').value;
  const al  = document.getElementById('rep-alert');

  if (!rec) {
    al.textContent = '⚠️ Selecciona una recomendación antes de guardar.';
    al.className   = 'form-alert error';
    al.hidden      = false;
    return;
  }
  al.textContent = '✅ Reporte guardado exitosamente. Disponible para revisión de Gerencia.';
  al.className   = 'form-alert success';
  al.hidden      = false;
});

async function loadReportes() {
  try {
    const response = await fetch('/api/reportes');
    if (!response.ok) throw new Error();
    const data = await response.json();

    document.getElementById('historialAspirantes').innerHTML = data.historial.map((item) => `
      <div style="border-bottom:1px solid var(--border);padding:0.75rem 0;">
        <strong style="font-size:0.9rem;color:var(--azul-oscuro);">${item.nombre_completo}</strong>
        <div style="font-size:0.8rem;color:var(--gris-claro);">${item.tipo_documento} ${item.numero_documento} · ${item.total_postulaciones} postulacion(es)</div>
        <span class="badge badge-pendiente" style="margin-top:0.25rem;">Ultima: ${new Date(item.ultima_postulacion).toLocaleDateString('es-CO')}</span>
      </div>
    `).join('') || '<div style="padding:0.75rem 0;">Sin historial de aspirantes.</div>';

    document.getElementById('estadisticasPostulaciones').innerHTML = data.estadisticas.slice(0, 6).map((item) => `
      <div style="border-bottom:1px solid var(--border);padding:0.75rem 0;">
        <strong style="font-size:0.9rem;color:var(--azul-oscuro);">${item.tipo_periodo}</strong>
        <div style="font-size:0.8rem;color:var(--gris-claro);">${new Date(item.periodo_inicio).toLocaleDateString('es-CO')} - ${new Date(item.periodo_fin).toLocaleDateString('es-CO')}</div>
        <span class="badge badge-aprobado" style="margin-top:0.25rem;">${item.total_postulaciones} postulacion(es)</span>
      </div>
    `).join('') || '<div style="padding:0.75rem 0;">Sin estadisticas disponibles.</div>';
  } catch {
    document.getElementById('historialAspirantes').innerHTML = '<div style="padding:0.75rem 0;">No fue posible cargar reportes.</div>';
    document.getElementById('estadisticasPostulaciones').innerHTML = '<div style="padding:0.75rem 0;">No fue posible cargar estadisticas.</div>';
  }
}

loadReportes();
