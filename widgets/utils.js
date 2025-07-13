/**
 * Decodes the payload of an MQTT message.
 * It first tries to parse the payload as JSON. If it fails, it returns it as plain text.
 * @param {Uint8Array} payload - The MQTT message payload.
 * @param {string} path - The path (e.g., 'data.temp') to extract a value from a JSON object.
 * @returns {*} The extracted value or the decoded string.
 */
export function decode(payload, path) {
  const str = new TextDecoder().decode(payload);
  try {
    let obj = JSON.parse(str);
    return path ? path.split('.').reduce((o, k) => o?.[k], obj) : obj;
  } catch {
    return str;
  }
}