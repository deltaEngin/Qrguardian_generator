// Générateur de QR codes haute qualité avec ECDSA
class HighQualityQRCodeGenerator {
    static DEFAULT_OPTIONS = {
        width: 400,  // Haute résolution
        height: 400,
        colorDark: '#1e3a8a', // Bleu marine fixe
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.Q, // Niveau de correction plus élevé
        margin: 2,
        quality: 1.0 // Qualité maximale
    };

    static async generateSingle(data, options = {}) {
        return new Promise((resolve, reject) => {
            try {
                console.log('🎨 Génération QR code haute qualité...');
                
                // Validation des données
                if (!data || typeof data !== 'string') {
                    reject(new Error('Données invalides pour le QR code'));
                    return;
                }
                
                if (data.length > 3000) {
                    console.warn('⚠️ Données très longues:', data.length);
                }
                
                // Options fusionnées avec priorité bleu marine
                const mergedOptions = {
                    text: data,
                    width: options.width || this.DEFAULT_OPTIONS.width,
                    height: options.height || this.DEFAULT_OPTIONS.height,
                    colorDark: '#1e3a8a', // Forcé bleu marine
                    colorLight: options.colorLight || this.DEFAULT_OPTIONS.colorLight,
                    correctLevel: options.correctLevel || this.DEFAULT_OPTIONS.correctLevel,
                    margin: options.margin || this.DEFAULT_OPTIONS.margin
                };
                
                // Container temporaire
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '-9999px';
                document.body.appendChild(container);
                
                // Génération avec qrcodejs
                const qr = new QRCode(container, mergedOptions);
                
                // Attendre la génération
                setTimeout(async () => {
                    try {
                        const canvas = container.querySelector('canvas');
                        const img = container.querySelector('img');
                        
                        let resultCanvas;
                        
                        if (canvas) {
                            // Canvas haute qualité
                            resultCanvas = this.createHighQualityCanvas(canvas);
                        } else if (img) {
                            // Fallback en image
                            resultCanvas = await this.convertImageToCanvas(img);
                        } else {
                            throw new Error('Aucun QR code généré');
                        }
                        
                        // Ajout du logo si présent
                        if (options.logo) {
                            try {
                                await this.addHighQualityLogo(resultCanvas, options.logo);
                            } catch (logoError) {
                                console.warn('Erreur logo:', logoError);
                            }
                        }
                        
                        // Ajout de bordures et effets
                        this.addEnhancements(resultCanvas);
                        
                        // Nettoyage
                        if (container.parentNode) {
                            document.body.removeChild(container);
                        }
                        
                        resolve({
                            canvas: resultCanvas,
                            data: data,
                            size: data.length,
                            dimensions: { width: resultCanvas.width, height: resultCanvas.height }
                        });
                        
                    } catch (error) {
                        if (container.parentNode) {
                            document.body.removeChild(container);
                        }
                        reject(error);
                    }
                }, 1000); // Délai plus long pour haute qualité
                
            } catch (error) {
                console.error('❌ Erreur génération QR:', error);
                reject(error);
            }
        });
    }

    static createHighQualityCanvas(sourceCanvas) {
        // Créer un canvas à plus haute résolution
        const scaleFactor = 2; // Scale 2x pour haute qualité
        const canvas = document.createElement('canvas');
        canvas.width = sourceCanvas.width * scaleFactor;
        canvas.height = sourceCanvas.height * scaleFactor;
        
        const ctx = canvas.getContext('2d');
        
        // Meilleur lissage
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Dessiner avec mise à l'échelle
        ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
        
        return canvas;
    }

    static async addHighQualityLogo(canvas, logoUrl) {
        return new Promise((resolve, reject) => {
            const logo = new Image();
            logo.crossOrigin = "Anonymous";
            
            logo.onload = () => {
                try {
                    const ctx = canvas.getContext('2d');
                    const logoSize = Math.min(canvas.width, canvas.height) * 0.18; // 18% pour haute visibilité
                    const x = (canvas.width - logoSize) / 2;
                    const y = (canvas.height - logoSize) / 2;
                    
                    // Fond blanc pour le logo
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(
                        x + logoSize / 2,
                        y + logoSize / 2,
                        logoSize / 2 + 4,
                        0,
                        Math.PI * 2
                    );
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                    
                    // Masque rond pour le logo
                    ctx.beginPath();
                    ctx.arc(
                        x + logoSize / 2,
                        y + logoSize / 2,
                        logoSize / 2,
                        0,
                        Math.PI * 2
                    );
                    ctx.clip();
                    
                    // Dessiner le logo
                    ctx.drawImage(logo, x, y, logoSize, logoSize);
                    ctx.restore();
                    
                    // Bordure décorative
                    ctx.beginPath();
                    ctx.arc(
                        x + logoSize / 2,
                        y + logoSize / 2,
                        logoSize / 2 + 2,
                        0,
                        Math.PI * 2
                    );
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#1e3a8a';
                    ctx.stroke();
                    
                    resolve(canvas);
                } catch (error) {
                    reject(error);
                }
            };
            
            logo.onerror = reject;
            logo.src = logoUrl;
        });
    }

    static addEnhancements(canvas) {
        const ctx = canvas.getContext('2d');
        
        // Ajouter un léger dégradé de fond
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, 'rgba(30, 58, 138, 0.03)');
        gradient.addColorStop(1, 'rgba(30, 64, 175, 0.01)');
        
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Bordure subtile
        ctx.strokeStyle = 'rgba(30, 58, 138, 0.1)';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    }

    static async generateBatch(config) {
        const {
            eventName,
            eventDate,
            eventTime,
            eventLocation,
            eventPrice,
            eventCapacity,
            eventCategory,
            eventDetails,
            quantity,
            logo,
            privateKey
        } = config;

        console.log(`🏭 Début génération batch: ${quantity} QR code(s)`);
        
        // Validation
        if (quantity <= 0 || quantity > 100) {
            throw new Error(`Quantité invalide: ${quantity}. Doit être entre 1 et 100.`);
        }

        if (!privateKey) {
            throw new Error('Clé privée requise pour la signature');
        }

        const qrCodes = [];
        const errors = [];
        
        // Progression
        const progress = {
            total: quantity,
            completed: 0,
            failed: 0
        };

        for (let i = 0; i < quantity; i++) {
            try {
                console.log(`📊 Progression: ${i + 1}/${quantity}`);
                
                // Données structurées
                const qrData = {
                    // Données événement
                    id: this.generateEventId(),
                    n: eventName || 'Événement',
                    d: eventDate || '',
                    t: eventTime || '',
                    l: eventLocation || '',
                    p: eventPrice || 'Gratuit',
                    c: eventCapacity || '',
                    cat: eventCategory || 'autre',
                    dt: eventDetails || '',
                    
                    // Métadonnées
                    s: i + 1, // Numéro de série
                    tq: quantity, // Quantité totale
                    ts: Date.now(), // Timestamp
                    ver: '2.0', // Version format
                    
                    // Infos technique
                    alg: 'ECDSA',
                    crc: this.calculateCRC(eventName + eventDate + i) // Checksum simple
                };

                // Supprimer les champs vides pour réduire la taille
                Object.keys(qrData).forEach(key => {
                    if (qrData[key] === '' || qrData[key] === null || qrData[key] === undefined) {
                        delete qrData[key];
                    }
                });

                console.log('📝 Données à signer:', qrData);
                
                // Signature
                const signature = await Signature.signData(qrData, privateKey);
                console.log('🔏 Signature générée:', signature.length, 'caractères');
                
                // Données finales
                const signedData = {
                    data: qrData,
                    signature: signature,
                    timestamp: new Date().toISOString()
                };

                const jsonData = JSON.stringify(signedData);
                const dataSize = jsonData.length;
                
                console.log(`📦 Taille données QR ${i + 1}: ${dataSize} caractères`);
                
                // Avertissement si trop grand
                if (dataSize > 2500) {
                    console.warn(`⚠️ QR code ${i + 1}: données volumineuses (${dataSize} caractères)`);
                }
                
                // Génération du QR code
                const result = await this.generateSingle(jsonData, {
                    colorLight: '#ffffff',
                    logo: logo,
                    width: 400,
                    height: 400,
                    correctLevel: dataSize > 2000 ? QRCode.CorrectLevel.Q : QRCode.CorrectLevel.H
                });

                qrCodes.push({
                    canvas: result.canvas,
                    data: signedData,
                    index: i,
                    serialNumber: i + 1,
                    eventId: qrData.id,
                    size: dataSize,
                    dimensions: result.dimensions
                });

                progress.completed++;
                
                // Mise à jour de l'interface si disponible
                if (window.qrGuardianApp && i === 0) {
                    window.qrGuardianApp.showQRPreview(result, quantity > 1);
                }
                
            } catch (error) {
                console.error(`❌ Erreur QR code ${i + 1}:`, error);
                errors.push({
                    index: i,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                progress.failed++;
                
                // Continuer avec les autres QR codes
                if (i === 0 && errors.length > 0) {
                    throw new Error(`Échec premier QR code: ${error.message}`);
                }
            }
        }

        // Rapport final
        console.log(`✅ Génération terminée: ${qrCodes.length} succès, ${errors.length} échecs`);
        
        if (errors.length > 0) {
            console.warn('❌ Échecs:', errors);
        }

        if (qrCodes.length === 0) {
            throw new Error('Aucun QR code généré avec succès');
        }

        return qrCodes;
    }

    static generateEventId() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `EVT-${timestamp}-${random}`;
    }

    static calculateCRC(str) {
        let crc = 0;
        for (let i = 0; i < str.length; i++) {
            crc = (crc + str.charCodeAt(i)) % 65536;
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    static async downloadQRCode(canvas, filename = 'qrcode.jpg') {
        return new Promise((resolve, reject) => {
            try {
                // Créer un canvas de téléchargement haute qualité
                const downloadCanvas = document.createElement('canvas');
                downloadCanvas.width = canvas.width;
                downloadCanvas.height = canvas.height;
                const ctx = downloadCanvas.getContext('2d');
                
                // Fond blanc
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);
                
                // Copier le QR code
                ctx.drawImage(canvas, 0, 0);
                
                // Qualité maximale
                downloadCanvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Impossible de créer l\'image'));
                        return;
                    }
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    
                    a.href = url;
                    a.download = filename;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    
                    // Nettoyage
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        resolve();
                    }, 100);
                    
                }, 'image/jpeg', 1.0); // Qualité 100%
                
            } catch (error) {
                console.error('Erreur téléchargement:', error);
                reject(error);
            }
        });
    }

    static async downloadBatchAsZip(qrCodes, eventName) {
        try {
            if (typeof JSZip === 'undefined') {
                throw new Error('Bibliothèque JSZip requise');
            }

            const zip = new JSZip();
            const date = new Date().toISOString().split('T')[0];
            const safeEventName = (eventName || 'qrcodes')
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase()
                .substring(0, 50);
            
            console.log(`🗜️ Création ZIP avec ${qrCodes.length} QR codes...`);
            
            // Dossier pour les QR codes
            const qrFolder = zip.folder('qr_codes');
            
            // Générer chaque QR code
            for (let i = 0; i < qrCodes.length; i++) {
                const qr = qrCodes[i];
                const blob = await this.canvasToBlob(qr.canvas);
                
                const filename = `${safeEventName}_${String(i + 1).padStart(3, '0')}.jpg`;
                qrFolder.file(filename, blob);
            }
            
            // Fichier CSV avec les informations
            const csv = this.generateCSV(qrCodes, eventName);
            zip.file('informations.csv', csv);
            
            // Fichier README
            const readme = this.createReadmeFile(qrCodes, eventName);
            zip.file('README.txt', readme);
            
            // Fichier JSON avec toutes les données
            const jsonData = JSON.stringify(qrCodes.map(qr => qr.data), null, 2);
            zip.file('donnees_completes.json', jsonData);
            
            // Génération du ZIP
            const zipBlob = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 } // Compression maximale
            });
            
            // Téléchargement
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `${safeEventName}_qrcodes_${date}.zip`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('✅ ZIP téléchargé avec succès');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur création ZIP:', error);
            throw error;
        }
    }

    static async canvasToBlob(canvas) {
        return new Promise((resolve) => {
            // Créer un canvas propre
            const cleanCanvas = document.createElement('canvas');
            cleanCanvas.width = canvas.width;
            cleanCanvas.height = canvas.height;
            const ctx = cleanCanvas.getContext('2d');
            
            // Fond blanc
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cleanCanvas.width, cleanCanvas.height);
            
            // Copier le QR code
            ctx.drawImage(canvas, 0, 0);
            
            // Export haute qualité
            cleanCanvas.toBlob(resolve, 'image/jpeg', 1.0);
        });
    }

    static generateCSV(qrCodes, eventName) {
        const headers = [
            'Numéro',
            'ID Événement',
            'Nom',
            'Date',
            'Lieu',
            'Prix',
            'URL Données'
        ];
        
        const rows = qrCodes.map((qr, index) => [
            index + 1,
            qr.data.data.id || '',
            eventName || '',
            qr.data.data.d || '',
            qr.data.data.l || '',
            qr.data.data.p || '',
            `data:application/json;base64,${btoa(JSON.stringify(qr.data))}`
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
        
        return csvContent;
    }

    static createReadmeFile(qrCodes, eventName) {
        const firstQR = qrCodes[0];
        const data = firstQR.data;
        
        return `QR CODES PROFESSIONNELS - ${eventName || 'Événement'}
==============================================

INFORMATIONS GÉNÉRALES
----------------------
• Événement: ${eventName || 'Non spécifié'}
• Date: ${data.data.d || 'Non spécifiée'}
• Lieu: ${data.data.l || 'Non spécifié'}
• Nombre de QR codes: ${qrCodes.length}
• Date de génération: ${new Date().toLocaleString('fr-FR')}
• Format: QR Code version 2.0 avec signature ECDSA

CARACTÉRISTIQUES TECHNIQUES
---------------------------
• Taille: 400x400 pixels
• Couleur: Bleu marine (#1e3a8a)
• Niveau de correction: ${firstQR.size > 2000 ? 'Q (25%)' : 'H (30%)'}
• Signature: ECDSA avec courbe P-256
• Encodage: JSON compressé

UTILISATION
-----------
1. Ces QR codes sont signés numériquement pour garantir l'authenticité
2. Utilisez l'application QRGuardian pour la vérification
3. Chaque code contient un numéro de série unique
4. Les données incluent toutes les informations de l'événement

SÉCURITÉ
--------
• La clé privée de signature n'est jamais incluse
• Chaque code est unique et non duplicable
• La signature ECDSA garantit l'intégrité des données

SUPPORT
-------
Pour toute question, consultez la documentation de QRGuardian.

© ${new Date().getFullYear()} QRGuardian Pro - Tous droits réservés
`;
    }
}

// Alias pour compatibilité
const QRCodeGenerator = HighQualityQRCodeGenerator;