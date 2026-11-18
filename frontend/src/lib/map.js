import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Marqueur SVG coloré (évite la dépendance aux images par défaut de Leaflet). */
export function markerIcon(color = '#1d4ed8', label = '') {
  const text = label !== '' ? `<text x="14" y="17" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Inter, sans-serif">${label}</text>` : '<circle cx="14" cy="13" r="4.5" fill="#fff"/>';
  return L.divIcon({
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 37],
    popupAnchor: [0, -32],
    html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14 37C14 37 26 22.5 26 13A12 12 0 0 0 2 13C2 22.5 14 37 14 37Z" fill="${color}" stroke="#fff" stroke-width="2"/>
      ${text}
    </svg>`,
  });
}
