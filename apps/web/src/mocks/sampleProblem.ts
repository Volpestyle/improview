import { ProblemPack } from '../api/types';

export const sampleProblemPack: ProblemPack = {
  problem: {
    title: 'Daily Temperature Spread',
    statement:
      'Given an array of integers representing the daily temperatures, return an array where each element is the number of days you have to wait until a warmer temperature. If there is no future day for which this is possible, put `0`.',
    constraints: ['1 ≤ temperatures.length ≤ 10^5', '-100 ≤ temperatures[i] ≤ 100', 'Answer fits within a 32-bit integer'],
    examples: [
      {
        input: [[73, 74, 75, 71, 69, 72, 76, 73]],
        output: [1, 1, 4, 2, 1, 1, 0, 0],
        explanation:
          'For day 0 (73), the next warmer day is day 1 (74). For day 2 (75), you must wait 4 days until day 6 (76).',
      },
      {
        input: [[30, 40, 50, 60]],
        output: [1, 1, 1, 0],
      },
    ],
    edge_cases: ['Single element array should return [0]', 'Non-increasing sequence returns all zeros'],
  },
  api: {
    function_name: 'dailyTemperatureSpread',
    signature: 'export function dailyTemperatureSpread(temperatures: number[]): number[]',
    params: [
      {
        name: 'temperatures',
        type: 'number[]',
        desc: 'List of recorded temperatures',
      },
    ],
    returns: {
      type: 'number[]',
      desc: 'Number of days until a warmer temperature for each day',
    },
  },
  time_estimate_minutes: 25,
  hint: 'Use a monotonic decreasing stack to track candidate indices.',
  solutions: [
    {
      approach: 'Monotonic stack',
      complexity: {
        time: 'O(n)',
        space: 'O(n)',
      },
      code: `export function dailyTemperatureSpread(temperatures: number[]): number[] {
  const result = new Array(temperatures.length).fill(0);
  const stack: number[] = [];

  for (let i = 0; i < temperatures.length; i += 1) {
    while (stack.length && temperatures[i] > temperatures[stack[stack.length - 1]]) {
      const idx = stack.pop()!;
      result[idx] = i - idx;
    }
    stack.push(i);
  }

  return result;
}`,
    },
  ],
  tests: {
    public: [
      {
        input: [[73, 74, 75, 71, 69, 72, 76, 73]],
        output: [1, 1, 4, 2, 1, 1, 0, 0],
      },
      {
        input: [[30, 40, 50, 60]],
        output: [1, 1, 1, 0],
      },
    ],
    hidden: [
      {
        input: [[90, 80, 70]],
        output: [0, 0, 0],
      },
    ],
  },
};
