"use strict";

const App = (() => {
    const STORAGE_KEY = "movieDekhi.email";
    const I18N_KEY = "movieDekhi.language";
    const THEME_KEY = "movieDekhi.theme";
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const TRANSLATIONS = {
        en: {
            languageButton: "English",
            themeDark: "Dark",
            themeLight: "Light",
            primaryButton: "Projects",
            secondaryButton: "Contact",
            heroTitle: "Frontend Portfolio Style Netflix Clone",
            heroSubtitle: "Static HTML, CSS, and JavaScript only.",
            heroPrompt: "Enter your email if you want updates on this project.",
            getStarted: "Save Email",
            faqTitle: "Frequently Asked Questions"
        },
        ar: {
            languageButton: "العربية",
            themeDark: "داكن",
            themeLight: "فاتح",
            primaryButton: "المشاريع",
            secondaryButton: "تواصل",
            heroTitle: "واجهة أمامية بأسلوب بورتفوليو",
            heroSubtitle: "موقع ثابت باستخدام HTML و CSS و JavaScript فقط.",
            heroPrompt: "أدخل بريدك الإلكتروني إذا أردت متابعة تحديثات المشروع.",
            getStarted: "حفظ البريد",
            faqTitle: "الأسئلة الشائعة"
        }
    };

    const getElements = () => ({
        topNav: document.querySelector(".top-nav"),
        brandLink: document.querySelector(".brand"),
        form: document.getElementById("ctaForm"),
        emailInput: document.getElementById("emailInput"),
        emailFeedback: document.getElementById("emailFeedback"),
        faqTriggers: Array.from(document.querySelectorAll(".faq-trigger")),
        revealBlocks: Array.from(document.querySelectorAll(".reveal")),
        languageToggle: document.getElementById("languageToggle"),
        themeToggle: document.getElementById("themeToggle"),
        signInBtn: document.getElementById("signInBtn"),
        signUpBtn: document.getElementById("signUpBtn"),
        heroTitle: document.getElementById("hero-title"),
        heroSubtitle: document.querySelector(".hero-subtitle"),
        heroPrompt: document.querySelector("#main-content p:not(.hero-subtitle)"),
        getStartedBtn: document.querySelector("#ctaForm button[type='submit']"),
        faqTitle: document.getElementById("faq-title"),
        toast: document.getElementById("uiToast"),
        backToTop: document.getElementById("backToTop"),
        currentYear: document.getElementById("currentYear"),
        links: Array.from(document.querySelectorAll("a[href^='#']"))
    });

    const safeStorage = {
        get(key) {
            try {
                return window.localStorage.getItem(key);
            } catch (_error) {
                return null;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(key, value);
                return true;
            } catch (_error) {
                return false;
            }
        }
    };

    const normalizeEmail = (value) => value.trim().toLowerCase();
    const validateEmail = (email) => EMAIL_REGEX.test(email);
    const getLanguage = () => safeStorage.get(I18N_KEY) || "en";
    const setLanguage = (value) => safeStorage.set(I18N_KEY, value);
    const getTheme = () => safeStorage.get(THEME_KEY) || "dark";
    const setTheme = (value) => safeStorage.set(THEME_KEY, value);

    const setFeedback = (el, message, type) => {
        if (!el) return;
        el.textContent = message;
        el.classList.remove("success", "error");
        if (type) el.classList.add(type);
    };

    let toastTimer = null;
    const showToast = (toastEl, message) => {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add("is-visible");
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
    };

    const applyLanguage = (elements, lang) => {
        const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
        const activeTheme = getTheme();
        document.documentElement.lang = lang === "ar" ? "ar" : "en";
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        if (elements.languageToggle) {
            elements.languageToggle.textContent = t.languageButton;
            elements.languageToggle.setAttribute("aria-pressed", String(lang === "ar"));
        }
        if (elements.themeToggle) {
            elements.themeToggle.textContent = activeTheme === "light" ? t.themeLight : t.themeDark;
        }
        if (elements.signInBtn) elements.signInBtn.textContent = t.primaryButton;
        if (elements.signUpBtn) elements.signUpBtn.textContent = t.secondaryButton;
        if (elements.heroTitle) elements.heroTitle.textContent = t.heroTitle;
        if (elements.heroSubtitle) elements.heroSubtitle.textContent = t.heroSubtitle;
        if (elements.heroPrompt) elements.heroPrompt.textContent = t.heroPrompt;
        if (elements.getStartedBtn) elements.getStartedBtn.textContent = t.getStarted;
        if (elements.faqTitle) elements.faqTitle.textContent = t.faqTitle;
        setLanguage(lang);
    };

    const applyTheme = (elements, theme) => {
        const nextTheme = theme === "light" ? "light" : "dark";
        const lang = getLanguage();
        const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
        document.documentElement.setAttribute("data-theme", nextTheme);
        if (elements.themeToggle) {
            elements.themeToggle.textContent = nextTheme === "light" ? t.themeLight : t.themeDark;
            elements.themeToggle.setAttribute("aria-pressed", String(nextTheme === "light"));
        }
        setTheme(nextTheme);
    };

    const initFaq = (elements) => {
        elements.faqTriggers.forEach((button) => {
            button.addEventListener("click", () => {
                const expanded = button.getAttribute("aria-expanded") === "true";
                elements.faqTriggers.forEach((trigger) => {
                    const panelId = trigger.getAttribute("aria-controls");
                    const panel = panelId ? document.getElementById(panelId) : null;
                    trigger.setAttribute("aria-expanded", "false");
                    trigger.closest(".faq-item")?.classList.remove("is-open");
                    if (panel) panel.style.maxHeight = "0";
                });
                if (!expanded) {
                    const panelId = button.getAttribute("aria-controls");
                    const panel = panelId ? document.getElementById(panelId) : null;
                    button.setAttribute("aria-expanded", "true");
                    button.closest(".faq-item")?.classList.add("is-open");
                    if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
                }
            });
        });
    };

    const initForm = (elements) => {
        if (!elements.form || !elements.emailInput || !elements.emailFeedback) return;
        const storedEmail = safeStorage.get(STORAGE_KEY);
        if (storedEmail && validateEmail(storedEmail)) elements.emailInput.value = storedEmail;

        elements.form.addEventListener("submit", (event) => {
            event.preventDefault();
            const normalized = normalizeEmail(elements.emailInput.value);
            if (!validateEmail(normalized)) {
                setFeedback(elements.emailFeedback, "Please enter a valid email address.", "error");
                elements.emailInput.focus();
                return;
            }
            safeStorage.set(STORAGE_KEY, normalized);
            setFeedback(elements.emailFeedback, "Email saved in your browser.", "success");
            showToast(elements.toast, "Saved successfully.");
            elements.emailInput.value = "";
        });
    };

    const initRevealAnimations = (elements) => {
        if (!("IntersectionObserver" in window)) {
            elements.revealBlocks.forEach((section) => section.classList.add("is-visible"));
            return;
        }

        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                instance.unobserve(entry.target);
            });
        }, { threshold: 0.12 });

        elements.revealBlocks.forEach((section) => observer.observe(section));
    };

    const initScrollUI = (elements) => {
        const onScroll = () => {
            const y = window.scrollY || document.documentElement.scrollTop;
            elements.topNav?.classList.toggle("is-scrolled", y > 20);
            elements.backToTop?.classList.toggle("is-visible", y > 420);
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        elements.backToTop?.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    };

    const initNavActions = (elements) => {
        elements.languageToggle?.addEventListener("click", () => {
            const next = getLanguage() === "ar" ? "en" : "ar";
            applyLanguage(elements, next);
            showToast(elements.toast, next === "ar" ? "تم التبديل إلى العربية." : "Language switched to English.");
        });
        elements.themeToggle?.addEventListener("click", () => {
            const nextTheme = getTheme() === "light" ? "dark" : "light";
            applyTheme(elements, nextTheme);
            showToast(elements.toast, nextTheme === "light" ? "Light mode enabled." : "Dark mode enabled.");
        });

        elements.brandLink?.addEventListener("click", (event) => {
            event.preventDefault();
            const target = document.getElementById("main-content");
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        elements.signInBtn?.addEventListener("click", () => {
            const target = document.querySelector(".feature-grid");
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        elements.signUpBtn?.addEventListener("click", () => {
            const target = document.querySelector(".footer-container");
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

    };

    const initLinks = (elements) => {
        elements.links.forEach((link) => {
            link.addEventListener("click", (event) => {
                const hash = link.getAttribute("href");
                if (!hash || hash === "#") {
                    event.preventDefault();
                    return;
                }
                const target = document.querySelector(hash);
                if (!target) return;
                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    };

    const init = () => {
        const elements = getElements();
        const preferredTheme = getTheme();
        applyTheme(elements, preferredTheme);
        if (elements.currentYear) elements.currentYear.textContent = String(new Date().getFullYear());
        initForm(elements);
        initFaq(elements);
        initRevealAnimations(elements);
        initScrollUI(elements);
        initNavActions(elements);
        initLinks(elements);
        applyLanguage(elements, getLanguage());
    };

    return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});
