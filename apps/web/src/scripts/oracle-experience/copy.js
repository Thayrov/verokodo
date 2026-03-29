/**
 * Purpose: Centralize localized strings and locale detection for the oracle flow.
 * Interface: resolveLocaleCopy() -> { locale, copy } with all UI copy contracts.
 * Invariants: only `en` and `es` locales are exposed to callers.
 * Decisions: keep copy close to runtime code to avoid hydration-time i18n tooling overhead.
 */

const messages = {
  en: {
    title: 'Verokodo',
    usernameLabel: 'GitHub Username',
    startButton: 'Go',
    startButtonAria: 'Start reading',
    note: 'Use your GitHub username to get a glimpse of your dev future.',
    usernameHintIdle: 'Only public GitHub usernames are supported.',
    usernameHintValid: 'Looks good. Press Enter to start.',
    usernameHintInvalid: 'Use 1-39 letters, numbers, or hyphens. No spaces.',
    shortcutHintPrefix: 'Press ',
    shortcutHintSuffix: ' to focus',
    clearRecent: 'Clear recent',
    recentCleared: 'Recent usernames cleared.',
    loadingLabel: 'Reading in progress',
    loadingStatusA: 'Collecting profile signals...',
    loadingStatusB: 'Mapping coding patterns...',
    loadingStatusC: 'Writing final reading...',
    loadingMeta: (step, total, elapsedSeconds) => `Step ${step} of ${total} - ${elapsedSeconds.toFixed(1)}s`,
    cancelButton: 'Cancel',
    loadingCancelled: 'Reading canceled.',
    errorCopyButton: 'Copy Error',
    retryButton: 'Try Again',
    resultEyebrow: 'Reading complete',
    resultTitlePrefix: 'Reading for',
    fiveYearLabel: '5-year outlook',
    tenYearLabel: '10-year outlook',
    goBack: 'Go back',
    copyShareButton: 'Copy Share Line',
    copyLinkButton: 'Copy Result Link',
    shareButton: 'Share Reading',
    copied: 'Copied',
    resultMeta: (elapsedSeconds) => `Generated in ${elapsedSeconds.toFixed(1)}s from public profile signals.`,
    followers: 'Followers',
    publicRepos: 'Public repos',
    topLanguages: 'Top languages',
    recentRepos: 'Recent repos',
    unknown: 'Unknown',
    invalidUsername: 'Invalid GitHub username.',
    requestFailed: (status) => `Request failed (HTTP ${status}).`,
    clipboardFailed: 'Unable to access clipboard.',
    unexpectedClientError: 'Unexpected client error.',
    offlineHint: 'You are offline. Reconnect to start a reading.',
    shareTitle: 'Verokodo reading',
    shareUnavailable: 'Native sharing is not available in this browser.',
    announceLoading: 'Reading started.',
    announceResult: 'Reading ready.',
    announceError: 'Reading failed.',
    announceIdle: 'Ready for a new reading.'
  },
  es: {
    title: 'Verokodo',
    usernameLabel: 'Usuario de GitHub',
    startButton: 'Ir',
    startButtonAria: 'Iniciar lectura',
    note: 'Usa tu usuario de GitHub para ver un vistazo de tu futuro dev.',
    usernameHintIdle: 'Solo se admiten usuarios publicos de GitHub.',
    usernameHintValid: 'Todo listo. Presiona Enter para iniciar.',
    usernameHintInvalid: 'Usa 1-39 letras, numeros o guiones. Sin espacios.',
    shortcutHintPrefix: 'Presiona ',
    shortcutHintSuffix: ' para enfocar',
    clearRecent: 'Borrar recientes',
    recentCleared: 'Usuarios recientes eliminados.',
    loadingLabel: 'Lectura en progreso',
    loadingStatusA: 'Recolectando senales del perfil...',
    loadingStatusB: 'Mapeando patrones de codigo...',
    loadingStatusC: 'Escribiendo lectura final...',
    loadingMeta: (step, total, elapsedSeconds) => `Paso ${step} de ${total} - ${elapsedSeconds.toFixed(1)}s`,
    cancelButton: 'Cancelar',
    loadingCancelled: 'Lectura cancelada.',
    errorCopyButton: 'Copiar error',
    retryButton: 'Reintentar',
    resultEyebrow: 'Lectura lista',
    resultTitlePrefix: 'Lectura de',
    fiveYearLabel: 'Proyeccion a 5 anos',
    tenYearLabel: 'Proyeccion a 10 anos',
    goBack: 'Volver',
    copyShareButton: 'Copiar texto para compartir',
    copyLinkButton: 'Copiar link del resultado',
    shareButton: 'Compartir lectura',
    copied: 'Copiado',
    resultMeta: (elapsedSeconds) => `Generado en ${elapsedSeconds.toFixed(1)}s con senales publicas del perfil.`,
    followers: 'Seguidores',
    publicRepos: 'Repos publicos',
    topLanguages: 'Lenguajes principales',
    recentRepos: 'Repos recientes',
    unknown: 'Desconocido',
    invalidUsername: 'Usuario de GitHub invalido.',
    requestFailed: (status) => `El request fallo (HTTP ${status}).`,
    clipboardFailed: 'No se pudo copiar al portapapeles.',
    unexpectedClientError: 'Error inesperado en cliente.',
    offlineHint: 'No tienes conexion. Reconecta para iniciar una lectura.',
    shareTitle: 'Lectura de Verokodo',
    shareUnavailable: 'Compartir no esta disponible en este navegador.',
    announceLoading: 'La lectura inicio.',
    announceResult: 'La lectura esta lista.',
    announceError: 'La lectura fallo.',
    announceIdle: 'Listo para una nueva lectura.'
  }
}

function detectLocale() {
  const browserLocales = [
    ...(navigator.languages ?? []),
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().locale
  ].filter(Boolean)

  return browserLocales.some((locale) => locale.toLowerCase().startsWith('es')) ? 'es' : 'en'
}

export function resolveLocaleCopy() {
  const locale = detectLocale()
  return { locale, copy: messages[locale] }
}
