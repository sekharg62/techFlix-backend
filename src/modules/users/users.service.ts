export const getUsers = async () => {
  // Logic to fetch users, e.g., from DB
  return [{ id: 1, name: 'John Doe', email: 'john@example.com' }];
};

export const getUserById = async (id: number) => {
  return { id, name: 'John Doe', email: 'john@example.com' };
};

export const createUser = async (data: any) => {
  return { id: Math.floor(Math.random() * 1000), ...data };
};
