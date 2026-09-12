// ==========================================================
// SIDOVI - Formulario de Postulación
// ==========================================================

// MENÚ
const menuToggle = document.getElementById('menuToggle');

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    document.querySelector('.nav-list')?.classList.toggle('open');
  });
}

// ELEMENTOS
const btnEnviar = document.getElementById('btnEnviar');
const btnLimpiar = document.getElementById('btnLimpiar');
const alertBox = document.getElementById('form-alert');
const formDiv = document.getElementById('postForm');
const confirmDiv = document.getElementById('confirmacion');
const cargoSelect = document.getElementById('cargo');

// ID de vacante recibido por URL
const params = new URLSearchParams(window.location.search);
const vacanteSeleccionada = params.get('id_vacante');

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

function normalizar(value = '') {
  return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
}

function showAlert(msg, type = 'error') {
  alertBox.textContent = msg;
  alertBox.className = `form-alert ${type}`;
  alertBox.hidden = false;

  alertBox.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {

    if (!file) {
      reject(new Error('No se seleccionó el archivo.'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        nombreArchivo: file.name,
        tipoArchivo: file.type || 'application/octet-stream',
        archivo: reader.result
      });
    };

    reader.onerror = () => {
      reject(
          new Error(`No fue posible leer ${file.name}.`)
      );
    };

    reader.readAsDataURL(file);
  });
}

// ==========================================================
// CARGAR VACANTES
// ==========================================================

async function cargarCargos() {

  try {

    const response = await fetch('/api/vacantes');

    if (!response.ok) {
      throw new Error(
          'No fue posible cargar las vacantes disponibles.'
      );
    }

    const vacantes = await response.json();

    const activas = vacantes.filter(v =>
        ['abierta', 'activo', 'activa'].includes(
            normalizar(v.estado)
        )
    );

    cargoSelect.innerHTML =
        '<option value="" disabled selected>Selecciona una opción</option>';

    activas
        .sort(
            (a, b) =>
                Number(a.id_vacante) - Number(b.id_vacante)
        )
        .forEach(vacante => {

          const titulo =
              vacante.nombre_cargo ||
              vacante.titulo ||
              'Cargo sin nombre';

          const opcion = new Option(
              `${titulo} — ${vacante.nombre_sede || 'Sede no definida'}`,
              String(vacante.id_vacante)
          );

          opcion.dataset.cargo = titulo;

          cargoSelect.add(opcion);
        });

    // Si llegó una vacante desde ofertas.html
    if (vacanteSeleccionada) {
      cargoSelect.value = String(vacanteSeleccionada);
    }

  } catch (error) {

    console.error('Error cargando vacantes:', error);

    showAlert(
        `⚠️ ${error.message}`,
        'error'
    );
  }
}

// Cargar vacantes al abrir la página
cargarCargos();

// ==========================================================
// ENVIAR POSTULACIÓN
// ==========================================================

btnEnviar.addEventListener('click', async () => {

  // --------------------------------------------------------
  // TOMAR DATOS DEL FORMULARIO
  // --------------------------------------------------------

  const nombre = document
      .getElementById('nombre')
      .value
      .trim();

  const documento = document
      .getElementById('cedula')
      .value
      .trim();

  const correo = document
      .getElementById('email')
      .value
      .trim();

  const telefono = document
      .getElementById('telefono')
      .value
      .trim();

  const ciudad = document
      .getElementById('ciudad')
      .value
      .trim();

  const direccion = document
      .getElementById('direccion')
      .value
      .trim();

  const fechaNacimiento = document
      .getElementById('fecha_nac')
      .value;

  const experiencia = document
      .getElementById('experiencia')
      .value;

  const descripcion = document
      .getElementById('descripcion')
      .value
      .trim();

  const idVacante = Number(cargoSelect.value);

  const cargo =
      cargoSelect.options[cargoSelect.selectedIndex]
          ?.dataset.cargo || '';

  // --------------------------------------------------------
  // VALIDAR DATOS
  // --------------------------------------------------------

  if (
      !nombre ||
      !documento ||
      !correo ||
      !telefono ||
      !ciudad ||
      !direccion ||
      !fechaNacimiento ||
      !experiencia
  ) {

    showAlert(
        '⚠️ Nombre, documento, correo, teléfono, ciudad, dirección, fecha de nacimiento y experiencia son obligatorios.',
        'error'
    );

    return;
  }

  if (!idVacante || !cargo) {

    showAlert(
        '⚠️ Debes seleccionar una vacante disponible.',
        'error'
    );

    return;
  }

  // --------------------------------------------------------
  // ARCHIVOS
  // --------------------------------------------------------

  const files = [
    ['hoja_vida', 'Hoja de Vida'],
    ['cedula_doc', 'Copia de Cédula'],
    ['foto', 'Foto']
  ].map(([id, label]) => ({
    file: document.getElementById(id).files[0],
    label
  }));

  const missing = files.find(
      ({ file }) => !file
  );

  if (missing) {

    showAlert(
        `⚠️ Debes adjuntar: ${missing.label}.`,
        'error'
    );

    return;
  }

  // --------------------------------------------------------
  // TÉRMINOS
  // --------------------------------------------------------

  if (!document.getElementById('terminos').checked) {

    showAlert(
        '⚠️ Debes aceptar el tratamiento de datos personales.',
        'error'
    );

    return;
  }

  // --------------------------------------------------------
  // ENVIAR
  // --------------------------------------------------------

  try {

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    // Leer documentos
    const documentos = await Promise.all(
        files.map(({ file, label }) =>
            readFile(file).then(doc => ({
              ...doc,
              nombreArchivo:
                  `${label} - ${doc.nombreArchivo}`
            }))
        )
    );

    // ------------------------------------------------------
    // DATOS QUE RECIBE EL SERVER.JS
    // ------------------------------------------------------

    const datosPostulacion = {

      // Datos del aspirante
      nombre,
      documento,
      correo,
      telefono,
      direccion,

      // Datos adicionales
      ciudad,
      fechaNacimiento,
      experiencia,
      descripcion,

      // Vacante
      cargo,
      idVacante,

      // Documentos
      documentos
    };

    console.log(
        'Datos enviados a SIDOVI:',
        datosPostulacion
    );

    const response = await fetch(
        '/api/postulaciones',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify(
              datosPostulacion
          )
        }
    );

    const data = await response.json();

    console.log(
        'Respuesta del servidor:',
        data
    );

    if (!response.ok) {
      throw new Error(
          data.error ||
          'No fue posible registrar la postulación.'
      );
    }

    // ------------------------------------------------------
    // POSTULACIÓN EXITOSA
    // ------------------------------------------------------

    alertBox.hidden = true;

    formDiv.hidden = true;

    confirmDiv.hidden = false;

    confirmDiv.scrollIntoView({
      behavior: 'smooth'
    });

  } catch (error) {

    console.error(
        'Error enviando postulación:',
        error
    );

    showAlert(
        `⚠️ ${error.message || 'No fue posible registrar tu postulación.'}`,
        'error'
    );

  } finally {

    btnEnviar.disabled = false;

    btnEnviar.textContent =
        'Enviar Postulación';
  }
});

// ==========================================================
// LIMPIAR FORMULARIO
// ==========================================================

btnLimpiar.addEventListener('click', () => {

  [
    'nombre',
    'cedula',
    'email',
    'telefono',
    'ciudad',
    'direccion',
    'fecha_nac',
    'descripcion'
  ].forEach(id => {

    const elemento =
        document.getElementById(id);

    if (elemento) {
      elemento.value = '';
    }

  });

  cargoSelect.selectedIndex = 0;

  document.getElementById(
      'experiencia'
  ).selectedIndex = 0;

  [
    'hoja_vida',
    'cedula_doc',
    'foto'
  ].forEach(id => {

    const elemento =
        document.getElementById(id);

    if (elemento) {
      elemento.value = '';
    }

  });

  document.getElementById(
      'terminos'
  ).checked = false;

  alertBox.hidden = true;
});