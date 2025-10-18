import { User, Attempt, ProblemList } from '../types/user';

export const mockUser: User = {
  id: 'user_001',
  email: 'james@improview.dev',
  name: 'James',
  created_at: '2024-10-01T10:00:00Z',
};

export const mockAttempts: Attempt[] = [
  {
    id: 'att_001',
    user_id: 'user_001',
    problem_id: 'prob_001',
    problem_title: 'Shortest Path in Binary Matrix',
    category: 'bfs-dfs',
    difficulty: 'medium',
    started_at: '2024-10-14T14:30:00Z',
    ended_at: '2024-10-14T14:52:00Z',
    duration_ms: 1320000,
    passed: true,
    pass_count: 8,
    fail_count: 0,
    hint_used: false,
    code: `function shortestPathBinaryMatrix(grid) {
  const n = grid.length;
  if (grid[0][0] === 1 || grid[n-1][n-1] === 1) return -1;
  
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const queue = [[0, 0, 1]];
  grid[0][0] = 1;
  
  while (queue.length > 0) {
    const [row, col, dist] = queue.shift();
    if (row === n-1 && col === n-1) return dist;
    
    for (const [dr, dc] of dirs) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < n && newCol >= 0 && newCol < n && grid[newRow][newCol] === 0) {
        queue.push([newRow, newCol, dist + 1]);
        grid[newRow][newCol] = 1;
      }
    }
  }
  return -1;
}`,
  },
  {
    id: 'att_002',
    user_id: 'user_001',
    problem_id: 'prob_002',
    problem_title: 'Two Sum',
    category: 'arrays',
    difficulty: 'easy',
    started_at: '2024-10-13T16:15:00Z',
    ended_at: '2024-10-13T16:24:00Z',
    duration_ms: 540000,
    passed: true,
    pass_count: 4,
    fail_count: 0,
    hint_used: true,
    code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
  },
  {
    id: 'att_003',
    user_id: 'user_001',
    problem_id: 'prob_003',
    problem_title: 'Valid Parentheses',
    category: 'strings',
    difficulty: 'easy',
    started_at: '2024-10-12T11:00:00Z',
    ended_at: '2024-10-12T11:18:00Z',
    duration_ms: 1080000,
    passed: false,
    pass_count: 3,
    fail_count: 2,
    hint_used: true,
    code: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  
  for (const char of s) {
    if (!map[char]) {
      stack.push(char);
    } else if (stack.pop() !== map[char]) {
      return false;
    }
  }
  return stack.length === 0;
}`,
  },
  {
    id: 'att_004',
    user_id: 'user_001',
    problem_id: 'prob_004',
    problem_title: 'Merge K Sorted Lists',
    category: 'heaps',
    difficulty: 'hard',
    started_at: '2024-10-11T09:30:00Z',
    ended_at: '2024-10-11T10:45:00Z',
    duration_ms: 4500000,
    passed: true,
    pass_count: 6,
    fail_count: 0,
    hint_used: true,
    code: `function mergeKLists(lists) {
  // Implementation
}`,
  },
];

export const mockLists: ProblemList[] = [
  {
    id: 'list_001',
    name: 'Interview Prep - Week 1',
    description: 'Essential array and string problems for FAANG interviews',
    user_id: 'user_001',
    created_at: '2024-10-01T10:00:00Z',
    problem_ids: ['prob_002', 'prob_003'],
    problem_count: 2,
  },
  {
    id: 'list_002',
    name: 'Graph Algorithms',
    description: 'BFS, DFS, and shortest path problems',
    user_id: 'user_001',
    created_at: '2024-10-05T14:30:00Z',
    problem_ids: ['prob_001'],
    problem_count: 1,
  },
  {
    id: 'list_003',
    name: 'Hard Problems Collection',
    description: 'Challenging problems to master',
    user_id: 'user_001',
    created_at: '2024-10-08T16:20:00Z',
    problem_ids: ['prob_004'],
    problem_count: 1,
  },
];
