http://localhost:5173/api/generate POST

{"category":"bfs","difficulty":"medium","provider":"openai"}

{"problem_id":"a13afa8ad23a51b71d370dfa129a958b","pack":{"problem":{"title":"Shortest Path in Binary Matrix","statement":"Given an n x n binary matrix grid, return the length of the shortest clear path in the matrix. If there is no clear path, return -1.\n\nA clear path in a binary matrix is a path from the top-left cell (0, 0) to the bottom-right cell (n - 1, n - 1) such that:\n\n- All the visited cells of the path are 0.\n- All the adjacent cells of the path are 8-directionally connected (i.e., they are different and they share an edge or a corner).\n\nThe length of a clear path is the number of visited cells of this path.","constraints":["1 \u003c= grid.length == grid[0].length \u003c= 100","grid[i][j] is 0 or 1"],"examples":[{"input":[[[0,1,1,0],[0,0,1,1],[1,0,0,1],[1,1,0,0]]],"output":4,"explanation":"Shortest path is 4 steps: (0,0) -\u003e (1,1) -\u003e (2,2) -\u003e (3,3)"},{"input":[[[1,0,0],[1,1,0],[1,1,0]]],"output":-1,"explanation":"No path exists because start or end is blocked."}],"edge_cases":["Grid size is 1x1 and the cell is 0 (start equals end).","Grid size is 1x1 and the cell is 1 (blocked start).","No possible path due to blocked cells around start or end."]},"api":{"function_name":"shortestPathBinaryMatrix","signature":"function shortestPathBinaryMatrix(grid: number[][]): number","params":[{"name":"grid","type":"number[][]","desc":"A 2D binary matrix representing the grid, where 0 is an open cell and 1 is a blocked cell."}],"returns":{"type":"number","desc":"The length of the shortest clear path from top-left to bottom-right, or -1 if no such path exists."}},"time_estimate_minutes":30,"hint":"Use BFS starting from the top-left cell, exploring all 8 directions, and track the shortest path length.","solutions":[{"approach":"Use BFS starting from the top-left cell. At each step, explore all 8 possible directions (horizontal, vertical, diagonal). Keep track of visited cells to avoid revisiting. Return the path length when reaching the bottom-right cell.","complexity":{"time":"O(n^2)","space":"O(n^2)"},"code":"function shortestPathBinaryMatrix(grid) {\n  const n = grid.length;\n  if (grid[0][0] !== 0 || grid[n - 1][n - 1] !== 0) return -1;\n  if (n === 1) return 1;\n\n  const directions = [\n    [1, 0], [-1, 0], [0, 1], [0, -1],\n    [1, 1], [1, -1], [-1, 1], [-1, -1]\n  ];\n\n  const queue = [[0, 0, 1]]; // row, col, distance\n  const visited = Array.from({ length: n }, () =\u003e Array(n).fill(false));\n  visited[0][0] = true;\n\n  while (queue.length) {\n    const [r, c, dist] = queue.shift();\n    for (const [dr, dc] of directions) {\n      const nr = r + dr, nc = c + dc;\n      if (nr \u003e= 0 \u0026\u0026 nr \u003c n \u0026\u0026 nc \u003e= 0 \u0026\u0026 nc \u003c n \u0026\u0026 !visited[nr][nc] \u0026\u0026 grid[nr][nc] === 0) {\n        if (nr === n - 1 \u0026\u0026 nc === n - 1) return dist + 1;\n        visited[nr][nc] = true;\n        queue.push([nr, nc, dist + 1]);\n      }\n    }\n  }\n\n  return -1;\n}"}],"tests":{"public":[{"input":[[[0,1,1,0],[0,0,1,1],[1,0,0,1],[1,1,0,0]]],"output":4,"explanation":"Simple 4x4 grid with a clear path."},{"input":[[[1,0,0],[1,1,0],[1,1,0]]],"output":-1,"explanation":"Start cell is blocked, no path."}],"hidden":[{"input":[[[1,0,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]]],"output":-1,"explanation":"Large grid with no path due to blocked cells around start."},{"input":[[[0]]],"output":1,"explanation":"Grid of size 1 with open cell."}]}}}

{"category":"bfs","difficulty":"easy","provider":"openai","mode":"llm"}

{
    "problem_id": "d844a944eedbd414dd2adc95a0485735",
    "pack": {
        "problem": {
            "title": "Minimum Depth of Binary Tree",
            "statement": "Given a binary tree, find its minimum depth.\n\nThe minimum depth is the number of nodes along the shortest path from the root node down to the nearest leaf node.\n\nA leaf is a node with no children.\n\nYou are given the root of the binary tree. Return its minimum depth.",
            "constraints": [
                "The number of nodes in the tree is in the range [0, 10^4].",
                "-1000 \u003c= Node.val \u003c= 1000"
            ],
            "examples": [
                {
                    "input": [
                        {
                            "left": {
                                "left": null,
                                "right": null,
                                "val": 9
                            },
                            "right": {
                                "left": {
                                    "left": null,
                                    "right": null,
                                    "val": 15
                                },
                                "right": {
                                    "left": null,
                                    "right": null,
                                    "val": 7
                                },
                                "val": 20
                            },
                            "val": 3
                        }
                    ],
                    "output": 2,
                    "explanation": "The minimum depth is 2 (root -\u003e left child)."
                }
            ],
            "edge_cases": [
                "Empty tree (root is null).",
                "Tree with only one node.",
                "Tree where the minimum depth is on the left subtree.",
                "Tree where the minimum depth is on the right subtree."
            ]
        },
        "api": {
            "function_name": "minDepth",
            "signature": "function minDepth(root: TreeNode | null): number",
            "params": [
                {
                    "name": "root",
                    "type": "TreeNode | null",
                    "desc": "The root node of the binary tree"
                }
            ],
            "returns": {
                "type": "number",
                "desc": "The minimum depth of the binary tree"
            }
        },
        "time_estimate_minutes": 30,
        "hint": "Use BFS to traverse the tree level by level and return the depth when you find the first leaf node.",
        "solutions": [
            {
                "approach": "Breadth-First Search (BFS) to find the minimum depth by traversing level by level.",
                "complexity": {
                    "time": "O(n)",
                    "space": "O(n)"
                },
                "code": "function minDepth(root) {\n  if (!root) return 0;\n  const queue = [{ node: root, depth: 1 }];\n  while (queue.length \u003e 0) {\n    const { node, depth } = queue.shift();\n    if (!node.left \u0026\u0026 !node.right) return depth;\n    if (node.left) queue.push({ node: node.left, depth: depth + 1 });\n    if (node.right) queue.push({ node: node.right, depth: depth + 1 });\n  }\n  return 0;\n}"
            }
        ],
        "tests": {
            "public": [
                {
                    "input": [
                        {
                            "left": {
                                "left": null,
                                "right": null,
                                "val": 9
                            },
                            "right": {
                                "left": {
                                    "left": null,
                                    "right": null,
                                    "val": 15
                                },
                                "right": {
                                    "left": null,
                                    "right": null,
                                    "val": 7
                                },
                                "val": 20
                            },
                            "val": 3
                        }
                    ],
                    "output": 2,
                    "explanation": "Minimum depth is 2 (root -\u003e left child)."
                }
            ],
            "hidden": [
                {
                    "input": [
                        null
                    ],
                    "output": 0,
                    "explanation": "Empty tree should return 0."
                },
                {
                    "input": [
                        {
                            "left": null,
                            "right": null,
                            "val": 1
                        }
                    ],
                    "output": 1,
                    "explanation": "Single node tree should return 1."
                }
            ]
        }
    }
}
