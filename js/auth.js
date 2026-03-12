// auth.js - Gestion de l'authentification par PIN 4 chiffres
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.SECURITY_PIN_KEY = 'qrguardian_backup_pin';
        this.initializeBackupPin();
    }

    // Initialise ou récupère le code de secours (4 chiffres aléatoires)
    initializeBackupPin() {
        const storedPin = localStorage.getItem(this.SECURITY_PIN_KEY);
        if (storedPin && /^\d{4}$/.test(storedPin)) {
            this.SECURITY_PIN = storedPin;
        } else {
            this.SECURITY_PIN = Math.floor(1000 + Math.random() * 9000).toString();
            localStorage.setItem(this.SECURITY_PIN_KEY, this.SECURITY_PIN);
        }
    }

    // Vérifie si un utilisateur est déjà enregistré
    async hasUser() {
        try {
            const user = await Database.getUser();
            return user !== null;
        } catch (error) {
            console.error('Erreur vérification utilisateur:', error);
            return false;
        }
    }

    // Inscription : nom complet + PIN (4 chiffres) + confirmation
    async register(name, pin, confirmPin) {
        if (!name || name.trim().length < 2) {
            return { success: false, message: 'Veuillez entrer un nom valide (min. 2 caractères).' };
        }
        if (!/^\d{4}$/.test(pin)) {
            return { success: false, message: 'Le code PIN doit être composé de 4 chiffres.' };
        }
        if (pin !== confirmPin) {
            return { success: false, message: 'Les codes PIN ne correspondent pas.' };
        }

        const existing = await this.hasUser();
        if (existing) {
            return { success: false, message: 'Un utilisateur existe déjà. Veuillez vous connecter.' };
        }

        try {
            const user = await Database.saveUser({
                name: name.trim(),
                pin: pin
            });
            this.currentUser = user;
            this.isAuthenticated = true;
            return { success: true, user };
        } catch (error) {
            console.error('Erreur inscription:', error);
            return { success: false, message: 'Erreur lors de l\'inscription.' };
        }
    }

    // Connexion : vérifier le PIN (4 chiffres)
    async login(pin) {
        if (!/^\d{4}$/.test(pin)) {
            return { success: false, message: 'Le code PIN doit être composé de 4 chiffres.' };
        }

        if (pin === this.SECURITY_PIN) {
            const user = await Database.getUser();
            if (user) {
                this.currentUser = user;
                this.isAuthenticated = true;
                return { success: true, user, backup: true };
            } else {
                return { success: false, message: 'Aucun utilisateur. Veuillez d\'abord vous inscrire.' };
            }
        }

        try {
            const user = await Database.getUser();
            if (!user) {
                return { success: false, message: 'Aucun compte trouvé. Veuillez vous inscrire.' };
            }
            if (user.pin === pin) {
                this.currentUser = user;
                this.isAuthenticated = true;
                return { success: true, user };
            } else {
                return { success: false, message: 'Code PIN incorrect.' };
            }
        } catch (error) {
            console.error('Erreur login:', error);
            return { success: false, message: 'Erreur lors de la connexion.' };
        }
    }

    // Déconnexion
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
    }

    // Réinitialiser complètement le compte (supprime l'utilisateur)
    async resetAccount() {
        try {
            await Database.deleteUser();
            this.logout();
            return { success: true };
        } catch (error) {
            console.error('Erreur resetAccount:', error);
            return { success: false, message: 'Erreur lors de la réinitialisation.' };
        }
    }

    // Changer le PIN
    async changePin(oldPin, newPin, confirmNewPin) {
        if (!this.isAuthenticated || !this.currentUser) {
            return { success: false, message: 'Vous devez être connecté.' };
        }
        if (this.currentUser.pin !== oldPin && oldPin !== this.SECURITY_PIN) {
            return { success: false, message: 'Ancien code PIN incorrect.' };
        }
        if (!/^\d{4}$/.test(newPin)) {
            return { success: false, message: 'Le nouveau code PIN doit être composé de 4 chiffres.' };
        }
        if (newPin !== confirmNewPin) {
            return { success: false, message: 'Les nouveaux codes PIN ne correspondent pas.' };
        }
        try {
            const updatedUser = await Database.saveUser({
                ...this.currentUser,
                pin: newPin,
                updatedAt: new Date().toISOString()
            });
            this.currentUser = updatedUser;
            return { success: true };
        } catch (error) {
            console.error('Erreur changePin:', error);
            return { success: false, message: 'Erreur lors du changement de code.' };
        }
    }

    // Récupérer le code de secours (affichage masqué)
    getBackupPin() {
        return this.SECURITY_PIN;
    }
}

// Exposition globale
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
