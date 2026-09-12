// postulacion.js — Formulario de postulación de candidatos
const menuToggle = document.getElementById('menuToggle');
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    document.querySelector('.nav-list').classList.toggle('open');
  });
}

const btnEnviar  = document.getElementById('btnEnviar');
const btnLimpiar = document.getElementById('btnLimpiar');
const alertBox   = document.getElementById('form-alert');
const formDiv    = document.getElementById('postForm');
const confirmDiv = document.getElementById('confirmacion');
const cargoSelect = document.getElementById('cargo');
const params = new URLSearchParams(window.location.search);
const vacanteSeleccionada = params.get('id_vacante');

function normalizar(value = '') {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function showAlert(msg, type) {
  alertBox.textContent = msg;
  alertBox.className = 'form-alert ' + type;
  alertBox.hidden = false;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function esCargoSeguridad(titulo = '') {
  return new Set([
    'guarda de seguridad',
    'supervisor de seguridad',
    'auxiliar de rrhh',
    'auxiliar de recursos humanos',
    'tecnico cctv'
  ]).has(normalizar(titulo));
}

async function cargarCargos() {
  if (!cargoSelect) return;

  try {
    const response = await fetch('/api/vacantes');
    if (!response.ok) throw new Error('No fue posible cargar los cargos disponibles.');
    const vacantes = await response.json();
    const activas = vacantes.filter((v) =>
      ['abierta', 'activo', 'activa'].includes(normalizar(v.estado)) && esCargoSeguridad(v.titulo)
    );

    cargoSelect.innerHTML = '<option value="" disabled selected>Selecciona una opción</option>';
    activas.sort((a, b) => Number(a.id_vacante) - Number(b.id_vacante));
    activas.forEach((vacante) => {
      const opcion = new Option(vacante.titulo, String(vacante.id_vacante));
      opcion.dataset.cargo = vacante.titulo;
      cargoSelect.add(opcion);
    });

    if (!activas.length) {
      cargoSelect.innerHTML = '<option value="" disabled selected>No hay cargos disponibles</option>';
      return;
    }

    if (vacanteSeleccionada) {
      const seleccion = activas.find((vacante) => String(vacante.id_vacante) === String(vacanteSeleccionada));
      if (seleccion) cargoSelect.value = String(seleccion.id_vacante);
    }
  } catch (error) {
    showAlert(`⚠️ ${error.message}`, 'error');
  }
}

cargarCargos();

btnEnviar.addEventListener('click', async () => {
  const nombre   = document.getElementById('nombre').value.trim();
  const cedula   = document.getElementById('cedula').value.trim();
  const email    = document.getElementById('email').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const ciudad   = document.getElementById('ciudad').value.trim();
  const fecha    = document.getElementById('fecha_nac').value;
  const cargoId  = cargoSelect.value;
  const cargo    = cargoSelect.options[cargoSelect.selectedIndex]?.dataset.cargo || cargoSelect.options[cargoSelect.selectedIndex]?.textContent.trim();
  const exp      = document.getElementById('experiencia').value;
  const hv       = document.getElementById('hoja_vida').files.length;
  const ced      = document.getElementById('cedula_doc').files.length;
  const terminos = document.getElementById('terminos').checked;

  if (!nombre || !cedula || !email || !telefono || !ciudad || !fecha || !cargoId || !exp) {
    showAlert('⚠️ Por favor completa todos los campos obligatorios.', 'error');
    return;
  }
  if (!hv || !ced) {
    showAlert('⚠️ Debes adjuntar tu hoja de vida y copia de cédula.', 'error');
    return;
  }
  if (!terminos) {
    showAlert('⚠️ Debes aceptar el tratamiento de datos personales.', 'error');
    return;
  }

  try {
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';
    const response = await fetch('/api/postulaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        cedula,
        email,
        telefono,
        ciudad,
        cargo,
        idVacante: Number(cargoId)
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No fue posible registrar la postulación.');
    alertBox.hidden = true;
    formDiv.hidden = true;
    confirmDiv.hidden = false;
    confirmDiv.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showAlert(`⚠️ ${error.message || 'No fue posible registrar tu postulación.'}`, 'error');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar Postulación';
  }
});

btnLimpiar.addEventListener('click', () => {
  ['nombre', 'cedula', 'email', 'telefono', 'ciudad', 'fecha_nac', 'descripcion'].forEach(id => {
    document.getElementById(id).value = '';
  });
  cargoSelect.selectedIndex = 0;
  document.getElementById('experiencia').selectedIndex = 0;
  ['hoja_vida', 'cedula_doc'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('terminos').checked = false;
  alertBox.hidden = true;
});
