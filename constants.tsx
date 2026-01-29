
import { User, UserStatus, Message } from './types';

export const initialUsers: User[] = [
  { id: 'user-1', name: 'Elena Rossi', avatar: 'https://picsum.photos/seed/elena/100/100', status: UserStatus.ONLINE },
  { id: 'user-2', name: 'Marcus Thorne', avatar: 'https://picsum.photos/seed/marcus/100/100', status: UserStatus.AWAY },
  { id: 'user-3', name: 'Sarah Jenkins', avatar: 'https://picsum.photos/seed/sarah/100/100', status: UserStatus.BUSY },
  { id: 'user-4', name: 'David Chen', avatar: 'https://picsum.photos/seed/david/100/100', status: UserStatus.OFFLINE },
];

export const initialMessages: Message[] = [
  { id: 'm1', senderId: 'user-1', text: 'Hey there! How is the project going?', timestamp: Date.now() - 3600000, type: 'text', status: 'read' },
  { id: 'm2', senderId: 'user-0', text: 'Its moving along smoothly. Just finished the UI draft!', timestamp: Date.now() - 3500000, type: 'text', status: 'read' },
  { id: 'm3', senderId: 'user-1', text: 'Awesome! Can you share the latest task list?', timestamp: Date.now() - 3400000, type: 'text', status: 'read' },
];
