import React, { useEffect, useState } from 'react';
import { routingService, UnitMovement } from '../services/routingService';

interface UnitMovementProps {
  unitId: string;
  startPosition: [number, number];
  endPosition: [number, number];
  onMovementUpdate?: (movement: UnitMovement) => void;
  onArrival?: (unitId: string) => void;
  className?: string;
}

export function UnitMovementComponent({ 
  unitId, 
  startPosition, 
  endPosition, 
  onMovementUpdate,
  onArrival,
  className = ''
}: UnitMovementProps) {
  const [movement, setMovement] = useState<UnitMovement | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const startMovement = async () => {
      try {
        setIsMoving(true);
        
        const movementResult = await routingService.startUnitMovement(
          unitId,
          startPosition,
          endPosition,
          (updatedMovement) => {
            setMovement(updatedMovement);
            onMovementUpdate?.(updatedMovement);
          }
        );

        // Movement completed
        setMovement(movementResult);
        onArrival?.(unitId);
        setIsMoving(false);
        
      } catch (error) {
        console.error('Unit movement failed:', error);
        setIsMoving(false);
      }
    };

    startMovement();

    // Cleanup on unmount
    return () => {
      routingService.stopMovement(unitId);
    };
  }, [unitId, startPosition, endPosition, onMovementUpdate, onArrival]);

  if (!movement) {
    return (
      <div className={`unit-movement ${className}`}>
        <div className="movement-status planning">
          <span className="unit-id">{unitId}</span>
          <span className="status">Planning route...</span>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return '#f59e0b'; // amber
      case 'moving': return '#3b82f6'; // blue
      case 'arrived': return '#10b981'; // green
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return 'Planning route...';
      case 'moving': return 'En route';
      case 'arrived': return 'Arrived';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const estimatedArrival = movement.estimatedArrival ? formatTime(movement.estimatedArrival) : 'Calculating...';

  return (
    <div className={`unit-movement ${className}`}>
      <div className="movement-header">
        <span className="unit-id">{unitId}</span>
        <span 
          className="status" 
          style={{ color: getStatusColor(movement.status) }}
        >
          {getStatusText(movement.status)}
        </span>
      </div>
      
      {movement.status === 'moving' && (
        <div className="movement-details">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${movement.progress * 100}%` }}
            />
          </div>
          
          <div className="movement-info">
            <div className="progress-text">
              {Math.round(movement.progress * 100)}% complete
            </div>
            <div className="eta">
              ETA: {estimatedArrival}
            </div>
          </div>
          
          <div className="coordinates">
            <div className="current-pos">
              Current: {movement.currentPosition[0].toFixed(6)}, {movement.currentPosition[1].toFixed(6)}
            </div>
            <div className="destination">
              Destination: {endPosition[0].toFixed(6)}, {endPosition[1].toFixed(6)}
            </div>
          </div>
        </div>
      )}
      
      {movement.status === 'arrived' && (
        <div className="arrival-notification">
          <span className="arrival-icon">✅</span>
          <span>Unit {unitId} has arrived at destination</span>
        </div>
      )}
      
      {movement.status === 'error' && (
        <div className="error-notification">
          <span className="error-icon">❌</span>
          <span>Movement failed for unit {unitId}</span>
        </div>
      )}
    </div>
  );
}

// CSS styles (add to your CSS file)
export const unitMovementStyles = `
.unit-movement {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.movement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.unit-id {
  font-weight: bold;
  font-size: 14px;
}

.status {
  font-size: 12px;
  font-weight: 500;
}

.movement-details {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #10b981);
  transition: width 0.3s ease;
}

.movement-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.progress-text {
  color: #6b7280;
}

.eta {
  color: #059669;
  font-weight: 500;
}

.coordinates {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.4;
}

.current-pos {
  margin-bottom: 2px;
}

.destination {
  font-weight: 500;
}

.arrival-notification {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #059669;
  font-weight: 500;
  font-size: 14px;
}

.error-notification {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #dc2626;
  font-weight: 500;
  font-size: 14px;
}

.arrival-icon, .error-icon {
  font-size: 16px;
}
`;


