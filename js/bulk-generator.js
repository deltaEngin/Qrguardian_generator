// bulk-generator.js - Génération en lot pour QRGuardian Pro
// Version PDF et JPG/ZIP, avec spinner et chargement auto de jsPDF
class BulkQRGenerator {
    constructor(qrGuardianApp) {
        this.app = qrGuardianApp;
        this.currentBatch = [];
        this.isBatchGenerating = false;
        this.batchProgress = 0;
    }

    // ===== GÉNÉRATION DU LOT =====
    async generateBatch(count) {
        if (this.isBatchGenerating) {
            this.app.showNotification('Génération en cours', 'Veuillez patienter...', 'warning');
            return null;
        }

        const eventName = document.getElementById('eventName')?.value.trim();
        const eventLocation = document.getElementById('eventLocation')?.value.trim();
        if (!eventName || !eventLocation) {
            this.app.showNotification('Champs requis', 'Nom et lieu de l\'événement sont requis.', 'error');
            return null;
        }

        // Récupérer les dates et le statut
        const startInput = document.getElementById('eventStart');
        const endInput = document.getElementById('eventEnd');
        let start = null, end = null;
        if (startInput && startInput.value) {
            const date = new Date(startInput.value);
            date.setHours(0, 0, 0, 0);
            start = date.getTime();
        }
        if (endInput && endInput.value) {
            const date = new Date(endInput.value);
            date.setHours(23, 59, 59, 999);
            end = date.getTime();
        }
        const status = document.getElementById('eventStatus')?.value || 'Standard';

        this.isBatchGenerating = true;
        this.currentBatch = [];
        this.batchProgress = 0;

        const generateBtn = document.getElementById('generateBulkBtn');
        const originalBtnText = generateBtn ? generateBtn.innerHTML : '';
        if (generateBtn) {
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
            generateBtn.disabled = true;
        }

        const batchInfo = document.getElementById('batchInfo');
        if (batchInfo) batchInfo.style.display = 'block';
        this.showBatchProgress(0, count);

        try {
            const batchResults = [];
            const baseTimestamp = Date.now();
            const price = document.getElementById('eventPrice')?.value.trim() || 'Gratuit';

            for (let i = 0; i < count; i++) {
                if (!this.isBatchGenerating) break;

                try {
                    const eventData = {
                        n: eventName,
                        p: price,
                        l: eventLocation,
                        s: status,
                        ts: baseTimestamp + i,
                        id: this.app.generateEventId(),
                        sc: this.app.getSecurityCode(),
                        series: i + 1,
                        total: count,
                        start: start,
                        end: end
                    };

                    // Générer l'image du QR code avec fond blanc et padding
                    const qrImageDataURL = await this.generateQRImageWithPadding(eventData, 512); // Taille Full HD
                    batchResults.push({
                        ...eventData,
                        imageDataURL: qrImageDataURL,
                        fileName: `${eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${eventData.series}_${eventData.id}.jpg`
                    });

                    this.showBatchProgress(i + 1, count);
                    if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 10));
                } catch (err) {
                    console.error(`❌ Erreur QR ${i + 1}:`, err);
                }
            }

            this.currentBatch = batchResults;
            this.isBatchGenerating = false;
            this.showBatchProgress(this.currentBatch.length, count);
            this.showBatchActions();

            this.app.showNotification(
                'Génération terminée',
                `${batchResults.length} QR codes générés.`,
                'success'
            );
            return batchResults;
        } catch (error) {
            console.error('❌ Erreur génération lot:', error);
            this.app.showNotification('Erreur', 'Échec de la génération.', 'error');
            this.isBatchGenerating = false;
            return null;
        } finally {
            if (generateBtn) {
                generateBtn.innerHTML = originalBtnText;
                generateBtn.disabled = false;
            }
        }
    }

    // ===== GÉNÉRATION D'UNE IMAGE QR AVEC FOND BLANC ET PADDING =====
    async generateQRImageWithPadding(eventData, size = 512) {
        return new Promise((resolve, reject) => {
            try {
                const qrContent = `https://qrguardian.app/e?${this.encodeToUrlParams(eventData)}`;
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                document.body.appendChild(tempDiv);

                new QRCode(tempDiv, {
                    text: qrContent,
                    width: size,
                    height: size,
                    colorDark: "#0a1a3a", // Couleur plus foncée
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });

                setTimeout(() => {
                    const canvas = tempDiv.querySelector('canvas');
                    if (canvas) {
                        // Créer un nouveau canvas avec fond blanc et padding
                        const padding = 10; // padding autour du QR
                        const finalSize = size + 2 * padding;
                        const finalCanvas = document.createElement('canvas');
                        finalCanvas.width = finalSize;
                        finalCanvas.height = finalSize;
                        const ctx = finalCanvas.getContext('2d');
                        // Fond blanc
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, finalSize, finalSize);
                        // Dessiner le QR centré
                        ctx.drawImage(canvas, padding, padding, size, size);
                        // Convertir en dataURL
                        const dataURL = finalCanvas.toDataURL('image/jpeg', 0.95);
                        document.body.removeChild(tempDiv);
                        resolve(dataURL);
                    } else {
                        document.body.removeChild(tempDiv);
                        reject(new Error('Canvas non généré'));
                    }
                }, 200);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ===== ENCODE EN PARAMÈTRES URL =====
    encodeToUrlParams(data) {
        const params = new URLSearchParams();
        if (data.n) params.append('n', data.n.substring(0, 80));
        if (data.p) params.append('p', data.p.substring(0, 30));
        if (data.l) params.append('l', data.l.substring(0, 80));
        if (data.s) params.append('s', data.s.substring(0, 10));
        if (data.ts) params.append('ts', data.ts);
        if (data.id) params.append('id', data.id);
        if (data.sc) params.append('sc', data.sc);
        if (data.start) params.append('start', data.start);
        if (data.end) params.append('end', data.end);
        return params.toString();
    }

    // ===== AFFICHAGE DE LA PROGRESSION (GÉNÉRATION) =====
    showBatchProgress(current, total) {
        const progress = Math.round((current / total) * 100);
        const progressText = document.getElementById('batchProgressText');
        const countText = document.getElementById('batchCountText');
        const progressFill = document.getElementById('batchProgressFill');
        const batchGenerated = document.getElementById('batchGenerated');

        if (progressText) progressText.textContent = `Génération: ${progress}%`;
        if (countText) countText.textContent = `${current}/${total}`;
        if (batchGenerated) batchGenerated.textContent = current;

        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            progressFill.style.background = 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)';
            progressFill.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
            progressFill.style.transition = 'width 0.3s ease, box-shadow 0.3s';

            if (this.isBatchGenerating) {
                progressFill.classList.add('progress-shimmer');
            } else {
                progressFill.classList.remove('progress-shimmer');
            }
        }
    }

    // ===== AFFICHAGE DES BOUTONS APRÈS GÉNÉRATION =====
    showBatchActions() {
        const batchActions = document.getElementById('batchActions');
        const downloadPdfBtn = document.getElementById('downloadBulkBtn');
        const downloadJpgBtn = document.getElementById('downloadBulkJpgBtn');

        if (batchActions) batchActions.style.display = 'block';
        if (downloadPdfBtn) downloadPdfBtn.style.display = 'flex';
        if (downloadJpgBtn) downloadJpgBtn.style.display = 'flex';

        const estimatedSize = Math.round(this.currentBatch.length * 50); // Estimation plus réaliste pour JPG
        const zipSizeElement = document.getElementById('batchZipSize');
        if (zipSizeElement) zipSizeElement.textContent = `${estimatedSize} KB estimés`;
    }

    // ===== CHARGEMENT DYNAMIQUE DE JSPDF =====
    async ensureJSPDFLoaded() {
        if (window.jspdf?.jsPDF || typeof window.jsPDF === 'function') {
            return true;
        }

        try {
            await this.loadScript('./js/jspdf.umd.min.js');
            if (window.jspdf?.jsPDF || typeof window.jsPDF === 'function') {
                return true;
            }
        } catch (e) {
            console.warn('⚠️ Chargement local échoué, tentative CDN...');
        }

        try {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
            if (window.jspdf?.jsPDF || typeof window.jsPDF === 'function') {
                return true;
            }
        } catch (e) {
            console.error('❌ Échec du chargement CDN');
        }

        throw new Error('Impossible de charger la bibliothèque jsPDF (local ou CDN)');
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ===== TÉLÉCHARGER EN TANT QUE PDF (AVEC GRILLE A4) =====
    async downloadBatchAsPDF() {
        if (!this.currentBatch || this.currentBatch.length === 0) {
            this.app.showNotification('Lot vide', 'Aucun QR code à exporter.', 'warning');
            return;
        }

        const pdfBtn = document.getElementById('downloadBulkBtn');
        const originalBtnHTML = pdfBtn ? pdfBtn.innerHTML : '';
        if (pdfBtn) {
            pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération PDF...';
            pdfBtn.disabled = true;
        }

        try {
            await this.ensureJSPDFLoaded();

            let jsPDF;
            if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
                jsPDF = window.jspdf.jsPDF;
            } else if (typeof window.jsPDF === 'function') {
                jsPDF = window.jsPDF;
            } else {
                throw new Error('jsPDF non disponible');
            }

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const qrSize = 38;
            const cols = 4;
            const rowsPerPage = 5;
            const cellWidth = (pageWidth - 2 * margin) / cols;
            const cellHeight = (pageHeight - 2 * margin) / rowsPerPage;

            let x, y;

            for (let i = 0; i < this.currentBatch.length; i++) {
                const qr = this.currentBatch[i];
                const col = i % cols;
                const row = Math.floor(i / cols) % rowsPerPage;

                if (i > 0 && i % (cols * rowsPerPage) === 0) {
                    pdf.addPage();
                }

                x = margin + col * cellWidth;
                y = margin + row * cellHeight;

                const img = new Image();
                img.src = qr.imageDataURL;
                await new Promise(resolve => { img.onload = resolve; });

                pdf.addImage(img, 'JPEG', x, y, qrSize, qrSize);
                pdf.setFontSize(8);
                pdf.setTextColor(100, 100, 100);
                pdf.text(qr.id, x + qrSize / 2, y + qrSize + 5, { align: 'center' });

                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.2);
                pdf.rect(x, y, cellWidth - 2, cellHeight - 2);
            }

            pdf.save(`QRGuardian_Lot_${this.currentBatch.length}_${Date.now()}.pdf`);
            this.app.showNotification('PDF généré', 'Le fichier PDF a été téléchargé.', 'success');
        } catch (error) {
            console.error('❌ Erreur PDF:', error);
            this.app.showNotification('Erreur', error.message || 'Échec de la génération du PDF.', 'error');
        } finally {
            if (pdfBtn) {
                pdfBtn.innerHTML = originalBtnHTML;
                pdfBtn.disabled = false;
            }
        }
    }

    // ===== TÉLÉCHARGER EN TANT QUE ZIP (JPG) =====
    async downloadBatchAsJPGZip() {
        if (!this.currentBatch || this.currentBatch.length === 0) {
            this.app.showNotification('Lot vide', 'Aucun QR code à exporter.', 'warning');
            return;
        }

        const zipBtn = document.getElementById('downloadBulkJpgBtn');
        const originalBtnHTML = zipBtn ? zipBtn.innerHTML : '';
        if (zipBtn) {
            zipBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création ZIP...';
            zipBtn.disabled = true;
        }

        try {
            // Vérifier que JSZip est disponible
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip non chargé. Vérifiez la bibliothèque.');
            }

            const zip = new JSZip();
            const folder = zip.folder('QRGuardian_Lot');

            for (let i = 0; i < this.currentBatch.length; i++) {
                const qr = this.currentBatch[i];
                // Extraire le dataURL en blob
                const response = await fetch(qr.imageDataURL);
                const blob = await response.blob();
                // Nom du fichier : nom_qrcode - (Id: identifiant).jpg
                const fileName = `${qr.n.replace(/[^a-z0-9]/gi, '_').toLowerCase()} - (Id: ${qr.id}).jpg`;
                folder.file(fileName, blob, { binary: true });
            }

            // Générer le zip
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `QRGuardian_Lot_${this.currentBatch.length}_${Date.now()}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);

            this.app.showNotification('ZIP généré', 'Le fichier ZIP contenant les JPG a été téléchargé.', 'success');
        } catch (error) {
            console.error('❌ Erreur ZIP:', error);
            this.app.showNotification('Erreur', error.message || 'Échec de la création du ZIP.', 'error');
        } finally {
            if (zipBtn) {
                zipBtn.innerHTML = originalBtnHTML;
                zipBtn.disabled = false;
            }
        }
    }

    // ===== CRÉATION DU CSV =====
    createBatchCSV() {
        const headers = ["N°", "ID", "Événement", "Prix", "Lieu", "Statut", "Code Secret"];
        const rows = this.currentBatch.map(qr => [
            qr.series,
            qr.id,
            qr.n || '',
            qr.p || '',
            qr.l || '',
            qr.s || 'Standard',
            qr.sc || ''
        ]);
        return [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    }

    // ===== FICHIER README =====
    createReadmeFile() {
        const first = this.currentBatch[0];
        return `QRGuardian Pro - Lot de QR Codes
=================================
Date: ${new Date().toLocaleString()}
QR codes: ${this.currentBatch.length}
Événement: ${first?.n || ''}
Lieu: ${first?.l || ''}
Prix: ${first?.p || 'Gratuit'}
Statut: ${first?.s || 'Standard'}
Code secret UNIQUE: ${first?.sc || ''}

- Chaque QR code contient le même code secret.
- Détection automatique des doublons.
- Utilisation unique.
`;
    }

    // ===== MÉTADONNÉES JSON =====
    createMetadataFile() {
        const first = this.currentBatch[0];
        return {
            generator: "QRGuardian Pro",
            version: "3.0",
            batch: {
                count: this.currentBatch.length,
                generated_at: new Date().toISOString(),
                event_name: first?.n || '',
                event_location: first?.l || '',
                event_price: first?.p || '',
                event_status: first?.s || 'Standard'
            },
            security: {
                system: "Unique Security Code",
                code: first?.sc || '',
                anti_fraud: true,
                duplicate_detection: true,
                single_use: true
            }
        };
    }

    // ===== APERÇU DES QR CODES – VERSION COMPACTE =====
    showBatchPreview() {
        if (!this.currentBatch || this.currentBatch.length === 0) {
            this.app.showNotification('Lot vide', 'Aucun QR code à afficher.', 'warning');
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 9999;
            display: flex;
            flex-direction: column;
            padding: 15px;
            overflow-y: auto;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--color-border);
        `;
        header.innerHTML = `
            <h2 style="color: white; font-size: 1.3rem; margin: 0; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-eye"></i> Prévisualisation du lot
            </h2>
            <button id="closePreviewBtn" style="
                background: var(--color-danger);
                color: white;
                border: none;
                border-radius: 50%;
                width: 36px;
                height: 36px;
                cursor: pointer;
                font-size: 1.1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            "><i class="fas fa-times"></i></button>
        `;
        const closeBtn = header.querySelector('#closePreviewBtn');
        closeBtn.onclick = () => overlay.remove();

        const grid = document.createElement('div');
        grid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 12px;
            flex: 1;
            overflow-y: auto;
            padding: 5px;
        `;

        const displayCount = Math.min(this.currentBatch.length, 50);
        for (let i = 0; i < displayCount; i++) {
            const qr = this.currentBatch[i];
            const card = document.createElement('div');
            card.style.cssText = `
                background: var(--color-surface);
                border-radius: 8px;
                padding: 10px;
                border: 1px solid var(--color-border);
                text-align: center;
                transition: transform 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
            `;
            card.innerHTML = `
                <div style="margin-bottom: 5px; font-size: 0.7rem;">
                    <span style="background: var(--color-secondary); padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                        #${qr.series}
                    </span>
                </div>
                <div style="width: 100px; height: 100px; margin: 0 auto 6px; 
                            background: white; border-radius: 6px; 
                            display: flex; align-items: center; justify-content: center;">
                    <img src="${qr.imageDataURL}" alt="QR Code" 
                         style="width: 92px; height: 92px; object-fit: contain;">
                </div>
                <div style="font-size: 0.65rem; width: 100%;">
                    <div style="color: var(--color-text-secondary); margin-bottom: 2px;">ID</div>
                    <div style="font-family: monospace; color: var(--color-primary-light); 
                                word-break: break-all; line-height: 1.2;">
                        ${qr.id}
                    </div>
                </div>
            `;
            card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-3px)');
            card.addEventListener('mouseleave', () => card.style.transform = 'translateY(0)');
            grid.appendChild(card);
        }

        const footer = document.createElement('div');
        footer.style.cssText = `
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid var(--color-border);
            color: var(--color-text-secondary);
            font-size: 0.8rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        footer.innerHTML = `
            <span><i class="fas fa-qrcode"></i> ${this.currentBatch.length} QR codes générés</span>
            <span>Affichage des ${displayCount} premiers</span>
        `;

        overlay.appendChild(header);
        overlay.appendChild(grid);
        overlay.appendChild(footer);
        document.body.appendChild(overlay);
    }

    // ===== ARRÊTER LA GÉNÉRATION =====
    stopBatchGeneration() {
        this.isBatchGenerating = false;
        this.currentBatch = [];
        this.batchProgress = 0;
    }

    // ===== STATISTIQUES DU LOT =====
    getBatchStats() {
        return {
            count: this.currentBatch.length,
            size: Math.round(this.currentBatch.length * 50),
            isGenerating: this.isBatchGenerating,
            progress: this.batchProgress
        };
    }
}

if (typeof window !== 'undefined') {
    window.BulkQRGenerator = BulkQRGenerator;
}
