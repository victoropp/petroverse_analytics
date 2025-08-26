// Helper to ensure authentication for development
export async function ensureAuthentication() {
  // Check if we have a token
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    console.log('No token found, attempting auto-login for development...');
    
    try {
      const response = await fetch('http://localhost:8003/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@demo.com',
          password: 'demo123'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ Auto-login successful for development');
        
        // Reload to apply authentication
        window.location.reload();
        return true;
      }
    } catch (error) {
      console.error('Auto-login failed:', error);
    }
  }
  
  return !!token;
}

export function getAuthToken() {
  return localStorage.getItem('access_token');
}

export function clearAuth() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}