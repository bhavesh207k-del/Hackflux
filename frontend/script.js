const card = document.getElementById('card');
document.querySelectorAll('.bar-wrap').forEach(wrap => {
  function triggerBounce(clientX, clientY) {
    const bar = wrap.querySelector('.bar');
    bar.classList.remove('bounce');
    void bar.offsetWidth;
    bar.classList.add('bounce');
    bar.addEventListener('animationend', () => bar.classList.remove('bounce'), { once: true });
    if (navigator.vibrate) navigator.vibrate([25, 10, 15]);
    const rect = card.getBoundingClientRect();
    const flash = document.createElement('div');
    flash.className = 'flash';
    const size = 80;
    flash.style.width  = size + 'px';
    flash.style.height = size + 'px';
    flash.style.left   = (clientX - rect.left - size / 2) + 'px';
    flash.style.top    = (clientY - rect.top  - size / 2) + 'px';
    card.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());
  }
  wrap.addEventListener('click', e => triggerBounce(e.clientX, e.clientY));
  wrap.addEventListener('touchstart', e => {
    e.preventDefault();
    triggerBounce(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false })