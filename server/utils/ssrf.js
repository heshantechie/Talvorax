import dns from 'dns/promises';
import { URL } from 'url';

// Convert IPv4 string to integer
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Check if IP is private or reserved
function isPrivateIP(ip) {
  // Cloud metadata endpoints (e.g., AWS, GCP, Azure 169.254.169.254)
  if (ip === '169.254.169.254') return true;

  // IPv4 checks
  const parts = ip.split('.');
  if (parts.length === 4) {
    const i = ipToInt(ip);
    // 127.0.0.0/8 (Loopback)
    if (i >= 2130706432 && i <= 2147483647) return true;
    // 10.0.0.0/8 (Private)
    if (i >= 167772160 && i <= 184549375) return true;
    // 172.16.0.0/12 (Private)
    if (i >= 2886729728 && i <= 2887778303) return true;
    // 192.168.0.0/16 (Private)
    if (i >= 3232235520 && i <= 3232301055) return true;
    // 0.0.0.0/8 (Current network)
    if (i >= 0 && i <= 16777215) return true;
    // 169.254.0.0/16 (Link-local)
    if (i >= 2851995648 && i <= 2852061183) return true;
  }
  
  // IPv6 checks (basic loopback and unique local)
  if (ip === '::1') return true;
  if (ip.toLowerCase().startsWith('fd') || ip.toLowerCase().startsWith('fc')) return true;
  if (ip.toLowerCase().startsWith('fe8') || ip.toLowerCase().startsWith('fe9') || ip.toLowerCase().startsWith('fea') || ip.toLowerCase().startsWith('feb')) return true;
  
  return false;
}

/**
 * Validates a URL against SSRF attacks.
 * @param {string} urlStr - The URL to validate.
 * @returns {Promise<boolean>} True if valid, throws error if invalid.
 */
export async function validateUrlForSSRF(urlStr) {
  if (!urlStr) throw new Error('URL is required');

  let parsedUrl;
  try {
    parsedUrl = new URL(urlStr);
  } catch (err) {
    throw new Error('Invalid URL format');
  }

  // Reject unsupported protocols
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTPS protocol is allowed. Rejected: ' + parsedUrl.protocol);
  }

  // Reject localhost hostname outright
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Localhost is not allowed');
  }

  // Perform DNS resolution
  try {
    const lookupResult = await dns.lookup(hostname);
    if (isPrivateIP(lookupResult.address)) {
      throw new Error('URL resolves to a private or restricted IP address');
    }
  } catch (err) {
    if (err.message === 'URL resolves to a private or restricted IP address') {
      throw err;
    }
    throw new Error(`DNS resolution failed for hostname: ${hostname}`);
  }

  return true;
}
