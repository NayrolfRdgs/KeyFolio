/**
 * Service de géocodage pour KeyFolio
 * Supporte :
 * 1. Dictionnaire hors-ligne instantané pour les principales villes et codes postaux français
 * 2. Requête en ligne via OpenStreetMap Nominatim avec User-Agent KeyFolio
 * 3. Fallback gracieux si aucune connexion
 */

const OFFLINE_CITY_COORDINATES = {
  // Grandes métropoles et villes de France
  'paris': { lat: 48.8566, lon: 2.3522 },
  '75000': { lat: 48.8566, lon: 2.3522 },
  '75001': { lat: 48.8606, lon: 2.3376 },
  '75008': { lat: 48.8722, lon: 2.3126 },
  '75012': { lat: 48.8412, lon: 2.3876 },
  'rennes': { lat: 48.1173, lon: -1.6778 },
  '35000': { lat: 48.1173, lon: -1.6778 },
  'toulouse': { lat: 43.6047, lon: 1.4442 },
  '31000': { lat: 43.6047, lon: 1.4442 },
  'strasbourg': { lat: 48.5734, lon: 7.7521 },
  '67000': { lat: 48.5734, lon: 7.7521 },
  'lyon': { lat: 45.7640, lon: 4.8357 },
  '69000': { lat: 45.7640, lon: 4.8357 },
  '69002': { lat: 45.7533, lon: 4.8322 },
  'antibes': { lat: 43.5804, lon: 7.1251 },
  '06160': { lat: 43.5804, lon: 7.1251 },
  'la seyne-sur-mer': { lat: 43.1042, lon: 5.8828 },
  'la seyne': { lat: 43.1042, lon: 5.8828 },
  '83500': { lat: 43.1042, lon: 5.8828 },
  'marseille': { lat: 43.2965, lon: 5.3698 },
  '13000': { lat: 43.2965, lon: 5.3698 },
  'bordeaux': { lat: 44.8378, lon: -0.5792 },
  '33000': { lat: 44.8378, lon: -0.5792 },
  'nantes': { lat: 47.2184, lon: -1.5536 },
  '44000': { lat: 47.2184, lon: -1.5536 },
  'lille': { lat: 50.6292, lon: 3.0573 },
  '59000': { lat: 50.6292, lon: 3.0573 },
  'montpellier': { lat: 43.6108, lon: 3.8767 },
  '34000': { lat: 43.6108, lon: 3.8767 },
  'nice': { lat: 43.7102, lon: 7.2620 },
  '06000': { lat: 43.7102, lon: 7.2620 },
  'grenoble': { lat: 45.1885, lon: 5.7245 },
  '38000': { lat: 45.1885, lon: 5.7245 },
  'toulon': { lat: 43.1242, lon: 5.9280 },
  '83000': { lat: 43.1242, lon: 5.9280 },
  'brest': { lat: 48.3904, lon: -4.4861 },
  '29200': { lat: 48.3904, lon: -4.4861 },
  'clermont-ferrand': { lat: 45.7772, lon: 3.0870 },
  '63000': { lat: 45.7772, lon: 3.0870 },
  'rouen': { lat: 49.4432, lon: 1.0999 },
  '76000': { lat: 49.4432, lon: 1.0999 },
  'reims': { lat: 49.2583, lon: 4.0317 },
  '51100': { lat: 49.2583, lon: 4.0317 },
  'dijon': { lat: 47.3220, lon: 5.0415 },
  '21000': { lat: 47.3220, lon: 5.0415 },
  'angers': { lat: 47.4784, lon: -0.5632 },
  '49000': { lat: 47.4784, lon: -0.5632 },
}

export function findOfflineCoordinates(address) {
  if (!address || typeof address !== 'string') return null
  const cleaned = address.toLowerCase()

  // 1. Recherche par code postal
  const cpMatch = cleaned.match(/\b\d{5}\b/)
  if (cpMatch && OFFLINE_CITY_COORDINATES[cpMatch[0]]) {
    return OFFLINE_CITY_COORDINATES[cpMatch[0]]
  }

  // 2. Recherche par nom de ville
  for (const [key, coords] of Object.entries(OFFLINE_CITY_COORDINATES)) {
    if (cleaned.includes(key)) {
      return coords
    }
  }

  return null
}

export async function geocodeAddress(address) {
  if (!address || !address.trim()) return null

  // 1. Essai en ligne avec Nominatim OpenStreetMap
  try {
    const query = encodeURIComponent(address.trim())
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'KeyFolio-Desktop-Property-Manager/1.0'
      }
    })

    if (res.ok) {
      const data = await res.json()
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        }
      }
    }
  } catch (err) {
    // Mode hors-ligne ou timeout
    console.warn('Geocoding en ligne indisponible, fallback local :', err)
  }

  // 2. Fallback dictionnaire hors-ligne
  const fallback = findOfflineCoordinates(address)
  if (fallback) {
    // Légère variation aléatoire (jitter ~300m) pour éviter que 2 biens dans la même ville soient exactement superposés
    const jitterLat = (Math.random() - 0.5) * 0.006
    const jitterLon = (Math.random() - 0.5) * 0.006
    return {
      lat: fallback.lat + jitterLat,
      lon: fallback.lon + jitterLon
    }
  }

  return null
}
