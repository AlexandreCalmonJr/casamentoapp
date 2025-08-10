export class PDFGenerator {
    constructor() {
        this.loadjsPDF();
    }

    async loadjsPDF() {
        if (typeof window.jsPDF === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => resolve();
            });
        }
    }

    async generateDressCodePDF(weddingDetails, userRole, palettes) {
        await this.loadjsPDF();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurações
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPosition = margin;

        const addCenteredText = (text, fontSize, color = [0, 0, 0]) => {
            doc.setFontSize(fontSize);
            doc.setTextColor(...color);
            const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
            const x = (pageWidth - textWidth) / 2;
            doc.text(text, x, yPosition);
            yPosition += fontSize * 0.5;
        };

        const addText = (text, fontSize, color = [0, 0, 0]) => {
            doc.setFontSize(fontSize);
            doc.setTextColor(...color);
            doc.text(text, margin, yPosition);
            yPosition += fontSize * 0.4;
        };

        // Cabeçalho
        addCenteredText(`${weddingDetails.coupleNames}`, 24, [93, 92, 222]);
        yPosition += 10;
        addCenteredText('Manual de Vestimenta', 18, [0, 0, 0]);
        yPosition += 15;

        // Informações gerais
        addText(`Querido(a) ${userRole},`, 14);
        yPosition += 5;
        
        const introText = `Estamos muito felizes em tê-lo(a) conosco neste dia especial! Para que tudo fique ainda mais harmonioso, preparamos este guia de cores especialmente para você.`;
        const splitText = doc.splitTextToSize(introText, pageWidth - 2 * margin);
        doc.text(splitText, margin, yPosition);
        yPosition += splitText.length * 6 + 15;

        addText(`Dress Code: ${weddingDetails.dressCode || 'Elegante'}`, 14, [139, 69, 19]);
        yPosition += 15;

        // Paleta de Cores
        if (palettes && palettes[userRole] && palettes[userRole].length > 0) {
            addText('Sua Paleta de Cores:', 16, [93, 92, 222]);
            yPosition += 10;

            const colorSize = 15;
            const colorsPerRow = 6;
            let startX = margin;
            
            palettes[userRole].forEach((color, index) => {
                const row = Math.floor(index / colorsPerRow);
                const col = index % colorsPerRow;
                const x = startX + (col * (colorSize + 5));
                const y = yPosition + (row * (colorSize + 10));

                const rgb = this.hexToRgb(color);
                doc.setFillColor(rgb.r, rgb.g, rgb.b);
                doc.rect(x, y, colorSize, colorSize, 'F');
                doc.setDrawColor(200, 200, 200);
                doc.rect(x, y, colorSize, colorSize, 'S');
            });

            yPosition += Math.ceil(palettes[userRole].length / colorsPerRow) * (colorSize + 10) + 15;
        }

        // Dicas
        yPosition += 5;
        addText('Dicas Importantes:', 14, [93, 92, 222]);
        yPosition += 5;
        const tips = [
            '• Use as cores sugeridas como base para sua roupa.',
            '• Sinta-se à vontade para combinar com tons neutros.',
            '• Pedimos a gentileza de evitar o branco, reservado para a noiva.',
            '• Para dúvidas, entre em contato conosco.'
        ];
        tips.forEach(tip => { addText(tip, 11); yPosition += 2; });

        // Detalhes do Evento
        yPosition += 15;
        addText('Detalhes do Evento:', 14, [93, 92, 222]);
        yPosition += 5;
        
        // CORREÇÃO: Trata tanto Timestamp do Firestore quanto Date do JS
        const dateObject = weddingDetails.weddingDate.toDate ? weddingDetails.weddingDate.toDate() : weddingDetails.weddingDate;
        const eventDate = new Date(dateObject);

        addText(`Data: ${eventDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 11);
        addText(`Horário: ${eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`, 11);
        addText(`Local: ${weddingDetails.venue}`, 11);

        // Rodapé
        yPosition = doc.internal.pageSize.getHeight() - 30;
        addCenteredText('Com carinho,', 12, [100, 100, 100]);
        addCenteredText(weddingDetails.coupleNames, 14, [93, 92, 222]);

        const fileName = `manual-vestimenta-${userRole.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        doc.save(fileName);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
    }
}
