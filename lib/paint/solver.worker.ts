import { solveRecipe } from './solveRecipe';

self.onmessage = async (e: MessageEvent) => {
    const { targetHex, options } = e.data;
    try {
        const recipe = await solveRecipe(targetHex, options);
        self.postMessage({ type: 'SUCCESS', recipe });
    } catch (error) {
        self.postMessage({ type: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};
