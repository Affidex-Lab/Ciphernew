export type DriveConfig = {
  apiKey?: string;
  clientId?: string;
};

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script load failed: '+src));
    document.head.appendChild(s);
  });
}

export function getDriveConfig(): DriveConfig {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_API_KEY || '';
  const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  return { apiKey, clientId };
}

async function getAccessToken(): Promise<string | null> {
  try{
    const { clientId } = getDriveConfig();
    if (!clientId) return null;
    // @ts-ignore
    const google = (window as any).google;
    if (!google) return null;
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const token: string = await new Promise<string>((resolve, reject) => {
      try{
        // @ts-ignore
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope,
          callback: (resp: any) => {
            if (resp && resp.access_token) resolve(resp.access_token);
            else reject(new Error('No access token'));
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }catch(e){ reject(e); }
    });
    return token;
  }catch{ return null; }
}

async function uploadDirectToDrive(fileName: string, blob: Blob): Promise<boolean>{
  try{
    const { apiKey } = getDriveConfig();
    if (!apiKey) return false;
    await loadScript('https://accounts.google.com/gsi/client');
    const token = await getAccessToken();
    if (!token) return false;

    const metadata = { name: fileName, mimeType: 'application/json' };
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const reader = await blob.text();
    const body = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      reader +
      closeDelim;

    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&key=${apiKey}`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    if (!res.ok) return false;
    return true;
  }catch{ return false; }
}

export async function tryOpenGooglePicker(): Promise<boolean> {
  try {
    const { apiKey, clientId } = getDriveConfig();
    if (!apiKey || !clientId) return false;

    // Load Google APIs and Picker
    // gapi and google.accounts are injected by these scripts
    await loadScript('https://accounts.google.com/gsi/client');
    await loadScript('https://apis.google.com/js/api.js');

    // @ts-ignore
    const gapi = (window as any).gapi; 
    // @ts-ignore
    const google = (window as any).google;
    if (!gapi || !google) return false;

    // Init gapi client for Picker (developerKey usage)
    await new Promise<void>((resolve) => {
      gapi.load('client:picker', () => resolve());
    });

    const scope = 'https://www.googleapis.com/auth/drive.file';

    const token: string = await new Promise<string>((resolve, reject) => {
      try {
        // @ts-ignore
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope,
          callback: (resp: any) => {
            if (resp && resp.access_token) resolve(resp.access_token);
            else reject(new Error('No access token'));
          },
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (e) {
        reject(e);
      }
    });

    // Show Picker upload UI
    // @ts-ignore
    const uploadView = new google.picker.DocsUploadView().setIncludeFolders(true);
    // @ts-ignore
    const picker = new google.picker.PickerBuilder()
      .addView(uploadView)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setTitle('Upload Recovery Kit to Drive')
      // @ts-ignore
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .setCallback(() => {})
      .build();
    // @ts-ignore
    picker.setVisible(true);
    return true;
  } catch {
    return false;
  }
}

export async function saveToDriveOrFallback(fileName: string, blob: Blob) {
  // Attempt Google Picker flow
  const direct = await uploadDirectToDrive(fileName, blob);
  if (direct) return;
  const ok = await tryOpenGooglePicker();
  if (ok) return;
  // Fallback: prompt user to save (already downloaded) and open Drive in new tab
  try {
    const url = 'https://drive.google.com/drive/my-drive';
    window.open(url, '_blank', 'noopener');
  } catch {}
}
