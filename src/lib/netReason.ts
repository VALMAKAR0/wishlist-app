/** Übersetzt die rohe Fehlermeldung des Netzes in einen verständlichen Grund (deutsch, wird mit t() angezeigt). */
export function netReason(raw: string): string {
  if (/resolve host|UnknownHost|no address|ENOTFOUND/i.test(raw)) return 'DNS: Adresse nicht auflösbar (Privates DNS, VPN, Werbeblocker oder Hotspot prüfen)'
  if (/timeout|timed out/i.test(raw)) return 'Zeitüberschreitung, die Seite antwortet nicht'
  if (/ssl|certificate|handshake|trust/i.test(raw)) return 'Sichere Verbindung (SSL) fehlgeschlagen'
  if (/refused|unreachable|failed to connect|network is/i.test(raw)) return 'Verbindung abgelehnt oder Netz nicht erreichbar'
  return ''
}
