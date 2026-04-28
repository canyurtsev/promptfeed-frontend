/**
 * Index Page Controller
 */
lucide.createIcons();

// Scroll Reveal Intersection Observer
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });

// Refined Scroll Transitions (Parallax & Scale)
const terminal = document.getElementById('hero-terminal');
const glow = document.getElementById('bg-parallax-glow');
const title = document.getElementById('hero-title');

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const progress = Math.min(scrollY / 600, 1); // 600px animation range

        // Terminal Animation (Grows and levels out)
        if (terminal) {
            const scale = 0.92 + (progress * 0.08); // 0.92 -> 1.0
            const rotateX = 4 - (progress * 4);     // 4deg -> 0deg
            const opacity = 0.8 + (progress * 0.2); // 0.8 -> 1.0

            terminal.style.transform = `perspective(2000px) rotateX(${rotateX}deg) scale(${scale})`;
            terminal.style.opacity = opacity;
        }

        // Glow Parallax
        if (glow) {
            glow.style.transform = `translateX(-50%) translateY(${scrollY * 0.4}px)`;
            glow.style.opacity = 1 - (progress * 0.5);
        }

        // Title subtle scale
        if (title) {
            title.style.transform = `translateY(${scrollY * 0.1}px) scale(${1 - (progress * 0.03)})`;
        }
    });
});
