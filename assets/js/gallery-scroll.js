document.addEventListener('DOMContentLoaded', () => {

    const SPEED = 6;                            // pixels per frame
  
    // run once for every gallery-wrapper on the page
    document.querySelectorAll('.gallery-wrapper').forEach(wrapper => {
  
      const gallery = wrapper.querySelector('.gallery');
      const left    = wrapper.querySelector('.scroll-arrow.left');
      const right   = wrapper.querySelector('.scroll-arrow.right');
  
      let rafId = null;
  
      function start(dir){
        stop();
        const step = () => {
          gallery.scrollLeft += dir * SPEED;
          rafId = requestAnimationFrame(step);
        };
        rafId = requestAnimationFrame(step);
      }
      function stop(){
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
      }
  
      left .addEventListener('mouseenter', () => start(-1));
      right.addEventListener('mouseenter', () => start( 1));
      left .addEventListener('mouseleave', stop);
      right.addEventListener('mouseleave', stop);
    });
  
  });