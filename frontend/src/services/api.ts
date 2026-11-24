
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001';

// The structure of a task returned by MySQL
export type Task = {
  id: number;
  title: string;
  is_completed: boolean | number;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  due_time: string | null;
  created_at: string;
};

// GET: Retrieve all tasks
export async function getTasks(): Promise<Task[]> {
  const response = await fetch(`${BASE_URL}/tasks`);

  if (!response.ok) {
    throw new Error('Could not retrieve tasks');
  }

  return response.json();
}

// POST: Add a new task
export async function createTask(
  title: string,
  priority: string,
  due_date: string | null = null,
  due_time: string | null = null
) {
  const response = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      priority: priority.toLowerCase(),
      due_date,
      due_time,
    }),
  });

  if (!response.ok) throw new Error('Could not create task');

  return response.json();
}

// PUT: Update a task
export async function updateTask(
  id: number,
  updates: Partial<Task>
) {
  const response = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error('Could not update task');
  }

  return response.json();
}

// DELETE: Remove a task
export async function deleteTask(id: number) {
  const response = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Could not delete task');
  }

  return response.json();
}
