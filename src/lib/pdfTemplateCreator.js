import { PDFDocument } from 'pdf-lib'
import { getPdfTemplateBytes } from './db'

/**
 * Génère le document PDF vectoriel officiel avec synchronisation en direct.
 * Si un formulaire PDF interactif avec champs AcroForm existe, il injecte les données.
 * Sinon, il utilise le générateur haute fidélité (jsPDF) pour un rendu parfait pièce par pièce.
 */
export async function createPdfFromTemplate({
  templatePdfName = 'modele_contrat_bail.pdf',
  dataContext = {},
  fallbackGenerator = null
}) {
  try {
    // 1. Si un générateur jsPDF complet est fourni, l'exécuter pour garantir le rendu dynamique
    if (fallbackGenerator) {
      const doc = fallbackGenerator()
      const blob = doc.output('blob')
      const blobUrl = URL.createObjectURL(blob)
      const dataUri = doc.output('datauristring')

      return {
        blob,
        blobUrl,
        dataUri,
        doc,
        isFromDiskTemplate: false,
        usedTemplate: 'keyfolio_document_system'
      }
    }

    // 2. Si pas de générateur direct, tenter le remplissage de formulaire PDF
    const base64Str = await getPdfTemplateBytes(templatePdfName)
    if (!base64Str) {
      throw new Error(`Template ${templatePdfName} vide ou introuvable`)
    }

    const cleanB64 = base64Str.includes('base64,') ? base64Str.split('base64,')[1] : base64Str
    const binaryStr = atob(cleanB64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    const pdfDoc = await PDFDocument.load(bytes)
    const form = pdfDoc.getForm()
    const fields = form ? form.getFields() : []

    if (fields && fields.length > 0) {
      fields.forEach(field => {
        const name = field.getName().toLowerCase().replace(/[{}_-]/g, '').trim()
        const matchedEntry = Object.entries(dataContext).find(([k]) => {
          const cleanK = k.toLowerCase().replace(/_/g, '')
          return cleanK === name || name.includes(cleanK) || cleanK.includes(name)
        })

        if (matchedEntry && matchedEntry[1] !== undefined && matchedEntry[1] !== null) {
          try {
            if (field.constructor.name === 'PDFTextField') {
              field.setText(String(matchedEntry[1]))
            }
          } catch (e) {}
        }
      })
      try { form.flatten() } catch (e) {}
    }

    const outputBytes = await pdfDoc.save()
    const blob = new Blob([outputBytes], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)

    let binary = ''
    const len = outputBytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(outputBytes[i])
    }
    const dataUri = `data:application/pdf;base64,${btoa(binary)}`

    return {
      blob,
      blobUrl,
      dataUri,
      isFromDiskTemplate: true,
      usedTemplate: templatePdfName
    }
  } catch (err) {
    if (fallbackGenerator) {
      const doc = fallbackGenerator()
      const blob = doc.output('blob')
      const blobUrl = URL.createObjectURL(blob)
      const dataUri = doc.output('datauristring')

      return {
        blob,
        blobUrl,
        dataUri,
        doc,
        isFromDiskTemplate: false,
        usedTemplate: 'keyfolio_document_system'
      }
    }
    throw err
  }
}
