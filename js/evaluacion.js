// evaluacion.js — Evaluación de candidatos
document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.nav-list').classList.toggle('open');
});

document.getElementById('btnRechazar').addEventListener('click', () => {
  const al = document.getElementById('dec-alert');
  al.textContent = '⚠️ El candidato ha sido rechazado. Se notificará al equipo de RRHH.';
  al.className   = 'form-alert error';
  al.hidden      = false;
});
