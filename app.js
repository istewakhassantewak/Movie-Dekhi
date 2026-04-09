"use strict";

const App = (() => {
    const STORAGE_KEY = "netflixClone.email";
    const USERS_KEY = "netflixClone.authUsers";
    const SESSION_KEY = "netflixClone.session";
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const I18N_KEY = "netflixClone.language";
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
        },
        remove(key) {
            try {
                window.localStorage.removeItem(key);
            } catch (_error) {
                // Do nothing on restricted storage.
            }
        }
    };

    const normalizeEmail = (value) => value.trim().toLowerCase();

    const validateEmail = (email) => EMAIL_REGEX.test(email);

    const setFeedback = (el, message, type) => {
        if (!el) return;
        el.textContent = message;
        el.classList.remove("success", "error");
        if (type) {
            el.classList.add(type);
        }
    };

    const parseJson = (value, fallback) => {
        if (!value) return fallback;
        try {
            const parsed = JSON.parse(value);
            return parsed ?? fallback;
        } catch (_error) {
            return fallback;
        }
    };

    const encode = (value) => new TextEncoder().encode(value);
    const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
    const randomSalt = () => window.crypto.getRandomValues(new Uint8Array(16));
    const weakHash = (value) => {
        let hash = 5381;
        for (let index = 0; index < value.length; index += 1) {
            hash = (hash * 33) ^ value.charCodeAt(index);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    };

    const hashPassword = async (password, saltHex) => {
        if (!window.crypto?.subtle) {
            return weakHash(`${saltHex}:${password}`);
        }

        const digest = await window.crypto.subtle.digest("SHA-256", encode(`${saltHex}:${password}`));
        return toHex(digest);
    };

    const getUsers = () => parseJson(safeStorage.get(USERS_KEY), []);
    const setUsers = (users) => safeStorage.set(USERS_KEY, JSON.stringify(users));

    let toastTimer = null;
    const showToast = (toastEl, message) => {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.add("is-visible");

        if (toastTimer) {
            window.clearTimeout(toastTimer);
        }
        toastTimer = window.setTimeout(() => {
            toastEl.classList.remove("is-visible");
        }, 2200);
    };

    const initForm = (elements) => {
        const { form, emailInput, emailFeedback, toast } = elements;
        if (!form || !emailInput || !emailFeedback) return;

        const storedEmail = safeStorage.get(STORAGE_KEY);
        if (storedEmail && validateEmail(storedEmail)) {
            emailInput.value = storedEmail;
            setFeedback(emailFeedback, "Saved email loaded.", "success");
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const normalized = normalizeEmail(emailInput.value);
            if (!validateEmail(normalized)) {
                setFeedback(emailFeedback, "Please enter a valid email address.", "error");
                emailInput.setAttribute("aria-invalid", "true");
                emailInput.focus();
                return;
            }

            emailInput.removeAttribute("aria-invalid");
            const saved = safeStorage.set(STORAGE_KEY, normalized);

            if (saved) {
                setFeedback(emailFeedback, "You're all set. Check your inbox for next steps.", "success");
                showToast(toast, "Email saved securely in this browser.");
                emailInput.value = "";
            } else {
                setFeedback(emailFeedback, "Email is valid, but browser storage is unavailable.", "error");
                showToast(toast, "Could not save in local storage.");
            }
        });

        emailInput.addEventListener("input", () => {
            if (emailInput.hasAttribute("aria-invalid")) {
                emailInput.removeAttribute("aria-invalid");
            }
            if (emailFeedback.textContent) {
                setFeedback(emailFeedback, "", null);
            }
        });
    };

    const closeFaqItem = (button) => {
        const panelId = button.getAttribute("aria-controls");
        if (!panelId) return;
        const panel = document.getElementById(panelId);
        const item = button.closest(".faq-item");
        button.setAttribute("aria-expanded", "false");
        if (panel) {
            panel.style.maxHeight = "0";
        }
        if (item) {
            item.classList.remove("is-open");
        }
    };

    const openFaqItem = (button) => {
        const panelId = button.getAttribute("aria-controls");
        if (!panelId) return;
        const panel = document.getElementById(panelId);
        const item = button.closest(".faq-item");
        button.setAttribute("aria-expanded", "true");
        if (panel) {
            panel.style.maxHeight = `${panel.scrollHeight}px`;
        }
        if (item) {
            item.classList.add("is-open");
        }
    };

    const initFaq = (elements) => {
        if (!elements.faqTriggers.length) return;

        elements.faqTriggers.forEach((button) => {
            button.addEventListener("click", () => {
                const expanded = button.getAttribute("aria-expanded") === "true";
                elements.faqTriggers.forEach((trigger) => {
                    if (trigger !== button) {
                        closeFaqItem(trigger);
                    }
                });
                if (expanded) {
                    closeFaqItem(button);
                } else {
                    openFaqItem(button);
                }
            });
        });
    };

    const activateTab = (elements, mode) => {
        const isSignIn = mode === "signin";
        if (!elements.tabSignIn || !elements.tabSignUp || !elements.panelSignIn || !elements.panelSignUp || !elements.authTitle || !elements.authPrompt) {
            return;
        }

        elements.tabSignIn.classList.toggle("is-active", isSignIn);
        elements.tabSignUp.classList.toggle("is-active", !isSignIn);

        elements.tabSignIn.setAttribute("aria-selected", String(isSignIn));
        elements.tabSignUp.setAttribute("aria-selected", String(!isSignIn));

        elements.panelSignIn.hidden = !isSignIn;
        elements.panelSignUp.hidden = isSignIn;

        elements.authTitle.textContent = isSignIn ? "Sign In" : "Sign Up";
        elements.authPrompt.textContent = isSignIn
            ? "Please sign in before continuing."
            : "Create an account to continue.";
        setFeedback(elements.authFeedback, "", null);
    };

    const setFormBusy = (form, busy, label) => {
        if (!form) return;
        const controls = Array.from(form.querySelectorAll("button, input"));
        controls.forEach((control) => {
            control.disabled = busy;
        });
        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) {
            if (!submitButton.dataset.defaultLabel) {
                submitButton.dataset.defaultLabel = submitButton.textContent || "";
            }
            submitButton.textContent = busy ? label : submitButton.dataset.defaultLabel;
        }
    };

    const isBlank = (value) => !value || !value.trim();
    const validatePassword = (value) => typeof value === "string" && value.length >= 8;

    let modalTransitionTimer = null;
    let closingInProgress = false;
    let authGateEnabled = false;
    const openAuthModal = (elements, mode) => {
        if (!elements.authModal) return;
        if (closingInProgress) return;
        if (modalTransitionTimer) {
            window.clearTimeout(modalTransitionTimer);
            modalTransitionTimer = null;
        }
        activateTab(elements, mode);
        elements.authModal.hidden = false;
        elements.authModal.classList.remove("is-closing");
        window.requestAnimationFrame(() => {
            elements.authModal.classList.add("is-open");
        });
        document.body.style.overflow = "hidden";

        const targetInput = mode === "signin" ? elements.signInEmail : elements.signUpEmail;
        if (targetInput) {
            window.setTimeout(() => targetInput.focus(), 0);
        }
    };

    const closeAuthModal = (elements, callback) => {
        if (!elements.authModal) return;
        if (authGateEnabled && !getSessionUser()) return;
        if (closingInProgress) return;
        closingInProgress = true;

        elements.authModal.classList.remove("is-open");
        elements.authModal.classList.add("is-closing");

        let done = false;
        const finalize = () => {
            if (done) return;
            done = true;
            elements.authModal.hidden = true;
            elements.authModal.classList.remove("is-closing");
            document.body.style.overflow = "";
            setFeedback(elements.authFeedback, "", null);
            closingInProgress = false;
            if (typeof callback === "function") {
                callback();
            }
        };

        const modalCard = elements.authModal.querySelector(".auth-modal");
        if (modalCard) {
            const onTransitionEnd = () => {
                modalCard.removeEventListener("transitionend", onTransitionEnd);
                if (modalTransitionTimer) {
                    window.clearTimeout(modalTransitionTimer);
                    modalTransitionTimer = null;
                }
                finalize();
            };
            modalCard.addEventListener("transitionend", onTransitionEnd, { once: true });
            modalTransitionTimer = window.setTimeout(finalize, 260);
        } else {
            finalize();
        }
    };

    const redirectToMain = () => {
        const target = document.getElementById("main-content");
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            try {
                history.replaceState(null, "", "#main-content");
            } catch (_error) {
                window.location.hash = "main-content";
            }
        }
    };

    const getSessionUser = () => safeStorage.get(SESSION_KEY);
    const clearSession = () => safeStorage.remove(SESSION_KEY);
    const getLanguage = () => safeStorage.get(I18N_KEY) || "en";
    const setLanguage = (value) => safeStorage.set(I18N_KEY, value);
    let pendingAuthAction = null;

    const runPendingAuthAction = () => {
        if (typeof pendingAuthAction !== "function") return;
        const action = pendingAuthAction;
        pendingAuthAction = null;
        action();
    };

    const requireAuth = (elements, preferredMode, action) => {
        const sessionUser = getSessionUser();
        if (sessionUser) {
            action();
            return true;
        }
        pendingAuthAction = action;
        openAuthModal(elements, preferredMode);
        return false;
    };

    const updateAuthButtons = (elements) => {
        const lang = getLanguage();
        const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
        const sessionUser = getSessionUser();
        if (!elements.signInBtn || !elements.signUpBtn) return;
        if (sessionUser) {
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

    const initAuth = (elements) => {
        const { signInBtn, signUpBtn, closeAuthModal: closeBtn, authModal, tabSignIn, tabSignUp, toast } = elements;
        if (!signInBtn || !signUpBtn || !authModal || !tabSignIn || !tabSignUp) return;
        authModal.hidden = true;
        authModal.classList.remove("is-open", "is-closing");
        updateAuthButtons(elements);

        signInBtn.addEventListener("click", () => {
            const sessionUser = getSessionUser();
            if (sessionUser) {
                showToast(toast, `Signed in as ${sessionUser}`);
                redirectToMain();
                return;
            }
            openAuthModal(elements, "signin");
        });

        signUpBtn.addEventListener("click", () => {
            const sessionUser = getSessionUser();
            if (sessionUser) {
                clearSession();
                updateAuthButtons(elements);
                showToast(toast, "Signed out successfully.");
                authGateEnabled = true;
                if (elements.closeAuthModal) {
                    elements.closeAuthModal.hidden = true;
                }
                setFeedback(elements.authFeedback, "Session ended. Please sign in or sign up.", "error");
                openAuthModal(elements, "signin");
                return;
            }
            openAuthModal(elements, "signup");
        });

        tabSignIn.addEventListener("click", () => activateTab(elements, "signin"));
        tabSignUp.addEventListener("click", () => activateTab(elements, "signup"));

        if (closeBtn) {
            closeBtn.addEventListener("click", () => closeAuthModal(elements));
        }

        authModal.addEventListener("click", (event) => {
            if (event.target === authModal) {
                closeAuthModal(elements);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !authModal.hidden) {
                closeAuthModal(elements);
            }
        });

        if (elements.signUpForm && elements.signUpEmail && elements.signUpPassword && elements.signUpConfirm && elements.authFeedback) {
            elements.signUpForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (elements.signUpForm.dataset.busy === "true") return;

                const email = normalizeEmail(elements.signUpEmail.value);
                const password = elements.signUpPassword.value;
                const confirm = elements.signUpConfirm.value;

                if (isBlank(email) || isBlank(password) || isBlank(confirm)) {
                    setFeedback(elements.authFeedback, "All fields are required.", "error");
                    return;
                }
                if (!validateEmail(email)) {
                    setFeedback(elements.authFeedback, "Enter a valid email for sign up.", "error");
                    elements.signUpEmail.focus();
                    return;
                }
                if (!validatePassword(password)) {
                    setFeedback(elements.authFeedback, "Password must be at least 8 characters.", "error");
                    elements.signUpPassword.focus();
                    return;
                }
                if (password !== confirm) {
                    setFeedback(elements.authFeedback, "Passwords do not match.", "error");
                    elements.signUpConfirm.focus();
                    return;
                }

                const users = getUsers();
                const exists = users.some((user) => user.email === email);
                if (exists) {
                    setFeedback(elements.authFeedback, "Account already exists. Please sign in.", "error");
                    activateTab(elements, "signin");
                    elements.signInEmail?.focus();
                    return;
                }

                elements.signUpForm.dataset.busy = "true";
                setFormBusy(elements.signUpForm, true, "Creating...");
                try {
                    const saltHex = toHex(randomSalt());
                    const passwordHash = await hashPassword(password, saltHex);
                    const newUsers = [...users, { email, salt: saltHex, passwordHash }];

                    if (!setUsers(newUsers)) {
                        setFeedback(elements.authFeedback, "Could not save account in local storage.", "error");
                        return;
                    }

                    safeStorage.set(SESSION_KEY, email);
                    setFeedback(elements.authFeedback, "Account created successfully. You are now signed in.", "success");
                    showToast(toast, "Signed up successfully.");
                    authGateEnabled = false;
                    if (elements.closeAuthModal) {
                        elements.closeAuthModal.hidden = false;
                    }
                    updateAuthButtons(elements);
                    closeAuthModal(elements, () => {
                        redirectToMain();
                        runPendingAuthAction();
                    });
                } catch (_error) {
                    setFeedback(elements.authFeedback, "Could not complete sign up. Please try again.", "error");
                } finally {
                    elements.signUpForm.dataset.busy = "false";
                    setFormBusy(elements.signUpForm, false, "");
                }
            });
        }

        if (elements.signInForm && elements.signInEmail && elements.signInPassword && elements.authFeedback) {
            elements.signInForm.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (elements.signInForm.dataset.busy === "true") return;

                const email = normalizeEmail(elements.signInEmail.value);
                const password = elements.signInPassword.value;

                if (isBlank(email) || isBlank(password)) {
                    setFeedback(elements.authFeedback, "Email and password are required.", "error");
                    return;
                }
                if (!validateEmail(email)) {
                    setFeedback(elements.authFeedback, "Enter a valid email for sign in.", "error");
                    elements.signInEmail.focus();
                    return;
                }
                if (!validatePassword(password)) {
                    setFeedback(elements.authFeedback, "Password must be at least 8 characters.", "error");
                    elements.signInPassword.focus();
                    return;
                }

                const users = getUsers();
                const account = users.find((user) => user.email === email);
                if (!account) {
                    setFeedback(elements.authFeedback, "No account found. Please sign up first.", "error");
                    activateTab(elements, "signup");
                    return;
                }

                elements.signInForm.dataset.busy = "true";
                setFormBusy(elements.signInForm, true, "Signing in...");
                try {
                    const attemptedHash = await hashPassword(password, account.salt);
                    if (attemptedHash !== account.passwordHash) {
                        setFeedback(elements.authFeedback, "Incorrect password. Try again.", "error");
                        elements.signInPassword.focus();
                        return;
                    }

                    safeStorage.set(SESSION_KEY, email);
                    setFeedback(elements.authFeedback, "Sign in successful.", "success");
                    showToast(toast, `Welcome back, ${email}.`);
                    authGateEnabled = false;
                    if (elements.closeAuthModal) {
                        elements.closeAuthModal.hidden = false;
                    }
                    updateAuthButtons(elements);
                    closeAuthModal(elements, () => {
                        redirectToMain();
                        runPendingAuthAction();
                    });
                } catch (_error) {
                    setFeedback(elements.authFeedback, "Could not complete sign in. Please try again.", "error");
                } finally {
                    elements.signInForm.dataset.busy = "false";
                    setFormBusy(elements.signInForm, false, "");
                }
            });
        }
    };

    const initNavActions = (elements) => {
        const { languageToggle, brandLink, toast } = elements;

        if (languageToggle) {
            languageToggle.addEventListener("click", () => {
                const current = getLanguage();
                const next = current === "ar" ? "en" : "ar";
                applyLanguage(elements, next);
                showToast(toast, next === "ar" ? "تم التبديل إلى العربية." : "Language switched to English.");
            });
        }

        if (brandLink) {
            brandLink.addEventListener("click", (event) => {
                event.preventDefault();
                window.location.reload();
            });
        }
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
                if (!target) {
                    event.preventDefault();
                    return;
                }

                event.preventDefault();
                target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    };

    const init = () => {
        const elements = getElements();
        initAuth(elements);
        initForm(elements);
        initFaq(elements);
        initNavActions(elements);
        initLinks(elements);
        applyLanguage(elements, getLanguage());

        if (elements.form && elements.emailInput && elements.emailFeedback && elements.toast) {
            elements.form.addEventListener("submit", (event) => {
                const sessionUser = getSessionUser();
                if (sessionUser) return;
                event.preventDefault();
                event.stopImmediatePropagation();
                setFeedback(elements.emailFeedback, "Please sign in or sign up to continue.", "error");
                showToast(elements.toast, "Authentication required.");
                requireAuth(elements, "signin", () => {
                    setFeedback(elements.emailFeedback, "You are now logged in and can continue.", "success");
                });
            }, { capture: true });
        }

        if (!getSessionUser() && elements.authModal && elements.closeAuthModal) {
            authGateEnabled = true;
            elements.closeAuthModal.hidden = true;
            setFeedback(elements.authFeedback, "Please sign in or sign up to access the page.", "error");
            openAuthModal(elements, "signin");
        } else if (elements.closeAuthModal) {
            authGateEnabled = false;
            elements.closeAuthModal.hidden = false;
        }
    };

    return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
