import { solveRecipe, type SolveOptions } from '@/lib/paint/solveRecipe'
import { getSolverWorker, resetSolverWorker, withTimeout, WorkerTimeoutError } from '@/lib/workers'

export async function solvePaint(hex: string, options?: SolveOptions) {
  try {
    return await withTimeout(getSolverWorker().solveRecipe(hex, options), 5000, 'Solver worker')
  } catch (error) {
    if (error instanceof WorkerTimeoutError) resetSolverWorker()
    return solveRecipe(hex, options)
  }
}
