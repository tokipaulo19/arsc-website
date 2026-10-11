const projects = document.querySelectorAll('.project');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08 });
  projects.forEach((project) => observer.observe(project));
} else {
  projects.forEach((project) => project.classList.add('visible'));
}
