"use strict";

const App = (() => {
    const STORAGE_KEY = "movieDekhi.email";
    const I18N_KEY = "movieDekhi.language";
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const state = {
        sessionUser: null,
        pendingAuthAction: null,
        authGateEnabled: false
    };

    const TRANSLATIONS = {
        en: {
            languageButton: "English",
            signIn: "Sign In",
            signUp: "Sign Up",
            signOut: "Sign Out",
            myAccount: "My Account",
            heroTitle: "Unlimited movies, TV shows, and more",
            heroSubtitle: "Starts at USD 2.99. Cancel anytime.",
            heroPrompt: "Ready to watch? Enter your email to create or restart your membership.",
            getStarted: "Get Started",
            faqTitle: "Frequently Asked Questions"
        },
        ar: {
            languageButton: "العربية",
            signIn: "تسجيل الدخول",
            signUp: "إنشاء حساب",
            signOut: "تسجيل الخروج",
            myAccount: "حسابي",
            heroTitle: "أفلام ومسلسلات وغير ذلك بلا حدود",
            heroSubtitle: "تبدأ الخطط من 2.99 دولار. يمكنك الإلغاء في أي وقت.",
            heroPrompt: "جاهز للمشاهدة؟ أدخل بريدك الإلكتروني لإنشاء عضويتك أو إعادة تفعيلها.",
            getStarted: "ابدأ الآن",
            faqTitle: "الأسئلة الشائعة"
        }
    };

    const getElements = () => ({
        brandLink: document.querySelector(".brand"),
        form: document.getElementById("ctaForm"),
        emailInput: document.getElementById("emailInput"),
        emailFeedback: document.getElementById("emailFeedback"),
        faqTriggers: Array.from(document.querySelectorAll(".faq-trigger")),
        languageToggle: document.getElementById("languageToggle"),
        signInBtn: document.getElementById("signInBtn"),
        signUpBtn: document.getElementById("signUpBtn"),
        heroTitle: document.getElementById("hero-title"),
        heroSubtitle: document.querySelector(".hero-subtitle"),
        heroPrompt: document.querySelector("#main-content p:not(.hero-subtitle)"),
        getStartedBtn: document.querySelector("#ctaForm button[type='submit']"),
        faqTitle: document.getElementById("faq-title"),
        authModal: document.getElementById("authModal"),
        closeAuthModal: document.getElementById("closeAuthModal"),
        authTitle: document.getElementById("authTitle"),
        authPrompt: document.getElementById("authPrompt"),
        authFeedback: document.getElementById("authFeedback"),
        tabSignIn: document.getElementById("tabSignIn"),
        tabSignUp: document.getElementById("tabSignUp"),
        panelSignIn: document.getElementById("panelSignIn"),
        panelSignUp: document.getElementById("panelSignUp"),
        signInForm: document.getElementById("signInForm"),
        signUpForm: document.getElementById("signUpForm"),
        signInEmail: document.getElementById("signInEmail"),
        signInPassword: document.getElementById("signInPassword"),
        signUpEmail: document.getElementById("signUpEmail"),
        signUpPassword: document.getElementById("signUpPassword"),
        signUpConfirm: document.getElementById("signUpConfirm"),
        toast: document.getElementById("uiToast"),
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
    const validatePassword = (value) => typeof value === "string" && value.length >= 8;
    const isBlank = (value) => !value || !value.trim();
    const getLanguage = () => safeStorage.get(I18N_KEY) || "en";
    const setLanguage = (value) => safeStorage.set(I18N_KEY, value);

    const setFeedback = (el, message, type) => {
        if (!el) return;
        el.textContent = message;
        el.classList.remove("success", "error");
        if (type) el.classList.add(type);
    };

    const apiRequest = async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                },
                ...options
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || "Request failed.");
            return data;
        } catch (error) {
            if (error instanceof TypeError) {
                throw new Error("Backend server is not reachable. Run npm start and open http://localhost:3000");
            }
            throw error;
        }
    };

    const fetchSession = async () => {
        try {
            const data = await apiRequest("/api/auth/session", { method: "GET" });
            state.sessionUser = data.authenticated ? data.userEmail : null;
        } catch (_error) {
            state.sessionUser = null;
        }
    };

    let toastTimer = null;
    const showToast = (toastEl, message) => {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add("is-visible");
        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toastEl.classList.remove("is-visible"), 2200);
    };

    const updateAuthButtons = (elements) => {
        const t = TRANSLATIONS[getLanguage()] || TRANSLATIONS.en;
        if (!elements.signInBtn || !elements.signUpBtn) return;
        if (state.sessionUser) {
            elements.signInBtn.textContent = t.myAccount;
            elements.signUpBtn.textContent = t.signOut;
        } else {
            elements.signInBtn.textContent = t.signIn;
            elements.signUpBtn.textContent = t.signUp;
        }
    };

    const applyLanguage = (elements, lang) => {
        const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
        document.documentElement.lang = lang === "ar" ? "ar" : "en";
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
        if (elements.languageToggle) {
            elements.languageToggle.textContent = t.languageButton;
            elements.languageToggle.setAttribute("aria-pressed", String(lang === "ar"));
        }
        if (elements.heroTitle) elements.heroTitle.textContent = t.heroTitle;
        if (elements.heroSubtitle) elements.heroSubtitle.textContent = t.heroSubtitle;
        if (elements.heroPrompt) elements.heroPrompt.textContent = t.heroPrompt;
        if (elements.getStartedBtn) elements.getStartedBtn.textContent = t.getStarted;
        if (elements.faqTitle) elements.faqTitle.textContent = t.faqTitle;
        setLanguage(lang);
        updateAuthButtons(elements);
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

    let modalTransitionTimer = null;
    let closingInProgress = false;
    const openAuthModal = (elements, mode) => {
        if (!elements.authModal || closingInProgress) return;
        if (modalTransitionTimer) window.clearTimeout(modalTransitionTimer);
        const isSignIn = mode === "signin";
        elements.tabSignIn?.classList.toggle("is-active", isSignIn);
        elements.tabSignUp?.classList.toggle("is-active", !isSignIn);
        elements.tabSignIn?.setAttribute("aria-selected", String(isSignIn));
        elements.tabSignUp?.setAttribute("aria-selected", String(!isSignIn));
        if (elements.panelSignIn) elements.panelSignIn.hidden = !isSignIn;
        if (elements.panelSignUp) elements.panelSignUp.hidden = isSignIn;
        if (elements.authTitle) elements.authTitle.textContent = isSignIn ? "Sign In" : "Sign Up";
        if (elements.authPrompt) elements.authPrompt.textContent = isSignIn ? "Please sign in before continuing." : "Create an account to continue.";
        setFeedback(elements.authFeedback, "", null);
        elements.authModal.hidden = false;
        elements.authModal.classList.remove("is-closing");
        window.requestAnimationFrame(() => elements.authModal.classList.add("is-open"));
        document.body.style.overflow = "hidden";
        const targetInput = isSignIn ? elements.signInEmail : elements.signUpEmail;
        if (targetInput) window.setTimeout(() => targetInput.focus(), 0);
    };

    const closeAuthModal = (elements, callback) => {
        if (!elements.authModal) return;
        if (state.authGateEnabled && !state.sessionUser) return;
        if (closingInProgress) return;
        closingInProgress = true;
        elements.authModal.classList.remove("is-open");
        elements.authModal.classList.add("is-closing");
        const finish = () => {
            elements.authModal.hidden = true;
            elements.authModal.classList.remove("is-closing");
            document.body.style.overflow = "";
            setFeedback(elements.authFeedback, "", null);
            closingInProgress = false;
            if (typeof callback === "function") callback();
        };
        modalTransitionTimer = window.setTimeout(finish, 260);
    };

    const redirectToMain = () => {
        const target = document.getElementById("main-content");
        if (!target) return;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
            history.replaceState(null, "", "#main-content");
        } catch (_error) {
            window.location.hash = "main-content";
        }
    };

    const runPendingAuthAction = () => {
        if (typeof state.pendingAuthAction !== "function") return;
        const action = state.pendingAuthAction;
        state.pendingAuthAction = null;
        action();
    };

    const requireAuth = (elements, mode, action) => {
        if (state.sessionUser) {
            action();
            return;
        }
        state.pendingAuthAction = action;
        openAuthModal(elements, mode);
    };

    const setFormBusy = (form, busy, label) => {
        const controls = Array.from(form.querySelectorAll("button, input"));
        controls.forEach((control) => {
            control.disabled = busy;
        });
        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) {
            if (!submitButton.dataset.defaultLabel) submitButton.dataset.defaultLabel = submitButton.textContent || "";
            submitButton.textContent = busy ? label : submitButton.dataset.defaultLabel;
        }
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
            setFeedback(elements.emailFeedback, "Email saved. Continue to authentication.", "success");
            elements.emailInput.value = "";
            if (!state.sessionUser) {
                showToast(elements.toast, "Authentication required.");
                requireAuth(elements, "signin", () => setFeedback(elements.emailFeedback, "You are now logged in and can continue.", "success"));
            }
        });
    };

    const initAuth = (elements) => {
        if (!elements.signInBtn || !elements.signUpBtn || !elements.authModal) return;
        updateAuthButtons(elements);
        elements.authModal.hidden = true;
        elements.authModal.classList.remove("is-open", "is-closing");

        elements.signInBtn.addEventListener("click", () => {
            if (state.sessionUser) {
                showToast(elements.toast, `Signed in as ${state.sessionUser}`);
                redirectToMain();
                return;
            }
            openAuthModal(elements, "signin");
        });

        elements.signUpBtn.addEventListener("click", async () => {
            if (!state.sessionUser) {
                openAuthModal(elements, "signup");
                return;
            }
            try {
                await apiRequest("/api/auth/signout", { method: "POST" });
            } catch (_error) {
                // Keep local state clear even if request fails.
            }
            state.sessionUser = null;
            updateAuthButtons(elements);
            showToast(elements.toast, "Signed out successfully.");
            state.authGateEnabled = true;
            if (elements.closeAuthModal) elements.closeAuthModal.hidden = true;
            setFeedback(elements.authFeedback, "Session ended. Please sign in or sign up.", "error");
            openAuthModal(elements, "signin");
        });

        elements.tabSignIn?.addEventListener("click", () => openAuthModal(elements, "signin"));
        elements.tabSignUp?.addEventListener("click", () => openAuthModal(elements, "signup"));
        elements.closeAuthModal?.addEventListener("click", () => closeAuthModal(elements));
        elements.authModal.addEventListener("click", (event) => {
            if (event.target === elements.authModal) closeAuthModal(elements);
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !elements.authModal.hidden) closeAuthModal(elements);
        });

        elements.signUpForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = normalizeEmail(elements.signUpEmail?.value || "");
            const password = elements.signUpPassword?.value || "";
            const confirm = elements.signUpConfirm?.value || "";
            if (isBlank(email) || isBlank(password) || isBlank(confirm)) return setFeedback(elements.authFeedback, "All fields are required.", "error");
            if (!validateEmail(email)) return setFeedback(elements.authFeedback, "Enter a valid email for sign up.", "error");
            if (!validatePassword(password)) return setFeedback(elements.authFeedback, "Password must be at least 8 characters.", "error");
            if (password !== confirm) return setFeedback(elements.authFeedback, "Passwords do not match.", "error");

            setFormBusy(elements.signUpForm, true, "Creating...");
            try {
                const data = await apiRequest("/api/auth/signup", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });
                state.sessionUser = data.userEmail || email;
                state.authGateEnabled = false;
                if (elements.closeAuthModal) elements.closeAuthModal.hidden = false;
                updateAuthButtons(elements);
                setFeedback(elements.authFeedback, "Account created successfully.", "success");
                closeAuthModal(elements, () => {
                    redirectToMain();
                    runPendingAuthAction();
                });
            } catch (error) {
                setFeedback(elements.authFeedback, error.message, "error");
            } finally {
                setFormBusy(elements.signUpForm, false, "");
            }
        });

        elements.signInForm?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = normalizeEmail(elements.signInEmail?.value || "");
            const password = elements.signInPassword?.value || "";
            if (isBlank(email) || isBlank(password)) return setFeedback(elements.authFeedback, "Email and password are required.", "error");
            if (!validateEmail(email)) return setFeedback(elements.authFeedback, "Enter a valid email for sign in.", "error");
            if (!validatePassword(password)) return setFeedback(elements.authFeedback, "Password must be at least 8 characters.", "error");

            setFormBusy(elements.signInForm, true, "Signing in...");
            try {
                const data = await apiRequest("/api/auth/signin", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                });
                state.sessionUser = data.userEmail || email;
                state.authGateEnabled = false;
                if (elements.closeAuthModal) elements.closeAuthModal.hidden = false;
                updateAuthButtons(elements);
                setFeedback(elements.authFeedback, "Sign in successful.", "success");
                closeAuthModal(elements, () => {
                    redirectToMain();
                    runPendingAuthAction();
                });
            } catch (error) {
                setFeedback(elements.authFeedback, error.message, "error");
            } finally {
                setFormBusy(elements.signInForm, false, "");
            }
        });
    };

    const initNavActions = (elements) => {
        elements.languageToggle?.addEventListener("click", () => {
            const next = getLanguage() === "ar" ? "en" : "ar";
            applyLanguage(elements, next);
            showToast(elements.toast, next === "ar" ? "تم التبديل إلى العربية." : "Language switched to English.");
        });
        elements.brandLink?.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.reload();
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

    const init = async () => {
        const elements = getElements();
        await fetchSession();
        initAuth(elements);
        initForm(elements);
        initFaq(elements);
        initNavActions(elements);
        initLinks(elements);
        applyLanguage(elements, getLanguage());
        if (!state.sessionUser && elements.authModal && elements.closeAuthModal) {
            state.authGateEnabled = true;
            elements.closeAuthModal.hidden = true;
            setFeedback(elements.authFeedback, "Please sign in or sign up to access the page.", "error");
            openAuthModal(elements, "signin");
        } else if (elements.closeAuthModal) {
            state.authGateEnabled = false;
            elements.closeAuthModal.hidden = false;
        }
    };

    return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
    App.init().catch(() => null);
});
