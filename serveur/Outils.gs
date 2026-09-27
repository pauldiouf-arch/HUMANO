class ErreurHumano extends Error {
  constructor(code) {
    super(MESSAGES_ERREUR[code] || MESSAGES_ERREUR.INTERNE);
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
  return new ErreurHumano(code);
}

function maintenantIso() {
  return new Date().toISOString();
}

function octetsVersHex(octets) {
  let hex = '';
  for (let i = 0; i < octets.length; i++) {
    const b = octets[i] < 0 ? octets[i] + 256 : octets[i];
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

function sha256Hex(texte) {
  const octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(texte), Utilities.Charset.UTF_8);
  return octetsVersHex(octets);
}

function jetonAleatoire() {
  const u1 = Utilities.getUuid().replace(/-/g, '');
  const u2 = Utilities.getUuid().replace(/-/g, '');
  return (u1 + u2).toLowerCase();
}

function genererId(prefixe) {
  const u = Utilities.getUuid().replace(/-/g, '').slice(0, 12).toLowerCase();
  return prefixe + u;
}

function egaliteConstante(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  let diff = sa.length ^ sb.length;
  const len = Math.max(sa.length, sb.length);
  for (let i = 0; i < len; i++) {
    const ca = i < sa.length ? sa.charCodeAt(i) : 0;
    const cb = i < sb.length ? sb.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

const Valider = Object.freeze({
  objet(v) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw erreur('INVALIDE');
    return v;
  },
  texte(v, a, b, c) {
    if (typeof v !== 'string') throw erreur('INVALIDE');
    const t = v.trim();
    let min;
    let max;
    if (typeof a === 'string') {
      min = b;
      max = c;
    } else {
      min = a;
      max = b;
    }
    const inf = min !== undefined ? min : 0;
    const sup = max !== undefined ? max : Infinity;
    if (t.length < inf || t.length > sup) throw erreur('INVALIDE');
    return t;
  },
  entier(v, a, b, c) {
    if (typeof v !== 'number' || !Number.isInteger(v)) throw erreur('INVALIDE');
    let min;
    let max;
    if (typeof a === 'string') {
      min = b;
      max = c;
    } else {
      min = a;
      max = b;
    }
    if (min !== undefined && v < min) throw erreur('INVALIDE');
    if (max !== undefined && v > max) throw erreur('INVALIDE');
    return v;
  },
  booleen(v) {
    if (typeof v !== 'boolean') throw erreur('INVALIDE');
    return v;
  },
  parmi(v, a, b) {
    const liste = Array.isArray(a) ? a : (Array.isArray(b) ? b : null);
    if (!liste || !liste.includes(v)) throw erreur('INVALIDE');
    return v;
  },
  identifiant(v, second) {
    if (typeof v !== 'string') throw erreur('INVALIDE');
    if (second === 'p_' || second === 'c_' || second === 's_') {
      const regex = new RegExp('^' + second + '[0-9a-f]{12}$');
      if (!regex.test(v)) throw erreur('INVALIDE');
      return v;
    }
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(v)) throw erreur('INVALIDE');
    return v;
  },
  jeton(v) {
    if (typeof v !== 'string' || !/^[0-9a-f]{64}$/.test(v)) throw erreur('INVALIDE');
    return v;
  },
  liste(v, a, b, c) {
    if (!Array.isArray(v)) throw erreur('INVALIDE');
    let min;
    let max;
    if (typeof a === 'string') {
      min = b;
      max = c;
    } else {
      min = a;
      max = b;
    }
    const inf = min !== undefined ? min : 0;
    const sup = max !== undefined ? max : Infinity;
    if (v.length < inf || v.length > sup) throw erreur('INVALIDE');
    return v;
  },
  email(v) {
    if (typeof v !== 'string') throw erreur('INVALIDE');
    const t = v.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(t) || t.length > 120) throw erreur('INVALIDE');
    return t;
  }
});

function masquerEmail(email) {
  const s = String(email || '').trim();
  const parties = s.split('@');
  if (parties.length !== 2) return '***';
  const local = parties[0];
  const dom = parties[1];
  const masq = local.length <= 1 ? '*' : local[0] + '***';
  return masq + '@' + dom;
}
