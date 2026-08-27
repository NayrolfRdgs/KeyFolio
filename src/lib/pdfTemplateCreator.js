import { getPdfTemplateBytes } from './db'
import { fillPdfTemplate } from './pdfTemplateEngine'

/**
 * Génère le document PDF officiel en injectant les données directement dans le modèle PDF du disque.
 */
export async function createPdfFromTemplate({
  templatePdfName = 'modele_contrat_bail.pdf',
  dataContext = {},
  fallbackGenerator = null
}) {
  try {
    // 1. Tenter le chargement et le remplissage du vrai fichier modèle PDF
    const base64Str = await getPdfTemplateBytes(templatePdfName)
    if (base64Str) {
      const cleanB64 = base64Str.includes('base64,') ? base64Str.split('base64,')[1] : base64Str
      const binaryStr = atob(cleanB64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }

      const { bytes: outputBytes, doc } = await fillPdfTemplate(bytes, dataContext)

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
        doc,
        isFromDiskTemplate: true,
        usedTemplate: templatePdfName
      }
    }
  } catch (err) {
    console.warn(`Template ${templatePdfName} introuvable ou erreur de substitution, tentative fallback:`, err)
  }

  // 2. Fallback de secours si le template PDF n'est pas encore disponible
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
      usedTemplate: 'fallback_generator'
    }
  }

  throw new Error(`Impossible de générer le document : modèle ${templatePdfName} non trouvé.`)
}
