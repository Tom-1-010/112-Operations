import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix voor Leaflet iconen
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface KiesLocatieModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number | null;
  initialLng?: number | null;
}

/**
 * Component die klik events op de kaart afhandelt
 */
function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onSelect(lat, lng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

/**
 * Modal voor het kiezen van een locatie op de kaart
 */
export default function KiesLocatieModal({
  isOpen,
  onClose,
  onSelect,
  initialLat,
  initialLng,
}: KiesLocatieModalProps) {
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat ?? null);
  const [selectedLng, setSelectedLng] = useState<number | null>(initialLng ?? null);

  useEffect(() => {
    setSelectedLat(initialLat ?? null);
    setSelectedLng(initialLng ?? null);
  }, [initialLat, initialLng]);

  if (!isOpen) return null;

  const center: [number, number] = 
    selectedLat && selectedLng 
      ? [selectedLat, selectedLng]
      : [52.1, 5.3]; // Centrum van Nederland

  const handleSelect = (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
  };

  const handleConfirm = () => {
    if (selectedLat !== null && selectedLng !== null) {
      onSelect(selectedLat, selectedLng);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={handleCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          width: '90%',
          maxWidth: '800px',
          height: '80%',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '4px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            Kies locatie op kaart
          </h3>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Kaart */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={center}
            zoom={selectedLat && selectedLng ? 15 : 8}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onSelect={handleSelect} />
            {selectedLat && selectedLng && (
              <Marker position={[selectedLat, selectedLng]} />
            )}
          </MapContainer>
        </div>

        {/* Footer met coördinaten en knoppen */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
          }}
        >
          <div style={{ fontSize: '14px', color: '#666' }}>
            {selectedLat !== null && selectedLng !== null ? (
              <>
                <strong>Lat:</strong> {selectedLat.toFixed(6)}, <strong>Lng:</strong> {selectedLng.toFixed(6)}
              </>
            ) : (
              'Klik op de kaart om een locatie te selecteren'
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '6px 16px',
                border: '1px solid #ccc',
                backgroundColor: 'white',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              Annuleren
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedLat === null || selectedLng === null}
              style={{
                padding: '6px 16px',
                border: '1px solid #0066cc',
                backgroundColor: selectedLat !== null && selectedLng !== null ? '#0066cc' : '#ccc',
                color: 'white',
                cursor: selectedLat !== null && selectedLng !== null ? 'pointer' : 'not-allowed',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              Bevestigen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

