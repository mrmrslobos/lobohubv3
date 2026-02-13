
export enum UserRole {
  ADMIN = 'ADMIN',
  PARENT = 'PARENT',
  CHILD = 'CHILD'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  assignedTo: string[];
  category: 'Family' | 'Work' | 'School' | 'Other';
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  assignedTo: string;
  completed: boolean;
  createdBy: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  purchased: boolean;
  requestedBy: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  userId: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  events: CalendarEvent[];
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  transactions: Transaction[];
}
