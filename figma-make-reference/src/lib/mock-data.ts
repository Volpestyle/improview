import { ProblemPack, Category, Difficulty } from '../types/problem';

export function generateMockProblem(category: Category, difficulty: Difficulty): ProblemPack {
  const problems: Record<string, ProblemPack> = {
    'bfs-medium': {
      id: 'prob_001',
      problem: {
        title: 'Shortest Path in Binary Matrix',
        statement: `Given an **n x n** binary matrix \`grid\`, return the length of the shortest clear path in the matrix. If there is no clear path, return \`-1\`.

A **clear path** in a binary matrix is a path from the **top-left** cell (0, 0) to the **bottom-right** cell (n-1, n-1) such that:
- All the visited cells of the path are \`0\`.
- All the adjacent cells of the path are **8-directionally** connected (i.e., they are different and they share an edge or a corner).

The **length of a clear path** is the number of visited cells of this path.`,
        constraints: [
          'n == grid.length',
          'n == grid[i].length',
          '1 <= n <= 100',
          'grid[i][j] is 0 or 1'
        ],
        examples: [
          {
            input: [[[0, 1], [1, 0]]],
            output: 2,
            explanation: 'The path is (0,0) -> (1,1)'
          },
          {
            input: [[[0, 0, 0], [1, 1, 0], [1, 1, 0]]],
            output: 4,
            explanation: 'The path is (0,0) -> (0,1) -> (0,2) -> (1,2) -> (2,2)'
          }
        ],
        edge_cases: ['Grid with no path', 'Single cell grid', 'All zeros', 'Start or end blocked']
      },
      api: {
        function_name: 'shortestPathBinaryMatrix',
        signature: 'function shortestPathBinaryMatrix(grid: number[][]): number',
        params: [
          { name: 'grid', type: 'number[][]', desc: 'An n x n binary matrix' }
        ],
        returns: { type: 'number', desc: 'Length of shortest clear path, or -1 if none exists' }
      },
      time_estimate_minutes: 25,
      hint: 'Use BFS starting from (0,0). Track visited cells and explore all 8 directions. The first time you reach (n-1, n-1), you have the shortest path.',
      solutions: [
        {
          approach: 'BFS with Queue',
          complexity: { time: 'O(n²)', space: 'O(n²)' },
          code: `function shortestPathBinaryMatrix(grid) {
  const n = grid.length;
  if (grid[0][0] === 1 || grid[n-1][n-1] === 1) return -1;
  
  const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const queue = [[0, 0, 1]]; // [row, col, distance]
  grid[0][0] = 1; // mark visited
  
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
}`
        }
      ],
      tests: {
        public: [
          { input: [[[0, 1], [1, 0]]], output: 2 },
          { input: [[[0, 0, 0], [1, 1, 0], [1, 1, 0]]], output: 4 }
        ],
        hidden: [
          { input: [[[1, 0], [0, 0]]], output: -1 },
          { input: [[[0]]], output: 1 }
        ]
      }
    },
    'arrays-easy': {
      id: 'prob_002',
      problem: {
        title: 'Two Sum',
        statement: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
        constraints: [
          '2 <= nums.length <= 10⁴',
          '-10⁹ <= nums[i] <= 10⁹',
          '-10⁹ <= target <= 10⁹',
          'Only one valid answer exists'
        ],
        examples: [
          {
            input: [[2, 7, 11, 15], 9],
            output: [0, 1],
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1]'
          }
        ],
        edge_cases: ['Negative numbers', 'Zero in array', 'Large numbers']
      },
      api: {
        function_name: 'twoSum',
        signature: 'function twoSum(nums: number[], target: number): number[]',
        params: [
          { name: 'nums', type: 'number[]', desc: 'Array of integers' },
          { name: 'target', type: 'number', desc: 'Target sum' }
        ],
        returns: { type: 'number[]', desc: 'Indices of the two numbers' }
      },
      time_estimate_minutes: 15,
      hint: 'Use a hash map to store each number and its index as you iterate. For each number, check if target - number exists in the map.',
      solutions: [
        {
          approach: 'Hash Map',
          complexity: { time: 'O(n)', space: 'O(n)' },
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
}`
        }
      ],
      tests: {
        public: [
          { input: [[2, 7, 11, 15], 9], output: [0, 1] },
          { input: [[3, 2, 4], 6], output: [1, 2] }
        ],
        hidden: [
          { input: [[3, 3], 6], output: [0, 1] },
          { input: [[-1, -2, -3, -4, -5], -8], output: [2, 4] }
        ]
      }
    }
  };

  // Return appropriate problem or fallback
  const key = `${category}-${difficulty}`;
  return problems[key] || problems['arrays-easy'];
}
