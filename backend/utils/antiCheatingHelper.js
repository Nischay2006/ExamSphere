/**
 * Pure Anti-Cheating Algorithmic Utility
 * Calculates adjacent neighbor course collision matrix and computes
 * the Anti-Cheating Integrity Score (0% to 100%).
 * 
 * Mathematical Model:
 * For every seated student at (row, col) in a room:
 * Inspect orthogonal 4-neighbors (North, South, East, West).
 * If a neighbor is taking the exact same course, a collision is flagged.
 * Score = max(0, (1 - (collisions / total_comparisons)) * 100)
 */

function computeAntiCheatingScore(seats) {
  if (!seats || seats.length <= 1) return 100;

  // Group seats by room
  const roomGrids = {};
  for (const seat of seats) {
    if (!roomGrids[seat.room_id]) roomGrids[seat.room_id] = {};
    const key = `${seat.row_num}_${seat.col_num}`;
    roomGrids[seat.room_id][key] = seat;
  }

  let totalComparisons = 0;
  let collisions = 0;

  for (const roomId in roomGrids) {
    const grid = roomGrids[roomId];
    for (const key in grid) {
      const seat = grid[key];
      const r = Number(seat.row_num);
      const c = Number(seat.col_num);

      // Orthogonal 4-neighbors (Up, Down, Left, Right)
      const neighbors = [
        grid[`${r - 1}_${c}`],
        grid[`${r + 1}_${c}`],
        grid[`${r}_${c - 1}`],
        grid[`${r}_${c + 1}`]
      ];

      for (const neighbor of neighbors) {
        if (neighbor) {
          totalComparisons++;
          if (neighbor.course_code === seat.course_code) {
            collisions++;
          }
        }
      }
    }
  }

  if (totalComparisons === 0) return 100;
  return Math.max(0, Math.round((1 - collisions / totalComparisons) * 100));
}

module.exports = {
  computeAntiCheatingScore
};
