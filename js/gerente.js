(() => {
  const esc = (value = '') => {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  };
  const normalizar = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const statNodes = [...document.querySelectorAll('.stat-num')];
  const columns = [...document.querySelectorAll('.kanban-col')];

  async function api(url) {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No fue posible cargar el dashboard.');
    return data;
  }

  function categoria(postulacion) {
    const estado = normalizar(postulacion.estado);
    if (estado.includes('rechaz') || estado.includes('no clasif')) return 2;
    if (estado.includes('aprob') || estado.includes('contrato')) return 1;
    return 0;
  }

  function pintarColumna(index, titulo, items) {
    const header = columns[index]?.querySelector('.kanban-col-header');
    const body = columns[index]?.querySelector('.kanban-col-body');
    if (!header || !body) return;
    header.textContent = `${titulo} (${items.length})`;
    body.innerHTML = items.length ? items.slice(0, 12).map((item) => {
      const nombre = item.nombre_completo || `${item.nombre || ''} ${item.apellido || ''}`.trim();
      const accion = index === 1
        ? '<a href="contrato.html" class="btn-xs btn-xs-green">Generar Contrato</a>'
          : `<a href="${index === 0 ? `evaluar.html?id=${item.id_postulacion}` : 'hdv.html'}" class="btn-xs btn-xs-blue">${index === 0 ? 'Evaluar' : 'Ver HDV'}</a>`;
      return `<div class="kanban-card"><h4>${esc(nombre || 'Postulante')}</h4><p>${esc(item.cargo || 'Cargo no especificado')} · ${esc(item.nombre_sede || 'Sin sede')}</p><div class="card-actions">${accion}</div></div>`;
    }).join('') : '<p class="form-alert">No hay candidatos en este estado.</p>';
  }

  async function cargarDashboard() {
    try {
      const [stats, postulaciones, contratos] = await Promise.all([
        api('/api/dashboard'), api('/api/postulaciones'), api('/api/contratos')
      ]);
      const activos = contratos.filter((contrato) => ['activo', 'vigente'].includes(normalizar(contrato.estado))).length;
      [stats.total, stats.en_revision, stats.aprobados, activos].forEach((value, index) => {
        if (statNodes[index]) statNodes[index].textContent = Number(value || 0);
      });
      const grupos = [[], [], []];
      postulaciones.forEach((item) => grupos[categoria(item)].push(item));
      pintarColumna(0, 'En Revisión', grupos[0]);
      pintarColumna(1, 'Aprobados', grupos[1]);
      pintarColumna(2, 'No Clasificaron', grupos[2]);
    } catch (error) {
      columns.forEach((column) => {
        const body = column.querySelector('.kanban-col-body');
        if (body) body.innerHTML = `<p class="form-alert error">${esc(error.message)}</p>`;
      });
    }
  }

  cargarDashboard();
})();
