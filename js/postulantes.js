// ==========================================================
// SIDOVI - Gestión de Postulantes
// ==========================================================

const title = document.getElementById('tituloLista');
const search = document.getElementById('buscar');
const statusFilter = document.getElementById('filtroEstado');
const cargoFilter = document.getElementById('filtroCargo');

const modal = document.getElementById('candidateModal');
const form = document.getElementById('candidateForm');
const body = document.getElementById('postulantesBody');

const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');

let postulaciones = [];

// ==========================================================
// MENÚ
// ==========================================================

document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.querySelector('.nav-list')?.classList.toggle('open');
});

// ==========================================================
// EVENTOS DE FILTROS
// ==========================================================

search?.addEventListener('input', render);
statusFilter?.addEventListener('change', render);
cargoFilter?.addEventListener('change', render);

modalClose?.addEventListener('click', closeModal);
modalCancel?.addEventListener('click', closeModal);

// ==========================================================
// FUNCIONES AUXILIARES
// ==========================================================

function escapeHtml(value = '') {

  const div = document.createElement('div');

  div.textContent = value ?? '';

  return div.innerHTML;
}


function normalizar(value = '') {

  return String(value)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
}


// Convierte estados de PostgreSQL a texto legible
function estadoTexto(estado = '') {

  const estados = {

    EN_REVISION: 'En revisión',
    APROBADO_RRHH: 'Aprobado RRHH',
    RECHAZADO_RRHH: 'Rechazado RRHH',
    ENTREVISTA: 'Entrevista',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
    CONTRATADO: 'Contratado'

  };

  return estados[estado] || estado.replaceAll('_', ' ');
}


// Clase visual del estado
function badgeClass(status = '') {

  const value = normalizar(status);

  if (
      value.includes('aprobado') ||
      value.includes('contratado')
  ) {
    return 'badge-aprobado';
  }

  if (
      value.includes('rechazado') ||
      value.includes('cancelado')
  ) {
    return 'badge-rechazado';
  }

  if (value.includes('entrevista')) {
    return 'badge-entrevista';
  }

  return 'badge-pendiente';
}


// Formatear fecha
function formatearFecha(fecha) {

  if (!fecha) {
    return '-';
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return fecha;
  }

  return date.toLocaleDateString('es-CO');
}


// ==========================================================
// RENDERIZAR TABLA
// ==========================================================

function render() {

  const query = normalizar(
      search?.value || ''
  );

  const state = normalizar(
      statusFilter?.value || ''
  );

  const cargo = normalizar(
      cargoFilter?.value || ''
  );


  const rows = postulaciones.filter((p) => {

    const textoBusqueda = normalizar(`
      ${p.nombre_completo || ''}
      ${p.numero_documento || ''}
      ${p.cargo || ''}
      ${p.correo || ''}
      ${p.telefono || ''}
    `);

    const estado = normalizar(
        p.estado || ''
    );

    const cargoPostulacion = normalizar(
        p.cargo || ''
    );


    const coincideBusqueda =
        !query ||
        textoBusqueda.includes(query);


    const coincideEstado =
        !state ||
        estado.includes(state) ||
        normalizar(
            estadoTexto(p.estado)
        ).includes(state);


    const coincideCargo =
        !cargo ||
        cargoPostulacion.includes(cargo);


    return (
        coincideBusqueda &&
        coincideEstado &&
        coincideCargo
    );

  });


  title.textContent =
      `Lista de Postulantes (${rows.length})`;


  if (!rows.length) {

    body.innerHTML = `
      <tr>
        <td colspan="6">
          No hay postulaciones para mostrar.
        </td>
      </tr>
    `;

    return;
  }


  body.innerHTML = rows.map((p) => {

    const estado = p.estado || 'EN_REVISION';

    return `

      <tr class="postulante-row">

        <td>
          ${escapeHtml(p.nombre_completo)}
        </td>

        <td>
          ${escapeHtml(p.numero_documento)}
        </td>

        <td>
          ${escapeHtml(p.cargo || 'Sin cargo')}
        </td>

        <td>
          ${formatearFecha(p.fecha_postulacion)}
        </td>

        <td>
          <span class="badge ${badgeClass(estado)}">
            ${escapeHtml(estadoTexto(estado))}
          </span>
        </td>

        <td style="display:flex;gap:.4rem;flex-wrap:wrap">

          <select
            class="estado-editor"
            data-id="${p.id_postulacion}"
            aria-label="Cambiar estado"
          >

            <option value="EN_REVISION"
              ${estado === 'EN_REVISION' ? 'selected' : ''}>
              En revisión
            </option>

            <option value="APROBADO_RRHH"
              ${estado === 'APROBADO_RRHH' ? 'selected' : ''}>
              Aprobado RRHH
            </option>

            <option value="RECHAZADO_RRHH"
              ${estado === 'RECHAZADO_RRHH' ? 'selected' : ''}>
              Rechazado RRHH
            </option>

            <option value="ENTREVISTA"
              ${estado === 'ENTREVISTA' ? 'selected' : ''}>
              Entrevista
            </option>

            <option value="APROBADO"
              ${estado === 'APROBADO' ? 'selected' : ''}>
              Aprobado
            </option>

            <option value="RECHAZADO"
              ${estado === 'RECHAZADO' ? 'selected' : ''}>
              Rechazado
            </option>

            <option value="CONTRATADO"
              ${estado === 'CONTRATADO' ? 'selected' : ''}>
              Contratado
            </option>

          </select>


          <button
            class="btn-xs btn-xs-green guardar-estado"
            data-id="${p.id_postulacion}"
            type="button"
          >
            Estado
          </button>


          <button
            class="btn-xs btn-xs-blue editar"
            data-id="${p.id_postulacion}"
            type="button"
          >
            Editar
          </button>


          <button
            class="btn-xs btn-xs-red eliminar"
            data-id="${p.id_postulacion}"
            type="button"
          >
            Eliminar
          </button>

        </td>

      </tr>

    `;

  }).join('');
}


// ==========================================================
// CARGAR POSTULACIONES
// ==========================================================

async function loadPostulaciones() {

  try {

    body.innerHTML = `
      <tr>
        <td colspan="6">
          Cargando postulaciones...
        </td>
      </tr>
    `;


    const response =
        await fetch('/api/postulaciones');


    const data =
        await response.json();


    if (!response.ok) {

      throw new Error(
          data.error ||
          'No fue posible cargar las postulaciones.'
      );

    }


    postulaciones =
        Array.isArray(data)
            ? data
            : data.postulaciones || [];


    render();

  } catch (error) {

    console.error(
        'Error cargando postulaciones:',
        error
    );


    body.innerHTML = `
      <tr>
        <td colspan="6">
          No fue posible cargar los datos de PostgreSQL.
          <br>
          <small>
            ${escapeHtml(error.message)}
          </small>
        </td>
      </tr>
    `;

  }

}


// ==========================================================
// PETICIONES AL SERVIDOR
// ==========================================================

async function request(url, options = {}) {

  const response =
      await fetch(url, options);


  let data = {};

  try {
    data =
        response.status === 204
            ? {}
            : await response.json();
  } catch {
    data = {};
  }


  if (!response.ok) {

    throw new Error(
        data.error ||
        'No fue posible guardar el cambio.'
    );

  }


  return data;
}


// ==========================================================
// MODAL
// ==========================================================

function closeModal() {

  modal.hidden = true;

  form?.reset();

}


function openModal(candidate) {

  document.getElementById(
      'editPostulacionId'
  ).value =
      candidate.id_postulacion || '';


  document.getElementById(
      'editNombre'
  ).value =
      candidate.nombre_completo || '';


  document.getElementById(
      'editDocumento'
  ).value =
      candidate.numero_documento || '';


  document.getElementById(
      'editCorreo'
  ).value =
      candidate.correo || '';


  document.getElementById(
      'editTelefono'
  ).value =
      candidate.telefono || '';


  document.getElementById(
      'editDireccion'
  ).value =
      candidate.direccion || '';


  document.getElementById(
      'editCargo'
  ).value =
      candidate.cargo || '';


  modal.hidden = false;


  document.getElementById(
      'editNombre'
  ).focus();

}


// ==========================================================
// BOTONES DE LA TABLA
// ==========================================================

body.addEventListener(
    'click',
    async (event) => {

      const button =
          event.target.closest('button');


      if (!button) {
        return;
      }


      const id =
          button.dataset.id;


      const candidate =
          postulaciones.find(
              p =>
                  String(p.id_postulacion) ===
                  String(id)
          );


      if (!candidate) {
        return;
      }


      try {

        // ----------------------------------------------------
        // EDITAR
        // ----------------------------------------------------

        if (
            button.classList.contains('editar')
        ) {

          openModal(candidate);

          return;
        }


        // ----------------------------------------------------
        // ELIMINAR
        // ----------------------------------------------------

        if (
            button.classList.contains('eliminar')
        ) {

          const confirmar =
              confirm(
                  `¿Eliminar a ${candidate.nombre_completo} y sus registros relacionados?`
              );


          if (!confirmar) {
            return;
          }


          await request(
              `/api/postulaciones/${id}`,
              {
                method: 'DELETE'
              }
          );


          await loadPostulaciones();

          return;
        }


        // ----------------------------------------------------
        // GUARDAR ESTADO
        // ----------------------------------------------------

        if (
            button.classList.contains(
                'guardar-estado'
            )
        ) {

          const select =
              body.querySelector(
                  `.estado-editor[data-id="${id}"]`
              );


          if (!select) {
            return;
          }


          const estado =
              select.value;


          await request(
              `/api/postulaciones/${id}`,
              {
                method: 'PATCH',

                headers: {
                  'Content-Type':
                      'application/json'
                },

                body: JSON.stringify({
                  estado
                })
              }
          );


          candidate.estado =
              estado;


          render();

        }

      } catch (error) {

        console.error(
            'Error:',
            error
        );


        alert(
            error.message ||
            'No fue posible completar la operación.'
        );

      }

    }
);


// ==========================================================
// GUARDAR EDICIÓN DEL CANDIDATO
// ==========================================================

form.addEventListener(
    'submit',
    async (event) => {

      event.preventDefault();


      const id =
          document.getElementById(
              'editPostulacionId'
          ).value;


      if (!id) {

        alert(
            'No se encontró el ID de la postulación.'
        );

        return;
      }


      const nombre =
          document.getElementById(
              'editNombre'
          ).value.trim();


      const documento =
          document.getElementById(
              'editDocumento'
          ).value.trim();


      const correo =
          document.getElementById(
              'editCorreo'
          ).value.trim();


      const telefono =
          document.getElementById(
              'editTelefono'
          ).value.trim();


      const direccion =
          document.getElementById(
              'editDireccion'
          ).value.trim();


      const cargo =
          document.getElementById(
              'editCargo'
          ).value.trim();


      // ------------------------------------------------------
      // VALIDACIÓN
      // ------------------------------------------------------

      if (
          !nombre ||
          !documento ||
          !correo ||
          !telefono ||
          !direccion
      ) {

        alert(
            'Nombre, cédula, correo, teléfono y dirección son obligatorios.'
        );

        return;
      }


      const submitButton =
          form.querySelector(
              'button[type="submit"]'
          );


      try {

        if (submitButton) {

          submitButton.disabled = true;

          submitButton.textContent =
              'Guardando...';

        }


        // ----------------------------------------------------
        // ACTUALIZAR DATOS DEL ASPIRANTE
        // ----------------------------------------------------

        await request(
            `/api/postulaciones/${id}/datos`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                    'application/json'
              },

              body: JSON.stringify({

                nombre,
                documento,
                correo,
                telefono,
                direccion,

                // Se manda para compatibilidad.
                // El servidor puede ignorarlo
                // si el cargo no se modifica desde aquí.
                cargo

              })
            }
        );


        closeModal();


        await loadPostulaciones();


      } catch (error) {

        console.error(
            'Error actualizando candidato:',
            error
        );


        alert(
            error.message ||
            'No fue posible actualizar el candidato.'
        );

      } finally {

        if (submitButton) {

          submitButton.disabled = false;

          submitButton.textContent =
              'Guardar cambios';

        }

      }

    }
);


// ==========================================================
// CERRAR MODAL AL HACER CLICK AFUERA
// ==========================================================

modal.addEventListener(
    'click',
    (event) => {

      if (
          event.target === modal
      ) {

        closeModal();

      }

    }
);


// ==========================================================
// ESC PARA CERRAR
// ==========================================================

document.addEventListener(
    'keydown',
    (event) => {

      if (
          event.key === 'Escape' &&
          !modal.hidden
      ) {

        closeModal();

      }

    }
);


// ==========================================================
// INICIAR
// ==========================================================

loadPostulaciones();