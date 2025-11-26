import React from 'react';
import { useMap } from 'react-leaflet';
import { useRenderEenhedenOpKaart } from '../hooks/useRenderEenhedenOpKaart';
import { useAutoRijdenNaarMelding } from '../hooks/useAutoRijdenNaarMelding';

/**
 * Component die voertuigen rendert op een Leaflet kaart
 * 
 * Gebruik dit component binnen een MapContainer van react-leaflet:
 * 
 * ```tsx
 * <MapContainer center={[52.1, 5.3]} zoom={8}>
 *   <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
 *   <VoertuigenOpKaart enabled={true} autoRijden={true} />
 * </MapContainer>
 * ```
 */
interface VoertuigenOpKaartProps {
  enabled?: boolean;
  autoRijden?: boolean; // Automatisch voertuigen laten rijden naar meldingen
}

export default function VoertuigenOpKaart({ enabled = true, autoRijden = true }: VoertuigenOpKaartProps) {
  const map = useMap();
  useRenderEenhedenOpKaart(enabled);
  useAutoRijdenNaarMelding(map, enabled && autoRijden);
  return null; // Dit component rendert niets zelf, het gebruikt alleen de hooks
}

