// QRGuardian Generator - Version avec authentification, déconnexion et navbar sans flash
class QRGuardianGenerator {
    constructor() {
        this.currentPage = 'generatePage';
        this.currentTheme = 'dark';
        this.keys = null;
        this.isGenerating = false;
        this.maxDataSize = 500;
        this.securityCodes = new Set();
        this.UNIQUE_SECURITY_CODE = null;
        this.bulkGenerator = null;
        this.isBatchGenerating = false;
        this.auth = null;
        this.pendingPage = null; // pour stocker la page à afficher après validation du PIN
    }

    async init() {
        try {
            await this.loadRequiredLibraries();
            if (typeof Database !== 'undefined') {
                try {
                    await Database.init();
                } catch (dbError) {
                    console.warn('Base de données non disponible:', dbError);
                }
            }

            this.auth = new AuthManager();
            const hasUser = await this.auth.hasUser();

            if (hasUser) {
                this.showLoginPage();
            } else {
                this.showSignupPage();
            }

            this.setupAuthEvents();
            this.setupTheme();
            this.setupPinModal(); // Initialiser le modal

        } catch (error) {
            console.error('❌ Erreur initialisation:', error);
            this.showNotification('Erreur d\'initialisation', 'Veuillez rafraîchir la page.', 'error');
        }
    }

    // ===== GESTION DE L'AUTHENTIFICATION =====
    showLoginPage() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.classList.remove('visible');

        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.classList.add('active');

        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';

        setTimeout(() => {
            const firstPin = document.querySelector('#loginForm .pin-digit');
            if (firstPin) firstPin.focus();
        }, 100);
    }

    showSignupPage() {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.classList.remove('visible');

        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.classList.add('active');

        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';

        setTimeout(() => {
            const nameInput = document.getElementById('signupName');
            if (nameInput) nameInput.focus();
        }, 100);
    }

    async onAuthenticated() {
        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.classList.remove('active');

        // Ajouter la classe authenticated au body pour afficher la sidebar et la bottom-nav
        document.body.classList.add('authenticated');

        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.classList.add('visible');

        await this.loadOrCreateSecurityCode();

        this.setupNavigation();
        this.setupGenerateForm();
        this.setupSettings();
        this.setupRefreshButton();
        this.initBulkGenerator();
        this.setupConnectionFeatures();

        this.switchPage('generatePage');
        this.updateSettings();

        this.showNotification('Authentification réussie', 'Bienvenue sur QRGuardian Generator.', 'success');
    }

    async logout() {
        const confirmLogout = confirm('Êtes-vous sûr de vouloir vous déconnecter ?');
        if (!confirmLogout) return;

        this.auth.logout();

        // Retirer la classe authenticated du body
        document.body.classList.remove('authenticated');

        const bottomNav = document.getElementById('bottomNav');
        if (bottomNav) bottomNav.classList.remove('visible');

        this.bulkGenerator = null;
        this.UNIQUE_SECURITY_CODE = null;

        this.showLoginPage();
        this.showNotification('Déconnexion réussie', 'À bientôt !', 'info');
    }

    setupAuthEvents() {
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('pin-digit')) {
                const input = e.target;
                if (input.value.length === 1) {
                    const next = input.parentElement?.nextElementSibling?.querySelector('.pin-digit') ||
                                 input.closest('.pin-inputs')?.children[
                                     Array.from(input.parentElement.children).indexOf(input) + 1
                                 ];
                    if (next) next.focus();
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('pin-digit') && e.key === 'Backspace') {
                const input = e.target;
                if (input.value.length === 0) {
                    const prev = input.parentElement?.previousElementSibling?.querySelector('.pin-digit') ||
                                 input.closest('.pin-inputs')?.children[
                                     Array.from(input.parentElement.children).indexOf(input) - 1
                                 ];
                    if (prev) {
                        prev.focus();
                        prev.value = '';
                    }
                }
            }
        });

        const showSignupLink = document.getElementById('showSignupLink');
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSignupPage();
            });
        }

        const showLoginLink = document.getElementById('showLoginLink');
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginPage();
            });
        }

        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const digits = document.querySelectorAll('#loginForm .pin-digit');
                const pin = Array.from(digits).map(d => d.value).join('');

                if (pin.length !== 4) {
                    this.showNotification('Code incomplet', 'Veuillez saisir les 4 chiffres.', 'error');
                    return;
                }

                const result = await this.auth.login(pin);
                if (result.success) {
                    this.onAuthenticated();
                } else {
                    this.showNotification('Erreur de connexion', result.message, 'error');
                    digits.forEach(d => d.value = '');
                    digits[0].focus();
                }
            });
        }

        const signupBtn = document.getElementById('signupBtn');
        if (signupBtn) {
            signupBtn.addEventListener('click', async () => {
                const name = document.getElementById('signupName').value.trim();

                const pinDigits = [
                    document.getElementById('pin1'),
                    document.getElementById('pin2'),
                    document.getElementById('pin3'),
                    document.getElementById('pin4')
                ];
                const confirmDigits = [
                    document.getElementById('confirmPin1'),
                    document.getElementById('confirmPin2'),
                    document.getElementById('confirmPin3'),
                    document.getElementById('confirmPin4')
                ];

                const pin = pinDigits.map(d => d.value).join('');
                const confirmPin = confirmDigits.map(d => d.value).join('');

                const result = await this.auth.register(name, pin, confirmPin);
                if (result.success) {
                    this.showNotification('Inscription réussie', 'Vous pouvez maintenant vous connecter avec votre code PIN.', 'success');
                    this.showLoginPage();
                    pinDigits.forEach(d => d.value = '');
                    confirmDigits.forEach(d => d.value = '');
                } else {
                    this.showNotification('Erreur d\'inscription', result.message, 'error');
                    pinDigits.forEach(d => d.value = '');
                    confirmDigits.forEach(d => d.value = '');
                    pinDigits[0].focus();
                }
            });
        }
    }

    // ===== GESTION DU MODAL PIN POUR PARAMÈTRES =====
    setupPinModal() {
        const modal = document.getElementById('pinModal');
        const cancelBtn = document.getElementById('cancelPinModal');
        const confirmBtn = document.getElementById('confirmPinModal');
        const inputs = document.querySelectorAll('#modalPinInputs .pin-digit');
        const errorDiv = document.getElementById('pinModalError');

        const closeModal = () => {
            modal.classList.remove('show');
            inputs.forEach(i => i.value = '');
            errorDiv.classList.remove('show');
            this.pendingPage = null;
        };

        cancelBtn.addEventListener('click', closeModal);

        confirmBtn.addEventListener('click', async () => {
            const pin = Array.from(inputs).map(i => i.value).join('');
            if (pin.length !== 4) {
                errorDiv.textContent = 'Code PIN incomplet';
                errorDiv.classList.add('show');
                return;
            }

            const result = await this.auth.login(pin);
            if (result.success) {
                // Récupérer la page en attente avant de fermer le modal
                const targetPage = this.pendingPage;
                if (targetPage) {
                    this.switchPage(targetPage);
                }
                // Fermer le modal après le changement de page
                closeModal();
            } else {
                errorDiv.textContent = 'Code PIN incorrect';
                errorDiv.classList.add('show');
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
            }
        });

        // Gestion de la saisie dans le modal
        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                if (input.value.length === 1 && index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
                    inputs[index - 1].focus();
                }
            });
        });

        // Fermeture en cliquant à l'extérieur
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    openPinModalForSettings() {
        const modal = document.getElementById('pinModal');
        const inputs = document.querySelectorAll('#modalPinInputs .pin-digit');
        inputs.forEach(i => i.value = '');
        document.getElementById('pinModalError').classList.remove('show');
        modal.classList.add('show');
        inputs[0].focus();
    }

    async loadRequiredLibraries() {
        return new Promise((resolve) => {
            if (typeof QRCode !== 'undefined') {
                resolve();
                return;
            }
            this.showNotification('Chargement', 'Initialisation...', 'info');
            setTimeout(resolve, 1500);
        });
    }

    async loadOrCreateSecurityCode() {
        try {
            if (typeof Database !== 'undefined' && typeof Database.getSecurityCode === 'function') {
                const code = await Database.getSecurityCode();
                if (code) {
                    this.UNIQUE_SECURITY_CODE = code;
                    return;
                }
            }
            const savedCode = localStorage.getItem('qrguardian_security_code');
            if (savedCode) {
                this.UNIQUE_SECURITY_CODE = savedCode;
                if (typeof Database !== 'undefined') {
                    try { await Database.setSecurityCode(this.UNIQUE_SECURITY_CODE); } catch (e) {}
                }
            } else {
                this.UNIQUE_SECURITY_CODE = this.generateUniqueSecurityCode();
                localStorage.setItem('qrguardian_security_code', this.UNIQUE_SECURITY_CODE);
                if (typeof Database !== 'undefined') {
                    try { await Database.setSecurityCode(this.UNIQUE_SECURITY_CODE); } catch (e) {}
                }
            }
        } catch (error) {
            console.error('Erreur chargement code secret:', error);
            this.UNIQUE_SECURITY_CODE = 'QRG-SECRET-UNIQUE-' + Date.now().toString(36).toUpperCase();
            localStorage.setItem('qrguardian_security_code', this.UNIQUE_SECURITY_CODE);
        }
    }

    generateUniqueSecurityCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return `QRG-UNIQUE-${code}`;
    }

    getSecurityCode() {
        return this.UNIQUE_SECURITY_CODE;
    }

    // Nouvelle méthode pour générer un code secret pour un nouvel événement
    generateNewSecurityCode() {
        const newCode = 'QRG-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
        this.UNIQUE_SECURITY_CODE = newCode;
        localStorage.setItem('qrguardian_security_code', newCode);
        if (typeof Database !== 'undefined') {
            Database.setSecurityCode(newCode).catch(e => console.warn('DB setSecurityCode failed', e));
        }
        this.updateSecurityCodeDisplay();
        this.showNotification('Nouveau code secret généré', 'Ce code sera utilisé pour le prochain événement.', 'success');
        // Fermer le QR de connexion s'il est affiché
        const connectionContainer = document.getElementById('connectionQRContainer');
        if (connectionContainer) connectionContainer.style.display = 'none';
    }

    // ===== CHIFFREMENT POUR LE QR DE CONNEXION =====
    encryptCode(plainCode) {
        const key = "QRGuardianKey2025";
        let result = "";
        for (let i = 0; i < plainCode.length; i++) {
            const charCode = plainCode.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }

    decryptCode(encryptedBase64) {
        const key = "QRGuardianKey2025";
        const encrypted = atob(encryptedBase64);
        let result = "";
        for (let i = 0; i < encrypted.length; i++) {
            const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }

    setupNavigation() {
        document.querySelectorAll('.nav-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const pageId = e.currentTarget.getAttribute('data-page');
                
                // Si on essaie d'aller vers les paramètres, on demande le PIN
                if (pageId === 'settingsPage') {
                    this.pendingPage = pageId;
                    this.openPinModalForSettings();
                } else {
                    this.switchPage(pageId);
                }
            });
        });
    }

    switchPage(pageId) {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('active');
        else { console.error('❌ Page non trouvée:', pageId); return; }
        const targetBtn = document.querySelector(`[data-page="${pageId}"]`);
        if (targetBtn) targetBtn.classList.add('active');
        this.currentPage = pageId;

        switch (pageId) {
            case 'generatePage':
                this.updateFormPreview();
                this.updateDataSizeIndicator();
                if (this.bulkGenerator && this.bulkGenerator.isBatchGenerating) {
                    this.bulkGenerator.stopBatchGeneration();
                }
                break;
            case 'settingsPage':
                this.updateSettings();
                break;
        }
    }

    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        const savedTheme = localStorage.getItem('qrguardian_theme') || 'dark';
        const applyTheme = (isLight) => {
            document.body.classList.toggle('light-theme', isLight);
            document.body.classList.toggle('dark-theme', !isLight);
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
                icon.style.color = isLight ? '#f59e0b' : '';
            }
        };
        applyTheme(savedTheme === 'light');
        themeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('qrguardian_theme', isLight ? 'dark' : 'light');
            applyTheme(!isLight);
            this.showNotification('Thème ' + (isLight ? 'sombre' : 'clair') + ' activé', '', 'info');
        });
    }

    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.add('fa-spin');
                if (this.currentPage === 'generatePage') this.refreshGeneratePage();
                else if (this.currentPage === 'settingsPage') this.refreshSettingsPage();
                setTimeout(() => { if (icon) icon.classList.remove('fa-spin'); }, 1000);
            });
        }
    }

    refreshGeneratePage() {
        this.clearForm();
        const bulkPreviewContainer = document.getElementById('bulkPreviewContainer');
        if (bulkPreviewContainer) {
            bulkPreviewContainer.innerHTML = '';
            bulkPreviewContainer.style.display = 'none';
        }
        const downloadBulkBtn = document.getElementById('downloadBulkBtn');
        const previewBulkBtn = document.getElementById('previewBulkBtn');
        if (downloadBulkBtn) downloadBulkBtn.style.display = 'none';
        if (previewBulkBtn) previewBulkBtn.style.display = 'none';
        const bulkQuantity = document.getElementById('bulkQuantity');
        const bulkQuantitySlider = document.getElementById('bulkQuantitySlider');
        if (bulkQuantity) bulkQuantity.value = '1';
        if (bulkQuantitySlider) bulkQuantitySlider.value = '1';
        this.updateFormPreview();
        this.updateDataSizeIndicator();
        if (this.bulkGenerator) this.bulkGenerator.stopBatchGeneration();
        this.showNotification('Page Générer rafraîchie', 'Formulaire réinitialisé.', 'success');
    }

    refreshSettingsPage() {
        this.updateSettings();
        this.updateSecurityCodeCount();
        this.updateStorageUsage();
        this.updateSecurityCodeDisplay();
        this.updateConnectionStatus();
        this.showNotification('Paramètres rafraîchis', 'Statistiques mises à jour.', 'info');
    }

    setupGenerateForm() {
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) generateBtn.addEventListener('click', (e) => { e.preventDefault(); this.generateQRCode(); });
        const clearBtn = document.getElementById('clearFormBtn');
        if (clearBtn) clearBtn.addEventListener('click', (e) => { e.preventDefault(); this.clearForm(); });
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.addEventListener('click', (e) => { e.preventDefault(); this.downloadQRCode(); });

        // Initialiser le champ date d'expiration avec une valeur par défaut (aujourd'hui + 30 jours)
        const expiryInput = document.getElementById('eventExpiry');
        if (expiryInput) {
            const today = new Date();
            const defaultExpiry = new Date(today);
            defaultExpiry.setDate(today.getDate() + 30);
            const year = defaultExpiry.getFullYear();
            const month = String(defaultExpiry.getMonth() + 1).padStart(2, '0');
            const day = String(defaultExpiry.getDate()).padStart(2, '0');
            expiryInput.value = `${year}-${month}-${day}`;
            expiryInput.min = today.toISOString().split('T')[0]; // min aujourd'hui
            expiryInput.addEventListener('input', () => this.updateFormPreview());
        }

        ['eventName', 'eventPrice', 'eventLocation'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.addEventListener('input', () => { this.updateFormPreview(); this.updateDataSizeIndicator(); });
        });
        this.createDataSizeIndicator();
        this.setupCharacterCounters();
    }

    setupCharacterCounters() {
        const fields = {
            eventName: { max: 80, counter: 'nameCharCount', fill: 'nameCharFill' },
            eventPrice: { max: 30, counter: 'priceCharCount', fill: 'priceCharFill' },
            eventLocation: { max: 80, counter: 'locationCharCount', fill: 'locationCharFill' }
        };
        for (const [fieldId, config] of Object.entries(fields)) {
            const input = document.getElementById(fieldId);
            if (input) {
                this.updateCharCounter(input, config);
                input.addEventListener('input', () => this.updateCharCounter(input, config));
            }
        }
    }

    updateCharCounter(input, config) {
        const length = input.value.length;
        const percentage = (length / config.max) * 100;
        const counterElement = document.getElementById(config.counter);
        const fillElement = document.getElementById(config.fill);
        if (counterElement) counterElement.textContent = length;
        if (fillElement) {
            fillElement.style.width = Math.min(percentage, 100) + '%';
            fillElement.className = 'char-fill' + (percentage > 90 ? ' danger' : percentage > 70 ? ' warning' : '');
        }
    }

    createDataSizeIndicator() {
        let indicator = document.getElementById('dataSizeIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'dataSizeIndicator';
            indicator.className = 'data-size-indicator';
            const formContainer = document.querySelector('.form-simple');
            if (formContainer) formContainer.appendChild(indicator);
        }
        this.updateDataSizeIndicator();
    }

    updateDataSizeIndicator() {
        const indicator = document.getElementById('dataSizeIndicator');
        if (!indicator) return;
        const dataSize = this.calculateDataSize();
        const percentage = (dataSize / this.maxDataSize) * 100;
        let statusMessage = '<span class="size-ok"><i class="fas fa-check-circle"></i> Taille optimale</span>';
        if (dataSize > this.maxDataSize) statusMessage = '<span class="size-warning"><i class="fas fa-exclamation-triangle"></i> Données trop volumineuses!</span>';
        else if (percentage > 80) statusMessage = '<span class="size-alert"><i class="fas fa-info-circle"></i> Approche de la limite</span>';
        indicator.innerHTML = `
            <div class="size-indicator">
                <i class="fas fa-database"></i>
                <span>Taille des données: ${dataSize}/${this.maxDataSize} caractères</span>
                <div class="size-bar"><div class="size-fill" style="width: ${Math.min(percentage, 100)}%"></div></div>
                ${statusMessage}
            </div>
        `;
        const generateBtn = document.getElementById('generateBtn');
        if (generateBtn) generateBtn.disabled = dataSize > this.maxDataSize;
        const previewDataSize = document.getElementById('previewDataSize');
        if (previewDataSize) previewDataSize.textContent = dataSize;
    }

    calculateDataSize() {
        const eventData = this.prepareEventData();
        return this.encodeToUrlParams(eventData).length;
    }

    prepareEventData() {
        const expiryInput = document.getElementById('eventExpiry');
        let expiry = null;
        if (expiryInput && expiryInput.value) {
            // Convertir la date en timestamp (fin de journée)
            const date = new Date(expiryInput.value);
            date.setHours(23, 59, 59, 999);
            expiry = date.getTime();
        }
        return {
            n: document.getElementById('eventName')?.value || '',
            p: document.getElementById('eventPrice')?.value || '',
            l: document.getElementById('eventLocation')?.value || '',
            ts: Date.now(),
            id: this.generateEventId(),
            sc: this.getSecurityCode(),
            exp: expiry
        };
    }

    generateEventId() {
        const timestamp = Date.now().toString(36).slice(-6);
        const random = Math.random().toString(36).substring(2, 4);
        return `E${timestamp}${random}`.toUpperCase();
    }

    encodeToUrlParams(data) {
        const params = new URLSearchParams();
        if (data.n) params.append('n', data.n.substring(0, 80));
        if (data.p) params.append('p', data.p.substring(0, 30));
        if (data.l) params.append('l', data.l.substring(0, 80));
        if (data.ts) params.append('ts', data.ts);
        if (data.id) params.append('id', data.id);
        if (data.sc) params.append('sc', data.sc);
        if (data.exp) params.append('exp', data.exp);
        return params.toString();
    }

    updateFormPreview() {
        const eventName = document.getElementById('eventName')?.value || 'Nom de l\'événement';
        const eventPrice = document.getElementById('eventPrice')?.value || 'Gratuit';
        const eventLocation = document.getElementById('eventLocation')?.value || 'Lieu non spécifié';
        const securityCode = this.getSecurityCode() || 'CODE-ERR';
        const previewElements = {
            'previewEventName': eventName,
            'previewPrice': eventPrice,
            'previewLocation': eventLocation,
            'previewSecurityCode': securityCode.substring(0, 16) + '...'
        };
        for (const [id, value] of Object.entries(previewElements)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        const previewId = document.getElementById('previewEventId');
        if (previewId) previewId.textContent = this.generateEventId();

        // Afficher la date d'expiration
        const previewExpiry = document.getElementById('previewExpiry');
        if (previewExpiry) {
            const expiryInput = document.getElementById('eventExpiry');
            if (expiryInput && expiryInput.value) {
                const date = new Date(expiryInput.value);
                previewExpiry.textContent = date.toLocaleDateString();
            } else {
                previewExpiry.textContent = 'Jamais';
            }
        }

        const dataSizeElement = document.getElementById('dataSize');
        if (dataSizeElement) dataSizeElement.textContent = this.calculateDataSize();
    }

    async generateQRCode() {
        if (this.isGenerating) return;
        const dataSize = this.calculateDataSize();
        if (dataSize > this.maxDataSize) {
            this.showNotification('Données trop volumineuses', `Limite de ${this.maxDataSize} caractères.`, 'error');
            return;
        }
        const eventName = document.getElementById('eventName')?.value.trim();
        const eventLocation = document.getElementById('eventLocation')?.value.trim();
        if (!eventName || !eventLocation) {
            this.showNotification('Champs obligatoires', 'Le nom et le lieu sont requis.', 'error');
            return;
        }
        this.isGenerating = true;
        try {
            const eventData = this.prepareEventData();
            const generateBtn = document.getElementById('generateBtn');
            if (generateBtn) {
                const originalText = generateBtn.innerHTML;
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
                generateBtn.disabled = true;
                setTimeout(async () => {
                    try {
                        const urlData = this.encodeToUrlParams(eventData);
                        const fullData = 'https://qrguardian.app/e?' + urlData;
                        await this.displayQRCode(fullData);
                        if (typeof Database !== 'undefined') {
                            try { await Database.saveGeneration({ ...eventData, timestamp: new Date().toISOString(), dataSize: urlData.length, used: false, scanCount: 0 }); } catch (e) { }
                        }
                        this.showNotification('Succès !', `QR code généré. ID: ${eventData.id}`, 'success');
                    } catch (error) {
                        console.error('❌ Erreur génération:', error);
                        this.showNotification('Erreur', 'Impossible de générer le QR code.', 'error');
                    } finally {
                        generateBtn.innerHTML = originalText;
                        generateBtn.disabled = false;
                        this.isGenerating = false;
                    }
                }, 800);
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            this.showNotification('Erreur', 'Échec de la génération.', 'error');
            this.isGenerating = false;
        }
    }

    async displayQRCode(data) {
        return new Promise((resolve, reject) => {
            try {
                const qrPreview = document.getElementById('qrPreview');
                if (!qrPreview) throw new Error('Aperçu non trouvé');
                qrPreview.innerHTML = '';
                const container = document.createElement('div');
                container.style.textAlign = 'center';
                container.style.padding = '20px';
                if (typeof QRCode === 'undefined') throw new Error('QRCode non chargé');
                new QRCode(container, {
                    text: data,
                    width: 256,
                    height: 256,
                    colorDark: "#1e3a8a",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
                qrPreview.appendChild(container);
                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) downloadBtn.style.display = 'flex';
                setTimeout(() => {
                    const canvas = container.querySelector('canvas');
                    if (canvas) {
                        window.currentQRCodeCanvas = canvas;
                        canvas.dataset.qrData = data;
                    }
                    resolve();
                }, 100);
            } catch (error) { reject(error); }
        });
    }

    async downloadQRCode() {
        try {
            const canvas = window.currentQRCodeCanvas || document.querySelector('#qrPreview canvas');
            if (!canvas) { this.showNotification('Aucun QR code', 'Générez d\'abord un QR code.', 'error'); return; }
            const link = document.createElement('a');
            const eventName = document.getElementById('eventName')?.value || 'qrcode';
            const filename = `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.png`;
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
            this.showNotification('Téléchargement', 'QR code sécurisé téléchargé.', 'success');
        } catch (error) {
            console.error('❌ Erreur téléchargement:', error);
            this.showNotification('Erreur', 'Impossible de télécharger le QR code.', 'error');
        }
    }

    clearForm() {
        ['eventName', 'eventPrice', 'eventLocation', 'eventExpiry'].forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
        // Réinitialiser la date d'expiration à la valeur par défaut
        const expiryInput = document.getElementById('eventExpiry');
        if (expiryInput) {
            const today = new Date();
            const defaultExpiry = new Date(today);
            defaultExpiry.setDate(today.getDate() + 30);
            const year = defaultExpiry.getFullYear();
            const month = String(defaultExpiry.getMonth() + 1).padStart(2, '0');
            const day = String(defaultExpiry.getDate()).padStart(2, '0');
            expiryInput.value = `${year}-${month}-${day}`;
        }
        const qrPreview = document.getElementById('qrPreview');
        if (qrPreview) qrPreview.innerHTML = '<div class="qr-placeholder"><i class="fas fa-qrcode"></i><p>Le QR code apparaîtra ici</p></div>';
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.style.display = 'none';
        this.updateFormPreview();
        this.updateDataSizeIndicator();
        this.showNotification('Formulaire effacé', 'Tous les champs ont été réinitialisés.', 'success');
    }

    initBulkGenerator() {
        try {
            if (typeof BulkQRGenerator === 'undefined') {
                console.warn('❌ BulkQRGenerator non disponible');
                this.showNotification('Fonctionnalité limitée', 'La génération en lot nécessite des bibliothèques supplémentaires.', 'warning');
                return;
            }
            this.bulkGenerator = new BulkQRGenerator(this);

            const generateBulkBtn = document.getElementById('generateBulkBtn');
            const downloadBulkBtn = document.getElementById('downloadBulkBtn');
            const previewBulkBtn = document.getElementById('previewBulkBtn');
            const bulkQuantity = document.getElementById('bulkQuantity');
            const bulkQuantitySlider = document.getElementById('bulkQuantitySlider');
            const decreaseBtn = document.getElementById('decreaseQuantity');
            const increaseBtn = document.getElementById('increaseQuantity');

            if (generateBulkBtn) {
                generateBulkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const count = parseInt(bulkQuantity?.value || 1, 10);
                    this.bulkGenerator.generateBatch(count);
                });
            }

            const syncQuantity = (value) => {
                value = Math.min(Math.max(parseInt(value, 10) || 1, 1), 1000);
                if (bulkQuantity) bulkQuantity.value = value;
                if (bulkQuantitySlider) bulkQuantitySlider.value = value;
                const bulkCount = document.getElementById('bulkCount');
                if (bulkCount) bulkCount.textContent = value;
                const totalSize = (value * 0.5).toFixed(1);
                const bulkTotalSize = document.getElementById('bulkTotalSize');
                if (bulkTotalSize) bulkTotalSize.textContent = `~${totalSize} KB`;
            };

            if (bulkQuantity) {
                bulkQuantity.addEventListener('input', (e) => syncQuantity(e.target.value));
            }
            if (bulkQuantitySlider) {
                bulkQuantitySlider.addEventListener('input', (e) => syncQuantity(e.target.value));
            }
            if (decreaseBtn) {
                decreaseBtn.addEventListener('click', () => {
                    const val = parseInt(bulkQuantity?.value || 1, 10);
                    syncQuantity(val - 1);
                });
            }
            if (increaseBtn) {
                increaseBtn.addEventListener('click', () => {
                    const val = parseInt(bulkQuantity?.value || 1, 10);
                    syncQuantity(val + 1);
                });
            }
            if (downloadBulkBtn) {
                downloadBulkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.bulkGenerator.downloadBatchAsPDF();
                });
            }
            if (previewBulkBtn) {
                previewBulkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.bulkGenerator.showBatchPreview();
                });
            }
            this.updateBulkStats();
        } catch (error) {
            console.error('❌ Erreur initialisation générateur en lot:', error);
        }
    }

    updateBulkStats() {
        const bulkCount = document.getElementById('bulkCount');
        const bulkTotalSize = document.getElementById('bulkTotalSize');
        if (bulkCount) bulkCount.textContent = '1';
        if (bulkTotalSize) bulkTotalSize.textContent = '~0.5 KB';
    }

    setupSettings() {
        const clearStorageBtn = document.getElementById('clearStorageBtn');
        if (clearStorageBtn) clearStorageBtn.addEventListener('click', () => this.clearStorage());

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }

        // Bouton Nouvel événement
        const newEventBtn = document.getElementById('newEventBtn');
        if (newEventBtn) {
            newEventBtn.addEventListener('click', () => this.generateNewSecurityCode());
        }

        this.updateSecurityCodeDisplay();
        this.setupSecurityCodeButtons();
    }

    setupSecurityCodeButtons() {
        const refreshCodeBtn = document.getElementById('refreshCodeBtn');
        if (refreshCodeBtn) refreshCodeBtn.addEventListener('click', () => { this.updateSecurityCodeDisplay(); this.showNotification('Code secret rafraîchi', '', 'info'); });
        const copyCodeBtn = document.getElementById('copyCodeBtn');
        if (copyCodeBtn) copyCodeBtn.addEventListener('click', () => this.copySecurityCode());
    }

    copySecurityCode() {
        if (!this.UNIQUE_SECURITY_CODE) { this.showNotification('Erreur', 'Aucun code secret disponible.', 'error'); return; }
        navigator.clipboard.writeText(this.UNIQUE_SECURITY_CODE)
            .then(() => this.showNotification('Code copié', 'Le code secret a été copié dans le presse-papier.', 'success'))
            .catch(err => { console.error('Erreur de copie:', err); this.showNotification('Erreur', 'Impossible de copier le code secret.', 'error'); });
    }

    // Nouvelle méthode pour masquer le code secret
    maskSecurityCode(code) {
        if (!code) return '---';
        if (code.length <= 8) {
            // Si le code est court, on affiche des astérisques
            return '•'.repeat(code.length);
        }
        // Afficher les 4 premiers et les 4 derniers caractères
        const first = code.substring(0, 4);
        const last = code.substring(code.length - 4);
        return first + '…' + last;
    }

    updateSecurityCodeDisplay() {
        const securityCodeElement = document.getElementById('currentSecurityCodeDisplay');
        if (securityCodeElement && this.UNIQUE_SECURITY_CODE) {
            securityCodeElement.textContent = this.maskSecurityCode(this.UNIQUE_SECURITY_CODE);
        }
    }

    updateSettings() {
        this.updateSecurityCodeDisplay();
        this.updateConnectionStatus();
        this.updateSecurityCodeCount();
        this.updateStorageUsage();
        const keyStatusText = document.getElementById('keyStatusText');
        if (keyStatusText) keyStatusText.textContent = 'Actif et fonctionnel';
    }

    async updateSecurityCodeCount() {
        try {
            let totalGenerations = 0;
            if (typeof Database !== 'undefined') {
                const stats = await Database.getSecurityStats();
                totalGenerations = stats.totalCodes || 0;
            }
            const securityCodeCount = document.getElementById('securityCodeCount');
            if (securityCodeCount) securityCodeCount.textContent = `${totalGenerations} codes générés`;
            const securityUsed = document.getElementById('securityUsed');
            if (securityUsed) securityUsed.textContent = `0`;
            const maxCapacity = 1000;
            const percentage = Math.min((totalGenerations / maxCapacity) * 100, 100);
            const securityFill = document.getElementById('securityFill');
            if (securityFill) {
                securityFill.style.width = `${percentage}%`;
                if (percentage > 80) securityFill.style.background = 'linear-gradient(135deg, var(--color-warning) 0%, #d97706 100%)';
                else if (percentage > 60) securityFill.style.background = 'linear-gradient(135deg, var(--color-info) 0%, #2563eb 100%)';
                else securityFill.style.background = 'var(--gradient-primary)';
            }
        } catch (error) { console.error('Erreur mise à jour compteur codes:', error); }
    }

    async updateStorageUsage() {
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const used = (estimate.usage / 1024).toFixed(2);
                const quota = (estimate.quota / 1024 / 1024).toFixed(2);
                const storageUsage = document.getElementById('storageUsage');
                if (storageUsage) storageUsage.textContent = `${used} KB / ${quota} MB`;
                const storageUsed = document.getElementById('storageUsed');
                if (storageUsed) storageUsed.textContent = `${used} KB`;
                const percentage = Math.min((estimate.usage / estimate.quota) * 100, 100);
                const storageFill = document.getElementById('storageFill');
                if (storageFill) {
                    storageFill.style.width = `${percentage}%`;
                    if (percentage > 80) storageFill.style.background = 'linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%)';
                    else if (percentage > 60) storageFill.style.background = 'linear-gradient(135deg, var(--color-warning) 0%, #d97706 100%)';
                    else storageFill.style.background = 'var(--gradient-primary)';
                }
            } else {
                const fallback = this.calculateFallbackStorage();
                const storageUsage = document.getElementById('storageUsage');
                if (storageUsage) storageUsage.textContent = `${fallback.used} KB / ${fallback.total} MB`;
                const storageUsed = document.getElementById('storageUsed');
                if (storageUsed) storageUsed.textContent = `${fallback.used} KB`;
                const percentage = Math.min((fallback.usedKB / (fallback.total * 1024)) * 100, 100);
                const storageFill = document.getElementById('storageFill');
                if (storageFill) storageFill.style.width = `${percentage}%`;
            }
        } catch (error) {
            console.error('Erreur mise à jour stockage:', error);
            const storageUsage = document.getElementById('storageUsage');
            if (storageUsage) storageUsage.textContent = 'Calcul erreur';
            const storageUsed = document.getElementById('storageUsed');
            if (storageUsed) storageUsed.textContent = '0 KB';
            const storageFill = document.getElementById('storageFill');
            if (storageFill) storageFill.style.width = '0%';
        }
    }

    calculateFallbackStorage() {
        try {
            let totalSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                totalSize += (key.length + value.length) * 2;
            }
            if (this.UNIQUE_SECURITY_CODE) totalSize += this.UNIQUE_SECURITY_CODE.length * 2;
            const usedKB = (totalSize / 1024).toFixed(2);
            return { used: parseFloat(usedKB), usedKB: parseFloat(usedKB), total: 5 };
        } catch (error) {
            console.error('Erreur calcul stockage:', error);
            return { used: 0, usedKB: 0, total: 5 };
        }
    }

    async clearStorage() {
        if (confirm('Êtes-vous sûr de vouloir effacer TOUTES les données locales ?\n\nCette action supprimera :\n• L\'historique des générations\n• Tous les paramètres\n\nLe code secret unique sera conservé.\n\nCette action est irréversible.')) {
            try {
                if (typeof Database !== 'undefined') await Database.clearAll();
                localStorage.removeItem('qrguardian_security_code');
                await this.loadOrCreateSecurityCode();
                this.updateSettings();
                this.showNotification('Stockage effacé', 'Toutes les données ont été supprimées. Nouveau code secret généré.', 'success');
            } catch (error) {
                console.error('❌ Erreur effacement stockage:', error);
                this.showNotification('Erreur', 'Impossible d\'effacer les données.', 'error');
            }
        }
    }

    showNotification(title, message, type = 'info') {
        try {
            const oldNotifications = document.querySelectorAll('.notification');
            if (oldNotifications.length > 3) oldNotifications[0].remove();
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = `
                <div class="notification-header">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    <h4>${title}</h4>
                </div>
                <p>${message}</p>
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.classList.add('show'), 10);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => { if (notification.parentNode) notification.remove(); }, 300);
            }, 5000);
        } catch (error) { console.error('Erreur notification:', error); }
    }

    setupConnectionFeatures() {
        const generateConnectionQRBtn = document.getElementById('generateConnectionQRBtn');
        if (generateConnectionQRBtn) generateConnectionQRBtn.addEventListener('click', () => this.generateConnectionQR());
        const closeConnectionQRBtn = document.getElementById('closeConnectionQRBtn');
        if (closeConnectionQRBtn) closeConnectionQRBtn.addEventListener('click', () => this.closeConnectionQR());
        const downloadConnectionQRBtn = document.getElementById('downloadConnectionQRBtn');
        if (downloadConnectionQRBtn) downloadConnectionQRBtn.addEventListener('click', () => this.downloadConnectionQR());
        this.updateConnectionStatus();
    }

    generateConnectionQR() {
        if (!this.UNIQUE_SECURITY_CODE) { this.showNotification('Erreur', 'Code secret non disponible.', 'error'); return; }
        // Chiffrer le code secret avant de l'intégrer dans le QR
        const encryptedCode = this.encryptCode(this.UNIQUE_SECURITY_CODE);
        const connectionData = {
            type: "QRGUARDIAN_CONNECTION",
            encrypted: true, // indicateur pour le terminal
            code: encryptedCode,
            timestamp: Date.now(),
            version: "1.0",
            device: "QRGuardian Generator"
        };
        const qrText = JSON.stringify(connectionData);
        this.displayConnectionQR(qrText);
        this.showNotification('QR Code de Connexion généré', 'Scannez ce QR code avec QRGuardian Terminal.', 'success');
    }

    displayConnectionQR(data) {
        const connectionQRContainer = document.getElementById('connectionQRContainer');
        const connectionQRCode = document.getElementById('connectionQRCode');
        if (!connectionQRContainer || !connectionQRCode) { this.showNotification('Erreur', 'Éléments d\'affichage non trouvés.', 'error'); return; }
        connectionQRCode.innerHTML = '';
        try {
            if (typeof QRCode !== 'undefined') {
                new QRCode(connectionQRCode, { text: data, width: 200, height: 200, colorDark: "#1e3a8a", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
                connectionQRContainer.style.display = 'block';
                connectionQRCode.dataset.qrData = data;
            } else throw new Error('Bibliothèque QRCode non disponible');
        } catch (error) {
            console.error('❌ Erreur génération QR connexion:', error);
            this.showNotification('Erreur', 'Impossible de générer le QR code.', 'error');
        }
    }

    closeConnectionQR() { const el = document.getElementById('connectionQRContainer'); if (el) el.style.display = 'none'; }

    downloadConnectionQR() {
        const connectionQRCode = document.getElementById('connectionQRCode');
        if (!connectionQRCode) { this.showNotification('Erreur', 'QR code non disponible.', 'error'); return; }
        const canvas = connectionQRCode.querySelector('canvas');
        if (!canvas) { this.showNotification('Erreur', 'Aucun QR code à télécharger.', 'error'); return; }
        try {
            const link = document.createElement('a');
            link.download = `QRGuardian_Connexion_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            this.showNotification('Téléchargement réussi', 'QR code de connexion téléchargé.', 'success');
        } catch (error) {
            console.error('❌ Erreur téléchargement QR connexion:', error);
            this.showNotification('Erreur', 'Impossible de télécharger le QR code.', 'error');
        }
    }

    updateConnectionStatus() {
        const connectionStatus = document.getElementById('connectionStatus');
        if (connectionStatus && this.UNIQUE_SECURITY_CODE) {
            connectionStatus.textContent = 'Code secret unique actif – prêt à partager';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        try {
            if (typeof QRCode === 'undefined') {
                console.error('❌ Bibliothèque QRCode non chargée');
                alert('Erreur : La bibliothèque QRCode n\'est pas chargée.');
                return;
            }
            if (typeof window.qrGuardianGenerator === 'undefined') {
                window.qrGuardianGenerator = new QRGuardianGenerator();
                window.qrGuardianGenerator.init();
            }
        } catch (error) {
            console.error('💥 Erreur fatale:', error);
            alert('Erreur au démarrage : ' + error.message);
        }
    }, 500);
});