export class UserService {
  private users: User[] = [];

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async createUser(name: string, email: string): Promise<User> {
    const user: User = {
      id: Date.now(),
      name,
      email,
      createdAt: new Date()
    };
    this.users.push(user);
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }
}

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}
