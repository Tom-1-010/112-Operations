import { ChatItem, ChatRole, MC, MCInfo } from './types';

export const mockChatItems: ChatItem[] = [
  {
    id: '1',
    role: ChatRole.CALLER,
    text: 'Er wordt ingebroken',
    at: new Date().toISOString(),
  },
  {
    id: '2',
    role: ChatRole.DISPATCH,
    text: 'Wat is het adres?',
    at: new Date(Date.now() + 1000).toISOString(),
  },
  {
    id: '3',
    role: ChatRole.CALLER,
    text: 'Laan op Zuid 12 Rotterdam',
    at: new Date(Date.now() + 2000).toISOString(),
  },
  {
    id: '4',
    role: ChatRole.DISPATCH,
    text: 'Hoeveel inbrekers ziet u?',
    at: new Date(Date.now() + 3000).toISOString(),
  },
  {
    id: '5',
    role: ChatRole.SYSTEM,
    text: 'RT1101 gekoppeld',
    at: new Date(Date.now() + 4000).toISOString(),
  },
  {
    id: '6',
    role: ChatRole.CALLER,
    text: 'Ik zie 2 personen bij de achterdeur',
    at: new Date(Date.now() + 5000).toISOString(),
  },
  {
    id: '7',
    role: ChatRole.DISPATCH,
    text: 'Blijf op veilige afstand. Hulp is onderweg.',
    at: new Date(Date.now() + 6000).toISOString(),
  },
];

export const mcCatalog: MCInfo[] = [
  {
    code: MC.INBRAAK,
    label: 'Inbraak',
    description: 'Inbraak, diefstal, inbraakpoging',
    color: 'bg-red-500',
    shortcut: 'MC 1',
  },
  {
    code: MC.ACHTERVOLGING,
    label: 'Achtervolging',
    description: 'Achtervolging, vluchtende verdachte',
    color: 'bg-orange-500',
    shortcut: 'MC 2',
  },
  {
    code: MC.CONFLICT,
    label: 'Conflict',
    description: 'Ruzie, vechtpartij, overlast',
    color: 'bg-yellow-500',
    shortcut: 'MC 3',
  },
  {
    code: MC.DIEFSTAL,
    label: 'Diefstal',
    description: 'Diefstal, zakkenrollerij',
    color: 'bg-purple-500',
  },
  {
    code: MC.VERKEER,
    label: 'Verkeer',
    description: 'Verkeersongeval, verkeersoverlast',
    color: 'bg-blue-500',
  },
  {
    code: MC.BRAND,
    label: 'Brand',
    description: 'Brand, rookmelding, gaslek',
    color: 'bg-red-600',
  },
  {
    code: MC.MEDISCH,
    label: 'Medisch',
    description: 'Medische hulp, ongeval',
    color: 'bg-green-500',
  },
  {
    code: MC.OVERLAST,
    label: 'Overlast',
    description: 'Geluidsoverlast, overlast',
    color: 'bg-gray-500',
  },
];

export const defaultLocation = {
  lat: 51.9244,
  lng: 4.4777,
}; // Rotterdam coordinates

