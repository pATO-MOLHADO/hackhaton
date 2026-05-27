// Tilt 3D effect para widgets premium
// Aplica leve tilt e animação ao mouse

document.querySelectorAll('.widget').forEach(widget => {
  widget.addEventListener('mousemove', e => {
    const rect = widget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const percentX = (x - centerX) / centerX;
    const percentY = (y - centerY) / centerY;
    const tiltX = percentY * 6; // máximo 6deg
    const tiltY = percentX * -6;
    widget.style.setProperty('--tilt-x', tiltY + 'deg');
    widget.style.setProperty('--tilt-y', tiltX + 'deg');
  });
  widget.addEventListener('mouseleave', () => {
    widget.style.setProperty('--tilt-x', '0deg');
    widget.style.setProperty('--tilt-y', '0deg');
  });
});

// Staggered animation para widgets
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.widget').forEach((el, i) => {
    el.style.animationDelay = (i * 0.08) + 's';
  });
});
