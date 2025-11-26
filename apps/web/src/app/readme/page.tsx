export default function ReadmePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px' }}>
      <h1>MeldkamerSpel Web API</h1>
      
      <p>Dit is de web API voor MeldkamerSpel - een politie dispatch simulatie spel.</p>
      
      <h2>Geen UI door ontwerp</h2>
      <p>Deze applicatie bevat <strong>geen gebruikersinterface</strong> door ontwerp. Het is een pure API server die:</p>
      <ul>
        <li>REST endpoints biedt voor incidenten, eenheden en dispatch operaties</li>
        <li>Supabase gebruikt als backend platform</li>
        <li>TypeScript gebruikt voor type safety</li>
        <li>Zod gebruikt voor request validatie</li>
      </ul>
      
      <h2>API Endpoints</h2>
      <ul>
        <li><code>GET /api/health</code> - Health check</li>
        <li><code>GET /api/version</code> - Versie informatie</li>
        <li><code>GET /api/incidents</code> - Lijst van incidenten (stub)</li>
        <li><code>POST /api/incidents</code> - Maak nieuw incident (stub)</li>
        <li><code>GET /api/units</code> - Lijst van eenheden (stub)</li>
        <li><code>POST /api/units</code> - Maak nieuwe eenheid (stub)</li>
        <li><code>POST /api/dispatch</code> - Dispatch eenheden naar incident (stub)</li>
      </ul>
      
      <h2>Ontwikkeling</h2>
      <pre style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
{`# Start development server
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint`}
      </pre>
      
      <h2>Toekomstige uitbreidingen</h2>
      <ul>
        <li>Database schema implementatie</li>
        <li>Authenticatie en autorisatie</li>
        <li>Real-time updates via Supabase Realtime</li>
        <li>Externe routing service integratie (OSRM/Valhalla)</li>
        <li>UI applicatie (separate frontend)</li>
      </ul>
    </div>
  );
}
