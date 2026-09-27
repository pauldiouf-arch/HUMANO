class ErreurHumano extends Error {
  constructor(code, message) {
    super(message || (MESSAGES_ERREUR[code] || MESSAGES_ERREUR.INTERNE));
    this.name = 'ErreurHumano';
    this.code = code;
  }
}

const MESSAGES_ERREUR = Object.freeze({
  NON_AUTORISE: 'Session absente ou expirée. Reconnectez-vous.',
  IDENTIFIANTS: 'Mot de passe ou code incorrect.',
  VERROUILLE: 'Trop d\'essais. Compte verrouillé temporairement.',
  INVALIDE: 'Données invalides.',
  INTROUVABLE: 'Élément introuvable.',
  FERME: 'Ce test n\'est plus accessible.',
  ETAT: 'Action impossible à cette étape.',
  PLAFOND: 'Nombre maximal d\'échanges atteint pour ce test.',
  LIMITE: 'Trop de demandes. Réessayez plus tard.',
  IA_CLE: 'Clé de l\'IA absente ou refusée. Vérifiez la configuration.',
  IA_QUOTA: 'Quota de l\'IA atteint pour aujourd\'hui.',
  IA_INDISPONIBLE: 'Service d\'IA momentanément indisponible. Réessayez.',
  IA_REPONSE: 'Réponse de l\'IA inexploitable. Réessayez.',
  MAIL_QUOTA: 'Quota d\'envoi d\'e-mails atteint pour aujourd\'hui.',
  INTERNE: 'Erreur interne. Réessayez.'
});

function erreur(code) {
  return new ErreurHumano(code, MESSAGES_ERREUR[code] || MESSAGES_ERREUR.INTERNE);
}

function maintenantIso() {
  return new Date().toISOString();
}

function octetsVersHex(octets) {
  return octets.map((b) => ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2)).join('');
}

function sha256Hex(texte) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texte), Utilities.Charset.UTF_8);
  return octetsVersHex(digest);
}

function jetonAleatoire() {
  const u1 = Utilities.getUuid().split('-').join('').toLowerCase();
  const u2 = Utilities.getUuid().split('-').join('').toLowerCase();
  return (u1 + u2).slice(0, 64);
}

function genererId(prefixe) {
  const hex = Utilities.getUuid().split('-').join('').toLowerCase().slice(0, 12);
  return String(prefixe) + hex;
}

function egaliteConstante(a, b) {
  const sA = String(a);
  const sB = String(b);
  if (sA.length !== sB.length) return false;
  let diff = 0;
  for (let i = 0; i < sA.length; i++) {
    diff |= sA.charCodeAt(i) ^ sB.charCodeAt(i);
  }
  return diff === 0;
}

function masquerEmail(email) {
  const s = String(email || '').trim().toLowerCase();
  const parties = s.split('@');
  if (parties.length !== 2) return '***';
  const local = parties[0];
  const domaine = parties[1];
  const premier = local.length > 0 ? local.charAt(0) : '';
  return premier + '***@' + domaine;
}

const Valider = Object.freeze({
  objet(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw erreur('INVALIDE');
    return v;
  },
  texte(v, min, max) {
    if (typeof v !== 'string') throw erreur('INVALIDE');
    const t = v.trim();
    if (t.length < min || (max !== undefined && t.length > max)) throw erreur('INVALIDE');
    return t;
  },
  entier(v, min, max) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || (max !== undefined && n > max)) throw erreur('INVALIDE');
    return n;
  },
  booleen(v) {
    if (typeof v !== 'boolean') throw erreur('INVALIDE');
    return v;
  },
  parmi(v, liste) {
    if (!liste.includes(v)) throw erreur('INVALIDE');
    return v;
  },
  identifiant(v, prefixe) {
    if (typeof v !== 'string' || !v.startsWith(prefixe) || v.length !== prefixe.length + 12) {
      throw erreur('INVALIDE');
    }
    return v;
  },
  jeton(v) {
    if (typeof v !== 'string' || !/^[0-9a-f]{64}$/.test(v)) throw erreur('INVALIDE');
    return v;
  },
  liste(v, min, max) {
    if (!Array.isArray(v) || v.length < min || (max !== undefined && v.length > max)) {
      throw erreur('INVALIDE');
    }
    return v;
  },
  email(v) {
    if (typeof v !== 'string') throw erreur('INVALIDE');
    const t = v.trim().toLowerCase();
    if (t.length > CONFIG.LONGUEUR.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      throw erreur('INVALIDE');
    }
    return t;
  }
});
