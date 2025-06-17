import { users, phoneNumbers, type User, type InsertUser, type PhoneNumber, type InsertPhoneNumber } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Phone number management
  getPhoneNumbers(): Promise<PhoneNumber[]>;
  getPhoneNumber(id: number): Promise<PhoneNumber | undefined>;
  createPhoneNumber(phoneNumber: InsertPhoneNumber): Promise<PhoneNumber>;
  updatePhoneNumber(id: number, phoneNumber: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined>;
  deletePhoneNumber(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private phoneNumbers: Map<number, PhoneNumber>;
  currentId: number;
  currentPhoneId: number;

  constructor() {
    this.users = new Map();
    this.phoneNumbers = new Map();
    this.currentId = 1;
    this.currentPhoneId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Phone number management
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    return Array.from(this.phoneNumbers.values());
  }

  async getPhoneNumber(id: number): Promise<PhoneNumber | undefined> {
    return this.phoneNumbers.get(id);
  }

  async createPhoneNumber(insertPhoneNumber: InsertPhoneNumber): Promise<PhoneNumber> {
    const id = this.currentPhoneId++;
    const phoneNumber: PhoneNumber = { 
      ...insertPhoneNumber,
      functie: insertPhoneNumber.functie || null,
      diensten: insertPhoneNumber.diensten || null,
      opmerkingen: insertPhoneNumber.opmerkingen || null,
      id,
      aangemaaktOp: new Date()
    };
    this.phoneNumbers.set(id, phoneNumber);
    return phoneNumber;
  }

  async updatePhoneNumber(id: number, updateData: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined> {
    const existing = this.phoneNumbers.get(id);
    if (!existing) return undefined;
    
    const updated: PhoneNumber = { ...existing, ...updateData };
    this.phoneNumbers.set(id, updated);
    return updated;
  }

  async deletePhoneNumber(id: number): Promise<boolean> {
    return this.phoneNumbers.delete(id);
  }
}

export const storage = new MemStorage();
