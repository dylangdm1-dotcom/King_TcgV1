/**
 * 🚀 Parallel Search Engine V3.6
 * Exécution parallèle optimisée avec tolérance aux pannes et cache unifié
 */

import { logger } from "./logger";
import { getCachedCardData, setCachedCardData } from "../pokemonCache";
 
 export interface SearchTask<T> {
   id: string; // Ex: "charizard-vmax-020-189"
   fetcher: () => Promise<T>;
   useCache?: boolean;
   ttl?: number;
 }
 
 export interface ParallelResult<T> {
   id: string;
   data: T | null;
   error: Error | null;
   fromCache: boolean;
 }
 
 export async function executeParallelTasks<T>(
   tasks: SearchTask<T>[]
 ): Promise<ParallelResult<T>[]> {
   const startTime = Date.now();
   logger.api(`Démarrage de ${tasks.length} tâche(s) en parallèle...`);
 
   const promises = tasks.map(async (task): Promise<ParallelResult<T>> => {
     // 1. Tenter la récupération via le cache unifié
     if (task.useCache !== false) {
       const cached = getCachedCardData<T>(task.id);
       if (cached !== null) {
         return { id: task.id, data: cached, error: null, fromCache: true };
       }
     }
 
     // 2. Exécuter la requête API
     try {
       const data = await task.fetcher();
 
       // Sauvegarder dans le cache si la requête a réussi
       if (task.useCache !== false && data !== null) {
         setCachedCardData(task.id, data, task.ttl);
       }
 
       return { id: task.id, data, error: null, fromCache: false };
     } catch (err) {
       const error = err instanceof Error ? err : new Error(String(err));
       logger.error("API", `Échec de la tâche [${task.id}]`, error);
       return { id: task.id, data: null, error, fromCache: false };
     }
   });
 
   const results = await Promise.all(promises);
   const duration = Date.now() - startTime;
   logger.api(`Toutes les tâches parallèles sont terminées en ${duration}ms.`);
 
   return results;
 }
