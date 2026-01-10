/**
 *
 * @return {Promise<*>}
 */
import checkStatusCode from './checkStatusCode';

/**
 * @return {Promise<string>}
 */
export function getCurrentUser() {
  return fetch(`/api/whoami`)
    .then(checkStatusCode)
    .then((response) => response.json())
    .then((json) => json.username);
}
