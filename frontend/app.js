/**
 * CV ATS Generator - Client-Side App Script
 * Manages form state, nested components, JSON synchronization, and PDF generation.
 */

// Global State
let cvData = {
  personal: {
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    github: "",
    portfolio: "",
    location: "",
  },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  achievements: [],
};

let currentPdfUrl = null;
let jsonValidationTimeout = null;
let generationCount = 0;

// Debounce helper to automatically compile PDF after typing/selection changes stop
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedGeneratePDF = debounce(() => {
  generatePDF(true);
}, 1200);

// DOM Elements
const dom = {
  body: document.body,
  btnThemeToggle: document.getElementById("btn-theme-toggle"),
  btnSave: document.getElementById("btn-save"),
  btnLoadDemo: document.getElementById("btn-load-demo"),
  btnImport: document.getElementById("btn-import"),
  fileImport: document.getElementById("file-import"),
  btnExport: document.getElementById("btn-export"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabContents: document.querySelectorAll(".tab-content"),

  // Forms
  formPersonal: document.getElementById("form-personal"),
  formSummary: document.getElementById("form-summary"),
  formDesign: document.getElementById("form-design"),

  // Lists
  experienceList: document.getElementById("experience-list"),
  educationList: document.getElementById("education-list"),
  projectList: document.getElementById("project-list"),
  skillsList: document.getElementById("skills-list"),
  certsList: document.getElementById("certs-list"),
  achievementsList: document.getElementById("achievements-list"),
  jsonEditor: document.getElementById("json-editor"),
  jsonValidationMsg: document.getElementById("json-validation-msg"),

  // Buttons for adding items
  btnAddExperience: document.getElementById("btn-add-experience"),
  btnAddEducation: document.getElementById("btn-add-education"),
  btnAddProject: document.getElementById("btn-add-project"),
  btnAddSkill: document.getElementById("btn-add-skill"),
  btnAddCert: document.getElementById("btn-add-cert"),
  btnAddAchievement: document.getElementById("btn-add-achievement"),

  // Preview Panel States
  btnGenerate: document.getElementById("btn-generate"),
  btnDownload: document.getElementById("btn-download"),
  btnOpenTab: document.getElementById("btn-open-tab"),
  btnOpenPopup: document.getElementById("btn-open-popup"),
  pdfModal: document.getElementById("pdf-modal"),
  pdfModalIframe: document.getElementById("pdf-modal-iframe"),
  btnCloseModal: document.getElementById("btn-close-modal"),
  previewStateEmpty: document.getElementById("preview-state-empty"),
  previewStateLoading: document.getElementById("preview-state-loading"),
  previewStateError: document.getElementById("preview-state-error"),
  previewStateSuccess: document.getElementById("preview-state-success"),
  pdfViewerIframe: document.getElementById("pdf-viewer-iframe"),
  errorLogText: document.getElementById("error-log-text"),
  btnCopyError: document.getElementById("btn-copy-error"),
};

// Templates
const templates = {
  experience: document.getElementById("tpl-experience-item").innerHTML,
  education: document.getElementById("tpl-education-item").innerHTML,
  project: document.getElementById("tpl-project-item").innerHTML,
  skill: document.getElementById("tpl-skill-item").innerHTML,
  cert: document.getElementById("tpl-cert-item").innerHTML,
  achievement: document.getElementById("tpl-achievement-item").innerHTML,
};

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupEventHandlers();
  loadInitialData();
});

// Theme Initialization (Dark/Light)
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark-theme";
  dom.body.className = savedTheme;
  updateThemeToggleIcons();
}

function updateThemeToggleIcons() {
  // Icons are updated via CSS showing/hiding rules
}

// Event Handlers Setup
function setupEventHandlers() {
  // Theme Toggle
  dom.btnThemeToggle.addEventListener("click", () => {
    if (dom.body.classList.contains("dark-theme")) {
      dom.body.className = "light-theme";
      localStorage.setItem("theme", "light-theme");
    } else {
      dom.body.className = "dark-theme";
      localStorage.setItem("theme", "dark-theme");
    }
    updateThemeToggleIcons();
  });

  // --- NEW: Top Navbar Mode Switcher Logic ---
  const modeButtons = document.querySelectorAll(".mode-btn");
  const contentSidebar = document.getElementById("content-sidebar");

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active state on top nav buttons
      modeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const targetMode = btn.getAttribute("data-mode");

      if (targetMode === "content") {
        // Show Sidebar, default to last active sidebar tab or personal
        contentSidebar.style.display = "flex";
        const currentActiveSidebarTab =
          document.querySelector(".tab-btn.active");
        switchTab(
          currentActiveSidebarTab
            ? currentActiveSidebarTab.getAttribute("data-tab")
            : "personal",
        );
      } else if (targetMode === "design") {
        // Hide sidebar, switch directly to design form
        contentSidebar.style.display = "none";
        switchTab("design");
      } else if (targetMode === "json") {
        // Hide sidebar, switch directly to json form
        contentSidebar.style.display = "none";
        switchTab("raw-json");
      }
    });
  });

  // Sidebar Content Tab Switcher
  dom.tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });

  // Add list items
  dom.btnAddExperience.addEventListener("click", () => addExperience());
  dom.btnAddEducation.addEventListener("click", () => addEducation());
  dom.btnAddProject.addEventListener("click", () => addProject());
  dom.btnAddSkill.addEventListener("click", () => addSkill());
  dom.btnAddCert.addEventListener("click", () => addCert());
  dom.btnAddAchievement.addEventListener("click", () => addAchievement());

  // Generate PDF
  dom.btnGenerate.addEventListener("click", () => generatePDF());

  // Open Popup Modal
  dom.btnOpenPopup.addEventListener("click", () => {
    if (currentPdfUrl) {
      dom.pdfModalIframe.src = currentPdfUrl;
      dom.pdfModal.classList.add("open");
    }
  });

  // Close Popup Modal
  dom.btnCloseModal.addEventListener("click", () => {
    dom.pdfModal.classList.remove("open");
    dom.pdfModalIframe.src = "";
  });

  dom.pdfModal.addEventListener("click", (e) => {
    if (e.target === dom.pdfModal) {
      dom.pdfModal.classList.remove("open");
      dom.pdfModalIframe.src = "";
    }
  });

  // Copy Error Log
  dom.btnCopyError.addEventListener("click", () => {
    navigator.clipboard
      .writeText(dom.errorLogText.textContent)
      .then(() => alert("Log error berhasil disalin ke clipboard."))
      .catch((err) => console.error("Gagal menyalin text: ", err));
  });

  // Save Data
  dom.btnSave.addEventListener("click", async () => {
    const isJsonTab = document
      .querySelector('.mode-btn[data-mode="json"]')
      .classList.contains("active");

    if (isJsonTab) {
      if (dom.jsonValidationMsg.className.includes("error")) {
        alert("Harap perbaiki error pada format JSON terlebih dahulu sebelum menyimpan.");
        return;
      }
      try {
        cvData = JSON.parse(dom.jsonEditor.value);
      } catch (e) {
        alert("Format JSON tidak valid!");
        return;
      }
    } else {
      collectVisualDataToState();
    }

    const originalHTML = dom.btnSave.innerHTML;
    dom.btnSave.disabled = true;
    dom.btnSave.innerHTML = `<i data-lucide="loader"></i> <span>Menyimpan...</span>`;
    lucide.createIcons();

    try {
      const response = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cvData),
      });

      if (response.ok) {
        dom.btnSave.innerHTML = `<i data-lucide="check"></i> <span>Tersimpan!</span>`;
        dom.btnSave.style.backgroundColor = "var(--success)";
        dom.btnSave.style.color = "#ffffff";
        lucide.createIcons();
        setTimeout(() => {
          dom.btnSave.innerHTML = originalHTML;
          dom.btnSave.disabled = false;
          dom.btnSave.style.backgroundColor = "";
          dom.btnSave.style.color = "";
          lucide.createIcons();
        }, 2000);
      } else {
        const errResult = await response.json();
        alert(`Gagal menyimpan: ${errResult.detail || "Kesalahan tidak diketahui"}`);
        dom.btnSave.innerHTML = originalHTML;
        dom.btnSave.disabled = false;
        lucide.createIcons();
      }
    } catch (e) {
      alert(`Error koneksi: ${e.message}`);
      dom.btnSave.innerHTML = originalHTML;
      dom.btnSave.disabled = false;
      lucide.createIcons();
    }
  });

  // Export/Import
  dom.btnExport.addEventListener("click", () => exportJSON());
  dom.btnImport.addEventListener("click", () => dom.fileImport.click());
  dom.fileImport.addEventListener("change", (e) => importJSON(e));

  // Load Demo
  dom.btnLoadDemo.addEventListener("click", () => {
    if (
      confirm(
        "Apakah Anda yakin ingin memuat data demo? Ini akan menimpa data yang sedang Anda edit saat ini.",
      )
    ) {
      loadDemoData();
    }
  });

  // Sync state on change and trigger debounced auto-rendering
  dom.formPersonal.addEventListener("input", () => {
    const formData = new FormData(dom.formPersonal);
    for (const [key, value] of formData.entries()) {
      cvData.personal[key] = value;
    }
    debouncedGeneratePDF();
  });

  dom.formSummary.addEventListener("input", () => {
    cvData.summary = document.getElementById("s-summary").value;
    debouncedGeneratePDF();
  });

  dom.formDesign.addEventListener("input", () => {
    if (!cvData.settings) cvData.settings = {};
    cvData.settings.font_family =
      document.getElementById("d-font-family").value;
    cvData.settings.font_size = document.getElementById("d-font-size").value;
    cvData.settings.margin = document.getElementById("d-margin").value;
    cvData.settings.line_spacing =
      document.getElementById("d-line-spacing").value;
    debouncedGeneratePDF();
  });

  // Watch for design change events (e.g. select dropdown selections)
  dom.formDesign.addEventListener("change", () => {
    if (!cvData.settings) cvData.settings = {};
    cvData.settings.font_family =
      document.getElementById("d-font-family").value;
    cvData.settings.font_size = document.getElementById("d-font-size").value;
    cvData.settings.margin = document.getElementById("d-margin").value;
    cvData.settings.line_spacing =
      document.getElementById("d-line-spacing").value;
    debouncedGeneratePDF();
  });

  // Watch dynamic lists for inputs (bubble) and removals (click)
  const listsToWatch = [
    dom.experienceList,
    dom.educationList,
    dom.projectList,
    dom.skillsList,
    dom.certsList,
    dom.achievementsList
  ];
  listsToWatch.forEach((list) => {
    if (list) {
      list.addEventListener("input", debouncedGeneratePDF);
      list.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-remove-item, .btn-remove-row, .btn-delete-bullet");
        if (btn) {
          debouncedGeneratePDF();
        }
      });
    }
  });

  // JSON Validation
  dom.jsonEditor.addEventListener("input", () => {
    const value = dom.jsonEditor.value.trim();
    if (!value) {
      dom.jsonValidationMsg.textContent = "Editor kosong.";
      dom.jsonValidationMsg.className = "validation-msg error";
      return;
    }

    try {
      const parsed = JSON.parse(value);
      cvData = parsed;

      if (jsonValidationTimeout) clearTimeout(jsonValidationTimeout);

      dom.jsonValidationMsg.textContent = "JSON valid. Memvalidasi skema...";
      dom.jsonValidationMsg.className = "validation-msg info";

      jsonValidationTimeout = setTimeout(async () => {
        try {
          const response = await fetch("/api/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.valid) {
              dom.jsonValidationMsg.textContent = "JSON Valid & Sesuai Skema!";
              dom.jsonValidationMsg.className = "validation-msg success";
              generatePDF(true); // Auto compile PDF once JSON schema validation succeeds
            } else {
              dom.jsonValidationMsg.textContent = `Skema Error: ${result.error}`;
              dom.jsonValidationMsg.className = "validation-msg error";
            }
          } else {
            dom.jsonValidationMsg.textContent =
              "Gagal menghubungi server validasi.";
            dom.jsonValidationMsg.className = "validation-msg error";
          }
        } catch (err) {
          dom.jsonValidationMsg.textContent =
            "Koneksi server validasi terputus.";
          dom.jsonValidationMsg.className = "validation-msg error";
        }
      }, 500);
    } catch (e) {
      dom.jsonValidationMsg.textContent = `Sintaksis JSON Error: ${e.message}`;
      dom.jsonValidationMsg.className = "validation-msg error";
    }
  });

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      generatePDF();
    }
  });
}

async function loadInitialData() {
  try {
    const response = await fetch("/api/data");
    if (response.ok) {
      const data = await response.json();
      cvData = data;
      renderAllForms();
      generatePDF();
    } else {
      console.warn("Gagal mengambil data, template kosong.");
      renderAllForms();
    }
  } catch (e) {
    console.error("Error fetching data:", e);
    renderAllForms();
  }
}

// Safely switch active classes on Tabs (Updated for Mode support)
function switchTab(tabName) {
  dom.tabButtons.forEach((btn) => btn.classList.remove("active"));
  dom.tabContents.forEach((content) => content.classList.remove("active"));

  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const activeContent = document.getElementById(`tab-${tabName}`);

  // Safely add active class (Because 'design' & 'raw-json' have no sidebar button)
  if (activeBtn) activeBtn.classList.add("active");
  if (activeContent) activeContent.classList.add("active");

  // Special sync for Raw JSON tab
  if (tabName === "raw-json") {
    collectVisualDataToState();
    dom.jsonEditor.value = JSON.stringify(cvData, null, 2);
    dom.jsonValidationMsg.textContent = "JSON Sinkron dengan Form Editor.";
    dom.jsonValidationMsg.className = "validation-msg success";
  } else {
    if (dom.jsonValidationMsg.className.includes("success")) {
      renderAllForms();
    }
  }
}

/* ==========================================================================
   Form Renderers (State -> UI)
   ========================================================================== */
function renderAllForms() {
  document.getElementById("p-name").value = cvData.personal?.name || "";
  document.getElementById("p-email").value = cvData.personal?.email || "";
  document.getElementById("p-phone").value = cvData.personal?.phone || "";
  document.getElementById("p-linkedin").value = cvData.personal?.linkedin || "";
  document.getElementById("p-github").value = cvData.personal?.github || "";
  document.getElementById("p-portfolio").value =
    cvData.personal?.portfolio || "";
  document.getElementById("p-location").value = cvData.personal?.location || "";

  document.getElementById("s-summary").value = cvData.summary || "";

  dom.experienceList.innerHTML = "";
  if (cvData.experience && Array.isArray(cvData.experience)) {
    cvData.experience.forEach((item, index) =>
      renderExperienceItem(item, index),
    );
  }

  dom.educationList.innerHTML = "";
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((item, index) => renderEducationItem(item, index));
  }

  dom.projectList.innerHTML = "";
  if (cvData.projects && Array.isArray(cvData.projects)) {
    cvData.projects.forEach((item, index) => renderProjectItem(item, index));
  }

  dom.skillsList.innerHTML = "";
  if (cvData.skills && Array.isArray(cvData.skills)) {
    cvData.skills.forEach((item, index) => renderSkillItem(item, index));
  }

  dom.certsList.innerHTML = "";
  if (cvData.certifications && Array.isArray(cvData.certifications)) {
    cvData.certifications.forEach((item, index) => renderCertItem(item, index));
  }

  dom.achievementsList.innerHTML = "";
  if (cvData.achievements && Array.isArray(cvData.achievements)) {
    cvData.achievements.forEach((item, index) =>
      renderAchievementItem(item, index),
    );
  }

  if (!cvData.settings) cvData.settings = {};
  document.getElementById("d-font-family").value =
    cvData.settings.font_family || "lmodern";
  document.getElementById("d-font-size").value =
    cvData.settings.font_size || "9pt";
  document.getElementById("d-margin").value = cvData.settings.margin || "1.2cm";
  document.getElementById("d-line-spacing").value =
    cvData.settings.line_spacing || "0.93";

  lucide.createIcons();
}

function renderExperienceItem(item, index) {
  const number = index + 1;
  let html = templates.experience
    .replace(/\${index}/g, index)
    .replace(/\${number}/g, number);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const cardNode = tempDiv.firstElementChild;

  cardNode.querySelector(".exp-title").value = item.title || "";
  cardNode.querySelector(".exp-company").value = item.company || "";
  cardNode.querySelector(".exp-location").value = item.location || "";
  cardNode.querySelector(".exp-start").value = item.start_date || "";
  cardNode.querySelector(".exp-end").value = item.end_date || "";

  cardNode.querySelector(".btn-remove-item").addEventListener("click", () => {
    cardNode.remove();
    updateIndices(dom.experienceList, "experience-card");
  });

  const bulletsContainer = cardNode.querySelector(".bullets-list");
  if (item.bullets && Array.isArray(item.bullets)) {
    item.bullets.forEach((bullet) =>
      renderBulletItem(bulletsContainer, bullet),
    );
  }

  cardNode
    .querySelector(".btn-add-simple-bullet")
    .addEventListener("click", () => renderBulletItem(bulletsContainer, ""));
  cardNode
    .querySelector(".btn-add-nested-bullet")
    .addEventListener("click", () =>
      renderBulletItem(bulletsContainer, { header: "", items: [""] }),
    );
  dom.experienceList.appendChild(cardNode);
}

function renderEducationItem(item, index) {
  const number = index + 1;
  let html = templates.education
    .replace(/\${index}/g, index)
    .replace(/\${number}/g, number);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const cardNode = tempDiv.firstElementChild;

  cardNode.querySelector(".edu-degree").value = item.degree || "";
  cardNode.querySelector(".edu-institution").value = item.institution || "";
  cardNode.querySelector(".edu-location").value = item.location || "";
  cardNode.querySelector(".edu-year").value = item.graduation_year || "";
  cardNode.querySelector(".edu-gpa").value = item.gpa || "";

  cardNode.querySelector(".btn-remove-item").addEventListener("click", () => {
    cardNode.remove();
    updateIndices(dom.educationList, "education-card");
  });
  dom.educationList.appendChild(cardNode);
}

function renderProjectItem(item, index) {
  const number = index + 1;
  let html = templates.project
    .replace(/\${index}/g, index)
    .replace(/\${number}/g, number);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const cardNode = tempDiv.firstElementChild;

  cardNode.querySelector(".proj-name").value = item.name || "";
  cardNode.querySelector(".proj-desc").value = item.description || "";
  cardNode.querySelector(".proj-tech").value = Array.isArray(item.technologies)
    ? item.technologies.join(", ")
    : item.technologies || "";
  cardNode.querySelector(".proj-link").value = item.link || "";
  cardNode.querySelector(".proj-start").value = item.start_date || "";
  cardNode.querySelector(".proj-end").value = item.end_date || "";

  cardNode.querySelector(".btn-remove-item").addEventListener("click", () => {
    cardNode.remove();
    updateIndices(dom.projectList, "project-card");
  });

  const bulletsContainer = cardNode.querySelector(".bullets-list");
  if (item.bullets && Array.isArray(item.bullets)) {
    item.bullets.forEach((bullet) =>
      renderBulletItem(bulletsContainer, bullet),
    );
  }

  cardNode
    .querySelector(".btn-add-simple-bullet")
    .addEventListener("click", () => renderBulletItem(bulletsContainer, ""));
  cardNode
    .querySelector(".btn-add-nested-bullet")
    .addEventListener("click", () =>
      renderBulletItem(bulletsContainer, { header: "", items: [""] }),
    );
  dom.projectList.appendChild(cardNode);
}

function renderSkillItem(item, index) {
  const number = index + 1;
  let html = templates.skill
    .replace(/\${index}/g, index)
    .replace(/\${number}/g, number);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const cardNode = tempDiv.firstElementChild;

  cardNode.querySelector(".skill-name").value = item.name || "";
  cardNode.querySelector(".skill-items").value = Array.isArray(item.items)
    ? item.items.join(", ")
    : item.items || "";

  cardNode.querySelector(".btn-remove-item").addEventListener("click", () => {
    cardNode.remove();
    updateIndices(dom.skillsList, "skill-card");
  });
  dom.skillsList.appendChild(cardNode);
}

function renderCertItem(item, index) {
  let html = templates.cert.replace(/\${index}/g, index);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const rowNode = tempDiv.firstElementChild;

  rowNode.querySelector(".cert-name").value = item.name || "";
  rowNode.querySelector(".cert-issuer").value = item.issuer || "";
  rowNode.querySelector(".cert-year").value = item.year || "";

  rowNode.querySelector(".btn-remove-row").addEventListener("click", () => {
    rowNode.remove();
    updateIndices(dom.certsList, "cert-item");
  });
  dom.certsList.appendChild(rowNode);
}

function renderAchievementItem(item, index) {
  const number = index + 1;
  let html = templates.achievement
    .replace(/\${index}/g, index)
    .replace(/\${number}/g, number);
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const cardNode = tempDiv.firstElementChild;

  cardNode.querySelector(".ach-title").value = item.title || "";
  cardNode.querySelector(".ach-organizer").value = item.organizer || "";
  cardNode.querySelector(".ach-date").value = item.date || "";

  cardNode.querySelector(".btn-remove-item").addEventListener("click", () => {
    cardNode.remove();
    updateIndices(dom.achievementsList, "achievement-card");
  });

  const bulletsContainer = cardNode.querySelector(".bullets-list");
  if (item.bullets && Array.isArray(item.bullets)) {
    item.bullets.forEach((bullet) =>
      renderBulletItem(bulletsContainer, bullet, true),
    );
  }

  cardNode
    .querySelector(".btn-add-simple-bullet")
    .addEventListener("click", () =>
      renderBulletItem(bulletsContainer, "", true),
    );
  dom.achievementsList.appendChild(cardNode);
}

function renderBulletItem(container, bulletData, forceSimple = false) {
  const isNested =
    !forceSimple &&
    typeof bulletData === "object" &&
    bulletData !== null &&
    "header" in bulletData;

  if (isNested) {
    const nestedCard = document.createElement("div");
    nestedCard.className = "bullet-item nested-bullet-card";
    nestedCard.innerHTML = `
            <div style="display:flex; gap:10px; width:100%;">
                <input type="text" class="nested-header-input" required placeholder="Grup Kategori (e.g., Tools, Deskripsi)" style="flex:1;">
                <button type="button" class="btn-delete-bullet" title="Hapus Grup"><i data-lucide="trash-2"></i></button>
            </div>
            <div class="sub-bullets-list"></div>
            <button type="button" class="btn btn-secondary btn-xs btn-add-sub-bullet"><i data-lucide="plus"></i> Sub-Poin</button>
        `;

    nestedCard.querySelector(".nested-header-input").value =
      bulletData.header || "";
    const subList = nestedCard.querySelector(".sub-bullets-list");

    if (bulletData.items && Array.isArray(bulletData.items)) {
      bulletData.items.forEach((subText) =>
        renderSubBulletInput(subList, subText),
      );
    } else {
      renderSubBulletInput(subList, "");
    }

    nestedCard
      .querySelector(".btn-add-sub-bullet")
      .addEventListener("click", () => renderSubBulletInput(subList, ""));
    nestedCard
      .querySelector(".btn-delete-bullet")
      .addEventListener("click", () => nestedCard.remove());
    container.appendChild(nestedCard);
  } else {
    const bulletRow = document.createElement("div");
    bulletRow.className = "bullet-item simple-bullet-row";
    bulletRow.innerHTML = `
            <span class="bullet-drag-handle">&bull;</span>
            <input type="text" class="bullet-input" required placeholder="Tuliskan poin pencapaian...">
            <button type="button" class="btn-delete-bullet" title="Hapus Poin"><i data-lucide="x"></i></button>
        `;
    bulletRow.querySelector(".bullet-input").value =
      typeof bulletData === "string" ? bulletData : "";
    bulletRow
      .querySelector(".btn-delete-bullet")
      .addEventListener("click", () => bulletRow.remove());
    container.appendChild(bulletRow);
  }
  lucide.createIcons();
}

function renderSubBulletInput(container, text) {
  const subRow = document.createElement("div");
  subRow.className = "sub-bullet-item";
  subRow.innerHTML = `
        <span class="bullet-drag-handle" style="font-size:0.75rem;">&bull;</span>
        <input type="text" class="sub-bullet-input" required placeholder="Sub-poin detail...">
        <button type="button" class="btn-delete-bullet" title="Hapus"><i data-lucide="x"></i></button>
    `;
  subRow.querySelector(".sub-bullet-input").value = text;
  subRow
    .querySelector(".btn-delete-bullet")
    .addEventListener("click", () => subRow.remove());
  container.appendChild(subRow);
  lucide.createIcons();
}

function updateIndices(container, cardClass) {
  const cards = container.querySelectorAll(`.${cardClass}`);
  cards.forEach((card, index) => {
    card.setAttribute("data-index", index);
    const titleLabel = card.querySelector(".card-title-label");
    if (titleLabel) {
      const prefix = titleLabel.textContent.split("#");
      titleLabel.textContent = `${prefix}#${index + 1}`;
    }
  });
}

function addExperience() {
  const newIdx = dom.experienceList.querySelectorAll(".experience-card").length;
  renderExperienceItem(
    {
      title: "",
      company: "",
      location: "",
      start_date: "",
      end_date: "",
      bullets: [""],
    },
    newIdx,
  );
  dom.experienceList.lastElementChild.scrollIntoView({ behavior: "smooth" });
}
function addEducation() {
  const newIdx = dom.educationList.querySelectorAll(".education-card").length;
  renderEducationItem(
    { degree: "", institution: "", location: "", graduation_year: "" },
    newIdx,
  );
  dom.educationList.lastElementChild.scrollIntoView({ behavior: "smooth" });
}
function addProject() {
  const newIdx = dom.projectList.querySelectorAll(".project-card").length;
  renderProjectItem(
    {
      name: "",
      description: "",
      technologies: [],
      link: "",
      start_date: "",
      end_date: "",
      bullets: [""],
    },
    newIdx,
  );
  dom.projectList.lastElementChild.scrollIntoView({ behavior: "smooth" });
}
function addSkill() {
  const newIdx = dom.skillsList.querySelectorAll(".skill-card").length;
  renderSkillItem({ name: "", items: [] }, newIdx);
  dom.skillsList.lastElementChild.scrollIntoView({ behavior: "smooth" });
}
function addCert() {
  const newIdx = dom.certsList.querySelectorAll(".cert-item").length;
  renderCertItem({ name: "", issuer: "", year: "" }, newIdx);
}
function addAchievement() {
  const newIdx =
    dom.achievementsList.querySelectorAll(".achievement-card").length;
  renderAchievementItem(
    { title: "", organizer: "", date: "", bullets: [""] },
    newIdx,
  );
  dom.achievementsList.lastElementChild.scrollIntoView({ behavior: "smooth" });
}

function collectVisualDataToState() {
  cvData.personal = {
    name: document.getElementById("p-name").value,
    email: document.getElementById("p-email").value,
    phone: document.getElementById("p-phone").value,
    linkedin: document.getElementById("p-linkedin").value,
    github: document.getElementById("p-github").value,
    portfolio: document.getElementById("p-portfolio").value,
    location: document.getElementById("p-location").value,
  };
  for (const key in cvData.personal)
    if (!cvData.personal[key]) delete cvData.personal[key];

  cvData.summary = document.getElementById("s-summary").value;
  if (!cvData.summary) delete cvData.summary;

  cvData.experience = [];
  dom.experienceList.querySelectorAll(".experience-card").forEach((card) => {
    const item = {
      title: card.querySelector(".exp-title").value,
      company: card.querySelector(".exp-company").value,
      location: card.querySelector(".exp-location").value || undefined,
      start_date: card.querySelector(".exp-start").value,
      end_date: card.querySelector(".exp-end").value,
      bullets: [],
    };
    if (!item.location) delete item.location;
    Array.from(card.querySelector(".bullets-list").children).forEach((el) => {
      if (el.classList.contains("simple-bullet-row")) {
        const text = el.querySelector(".bullet-input").value.trim();
        if (text) item.bullets.push(text);
      } else if (el.classList.contains("nested-bullet-card")) {
        const header = el.querySelector(".nested-header-input").value.trim();
        const subBullets = Array.from(el.querySelectorAll(".sub-bullet-input"))
          .map((i) => i.value.trim())
          .filter((i) => i);
        if (header && subBullets.length > 0)
          item.bullets.push({ header: header, items: subBullets });
      }
    });
    if (item.bullets.length === 0) delete item.bullets;
    if (item.title && item.company) cvData.experience.push(item);
  });

  cvData.education = [];
  dom.educationList.querySelectorAll(".education-card").forEach((card) => {
    const item = {
      degree: card.querySelector(".edu-degree").value,
      institution: card.querySelector(".edu-institution").value,
      location: card.querySelector(".edu-location").value || undefined,
      graduation_year: card.querySelector(".edu-year").value,
      gpa: card.querySelector(".edu-gpa").value.trim() || undefined,
    };
    if (!item.location) delete item.location;
    if (!item.gpa) delete item.gpa;
    if (item.degree && item.institution) cvData.education.push(item);
  });

  cvData.projects = [];
  dom.projectList.querySelectorAll(".project-card").forEach((card) => {
    const techStr = card.querySelector(".proj-tech").value;
    const item = {
      name: card.querySelector(".proj-name").value,
      description: card.querySelector(".proj-desc").value,
      technologies: techStr
        ? techStr
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t)
        : [],
      link: card.querySelector(".proj-link").value || null,
      start_date: card.querySelector(".proj-start").value || undefined,
      end_date: card.querySelector(".proj-end").value || undefined,
      bullets: [],
    };
    if (!item.link) delete item.link;
    if (!item.start_date) delete item.start_date;
    if (!item.end_date) delete item.end_date;
    Array.from(card.querySelector(".bullets-list").children).forEach((el) => {
      if (el.classList.contains("simple-bullet-row")) {
        const text = el.querySelector(".bullet-input").value.trim();
        if (text) item.bullets.push(text);
      } else if (el.classList.contains("nested-bullet-card")) {
        const header = el.querySelector(".nested-header-input").value.trim();
        const subBullets = Array.from(el.querySelectorAll(".sub-bullet-input"))
          .map((i) => i.value.trim())
          .filter((i) => i);
        if (header && subBullets.length > 0)
          item.bullets.push({ header: header, items: subBullets });
      }
    });
    if (item.bullets.length === 0) delete item.bullets;
    if (item.name && item.description) cvData.projects.push(item);
  });

  cvData.skills = [];
  dom.skillsList.querySelectorAll(".skill-card").forEach((card) => {
    const name = card.querySelector(".skill-name").value;
    const itemsStr = card.querySelector(".skill-items").value;
    const items = itemsStr
      ? itemsStr
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i)
      : [];
    if (name && items.length > 0)
      cvData.skills.push({ name: name, items: items });
  });

  cvData.certifications = [];
  dom.certsList.querySelectorAll(".cert-item").forEach((row) => {
    const name = row.querySelector(".cert-name").value;
    const issuer = row.querySelector(".cert-issuer").value || undefined;
    const year = row.querySelector(".cert-year").value || undefined;
    if (name) {
      const item = { name: name };
      if (issuer) item.issuer = issuer;
      if (year) item.year = year;
      cvData.certifications.push(item);
    }
  });
  if (cvData.certifications.length === 0) delete cvData.certifications;

  cvData.achievements = [];
  dom.achievementsList.querySelectorAll(".achievement-card").forEach((card) => {
    const item = {
      title: card.querySelector(".ach-title").value,
      organizer: card.querySelector(".ach-organizer").value,
      date: card.querySelector(".ach-date").value,
      bullets: [],
    };
    card
      .querySelector(".bullets-list")
      .querySelectorAll(".bullet-input")
      .forEach((input) => {
        const text = input.value.trim();
        if (text) item.bullets.push(text);
      });
    if (item.bullets.length === 0) delete item.bullets;
    if (item.title && item.organizer) cvData.achievements.push(item);
  });
  if (cvData.achievements.length === 0) delete cvData.achievements;

  cvData.settings = {
    font_family: document.getElementById("d-font-family").value,
    font_size: document.getElementById("d-font-size").value,
    margin: document.getElementById("d-margin").value,
    line_spacing: document.getElementById("d-line-spacing").value,
  };
}

async function generatePDF(isAuto = false) {
  const isJsonTab = document
    .querySelector('.mode-btn[data-mode="json"]')
    .classList.contains("active");

  if (isJsonTab) {
    if (dom.jsonValidationMsg.className.includes("error")) {
      if (!isAuto) {
        alert(
          "Harap perbaiki error pada format JSON terlebih dahulu sebelum men-generate PDF.",
        );
      }
      return;
    }
    try {
      cvData = JSON.parse(dom.jsonEditor.value);
    } catch (e) {
      if (!isAuto) {
        alert("Format JSON tidak valid!");
      }
      return;
    }
  } else {
    collectVisualDataToState();
  }

  showPreviewState("loading");

  // Keep track of the current request sequence to avoid race conditions
  generationCount++;
  const thisGenId = generationCount;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cvData),
    });

    // If a newer compilation request has already started, ignore this one
    if (thisGenId !== generationCount) return;

    if (response.ok) {
      const blob = await response.blob();
      if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
      currentPdfUrl = URL.createObjectURL(blob);

      dom.pdfViewerIframe.src = currentPdfUrl + "#toolbar=0&navpanes=0";
      dom.btnDownload.href = currentPdfUrl;
      dom.btnDownload.classList.remove("disabled");
      dom.btnOpenTab.href = currentPdfUrl;
      dom.btnOpenTab.classList.remove("disabled");
      dom.btnOpenPopup.classList.remove("disabled");
      showPreviewState("success");
    } else {
      const errorResult = await response.json();
      dom.errorLogText.textContent =
        errorResult.detail || "Kesalahan kompilasi tidak diketahui.";
      dom.btnDownload.classList.add("disabled");
      dom.btnDownload.removeAttribute("href");
      dom.btnOpenTab.classList.add("disabled");
      dom.btnOpenTab.removeAttribute("href");
      dom.btnOpenPopup.classList.add("disabled");
      showPreviewState("error");
    }
  } catch (e) {
    if (thisGenId !== generationCount) return;
    dom.errorLogText.textContent = `Error Koneksi Backend:\n${e.message}`;
    dom.btnDownload.classList.add("disabled");
    dom.btnDownload.removeAttribute("href");
    dom.btnOpenTab.classList.add("disabled");
    dom.btnOpenTab.removeAttribute("href");
    dom.btnOpenPopup.classList.add("disabled");
    showPreviewState("error");
  }
}

function showPreviewState(state) {
  dom.previewStateEmpty.style.display = "none";
  dom.previewStateLoading.style.display = "none";
  dom.previewStateError.style.display = "none";
  dom.previewStateSuccess.style.display = "none";

  if (state === "empty") dom.previewStateEmpty.style.display = "flex";
  if (state === "loading") dom.previewStateLoading.style.display = "flex";
  if (state === "error") dom.previewStateError.style.display = "flex";
  if (state === "success") dom.previewStateSuccess.style.display = "flex";
}

function exportJSON() {
  collectVisualDataToState();
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(cvData, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "cv_data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSON(event) {
  const file = event.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importedData),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.valid) {
          cvData = importedData;
          renderAllForms();
          const isJsonTab = document
            .querySelector('.mode-btn[data-mode="json"]')
            .classList.contains("active");
          if (isJsonTab) dom.jsonEditor.value = JSON.stringify(cvData, null, 2);
          generatePDF();
          alert("Data CV berhasil di-impor!");
        } else alert(`Data tidak sesuai skema.\n\n${result.error}`);
      } else alert("Gagal menghubungi server validasi.");
    } catch (err) {
      alert("Gagal membaca file JSON.");
    }
  };
  reader.readAsText(file);
  dom.fileImport.value = "";
}

async function loadDemoData() {
  try {
    const response = await fetch("/api/data");
    cvData = response.ok ? await response.json() : getClientDemoData();
    renderAllForms();
    const isJsonTab = document
      .querySelector('.mode-btn[data-mode="json"]')
      .classList.contains("active");
    if (isJsonTab) dom.jsonEditor.value = JSON.stringify(cvData, null, 2);
    generatePDF();
    alert("Data demo berhasil dimuat!");
  } catch (e) {
    cvData = getClientDemoData();
    renderAllForms();
    const isJsonTab = document
      .querySelector('.mode-btn[data-mode="json"]')
      .classList.contains("active");
    if (isJsonTab) dom.jsonEditor.value = JSON.stringify(cvData, null, 2);
    generatePDF();
    alert("Data demo fallback berhasil dimuat.");
  }
}

function getClientDemoData() {
  return {
    personal: {
      name: "Budi Santoso",
      email: "budi.santoso@example.com",
      phone: "+62 812-3456-7890",
      linkedin: "https://linkedin.com/in/budisantoso",
      location: "Jakarta, Indonesia",
    },
    summary: "Software Engineer berpengalaman...",
    experience: [
      {
        title: "Software Engineer",
        company: "PT Solusi",
        start_date: "Jan 2023",
        end_date: "Sekarang",
        bullets: ["Poin 1"],
      },
    ],
    education: [
      {
        degree: "S1 Teknik Informatika",
        institution: "Universitas Indonesia",
        graduation_year: "2022",
        gpa: "3.80/4.00",
      },
    ],
    projects: [
      {
        name: "ATS Resume Builder",
        description: "Web App",
        technologies: ["React"],
        link: "https://github.com",
        bullets: ["Poin 1"],
      },
    ],
    skills: [{ name: "Bahasa Pemrograman", items: ["Python", "JS"] }],
    certifications: [
      { name: "AWS Certified Developer", issuer: "Amazon", year: "2024" },
    ],
    achievements: [
      {
        title: "Juara 1",
        organizer: "Organisasi",
        date: "2023",
        bullets: ["Poin 1"],
      },
    ],
  };
}
