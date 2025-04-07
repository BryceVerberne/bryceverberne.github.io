document.addEventListener('DOMContentLoaded', () => {
    const gallery    = document.getElementById('media-gallery');
    const leftArrow  = document.querySelector('.scroll-arrow.left');
    const rightArrow = document.querySelector('.scroll-arrow.right');
  
    const SPEED = 6; 
    let rafId   = null;
  
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
  
    leftArrow .addEventListener('mouseenter', () => start(-1));
    rightArrow.addEventListener('mouseenter', () => start( 1));
    leftArrow .addEventListener('mouseleave', stop);
    rightArrow.addEventListener('mouseleave', stop);
  });