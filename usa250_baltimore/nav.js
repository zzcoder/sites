document.addEventListener("click", (event) => {
  const activeMenu = document.querySelector(".mobile-nav[open]");
  if (!activeMenu) return;

  const navLink = event.target.closest(".mobile-nav nav a");
  if (navLink) {
    activeMenu.removeAttribute("open");
    return;
  }

  if (!event.target.closest(".mobile-nav")) {
    activeMenu.removeAttribute("open");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  document.querySelectorAll(".mobile-nav[open]").forEach((menu) => {
    menu.removeAttribute("open");
  });
});
