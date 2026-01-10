/**
 *
 * @return {Promise<*>}
 */
import checkStatusCode from './checkStatusCode';
import {getCookie} from '../cookie-utils.js';

/**
 * @return {Promise<string | null>}
 */
export function getCurrentUser() {
  return fetch(`/api/whoami`)
    .then(checkStatusCode)
    .then((response) => response.json())
    .then((json) => json.username)
    .then((uName) => {
      if (uName) {
        return uName;
      }
      const cookieUsername = getCookie('poinz_username');
      if (cookieUsername) {
        return decodeURIComponent(cookieUsername);
      }
      return getItem(PRESET_USER_NAME);
    });
}
