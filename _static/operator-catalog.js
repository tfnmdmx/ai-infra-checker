(function () {
  "use strict";

  function initCatalog() {
    const root = document.querySelector("[data-quality-catalog]");
    if (!root) return;

    const rows = Array.from(root.querySelectorAll(".catalog-row"));
    const query = root.querySelector("[data-catalog-query]");
    const modality = root.querySelector("[data-catalog-modality]");
    const domain = root.querySelector("[data-catalog-domain]");
    const stage = root.querySelector("[data-catalog-stage]");
    const artifact = root.querySelector("[data-catalog-artifact]");
    const summary = root.querySelector("[data-catalog-summary]");
    const body = root.querySelector("tbody");
    const controls = { q: query, modality, domain, stage, artifact };
    const reviewStorageKey = "fm-quality-operator.reviewed-rules.v1";
    const currentRuleIds = new Set(rows.map(function (row) { return row.dataset.ruleId; }));

    function loadReviewedRules() {
      try {
        const stored = JSON.parse(window.localStorage.getItem(reviewStorageKey) || "[]");
        if (!Array.isArray(stored)) return new Set();
        return new Set(stored.filter(function (ruleId) { return currentRuleIds.has(ruleId); }));
      } catch (_error) {
        return new Set();
      }
    }

    const reviewedRules = loadReviewedRules();

    function saveReviewedRules() {
      try {
        window.localStorage.setItem(reviewStorageKey, JSON.stringify(Array.from(reviewedRules)));
      } catch (_error) {
        // Checking still works for this page view when browser storage is unavailable.
      }
    }

    function updateSummary() {
      const visible = rows.filter(function (row) {
        return !row.classList.contains("is-hidden");
      }).length;
      summary.textContent =
        "显示 " + visible + " / " + rows.length + " 个质检算子 · 已核对 " +
        reviewedRules.size + " / " + rows.length;
    }

    rows.forEach(function (row) {
      const checkbox = row.querySelector("[data-catalog-reviewed]");
      const ruleId = row.dataset.ruleId;
      checkbox.checked = reviewedRules.has(ruleId);
      row.classList.toggle("is-reviewed", checkbox.checked);
      checkbox.addEventListener("change", function () {
        if (checkbox.checked) reviewedRules.add(ruleId);
        else reviewedRules.delete(ruleId);
        row.classList.toggle("is-reviewed", checkbox.checked);
        saveReviewedRules();
        updateSummary();
      });
    });

    const initialParams = new URLSearchParams(window.location.search);
    Object.entries(controls).forEach(function ([name, control]) {
      const requested = initialParams.get(name);
      if (requested === null) return;
      if (control === query || Array.from(control.options).some((option) => option.value === requested)) {
        control.value = requested;
      }
    });
    function updateUrl() {
      const url = new URL(window.location.href);
      url.searchParams.delete("control");
      url.searchParams.delete("coverage");
      url.searchParams.delete("kind");
      url.searchParams.delete("lifecycle");
      Object.entries(controls).forEach(function ([name, control]) {
        if (control.value) url.searchParams.set(name, control.value);
        else url.searchParams.delete(name);
      });
      window.history.replaceState(null, "", url);
    }

    function searchRank(row, needle) {
      if (!needle) return 3;
      const ruleId = row.dataset.ruleId;
      if (ruleId === needle) return 0;
      if (ruleId.startsWith(needle)) return 1;
      return 2;
    }

    function applyFilters() {
      const needle = query.value.trim().toLocaleLowerCase();
      rows.forEach(function (row) {
        const matches =
          (!needle || row.dataset.search.includes(needle)) &&
          (!modality.value || row.dataset.modality === modality.value) &&
          (!domain.value || row.dataset.domain === domain.value) &&
          (!stage.value || row.dataset.stage === stage.value) &&
          (!artifact.value || row.dataset.artifact === artifact.value);
        row.classList.toggle("is-hidden", !matches);
      });
      rows
        .slice()
        .sort(function (left, right) {
          return searchRank(left, needle) - searchRank(right, needle);
        })
        .forEach(function (row) {
          body.appendChild(row);
        });
      updateSummary();
      updateUrl();
    }

    Object.values(controls).forEach(function (control) {
      control.addEventListener(control === query ? "input" : "change", applyFilters);
    });
    document.addEventListener("keydown", function (event) {
      const element = event.target;
      const isEditing =
        element instanceof HTMLElement &&
        (element.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName));
      const shortcut =
        event.key === "/" ||
        ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k");
      if (!isEditing && !event.altKey && shortcut) {
        event.preventDefault();
        query.focus();
      }
    });
    applyFilters();
  }

  document.addEventListener("DOMContentLoaded", initCatalog);
})();
